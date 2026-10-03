import asyncio
import subprocess
import json
import os
from typing import Dict, Any

async def run_fuzzing(alvo: str, tipo_scan: str ) -> Dict[str, Any]:

    dados_finais = {
        "alvo_solicitado": alvo,
        "status": "",
        "erro": None,
        "resultados": []
    }
    
    alvo_formatado = alvo if alvo.startswith("http") else f"https://{alvo}"
    
   
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if tipo_scan == "deep_scan":
        wordlist = os.path.join(base_dir, "wordlists", "deep_fuzzing.txt")
    else:
        wordlist = os.path.join(base_dir, "wordlists", "fast_fuzzing.txt")

    ffuf_bin = os.path.join(os.path.dirname(os.path.abspath(__file__)), "ffuf.exe") if os.name == "nt" else "ffuf"

    comando = [
        ffuf_bin, 
        "-u", f"{alvo_formatado}/FUZZ", 
        "-w", wordlist, 
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

        saida_bruta = resultado.stdout.strip()
        
        if not saida_bruta:
            dados_finais["status"] = "vazio"
            dados_finais["erro"] = resultado.stderr.strip() or "O Ffuf não retornou nada."
            return dados_finais

        try:
            saida_json = json.loads(saida_bruta)
            dados_finais["resultados"] = saida_json.get("results", [])
            dados_finais["status"] = "sucesso"
        except json.JSONDecodeError:
            dados_finais["status"] = "erro_parse"
            dados_finais["erro"] = "Não foi possível interpretar o JSON gerado pelo FFuf."
            
    except subprocess.TimeoutExpired:
        dados_finais["status"] = "erro_timeout"
        dados_finais["erro"] = "O fuzzing demorou muito e foi cancelado."
        
    except FileNotFoundError:
        dados_finais["status"] = "erro_sistema"
        dados_finais["erro"] = "O binário do ffuf não foi encontrado no PATH."
        
    except Exception as e:
        dados_finais["status"] = "erro_execucao"
        dados_finais["erro"] = f"{type(e).__name__}: {str(e)}"

    return dados_finais
