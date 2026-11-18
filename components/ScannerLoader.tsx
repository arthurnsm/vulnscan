"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { Check, Loader2, AlertTriangle, ShieldCheck, ArrowRight } from "lucide-react";

export type ToolStepStatus = "pending" | "running" | "completed" | "error";

export interface ToolStepData {
  status: ToolStepStatus;
  mensagem?: string;
  resultado?: unknown;
}

export interface ScannerLoaderProps {
  isDeepScan: boolean;
  stepsStatus?: Record<string, ToolStepData>;
  completedOrder?: string[];
  activeMessage?: string;
}

interface VisibleNode {
  slotKey: string;
  id: string;
  title: string;
  status: ToolStepStatus;
}

export function ScannerLoader({
  isDeepScan,
  stepsStatus = {},
  completedOrder,
  activeMessage,
}: ScannerLoaderProps) {
  const stepMeta: Record<string, { title: string; defaultDesc: string }> = useMemo(
    () => ({
      ping: {
        title: "Preparação",
        defaultDesc: "Validando conectividade e alcançabilidade do host",
      },
      httpx: {
        title: "HTTPX",
        defaultDesc: isDeepScan
          ? "Alive probing e detecção de tecnologias web"
          : "Alive probing e detecção de status code HTTP",
      },
      nmap: {
        title: isDeepScan ? "Nmap (Deep)" : "Nmap (Fast)",
        defaultDesc: isDeepScan
          ? "Varredura de portas e scripts de enumeração"
          : "Mapeando portas comuns e serviços expostos",
      },
      ffuf: {
        title: "Fuzzing Web",
        defaultDesc: isDeepScan
          ? "Buscando rotas, diretórios e arquivos críticos"
          : "Buscando rotas e diretórios públicos principais",
      },
      nuclei: {
        title: "Nuclei",
        defaultDesc: "Varredura profunda de CVEs e exposições",
      },
      consolidacao: {
        title: "Consolidação",
        defaultDesc: "Consolidando achados e calculando Score de Segurança",
      },
    }),
    [isDeepScan]
  );

  // Constrói os nós visíveis em sequência linear estrita: começa com 1 ao centro e adiciona progressivamente
  const visibleNodes: VisibleNode[] = useMemo(() => {
    const expectedTools = isDeepScan
      ? ["httpx", "nmap", "ffuf", "nuclei"]
      : ["httpx", "nmap", "ffuf"];

    const finishedList =
      completedOrder ??
      Object.entries(stepsStatus)
        .filter(([, data]) => data.status === "completed" || data.status === "error")
        .map(([id]) => id);

    const pingStatus = stepsStatus["ping"]?.status || "running";

    // Fase 1: Apenas 1 bolinha central enquanto valida conectividade (ou se o ping falhar)
    if (!finishedList.includes("ping") || pingStatus === "error") {
      return [
        {
          slotKey: "slot-0",
          id: "ping",
          title: stepMeta.ping.title,
          status: pingStatus === "pending" ? "running" : pingStatus,
        },
      ];
    }

    const nodes: VisibleNode[] = [
      {
        slotKey: "slot-0",
        id: "ping",
        title: stepMeta.ping.title,
        status: "completed",
      },
    ];

    const finishedTools = finishedList.filter(
      (id) => id !== "ping" && id !== "consolidacao" && expectedTools.includes(id)
    );

    for (const toolId of finishedTools) {
      const toolStatus = stepsStatus[toolId]?.status || "completed";
      nodes.push({
        slotKey: `slot-${nodes.length}`,
        id: toolId,
        title: stepMeta[toolId]?.title || toolId.toUpperCase(),
        status: toolStatus,
      });
    }

    const remainingTools = expectedTools.filter((t) => !finishedTools.includes(t));

    if (remainingTools.length > 0) {
      let nextTitle = "Varredura";
      if (remainingTools.length === 1) {
        nextTitle = stepMeta[remainingTools[0]]?.title || remainingTools[0].toUpperCase();
      } else if (finishedTools.length === 0 && remainingTools.includes("httpx")) {
        nextTitle = stepMeta.httpx.title;
      }

      nodes.push({
        slotKey: `slot-${nodes.length}`,
        id: remainingTools.length === 1 ? remainingTools[0] : "scanning-active",
        title: nextTitle,
        status: "running",
      });
    } else {
      const consolidacaoStatus = stepsStatus["consolidacao"]?.status;
      nodes.push({
        slotKey: `slot-${nodes.length}`,
        id: "consolidacao",
        title: stepMeta.consolidacao.title,
        status:
          consolidacaoStatus === "completed" || consolidacaoStatus === "error"
            ? consolidacaoStatus
            : "running",
      });
    }

    return nodes;
  }, [isDeepScan, stepsStatus, completedOrder, stepMeta]);

  const getDisplayMessage = () => {
    if (stepsStatus["consolidacao"]?.status === "completed") {
      return "Varredura concluída! Todas as ferramentas finalizaram a execução.";
    }
    if (activeMessage) return activeMessage;
    return "Inicializando diagnóstico de segurança...";
  };

  const isCompletedAll = stepsStatus["consolidacao"]?.status === "completed";

  return (
    <div className="w-full max-w-4xl mx-auto pt-6 pb-2 flex flex-col items-center gap-6 font-sans">
      {/* Container Centralizado Dinâmico: cresce da esquerda para a direita recalculando o centro */}
      <LayoutGroup>
        <motion.div
          layout
          transition={{ layout: { type: "spring", stiffness: 280, damping: 24 } }}
          className="flex items-start justify-center w-full py-2 px-2"
        >
          {visibleNodes.map((node, index) => {
            const isCompleted = node.status === "completed";
            const isRunning = node.status === "running";
            const isError = node.status === "error";

            return (
              <motion.div
                key={node.slotKey}
                layout="position"
                transition={{
                  layout: { type: "spring", stiffness: 280, damping: 24 },
                }}
                className="relative flex flex-col items-center gap-3 w-[56px] sm:w-[122px] shrink-0"
              >
                {/* Linha Conectora vinda do centro da bolinha anterior até esta bolinha recém-nascida */}
                {index > 0 && (
                  <div className="absolute top-[11px] -left-1/2 w-full h-[2px] z-0 overflow-hidden">
                    <div className="w-full h-full bg-zinc-800/70">
                      <motion.div
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                        className={`w-full h-full origin-left ${
                          isError
                            ? "bg-gradient-to-r from-purple-500 to-red-500"
                            : "bg-gradient-to-r from-purple-500 to-purple-400"
                        }`}
                      />
                    </div>
                  </div>
                )}

                {/* Bolinha com efeito bouncy de nascimento */}
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{
                    type: "spring",
                    stiffness: 480,
                    damping: 13,
                    mass: 0.85,
                    delay: index === 0 ? 0.04 : 0.14,
                  }}
                  className="relative z-10 flex shrink-0 items-center justify-center w-[24px] h-[24px] bg-[#030303] rounded-full"
                >
                  <AnimatePresence mode="wait">
                    {isCompleted && (
                      <motion.div
                        key={`completed-${node.slotKey}`}
                        initial={{ scale: 0.4, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.4, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 450, damping: 16 }}
                        className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center shadow-[0_0_12px_rgba(168,85,247,0.55)]"
                      >
                        <Check className="w-3 h-3 text-white stroke-[3]" />
                      </motion.div>
                    )}

                    {isRunning && (
                      <motion.div
                        key={`running-${node.slotKey}`}
                        initial={{ scale: 0.6, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.6, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="w-5 h-5 rounded-full border-2 border-purple-500 flex items-center justify-center bg-[#030303] shadow-[0_0_12px_rgba(168,85,247,0.35)]"
                      >
                        <Loader2 className="w-3 h-3 text-purple-400 animate-spin" />
                      </motion.div>
                    )}

                    {isError && (
                      <motion.div
                        key={`error-${node.slotKey}`}
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.5, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 420, damping: 15 }}
                        className="w-5 h-5 rounded-full border-2 border-red-500 bg-red-950/70 flex items-center justify-center shadow-[0_0_12px_rgba(239,68,68,0.45)]"
                      >
                        <AlertTriangle className="w-2.5 h-2.5 text-red-400 stroke-[2.5]" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>

                {/* Título da Etapa */}
                <motion.h4
                  initial={{ opacity: 0, y: 6 }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    color: isRunning
                      ? "#FFFFFF"
                      : isCompleted
                      ? "#D4D4D8"
                      : "#F87171",
                  }}
                  transition={{
                    opacity: { duration: 0.22, delay: index === 0 ? 0.08 : 0.18 },
                    y: {
                      type: "spring",
                      stiffness: 340,
                      damping: 18,
                      delay: index === 0 ? 0.08 : 0.18,
                    },
                    color: { duration: 0.25 },
                  }}
                  className="text-[10px] sm:text-[13px] font-semibold tracking-tight text-center select-none sm:whitespace-nowrap max-w-full truncate"
                >
                  {node.title}
                </motion.h4>
              </motion.div>
            );
          })}
        </motion.div>
      </LayoutGroup>

      {/* Descrição Dinâmica em Tempo Real da Etapa Atual */}
      <div className="w-full flex flex-col items-center justify-center text-center px-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={getDisplayMessage()}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22 }}
            className="flex items-center gap-2 max-w-xl text-[13px] text-zinc-300 font-medium bg-zinc-900/60 border border-zinc-800/80 px-4 py-2.5 rounded-full shadow-lg"
          >
            {isCompletedAll ? (
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse shrink-0" />
            )}
            <span className="truncate">{getDisplayMessage()}</span>
          </motion.div>
        </AnimatePresence>

        {isCompletedAll && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 360, damping: 18 }}
            className="mt-3"
          >
            <Link
              href="/report"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs rounded-full shadow-[0_0_15px_rgba(168,85,247,0.4)] transition-all cursor-pointer"
            >
              Visualizar Relatório de Auditoria
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </motion.div>
        )}
      </div>
    </div>
  );
}
