"use client";

import React, { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { 
  Globe, 
  Calendar, 
  Zap, 
  Clock, 
  Terminal, 
  Download, 
  ChevronDown
} from "lucide-react";
import { jetBrainsMono } from "../app/fonts";

// Skeleton limpo sem o feixe branco percorrendo
function HairlineSkeleton({ 
  className = ""
}: { 
  className?: string; 
  delay?: number;
}) {
  return (
    <div className={`bg-zinc-800/70 rounded-full ${className}`} />
  );
}

export function AuditReportVisual() {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: false, amount: 0.25 });

  // Raio e circunferência do círculo de score
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const score = 68;
  const strokeOffset = circumference - (circumference * score) / 100;

  return (
    <div 
      ref={containerRef}
      className="w-full h-full absolute inset-0 bg-[#0a0a0a] p-6 sm:p-8 lg:p-10 flex flex-col justify-between gap-5 overflow-hidden select-none"
    >
      {/* HEADER: Título Skeleton + Pills de Metadados + Botão PDF */}
      <motion.div 
        initial={{ opacity: 0, y: 14 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col xl:flex-row xl:items-end justify-between gap-3.5 w-full"
      >
        <div className="flex flex-col gap-3">
          {/* Título Principal em Skeleton ("Relatório de Auditoria") */}
          <HairlineSkeleton className="h-6 sm:h-7 w-48 sm:w-56 bg-zinc-700/70 !rounded-md" delay={0.1} />

          {/* Linha de Pills com Hairline Border */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-zinc-900/90 border border-white/[0.07] px-2.5 py-1.5 rounded-lg">
              <Globe className="w-3 h-3 text-zinc-500" />
              <HairlineSkeleton className="w-24 sm:w-28 h-2 bg-zinc-700/60" delay={0.15} />
            </div>

            <div className="flex items-center gap-1.5 bg-zinc-900/90 border border-white/[0.07] px-2.5 py-1.5 rounded-lg">
              <Calendar className="w-3 h-3 text-zinc-500" />
              <HairlineSkeleton className="w-20 sm:w-24 h-2 bg-zinc-700/60" delay={0.25} />
            </div>

            <div className="flex items-center gap-1.5 bg-zinc-900/90 border border-white/[0.07] px-2.5 py-1.5 rounded-lg">
              <Zap className="w-3 h-3 text-zinc-500" />
              <HairlineSkeleton className="w-16 sm:w-20 h-2 bg-zinc-700/60" delay={0.35} />
            </div>

            <div className="flex items-center gap-1.5 bg-zinc-900/90 border border-white/[0.07] px-2.5 py-1.5 rounded-lg">
              <Clock className="w-3 h-3 text-zinc-500" />
              <HairlineSkeleton className="w-10 h-2 bg-zinc-700/60" delay={0.45} />
            </div>

            <div className="hidden sm:flex items-center gap-1.5 bg-zinc-900/90 border border-white/[0.07] px-2.5 py-1.5 rounded-lg">
              <Terminal className="w-3 h-3 text-zinc-500" />
              <HairlineSkeleton className="w-16 h-2 bg-zinc-700/60" delay={0.55} />
            </div>
          </div>
        </div>

        {/* Botão de Download (PDF) com Skeleton */}
        <div className="self-start xl:self-auto flex items-center gap-2 bg-white text-black px-4 py-2 rounded-full shrink-0">
          <Download className="w-3.5 h-3.5 text-zinc-800" />
          <HairlineSkeleton className="w-20 sm:w-24 h-2 bg-zinc-400/90" delay={0.2} />
        </div>
      </motion.div>

      {/* GRID CENTRAL: Preview Mockup (Esquerda) + Security Score (Direita) */}
      <div className="grid grid-cols-1 md:grid-cols-10 gap-4 w-full flex-1 min-h-0">
        
        {/* Card Esquerda: Browser Window Mockup (65%) */}
        <motion.div 
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1], delay: 0.12 }}
          className="md:col-span-6 bg-[#070708] border border-white/[0.07] rounded-2xl overflow-hidden flex flex-col relative min-h-[210px]"
        >
          {/* Top Bar da Janela */}
          <div className="h-9 w-full border-b border-white/[0.06] bg-zinc-900/40 flex items-center px-3.5 gap-3 shrink-0">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
              <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
              <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
            </div>
            
            {/* Barra de Endereço Central */}
            <div className="flex-1 flex justify-center">
              <div className="bg-black border border-white/[0.06] rounded-md px-3 py-1 flex items-center justify-center max-w-[190px] w-full">
                <HairlineSkeleton className="w-28 h-2 bg-zinc-700/60" delay={0.3} />
              </div>
            </div>
          </div>

          {/* Corpo da Janela */}
          <div className="flex-1 bg-black flex flex-col items-center justify-center relative p-6">
            <div className="relative z-10 flex flex-col items-center gap-2.5">
              <div className="p-2.5 bg-zinc-900/80 border border-white/[0.07] rounded-xl">
                <Globe className="w-6 h-6 text-zinc-500" />
              </div>
              <HairlineSkeleton className="w-24 h-2 bg-zinc-800" delay={0.4} />
            </div>
          </div>
        </motion.div>

        {/* Card Direita: Score Card com Gauge Circular + Severidades (35%) */}
        <motion.div 
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1], delay: 0.22 }}
          className="md:col-span-4 bg-[#070708] border border-white/[0.07] rounded-2xl p-5 flex flex-row items-center justify-between gap-3 relative overflow-hidden min-h-[210px]"
        >
          {/* Lado Esquerdo: Gauge Circular & Score */}
          <div className="flex flex-col items-center justify-center">
            {/* Rótulo "SECURITY SCORE" em Skeleton */}
            <HairlineSkeleton className="w-20 h-2 mb-3 bg-zinc-700/60" delay={0.3} />

            {/* Gauge Circular com Animação de Scroll */}
            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 bg-orange-500/10 blur-xl rounded-full scale-105 pointer-events-none" />
              <svg className="w-28 h-28 transform -rotate-90 relative z-10">
                <circle
                  cx="56"
                  cy="56"
                  r={radius}
                  stroke="currentColor"
                  strokeWidth="5"
                  fill="transparent"
                  className="text-zinc-900"
                />
                <motion.circle
                  cx="56"
                  cy="56"
                  r={radius}
                  stroke="#f97316"
                  strokeWidth="6"
                  fill="transparent"
                  strokeDasharray={circumference}
                  strokeLinecap="round"
                  className="drop-shadow-[0_0_8px_rgba(249,115,22,0.45)]"
                  initial={{ strokeDashoffset: circumference }}
                  animate={isInView ? { strokeDashoffset: strokeOffset } : { strokeDashoffset: circumference }}
                  transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
                />
              </svg>

              {/* Score no Centro */}
              <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
                <span className={`text-3xl font-bold text-white ${jetBrainsMono.className}`}>
                  {score}
                </span>
              </div>
            </div>

            {/* Status Pill: "Risco Moderado" com Skeleton */}
            <div className="mt-3 flex items-center justify-center bg-orange-500/10 border border-orange-500/20 px-3 py-1 rounded-full">
              <HairlineSkeleton className="w-16 h-2 bg-orange-400/50" delay={0.4} />
            </div>
          </div>

          {/* Lado Direito: Métricas de Severidade Alinhadas à Direita */}
          <div className="flex flex-col gap-3 items-end justify-center pr-1">
            {[
              { labelW: "w-10", num: "2", delay: 0.2 },
              { labelW: "w-8", num: "5", delay: 0.3 },
              { labelW: "w-9", num: "12", delay: 0.4 },
              { labelW: "w-14", num: "69", delay: 0.5 },
            ].map((stat, idx) => (
              <div key={idx} className="flex flex-col items-end gap-1">
                <HairlineSkeleton className={`${stat.labelW} h-1.5 bg-zinc-700/60`} delay={stat.delay} />
                <span className={`text-white text-base font-bold leading-none ${jetBrainsMono.className}`}>
                  {stat.num}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

      </div>

      {/* ACCORDION BAR: Vulnerabilidades Identificadas */}
      <motion.div 
        initial={{ opacity: 0, y: 12 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.32 }}
        className="w-full bg-[#070708] border border-white/[0.07] rounded-xl px-4 py-3.5 flex items-center justify-between"
      >
        <HairlineSkeleton className="w-40 sm:w-48 h-2.5 bg-zinc-700/60" delay={0.4} />
        <ChevronDown className="w-4 h-4 text-zinc-500" />
      </motion.div>
    </div>
  );
}
