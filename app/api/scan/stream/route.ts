import { NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const alvoUrl = typeof body?.alvoUrl === "string" ? body.alvoUrl.trim() : "";
    const isDeepScan = Boolean(body?.isDeepScan);

    if (!alvoUrl) {
      return NextResponse.json(
        { status: "erro", erro: "URL alvo não fornecida." },
        { status: 400 }
      );
    }

    // 1. Tenta conectar primeiro ao FastAPI em execução na porta 8001
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 300);

      const fastApiResponse = await fetch("http://127.0.0.1:8001/api/scan/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "text/event-stream",
        },
        body: JSON.stringify({ alvoUrl, isDeepScan }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (fastApiResponse.ok && fastApiResponse.body) {
        return new Response(fastApiResponse.body, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
          },
        });
      }
    } catch {
      // FastAPI não está rodando na porta 8001; prossegue com fallback de execução direta via Python
    }

    // 2. Fallback: Executa diretamente o script orquestrador em Python via processo filho
    const scriptPath = path.resolve(process.cwd(), "backend", "routes", "stream_orchestrator.py");
    const pyProcess = spawn("python", ["-u", scriptPath, alvoUrl, isDeepScan ? "deep" : "fast"]);

    const stream = new ReadableStream({
      start(controller) {
        let isClosed = false;

        const safeClose = () => {
          if (!isClosed) {
            isClosed = true;
            try {
              controller.close();
            } catch {
              // Stream já fechado ou cancelado pelo consumidor
            }
          }
        };

        const safeEnqueue = (chunk: Buffer | Uint8Array) => {
          if (!isClosed) {
            try {
              controller.enqueue(chunk);
            } catch {
              isClosed = true;
            }
          }
        };

        pyProcess.stdout.on("data", (chunk: Buffer) => {
          safeEnqueue(chunk);
        });

        pyProcess.stderr.on("data", (errChunk: Buffer) => {
          console.error("Erro no processo do scanner:", errChunk.toString());
        });

        pyProcess.on("close", () => {
          safeClose();
        });

        pyProcess.on("error", (err) => {
          console.error("Falha ao instanciar o Python:", err);
          const errorPayload = `data: ${JSON.stringify({
            etapa: "consolidacao",
            status: "error",
            erro: `Falha ao executar Python: ${err.message}`,
            mensagem: "Certifique-se de que o Python está instalado e acessível no PATH.",
          })}\n\n`;
          safeEnqueue(Buffer.from(errorPayload));
          safeClose();
        });
      },
      cancel() {
        try {
          pyProcess.kill();
        } catch {
          // Processo já finalizado
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { status: "erro", erro: err?.message || "Erro interno ao iniciar escaneamento." },
      { status: 500 }
    );
  }
}
