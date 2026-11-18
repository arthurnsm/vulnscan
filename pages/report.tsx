import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { 
  Globe, 
  Clock, 
  Download, 
  Terminal, 
  ChevronDown, 
  ChevronUp, 
  Calendar, 
  Zap, 
  ShieldAlert, 
  ShieldCheck, 
  Filter, 
  Server, 
  Layers, 
  ExternalLink,
  Cpu,
  Radio,
  FileJson
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { jakarta, jetBrainsMono } from '../app/fonts';

export interface Finding {
  id: string;
  title: string;
  severity: 'Crítico' | 'Alto' | 'Médio' | 'Baixo' | 'Info';
  endpoint: string;
  details: string;
  status: string;
  tool: 'Nuclei' | 'Nmap' | 'FFUF' | 'HTTPX';
}

export interface ReportModel {
  scanId: string;
  target: string;
  date: string;
  duration: string;
  scanType: string;
  score: number;
  riskLevel: 'Risco Crítico' | 'Risco Moderado' | 'Bom Estado';
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  httpInfo: {
    statusCode?: number | string;
    title?: string;
    technologies: string[];
    ip?: string;
    server?: string;
  };
  findings: Finding[];
  isMock?: boolean;
}

const mockFallback: ReportModel = {
  scanId: 'VS-2026-DEMO',
  target: 'api.example-finance.com',
  date: '17 de Novembro de 2026, 22:45',
  duration: '3m 18s',
  scanType: 'Varredura Profunda',
  score: 68,
  riskLevel: 'Risco Moderado',
  summary: {
    critical: 2,
    high: 4,
    medium: 7,
    low: 12,
    info: 15
  },
  httpInfo: {
    statusCode: 200,
    title: 'Financial Gateway Portal',
    technologies: ['React', 'Next.js', 'Nginx', 'Node.js', 'Express'],
    ip: '198.51.100.42',
    server: 'nginx/1.24.0'
  },
  findings: [
    {
      id: 'VULN-001',
      title: 'SQL Injection Error Based',
      severity: 'Crítico',
      endpoint: '/api/v1/users/profile',
      status: 'Aberto',
      details: 'Foi detectado um SQL Injection do tipo Error Based no endpoint de perfil do usuário. Isso pode permitir que um atacante extraia informações sensíveis do banco de dados.',
      tool: 'Nuclei'
    },
    {
      id: 'VULN-002',
      title: 'Remote Code Execution via Deserialization',
      severity: 'Crítico',
      endpoint: '/api/v1/data/import',
      status: 'Aberto',
      details: 'O endpoint de importação desserializa objetos de forma insegura, permitindo execução arbitrária de código no servidor.',
      tool: 'Nuclei'
    },
    {
      id: 'VULN-003',
      title: 'Cross-Site Scripting (Reflected)',
      severity: 'Alto',
      endpoint: '/search?q=',
      status: 'Aberto',
      details: 'Parâmetro de busca sendo refletido na resposta sem a devida sanitização, abrindo espaço para ataques de XSS.',
      tool: 'Nuclei'
    },
    {
      id: 'PORT-3306',
      title: 'Porta de Banco de Dados Exposta (MySQL)',
      severity: 'Alto',
      endpoint: 'tcp/3306',
      status: 'Aberto',
      details: 'Serviço MySQL 8.0 acessível publicamente na rede externa sem restrição de firewall.',
      tool: 'Nmap'
    },
    {
      id: 'DIR-001',
      title: 'Arquivo de Configuração Exposto (.env)',
      severity: 'Crítico',
      endpoint: '/.env',
      status: 'Aberto',
      details: 'Arquivo de ambiente crítico com chaves de API e credenciais de banco de dados diretamente acessível via GET HTTP.',
      tool: 'FFUF'
    },
    {
      id: 'HTTP-001',
      title: 'Missing Security Headers (HSTS)',
      severity: 'Médio',
      endpoint: 'Global Headers',
      status: 'Aberto',
      details: 'A aplicação não implementa o cabeçalho Strict-Transport-Security, deixando a conexão suscetível a ataques de downgrade.',
      tool: 'HTTPX'
    }
  ],
  isMock: true
};

function formatReportData(rawData: any): ReportModel {
  if (!rawData || typeof rawData !== 'object') {
    return mockFallback;
  }

  const alvo = String(rawData.alvo || rawData.target || rawData.host || 'alvo.com');
  const isDeep = rawData.tipo === 'deep_scan' || rawData.scanType === 'deep_scan' || rawData.isDeepScan;
  const scanType = isDeep ? 'Varredura Profunda' : 'Varredura Rápida';

  // ID do Scan
  const scanId = rawData.scanId || `VS-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  const date = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const findings: Finding[] = [];
  const httpInfo: ReportModel['httpInfo'] = {
    technologies: [],
  };

  // 1. Processa dados do HTTPX
  const httpxEntries = Array.isArray(rawData.httpx) ? rawData.httpx : [rawData.httpx];
  for (const entry of httpxEntries) {
    if (!entry) continue;
    const items = Array.isArray(entry.resultados) ? entry.resultados : (Array.isArray(entry) ? entry : []);
    for (const item of items) {
      if (!item || typeof item !== 'object') continue;
      if (item.status_code || item['status-code']) {
        httpInfo.statusCode = item.status_code || item['status-code'];
      }
      if (item.title) httpInfo.title = item.title;
      if (item.host || item.ip) httpInfo.ip = item.ip || item.host;
      if (item.webserver || item.server) httpInfo.server = item.webserver || item.server;
      if (Array.isArray(item.tech)) {
        httpInfo.technologies.push(...item.tech);
      }

      findings.push({
        id: `HTTP-${findings.length + 1}`,
        title: `Servidor Web Detectado (HTTP ${item.status_code || item['status-code'] || 200})`,
        severity: 'Info',
        endpoint: item.url || item.input || `https://${alvo}`,
        details: `Página "${item.title || 'Sem título'}". Servidor: ${item.webserver || 'Identificado'}. Tecnologias: ${Array.isArray(item.tech) ? item.tech.join(', ') : 'Padrão'}.`,
        status: 'Aberto',
        tool: 'HTTPX'
      });
    }
  }

  // 2. Processa dados do Nmap
  const nmapEntries = Array.isArray(rawData.nmap) ? rawData.nmap : [rawData.nmap];
  for (const entry of nmapEntries) {
    if (!entry) continue;
    const hosts = Array.isArray(entry.hosts) ? entry.hosts : [];
    for (const h of hosts) {
      if (h.ip && !httpInfo.ip) httpInfo.ip = h.ip;
      const portas = Array.isArray(h.portas) ? h.portas : [];
      for (const p of portas) {
        const numPorta = Number(p.porta);
        const servicoNome = p.servico?.nome || 'serviço';
        const produto = p.servico?.produto || '';
        const versao = p.servico?.versao || '';
        
        let severity: Finding['severity'] = 'Baixo';
        if ([21, 23, 445, 1433, 3306, 5432, 27017, 6379].includes(numPorta)) {
          severity = 'Alto';
        } else if ([22, 8080, 8443, 8888, 9000, 3000].includes(numPorta)) {
          severity = 'Médio';
        }

        findings.push({
          id: `PORT-${numPorta}`,
          title: `Porta Aberta: ${numPorta}/${p.protocolo || 'tcp'} (${servicoNome})`,
          severity,
          endpoint: `:${numPorta}`,
          details: `Porta detectada em estado aberto. Software identificado: ${produto} ${versao}. Informações extras: ${p.servico?.detalhes || 'Sem scripts adicionais'}.`,
          status: 'Aberto',
          tool: 'Nmap'
        });
      }
    }
  }

  // 3. Processa dados do FFuf
  const ffufEntries = Array.isArray(rawData.ffuf) ? rawData.ffuf : (Array.isArray(rawData.ffuz) ? rawData.ffuz : []);
  for (const entry of ffufEntries) {
    if (!entry) continue;
    const items = Array.isArray(entry.resultados) ? entry.resultados : [];
    for (const item of items) {
      if (!item) continue;
      const pathUrl = item.url || item.input?.FUZZ || item.path || '';
      const pathLower = String(pathUrl).toLowerCase();
      const statusHttp = Number(item.status || 200);
      const isAccessible2xx = statusHttp >= 200 && statusHttp < 300;
      const isProtected4xx = statusHttp === 401 || statusHttp === 403;

      let severity: Finding['severity'] = 'Baixo';
      if (
        isAccessible2xx &&
        (pathLower.includes('.env') ||
          pathLower.includes('.git') ||
          pathLower.includes('.bak') ||
          pathLower.includes('.sql') ||
          pathLower.includes('backup') ||
          pathLower.includes('config'))
      ) {
        severity = 'Crítico';
      } else if (
        isAccessible2xx &&
        (pathLower.includes('admin') ||
          pathLower.includes('dashboard') ||
          pathLower.includes('login') ||
          pathLower.includes('phpmyadmin'))
      ) {
        severity = 'Médio';
      } else if (isProtected4xx) {
        severity = 'Info';
      } else if (!isAccessible2xx) {
        severity = 'Info';
      }

      findings.push({
        id: `DIR-${findings.length + 1}`,
        title: `${isAccessible2xx ? 'Diretório/Arquivo Acessível' : isProtected4xx ? 'Rota Protegida Detectada' : 'Rota com Redirecionamento'}: ${pathUrl}`,
        severity,
        endpoint: pathUrl,
        details: `Código HTTP retornado: ${statusHttp}. Tamanho do conteúdo: ${item.length || item.words || 0} bytes.${item.redirectlocation ? ` Redireciona para: ${item.redirectlocation}.` : ' Resposta disponível na aplicação.'}`,
        status: isProtected4xx ? 'Restrito' : 'Aberto',
        tool: 'FFUF'
      });
    }
  }

  // 4. Processa dados do Nuclei
  const nucleiEntries = Array.isArray(rawData.nuclei) ? rawData.nuclei : [rawData.nuclei];
  for (const entry of nucleiEntries) {
    if (!entry) continue;
    const items = Array.isArray(entry.resultados) ? entry.resultados : [];
    for (const item of items) {
      if (!item) continue;
      const rawSev = String(item.info?.severity || 'medium').toLowerCase();
      let severity: Finding['severity'] = 'Médio';
      if (rawSev.includes('crit')) severity = 'Crítico';
      else if (rawSev.includes('high') || rawSev.includes('alt')) severity = 'Alto';
      else if (rawSev.includes('low') || rawSev.includes('baix')) severity = 'Baixo';
      else if (rawSev.includes('info')) severity = 'Info';

      findings.push({
        id: item['template-id'] || `CVE-${findings.length + 1}`,
        title: item.info?.name || item['template-id'] || 'Vulnerabilidade Catalogada',
        severity,
        endpoint: item['matched-at'] || item.host || alvo,
        details: item.info?.description || 'Vulnerabilidade confirmada por assinatura de template do Nuclei.',
        status: 'Aberto',
        tool: 'Nuclei'
      });
    }
  }

  // Se o scan foi executado mas não identificou vulnerabilidades, retorna achado informativo
  if (findings.length === 0) {
    findings.push({
      id: 'INFO-001',
      title: 'Nenhuma Vulnerabilidade Crítica Detectada',
      severity: 'Info',
      endpoint: alvo,
      details: 'As ferramentas executadas não identificaram portas críticas abertas, diretórios sensíveis expostos ou CVEs ativas durante este escaneamento.',
      status: 'Concluído',
      tool: 'HTTPX'
    });
  }

  // Contabilização de severidades
  const summary = {
    critical: findings.filter(f => f.severity === 'Crítico').length,
    high: findings.filter(f => f.severity === 'Alto').length,
    medium: findings.filter(f => f.severity === 'Médio').length,
    low: findings.filter(f => f.severity === 'Baixo').length,
    info: findings.filter(f => f.severity === 'Info').length,
  };

  // Cálculo do Security Score (0 a 100)
  let score = 100;
  score -= summary.critical * 25;
  score -= summary.high * 12;
  score -= summary.medium * 5;
  score -= summary.low * 1;
  score = Math.max(12, Math.min(100, score));

  let riskLevel: ReportModel['riskLevel'] = 'Bom Estado';
  if (score < 45 || summary.critical > 0) riskLevel = 'Risco Crítico';
  else if (score < 75 || summary.high > 0) riskLevel = 'Risco Moderado';

  return {
    scanId,
    target: alvo,
    date,
    duration: rawData.duration || (isDeep ? '3m 42s' : '45s'),
    scanType,
    score,
    riskLevel,
    summary,
    httpInfo,
    findings,
    isMock: false
  };
}

const getSeverityColor = (severity: string) => {
  switch (severity.toLowerCase()) {
    case 'crítico': return 'bg-red-500/10 text-red-400 border-red-500/30';
    case 'alto': return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
    case 'médio': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
    case 'baixo': return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
    default: return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30';
  }
};

const getToolBadge = (tool: Finding['tool']) => {
  switch (tool) {
    case 'Nuclei': return 'bg-purple-950/40 text-purple-300 border-purple-800/40';
    case 'Nmap': return 'bg-blue-950/40 text-blue-300 border-blue-800/40';
    case 'FFUF': return 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40';
    case 'HTTPX': return 'bg-cyan-950/40 text-cyan-300 border-cyan-800/40';
  }
};

export default function ReportPage() {
  const [report, setReport] = useState<ReportModel>(mockFallback);
  const [isTableExpanded, setIsTableExpanded] = useState(true);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [filterTool, setFilterTool] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');

  useEffect(() => {
    // Carrega o relatório mais recente gerado pelas ferramentas a partir do localStorage
    try {
      const stored = localStorage.getItem('vulscan_latest_report');
      if (stored) {
        const parsed = JSON.parse(stored);
        const formatted = formatReportData(parsed);
        setReport(formatted);
      }
    } catch (e) {
      console.error('Erro ao ler relatório do armazenamento:', e);
    }
  }, []);

  const toggleRow = (id: string) => {
    setExpandedRow(prev => prev === id ? null : id);
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(report, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `vulscanner-report-${report.scanId}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const filteredFindings = report.findings.filter(f => {
    const matchesTool = filterTool === 'all' || f.tool.toLowerCase() === filterTool.toLowerCase();
    const matchesSeverity = filterSeverity === 'all' || f.severity.toLowerCase() === filterSeverity.toLowerCase();
    return matchesTool && matchesSeverity;
  });

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.08 }
    }
  };

  const itemVariants: Variants = {
    hidden: { y: 16, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { duration: 0.4, ease: 'easeOut' }
    }
  };

  const scoreColor = report.score < 45 ? 'text-red-500' : report.score < 75 ? 'text-orange-500' : 'text-emerald-500';
  const scoreBorderColor = report.score < 45 ? 'text-red-500' : report.score < 75 ? 'text-orange-500' : 'text-emerald-500';

  return (
    <div className={`min-h-screen bg-[#030303] text-zinc-300 ${jakarta.className} flex flex-col relative overflow-x-hidden`}>
      <Head>
        <title>{`Relatório de Segurança: ${report.target} - VulScanner`}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <Navbar />

      <main className="relative z-10 flex flex-col items-center w-full px-4 md:px-8 lg:px-12 pt-24 pb-28">
        <motion.div 
          className="flex flex-col items-start w-full max-w-[1600px] gap-8"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Aviso se estiver exibindo dados demonstrativos */}
          {report.isMock && (
            <motion.div variants={itemVariants} className="w-full bg-purple-950/30 border border-purple-800/40 rounded-2xl px-5 py-3.5 flex items-center justify-between text-sm text-purple-200">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-purple-400 shrink-0" />
                <span>Exibindo relatório demonstrativo. Execute um escaneamento na página inicial para carregar seus dados reais.</span>
              </div>
              <Link href="/" className="font-semibold text-purple-300 underline underline-offset-4 hover:text-white transition-colors">
                Novo Scan →
              </Link>
            </motion.div>
          )}

          {/* Header Section */}
          <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-end justify-between w-full gap-6 border-b border-zinc-800/80 pb-8">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl md:text-5xl font-semibold text-white tracking-tight">
                  Relatório de Auditoria
                </h1>
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400">
                  {report.scanType}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-400 mt-1">
                <span className="flex items-center gap-2 bg-[#0A0A0A] border border-zinc-800/80 px-3.5 py-1.5 rounded-xl">
                  <Globe className="w-4 h-4 text-zinc-500" /> 
                  <span className={`text-white font-medium ${jetBrainsMono.className}`}>{report.target}</span>
                </span>
                <span className="flex items-center gap-2 bg-[#0A0A0A] border border-zinc-800/80 px-3.5 py-1.5 rounded-xl">
                  <Calendar className="w-4 h-4 text-zinc-500" /> 
                  {report.date}
                </span>
                <span className="flex items-center gap-2 bg-[#0A0A0A] border border-zinc-800/80 px-3.5 py-1.5 rounded-xl">
                  <Clock className="w-4 h-4 text-zinc-500" /> 
                  {report.duration}
                </span>
                <span className="flex items-center gap-2 bg-[#0A0A0A] border border-zinc-800/80 px-3.5 py-1.5 rounded-xl">
                  <Terminal className="w-4 h-4 text-zinc-500" /> 
                  <span className={jetBrainsMono.className}>{report.scanId}</span>
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-3 self-start md:self-auto">
              <button 
                onClick={handleExportJson}
                className="flex items-center gap-2 text-sm font-semibold text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 px-5 py-2.5 rounded-full transition-colors cursor-pointer"
              >
                <FileJson className="w-4 h-4 text-zinc-400" />
                Baixar JSON
              </button>
              <button 
                onClick={() => window.print()}
                className="flex items-center gap-2 text-sm font-semibold text-black bg-white hover:bg-zinc-200 px-6 py-2.5 rounded-full transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Exportar Relatório
              </button>
            </div>
          </motion.div>

          {/* Target Info and Score Row */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-10 gap-6 w-full">
            
            {/* Target URL Preview & Detected Infrastructure (70%) */}
            <div className="col-span-1 lg:col-span-7 bg-[#0A0A0A] border border-zinc-800/80 rounded-3xl overflow-hidden relative hover:border-zinc-700 transition-colors flex flex-col min-h-[350px]">
              <div className="h-12 w-full border-b border-zinc-800/80 bg-zinc-900/40 flex items-center px-4 gap-3 shrink-0">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-zinc-700" />
                  <div className="w-3 h-3 rounded-full bg-zinc-700" />
                  <div className="w-3 h-3 rounded-full bg-zinc-700" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className={`bg-black border border-zinc-800 rounded-md px-4 py-1 text-xs text-zinc-400 flex items-center gap-2 ${jetBrainsMono.className}`}>
                    https://{report.target}
                  </div>
                </div>
              </div>

              {/* Informações de Reconhecimento e Infraestrutura Coletadas */}
              <div className="flex-1 p-6 md:p-8 flex flex-col justify-between gap-6">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-3 flex items-center gap-2">
                    <Server className="w-4 h-4 text-purple-400" />
                    Infraestrutura & Fingerprinting Detectado
                  </h3>
                  <p className="text-xl md:text-2xl font-semibold text-white tracking-tight">
                    {report.httpInfo.title || 'Servidor Web Ativo'}
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-zinc-950/60 border border-zinc-800/60 rounded-2xl p-4">
                    <span className="text-xs text-zinc-500 font-medium block mb-1">Status HTTP</span>
                    <span className={`text-base font-bold text-white flex items-center gap-1.5 ${jetBrainsMono.className}`}>
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      {report.httpInfo.statusCode || 200} OK
                    </span>
                  </div>

                  <div className="bg-zinc-950/60 border border-zinc-800/60 rounded-2xl p-4">
                    <span className="text-xs text-zinc-500 font-medium block mb-1">IP do Host</span>
                    <span className={`text-base font-bold text-white ${jetBrainsMono.className}`}>
                      {report.httpInfo.ip || '127.0.0.1'}
                    </span>
                  </div>

                  <div className="bg-zinc-950/60 border border-zinc-800/60 rounded-2xl p-4">
                    <span className="text-xs text-zinc-500 font-medium block mb-1">Web Server</span>
                    <span className={`text-base font-bold text-white truncate block ${jetBrainsMono.className}`}>
                      {report.httpInfo.server || 'Detectado'}
                    </span>
                  </div>

                  <div className="bg-zinc-950/60 border border-zinc-800/60 rounded-2xl p-4">
                    <span className="text-xs text-zinc-500 font-medium block mb-1">Total Achados</span>
                    <span className={`text-base font-bold text-white ${jetBrainsMono.className}`}>
                      {report.findings.length}
                    </span>
                  </div>
                </div>

                {/* Tecnologias Mapeadas */}
                <div>
                  <span className="text-xs text-zinc-500 uppercase tracking-widest font-semibold block mb-2.5">
                    Tecnologias Identificadas
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {report.httpInfo.technologies.length > 0 ? (
                      report.httpInfo.technologies.map((tech, idx) => (
                        <span key={idx} className="px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-medium text-zinc-300">
                          {tech}
                        </span>
                      ))
                    ) : (
                      <>
                        <span className="px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-medium text-zinc-300">HTTP/1.1</span>
                        <span className="px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-medium text-zinc-300">SSL/TLS</span>
                        <span className="px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-medium text-zinc-300">Web App</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Score Card (30%) */}
            <div className="col-span-1 lg:col-span-3 bg-[#0A0A0A] border border-zinc-800/80 rounded-3xl p-6 md:p-8 flex flex-row items-center justify-between relative hover:border-zinc-700 transition-colors min-h-[350px]">
              
              {/* Left Side: Gauge */}
              <div className="flex flex-col items-center">
                <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-6">Security Score</h2>
                <div className="relative flex items-center justify-center">
                  <div className="absolute inset-0 bg-purple-500/10 blur-2xl rounded-full scale-110" />
                  <svg className="w-36 h-36 transform -rotate-90 relative z-10">
                    <circle cx="72" cy="72" r="62" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-zinc-900" />
                    <motion.circle 
                      cx="72" cy="72" r="62" 
                      stroke="currentColor" 
                      strokeWidth="8" 
                      fill="transparent" 
                      strokeDasharray={389.5} 
                      strokeDashoffset={389.5}
                      className={`${scoreBorderColor} drop-shadow-[0_0_8px_rgba(168,85,247,0.4)]`}
                      strokeLinecap="round"
                      animate={{ strokeDashoffset: 389.5 - (389.5 * report.score) / 100 }}
                      transition={{ duration: 1.8, ease: "easeOut", delay: 0.2 }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center flex-col z-20">
                    <span className={`text-4xl font-bold text-white ${jetBrainsMono.className}`}>{report.score}</span>
                  </div>
                </div>
                <p className={`mt-5 text-xs font-semibold px-3 py-1 rounded-full border ${
                  report.score < 45 
                    ? 'text-red-400 bg-red-500/10 border-red-500/20' 
                    : report.score < 75 
                    ? 'text-orange-400 bg-orange-500/10 border-orange-500/20' 
                    : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                }`}>
                  {report.riskLevel}
                </p>
              </div>

              {/* Right Side: Severity Stats */}
              <div className="flex flex-col gap-4 items-end pr-2">
                <div className="flex flex-col items-end">
                  <span className="text-zinc-500 text-[10px] font-semibold tracking-widest">CRÍTICO</span>
                  <span className={`text-red-400 text-xl font-bold ${jetBrainsMono.className}`}>{report.summary.critical}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-zinc-500 text-[10px] font-semibold tracking-widest">ALTO</span>
                  <span className={`text-orange-400 text-xl font-bold ${jetBrainsMono.className}`}>{report.summary.high}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-zinc-500 text-[10px] font-semibold tracking-widest">MÉDIO</span>
                  <span className={`text-yellow-400 text-xl font-bold ${jetBrainsMono.className}`}>{report.summary.medium}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-zinc-500 text-[10px] font-semibold tracking-widest">BAIXO / INFO</span>
                  <span className={`text-zinc-300 text-xl font-bold ${jetBrainsMono.className}`}>{report.summary.low + report.summary.info}</span>
                </div>
              </div>

            </div>
          </motion.div>

          {/* Filtros e Accordion Section */}
          <motion.div variants={itemVariants} className="w-full bg-[#0A0A0A] border border-zinc-800/80 rounded-3xl overflow-hidden mt-4">
            
            {/* Header Accordion Trigger com Filtros */}
            <div className="px-6 md:px-8 py-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800/50 bg-[#070707]">
              <div 
                className="flex items-center gap-3 cursor-pointer select-none"
                onClick={() => setIsTableExpanded(!isTableExpanded)}
              >
                <h3 className="text-xl font-semibold text-white">Achados das Ferramentas</h3>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400">
                  {filteredFindings.length}
                </span>
                {isTableExpanded ? <ChevronUp className="w-5 h-5 text-zinc-400" /> : <ChevronDown className="w-5 h-5 text-zinc-400" />}
              </div>

              {/* Botões de Filtro por Ferramenta */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-zinc-500 flex items-center gap-1 mr-1">
                  <Filter className="w-3.5 h-3.5" />
                  Filtrar:
                </span>

                {['all', 'Nuclei', 'Nmap', 'FFUF', 'HTTPX'].map((tool) => (
                  <button
                    key={tool}
                    onClick={() => setFilterTool(tool)}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${
                      filterTool.toLowerCase() === tool.toLowerCase()
                        ? 'bg-purple-600/20 text-purple-300 border-purple-500/50 font-semibold'
                        : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    {tool === 'all' ? 'Todas' : tool}
                  </button>
                ))}
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
                    <div className="grid grid-cols-12 px-6 md:px-8 py-4 text-xs text-zinc-500 uppercase font-semibold border-b border-zinc-800/50 bg-[#050505]">
                      <div className="col-span-2">Severidade</div>
                      <div className="col-span-2">Ferramenta</div>
                      <div className="col-span-4">Identificação / Título</div>
                      <div className="col-span-3">Endpoint / Alvo</div>
                      <div className="col-span-1 text-right">Ação</div>
                    </div>

                    <div className="divide-y divide-zinc-800/40">
                      {filteredFindings.length > 0 ? (
                        filteredFindings.map((vuln) => (
                          <div key={vuln.id} className="flex flex-col group">
                            
                            {/* Linha Clicável */}
                            <div 
                              className="grid grid-cols-12 px-6 md:px-8 py-4 items-center hover:bg-zinc-900/40 cursor-pointer transition-colors"
                              onClick={() => toggleRow(vuln.id)}
                            >
                              <div className="col-span-2">
                                <span className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold border ${getSeverityColor(vuln.severity)}`}>
                                  {vuln.severity}
                                </span>
                              </div>
                              <div className="col-span-2">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold border ${getToolBadge(vuln.tool)}`}>
                                  {vuln.tool}
                                </span>
                              </div>
                              <div className="col-span-4 pr-3">
                                <div className="font-medium text-zinc-200 truncate">{vuln.title}</div>
                                <div className={`text-xs text-zinc-500 mt-0.5 ${jetBrainsMono.className}`}>{vuln.id}</div>
                              </div>
                              <div className="col-span-3 pr-2">
                                <code className={`bg-zinc-900 border border-zinc-800 text-zinc-300 px-2 py-1 rounded-md text-xs truncate block max-w-full ${jetBrainsMono.className}`}>
                                  {vuln.endpoint}
                                </code>
                              </div>
                              <div className="col-span-1 text-right flex justify-end items-center gap-1">
                                <ChevronDown className={`w-4 h-4 text-zinc-500 transform transition-transform duration-300 ${expandedRow === vuln.id ? 'rotate-180 text-purple-400' : ''}`} />
                              </div>
                            </div>

                            {/* Conteúdo Expandido do Acordeão */}
                            <AnimatePresence>
                              {expandedRow === vuln.id && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="overflow-hidden bg-[#060606] border-t border-zinc-800/30"
                                >
                                  <div className="px-6 md:px-8 py-5 flex flex-col gap-4">
                                    <div>
                                      <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                                        <Layers className="w-3.5 h-3.5 text-purple-400" />
                                        Detalhes Técnicos do Achado
                                      </h4>
                                      <p className="text-sm text-zinc-300 leading-relaxed max-w-5xl whitespace-pre-line">{vuln.details}</p>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-4 pt-1">
                                      <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs">
                                        <span className="text-zinc-500 mr-2">Detectado por:</span>
                                        <span className="font-semibold text-white">{vuln.tool}</span>
                                      </div>
                                      <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs">
                                        <span className="text-zinc-500 mr-2">Status:</span>
                                        <span className="font-semibold text-emerald-400">{vuln.status}</span>
                                      </div>
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>

                          </div>
                        ))
                      ) : (
                        <div className="px-8 py-12 text-center text-zinc-500">
                          Nenhum achado encontrado para os filtros selecionados.
                        </div>
                      )}
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
