import React, { useState } from 'react';
import Head from 'next/head';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Globe, 
  Clock, 
  Download,
  Activity,
  Terminal,
  ChevronDown,
  ChevronUp,
  Calendar,
  Zap
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { jakarta, jetBrainsMono } from '../app/fonts';

const mockData = {
  scanId: 'VS-2026-10-8A9F',
  target: 'api.example-finance.com',
  date: '10 de Outubro de 2026, 14:32',
  duration: '4m 12s',
  scanType: 'Varredura Profunda',
  score: 68,
  summary: {
    critical: 2,
    high: 5,
    medium: 12,
    low: 24,
    info: 45
  },
  findings: [
    {
      id: 'VULN-001',
      title: 'SQL Injection Error Based',
      severity: 'Crítico',
      endpoint: '/api/v1/users/profile',
      status: 'Aberto',
      details: 'Foi detectado um SQL Injection do tipo Error Based no endpoint de perfil do usuário. Isso pode permitir que um atacante extraia informações sensíveis do banco de dados.'
    },
    {
      id: 'VULN-002',
      title: 'Remote Code Execution via Deserialization',
      severity: 'Crítico',
      endpoint: '/api/v1/data/import',
      status: 'Aberto',
      details: 'O endpoint de importação desserializa objetos de forma insegura, permitindo execução arbitrária de código no servidor.'
    },
    {
      id: 'VULN-003',
      title: 'Cross-Site Scripting (Reflected)',
      severity: 'Alto',
      endpoint: '/search?q=',
      status: 'Aberto',
      details: 'Parâmetro de busca sendo refletido na resposta sem a devida sanitização, abrindo espaço para ataques de XSS.'
    },
    {
      id: 'VULN-004',
      title: 'Insecure Direct Object Reference (IDOR)',
      severity: 'Alto',
      endpoint: '/api/v1/documents/download',
      status: 'Aberto',
      details: 'Usuários conseguem acessar documentos de outros perfis apenas alterando o ID no endpoint de download.'
    },
    {
      id: 'VULN-005',
      title: 'Missing Security Headers (HSTS)',
      severity: 'Médio',
      endpoint: 'Global',
      status: 'Aberto',
      details: 'A aplicação não implementa o header Strict-Transport-Security, deixando o site vulnerável a ataques man-in-the-middle.'
    }
  ]
};

const getSeverityColor = (severity: string) => {
  switch (severity.toLowerCase()) {
    case 'crítico': return 'bg-red-500/10 text-red-400/70 border-red-500/30';
    case 'alto': return 'bg-orange-500/10 text-orange-400/70 border-orange-500/30';
    case 'médio': return 'bg-yellow-500/10 text-yellow-400/70 border-yellow-500/30';
    case 'baixo': return 'bg-blue-500/10 text-blue-400/70 border-blue-500/30';
    default: return 'bg-zinc-500/10 text-zinc-400/70 border-zinc-500/30';
  }
};

export default function ReportMockPage() {
  const [isTableExpanded, setIsTableExpanded] = useState(true);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const toggleRow = (id: string) => {
    setExpandedRow(prev => prev === id ? null : id);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { type: 'spring', stiffness: 100 }
    }
  };

  return (
    <div className={`min-h-screen bg-black text-zinc-300 ${jakarta.className} flex flex-col relative overflow-x-hidden`}>
      <Head>
        <title>Relatório de Segurança - VulScanner</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <Navbar />

      {/* Main Container com Margem Top Maior */}
      <main className="relative z-10 flex flex-col items-center w-full px-4 md:px-8 pt-24 pb-28">
        <motion.div 
          className="flex flex-col items-start w-full max-w-[1800px] gap-12"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Header Section */}
          <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-end justify-between w-full gap-6">
            <div className="flex flex-col gap-4">
              <h1 className="text-4xl md:text-5xl font-semibold text-white tracking-tight">
                Relatório de Auditoria
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-400">
                <span className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg">
                  <Globe className="w-4 h-4 text-zinc-500" /> 
                  <span className={jetBrainsMono.className}>{mockData.target}</span>
                </span>
                <span className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg">
                  <Calendar className="w-4 h-4 text-zinc-500" /> 
                  {mockData.date}
                </span>
                <span className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg">
                  <Zap className="w-4 h-4 text-zinc-500" /> 
                  {mockData.scanType}
                </span>
                <span className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg">
                  <Clock className="w-4 h-4 text-zinc-500" /> 
                  {mockData.duration}
                </span>
                <span className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg">
                  <Terminal className="w-4 h-4 text-zinc-500" /> 
                  <span className={jetBrainsMono.className}>{mockData.scanId}</span>
                </span>
              </div>
            </div>
            
            <button className="flex items-center gap-2 text-sm font-medium text-black bg-white hover:bg-zinc-200 px-6 py-3 rounded-full transition-colors self-start md:self-auto">
              <Download className="w-4 h-4" />
              Baixar Relatório (PDF)
            </button>
          </motion.div>

          {/* Target Info and Score Row */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-10 gap-6 w-full">
            
            {/* Target URL Preview (70%) */}
            <div className="col-span-1 md:col-span-7 bg-[#0A0A0A] border border-zinc-800/80 rounded-3xl overflow-hidden relative hover:border-zinc-700 transition-colors flex flex-col min-h-[350px]">
              <div className="h-12 w-full border-b border-zinc-800/80 bg-zinc-900/40 flex items-center px-4 gap-3 shrink-0">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-zinc-700" />
                  <div className="w-3 h-3 rounded-full bg-zinc-700" />
                  <div className="w-3 h-3 rounded-full bg-zinc-700" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className={`bg-black border border-zinc-800 rounded-md px-4 py-1 text-xs text-zinc-500 flex items-center gap-2 ${jetBrainsMono.className}`}>
                    https://{mockData.target}
                  </div>
                </div>
              </div>
              <div className="flex-1 bg-black flex items-center justify-center relative overflow-hidden group">
                <div className="absolute inset-0 bg-zinc-900/20" />
                <div className="absolute inset-0 flex flex-col p-8 gap-4 opacity-20 pointer-events-none grayscale">
                  
               
                </div>
                <div className="z-10 flex flex-col items-center gap-3">
                  <div className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-xl">
                    <Globe className="w-8 h-8 text-zinc-500" />
                  </div>
                  <span className={`text-zinc-500 text-sm ${jetBrainsMono.className}`}>Preview Indisponível</span>
                </div>
              </div>
            </div>

            {/* Score Card (30%) */}
            <div className="col-span-1 md:col-span-3 bg-[#0A0A0A] border border-zinc-800/80 rounded-3xl p-8 flex flex-row items-center justify-between relative hover:border-zinc-700 transition-colors min-h-[350px]">
              
              {/* Left Side: Gauge */}
              <div className="flex flex-col items-center">
                <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest mb-6">Security Score</h2>
                <div className="relative flex items-center justify-center">
                  <div className="absolute inset-0 bg-orange-500/10 blur-2xl rounded-full scale-110" />
                  <svg className="w-40 h-40 transform -rotate-90 relative z-10">
                    <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-zinc-900" />
                    <motion.circle 
                      cx="80" cy="80" r="70" 
                      stroke="currentColor" 
                      strokeWidth="8" 
                      fill="transparent" 
                      strokeDasharray={439.8} 
                      strokeDashoffset={439.8}
                      className="text-orange-500 drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]"
                      strokeLinecap="round"
                      animate={{ strokeDashoffset: 439.8 - (439.8 * mockData.score) / 100 }}
                      transition={{ duration: 2, ease: "easeOut", delay: 0.2 }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center flex-col z-20">
                    <span className={`text-5xl font-bold text-white ${jetBrainsMono.className}`}>{mockData.score}</span>
                  </div>
                </div>
                <p className="mt-6 text-sm font-medium text-orange-400 bg-orange-500/10 border border-orange-500/20 px-4 py-1.5 rounded-full">
                  Risco Moderado
                </p>
              </div>

              {/* Right Side: Severity Stats */}
              <div className="flex flex-col gap-6 items-end pr-4">
                <div className="flex flex-col items-end">
                  <span className="text-zinc-500 text-xs font-semibold tracking-widest">CRÍTICO</span>
                  <span className={`text-white text-2xl font-bold ${jetBrainsMono.className}`}>{mockData.summary.critical}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-zinc-500 text-xs font-semibold tracking-widest">ALTO</span>
                  <span className={`text-white text-2xl font-bold ${jetBrainsMono.className}`}>{mockData.summary.high}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-zinc-500 text-xs font-semibold tracking-widest">MÉDIO</span>
                  <span className={`text-white text-2xl font-bold ${jetBrainsMono.className}`}>{mockData.summary.medium}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-zinc-500 text-xs font-semibold tracking-widest">BAIXO / INFO</span>
                  <span className={`text-white text-2xl font-bold ${jetBrainsMono.className}`}>{mockData.summary.low + mockData.summary.info}</span>
                </div>
              </div>

            </div>
          </motion.div>

          {/* Findings Accordion Section */}
          <motion.div variants={itemVariants} className="w-full bg-[#0A0A0A] border border-zinc-800/80 rounded-3xl overflow-hidden mt-4">
            
            {/* Header Accordion Trigger */}
            <div 
              className="px-8 py-6 flex items-center justify-between cursor-pointer hover:bg-zinc-900/50 transition-colors"
              onClick={() => setIsTableExpanded(!isTableExpanded)}
            >
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-semibold text-white">Vulnerabilidades Identificadas</h3>
              </div>
              <div className="flex items-center gap-4 text-zinc-500">
                {isTableExpanded ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
              </div>
            </div>
            
            <AnimatePresence>
              {isTableExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="w-full text-left text-sm text-zinc-400">
                    <div className="grid grid-cols-12 px-8 py-5 text-xs text-zinc-500 uppercase font-semibold border-y border-zinc-800/50 bg-[#070707]">
                      <div className="col-span-2">Severidade</div>
                      <div className="col-span-4">Vulnerabilidade</div>
                      <div className="col-span-4">Endpoint Afetado</div>
                      <div className="col-span-2 text-right">Ação</div>
                    </div>
                    <div className="divide-y divide-zinc-800/50">
                      {mockData.findings.map((vuln) => (
                        <div key={vuln.id} className="flex flex-col group">
                          
                          {/* Row (Clickable) */}
                          <div 
                            className="grid grid-cols-12 px-8 py-5 items-center hover:bg-zinc-800/20 cursor-pointer transition-colors"
                            onClick={() => toggleRow(vuln.id)}
                          >
                            <div className="col-span-2">
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${getSeverityColor(vuln.severity)}`}>
                                {vuln.severity}
                              </span>
                            </div>
                            <div className="col-span-4">
                              <div className="font-medium text-zinc-200">{vuln.title}</div>
                              <div className={`text-xs text-zinc-500 mt-1 ${jetBrainsMono.className}`}>{vuln.id}</div>
                            </div>
                            <div className="col-span-4">
                              <code className={`bg-zinc-900 border border-zinc-800 text-zinc-300 px-2.5 py-1.5 rounded-lg text-xs ${jetBrainsMono.className}`}>
                                {vuln.endpoint}
                              </code>
                            </div>
                            <div className="col-span-2 text-right flex justify-end items-center gap-2">
                              <span className="text-zinc-500 font-medium text-xs">
                                {expandedRow === vuln.id ? 'Ocultar' : 'Detalhes'}
                              </span>
                              <ChevronDown className={`w-4 h-4 text-zinc-500 transform transition-transform duration-300 ${expandedRow === vuln.id ? 'rotate-180' : ''}`} />
                            </div>
                          </div>

                          {/* Row Details (Accordion Content) */}
                          <AnimatePresence>
                            {expandedRow === vuln.id && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden bg-[#070707]"
                              >
                                <div className="px-8 py-6 border-t border-zinc-800/30 flex flex-col gap-4">
                                  <div>
                                    <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-2">Descrição</h4>
                                    <p className="text-sm text-zinc-300 leading-relaxed max-w-4xl">{vuln.details}</p>
                                  </div>
                                  <div className="flex gap-4 mt-2">
                                    <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3">
                                      <span className="block text-xs text-zinc-500 mb-1">Status atual</span>
                                      <span className="font-semibold text-white flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-red-500" />
                                        {vuln.status}
                                      </span>
                                    </div>
                                    <button className="bg-zinc-100 hover:bg-white text-black font-semibold rounded-lg px-6 py-3 transition-colors text-sm">
                                      Marcar como Resolvido
                                    </button>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>

                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </motion.div>

        </motion.div>
      </main>
    </div>
  );
}
