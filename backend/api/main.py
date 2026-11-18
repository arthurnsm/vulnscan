from fastapi import FastAPI
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import uvicorn
from fastapi.middleware.cors import CORSMiddleware
app = FastAPI()
import os
import sys
import asyncio

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from routes.deep_orchestrator import DeepOrquestrator
from routes.fast_orchestrator import FastOrquestrator
from scans.ping import ping_host
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
      if not validacao["ativo"]:
            return JSONResponse(
                  status_code=400,
                  content={
                        "status": "erro",
                        "ativo": False,
                        "host": validacao["host"],
                        "erro": validacao["erro"] or "O host informado não existe."
                  }
            )
      return {
            "status": "sucesso",
            "ativo": True,
            "host": validacao["host"]
      }


@app.post("/api/scan")

async def Scan(dados: buttonPayload):
      validacao = await ping_host(dados.alvoUrl)
      if not validacao["ativo"]:
            return JSONResponse(
                  status_code=400,
                  content={
                        "status": "erro",
                        "ativo": False,
                        "host": validacao["host"],
                        "erro": validacao["erro"] or "O host informado não existe."
                  }
            )

      if dados.isDeepScan == False:
            result = await FastOrquestrator(dados.alvoUrl)
            print(result)
            return {"status": "sucesso", "tipo": "fast", "detalhes": result}

      elif dados.isDeepScan == True:
            result = await DeepOrquestrator(dados.alvoUrl)
            print("=== RECEBENDO NOVA REQUISIÇÃO: DEEP SCAN ===")
            print(result)
            return {"status": "sucesso", "tipo": "deep", "mensagem": "Deep scan recebido"}
  
            



if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)
