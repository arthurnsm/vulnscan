import asyncio
from fastapi import APIRouter
from schemas.scan import ScanRequest
from services.subfinder import run_subfinder
from services.ffuf import run_ffuf

router = APIRouter(prefix="/api/scan", tags=["Orchestrator"])

@router.post("")
async def start_scan(payload: ScanRequest):
    # Dispara as ferramentas importadas de forma concorrente
    subfinder_task = run_subfinder(payload.target)
    ffuf_task = run_ffuf(f"https://{payload.target}", payload.wordlist)

    # Aguarda todas terminarem
    subfinder_res, ffuf_res = await asyncio.gather(
        subfinder_task,
        ffuf_task,
        return_exceptions=True
    )

    return {
        "target": payload.target,
        "subdomains": subfinder_res if not isinstance(subfinder_res, Exception) else {"error": str(subfinder_res)},
        "fuzzing": ffuf_res if not isinstance(ffuf_res, Exception) else {"error": str(ffuf_res)}
    }