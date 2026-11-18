"use client";

import React from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Loader2, AlertTriangle, ShieldCheck, ArrowRight } from "lucide-react";

export type ToolStepStatus = "pending" | "running" | "completed" | "error";

export interface ToolStepData {
  status: ToolStepStatus;
  mensagem?: string;
  resultado?: any;
}

export interface ScannerLoaderProps {
  isDeepScan: boolean;
  stepsStatus?: Record<string, ToolStepData>;
  activeMessage?: string;
}

interface StepDefinition {
  id: string;
  title: string;
  defaultDesc: string;
}

export function ScannerLoader({ isDeepScan, stepsStatus = {}, activeMessage }: ScannerLoaderProps) {
  // Definição das etapas de acordo com o modo de escaneamento
  const steps: StepDefinition[] = isDeepScan
    ? [
        {
          id: "ping",
          title: "Preparação",
          defaultDesc: "Validando conectividade e alcançabilidade do host",
        },
        {
          id: "httpx",
          title: "HTTPX",
          defaultDesc: "Alive probing e detecção de tecnologias web",
        },
        {
          id: "nmap",
          title: "Nmap (Deep)",
          defaultDesc: "Varredura exaustiva de portas e scripts de enumeração",
        },
        {
          id: "ffuf",
          title: "Fuzzing Web",
          defaultDesc: "Buscando rotas, diretórios e arquivos críticos (.env, .bak)",
        },
        {
          id: "nuclei",
          title: "Nuclei",
          defaultDesc: "Varredura profunda de CVEs e vulnerabilidades críticas",
        },
        {
          id: "consolidacao",
          title: "Consolidação",
          defaultDesc: "Consolidando achados e calculando Score de Segurança",
        },
      ]
    : [
        {
          id: "ping",
          title: "Preparação",
          defaultDesc: "Validando conectividade e alcançabilidade do host",
        },
        {
          id: "httpx",
          title: "HTTPX",
          defaultDesc: "Alive probing e detecção de status code HTTP",
        },
        {
          id: "nmap",
          title: "Nmap (Fast)",
          defaultDesc: "Mapeando portas comuns e serviços expostos",
        },
        {
          id: "ffuf",
          title: "Fuzzing Web",
          defaultDesc: "Buscando rotas e diretórios públicos principais",
        },
        {
          id: "consolidacao",
          title: "Consolidação",
          defaultDesc: "Consolidando achados e montando relatório",
        },
      ];

  // Identifica a descrição atual a exibir no card inferior
  const getDisplayMessage = () => {
    if (activeMessage) return activeMessage;

    // Procura a etapa que está em execução no momento
    for (const step of steps) {
      const data = stepsStatus[step.id];
      if (data?.status === "running") {
        return data.mensagem || step.defaultDesc;
      }
    }

    // Se a consolidação estiver concluída
    if (stepsStatus["consolidacao"]?.status === "completed") {
      return "Varredura concluída! Todas as ferramentas finalizaram a execução.";
    }

    return "Inicializando ferramentas em segundo plano...";
  };

  return (
    <div className="w-full max-w-4xl mx-auto pt-6 flex flex-col items-center gap-6 font-sans">
      
      {/* Container do Stepper Horizontal */}
      <div className="flex w-full relative justify-between px-2 sm:px-4">
        {steps.map((step, index) => {
          const stepData = stepsStatus[step.id];
          const status: ToolStepStatus = stepData?.status || "pending";

          const isCompleted = status === "completed";
          const isRunning = status === "running";
          const isError = status === "error";
          const isPending = status === "pending";
          const isLast = index === steps.length - 1;

          return (
            <div key={step.id} className="relative flex-1 flex flex-col items-center gap-3">
              
              {/* Linha Conectora Horizontal */}
              {!isLast && (
                <div className="absolute top-[11px] left-[50%] w-full h-[2px] bg-zinc-800/60 z-0 overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-purple-500 to-purple-400 origin-left"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: isCompleted ? 1 : 0 }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                  />
                </div>
              )}

              {/* Indicador Visual da Etapa */}
              <div className="relative z-10 flex shrink-0 items-center justify-center w-[24px] h-[24px] bg-[#050505] rounded-full">
                <AnimatePresence mode="popLayout">
                  {isCompleted && (
                    <motion.div
                      key={`completed-${step.id}`}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center shadow-[0_0_10px_rgba(168,85,247,0.5)]"
                    >
                      <Check className="w-3 h-3 text-white stroke-[3]" />
                    </motion.div>
                  )}

                  {isRunning && (
                    <motion.div
                      key={`running-${step.id}`}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="w-5 h-5 rounded-full border-2 border-purple-500 flex items-center justify-center bg-[#050505] shadow-[0_0_10px_rgba(168,85,247,0.3)]"
                    >
                      <Loader2 className="w-3 h-3 text-purple-400 animate-spin" />
                    </motion.div>
                  )}

                  {isError && (
                    <motion.div
                      key={`error-${step.id}`}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="w-5 h-5 rounded-full border-2 border-red-500 bg-red-950/60 flex items-center justify-center shadow-[0_0_10px_rgba(239,68,68,0.4)]"
                    >
                      <AlertTriangle className="w-2.5 h-2.5 text-red-400 stroke-[2.5]" />
                    </motion.div>
                  )}

                  {isPending && (
                    <motion.div
                      key={`pending-${step.id}`}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="w-4 h-4 rounded-full border-2 border-zinc-800 bg-[#050505]"
                    />
                  )}
                </AnimatePresence>
              </div>

              {/* Título da Etapa */}
              <motion.h4
                animate={{
                  color: isRunning
                    ? "#FFFFFF"
                    : isCompleted
                    ? "#D4D4D8"
                    : isError
                    ? "#F87171"
                    : "#52525B",
                }}
                className="text-[11px] sm:text-[13px] font-semibold tracking-tight transition-colors duration-300 text-center select-none"
              >
                {step.title}
              </motion.h4>
            </div>
          );
        })}
      </div>

      {/* Descrição Dinâmica em Tempo Real da Etapa Atual */}
      <div className="w-full flex flex-col items-center justify-center text-center px-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={getDisplayMessage()}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
            className="flex items-center gap-2 max-w-xl text-[13px] text-zinc-300 font-medium bg-zinc-900/60 border border-zinc-800/80 px-4 py-2.5 rounded-full shadow-lg"
          >
            {stepsStatus["consolidacao"]?.status === "completed" ? (
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse shrink-0" />
            )}
            <span className="truncate">{getDisplayMessage()}</span>
          </motion.div>
        </AnimatePresence>

        {stepsStatus["consolidacao"]?.status === "completed" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
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
