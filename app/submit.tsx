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
  disabled?: boolean;
}

export function Botao({ alvoUrl, isDeepScan, onScanChange, disabled }: BotaoProps) {
  const [loading, setLoading] = useState(false);

  async function Clique() {
    // Validação de segurança: se a string estiver vazia, nem tenta fazer o fetch
    if (!alvoUrl || disabled) {
      alert("Alvo inválido!");
      return;
    }

    setLoading(true);
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