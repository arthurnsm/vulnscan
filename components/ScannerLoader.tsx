"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { Check, Loader2, AlertTriangle } from "lucide-react";

export type ToolStepStatus = "pending" | "running" | "completed" | "error";

export interface ToolStepData {
  status: ToolStepStatus;
  mensagem?: string;
  resultado?: unknown;
}

export interface ScannerLoaderProps {
  isDeepScan: boolean;
  stepsStatus?: Record<string, ToolStepData>;
  onSequenceComplete?: () => void;
}

export function ScannerLoader({
  isDeepScan,
  stepsStatus = {},
  onSequenceComplete,
}: ScannerLoaderProps) {
  const sequence = useMemo(
    () =>
      isDeepScan
        ? [
            { id: "ping", title: "Preparação" },
            { id: "httpx", title: "HTTPX" },
            { id: "nmap", title: "Nmap (Deep)" },
            { id: "ffuf", title: "Fuzzing Web" },
            { id: "nuclei", title: "Nuclei" },
            { id: "consolidacao", title: "Consolidação" },
          ]
        : [
            { id: "ping", title: "Preparação" },
            { id: "httpx", title: "HTTPX" },
            { id: "nmap", title: "Nmap (Fast)" },
            { id: "ffuf", title: "Fuzzing Web" },
            { id: "consolidacao", title: "Consolidação" },
          ],
    [isDeepScan]
  );

  // Controla quantas bolinhas já nasceram (sempre começa em 1 ao centro) e quantas já podem exibir conclusão
  const [revealedCount, setRevealedCount] = useState<number>(1);
  const [settledCount, setSettledCount] = useState<number>(0);
  const completedCallbackFired = useRef(false);

  const activeTipIndex = revealedCount - 1;
  const activeStep = sequence[activeTipIndex];
  const activeBackendStatus = stepsStatus[activeStep.id]?.status;
  const isTipFinishedInBackend =
    activeBackendStatus === "completed" || activeBackendStatus === "error";

  // 1. Garante que a bolinha recém-nascida apareça animando em estado "running" antes de virar check/erro
  useEffect(() => {
    if (settledCount >= revealedCount) return;
    if (!isTipFinishedInBackend) return;

    const settleDelay = activeTipIndex === 0 ? 180 : 320;
    const timer = setTimeout(() => {
      setSettledCount(revealedCount);
    }, settleDelay);

    return () => clearTimeout(timer);
  }, [settledCount, revealedCount, isTipFinishedInBackend, activeTipIndex]);

  // 2. Só nasce a próxima bolinha da sequência fixa após a bolinha atual concluir visualmente
  useEffect(() => {
    if (settledCount < revealedCount) return;

    const currentStatus = stepsStatus[sequence[revealedCount - 1].id]?.status;
    // Se a preparação (ping) falhar, interrompe a sequência na primeira bolinha
    if (revealedCount === 1 && currentStatus === "error") return;

    if (revealedCount < sequence.length) {
      const nextTimer = setTimeout(() => {
        setRevealedCount((prev) => Math.min(sequence.length, prev + 1));
      }, 260);
      return () => clearTimeout(nextTimer);
    }

    // Sequência inteira concluída visualmente: dispara transição para o relatório
    if (
      revealedCount === sequence.length &&
      settledCount === sequence.length &&
      stepsStatus["consolidacao"]?.status === "completed" &&
      !completedCallbackFired.current
    ) {
      const finishTimer = setTimeout(() => {
        completedCallbackFired.current = true;
        onSequenceComplete?.();
      }, 420);
      return () => clearTimeout(finishTimer);
    }
  }, [settledCount, revealedCount, sequence, stepsStatus, onSequenceComplete]);

  const visibleSteps = sequence.slice(0, revealedCount);

  return (
    <div className="w-full max-w-4xl mx-auto pt-8 pb-4 flex flex-col items-center font-sans">
      <LayoutGroup>
        <motion.div
          layout
          transition={{ layout: { type: "spring", stiffness: 280, damping: 24 } }}
          className="flex items-start justify-center w-full py-2 px-2"
        >
          {visibleSteps.map((step, index) => {
            const rawStatus = stepsStatus[step.id]?.status || "running";
            const canShowFinalState = index < settledCount;
            const displayStatus: ToolStepStatus = canShowFinalState
              ? rawStatus === "completed" || rawStatus === "error"
                ? rawStatus
                : "running"
              : "running";

            const isCompleted = displayStatus === "completed";
            const isRunning = displayStatus === "running";
            const isError = displayStatus === "error";

            return (
              <motion.div
                key={step.id}
                layout="position"
                transition={{
                  layout: { type: "spring", stiffness: 280, damping: 24 },
                }}
                className="relative flex flex-col items-center gap-3 w-[56px] sm:w-[122px] shrink-0"
              >
                {/* Linha conectora do centro da bolinha anterior até esta bolinha */}
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

                {/* Bolinha com efeito bouncy ao nascer */}
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
                        key={`completed-${step.id}`}
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
                        key={`running-${step.id}`}
                        initial={{ scale: 0.6, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.6, opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        className="w-5 h-5 rounded-full border-2 border-purple-500 flex items-center justify-center bg-[#030303] shadow-[0_0_12px_rgba(168,85,247,0.35)]"
                      >
                        <Loader2 className="w-3 h-3 text-purple-400 animate-spin" />
                      </motion.div>
                    )}

                    {isError && (
                      <motion.div
                        key={`error-${step.id}`}
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
                  {step.title}
                </motion.h4>
              </motion.div>
            );
          })}
        </motion.div>
      </LayoutGroup>
    </div>
  );
}
