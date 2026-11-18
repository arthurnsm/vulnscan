"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

type BirthPhase = "unavailable" | "linking" | "filling" | "active";

interface StepNodeProps {
  id: string;
  title: string;
  index: number;
  status: ToolStepStatus;
  onActivated: (index: number) => void;
}

function StepNode({ id, title, index, status, onActivated }: StepNodeProps) {
  const [phase, setPhase] = useState<BirthPhase>("unavailable");
  const activatedNotified = useRef(false);

  useEffect(() => {
    if (index === 0) {
      // Primeira bolinha nasce indisponível no centro e ativa em roxo logo em seguida
      const tActive = setTimeout(() => {
        setPhase("active");
        if (!activatedNotified.current) {
          activatedNotified.current = true;
          onActivated(index);
        }
      }, 220);
      return () => clearTimeout(tActive);
    }

    // Sequência da nova bolinha: 1) nasce indisponível -> 2) linha conecta -> 3) roxo percorre linha -> 4) roxo preenche a bolinha
    const tLink = setTimeout(() => setPhase("linking"), 220);
    const tFill = setTimeout(() => setPhase("filling"), 480);
    const tActive = setTimeout(() => {
      setPhase("active");
      if (!activatedNotified.current) {
        activatedNotified.current = true;
        onActivated(index);
      }
    }, 820);

    return () => {
      clearTimeout(tLink);
      clearTimeout(tFill);
      clearTimeout(tActive);
    };
  }, [index, onActivated]);

  const showLine = index > 0 && phase !== "unavailable";
  const showPurpleTravel = index > 0 && (phase === "filling" || phase === "active");
  const isNodeActivated = phase === "active";

  const isCompleted = isNodeActivated && status === "completed";
  const isError = isNodeActivated && status === "error";
  const isRunning = isNodeActivated && !isCompleted && !isError;

  return (
    <motion.div
      layout="position"
      transition={{
        layout: { type: "spring", stiffness: 260, damping: 24 },
      }}
      className="relative flex flex-col items-center gap-3 w-[58px] sm:w-[122px] shrink-0"
    >
      {/* Linha conectora em 2 camadas: primeiro a linha base liga as bolinhas, depois o roxo percorre */}
      {index > 0 && (
        <div className="absolute top-[11px] -left-1/2 w-full h-[2px] z-0 overflow-hidden">
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: showLine ? 1 : 0 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="w-full h-full bg-zinc-700/80 origin-left relative"
          >
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: showPurpleTravel ? 1 : 0 }}
              transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
              className={`absolute inset-0 w-full h-full origin-left ${
                isError
                  ? "bg-gradient-to-r from-purple-500 to-red-500"
                  : "bg-gradient-to-r from-purple-500 to-purple-400"
              }`}
            />
          </motion.div>
        </div>
      )}

      {/* Bolinha: nasce bouncy indisponível e é preenchida com roxo após o percurso da linha */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{
          scale: isNodeActivated ? [1, 1.14, 1] : 1,
          opacity: 1,
        }}
        transition={{
          scale: isNodeActivated
            ? { duration: 0.34, ease: [0.22, 1, 0.36, 1] }
            : { type: "spring", stiffness: 480, damping: 13, mass: 0.85 },
          opacity: { duration: 0.2 },
        }}
        className="relative z-10 flex shrink-0 items-center justify-center w-[24px] h-[24px] bg-[#030303] rounded-full"
      >
        <motion.div
          animate={{
            borderColor: !isNodeActivated
              ? "#3F3F46"
              : isError
              ? "#EF4444"
              : "#A855F7",
            boxShadow: !isNodeActivated
              ? "0 0 0px rgba(168,85,247,0)"
              : isError
              ? "0 0 12px rgba(239,68,68,0.45)"
              : isCompleted
              ? "0 0 14px rgba(168,85,247,0.65)"
              : "0 0 12px rgba(168,85,247,0.4)",
          }}
          transition={{ duration: 0.25 }}
          className="relative w-5 h-5 rounded-full border-2 bg-zinc-900/90 flex items-center justify-center overflow-hidden"
        >
          {/* Preenchimento roxo contínuo vindo da esquerda quando a linha chega na bolinha */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{
              scaleX: isNodeActivated ? 1 : 0,
              backgroundColor: isError
                ? "rgba(127, 29, 29, 0.85)"
                : isCompleted
                ? "#A855F7"
                : "rgba(168, 85, 247, 0.28)",
            }}
            transition={{
              scaleX: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
              backgroundColor: { duration: 0.22 },
            }}
            className="absolute inset-0 origin-left"
          />

          <AnimatePresence mode="wait">
            {isRunning && (
              <motion.div
                key={`icon-running-${id}`}
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.4, opacity: 0 }}
                transition={{ duration: 0.16, delay: 0.08 }}
                className="relative z-10 flex items-center justify-center"
              >
                <Loader2 className="w-3 h-3 text-purple-200 animate-spin" />
              </motion.div>
            )}

            {isCompleted && (
              <motion.div
                key={`icon-completed-${id}`}
                initial={{ scale: 0.3, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.3, opacity: 0 }}
                transition={{ type: "spring", stiffness: 460, damping: 16 }}
                className="relative z-10 flex items-center justify-center"
              >
                <Check className="w-3 h-3 text-white stroke-[3]" />
              </motion.div>
            )}

            {isError && (
              <motion.div
                key={`icon-error-${id}`}
                initial={{ scale: 0.3, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.3, opacity: 0 }}
                transition={{ type: "spring", stiffness: 420, damping: 15 }}
                className="relative z-10 flex items-center justify-center"
              >
                <AlertTriangle className="w-2.5 h-2.5 text-red-400 stroke-[2.5]" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>

      {/* Título da Etapa: começa apagado (indisponível) e acende junto ao preenchimento roxo */}
      <motion.h4
        initial={{ opacity: 0, y: 6 }}
        animate={{
          opacity: 1,
          y: 0,
          color: !isNodeActivated
            ? "#52525B"
            : isRunning
            ? "#FFFFFF"
            : isCompleted
            ? "#D4D4D8"
            : "#F87171",
        }}
        transition={{
          opacity: { duration: 0.22 },
          y: { type: "spring", stiffness: 340, damping: 18 },
          color: { duration: 0.25 },
        }}
        className="text-[10px] sm:text-[13px] font-semibold tracking-tight text-center select-none sm:whitespace-nowrap max-w-full truncate"
      >
        {title}
      </motion.h4>
    </motion.div>
  );
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

  // Controla nascimento sequencial: 1) visível (indisponível) -> 2) linha + roxo preenchendo -> 3) concluída -> 4) nasce a próxima
  const [revealedCount, setRevealedCount] = useState<number>(1);
  const [highestActivatedIndex, setHighestActivatedIndex] = useState<number>(-1);
  const [settledCount, setSettledCount] = useState<number>(0);
  const completedCallbackFired = useRef(false);

  const handleNodeActivated = useCallback((idx: number) => {
    setHighestActivatedIndex((prev) => Math.max(prev, idx));
  }, []);

  const activeTipIndex = revealedCount - 1;
  const activeStep = sequence[activeTipIndex];
  const activeBackendStatus = stepsStatus[activeStep.id]?.status;
  const isTipFinishedInBackend =
    activeBackendStatus === "completed" || activeBackendStatus === "error";

  // Só conclui a bolinha atual depois que o roxo percorreu a linha e preencheu a bolinha
  useEffect(() => {
    if (settledCount >= revealedCount) return;
    if (highestActivatedIndex < activeTipIndex) return;
    if (!isTipFinishedInBackend) return;

    const timer = setTimeout(() => {
      setSettledCount(revealedCount);
    }, 260);

    return () => clearTimeout(timer);
  }, [settledCount, revealedCount, highestActivatedIndex, activeTipIndex, isTipFinishedInBackend]);

  // Só nasce a próxima bolinha depois que a bolinha atual concluiu visualmente
  useEffect(() => {
    if (settledCount < revealedCount) return;

    const currentStatus = stepsStatus[sequence[revealedCount - 1].id]?.status;
    if (revealedCount === 1 && currentStatus === "error") return;

    if (revealedCount < sequence.length) {
      const nextTimer = setTimeout(() => {
        setRevealedCount((prev) => Math.min(sequence.length, prev + 1));
      }, 220);
      return () => clearTimeout(nextTimer);
    }

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
          transition={{ layout: { type: "spring", stiffness: 260, damping: 24 } }}
          className="flex items-start justify-center w-full py-2 px-2"
        >
          {visibleSteps.map((step, index) => {
            const rawStatus = stepsStatus[step.id]?.status || "running";
            const displayStatus: ToolStepStatus =
              index < settledCount && (rawStatus === "completed" || rawStatus === "error")
                ? rawStatus
                : "running";

            return (
              <StepNode
                key={step.id}
                id={step.id}
                title={step.title}
                index={index}
                status={displayStatus}
                onActivated={handleNodeActivated}
              />
            );
          })}
        </motion.div>
      </LayoutGroup>
    </div>
  );
}
