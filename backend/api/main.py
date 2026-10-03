from fastapi import FastAPI
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
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],  
    allow_headers=["*"],
)
class buttonPayload(BaseModel):
        alvoUrl: str
        isDeepScan: bool


@app.post("/api/scan")

async def Scan(dados: buttonPayload):
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