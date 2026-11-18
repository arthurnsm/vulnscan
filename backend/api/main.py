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
from routes.rate_limiter import (
    GlobalSlidingWindowRateLimiter,
    build_rate_limit_headers,
    orchestrator_rate_limiter,
)
from routes.stream_orchestrator import StreamScanOrquestrator
from scans.ping import ping_host

ORCHESTRATOR_ENDPOINTS = {"/api/scan", "/api/scan/stream"}


class OrchestratorRateLimitMiddleware:
    """Middleware ASGI que impõe limite global de 10 req/s nas chamadas ao orquestrador."""

    def __init__(
        self,
        app,
        limiter: GlobalSlidingWindowRateLimiter = orchestrator_rate_limiter,
    ) -> None:
        self.app = app
        self.limiter = limiter

    async def __call__(self, scope, receive, send) -> None:
        if scope.get("type") != "http" or scope.get("method") != "POST":
            await self.app(scope, receive, send)
            return

        normalized_path = (scope.get("path") or "/").rstrip("/") or "/"
        if normalized_path not in ORCHESTRATOR_ENDPOINTS:
            await self.app(scope, receive, send)
            return

        limit_result = self.limiter.acquire()
        headers = build_rate_limit_headers(limit_result)

        if not limit_result.allowed:
            response = JSONResponse(
                status_code=429,
                content={
                    "status": "erro",
                    "erro": (
                        f"Limite de requisições excedido: máximo de {limit_result.limit} "
                        "requisições por segundo na chamada do orquestrador."
                    ),
                    "retry_after": limit_result.retry_after_seconds,
                },
                headers=headers,
            )
            await response(scope, receive, send)
            return

        async def send_with_rate_limit_headers(message) -> None:
            if message["type"] == "http.response.start":
                raw_headers = list(message.get("headers", []))
                existing_names = {k.lower() for k, _ in raw_headers}
                for key, value in headers.items():
                    key_bytes = key.lower().encode("latin-1")
                    if key_bytes not in existing_names:
                        raw_headers.append((key_bytes, value.encode("latin-1")))
                message = {**message, "headers": raw_headers}
            await send(message)

        await self.app(scope, receive, send_with_rate_limit_headers)


app = FastAPI()

app.add_middleware(OrchestratorRateLimitMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Retry-After", "X-RateLimit-Limit", "X-RateLimit-Remaining"],
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
