import asyncio
import subprocess
import json
import os
import shutil
import uuid
from typing import Dict, Any


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

    alvo_formatado = alvo.strip() if alvo.strip().startswith("http") else f"https://{alvo.strip()}"

    # Localiza o binário do Nuclei (prioriza binário local em backend/scans)
    local_bin = os.path.join(os.path.dirname(os.path.abspath(__file__)), "nuclei.exe")
    if os.path.exists(local_bin):
        nuclei_bin = local_bin
    else:
        nuclei_bin = shutil.which("nuclei") or ("nuclei.exe" if os.name == "nt" else "nuclei")

    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    temp_filename = os.path.join(base_dir, f"nuclei_out_{uuid.uuid4().hex}.json")

    # Monta comando do Nuclei conforme especificação do projeto (Fast vs Deep)
    if tipo_scan == "deep_scan":
        # No scan profundo: varre CVEs e exposições em todas as severidades
        comando = [
            nuclei_bin,
            "-u", alvo_formatado,
            "-t", "cves/,exposures/",
            "-severity", "low,medium,high,critical",
            "-jsonl",
            "-o", temp_filename,
            "-silent"
        ]
    else:
        # No scan rápido: foca em vulnerabilidades críticas e altas para rápida detecção
        comando = [
            nuclei_bin,
            "-u", alvo_formatado,
            "-severity", "critical,high",
            "-jsonl",
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

        if resultado.returncode != 0 and not saida_bruta:
            dados_finais["status"] = "erro"
            dados_finais["erro"] = resultado.stderr.strip() or "Erro de execução no Nuclei."
            return dados_finais

        resultados = []
        if saida_bruta:
            try:
                # Caso a saída venha como um JSON array ou objeto único
                obj = json.loads(saida_bruta)
                if isinstance(obj, list):
                    resultados.extend(obj)
                else:
                    resultados.append(obj)
            except json.JSONDecodeError:
                # Padrão do Nuclei: Newline Delimited JSON (NDJSON)
                for linha in saida_bruta.splitlines():
                    linha_limpa = linha.strip()
                    if not linha_limpa:
                        continue
                    try:
                        resultados.append(json.loads(linha_limpa))
                    except json.JSONDecodeError:
                        continue

        dados_finais["resultados"] = resultados
        dados_finais["status"] = "sucesso"

    except subprocess.TimeoutExpired:
        dados_finais["status"] = "erro_timeout"
        dados_finais["erro"] = "A execução do Nuclei demorou muito e foi cancelada (timeout de 900s)."
    except FileNotFoundError:
        dados_finais["status"] = "erro_sistema"
        dados_finais["erro"] = "O binário do Nuclei não foi encontrado no PATH ou em backend/scans."
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
    tipo = sys.argv[2] if len(sys.argv) > 2 else "deep_scan"

    resposta = asyncio.run(run_nuclei(alvo_teste, tipo))
    print(json.dumps(resposta, indent=2, ensure_ascii=False))
