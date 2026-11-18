import asyncio
import html
import json
import os
import re
import shutil
import socket
import ssl
import subprocess
import urllib.error
import urllib.request
import uuid
from typing import Any, Dict, List, Optional
from urllib.parse import urlparse


def _localizar_binario_httpx() -> Optional[str]:
    """
    Localiza o executável oficial do ProjectDiscovery HTTPX, ignorando o cliente HTTP
    homônimo do Python (pip install httpx) caso esteja no PATH.
    """
    candidatos: List[str] = []
    scans_dir = os.path.dirname(os.path.abspath(__file__))

    for nome in ("httpx.exe", "httpx"):
        local_bin = os.path.join(scans_dir, nome)
        if os.path.exists(local_bin):
            candidatos.append(local_bin)

    user_go = os.path.join(os.path.expanduser("~"), "go", "bin", "httpx.exe" if os.name == "nt" else "httpx")
    if os.path.exists(user_go):
        candidatos.append(user_go)

    path_bin = shutil.which("httpx")
    if path_bin and path_bin not in candidatos:
        candidatos.append(path_bin)

    for binario in candidatos:
        # Evita executar o CLI do pacote Python `httpx` (que está em Scripts/ e não aceita `-version` / `-u`)
        norm = binario.replace("/", "\\").lower()
        if "\\python" in norm and "\\scripts\\httpx" in norm:
            continue
        try:
            check = subprocess.run(
                [binario, "-version"],
                capture_output=True,
                text=True,
                timeout=3.0,
            )
            saida = ((check.stdout or "") + (check.stderr or "")).lower()
            if check.returncode == 0 or "projectdiscovery" in saida or "current version" in saida:
                return binario
        except Exception:
            continue

    return None


def _detectar_tecnologias(headers: Dict[str, str], body: str, url_final: str) -> List[str]:
    """Infere tecnologias, servidores e frameworks a partir de headers e assinatura HTML."""
    techs: List[str] = []

    def add(nome: str):
        if nome and nome not in techs:
            techs.append(nome)

    headers_lower = {k.lower(): v for k, v in headers.items()}
    server = headers_lower.get("server", "")
    powered = headers_lower.get("x-powered-by", "")
    cookies = headers_lower.get("set-cookie", "").lower()
    body_lower = body.lower()

    if "nginx" in server.lower():
        add("Nginx")
    if "apache" in server.lower():
        add("Apache HTTP Server")
    if "cloudflare" in server.lower() or "cf-ray" in headers_lower:
        add("Cloudflare")
    if "microsoft-iis" in server.lower() or "asp.net" in powered.lower() or "asp.net_sessionid" in cookies:
        add("ASP.NET / IIS")
    if "gws" in server.lower() or "esf" in server.lower():
        add("Google Web Server")

    if powered:
        if "php" in powered.lower():
            add("PHP")
        if "express" in powered.lower():
            add("Express")
        if "next.js" in powered.lower():
            add("Next.js")

    if "phpsessid" in cookies:
        add("PHP")
    if "jsessionid" in cookies:
        add("Java / Servlet")
    if "laravel_session" in cookies:
        add("Laravel")
    if "strict-transport-security" in headers_lower:
        add("HSTS")
    if url_final.startswith("https://"):
        add("TLS/HTTPS")

    # Assinaturas no corpo HTML
    if "_next/static" in body_lower or "__next_data__" in body_lower:
        add("Next.js")
        add("React")
    elif "data-reactroot" in body_lower or "react-dom" in body_lower:
        add("React")

    if "wp-content" in body_lower or "wp-includes" in body_lower:
        add("WordPress")
    if "vue" in body_lower and ("__vue__" in body_lower or "vue.js" in body_lower):
        add("Vue.js")
    if "ng-version" in body_lower or "angular" in body_lower:
        add("Angular")
    if "jquery" in body_lower:
        add("jQuery")
    if "bootstrap" in body_lower:
        add("Bootstrap")
    if "tailwind" in body_lower:
        add("Tailwind CSS")

    return techs


def _probe_nativo(alvo: str, tipo_scan: str) -> Dict[str, Any]:
    """
    Executa probing HTTP/HTTPS nativo com suporte a redirecionamentos,
    fallback HTTPS -> HTTP, extração de título, headers, IPv4, CNAME e tecnologias.
    """
    alvo_limpo = alvo.strip()
    candidatos = (
        [alvo_limpo]
        if alvo_limpo.startswith(("http://", "https://"))
        else [f"https://{alvo_limpo}", f"http://{alvo_limpo}"]
    )

    ssl_ctx = ssl.create_default_context()
    ssl_ctx.check_hostname = False
    ssl_ctx.verify_mode = ssl.CERT_NONE

    ultimo_erro = None

    for url_tentativa in candidatos:
        status_code = None
        url_final = url_tentativa
        headers_dict: Dict[str, str] = {}
        raw_html = ""

        try:
            req = urllib.request.Request(
                url_tentativa,
                headers={
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) VulScanner/1.0",
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                },
            )
            with urllib.request.urlopen(req, timeout=8.0, context=ssl_ctx) as resp:
                status_code = resp.status
                url_final = resp.geturl()
                headers_dict = dict(resp.headers.items())
                raw_html = resp.read(65536).decode("utf-8", errors="ignore")
        except urllib.error.HTTPError as http_err:
            status_code = http_err.code
            url_final = http_err.geturl()
            headers_dict = dict(http_err.headers.items()) if http_err.headers else {}
            try:
                raw_html = http_err.read(32768).decode("utf-8", errors="ignore")
            except Exception:
                raw_html = ""
        except Exception as e:
            ultimo_erro = f"{type(e).__name__}: {str(e)}"
            continue

        if status_code is not None:
            title_match = re.search(r"<title[^>]*>(.*?)</title>", raw_html, re.IGNORECASE | re.DOTALL)
            raw_title = title_match.group(1) if title_match else ""
            title = re.sub(r"\s+", " ", html.unescape(raw_title)).strip()

            parsed = urlparse(url_final)
            hostname = parsed.hostname or alvo_limpo
            server = next(
                (v for k, v in headers_dict.items() if k.lower() == "server"),
                "Web Server",
            )

            ip_addr = None
            cname_list: List[str] = []
            try:
                canonical, aliases, ips = socket.gethostbyname_ex(hostname)
                if ips:
                    ip_addr = ips[0]
                if canonical and canonical != hostname:
                    cname_list.append(canonical)
                for alias in aliases:
                    if alias != hostname and alias not in cname_list:
                        cname_list.append(alias)
            except Exception:
                try:
                    ip_addr = socket.gethostbyname(hostname)
                except Exception:
                    pass

            item: Dict[str, Any] = {
                "url": url_final,
                "input": url_tentativa,
                "title": title or "Página Principal",
                "status_code": status_code,
                "webserver": server,
                "host": hostname,
            }

            if ip_addr:
                item["ip"] = ip_addr
            if cname_list:
                item["cname"] = cname_list
            if tipo_scan == "deep_scan":
                item["tech"] = _detectar_tecnologias(headers_dict, raw_html, url_final)
            else:
                techs_basicas = _detectar_tecnologias(headers_dict, raw_html, url_final)
                if techs_basicas:
                    item["tech"] = techs_basicas[:4]

            return {
                "alvo_solicitado": alvo,
                "status": "sucesso",
                "erro": None,
                "resultados": [item],
            }

    return {
        "alvo_solicitado": alvo,
        "status": "erro",
        "erro": ultimo_erro or "Não foi possível conectar ao alvo via HTTPS ou HTTP.",
        "resultados": [],
    }


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

    httpx_bin = await asyncio.to_thread(_localizar_binario_httpx)

    # Caso o binário oficial do ProjectDiscovery HTTPX não esteja instalado, usa sonda nativa completa
    if not httpx_bin:
        return await asyncio.to_thread(_probe_nativo, alvo, tipo_scan)

    alvo_limpo = alvo.strip()
    alvo_formatado = alvo_limpo if alvo_limpo.startswith(("http://", "https://")) else f"https://{alvo_limpo}"

    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    temp_filename = os.path.join(base_dir, f"httpx_out_{uuid.uuid4().hex}.json")

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
            timeout=90.0
        )

        saida_bruta = ""
        if os.path.exists(temp_filename):
            with open(temp_filename, "r", encoding="utf-8") as f:
                saida_bruta = f.read().strip()

        if not saida_bruta and resultado.stdout:
            saida_bruta = resultado.stdout.strip()

        if resultado.returncode != 0 or not saida_bruta:
            # Fallback para sonda nativa (que trata HTTP e certificados self-signed)
            nativo = await asyncio.to_thread(_probe_nativo, alvo, tipo_scan)
            if nativo.get("status") == "sucesso":
                return nativo
            dados_finais["status"] = "erro"
            dados_finais["erro"] = resultado.stderr.strip() or nativo.get("erro") or "Erro de execução no HTTPX."
            return dados_finais

        resultados = []
        try:
            obj = json.loads(saida_bruta)
            if isinstance(obj, list):
                resultados.extend(obj)
            else:
                resultados.append(obj)
        except json.JSONDecodeError:
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
            nativo = await asyncio.to_thread(_probe_nativo, alvo, tipo_scan)
            if nativo.get("status") == "sucesso":
                return nativo
            dados_finais["status"] = "erro_parse"
            dados_finais["erro"] = "Não foi possível interpretar a saída JSON gerada pelo HTTPX."

    except Exception:
        return await asyncio.to_thread(_probe_nativo, alvo, tipo_scan)
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
