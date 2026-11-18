from fastapi import FastAPI
from fastapi.responses import JSONResponse
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


@app.post("/api/scan")
async def Scan(dados: buttonPayload):
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
