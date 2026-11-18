"use client"

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Botao } from "./submit";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import { FeatureRow } from "../components/FeatureRow";
import { ScannerLoader, ToolStepData } from "../components/ScannerLoader";
import { AuditReportVisual } from "../components/AuditReportVisual";
import { SequentialPipelineVisual } from "../components/SequentialPipelineVisual";
import { ShieldAlert, ArrowRight } from "lucide-react";
import Link from "next/link";
import { jakarta, jetBrainsMono } from "./fonts";

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
  const router = useRouter();
  const [textUrl, setTextUrl] = useState("");
  const [isDeepScan, setIsDeepScan] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [hideTooltip, setHideTooltip] = useState(false);
  const [searchActive, setSearchActive] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [stepsStatus, setStepsStatus] = useState<Record<string, ToolStepData>>({});
  const [scanRunId, setScanRunId] = useState(0);
  const [scanReportReady, setScanReportReady] = useState(false);
  const [visualSequenceDone, setVisualSequenceDone] = useState(false);
  const [isTransitioningOut, setIsTransitioningOut] = useState(false);

  const handleStepUpdate = (evt: { etapa: string; status: "pending" | "running" | "completed" | "error"; mensagem?: string; resultado?: unknown }) => {
    setStepsStatus((prev) => ({
      ...prev,
      [evt.etapa]: {
        status: evt.status,
        mensagem: evt.mensagem,
        resultado: evt.resultado,
      },
    }));
  };

  const handleVisualSequenceComplete = useCallback(() => {
    setVisualSequenceDone(true);
  }, []);

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
    if (!scanReportReady || !visualSequenceDone) return;

    const startTransition = setTimeout(() => {
      setIsTransitioningOut(true);
    }, 120);

    const navigateTimer = setTimeout(() => {
      try {
        sessionStorage.setItem("vulscan_page_transition", "1");
      } catch {
        // Ignore storage errors
      }
      router.push("/report");
    }, 700);

    return () => {
      clearTimeout(startTransition);
      clearTimeout(navigateTimer);
    };
  }, [scanReportReady, visualSequenceDone, router]);

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
    <motion.div
      animate={
        isTransitioningOut
          ? { opacity: 0, scale: 0.985, filter: "blur(8px)" }
          : { opacity: 1, scale: 1, filter: "blur(0px)" }
      }
      transition={{ duration: 0.52, ease: [0.22, 1, 0.36, 1] }}
      className={`w-full min-h-screen bg-[#050505] text-zinc-300 ${jakarta.className} flex flex-col relative`}
    >
      

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
            } as any}
            transition={{ type: "tween", ease: "linear", duration: 0 }}
          />
        </div>

        <Navbar />

        {/* Hero Content - Alterado de min-h-[75vh] para min-h-[85vh] para empurrar o conteúdo inferior para baixo */}
        <main className="relative z-10 flex flex-col items-center justify-center w-full px-4 md:px-[200px] lg:px-[224px] pt-10 pb-28 min-h-[85vh]">
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
            className="flex flex-col items-center text-center max-w-[1800px] w-full gap-8"
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
              className={`w-full max-w-5xl relative transition-all duration-[1500ms] ${searchActive ? 'mt-0' : 'mt-4 sm:mt-16'}`}
            >
              <motion.div 
                variants={{
                  hidden: { y: "-100%", opacity: 0 },
                  show: { y: 0, opacity: 1, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } }
                }}
                className="relative"
              >
                <div className={`relative bg-[#0A0A0A]/90 backdrop-blur-2xl border rounded-[2rem] sm:rounded-full p-2 flex flex-col sm:flex-row items-center gap-2 shadow-2xl transition-colors duration-500 ${
                  urlError
                    ? "border-red-500 hover:border-red-400 shadow-[0_0_25px_rgba(239,68,68,0.15)]"
                    : "border-zinc-800/80 hover:border-zinc-700"
                }`}>
                  <div className={`hidden sm:flex items-center pl-6 pr-2 text-zinc-400 text-sm ${jetBrainsMono.className}`}>
                    URL
                  </div>
                  <input
                    type="url"
                    id="url"
                    value={textUrl}
                    onChange={(e) => {
                      setTextUrl(e.target.value);
                      if (urlError) setUrlError(null);
                    }}
                    onFocus={() => setSearchActive(true)}
                    placeholder="alvo.com"
                    className={`flex-1 w-full bg-transparent border-none text-white text-base md:text-lg focus:outline-none  focus-visible:transparent rounded-xl px-4 sm:px-4 py-3 sm:py-0 placeholder:text-zinc-400 ${jetBrainsMono.className}`}
                    autoComplete="off"
                    spellCheck="false"
                    aria-label="URL alvo para auditoria"
                    aria-invalid={Boolean(urlError)}
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
                    <Botao
                      alvoUrl={textUrl}
                      isDeepScan={isDeepScan}
                      disabled={!/^(?:https?:\/\/)?(?:(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}|(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)|localhost)(?::\d{1,5})?(?:\/.*)?$/.test(textUrl.trim())}
                      onErrorChange={setUrlError}
                      onStepUpdate={handleStepUpdate}
                      onScanComplete={async (relatorio) => {
                        console.log("Relatório final consolidado:", relatorio);
                        try {
                          if (relatorio) {
                            const rawTarget =
                              (relatorio as { target?: string; alvo?: string }).target ||
                              (relatorio as { target?: string; alvo?: string }).alvo ||
                              textUrl;

                            let screenshotAvailable = false;
                            if (rawTarget && typeof window !== "undefined") {
                              const cleanTarget = String(rawTarget).trim();
                              try {
                                const checkRes = await fetch(
                                  `/api/screenshot?target=${encodeURIComponent(cleanTarget)}&checkOnly=true`
                                );
                                screenshotAvailable = Boolean(checkRes.ok);
                              } catch {
                                screenshotAvailable = false;
                              }
                            }

                            const enriched = {
                              ...relatorio,
                              screenshotAvailable,
                            };
                            localStorage.setItem("vulscan_latest_report", JSON.stringify(enriched));
                          }
                        } catch (e) {
                          console.error("Erro ao persistir relatório no localStorage:", e);
                        }
                        setScanReportReady(true);
                      }}
                      onScanChange={(scanning) => {
                        setIsScanning(scanning);
                        if (scanning) {
                          setSearchActive(true);
                          setStepsStatus({});
                          setScanReportReady(false);
                          setVisualSequenceDone(false);
                          setIsTransitioningOut(false);
                          setScanRunId((id) => id + 1);
                        }
                      }}
                    />
                  </div>
                </div>

                <AnimatePresence>
                  {urlError && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.25 }}
                      className="flex items-center justify-center gap-2 mt-3 text-red-400 text-sm font-medium"
                      role="alert"
                    >
                      <ShieldAlert className="w-4 h-4 shrink-0 text-red-500" />
                      <span>{urlError}</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </motion.div>

            {/* 4. Espaço reservado para o Loader (empurra a barra para cima) */}
            <motion.div
              layout
              initial={false}
              animate={{ height: isScanning ? "auto" : 0, opacity: isScanning ? 1 : 0 }}
              transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-4xl flex justify-center items-start overflow-hidden pt-4"
            >
              {isScanning && (
                <ScannerLoader
                  key={scanRunId}
                  isDeepScan={isDeepScan}
                  stepsStatus={stepsStatus}
                  onSequenceComplete={handleVisualSequenceComplete}
                />
              )}
            </motion.div>
          </motion.div>
        </main>
      </section>


      <section className="relative w-full bg-[#050505] flex-1 pt-32 pb-40 overflow-hidden">
        
        <div className="w-full px-4 md:px-[200px] lg:px-[224px] flex flex-col gap-32 lg:gap-48 relative z-10">
          
          <FeatureRow 
            title="Relatório de Vulnerabilidades"
            description="Transforme uma simples URL em relatórios completos num piscar de olhos, te ajudando a ter uma melhor visão durante o processo de coleta de informações"
            reverse={false}
            visualNode={<AuditReportVisual />}
          />

          <FeatureRow 
            title="Pipeline de Varredura Sequencial"
            description="Sua URL é submetida a uma bateria de testes rigorosa. Ferramentas clássicas de pentest são executadas sequencialmente — onde a saída de uma varredura engatilha imediatamente o próximo vetor de ataque."
            reverse={true}
            actionNode={
              <Link href="/docs" className="inline-flex items-center gap-2 px-6 py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white font-medium rounded-lg transition-colors group">
                Consultar Documentação
                <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-white group-hover:translate-x-1 transition-all" />
              </Link>
            }
            visualNode={<SequentialPipelineVisual />}
          />

        </div>
      </section>

      <Footer />

      {/* Cortina suave de transição de página para o relatório */}
      <AnimatePresence>
        {isTransitioningOut && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-[100] bg-[#030303] flex items-center justify-center pointer-events-none"
          >
            <div className="w-64 h-64 rounded-full bg-purple-600/10 blur-[90px]" />
          </motion.div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}
