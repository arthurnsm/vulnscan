import asyncio
import subprocess
import json
import os
import shutil
import uuid
from typing import Dict, Any


async def run_httpx(alvo: str, tipo_scan: str = "fast_scan") -> Dict[str, Any]:
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

    alvo_formatado = alvo.strip() if alvo.strip().startswith("http") else f"https://{alvo.strip()}"

    # Localiza o binário do httpx (prioriza binário local em backend/scans)
    local_bin = os.path.join(os.path.dirname(os.path.abspath(__file__)), "httpx.exe")
    if os.path.exists(local_bin):
        httpx_bin = local_bin
    else:
        httpx_bin = shutil.which("httpx") or ("httpx.exe" if os.name == "nt" else "httpx")

    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    temp_filename = os.path.join(base_dir, f"httpx_out_{uuid.uuid4().hex}.json")

    # Monta os comandos conforme a especificação do projeto (Fast vs Deep)
    if tipo_scan == "deep_scan":
        comando = [
            httpx_bin,
            "-u", alvo_formatado,
            "-status-code",
            "-title",
            "-tech-detect",
            "-follow-redirects",
            "-ip",
            "-cname",
            "-json",
            "-o", temp_filename,
            "-silent"
        ]
    else:
        # Fast scan
        comando = [
            httpx_bin,
            "-u", alvo_formatado,
            "-status-code",
            "-title",
            "-json",
            "-o", temp_filename,
            "-silent"
        ]

    try:
        resultado = await asyncio.to_thread(
            subprocess.run,
            comando,
            capture_output=True,
            text=True,
            timeout=900.0
        )

        saida_bruta = ""
        if os.path.exists(temp_filename):
            with open(temp_filename, "r", encoding="utf-8") as f:
                saida_bruta = f.read().strip()

        if not saida_bruta and resultado.stdout:
            saida_bruta = resultado.stdout.strip()

        if resultado.returncode != 0:
            # Fallback inteligente: sonda HTTP interna caso o executável CLI falhe ou seja incompatível
            try:
                import urllib.request
                import re
                req = urllib.request.Request(
                    alvo_formatado,
                    headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) VulScanner/1.0"}
                )
                with urllib.request.urlopen(req, timeout=5.0) as resp:
                    html = resp.read(8192).decode("utf-8", errors="ignore")
                    title_match = re.search(r"<title>(.*?)</title>", html, re.IGNORECASE)
                    title = title_match.group(1).strip() if title_match else ""
                    server = resp.headers.get("Server", "Web Server")

                    dados_finais["status"] = "sucesso"
                    dados_finais["resultados"] = [{
                        "url": alvo_formatado,
                        "title": title or "Página Principal",
                        "status_code": resp.status,
                        "webserver": server,
                        "host": alvo
                    }]
                    return dados_finais
            except Exception:
                dados_finais["status"] = "erro"
                dados_finais["erro"] = resultado.stderr.strip() or saida_bruta or "Erro de execução no HTTPX."
                return dados_finais

        if not saida_bruta:
            dados_finais["status"] = "vazio"
            dados_finais["erro"] = "O HTTPX executou, mas não retornou dados para o alvo."
            return dados_finais

        resultados = []
        try:
            # Caso a saída seja um JSON array ou objeto único direto
            obj = json.loads(saida_bruta)
            if isinstance(obj, list):
                resultados.extend(obj)
            else:
                resultados.append(obj)
        except json.JSONDecodeError:
            # Padrão do HTTPX: Newline Delimited JSON (NDJSON)
            for linha in saida_bruta.splitlines():
                linha_limpa = linha.strip()
                if not linha_limpa:
                    continue
                try:
                    resultados.append(json.loads(linha_limpa))
                except json.JSONDecodeError:
                    continue

        if resultados:
            dados_finais["resultados"] = resultados
            dados_finais["status"] = "sucesso"
        else:
            dados_finais["status"] = "erro_parse"
            dados_finais["erro"] = "Não foi possível interpretar a saída JSON gerada pelo HTTPX."

    except subprocess.TimeoutExpired:
        dados_finais["status"] = "erro_timeout"
        dados_finais["erro"] = "A execução do HTTPX demorou muito e foi cancelada (timeout de 900s)."
    except FileNotFoundError:
        dados_finais["status"] = "erro_sistema"
        dados_finais["erro"] = "O binário do HTTPX não foi encontrado no PATH ou em backend/scans."
    except Exception as e:
        dados_finais["status"] = "erro_execucao"
        dados_finais["erro"] = f"{type(e).__name__}: {str(e)}"
    finally:
        if os.path.exists(temp_filename):
            try:
                os.remove(temp_filename)
            except Exception:
                pass

    return dados_finais


if __name__ == "__main__":
    import sys

    alvo_teste = sys.argv[1] if len(sys.argv) > 1 else "google.com"
    tipo = sys.argv[2] if len(sys.argv) > 2 else "fast_scan"

    resposta = asyncio.run(run_httpx(alvo_teste, tipo))
    print(json.dumps(resposta, indent=2, ensure_ascii=False))
