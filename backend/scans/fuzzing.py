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

    import uuid
    temp_filename = os.path.join(base_dir, f"ffuf_out_{uuid.uuid4().hex}.json")

    comando = [
        ffuf_bin, 
        "-u", f"{alvo_formatado}/FUZZ", 
        "-w", wordlist, 
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

        if os.path.exists(temp_filename):
            with open(temp_filename, "r", encoding="utf-8") as f:
                saida_bruta = f.read().strip()
                
            if not saida_bruta:
                dados_finais["status"] = "vazio"
                dados_finais["erro"] = "O Ffuf executou, mas o arquivo JSON gerado estava vazio."
            else:
                try:
                    saida_json = json.loads(saida_bruta)
                    dados_finais["resultados"] = saida_json.get("results", [])
                    dados_finais["status"] = "sucesso"
                except json.JSONDecodeError:
                    dados_finais["status"] = "erro_parse"
                    dados_finais["erro"] = "Não foi possível interpretar o JSON gerado pelo FFuf."
        else:
            dados_finais["status"] = "erro_execucao"
            dados_finais["erro"] = resultado.stderr.strip() or "Ffuf não gerou o arquivo de saída."
            
    except subprocess.TimeoutExpired:
        dados_finais["status"] = "erro_timeout"
        dados_finais["erro"] = "O fuzzing demorou muito e foi cancelado."
        
    except FileNotFoundError:
        dados_finais["status"] = "erro_sistema"
        dados_finais["erro"] = "O binário do ffuf não foi encontrado no PATH."
        
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
