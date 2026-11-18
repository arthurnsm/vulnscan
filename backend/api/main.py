from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel
import uvicorn
from fastapi.middleware.cors import CORSMiddleware
import os
import sys
import asyncio

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from routes.deep_orchestrator import DeepOrquestrator
from routes.fast_orchestrator import FastOrquestrator
from routes.stream_orchestrator import StreamScanOrquestrator
from scans.ping import ping_host

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],  
    allow_headers=["*"],
)

class buttonPayload(BaseModel):
    alvoUrl: str
    isDeepScan: bool = False
    stream: bool = False

class pingPayload(BaseModel):
    alvoUrl: str


@app.post("/api/ping")
async def PingAlvo(dados: pingPayload):
    validacao = await ping_host(dados.alvoUrl)
    if not validacao.get("ativo"):
        return JSONResponse(
            status_code=400,
            content={
                "status": "erro",
                "ativo": False,
                "host": validacao.get("host"),
                "erro": validacao.get("erro") or "O host informado não respondeu ao ping."
            }
        )
    return {
        "status": "sucesso",
        "ativo": True,
        "host": validacao.get("host")
    }


@app.post("/api/scan/stream")
async def ScanStream(dados: buttonPayload):
    """
    Endpoint SSE que transmite em tempo real o status e os eventos de cada ferramenta.
    """
    return StreamingResponse(
        StreamScanOrquestrator(dados.alvoUrl, dados.isDeepScan),
        media_type="text/event-stream"
    )


@app.post("/api/scan")
async def Scan(dados: buttonPayload, request: Request):
    # Se o cliente solicitar streaming via header ou payload, redireciona para o stream SSE
    accept_header = request.headers.get("accept", "")
    if dados.stream or "text/event-stream" in accept_header:
        return StreamingResponse(
            StreamScanOrquestrator(dados.alvoUrl, dados.isDeepScan),
            media_type="text/event-stream"
        )

    if not dados.isDeepScan:
        result = await FastOrquestrator(dados.alvoUrl)
        if isinstance(result, dict) and result.get("status") == "erro":
            return JSONResponse(status_code=400, content=result)
        return {"status": "sucesso", "tipo": "fast", "detalhes": result}
    else:
        result = await DeepOrquestrator(dados.alvoUrl)
        if isinstance(result, dict) and result.get("status") == "erro":
            return JSONResponse(status_code=400, content=result)
        return {"status": "sucesso", "tipo": "deep", "detalhes": result}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)
