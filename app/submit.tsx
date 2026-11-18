"use client"
import React, { useState } from "react";

// 1. O formato que a sua API espera
interface ScanPayload {
  url: string;
  scan_type: "deep_scan" | "fast_scan";
}

// 2. O que o seu botão precisa receber para funcionar
interface BotaoProps {
  alvoUrl: string; 
  isDeepScan: boolean;
  onScanChange?: (isScanning: boolean) => void;
  onErrorChange?: (erro: string | null) => void;
  disabled?: boolean;
}

async function verificarHostPing(alvoUrl: string): Promise<{ ativo: boolean; erro?: string }> {
  try {
    const resBackend = await fetch("http://127.0.0.1:8001/api/ping", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alvoUrl }),
    });
    if (resBackend.status !== 404) {
      const dados = await resBackend.json();
      return {
        ativo: Boolean(resBackend.ok && dados.ativo),
        erro: dados.erro,
      };
    }
  } catch {
    // Fallback para a rota interna do Next.js caso o servidor FastAPI não esteja ativo
  }

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
    };
  } catch {
    return {
      ativo: false,
      erro: "Não foi possível validar o host informado.",
    };
  }
}

export function Botao({ alvoUrl, isDeepScan, onScanChange, onErrorChange, disabled }: BotaoProps) {
  const [loading, setLoading] = useState(false);

  async function Clique() {
    if (onErrorChange) onErrorChange(null);

    // Validação de segurança: se a string estiver vazia, nem tenta fazer o fetch
    if (!alvoUrl.trim() || disabled) {
      if (onErrorChange) onErrorChange("Informe uma URL ou host válido.");
      return;
    }

    setLoading(true);

    // 1. Faz o ping no host informado antes de iniciar o escaneamento
    const validacao = await verificarHostPing(alvoUrl);
    if (!validacao.ativo) {
      if (onErrorChange) {
        onErrorChange(validacao.erro || "O host informado não existe.");
      }
      if (onScanChange) onScanChange(false);
      setLoading(false);
      return;
    }

    if (onScanChange) onScanChange(true);

    const payload = {
      alvoUrl: alvoUrl,
      isDeepScan: isDeepScan // Envia o valor booleano (true/false) direto
    };

    try {
      const resposta = await fetch("http://127.0.0.1:8001/api/scan", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (resposta.ok) {
        console.log("foi");
        const dados = await resposta.json();
        console.log("Retorno da API:", dados);
      } else {
        const erroDados = await resposta.json().catch(() => null);
        if (onErrorChange) {
          onErrorChange(erroDados?.erro || "O host informado não existe.");
        }
        if (onScanChange) onScanChange(false);
      }
    } catch (erro) {
      console.error(erro);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button className="hover:cursor-pointer bg-zinc-900 text-white p-2 rounded disabled:opacity-50" onClick={Clique} disabled={loading || disabled}>
      {loading ? "Escaneando..." : "Escanear"}
    </button>
  );
}
