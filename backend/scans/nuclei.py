import asyncio
import json
import os
import shutil
import ssl
import subprocess
import urllib.error
import urllib.request
import uuid
from typing import Any, Dict, List, Optional
from urllib.parse import urlparse


def _localizar_binario_nuclei() -> Optional[str]:
    """Localiza o binário do Nuclei em backend/scans, PATH ou diretórios padrão (Go/Scoop/Choco)."""
    scans_dir = os.path.dirname(os.path.abspath(__file__))
    exe = "nuclei.exe" if os.name == "nt" else "nuclei"

    candidatos = [
        os.path.join(scans_dir, exe),
        shutil.which("nuclei"),
        os.path.join(os.path.expanduser("~"), "go", "bin", exe),
        os.path.join(os.path.expanduser("~"), "scoop", "shims", exe),
    ]
    if os.name == "nt":
        candidatos.append(os.path.join("C:\\ProgramData", "chocolatey", "bin", exe))

    for c in candidatos:
        if c and os.path.exists(c):
            return c
    return None


def _resolver_url_nuclei(alvo: str) -> str:
    """Resolve esquema ativo (HTTPS com fallback para HTTP) e redirecionamento canônico."""
    alvo_limpo = alvo.strip().rstrip("/")
    candidatos = (
        [alvo_limpo]
        if alvo_limpo.startswith(("http://", "https://"))
        else [f"https://{alvo_limpo}", f"http://{alvo_limpo}"]
    )

    ssl_ctx = ssl.create_default_context()
    ssl_ctx.check_hostname = False
    ssl_ctx.verify_mode = ssl.CERT_NONE

    for url in candidatos:
        try:
            req = urllib.request.Request(
                url,
                method="HEAD",
                headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) VulScanner/1.0"},
            )
            with urllib.request.urlopen(req, timeout=5.0, context=ssl_ctx) as resp:
                parsed = urlparse(resp.geturl())
                if parsed.scheme and parsed.netloc:
                    return f"{parsed.scheme}://{parsed.netloc}"
        except urllib.error.HTTPError as e:
            parsed = urlparse(e.geturl())
            if parsed.scheme and parsed.netloc:
                return f"{parsed.scheme}://{parsed.netloc}"
        except Exception:
            continue

    return candidatos[0]


def _resolver_templates_dir(tipo_scan: str) -> List[str]:
    """
    Seleciona os diretórios de templates válidos no sistema (suporta Nuclei Templates v9/v10+ sob `http/`
    e também estrutura legada na raiz).
    """
    base_templates = os.path.join(os.path.expanduser("~"), "nuclei-templates")
    if os.path.isdir(os.path.join(base_templates, "http")):
        if tipo_scan == "deep_scan":
            desejados = [
                "ssl/",
                "http/exposures/",
                "http/misconfiguration/",
                "http/exposed-panels/",
            ]
        else:
            desejados = [
                "ssl/",
                "http/exposures/",
                "http/misconfiguration/",
            ]
        existentes = [d for d in desejados if os.path.isdir(os.path.join(base_templates, d.rstrip("/")))]
        if existentes:
            return existentes

    if tipo_scan == "deep_scan":
        return ["cves/", "exposures/"]
    return ["exposures/"]


def _parse_nuclei_output(saida_bruta: str) -> List[Dict[str, Any]]:
    resultados: List[Dict[str, Any]] = []
    if not saida_bruta:
        return resultados

    try:
        obj = json.loads(saida_bruta)
        if isinstance(obj, list):
            resultados.extend(obj)
        elif isinstance(obj, dict):
            resultados.append(obj)
        return resultados
    except json.JSONDecodeError:
        pass

    for linha in saida_bruta.splitlines():
        linha_limpa = linha.strip()
        if not linha_limpa:
            continue
        try:
            parsed = json.loads(linha_limpa)
            if isinstance(parsed, dict):
                parsed.pop("request", None)
                parsed.pop("response", None)
                resultados.append(parsed)
        except json.JSONDecodeError:
            continue
    return resultados


def _executar_comando_nuclei(comando: List[str], temp_filename: str, exec_timeout: float) -> Dict[str, Any]:
    """Executa uma passagem do Nuclei preservando achados parciais caso atinja o timeout."""
    try:
        res = subprocess.run(
            comando,
            stdin=subprocess.DEVNULL,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=exec_timeout,
        )

        saida_bruta = ""
        if os.path.exists(temp_filename):
            with open(temp_filename, "r", encoding="utf-8", errors="replace") as f:
                saida_bruta = f.read().strip()

        if not saida_bruta and res.stdout:
            saida_bruta = res.stdout.strip()

        return {
            "ok": res.returncode == 0 or bool(saida_bruta),
            "stderr": (res.stderr or "").strip(),
            "resultados": _parse_nuclei_output(saida_bruta),
        }
    except subprocess.TimeoutExpired:
        saida_parcial = ""
        if os.path.exists(temp_filename):
            with open(temp_filename, "r", encoding="utf-8", errors="replace") as f:
                saida_parcial = f.read().strip()
        return {
            "ok": True,
            "stderr": "",
            "resultados": _parse_nuclei_output(saida_parcial),
        }


async def run_nuclei(alvo: str, tipo_scan: str = "deep_scan") -> Dict[str, Any]:
    dados_finais: Dict[str, Any] = {
        "alvo_solicitado": alvo,
        "status": "",
        "erro": None,
        "resultados": []
    }

    if not alvo or not alvo.strip():
        dados_finais["status"] = "erro"
        dados_finais["erro"] = "URL ou alvo não informado."
        return dados_finais

    nuclei_bin = _localizar_binario_nuclei()
    if not nuclei_bin:
        dados_finais["status"] = "erro_sistema"
        dados_finais["erro"] = "O binário do Nuclei não foi encontrado no PATH, Go bin ou em backend/scans."
        return dados_finais

    alvo_formatado = await asyncio.to_thread(_resolver_url_nuclei, alvo)

    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    run_id = uuid.uuid4().hex
    temp_pass1 = os.path.join(base_dir, f"nuclei_p1_{run_id}.json")
    temp_pass2 = os.path.join(base_dir, f"nuclei_p2_{run_id}.json")

    templates_arg = ",".join(_resolver_templates_dir(tipo_scan))

    try:
        if tipo_scan == "deep_scan":
            # Passagem 1: SSL, Exposições, Painéis e Misconfigurations (inclui cabeçalhos/TLS/cookies)
            cmd_pass1 = [
                nuclei_bin,
                "-u", alvo_formatado,
                "-t", templates_arg,
                "-severity", "info,low,medium,high,critical",
                "-c", "60",
                "-rl", "200",
                "-timeout", "4",
                "-retries", "1",
                "-mhe", "200",
                "-duc",
                "-jsonl",
                "-o", temp_pass1,
                "-silent",
            ]

            # Passagem 2: Automatic Scan (-as) mapeia tecnologias detectadas para CVEs específicas
            cmd_pass2 = [
                nuclei_bin,
                "-u", alvo_formatado,
                "-as",
                "-severity", "low,medium,high,critical",
                "-c", "60",
                "-rl", "200",
                "-timeout", "4",
                "-retries", "1",
                "-mhe", "200",
                "-duc",
                "-jsonl",
                "-o", temp_pass2,
                "-silent",
            ]

            res1, res2 = await asyncio.gather(
                asyncio.to_thread(_executar_comando_nuclei, cmd_pass1, temp_pass1, 120.0),
                asyncio.to_thread(_executar_comando_nuclei, cmd_pass2, temp_pass2, 120.0),
            )

            combinados = res1["resultados"] + res2["resultados"]
            if not res1["ok"] and not res2["ok"] and not combinados:
                dados_finais["status"] = "erro"
                dados_finais["erro"] = res1["stderr"] or res2["stderr"] or "Erro de execução no Nuclei."
                return dados_finais
        else:
            cmd_fast = [
                nuclei_bin,
                "-u", alvo_formatado,
                "-t", templates_arg,
                "-severity", "low,medium,high,critical",
                "-c", "60",
                "-rl", "150",
                "-timeout", "3",
                "-retries", "1",
                "-mhe", "150",
                "-duc",
                "-jsonl",
                "-o", temp_pass1,
                "-silent",
            ]
            res1 = await asyncio.to_thread(_executar_comando_nuclei, cmd_fast, temp_pass1, 60.0)
            combinados = res1["resultados"]
            if not res1["ok"] and not combinados:
                dados_finais["status"] = "erro"
                dados_finais["erro"] = res1["stderr"] or "Erro de execução no Nuclei."
                return dados_finais

        # Deduplicação preservando matchers distintos (ex: múltiplos headers em http-missing-security-headers)
        vistos = set()
        unicos: List[Dict[str, Any]] = []
        for item in combinados:
            chave = (
                item.get("template-id"),
                item.get("matcher-name"),
                item.get("matched-at"),
                tuple(item.get("extracted-results") or []),
            )
            if chave not in vistos:
                vistos.add(chave)
                unicos.append(item)

        dados_finais["resultados"] = unicos
        dados_finais["status"] = "sucesso"

    except FileNotFoundError:
        dados_finais["status"] = "erro_sistema"
        dados_finais["erro"] = "O binário do Nuclei não foi encontrado no PATH ou em backend/scans."
    except Exception as e:
        dados_finais["status"] = "erro_execucao"
        dados_finais["erro"] = f"{type(e).__name__}: {str(e)}"
    finally:
        for tmp in (temp_pass1, temp_pass2):
            if os.path.exists(tmp):
                try:
                    os.remove(tmp)
                except Exception:
                    pass

    return dados_finais


if __name__ == "__main__":
    import sys

    alvo_teste = sys.argv[1] if len(sys.argv) > 1 else "google.com"
    tipo = sys.argv[2] if len(sys.argv) > 2 else "deep_scan"

    resposta = asyncio.run(run_nuclei(alvo_teste, tipo))
    print(json.dumps(resposta, indent=2, ensure_ascii=False))
