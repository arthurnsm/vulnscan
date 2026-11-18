"use client"
import React, { useState } from "react";

export interface StepUpdateEvent {
  etapa: string;
  status: "pending" | "running" | "completed" | "error";
  mensagem?: string;
  resultado?: Record<string, unknown> | unknown;
  relatorio?: Record<string, unknown>;
}

interface BotaoProps {
  alvoUrl: string; 
  isDeepScan: boolean;
  onScanChange?: (isScanning: boolean) => void;
  onErrorChange?: (erro: string | null) => void;
  onStepUpdate?: (event: StepUpdateEvent) => void;
  onScanComplete?: (relatorio: Record<string, unknown> | undefined) => void;
  disabled?: boolean;
}

async function verificarHostPing(alvoUrl: string): Promise<{ ativo: boolean; erro?: string; host?: string }> {
  try {
    const resLocal = await fetch("/api/ping", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alvoUrl }),
    });
    const dados = await resLocal.json();
    return {
      ativo: Boolean(resLocal.ok && dados.ativo),
      erro: dados.erro,
      host: dados.host,
    };
  } catch {
    // Fallback secundário para FastAPI direto na porta 8001 se aplicável
    try {
      const resBackend = await fetch("http://127.0.0.1:8001/api/ping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alvoUrl }),
      });
      const dados = await resBackend.json();
      return {
        ativo: Boolean(resBackend.ok && dados.ativo),
        erro: dados.erro,
        host: dados.host,
      };
    } catch {
      return {
        ativo: false,
        erro: "Não foi possível validar o host informado.",
      };
    }
  }
}

export function Botao({
  alvoUrl,
  isDeepScan,
  onScanChange,
  onErrorChange,
  onStepUpdate,
  onScanComplete,
  disabled
}: BotaoProps) {
  const [loading, setLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  async function Clique() {
    if (onErrorChange) onErrorChange(null);

    // Validação de segurança: se a string estiver vazia, nem tenta fazer o fetch
    if (!alvoUrl.trim() || disabled) {
      if (onErrorChange) onErrorChange("Informe uma URL ou host válido.");
      return;
    }

    setLoading(true);
    setIsRedirecting(false);
    const scanStartTime = Date.now();
    if (onScanChange) onScanChange(true);

    // Notifica início do processo de preparação
    if (onStepUpdate) {
      onStepUpdate({
        etapa: "ping",
        status: "running",
        mensagem: "Validando conectividade e alcançabilidade do host...",
      });
    }

    // 1. Faz o ping no host informado antes de iniciar o escaneamento
    const validacao = await verificarHostPing(alvoUrl);
    if (!validacao.ativo) {
      const erroMsg = validacao.erro || "O host informado não respondeu ao teste de ping.";
      if (onStepUpdate) {
        onStepUpdate({
          etapa: "ping",
          status: "error",
          mensagem: erroMsg,
        });
      }
      if (onErrorChange) onErrorChange(erroMsg);
      if (onScanChange) onScanChange(false);
      setLoading(false);
      return;
    }

    // Ping concluído com sucesso
    if (onStepUpdate) {
      onStepUpdate({
        etapa: "ping",
        status: "completed",
        mensagem: `Host "${validacao.host || alvoUrl}" online e pronto para auditoria.`,
      });
    }

    const payload = {
      alvoUrl: alvoUrl,
      isDeepScan: isDeepScan,
      stream: true,
    };

    let scanSuccessful = false;

    try {
      // 2. Conecta ao endpoint de stream SSE para acompanhar o status de cada ferramenta em tempo real
      let resposta: Response | null = null;
      try {
        resposta = await fetch("/api/scan/stream", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "text/event-stream",
          },
          body: JSON.stringify(payload),
        });
      } catch {
        // Fallback para conexão direta ao FastAPI
        resposta = await fetch("http://127.0.0.1:8001/api/scan/stream", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "text/event-stream",
          },
          body: JSON.stringify(payload),
        });
      }

      if (!resposta || !resposta.ok) {
        const erroDados = await resposta?.json().catch(() => null);
        throw new Error(erroDados?.erro || "Falha ao iniciar escaneamento no backend.");
      }

      if (resposta.body) {
        const reader = resposta.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        const processRawChunk = (rawText: string) => {
          const lines = rawText.split(/\r?\n/);
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith("data:")) {
              const jsonString = trimmed.replace(/^data:\s*/, "");
              try {
                const eventData: StepUpdateEvent = JSON.parse(jsonString);
                if (onStepUpdate) {
                  onStepUpdate(eventData);
                }

                if (eventData.etapa === "consolidacao" && eventData.status === "completed") {
                  scanSuccessful = true;
                  setIsRedirecting(true);
                  const totalSec = Math.max(1, Math.round((Date.now() - scanStartTime) / 1000));
                  const mins = Math.floor(totalSec / 60);
                  const secs = totalSec % 60;
                  const formattedDuration = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
                  const formattedDate = new Date().toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  const generatedId = `VS-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
                  const finalReport = eventData.relatorio
                    ? {
                        ...eventData.relatorio,
                        duration: eventData.relatorio.duration || formattedDuration,
                        date: eventData.relatorio.date || formattedDate,
                        scanId: eventData.relatorio.scanId || generatedId,
                      }
                    : eventData.relatorio;
                  if (onScanComplete) {
                    onScanComplete(finalReport);
                  }
                }
              } catch (parseErr) {
                console.error("Erro ao decodificar evento SSE:", parseErr);
              }
            }
          }
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split(/\r?\n\r?\n/);
          buffer = parts.pop() || "";

          for (const chunk of parts) {
            processRawChunk(chunk);
          }
        }

        // Processa qualquer mensagem restante no buffer após encerramento do stream
        if (buffer.trim()) {
          processRawChunk(buffer);
        }
      } else {
        // Fallback caso streaming não esteja disponível na resposta
        const dados = (await resposta.json()) as Record<string, unknown>;
        scanSuccessful = true;
        setIsRedirecting(true);
        if (onScanComplete) onScanComplete(dados);
      }
    } catch (erro: unknown) {
      const mensagemErro =
        erro instanceof Error
          ? erro.message
          : "Ocorreu um erro durante a execução das ferramentas.";
      console.error("Erro na comunicação com o scanner:", erro);
      if (onErrorChange) {
        onErrorChange(mensagemErro);
      }
      if (onStepUpdate) {
        onStepUpdate({
          etapa: "consolidacao",
          status: "error",
          mensagem: mensagemErro,
        });
      }
      if (onScanChange) onScanChange(false);
    } finally {
      if (!scanSuccessful) {
        setLoading(false);
      }
    }
  }

  return (
    <button
      className="hover:cursor-pointer bg-zinc-900 text-white p-2 rounded disabled:opacity-50"
      onClick={Clique}
      disabled={loading || isRedirecting || disabled}
    >
      {isRedirecting ? "Redirecionando..." : loading ? "Escaneando..." : "Escanear"}
    </button>
  );
}
