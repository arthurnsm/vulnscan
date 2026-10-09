import asyncio
import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'scans')))

from nmap import run_nmap
from fuzzing import run_fuzzing

async def DeepOrquestrator(url: str):
    print(f"=== ORQUESTRADOR DEEP INICIADO PARA: {url} ===")
    scan_type = "deep_scan"
    resultados = await asyncio.gather(
        run_nmap(url, scan_type),
        run_fuzzing(url, scan_type),
        return_exceptions=True
    )
    
    resultado_nmap = resultados[0] if not isinstance(resultados[0], Exception) else {"erro": str(resultados[0])}
    resultado_ffuz = resultados[1] if not isinstance(resultados[1], Exception) else {"erro": str(resultados[1])}
    
    relatorio_consolidado = {
        "nmap": [resultado_nmap],
        "ffuz": [resultado_ffuz]
    }
    
    print("=== ORQUESTRADOR DEEP FINALIZADO ===")
    return relatorio_consolidado