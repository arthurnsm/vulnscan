import asyncio
import subprocess
import xml.etree.ElementTree as ET
from typing import Dict, Any
from urllib.parse import urlparse


def _extrair_host_nmap(alvo: str) -> str:
    limpo = (alvo or "").strip()
    if not limpo:
        return ""
    if not limpo.startswith(("http://", "https://")):
        limpo = f"http://{limpo}"
    return urlparse(limpo).hostname or alvo.strip()


async def run_nmap(alvo: str, tipo_scan: str) -> Dict[str, Any]:
    host_alvo = _extrair_host_nmap(alvo)

    if tipo_scan == "fast_scan":
        # Fast scan: Apenas portas comuns (-F), detecção de versão rápida (--version-light) e sem scripts padrão
        comando = [
            "nmap", "-F", "-sV", "--version-light", "-T4",
            "--host-timeout", "25s", "--max-retries", "1", "-oX", "-", host_alvo
        ]
    else:
        # Deep scan: varre todas as 65.535 portas em alvos locais ou as 1.000 principais em hosts externos
        # evitando descarte de resultados por host-timeout em firewalls externos
        eh_local = host_alvo in ("localhost", "127.0.0.1", "::1")
        porta_flag = ["-p-"] if eh_local else ["--top-ports", "1000"]
        comando = [
            "nmap", "-sT", "-sV", "-sC", *porta_flag, "-T4",
            "--min-rate", "500", "--max-retries", "1", "--host-timeout", "150s",
            "-oX", "-", host_alvo
        ]

    dados_finais = {
        "alvo_solicitado": alvo,
        "status": "",
        "erro": None,
        "hosts": []
    }

    try:
        # Inicia o processo em uma thread isolada para evitar NotImplementedError no Windows/Uvicorn
        resultado = await asyncio.to_thread(
            subprocess.run,
            comando,
            stdin=subprocess.DEVNULL,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=900.0
        )

        # Verifica se o Nmap retornou erro no sistema
        if resultado.returncode != 0:
            dados_finais["status"] = "erro"
            dados_finais["erro"] = resultado.stderr.strip() or "Erro de execução."
            return dados_finais

        # Decodifica a saída
        saida_bruta = resultado.stdout
        inicio_xml = saida_bruta.find("<?xml")

        if inicio_xml == -1:
            dados_finais["status"] = "erro"
            dados_finais["erro"] = "Saída XML inválida."
            return dados_finais

        xml_limpo = saida_bruta[inicio_xml:]
        root = ET.fromstring(xml_limpo)

        # Processamento do XML (mantido exatamente com a sua lógica)
        for host in root.findall('host'):
            info_host = {
                "ip": None,
                "estado": None,
                "portas": []
            }

            for address in host.findall('address'):
                if address.get('addrtype') == 'ipv4':
                    info_host["ip"] = address.get('addr')

            status = host.find('status')
            if status is not None:
                info_host["estado"] = status.get('state')

            ports = host.find('ports')
            if ports is not None:
                for port in ports.findall('port'):
                    estado_porta = port.find('state')
                    estado_str = estado_porta.get('state') if estado_porta is not None else "desconhecido"

                    if estado_str != "open":
                        continue

                    id_porta = port.get('portid')
                    protocolo = port.get('protocol')

                    servico = port.find('service')
                    nome_servico = "desconhecido"
                    produto = None
                    versao = None
                    info_extra = None

                    if servico is not None:
                        nome_servico = servico.get('name')
                        produto = servico.get('product')
                        versao = servico.get('version')
                        info_extra = servico.get('extrainfo')

                    scripts_executados = []
                    if tipo_scan != "fast_scan":
                        for script in port.findall('script'):
                            scripts_executados.append({
                                "id_script": script.get('id'),
                                "resultado": (script.get('output') or "").strip()
                            })

                    info_host["portas"].append({
                        "porta": int(id_porta),
                        "protocolo": protocolo,
                        "servico": {
                            "nome": nome_servico,
                            "produto": produto,
                            "versao": versao,
                            "detalhes": info_extra
                        },
                        "scripts_enum": scripts_executados
                    })

            dados_finais["hosts"].append(info_host)

        dados_finais["status"] = "sucesso"
        return dados_finais

    except subprocess.TimeoutExpired:
        dados_finais["status"] = "erro_timeout"
        dados_finais["erro"] = "O scan demorou muito e foi cancelado (timeout de 900s)."
        return dados_finais

    except FileNotFoundError:
        dados_finais["status"] = "erro_sistema"
        dados_finais["erro"] = "O binário do Nmap não foi encontrado no PATH."
        return dados_finais

    except ET.ParseError:
        dados_finais["status"] = "erro_parse"
        dados_finais["erro"] = "Não foi possível analisar o XML do Nmap."
        return dados_finais

    except Exception as e:
        dados_finais["status"] = "erro_execucao"
        dados_finais["erro"] = f"{type(e).__name__}: {str(e)}"
        return dados_finais
