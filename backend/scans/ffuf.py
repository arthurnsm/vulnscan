import asyncio
import subprocess
import json
import os
import shutil
import uuid
import urllib.request
import urllib.error
from urllib.parse import urlparse
from typing import Dict, Any, List


# Rotas e arquivos de alta prioridade garantidos no início do Fast Scan
PRIORITY_PATHS: List[str] = [
    ".env",
    ".env.local",
    ".env.production",
    ".git/config",
    ".git/HEAD",
    ".htaccess",
    ".htpasswd",
    "robots.txt",
    "sitemap.xml",
    ".well-known/security.txt",
    "admin",
    "admin/",
    "administrator",
    "login",
    "login.php",
    "signin",
    "dashboard",
    "panel",
    "api",
    "api/v1",
    "api/v2",
    "api/health",
    "health",
    "status",
    "graphql",
    "swagger.json",
    "swagger-ui.html",
    "openapi.json",
    "docs",
    "config",
    "config.php",
    "config.json",
    "wp-login.php",
    "wp-admin/",
    "wp-config.php.bak",
    "phpmyadmin/",
    "backup",
    "backup.zip",
    "backup.sql",
    "dump.sql",
    "database.sql",
    "db.sql",
    "server-status",
    "phpinfo.php",
    "info.php",
    "test",
    "dev",
    "staging",
    "uploads/",
    "assets/",
    "package.json",
    "composer.json",
    "web.config",
    "Dockerfile",
    "docker-compose.yml",
]


def _resolver_url_base(alvo: str) -> str:
    """Resolve redirecionamentos iniciais (ex: http -> https ou root -> www) para evitar 301 global no fuzzing."""
    alvo_limpo = alvo.strip().rstrip("/")
    candidatos = (
        [alvo_limpo]
        if alvo_limpo.startswith(("http://", "https://"))
        else [f"https://{alvo_limpo}", f"http://{alvo_limpo}"]
    )

    for url in candidatos:
        try:
            req = urllib.request.Request(
                url,
                method="HEAD",
                headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) VulScanner/1.0"},
            )
            with urllib.request.urlopen(req, timeout=5.0) as resp:
                parsed = urlparse(resp.geturl())
                if parsed.scheme and parsed.netloc:
                    return f"{parsed.scheme}://{parsed.netloc}"
        except urllib.error.HTTPError as e:
            # Mesmo em 403/404/405 o servidor respondeu e pode ter redirecionado
            parsed = urlparse(e.geturl())
            if parsed.scheme and parsed.netloc:
                return f"{parsed.scheme}://{parsed.netloc}"
        except Exception:
            continue

    return candidatos[0]


def _preparar_wordlist_fast(wordlist_original: str, dest_path: str, limite_extra: int = 2500) -> str:
    """Cria uma wordlist priorizada para o fast_scan garantindo rotas críticas no topo."""
    vistas = set()
    linhas_finais: List[str] = []

    for path in PRIORITY_PATHS:
        p = path.strip()
        if p and p not in vistas:
            vistas.add(p)
            linhas_finais.append(p)

    try:
        with open(wordlist_original, "r", encoding="utf-8", errors="ignore") as f:
            adicionadas = 0
            for linha in f:
                p = linha.strip()
                if not p or p.startswith("#") or p in vistas:
                    continue
                vistas.add(p)
                linhas_finais.append(p)
                adicionadas += 1
                if adicionadas >= limite_extra:
                    break
    except Exception:
        return wordlist_original

    with open(dest_path, "w", encoding="utf-8") as f:
        f.write("\n".join(linhas_finais) + "\n")

    return dest_path


def _filtrar_falsos_positivos(resultados: List[Dict[str, Any]], base_url: str) -> List[Dict[str, Any]]:
    """Remove redirecionamentos genéricos, wildcards e páginas de erro repetitivas."""
    if not resultados:
        return []

    parsed_base = urlparse(base_url)

    # Conta quantas vezes cada redirectlocation aparece para detectar regras de redirect em massa
    redirect_counts: Dict[str, int] = {}
    for item in resultados:
        status = int(item.get("status", 0))
        redir = str(item.get("redirectlocation") or "").strip()
        if status in (301, 302, 307, 308) and redir:
            redir_sem_query = redir.split("?")[0].rstrip("/")
            redirect_counts[redir_sem_query] = redirect_counts.get(redir_sem_query, 0) + 1

    # Conta assinaturas repetitivas (status, words, lines) para filtrar soft-404s não pegos pelo -ac
    sig_counts: Dict[tuple, int] = {}
    for item in resultados:
        sig = (
            int(item.get("status", 0)),
            int(item.get("words", -1)),
            int(item.get("lines", -1)),
        )
        sig_counts[sig] = sig_counts.get(sig, 0) + 1

    filtrados: List[Dict[str, Any]] = []
    for item in resultados:
        status = int(item.get("status", 0))
        fuzz_word = str(item.get("input", {}).get("FUZZ", "")).lstrip("/")
        redir = str(item.get("redirectlocation") or "").strip()

        if status in (301, 302, 307, 308):
            # Descarta redirecionamentos de normalização de path (ex: ..;/ ou barras duplicadas com corpo vazio)
            if "..;" in fuzz_word and int(item.get("length", 0)) == 0:
                continue

            redir_sem_query = redir.split("?")[0].rstrip("/")
            # Descarta se múltiplos caminhos diferentes redirecionam para o mesmo destino genérico
            if redirect_counts.get(redir_sem_query, 0) >= 3:
                continue

            # Descarta se o redirect apenas aponta para outro host/protocolo com o mesmo path
            if redir:
                parsed_redir = urlparse(redir)
                if (
                    parsed_redir.netloc
                    and parsed_redir.netloc != parsed_base.netloc
                    and parsed_redir.path.lstrip("/") == fuzz_word
                ):
                    continue

        sig = (status, int(item.get("words", -1)), int(item.get("lines", -1)))
        # Se mais de 12 resultados tiverem exatamente a mesma assinatura (status, words, lines) em status != 200,
        # ou > 15 em 200 (soft-404 / SPA fallback), trata como wildcard
        limite_sig = 15 if status == 200 else 10
        if sig_counts.get(sig, 0) > limite_sig:
            continue

        filtrados.append(item)

    return filtrados


async def run_ffuf(alvo: str, tipo_scan: str = "fast_scan") -> Dict[str, Any]:
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

    alvo_formatado = await asyncio.to_thread(_resolver_url_base, alvo)

    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

    # Seleção da wordlist correspondente ao tipo de scan
    if tipo_scan == "deep_scan":
        wordlist = os.path.join(base_dir, "wordlists", "deep_fuzzing.txt")
    else:
        wordlist = os.path.join(base_dir, "wordlists", "fast_fuzzing.txt")

    if not os.path.exists(wordlist):
        fallback_wordlist = os.path.join(base_dir, "wordlists", "ffuz.txt")
        if os.path.exists(fallback_wordlist):
            wordlist = fallback_wordlist
        else:
            dados_finais["status"] = "erro"
            dados_finais["erro"] = f"Wordlist não encontrada no caminho: {wordlist}"
            return dados_finais

    # Localização do binário do ffuf (prioriza o binário local em backend/scans)
    local_bin = os.path.join(os.path.dirname(os.path.abspath(__file__)), "ffuf.exe")
    if os.path.exists(local_bin):
        ffuf_bin = local_bin
    else:
        ffuf_bin = shutil.which("ffuf") or ("ffuf.exe" if os.name == "nt" else "ffuf")

    run_id = uuid.uuid4().hex
    temp_filename = os.path.join(base_dir, f"ffuf_out_{run_id}.json")
    temp_wordlist = os.path.join(base_dir, f"ffuf_wl_{run_id}.txt")
    wordlist_ativa = wordlist

    if tipo_scan != "deep_scan":
        wordlist_ativa = _preparar_wordlist_fast(wordlist, temp_wordlist)

    # Monta comando do ffuf com auto-calibração (-ac) para eliminar wildcards/soft-404s
    if tipo_scan == "deep_scan":
        comando = [
            ffuf_bin,
            "-u", f"{alvo_formatado}/FUZZ",
            "-w", wordlist_ativa,
            "-t", "100",
            "-e", ".php,.html,.txt,.bak,.env",
            "-mc", "200,204,301,302,307,401,403",
            "-ac",
            "-maxtime", "120",
            "-timeout", "5",
            "-o", temp_filename,
            "-of", "json",
            "-s"
        ]
    else:
        # Fast scan: wordlist priorizada com 2.500+ entradas críticas
        comando = [
            ffuf_bin,
            "-u", f"{alvo_formatado}/FUZZ",
            "-w", wordlist_ativa,
            "-t", "80",
            "-mc", "200,204,301,302,307,401,403",
            "-ac",
            "-maxtime", "20",
            "-timeout", "3",
            "-o", temp_filename,
            "-of", "json",
            "-s"
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

        if resultado.returncode != 0 and not saida_bruta:
            dados_finais["status"] = "erro"
            dados_finais["erro"] = resultado.stderr.strip() or "Erro de execução no FFuf."
            return dados_finais

        if not saida_bruta:
            # Execução bem-sucedida sem rotas expostas encontradas
            dados_finais["resultados"] = []
            dados_finais["status"] = "sucesso"
            return dados_finais

        try:
            saida_json = json.loads(saida_bruta)
            brutos = saida_json.get("results", [])
            dados_finais["resultados"] = _filtrar_falsos_positivos(brutos, alvo_formatado)
            dados_finais["status"] = "sucesso"
        except json.JSONDecodeError:
            dados_finais["status"] = "erro_parse"
            dados_finais["erro"] = "Não foi possível interpretar o JSON gerado pelo FFuf."

    except subprocess.TimeoutExpired:
        dados_finais["status"] = "erro_timeout"
        dados_finais["erro"] = "O fuzzing demorou muito e foi cancelado (timeout de 900s)."
    except FileNotFoundError:
        dados_finais["status"] = "erro_sistema"
        dados_finais["erro"] = "O binário do FFuf não foi encontrado no PATH ou em backend/scans."
    except Exception as e:
        dados_finais["status"] = "erro_execucao"
        dados_finais["erro"] = f"{type(e).__name__}: {str(e)}"
    finally:
        for tmp in (temp_filename, temp_wordlist):
            if os.path.exists(tmp):
                try:
                    os.remove(tmp)
                except Exception:
                    pass

    return dados_finais


# Alias para compatibilidade com orquestradores que importam run_fuzzing
run_fuzzing = run_ffuf


if __name__ == "__main__":
    import sys

    alvo_teste = sys.argv[1] if len(sys.argv) > 1 else "localhost"
    tipo = sys.argv[2] if len(sys.argv) > 2 else "fast_scan"

    resposta = asyncio.run(run_ffuf(alvo_teste, tipo))
    print(json.dumps(resposta, indent=2, ensure_ascii=False))
