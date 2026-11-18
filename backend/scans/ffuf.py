import asyncio
import subprocess
import json
import os
import shutil
import uuid
from typing import Dict, Any


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

    alvo_limpo = alvo.strip()
    if not alvo_limpo.startswith(("http://", "https://")):
        alvo_formatado = f"https://{alvo_limpo}"
    else:
        alvo_formatado = alvo_limpo
    alvo_formatado = alvo_formatado.rstrip("/")

    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

    # Seleção da wordlist correspondente ao tipo de scan
    if tipo_scan == "deep_scan":
        wordlist = os.path.join(base_dir, "wordlists", "deep_fuzzing.txt")
    else:
        wordlist = os.path.join(base_dir, "wordlists", "fast_fuzzing.txt")

    if not os.path.exists(wordlist):
        # Fallback caso a wordlist específica não exista
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

    temp_filename = os.path.join(base_dir, f"ffuf_out_{uuid.uuid4().hex}.json")

    # Monta comando do ffuf conforme documentação do projeto (Fast vs Deep)
    if tipo_scan == "deep_scan":
        comando = [
            ffuf_bin,
            "-u", f"{alvo_formatado}/FUZZ",
            "-w", wordlist,
            "-t", "100",
            "-e", ".php,.html,.txt,.bak,.env",
            "-mc", "200,301,403",
            "-maxtime", "120",
            "-timeout", "5",
            "-o", temp_filename,
            "-of", "json",
            "-s"
        ]
    else:
        # Fast scan
        comando = [
            ffuf_bin,
            "-u", f"{alvo_formatado}/FUZZ",
            "-w", wordlist,
            "-t", "50",
            "-mc", "200,301,403",
            "-maxtime", "15",
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
            dados_finais["status"] = "vazio"
            dados_finais["erro"] = "O FFuf executou, mas o arquivo de saída gerado estava vazio."
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
        dados_finais["erro"] = "O fuzzing demorou muito e foi cancelado (timeout de 900s)."
    except FileNotFoundError:
        dados_finais["status"] = "erro_sistema"
        dados_finais["erro"] = "O binário do FFuf não foi encontrado no PATH ou em backend/scans."
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


# Alias para compatibilidade com orquestradores que importam run_fuzzing
run_fuzzing = run_ffuf


if __name__ == "__main__":
    import sys

    alvo_teste = sys.argv[1] if len(sys.argv) > 1 else "localhost"
    tipo = sys.argv[2] if len(sys.argv) > 2 else "fast_scan"

    resposta = asyncio.run(run_ffuf(alvo_teste, tipo))
    print(json.dumps(resposta, indent=2, ensure_ascii=False))
