import asyncio
import os
import re
import subprocess
from typing import Dict, Any
from urllib.parse import urlparse


def extrair_host(alvo: str) -> str:
    alvo_limpo = alvo.strip()
    if not alvo_limpo:
        return ""
    if not alvo_limpo.startswith(("http://", "https://")):
        alvo_limpo = f"http://{alvo_limpo}"
    parsed = urlparse(alvo_limpo)
    return parsed.hostname or ""


async def ping_host(alvo: str) -> Dict[str, Any]:
    host = extrair_host(alvo)

    resultado_final: Dict[str, Any] = {
        "alvo_solicitado": alvo,
        "host": host,
        "ativo": False,
        "erro": None,
    }

    if not host or not re.match(r"^[a-zA-Z0-9.-]+$", host) or host.startswith("-"):
        resultado_final["erro"] = "Host inválido informado na URL."
        return resultado_final

    if os.name == "nt":
        comando = ["ping", "-n", "1", "-w", "2500", host]
    else:
        comando = ["ping", "-c", "1", "-W", "2", host]

    try:
        resultado = await asyncio.to_thread(
            subprocess.run,
            comando,
            capture_output=True,
            text=True,
            timeout=5.0,
        )

        saida = (resultado.stdout or "").lower()
        inacessivel = "inacess" in saida or "unreachable" in saida or "100% loss" in saida or "100% de perda" in saida
        respondeu = "ttl=" in saida or "tempo" in saida or "time" in saida

        if resultado.returncode == 0 and respondeu and not inacessivel:
            resultado_final["ativo"] = True
        else:
            resultado_final["erro"] = f"O host '{host}' não existe."

    except subprocess.TimeoutExpired:
        resultado_final["erro"] = f"Tempo limite esgotado ao tentar alcançar '{host}'."
    except Exception as e:
        resultado_final["erro"] = f"Falha ao validar o host '{host}': {str(e)}"

    return resultado_final
