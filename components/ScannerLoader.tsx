"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Loader2 } from "lucide-react";

interface Step {
  id: number;
  title: string;
  description: string;
}

export function ScannerLoader({ isDeepScan }: { isDeepScan: boolean }) {
  const [activeStep, setActiveStep] = useState(0);

  const steps: Step[] = [
    {
      id: 0,
      title: "Preparação",
      description: "Inicializando contêineres e orquestrando o ambiente para o alvo",
    },
    {
      id: 1,
      title: isDeepScan ? "Nmap (Deep)" : "Nmap (Fast)",
      description: "Mapeando portas abertas e extraindo versões de serviços",
    },
    {
      id: 2,
      title: "Fuzzing Web",
      description: "Buscando rotas, painéis e arquivos ocultos agressivamente",
    },
    {
      id: 3,
      title: "Consolidação",
      description: "Gerando pontuação de risco final e montando relatório",
    },
  ];

  // Simulação de avanço do Loader (mockup)
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep((prev) => {
        if (prev < steps.length - 1) return prev + 1;
        clearInterval(timer);
        return prev;
      });
    }, 3000); // Avança a cada 3 segundos

    return () => clearInterval(timer);
  }, [steps.length]);

  return (
    <div className="w-full max-w-3xl mx-auto pt-6 flex flex-col items-center gap-8 font-sans">
      
      {/* Container do Stepper Horizontal */}
      <div className="flex w-full relative justify-between">
        {steps.map((step, index) => {
          const isCompleted = index < activeStep;
          const isActive = index === activeStep;
          const isPending = index > activeStep;
          const isLast = index === steps.length - 1;

          return (
            <div key={step.id} className="relative flex-1 flex flex-col items-center gap-3">
              
              {/* Linha Conectora Horizontal */}
              {!isLast && (
                <div className="absolute top-[11px] left-[50%] w-full h-[2px] bg-zinc-800/50 z-0 overflow-hidden">
                  <motion.div
                    className="h-full bg-purple-500 origin-left"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: isCompleted ? 1 : 0 }}
                    transition={{ duration: 0.6, ease: "easeInOut" }}
                  />
                </div>
              )}

              {/* Ícone / Indicador da Etapa */}
              <div className="relative z-10 flex shrink-0 items-center justify-center w-[24px] h-[24px] bg-[#050505] rounded-full">
                <AnimatePresence mode="popLayout">
                  {isCompleted && (
                    <motion.div
                      key="completed"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center shadow-[0_0_8px_rgba(168,85,247,0.4)]"
                    >
                      <Check className="w-3 h-3 text-white stroke-[3]" />
                    </motion.div>
                  )}
                  {isActive && (
                    <motion.div
                      key="active"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="w-5 h-5 rounded-full border-2 border-purple-500 flex items-center justify-center bg-[#050505]"
                    >
                      <Loader2 className="w-3 h-3 text-purple-400 animate-spin" />
                    </motion.div>
                  )}
                  {isPending && (
                    <motion.div
                      key="pending"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="w-4 h-4 rounded-full border-2 border-zinc-800 bg-[#050505]"
                    />
                  )}
                </AnimatePresence>
              </div>

              {/* Título da Etapa */}
              <motion.h4
                animate={{
                  color: isActive ? "#F4F4F5" : isCompleted ? "#A1A1AA" : "#52525B",
                }}
                className="text-[12px] sm:text-[14px] font-semibold tracking-tight transition-colors duration-300 whitespace-nowrap"
              >
                {step.title}
              </motion.h4>
              
            </div>
          );
        })}
      </div>

      {/* Descrição Centralizada da Etapa Atual */}
      <div className="min-h-[48px] w-full flex justify-center text-center px-4 mt-2">
        <AnimatePresence mode="wait">
          <motion.p
            key={activeStep}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.3 }}
            className="text-[13px] font-medium text-zinc-500 max-w-lg leading-relaxed"
          >
            {steps[activeStep]?.description || "Concluído."}

            <div> O Scan está sendo executado em segundo plano. Pode fazer outra coisa enquanto isso, iremos notifica-lo quando estiver tudo pronto</div>
          </motion.p>
        </AnimatePresence>
      </div>

    </div>
  );
}
