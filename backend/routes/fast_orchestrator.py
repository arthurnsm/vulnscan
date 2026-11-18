import asyncio
import sys
import os

# Adiciona o diretório backend ao sys.path para importação do pacote scans
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from scans.ping import ping_host
from scans.nmap import run_nmap
from scans.httpx import run_httpx
from scans.ffuf import run_ffuf


async def FastOrquestrator(url: str):
    print(f"=== ORQUESTRADOR FAST INICIADO PARA: {url} ===")
    
    # 1. Verificação prévia da URL/Host via Ping
    validacao = await ping_host(url)
    if not validacao.get("ativo"):
        print(f"[-] Verificação de URL falhou: {validacao.get('erro')}")
        return {
            "status": "erro",
            "ativo": False,
            "host": validacao.get("host"),
            "erro": validacao.get("erro") or "O host informado não respondeu ao teste de conectividade."
        }

    print(f"[+] URL validada com sucesso! Host ativo: {validacao.get('host')}")
    print("[+] Disparando ferramentas simultaneamente de forma assíncrona...")
    scan_type = "fast_scan"

    # 2. Executa todas as ferramentas do Fast Scan em paralelo
    resultados = await asyncio.gather(
        run_nmap(url, scan_type),
        run_httpx(url, scan_type),
        run_ffuf(url, scan_type),
        return_exceptions=True
    )

    resultado_nmap = resultados[0] if not isinstance(resultados[0], Exception) else {"status": "erro", "erro": str(resultados[0])}
    resultado_httpx = resultados[1] if not isinstance(resultados[1], Exception) else {"status": "erro", "erro": str(resultados[1])}
    resultado_ffuf = resultados[2] if not isinstance(resultados[2], Exception) else {"status": "erro", "erro": str(resultados[2])}

    # 3. Consolidação do relatório
    relatorio_consolidado = {
        "status": "sucesso",
        "alvo": url,
        "host": validacao.get("host"),
        "tipo": scan_type,
        "nmap": [resultado_nmap],
        "httpx": [resultado_httpx],
        "ffuf": [resultado_ffuf],
        "ffuz": [resultado_ffuf]  # Mantido para retrocompatibilidade
    }

    print("=== ORQUESTRADOR FAST FINALIZADO COM SUCESSO ===")
    return relatorio_consolidado
