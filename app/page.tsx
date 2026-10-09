"use client"

import React, { useState, useEffect, useRef } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { Botao } from "./submit";
import { Navbar } from "../components/Navbar";
import { FeatureRow } from "../components/FeatureRow";
import { ScannerLoader } from "../components/ScannerLoader";
import { ShieldAlert, Terminal, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const jetBrainsMono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500"] });

// Componente das cobrinhas: trilhas fixas, direções aleatórias
function Snake({ isVertical, track }: { isVertical: boolean, track: number }) {
  const [key, setKey] = useState(0);
  const [delay, setDelay] = useState(0);
  const [reverse, setReverse] = useState(false);

  useEffect(() => {
    setDelay(Math.random() * 5);
    setReverse(Math.random() > 0.5);
  }, [key]);

  // Criando um degradê em "sino" (bell curve) com múltiplas paradas.
  // Isso remove completamente as "marcas" ou faixas duras de transição, difundindo a cor de forma extremamente suave do centro para as pontas.
  const backgroundImage = isVertical
    ? "linear-gradient(to bottom, transparent 0%, rgba(168,85,247,0.05) 20%, rgba(168,85,247,0.4) 50%, rgba(168,85,247,0.05) 80%, transparent 100%)"
    : "linear-gradient(to right, transparent 0%, rgba(168,85,247,0.05) 20%, rgba(168,85,247,0.4) 50%, rgba(168,85,247,0.05) 80%, transparent 100%)";

  const startPos = "-20%";
  const endPos = "120%";
  const FIXED_DURATION = 8;

  return (
    <motion.div
      key={key}
      // Tamanho ajustado para 100px para permitir que o degradê tenha espaço suficiente para se difundir sem criar bordas duras
      className={`absolute rounded-full blur-[1px] ${
        isVertical ? "w-[2px] h-[100px]" : "h-[2px] w-[100px]"
      }`}
      style={{ 
        [isVertical ? "left" : "top"]: `calc(4rem * ${track})`,
        backgroundImage
      }}
      initial={{ [isVertical ? "top" : "left"]: reverse ? endPos : startPos, opacity: 0 }}
      animate={{ [isVertical ? "top" : "left"]: reverse ? startPos : endPos, opacity: [0, 1, 1, 0] }}
      transition={{ duration: FIXED_DURATION, ease: "linear", delay }}
      onAnimationComplete={() => setKey((k) => k + 1)}
    />
  );
}



export default function Home() {
  const [textUrl, setTextUrl] = useState("");
  const [isDeepScan, setIsDeepScan] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [hideTooltip, setHideTooltip] = useState(false);
  const [searchActive, setSearchActive] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem("hideDeepScanTooltip");
    if (stored === "true") {
      setHideTooltip(true);
    }
    
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.pageX, y: e.pageY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Element;
      if (target.closest('#deep-scan-switch')) return;
      
      if (tooltipRef.current && !tooltipRef.current.contains(target as Node)) {
        setHideTooltip(true);
      }
    };

    if (isDeepScan && !hideTooltip) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDeepScan, hideTooltip]);



  return (
    <div className={`w-full min-h-screen bg-[#050505] text-zinc-300 ${jakarta.className} flex flex-col`}>
      

      <section className="relative w-full flex flex-col overflow-hidden bg-[#030303] border-b border-zinc-800/80">
        
        {/* Background Interativo - Isolado apenas na Hero */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
          
          {Array.from({ length: 12 }).map((_, i) => <Snake key={`v-${i}`} isVertical={true} track={i * 3 + 1} />)}
          {Array.from({ length: 12 }).map((_, i) => <Snake key={`h-${i}`} isVertical={false} track={i * 3 + 1} />)}

          <motion.div
            className="absolute inset-0"
            animate={{
              background: `radial-gradient(150px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(124,58,237,0.02), transparent 100%)`
            }}
            transition={{ type: "tween", ease: "linear", duration: 0 }}
          />

          <motion.div 
            className="absolute inset-0 bg-[linear-gradient(to_right,rgba(124,58,237,0.1)_1px,transparent_1px),linear-gradient(to_bottom,rgba(124,58,237,0.1)_1px,transparent_1px)] bg-[size:4rem_4rem]"
            animate={{
              WebkitMaskImage: `radial-gradient(250px circle at ${mousePosition.x}px ${mousePosition.y}px, black 0%, transparent 100%)`,
              maskImage: `radial-gradient(250px circle at ${mousePosition.x}px ${mousePosition.y}px, black 0%, transparent 100%)`
            }}
            transition={{ type: "tween", ease: "linear", duration: 0 }}
          />
        </div>

        <Navbar />

        {/* Hero Content - Alterado de min-h-[75vh] para min-h-[85vh] para empurrar o conteúdo inferior para baixo */}
        <main className="relative z-10 flex flex-col items-center justify-center w-full px-6 pt-10 pb-28 min-h-[85vh]">
          <motion.div
            layout
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: {
                transition: {
                  staggerChildren: 0.2
                }
              }
            }}
            className="flex flex-col items-center text-center max-w-5xl w-full gap-8"
          >
            <motion.div
              layout
              initial="hidden"
              animate={searchActive ? "scanning" : "show"}
              variants={{
                hidden: { opacity: 0, height: "auto" },
                show: { 
                  opacity: 1, 
                  height: "auto",
                  filter: "blur(0px)",
                  transition: { staggerChildren: 0.2, duration: 0.5 }
                },
                scanning: { 
                  opacity: 0, 
                  height: 0, 
                  filter: "blur(10px)", 
                  transition: { duration: 1.5, ease: [0.22, 1, 0.36, 1] } 
                }
              }}
              className="flex flex-col items-center w-full gap-8 overflow-hidden"
            >
              {/* 1. Elemento Inicial */}
              <motion.div
                variants={{
                  hidden: { opacity: 0, y: 30 },
                  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } }
                }}
                className="w-full"
              >
                <h1 className="text-4xl md:text-5xl lg:text-7xl font-semibold text-white tracking-tight leading-[1.1] w-full">
                  O Ponto de Partida para<br />
                  <span className="bg-gradient-to-b from-white to-zinc-500 bg-clip-text text-transparent">seu próximo Pentest.</span>
                </h1>
              </motion.div>
              
              {/* 2. Subtítulo (Surgindo por debaixo) */}
              <div className="w-full flex justify-center" style={{ clipPath: "inset(0% 0% -50% 0%)" }}>
                <motion.p 
                  variants={{
                    hidden: { y: "-100%", opacity: 0 },
                    show: { y: 0, opacity: 1, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } }
                  }}
                  className="text-lg text-zinc-300 max-w-3xl font-medium leading-relaxed"
                >
                  Descubra vulnerabilidades antes que sejam exploradas. Insira sua URL e receba um diagnóstico de segurança completo em minutos.
                </motion.p>
              </div>
            </motion.div>

            {/* 3. Componente de Envio (Surgindo por debaixo) */}
            <motion.div 
              layout
              transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
              className={`w-full max-w-3xl relative transition-all duration-[1500ms] ${searchActive ? 'mt-0' : 'mt-4 sm:mt-16'}`}
            >
              <motion.div 
                variants={{
                  hidden: { y: "-100%", opacity: 0 },
                  show: { y: 0, opacity: 1, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } }
                }}
                className="relative"
              >
                <div className="relative bg-[#0A0A0A]/90 backdrop-blur-2xl border border-zinc-800/80 rounded-[2rem] sm:rounded-full p-2 flex flex-col sm:flex-row items-center gap-2 shadow-2xl transition-colors duration-500 hover:border-zinc-700">
                  <div className={`hidden sm:flex items-center pl-6 pr-2 text-zinc-400 text-sm ${jetBrainsMono.className}`}>
                    URL
                  </div>
                  <input
                    type="url"
                    id="url"
                    value={textUrl}
                    onChange={(e) => setTextUrl(e.target.value)}
                    onFocus={() => setSearchActive(true)}
                    placeholder="alvo.com"
                    className={`flex-1 w-full bg-transparent border-none text-white text-base md:text-lg focus:outline-none  focus-visible:transparent rounded-xl px-4 sm:px-4 py-3 sm:py-0 placeholder:text-zinc-400 ${jetBrainsMono.className}`}
                    autoComplete="off"
                    spellCheck="false"
                    aria-label="URL alvo para auditoria"
                  />
                  <div className="flex items-center gap-3 px-4 sm:border-l sm:border-zinc-800 h-14 sm:h-12 w-full sm:w-auto justify-between sm:justify-center border-t sm:border-t-0 border-zinc-800 pt-3 sm:pt-0 pb-1 sm:pb-0">
                    <span className="text-xs font-medium text-zinc-400 w-12 text-right transition-colors" style={{ color: !isDeepScan ? '#D4D4D8' : '' }}>Rápido</span>
                    
                    {/* Switch Wrapper de 44px para Acessibilidade Mobile (Touch Target) */}
                    <div className="flex items-center justify-center min-w-[44px] min-h-[44px]">
                      <button 
                        type="button" 
                        id="deep-scan-switch"
                        role="switch" 
                        aria-checked={isDeepScan} 
                        aria-label="Ativar varredura profunda"
                        disabled={isScanning}
                        onClick={() => setIsDeepScan(!isDeepScan)} 
                        className={`relative inline-flex h-[22px] w-[42px] shrink-0 items-center rounded-full bg-zinc-800/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 ${isScanning ? 'opacity-50' : 'hover:bg-zinc-700 cursor-pointer'}`}
                      >
                        <span className={`inline-block h-[18px] w-[18px] transform rounded-full bg-zinc-300 transition-transform duration-300 shadow-sm ${isDeepScan ? 'translate-x-[22px] bg-purple-400' : 'translate-x-[2px]'}`} />
                      </button>
                    </div>

                    <span className="relative text-xs font-medium text-zinc-400 w-14 text-left transition-colors flex items-center" style={{ color: isDeepScan ? '#A78BFA' : '' }}>
                      Profundo
                      <AnimatePresence>
                        {(isDeepScan && !hideTooltip && !isScanning) && (
                          <motion.div
                            ref={tooltipRef}
                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -5, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            className="absolute top-12 left-1/2 -translate-x-1/2 mt-3 w-80 p-1.5 bg-zinc-900 border border-zinc-700/50 rounded-xl text-center cursor-default pointer-events-auto flex flex-col items-center z-50"
                          >
                            <p className="text-[14px] text-start ml-2 text-zinc-300 mb-2 leading-relaxed  normal-case tracking-normal">
                              Poderá levar até 10 minutos para ser finalizado de acordo com a <Link href="/docs" target="_blank" className="  font-bold underline-offset-2 text-[#A78BFA] transition-colors mb-3">documentação</Link>.
                            </p>
       
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </span>
                  </div>
                  <div className="shrink-0 w-full sm:w-auto mt-2 sm:mt-0 [&>button]:!w-full [&>button]:sm:!w-auto [&>button]:!rounded-full [&>button]:!bg-white [&>button]:!text-black [&>button:not(:disabled)]:hover:!bg-zinc-200 [&>button]:!px-8 [&>button]:!py-3 [&>button]:!h-[44px] [&>button]:!font-semibold [&>button]:!tracking-wide [&>button]:!transition-colors [&>button]:!border-none [&>button]:focus-visible:!ring-2 [&>button]:focus-visible:!ring-purple-500/50 [&>button:disabled]:!bg-zinc-800/80 [&>button:disabled]:!text-zinc-400">
                    <Botao alvoUrl={textUrl} isDeepScan={isDeepScan} disabled={!/^(?:https?:\/\/)?(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(?:\/.*)?$|^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$|^localhost$/.test(textUrl.trim())} onScanChange={(scanning) => { setIsScanning(scanning); if(scanning) setSearchActive(true); }} />
                  </div>
                </div>
              </motion.div>
            </motion.div>

            {/* 4. Espaço reservado para o Loader (empurra a barra para cima) */}
            <motion.div
              layout
              initial={false}
              animate={{ height: isScanning ? 160 : 0, opacity: isScanning ? 1 : 0 }}
              transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-3xl flex justify-center items-start overflow-hidden pt-4"
            >
              {isScanning && <ScannerLoader isDeepScan={isDeepScan} />}
            </motion.div>
          </motion.div>
        </main>
      </section>


      <section className="relative w-full bg-[#050505] flex-1 pt-32 pb-40 overflow-hidden">
        
        <div className="w-full max-w-[1920px] mx-auto px-4 lg:px-8 2xl:px-12 flex flex-col gap-32 lg:gap-48 relative z-10">
          
          <FeatureRow 
            title="Dossiês de Vulnerabilidade"
            description="Transforme milhares de varreduras em relatórios cirúrgicos. Analise pontuações de risco e obtenha o mapeamento detalhado da sua superfície de ataque para priorizar as correções antes do próximo deploy."
            
            reverse={false}
            visualNode={(
              <div className="w-full h-full absolute inset-0 flex flex-col sm:flex-row items-center justify-center bg-[#0a0a0a] overflow-hidden p-8 sm:p-12 gap-8 lg:gap-16">
                
                {/* Lado Esquerdo: Bloco de Texto (Skeleton Loader Gigante) */}
                <div className="flex flex-col w-full sm:w-[45%] h-full justify-center gap-6 z-10 relative">
                  
                  {/* Tag Mono no topo do skeleton */}
                  <div className="absolute top-[8%] left-0 text-[10px] font-mono text-zinc-600 tracking-widest border border-zinc-800/80 px-2 py-1 rounded">
                    SYS.LOG_REPORT
                  </div>

                  {/* Título Skeleton - 2 Linhas Grandes empurradas mais para cima */}
                  <div className="flex flex-col gap-3 mb-12 absolute top-[18%] w-full">
                    <motion.div className="h-5 lg:h-7 bg-zinc-700 rounded-full w-4/5" animate={{ opacity: [0.4, 0.8, 0.4] }} transition={{ duration: 2.5, repeat: Infinity, delay: 0 }} />
                    <motion.div className="h-5 lg:h-7 bg-zinc-700 rounded-full w-3/5" animate={{ opacity: [0.4, 0.8, 0.4] }} transition={{ duration: 2.5, repeat: Infinity, delay: 0.2 }} />
                  </div>
                  
                  {/* Parágrafos Skeleton - Mesmo tamanho (Centralizados verticalmente) */}
                  <div className="flex flex-col gap-4 mt-16">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <motion.div key={i} className="h-3 lg:h-4 bg-zinc-700/80 rounded-full w-full" animate={{ opacity: [0.3, 0.7, 0.3] }} transition={{ duration: 3, repeat: Infinity, delay: 0.4 + i * 0.2 }} />
                    ))}
                    <motion.div className="h-3 lg:h-4 bg-zinc-700/80 rounded-full w-2/3" animate={{ opacity: [0.3, 0.7, 0.3] }} transition={{ duration: 3, repeat: Infinity, delay: 1.6 }} />
                  </div>
                  
                </div>

                {/* Lado Direito: Gráficos (Sliders + Meio Círculo) */}
                <div className="flex flex-col w-full sm:w-[55%] h-full justify-center gap-12 z-10 sm:border-l border-zinc-800/50 sm:pl-8 lg:pl-12 pt-8 sm:pt-0 border-t sm:border-t-0 mt-8 sm:mt-0">
                  
                  {/* Topo do Lado Direito: 5 Sliders Mais Altos */}
                  <div className="flex flex-col w-full gap-6">
                    {[
                      { labelWidth: "w-24", valueWidth: "w-8", value: 90, delay: 0.2 },
                      { labelWidth: "w-32", valueWidth: "w-6", value: 65, delay: 0.4 },
                      { labelWidth: "w-20", valueWidth: "w-10", value: 85, delay: 0.6 },
                      { labelWidth: "w-28", valueWidth: "w-12", value: 45, delay: 0.8 },
                      { labelWidth: "w-16", valueWidth: "w-6", value: 75, delay: 1.0 }
                    ].map((item, i) => (
                      <div key={i} className="flex flex-col gap-2.5 group cursor-default">
                        <div className="flex justify-between items-center mb-0.5">
                          <motion.div className={`h-2.5 lg:h-3 bg-zinc-800 rounded-full ${item.labelWidth}`} animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 2, repeat: Infinity, delay: item.delay }} />
                          <motion.div className={`h-2.5 lg:h-3 bg-zinc-800 rounded-full ${item.valueWidth}`} animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 2, repeat: Infinity, delay: item.delay + 0.3 }} />
                        </div>
                        <div className="w-full h-3 lg:h-4 bg-zinc-900 rounded-full border border-zinc-800/50">
                          <motion.div 
                            className="h-full bg-purple-500 shadow-[0_0_12px_rgba(168,85,247,0.5)] rounded-full group-hover:scale-y-150 transition-all duration-300 origin-left" 
                            initial={{ width: "0%" }} 
                            whileInView={{ width: `${item.value}%` }} 
                            viewport={{ once: true }} 
                            transition={{ duration: 1.5, ease: "easeOut", delay: item.delay }} 
                          />
                        </div>
                      </div>
                    ))}
                    
                  </div>

                  {/* Base do Lado Direito: Skeletons Duplos + Score Gauge */}
                  <div className="relative w-full flex flex-row items-end justify-between pt-4">
                    
                    {/* 6 Skeletons Menores (Esquerda da Base) divididos em 2 colunas */}
                    <div className="flex flex-row gap-6 w-1/2 pb-1 cursor-default">
                      <div className="flex flex-col gap-3.5 w-full">
                        <motion.div className="h-2 lg:h-2.5 bg-zinc-800 rounded-full w-full" animate={{ opacity: [0.3, 0.7, 0.3] }} transition={{ duration: 2, repeat: Infinity, delay: 0.2 }} />
                        <motion.div className="h-2 lg:h-2.5 bg-zinc-800 rounded-full w-4/5" animate={{ opacity: [0.3, 0.7, 0.3] }} transition={{ duration: 2, repeat: Infinity, delay: 0.4 }} />
                        <motion.div className="h-2 lg:h-2.5 bg-zinc-800 rounded-full w-5/6" animate={{ opacity: [0.3, 0.7, 0.3] }} transition={{ duration: 2, repeat: Infinity, delay: 0.6 }} />
                      </div>
                      <div className="flex flex-col gap-3.5 w-full">
                        <motion.div className="h-2 lg:h-2.5 bg-zinc-800 rounded-full w-11/12" animate={{ opacity: [0.3, 0.7, 0.3] }} transition={{ duration: 2, repeat: Infinity, delay: 0.3 }} />
                        <motion.div className="h-2 lg:h-2.5 bg-zinc-800 rounded-full w-3/4" animate={{ opacity: [0.3, 0.7, 0.3] }} transition={{ duration: 2, repeat: Infinity, delay: 0.5 }} />
                        <motion.div className="h-2 lg:h-2.5 bg-zinc-800 rounded-full w-4/5" animate={{ opacity: [0.3, 0.7, 0.3] }} transition={{ duration: 2, repeat: Infinity, delay: 0.7 }} />
                      </div>
                    </div>

                    {/* Score Gauge (Direita da Base - Tom Sólido Roxo) */}
                    <div className="relative w-1/2 flex flex-col items-end justify-end group cursor-default">
                      <motion.div className="absolute inset-0 bg-purple-500/10 rounded-full blur-3xl -z-10 right-0 transition-colors duration-300" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ duration: 1, delay: 0.5 }} />
                      <div className="relative w-40 lg:w-56 aspect-[2/1] flex flex-col items-end justify-end overflow-visible origin-bottom-right">
                        <svg viewBox="0 0 100 50" className="absolute top-0 left-0 w-full h-full overflow-visible">
                          <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#27272a" strokeWidth="8" strokeLinecap="round" />
                          <motion.path 
                            d="M 10 50 A 40 40 0 0 1 90 50" 
                            fill="none" 
                            stroke="#a855f7" 
                            strokeWidth="8" 
                            strokeLinecap="round" 
                            className="group-hover:[stroke-width:14px] transition-all duration-300"
                            initial={{ pathLength: 0 }} 
                            whileInView={{ pathLength: 0.78 }} 
                            viewport={{ once: true }} 
                            transition={{ duration: 1.2, ease: "easeOut", delay: 0.1 }} 
                          />
                        </svg>
                      </div>
                    </div>
                  </div>

                </div>

              </div>
            )}
          />

          <FeatureRow 
            title="Pipeline de Varredura Sequencial"
            description="Sua URL é submetida a uma esteira rigorosa de testes. Ferramentas clássicas de pentest são executadas em cascata — onde a saída de uma varredura engatilha imediatamente o próximo vetor de ataque."
            
            reverse={true}
            actionNode={
              <Link href="/docs" className="inline-flex items-center gap-2 px-6 py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white font-medium rounded-lg transition-colors group">
                Consultar Documentação
                <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-white group-hover:translate-x-1 transition-all" />
              </Link>
            }
            visualNode={(
              <div className="w-full h-full absolute inset-0 flex flex-col items-center justify-center p-8 bg-[#0a0a0a] overflow-hidden">
                
                {/* Background Grid Espaçado */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:3rem_3rem]" />
                
                {/* Diagrama de Fluxo (Flowchart) */}
                <div className="relative flex flex-col items-center justify-between gap-4 z-10 w-full max-w-sm h-full py-6">
                  
                  {/* Trilha Central (Fundo da Linha) */}
                  <div className="absolute top-10 bottom-10 left-1/2 -translate-x-1/2 w-0.5 bg-zinc-800/60 -z-10 overflow-hidden">
                    {/* Feixe de Luz descendo pela trilha */}
                    <motion.div 
                      className="w-full h-1/3 bg-gradient-to-b from-transparent via-purple-500 to-transparent absolute"
                      animate={{ top: ["-30%", "100%"] }}
                      transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                    />
                  </div>

                  {/* Node 1: Envio da URL */}
                  <motion.div 
                    initial={{ opacity: 0, y: -20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}
                    className="w-full group cursor-default hover:scale-[1.02] transition-transform duration-300"
                  >
                    <div className="w-full bg-zinc-950 border border-zinc-800 group-hover:border-purple-500/50 p-4 rounded-xl flex items-center justify-center gap-3 shadow-lg transition-colors relative">
                      <div className="absolute -left-3 w-1.5 h-1/2 bg-purple-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-[0_0_10px_rgba(168,85,247,0.8)]" />
                      <Terminal className="w-5 h-5 text-zinc-500 group-hover:text-purple-400 transition-colors" />
                      <span className="text-zinc-300 font-mono text-sm tracking-tight">https://alvo.com</span>
                    </div>
                  </motion.div>

                  {/* Node 2: Nmap */}
                  <motion.div 
                    initial={{ opacity: 0, y: -20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }}
                    className="w-11/12 group cursor-default hover:scale-[1.05] transition-transform duration-300"
                  >
                    <div className="w-full bg-zinc-900 border border-zinc-800 group-hover:border-purple-500/50 p-4 rounded-xl flex items-center justify-between shadow-lg transition-colors relative">
                      <div className="absolute -left-3 w-1.5 h-1/2 bg-purple-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-[0_0_10px_rgba(168,85,247,0.8)]" />
                      <span className="text-zinc-400 font-mono text-xs">01. Port Scanning</span>
                      <span className="text-purple-400 font-bold text-sm tracking-wider">NMAP</span>
                    </div>
                  </motion.div>

                  {/* Node 3: FFuf */}
                  <motion.div 
                    initial={{ opacity: 0, y: -20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.6 }}
                    className="w-11/12 group cursor-default hover:scale-[1.05] transition-transform duration-300"
                  >
                    <div className="w-full bg-zinc-900 border border-zinc-800 group-hover:border-purple-500/50 p-4 rounded-xl flex items-center justify-between shadow-lg transition-colors relative">
                      <div className="absolute -left-3 w-1.5 h-1/2 bg-purple-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-[0_0_10px_rgba(168,85,247,0.8)]" />
                      <span className="text-zinc-400 font-mono text-xs">02. Directory Fuzzing</span>
                      <span className="text-purple-400 font-bold text-sm tracking-wider">FFUF</span>
                    </div>
                  </motion.div>

                  {/* Node 4: httpx */}
                  <motion.div 
                    initial={{ opacity: 0, y: -20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.8 }}
                    className="w-11/12 group cursor-default hover:scale-[1.05] transition-transform duration-300"
                  >
                    <div className="w-full bg-zinc-900 border border-zinc-800 group-hover:border-purple-500/50 p-4 rounded-xl flex items-center justify-between shadow-lg transition-colors relative">
                      <div className="absolute -left-3 w-1.5 h-1/2 bg-purple-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-[0_0_10px_rgba(168,85,247,0.8)]" />
                      <span className="text-zinc-400 font-mono text-xs">03. Alive Probing</span>
                      <span className="text-purple-400 font-bold text-sm tracking-wider">HTTPX</span>
                    </div>
                  </motion.div>

                  {/* Node 5: Report Generation */}
                  <motion.div 
                    initial={{ opacity: 0, y: -20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 1.0 }}
                    className="w-full group cursor-default hover:scale-[1.02] transition-transform duration-300 mt-2"
                  >
                    <div className="w-full bg-zinc-950 border border-purple-500/30 group-hover:border-purple-500/80 p-4 rounded-xl flex items-center justify-center gap-3 shadow-[0_0_15px_rgba(168,85,247,0.15)] transition-colors relative">
                      <div className="absolute -left-3 w-1.5 h-1/2 bg-purple-500 rounded-full opacity-100 shadow-[0_0_10px_rgba(168,85,247,0.8)]" />
                      <ShieldAlert className="w-5 h-5 text-purple-400" />
                      <span className="text-purple-300 font-bold text-sm tracking-tight">Gerar Relatório Final</span>
                    </div>
                  </motion.div>
                  
                </div>
              </div>
            )}
          />

        </div>
      </section>

    </div>
  );
}
