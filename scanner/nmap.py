import subprocess
import json
import xml.etree.ElementTree as ET
from fastapi import FastAPI
from pydantic import BaseModel
app = FastAPI() 




def nmap_command(alvo):
    # Flags selecionadas:
    # -sT : TCP Connect Scan (não requer root)
    # -sV : Detecção de versão de serviços e produtos
    # -sC : Executa scripts seguros padrão (Enumeração profunda)
    # -oX - : Saída em XML limpo para o stdout
    # Nota: Sem verbosidade (-v) para não sujar o terminal
    comando = ["nmap", "-sT", "-sV", "-sC", "-oX", "-", alvo]
    
    dados_finais = {
        "alvo_solicitado": alvo,
        "status": "",
        "erro": None,
        "hosts": []
    }

    try:
        print(f"[*] Iniciando scan avançado (sem root) no alvo: {alvo}...")
        processo = subprocess.run(comando, capture_output=True, text=True, timeout=900)

        if processo.returncode != 0:
            dados_finais["status"] = "erro"
            dados_finais["erro"] = processo.stderr.strip() or "Erro de execução."
            return dados_finais

        saida_bruta = processo.stdout
        inicio_xml = saida_bruta.find("<?xml")
        
        if inicio_xml == -1:
             dados_finais["status"] = "erro"
             dados_finais["erro"] = "Saída XML inválida."
             return dados_finais
             
        xml_limpo = saida_bruta[inicio_xml:]
        root = ET.fromstring(xml_limpo)

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
                    
                    # Extração rica de serviço (-sV)
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

    except subprocess.TimeoutExpired:
        dados_finais["status"] = "erro_timeout"
        dados_finais["erro"] = "O scan demorou muito e foi cancelado."
        return dados_finais
    except FileNotFoundError:
        dados_finais["status"] = "erro_sistema"
        dados_finais["erro"] = "O binário do Nmap não foi encontrado."
        return dados_finais
    except ET.ParseError:
         dados_finais["status"] = "erro_parse"
         dados_finais["erro"] = "Não foi possível analisar o XML do Nmap."
         return dados_finais

alvo = "scanme.nmap.org"
    

class Url(BaseModel):
    url: str

@app.post("/teste")
def nmap(url:Url):

    resultado = nmap_command(url.url)
    return resultado


