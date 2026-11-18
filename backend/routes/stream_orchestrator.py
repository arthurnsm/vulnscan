import asyncio
import json
import os
import sys
from typing import AsyncGenerator

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from scans.ping import ping_host
from scans.nmap import run_nmap
from scans.httpx import run_httpx
from scans.ffuf import run_ffuf
from scans.nuclei import run_nuclei


async def StreamScanOrquestrator(url: str, is_deep_scan: bool = False) -> AsyncGenerator[str, None]:
    """
    Orquestra a execução das ferramentas de varredura emitindo eventos em tempo real (SSE).
    Cada evento contém a etapa atual, status ('running', 'completed', 'error') e mensagens contextuais.
    """
    scan_type = "deep_scan" if is_deep_scan else "fast_scan"

    # 1. Etapa de Preparação / Validação de Conectividade (Ping)
    yield f"data: {json.dumps({'etapa': 'ping', 'status': 'running', 'mensagem': 'Validando conectividade e alcançabilidade do host alvo...'})}\n\n"

    validacao = await ping_host(url)
    if not validacao.get("ativo"):
        erro_msg = validacao.get("erro") or "O host alvo não respondeu ao ping de conectividade."
        yield f"data: {json.dumps({'etapa': 'ping', 'status': 'error', 'erro': erro_msg, 'mensagem': erro_msg})}\n\n"
        return

    host_alvo = validacao.get("host") or url
    yield f"data: {json.dumps({'etapa': 'ping', 'status': 'completed', 'host': host_alvo, 'mensagem': f'Host \"{host_alvo}\" online e acessível.'})}\n\n"

    # 2. Definição do conjunto de ferramentas a serem executadas
    ferramentas = [
        ("httpx", run_httpx(url, scan_type)),
        ("nmap", run_nmap(url, scan_type)),
        ("ffuf", run_ffuf(url, scan_type)),
    ]

    if is_deep_scan:
        ferramentas.append(("nuclei", run_nuclei(url, scan_type)))

    # Notifica início das ferramentas
    for nome, _ in ferramentas:
        nome_display = nome.upper()
        yield f"data: {json.dumps({'etapa': nome, 'status': 'running', 'mensagem': f'Inicializando {nome_display}...'})}\n\n"

    # 3. Disparo concorrente com fila para reportar cada ferramenta no instante exato de término
    queue = asyncio.Queue()

    async def worker(tool_name: str, coroutine):
        try:
            res = await coroutine
            status_calc = "completed" if res.get("status") == "sucesso" else "error"
            await queue.put((tool_name, status_calc, res))
        except Exception as e:
            await queue.put((tool_name, "error", {"status": "erro", "erro": str(e)}))

    # Cria as tarefas assíncronas em paralelo
    for nome, coro in ferramentas:
        asyncio.create_task(worker(nome, coro))

    resultados_coletados = {}

    for _ in range(len(ferramentas)):
        tool_name, st, res = await queue.get()
        resultados_coletados[tool_name] = res

        # Gera mensagens detalhadas conforme a ferramenta
        if st == "error":
            msg = f"{tool_name.upper()} finalizou com erro: {res.get('erro', 'Falha na execução.')}"
        elif tool_name == "nmap":
            hosts = res.get("hosts", [])
            total_portas = sum(len(h.get("portas", [])) for h in hosts)
            msg = f"Nmap concluído: {total_portas} porta(s) aberta(s) identificada(s)."
        elif tool_name == "httpx":
            achados = res.get("resultados", [])
            status_http = achados[0].get("status_code") if achados and isinstance(achados[0], dict) else "online"
            msg = f"HTTPX concluído: resposta HTTP {status_http} detectada."
        elif tool_name == "ffuf":
            achados = res.get("resultados", [])
            msg = f"FFuf concluído: {len(achados)} rota(s) ou diretório(s) mapeado(s)."
        elif tool_name == "nuclei":
            achados = res.get("resultados", [])
            msg = f"Nuclei concluído: {len(achados)} vulnerabilidade(s) analisada(s)."
        else:
            msg = f"{tool_name.upper()} concluído com sucesso."

        yield f"data: {json.dumps({'etapa': tool_name, 'status': st, 'mensagem': msg, 'resultado': res})}\n\n"

    # 4. Etapa final: Consolidação do Relatório
    yield f"data: {json.dumps({'etapa': 'consolidacao', 'status': 'running', 'mensagem': 'Compilando achados e consolidando relatório final...'})}\n\n"

    relatorio_consolidado = {
        "status": "sucesso",
        "alvo": url,
        "host": host_alvo,
        "tipo": scan_type,
        "nmap": [resultados_coletados.get("nmap", {})],
        "httpx": [resultados_coletados.get("httpx", {})],
        "ffuf": [resultados_coletados.get("ffuf", {})],
        "nuclei": [resultados_coletados.get("nuclei", {})] if is_deep_scan else [],
        "ffuz": [resultados_coletados.get("ffuf", {})]
    }

    yield f"data: {json.dumps({'etapa': 'consolidacao', 'status': 'completed', 'mensagem': 'Relatório compilado com sucesso!', 'relatorio': relatorio_consolidado})}\n\n"


if __name__ == "__main__":
    alvo = sys.argv[1] if len(sys.argv) > 1 else "localhost"
    is_deep = len(sys.argv) > 2 and sys.argv[2].lower() in ["deep", "deep_scan", "true", "1"]

    async def main():
        async for chunk in StreamScanOrquestrator(alvo, is_deep):
            print(chunk, end="", flush=True)

    asyncio.run(main())
