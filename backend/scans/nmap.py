import asyncio
import xml.etree.ElementTree as ET
from typing import Dict, Any

async def run_nmap(alvo: str) -> Dict[str, Any]:
   
    comando = ["nmap", "-sT", "-sV", "-sC", "-oX", "-", alvo]
    
    dados_finais = {
        "alvo_solicitado": alvo,
        "status": "",
        "erro": None,
        "hosts": []
    }

    try:
        # Inicia o processo de forma assíncrona (não bloqueia a API)
        processo = await asyncio.create_subprocess_exec(
            *comando,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )

        # Aguarda a execução com o timeout de 900 segundos (15 minutos)
        stdout, stderr = await asyncio.wait_for(
            processo.communicate(),
            timeout=900.0
        )

        # Verifica se o Nmap retornou erro no sistema
        if processo.returncode != 0:
            dados_finais["status"] = "erro"
            dados_finais["erro"] = stderr.decode().strip() or "Erro de execução."
            return dados_finais

        # Decodifica a saída
        saida_bruta = stdout.decode()
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
                    for script in port.findall('script'):
                        scripts_executados.append({
                            "id_script": script.get('id'),
                            "resultado": script.get('output').strip()
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

    # Tratamento de erros assíncronos e de sistema
    except asyncio.TimeoutError:
        # Importante: Se der timeout, precisamos matar o processo "zumbi" do nmap no sistema
        try:
            processo.kill()
        except Exception:
            pass
            
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