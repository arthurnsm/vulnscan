import React, { useState, useEffect, useMemo, useSyncExternalStore } from 'react';
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
  ShieldAlert,
  ShieldCheck,
  Filter,
  Layers,
  FileJson,
  Search,
  Check,
  Copy,
  ArrowLeft,
  Lock,
  Activity,
  Wrench,
  X
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { jakarta, jetBrainsMono } from '../app/fonts';

export interface Finding {
  id: string;
  title: string;
  severity: 'Crítico' | 'Alto' | 'Médio' | 'Baixo' | 'Info';
  endpoint: string;
  details: string;
  recommendation: string;
  status: string;
  tool: 'Nuclei' | 'Nmap' | 'FFUF' | 'HTTPX';
}

export interface ReportModel {
  scanId: string;
  target: string;
  date: string;
  duration: string;
  scanType: string;
  isDeepScan: boolean;
  score: number;
  riskLevel: 'Risco Crítico' | 'Risco Moderado' | 'Bom Estado';
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  stats: {
    openPorts: number;
    discoveredRoutes: number;
    cvesDetected: number;
  };
  toolsStatus: {
    httpx: boolean;
    nmap: boolean;
    ffuf: boolean;
    nuclei: boolean;
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
  screenshotAvailable?: boolean;
}

const SEVERITY_ORDER: Record<Finding['severity'], number> = {
  'Crítico': 0,
  'Alto': 1,
  'Médio': 2,
  'Baixo': 3,
  'Info': 4,
};

const mockFallback: ReportModel = {
  scanId: 'VS-2026-DEMO',
  target: 'api.example-finance.com',
  date: '17 de Novembro de 2026, 22:45',
  duration: '3m 18s',
  scanType: 'Varredura Profunda',
  isDeepScan: true,
  score: 68,
  riskLevel: 'Risco Moderado',
  summary: {
    critical: 2,
    high: 2,
    medium: 1,
    low: 0,
    info: 1,
  },
  stats: {
    openPorts: 1,
    discoveredRoutes: 1,
    cvesDetected: 3,
  },
  toolsStatus: {
    httpx: true,
    nmap: true,
    ffuf: true,
    nuclei: true,
  },
  httpInfo: {
    statusCode: 200,
    title: 'Financial Gateway Portal',
    technologies: ['React', 'Next.js', 'Nginx', 'Node.js'],
    ip: '198.51.100.42',
    server: 'nginx/1.24.0',
  },
  findings: [
    {
      id: 'VULN-001',
      title: 'SQL Injection Error Based',
      severity: 'Crítico',
      endpoint: '/api/v1/users/profile',
      status: 'Aberto',
      details:
        'Detectado padrão de SQL Injection baseado em erro no endpoint de perfil. Permite extração de registros do banco de dados.',
      recommendation:
        'Utilize queries parametrizadas (Prepared Statements) ou ORM seguro e desabilite mensagens detalhadas de erro SQL em produção.',
      tool: 'Nuclei',
    },
    {
      id: 'DIR-001',
      title: 'Diretório/Arquivo Acessível: /.env',
      severity: 'Crítico',
      endpoint: '/.env',
      status: 'Aberto',
      details:
        'Código HTTP retornado: 200. Arquivo de configuração ambiental diretamente acessível contendo possíveis segredos e chaves de API.',
      recommendation:
        'Bloqueie o acesso público a arquivos ocultos (dotfiles) no servidor web (Nginx/Apache) e rotacione imediatamente todas as credenciais expostas.',
      tool: 'FFUF',
    },
    {
      id: 'VULN-003',
      title: 'Cross-Site Scripting (Reflected)',
      severity: 'Alto',
      endpoint: '/search?q=',
      status: 'Aberto',
      details:
        'Parâmetro de busca refletido na resposta HTML sem sanitização ou encoding contextual.',
      recommendation:
        'Aplique escaping contextual na renderização do parâmetro e configure cabeçalhos Content-Security-Policy (CSP) restritivos.',
      tool: 'Nuclei',
    },
    {
      id: 'PORT-3306',
      title: 'Porta Aberta: 3306/tcp (mysql)',
      severity: 'Alto',
      endpoint: ':3306',
      status: 'Aberto',
      details:
        'Serviço MySQL 8.0 acessível diretamente na interface pública de rede sem restrição de firewall.',
      recommendation:
        'Restrinja o acesso da porta 3306 via firewall/Security Group apenas para sub-redes internas ou túneis VPN autorizados.',
      tool: 'Nmap',
    },
    {
      id: 'VULN-005',
      title: 'Missing Security Headers (HSTS)',
      severity: 'Médio',
      endpoint: 'Global Headers',
      status: 'Aberto',
      details:
        'A aplicação não implementa o cabeçalho Strict-Transport-Security, permitindo ataques de downgrade HTTPS -> HTTP.',
      recommendation:
        'Adicione o header "Strict-Transport-Security: max-age=31536000; includeSubDomains" em todas as respostas HTTPS.',
      tool: 'Nuclei',
    },
    {
      id: 'HTTP-001',
      title: 'Servidor Web Detectado (HTTP 200)',
      severity: 'Info',
      endpoint: 'https://api.example-finance.com',
      status: 'Ativo',
      details:
        'Página "Financial Gateway Portal". Servidor: nginx/1.24.0. Tecnologias: React, Next.js, Nginx, Node.js.',
      recommendation:
        'Oculte assinaturas de versão do servidor HTTP (server_tokens off no Nginx) para dificultar fingerprinting.',
      tool: 'HTTPX',
    },
  ],
  isMock: true,
};

interface RawHttpxItem {
  status_code?: number | string;
  'status-code'?: number | string;
  title?: string;
  ip?: string;
  webserver?: string;
  server?: string;
  tech?: string[];
  url?: string;
  input?: string;
}

interface RawNmapPort {
  porta?: number | string;
  protocolo?: string;
  servico?: {
    nome?: string;
    produto?: string;
    versao?: string;
    detalhes?: string;
  };
}

interface RawNmapHost {
  ip?: string;
  portas?: RawNmapPort[];
}

interface RawFfufItem {
  url?: string;
  input?: { FUZZ?: string };
  path?: string;
  status?: number | string;
  length?: number;
  words?: number;
  redirectlocation?: string;
}

interface RawNucleiItem {
  'template-id'?: string;
  'matcher-name'?: string;
  'matched-at'?: string;
  'extracted-results'?: string[];
  host?: string;
  info?: {
    severity?: string;
    name?: string;
    description?: string;
    remediation?: string;
  };
}

interface RawToolResult<T> {
  status?: string;
  resultados?: T[];
  hosts?: RawNmapHost[];
}

export interface RawConsolidatedReport {
  alvo?: string;
  target?: string;
  host?: string;
  tipo?: string;
  scanType?: string;
  isDeepScan?: boolean;
  scanId?: string;
  date?: string;
  duration?: string;
  httpx?: RawToolResult<RawHttpxItem>[] | RawToolResult<RawHttpxItem> | RawHttpxItem[];
  nmap?: RawToolResult<never>[] | RawToolResult<never>;
  ffuf?: RawToolResult<RawFfufItem>[] | RawToolResult<RawFfufItem>;
  ffuz?: RawToolResult<RawFfufItem>[] | RawToolResult<RawFfufItem>;
  nuclei?: RawToolResult<RawNucleiItem>[] | RawToolResult<RawNucleiItem>;
  screenshotAvailable?: boolean;
}

const STORAGE_KEY = 'vulscan_latest_report';

function subscribeToStorage(callback: () => void) {
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}

function getStorageSnapshot(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function getServerStorageSnapshot(): string | null {
  return null;
}

function formatReportData(rawData: RawConsolidatedReport | null | undefined): ReportModel {
  if (!rawData || typeof rawData !== 'object') {
    return mockFallback;
  }

  const alvo = String(rawData.alvo || rawData.target || rawData.host || 'alvo.com');
  const isDeepScan = Boolean(
    rawData.tipo === 'deep_scan' || rawData.scanType === 'deep_scan' || rawData.isDeepScan
  );
  const scanType = isDeepScan ? 'Varredura Profunda' : 'Varredura Rápida';

  const scanId = rawData.scanId || 'VS-SCAN-LIVE';
  const date = rawData.date || 'Sessão Atual';

  const findings: Finding[] = [];
  const httpInfo: ReportModel['httpInfo'] = {
    technologies: [],
  };

  let openPorts = 0;
  let discoveredRoutes = 0;
  let cvesDetected = 0;
  let hasHttpx = false;
  let hasNmap = false;
  let hasFfuf = false;
  let hasNuclei = false;

  // 1. Processa dados do HTTPX
  const httpxEntries = Array.isArray(rawData.httpx) ? rawData.httpx : [rawData.httpx];
  for (const entry of httpxEntries) {
    if (!entry || typeof entry !== 'object') continue;
    const toolEntry = entry as RawToolResult<RawHttpxItem>;
    if (toolEntry.status === 'sucesso' || Array.isArray(toolEntry.resultados)) {
      hasHttpx = true;
    }
    const items: RawHttpxItem[] = Array.isArray(toolEntry.resultados)
      ? toolEntry.resultados
      : Array.isArray(entry)
      ? (entry as RawHttpxItem[])
      : 'url' in entry || 'status_code' in entry || 'status-code' in entry
      ? [entry as RawHttpxItem]
      : [];
    for (const item of items) {
      if (!item || typeof item !== 'object') continue;
      hasHttpx = true;
      if (item.status_code || item['status-code']) {
        httpInfo.statusCode = item.status_code || item['status-code'];
      }
      if (item.title) httpInfo.title = item.title;
      if (item.ip) httpInfo.ip = item.ip;
      if (item.webserver || item.server) httpInfo.server = item.webserver || item.server;
      if (Array.isArray(item.tech)) {
        for (const t of item.tech) {
          if (typeof t === 'string' && !httpInfo.technologies.includes(t)) {
            httpInfo.technologies.push(t);
          }
        }
      }

      findings.push({
        id: `HTTP-${findings.length + 1}`,
        title: `Aplicação Web Ativa (HTTP ${item.status_code || item['status-code'] || 200})`,
        severity: 'Info',
        endpoint: item.url || item.input || `https://${alvo}`,
        details: `Título capturado: "${item.title || 'Sem título'}". Servidor web: ${item.webserver || 'Identificado'}.${
          Array.isArray(item.tech) && item.tech.length > 0
            ? ` Tecnologias: ${item.tech.join(', ')}.`
            : ''
        }`,
        recommendation:
          'Revise cabeçalhos expostos pelo servidor web (como Server e X-Powered-By) e garanta redirecionamento estrito para HTTPS.',
        status: 'Ativo',
        tool: 'HTTPX',
      });
    }
  }

  // 2. Processa dados do Nmap (ignora portas web comuns 80, 443, 8080 e 8443 na composição de achados)
  const COMMON_HTTP_PORTS = new Set([80, 443, 8080, 8443]);
  const nmapEntries = Array.isArray(rawData.nmap) ? rawData.nmap : [rawData.nmap];
  for (const entry of nmapEntries) {
    if (!entry || typeof entry !== 'object') continue;
    if (entry.status === 'sucesso' || Array.isArray(entry.hosts)) hasNmap = true;
    const hosts = Array.isArray(entry.hosts) ? entry.hosts : [];
    for (const h of hosts) {
      if (h.ip) {
        // Prioriza o endereço IPv4 real resolvido pelo Nmap
        httpInfo.ip = h.ip;
      }
      const portas = Array.isArray(h.portas) ? h.portas : [];
      for (const p of portas) {
        const numPorta = Number(p.porta);
        if (COMMON_HTTP_PORTS.has(numPorta)) {
          continue;
        }
        openPorts++;
        const servicoNome = p.servico?.nome || 'serviço';
        const produto = p.servico?.produto || '';
        const versao = p.servico?.versao || '';

        let severity: Finding['severity'] = 'Baixo';
        let recommendation =
          'Confirme se esta porta precisa estar acessível externamente e aplique regras de firewall adequadas.';

        if ([21, 23, 445, 1433, 3306, 5432, 27017, 6379].includes(numPorta)) {
          severity = 'Alto';
          recommendation =
            'Serviços administrativos ou de banco de dados não devem ficar expostos à internet pública. Restrinja via VPN, allowlist de IP ou firewall.';
        } else if ([22, 8888, 9000, 3000].includes(numPorta)) {
          severity = 'Médio';
          recommendation =
            'Garanta autenticação forte (ex: chaves SSH, desabilitar senha), TLS atualizado e restrição de origem quando aplicável.';
        }

        findings.push({
          id: `PORT-${numPorta}-${findings.length + 1}`,
          title: `Porta Aberta: ${numPorta}/${p.protocolo || 'tcp'} (${servicoNome})`,
          severity,
          endpoint: `${h.ip ? h.ip : alvo}:${numPorta}`,
          details: `Estado aberto detectado pelo Nmap. Software identificado: ${
            [produto, versao].filter(Boolean).join(' ') || 'Assinatura genérica'
          }. ${p.servico?.detalhes ? `Detalhes de script: ${p.servico.detalhes}` : ''}`,
          recommendation,
          status: 'Aberto',
          tool: 'Nmap',
        });
      }
    }
  }

  // 3. Processa dados do FFUF
  const ffufEntries = Array.isArray(rawData.ffuf)
    ? rawData.ffuf
    : Array.isArray(rawData.ffuz)
    ? rawData.ffuz
    : [];
  for (const entry of ffufEntries) {
    if (!entry || typeof entry !== 'object') continue;
    if (entry.status === 'sucesso' || Array.isArray(entry.resultados)) hasFfuf = true;
    const items = Array.isArray(entry.resultados) ? entry.resultados : [];
    for (const item of items) {
      if (!item) continue;
      discoveredRoutes++;
      const pathUrl = item.url || item.input?.FUZZ || item.path || '';
      const pathLower = String(pathUrl).split('?')[0].toLowerCase();
      const statusHttp = Number(item.status || 200);
      const isAccessible2xx = statusHttp >= 200 && statusHttp < 300;
      const isProtected4xx = statusHttp === 401 || statusHttp === 403;

      let severity: Finding['severity'] = 'Baixo';
      let recommendation =
        'Verifique se a rota descoberta deve ser publicamente indexável ou se requer controle de acesso adicional.';

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
        recommendation =
          'Remova ou bloqueie imediatamente o acesso público a arquivos sensíveis de configuração/backup e rotacione credenciais potencialmente expostas.';
      } else if (
        isAccessible2xx &&
        (pathLower.includes('admin') ||
          pathLower.includes('dashboard') ||
          pathLower.includes('login') ||
          pathLower.includes('phpmyadmin'))
      ) {
        severity = 'Médio';
        recommendation =
          'Proteja painéis administrativos com MFA, rate-limiting contra brute-force e, se possível, restrição de acesso por IP.';
      } else if (isProtected4xx) {
        severity = 'Info';
        recommendation =
          'A rota retornou bloqueio (401/403). Confirme se não há bypass via cabeçalhos ou métodos HTTP alternativos.';
      } else if (!isAccessible2xx) {
        severity = 'Info';
      }

      findings.push({
        id: `DIR-${findings.length + 1}`,
        title: `${
          isAccessible2xx
            ? 'Diretório/Arquivo Acessível'
            : isProtected4xx
            ? 'Rota Protegida Detectada'
            : 'Rota com Redirecionamento'
        }: ${pathUrl}`,
        severity,
        endpoint: pathUrl,
        details: `Código HTTP retornado: ${statusHttp}. Tamanho da resposta: ${
          item.length ?? item.words ?? 0
        } bytes.${
          item.redirectlocation
            ? ` Redireciona para: ${item.redirectlocation}.`
            : ' Conteúdo acessível diretamente.'
        }`,
        recommendation,
        status: isProtected4xx ? 'Restrito' : 'Aberto',
        tool: 'FFUF',
      });
    }
  }

  // 4. Processa dados do Nuclei
  const nucleiEntries = Array.isArray(rawData.nuclei) ? rawData.nuclei : [rawData.nuclei];
  for (const entry of nucleiEntries) {
    if (!entry || typeof entry !== 'object') continue;
    if (entry.status === 'sucesso' || Array.isArray(entry.resultados)) hasNuclei = true;
    const items = Array.isArray(entry.resultados) ? entry.resultados : [];
    for (const item of items) {
      if (!item) continue;
      cvesDetected++;
      const rawSev = String(item.info?.severity || 'medium').toLowerCase();
      let severity: Finding['severity'] = 'Médio';
      if (rawSev.includes('crit')) severity = 'Crítico';
      else if (rawSev.includes('high') || rawSev.includes('alt')) severity = 'Alto';
      else if (rawSev.includes('low') || rawSev.includes('baix')) severity = 'Baixo';
      else if (rawSev.includes('info')) severity = 'Info';

      const baseId = item['template-id'] || `CVE-${findings.length + 1}`;
      const matcher = item['matcher-name'];
      const extracted = Array.isArray(item['extracted-results']) && item['extracted-results'].length > 0
        ? item['extracted-results'].join(', ')
        : '';
      const rawTitle = item.info?.name || item['template-id'] || 'Vulnerabilidade Catalogada';
      const title = matcher ? `${rawTitle} (${matcher})` : rawTitle;
      const baseDesc =
        item.info?.description ||
        'Vulnerabilidade ou exposição confirmada por assinatura de template do Nuclei.';
      const details = extracted
        ? `${baseDesc}\n\nValores extraídos: ${extracted}`
        : baseDesc;

      findings.push({
        id: `${baseId}-${findings.length + 1}`,
        title,
        severity,
        endpoint: item['matched-at'] || item.host || alvo,
        details,
        recommendation:
          item.info?.remediation ||
          'Aplique as atualizações de segurança do fornecedor ou mitigue o vetor afetado conforme boletim da CVE correspondente.',
        status: 'Aberto',
        tool: 'Nuclei',
      });
    }
  }

  // Fallback informativo se nenhum achado foi gerado
  if (findings.length === 0) {
    findings.push({
      id: 'INFO-001',
      title: 'Nenhuma Vulnerabilidade Crítica Detectada',
      severity: 'Info',
      endpoint: alvo,
      details:
        'As ferramentas executadas finalizaram sem identificar portas críticas expostas, diretórios sensíveis ou CVEs conhecidas.',
      recommendation:
        'Mantenha varreduras periódicas e execute uma Varredura Profunda regularmente para cobertura de CVEs.',
      status: 'Concluído',
      tool: 'HTTPX',
    });
  }

  // Ordena achados da maior severidade para a menor
  findings.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);

  const summary = {
    critical: findings.filter((f) => f.severity === 'Crítico').length,
    high: findings.filter((f) => f.severity === 'Alto').length,
    medium: findings.filter((f) => f.severity === 'Médio').length,
    low: findings.filter((f) => f.severity === 'Baixo').length,
    info: findings.filter((f) => f.severity === 'Info').length,
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
    duration: rawData.duration || (isDeepScan ? '3m 42s' : '25s'),
    scanType,
    isDeepScan,
    score,
    riskLevel,
    summary,
    stats: {
      openPorts,
      discoveredRoutes,
      cvesDetected,
    },
    toolsStatus: {
      httpx: hasHttpx,
      nmap: hasNmap,
      ffuf: hasFfuf,
      nuclei: hasNuclei,
    },
    httpInfo,
    findings,
    isMock: false,
    screenshotAvailable:
      typeof rawData.screenshotAvailable === 'boolean'
        ? rawData.screenshotAvailable
        : undefined,
  };
}

const getSeverityBadge = (severity: Finding['severity']) => {
  switch (severity) {
    case 'Crítico':
      return 'bg-red-500/10 text-red-400 border-red-500/30';
    case 'Alto':
      return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
    case 'Médio':
      return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
    case 'Baixo':
      return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
    default:
      return 'bg-zinc-800/70 text-zinc-300 border-zinc-700/80';
  }
};

// getSeverityDot removido para eliminar bolinhas coloridas

const getToolBadge = (_tool: Finding['tool']) => {
  return 'bg-[#050505] text-zinc-300 border-zinc-800';
};

export default function ReportPage() {
  const storedJson = useSyncExternalStore(
    subscribeToStorage,
    getStorageSnapshot,
    getServerStorageSnapshot
  );

  const report = useMemo<ReportModel>(() => {
    if (!storedJson) return mockFallback;
    try {
      const parsed = JSON.parse(storedJson) as RawConsolidatedReport;
      return formatReportData(parsed);
    } catch (e) {
      console.error('Erro ao ler relatório do armazenamento:', e);
      return mockFallback;
    }
  }, [storedJson]);

  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isTableExpanded, setIsTableExpanded] = useState(true);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [filterTool, setFilterTool] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [reviewedIds, setReviewedIds] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [screenshotError, setScreenshotError] = useState(false);
  const [isResolvingImage, setIsResolvingImage] = useState(true);

  const screenshotTargetUrl = useMemo(() => {
    if (!report.target) return '';
    const clean = report.target.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '');
    return `https://${clean}`;
  }, [report.target]);

  useEffect(() => {
    // 1. Se a existência da imagem já foi resolvida antes da montagem (ex: término do scan no app/page.tsx)
    if (typeof report.screenshotAvailable === 'boolean') {
      setScreenshotError(!report.screenshotAvailable);
      setIsResolvingImage(false);
      return;
    }

    if (!screenshotTargetUrl) {
      setScreenshotError(true);
      setIsResolvingImage(false);
      return;
    }

    let isMounted = true;
    setIsResolvingImage(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);

    // 2. Valida a existência real da imagem no backend antes de montar e exibir o relatório
    fetch(`/api/screenshot?target=${encodeURIComponent(screenshotTargetUrl)}&checkOnly=true`, {
      signal: controller.signal,
    })
      .then((res) => {
        if (!isMounted) return;
        clearTimeout(timeoutId);
        setScreenshotError(!res.ok);
        setIsResolvingImage(false);
      })
      .catch(() => {
        if (!isMounted) return;
        clearTimeout(timeoutId);
        setScreenshotError(true);
        setIsResolvingImage(false);
      });

    return () => {
      isMounted = false;
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, [report.screenshotAvailable, screenshotTargetUrl]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.pageX, y: e.pageY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const toggleRow = (id: string) => {
    setExpandedRow((prev) => (prev === id ? null : id));
  };

  const toggleReviewed = (id: string) => {
    setReviewedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopyEndpoint = (id: string, text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1600);
  };

  const handleExportJson = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(report, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `vulnscan-report-${report.scanId}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const toolCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: report.findings.length,
      Nuclei: 0,
      Nmap: 0,
      FFUF: 0,
      HTTPX: 0,
    };
    for (const f of report.findings) {
      counts[f.tool] = (counts[f.tool] || 0) + 1;
    }
    return counts;
  }, [report.findings]);

  const filteredFindings = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return report.findings.filter((f) => {
      const matchesTool =
        filterTool === 'all' || f.tool.toLowerCase() === filterTool.toLowerCase();
      const matchesSeverity =
        filterSeverity === 'all' ||
        (filterSeverity === 'Baixo/Info'
          ? f.severity === 'Baixo' || f.severity === 'Info'
          : f.severity.toLowerCase() === filterSeverity.toLowerCase());
      const matchesSearch =
        !q ||
        f.title.toLowerCase().includes(q) ||
        f.endpoint.toLowerCase().includes(q) ||
        f.id.toLowerCase().includes(q) ||
        f.details.toLowerCase().includes(q);
      return matchesTool && matchesSeverity && matchesSearch;
    });
  }, [report.findings, filterTool, filterSeverity, searchQuery]);

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08 },
    },
  };

  const itemVariants: Variants = {
    hidden: { y: 16, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
    },
  };

  const scoreTone =
    report.score < 45
      ? {
          stroke: 'text-red-500',
          glow: 'bg-red-500/10',
          badge: 'text-red-400 bg-red-500/10 border-red-500/25',
        }
      : report.score < 75
      ? {
          stroke: 'text-orange-400',
          glow: 'bg-orange-500/10',
          badge: 'text-orange-300 bg-orange-500/10 border-orange-500/25',
        }
      : {
          stroke: 'text-purple-400',
          glow: 'bg-purple-500/15',
          badge: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25',
        };

  const totalSeverityItems = Math.max(
    1,
    report.summary.critical +
      report.summary.high +
      report.summary.medium +
      report.summary.low +
      report.summary.info
  );

  const severityBars = [
    {
      label: 'Crítico',
      count: report.summary.critical,
      color: 'bg-red-500',
      text: 'text-red-400',
    },
    {
      label: 'Alto',
      count: report.summary.high,
      color: 'bg-orange-500',
      text: 'text-orange-400',
    },
    {
      label: 'Médio',
      count: report.summary.medium,
      color: 'bg-yellow-500',
      text: 'text-yellow-400',
    },
    {
      label: 'Baixo / Info',
      count: report.summary.low + report.summary.info,
      color: 'bg-purple-500',
      text: 'text-zinc-300',
    },
  ];

  const circleCircumference = 2 * Math.PI * 62; // ~389.55

  if (isResolvingImage) {
    return (
      <div
        className={`min-h-screen bg-[#050505] text-zinc-300 ${jakarta.className} flex flex-col items-center justify-center p-6 relative overflow-hidden select-none`}
      >
        <Head>
          <title>{`Preparando Relatório: ${report.target || 'VulnScan'} — VulnScan`}</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
        </Head>
        <div className="flex flex-col items-center justify-center gap-5 text-center max-w-sm w-full">
          <div className="relative flex items-center justify-center w-14 h-14 rounded-full border border-zinc-800 bg-[#090909]">
            <Globe className="w-6 h-6 text-zinc-600 animate-pulse" />
            <div className="absolute inset-0 rounded-full border border-t-zinc-400 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-zinc-200 tracking-tight">
              Resolvendo visualização do alvo
            </span>
            <span className={`text-xs text-zinc-500 truncate max-w-xs ${jetBrainsMono.className}`}>
              {screenshotTargetUrl || report.target || 'Carregando parâmetros...'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, filter: 'blur(6px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className={`min-h-screen bg-[#050505] text-zinc-300 ${jakarta.className} flex flex-col relative overflow-x-hidden selection:bg-purple-500/30`}
    >
      <Head>
        <title>{`Relatório de Auditoria: ${report.target} — VulnScan`}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <style jsx global>{`
        @media print {
          body {
            background: #ffffff !important;
            color: #111111 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Top Hero Shell (Identidade Visual da Home: #030303) */}
      <section className="relative w-full bg-[#030303] border-b border-zinc-800/80 overflow-hidden">
        <div className="no-print">
          <Navbar />
        </div>

        {/* Cabeçalho do Relatório */}
        <header className="relative z-10 w-full px-4 sm:px-8 lg:px-[140px] xl:px-[200px] 2xl:px-[224px] pt-6 pb-12">
          <motion.div
            className="w-full max-w-[1800px] mx-auto flex flex-col gap-6"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* Banner Demonstrativo (quando acessado diretamente sem scan recente) */}
            {report.isMock && (
              <motion.div
                variants={itemVariants}
                className="no-print w-full bg-purple-500/10 border border-purple-500/25 rounded-2xl px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm text-purple-200"
              >
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>
                    Exibindo relatório demonstrativo. Execute uma varredura na tela inicial para visualizar dados reais.
                  </span>
                </div>
                <Link
                  href="/"
                  className="inline-flex items-center gap-1.5 font-semibold text-purple-300 hover:text-white transition-colors shrink-0"
                >
                  Executar Novo Scan →
                </Link>
              </motion.div>
            )}

            <motion.div
              variants={itemVariants}
              className="flex flex-col lg:flex-row lg:items-end justify-between gap-6"
            >
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span
                    className={`inline-flex items-center text-[11px] font-semibold uppercase tracking-widest px-3 py-1 rounded-full border ${
                      report.isDeepScan
                        ? 'bg-purple-500/10 border-purple-500/35 text-purple-300'
                        : 'bg-zinc-900/90 border-zinc-800 text-zinc-300'
                    }`}
                  >
                    {report.scanType}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-[#0A0A0A]/90 border border-zinc-800/80 text-zinc-400 ${jetBrainsMono.className}`}
                  >
                    <Terminal className="w-3 h-3 text-zinc-500" />
                    {report.scanId}
                  </span>
                </div>

                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight leading-[1.1] text-white">
                  Relatório de Auditoria.
                </h1>

                <p className="text-sm sm:text-base text-zinc-400 max-w-2xl leading-relaxed">
                  Diagnóstico consolidado de superfície exposta, serviços ativos e vulnerabilidades detectadas para{' '}
                  <span className={`text-zinc-200 font-medium ${jetBrainsMono.className}`}>
                    {report.target}
                  </span>
                  .
                </p>
              </div>

              {/* Botões de Ação */}
              <div className="no-print flex flex-wrap items-center gap-3 self-start lg:self-auto">
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 text-sm font-medium text-zinc-300 hover:text-white bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 px-4 py-2.5 rounded-full transition-colors"
                >
                  <ArrowLeft className="w-4 h-4 text-zinc-400" />
                  Novo Scan
                </Link>
                <button
                  type="button"
                  onClick={handleExportJson}
                  className="inline-flex items-center gap-2 text-sm font-medium text-zinc-200 bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 px-5 py-2.5 rounded-full transition-colors cursor-pointer"
                >
                  <FileJson className="w-4 h-4 text-purple-400" />
                  Baixar JSON
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[#030303] bg-white hover:bg-zinc-200 px-6 py-2.5 rounded-full transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  Exportar PDF
                </button>
              </div>
            </motion.div>

            {/* Barra de Metadados */}
            <motion.div
              variants={itemVariants}
              className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-zinc-400"
            >
              <span className="inline-flex items-center gap-2 bg-[#0A0A0A]/90 backdrop-blur-2xl border border-zinc-800/80 px-4 py-2 rounded-full">
                <Globe className="w-3.5 h-3.5 text-purple-400" />
                <span className={`text-white font-medium ${jetBrainsMono.className}`}>
                  {report.target}
                </span>
              </span>
              <span className="inline-flex items-center gap-2 bg-[#0A0A0A]/90 backdrop-blur-2xl border border-zinc-800/80 px-4 py-2 rounded-full">
                <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                <span>{report.date}</span>
              </span>
              <span className="inline-flex items-center gap-2 bg-[#0A0A0A]/90 backdrop-blur-2xl border border-zinc-800/80 px-4 py-2 rounded-full">
                <Clock className="w-3.5 h-3.5 text-zinc-500" />
                <span className={jetBrainsMono.className}>{report.duration}</span>
              </span>
              <span className="inline-flex items-center gap-2 bg-[#0A0A0A]/90 backdrop-blur-2xl border border-zinc-800/80 px-4 py-2 rounded-full">
                <Activity className="w-3.5 h-3.5 text-purple-400" />
                <span>{report.findings.length} registro(s) analisado(s)</span>
              </span>
            </motion.div>
          </motion.div>
        </header>
      </section>

      {/* Corpo Principal (#050505) */}
      <main className="relative z-10 flex-1 w-full px-4 sm:px-8 lg:px-[140px] xl:px-[200px] 2xl:px-[224px] pt-12 pb-28">
        <motion.div
          className="w-full max-w-[1800px] mx-auto flex flex-col gap-8"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Bento Row: Preview da Aplicação (7/12) + Security Score (5/12) */}
          <motion.div
            variants={itemVariants}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full"
          >
            {/* Card Esquerdo: Janela do Alvo + Imagem Shodan + Telemetria de Infraestrutura */}
            <div className="lg:col-span-7 xl:col-span-8 bg-[#0A0A0A]/90 border border-zinc-800/80 hover:border-zinc-700/80 rounded-3xl overflow-hidden flex flex-col transition-colors">
              {/* Top Bar Estilo Browser (espelhando AuditReportVisual) */}
              <div className="h-12 w-full border-b border-zinc-800/80 bg-[#070707] flex items-center justify-between px-5 gap-3 shrink-0">
                <div
                  className={`bg-[#050505] border border-zinc-800/90 rounded-full px-4 py-1 text-xs text-zinc-300 flex items-center gap-2 max-w-[80%] truncate ${jetBrainsMono.className}`}
                >
                  <Lock className="w-3 h-3 text-purple-400 shrink-0" />
                  <span className="truncate">https://{report.target}</span>
                </div>

                <div className="hidden sm:flex items-center text-[11px] font-medium text-zinc-400">
                  <span className={jetBrainsMono.className}>
                    HTTP {report.httpInfo.statusCode || 200}
                  </span>
                </div>
              </div>

              {/* Imagem do Site (estilo Shodan Host Screenshot) */}
              <div className="relative w-full h-56 sm:h-72 md:h-80 bg-[#060606] border-b border-zinc-800/80 overflow-hidden flex items-center justify-center">
                {!screenshotError && screenshotTargetUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={`/api/screenshot?target=${encodeURIComponent(screenshotTargetUrl)}`}
                    alt={`Screenshot do site ${report.target}`}
                    className="w-full h-full object-cover object-top transition-all duration-500"
                    onError={() => setScreenshotError(true)}
                  />
                ) : (
                  <div className="flex items-center justify-center p-6">
                    <Globe className="w-10 h-10 text-zinc-700/60" />
                  </div>
                )}
              </div>

              {/* Conteúdo de Reconhecimento */}
              <div className="flex-1 p-6 md:p-8 flex flex-col justify-between gap-7 relative">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500 mb-2 block">
                      Infraestrutura &amp; Fingerprinting
                    </span>
                    <h2 className="text-xl md:text-2xl font-semibold text-white tracking-tight">
                      {report.httpInfo.title || report.target}
                    </h2>
                  </div>

                  {/* Status das Ferramentas no Pipeline */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {(
                      [
                        { key: 'httpx', label: 'HTTPX', active: report.toolsStatus.httpx },
                        { key: 'nmap', label: 'Nmap', active: report.toolsStatus.nmap },
                        { key: 'ffuf', label: 'FFUF', active: report.toolsStatus.ffuf },
                        {
                          key: 'nuclei',
                          label: 'Nuclei',
                          active: report.toolsStatus.nuclei,
                          deepOnly: !report.isDeepScan,
                        },
                      ] as const
                    ).map((tool) => (
                      <span
                        key={tool.key}
                        className={`text-[11px] font-medium px-2.5 py-1 rounded-full border ${
                          tool.active
                            ? 'bg-zinc-800 border-zinc-700 text-zinc-100'
                            : 'bg-zinc-900/70 border-zinc-800 text-zinc-500'
                        }`}
                      >
                        {tool.label}
                      </span>
                    ))}
                  </div>
                </div>

                {/* 4 Blocos de Métricas Hairline */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                  <div className="bg-[#050505] border border-zinc-800/80 rounded-2xl p-4 flex flex-col justify-between gap-2">
                    <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">
                      Status HTTP
                    </span>
                    <div
                      className={`text-base font-semibold text-white ${jetBrainsMono.className}`}
                    >
                      {report.httpInfo.statusCode || 200}
                    </div>
                  </div>

                  <div className="bg-[#050505] border border-zinc-800/80 rounded-2xl p-4 flex flex-col justify-between gap-2">
                    <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">
                      IP do Host
                    </span>
                    <div
                      className={`text-sm sm:text-base font-semibold text-white truncate ${jetBrainsMono.className}`}
                      title={report.httpInfo.ip || 'Resolvido via DNS'}
                    >
                      {report.httpInfo.ip || 'Via DNS'}
                    </div>
                  </div>

                  <div className="bg-[#050505] border border-zinc-800/80 rounded-2xl p-4 flex flex-col justify-between gap-2">
                    <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">
                      Web Server
                    </span>
                    <div
                      className={`text-sm sm:text-base font-semibold text-white truncate ${jetBrainsMono.className}`}
                      title={report.httpInfo.server || 'Não informado'}
                    >
                      {report.httpInfo.server || 'Padrão'}
                    </div>
                  </div>

                  <div className="bg-[#050505] border border-zinc-800/80 rounded-2xl p-4 flex flex-col justify-between gap-2">
                    <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">
                      Superfície
                    </span>
                    <div className={`text-sm sm:text-base font-semibold text-white ${jetBrainsMono.className}`}>
                      {report.stats.openPorts}p · {report.stats.discoveredRoutes}r
                    </div>
                  </div>
                </div>

                {/* Stack de Tecnologias */}
                <div className="pt-2 border-t border-zinc-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <span className="text-[11px] text-zinc-500 uppercase tracking-widest font-semibold shrink-0">
                    Stack &amp; Protocolos
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {report.httpInfo.technologies.length > 0 ? (
                      report.httpInfo.technologies.map((tech, idx) => (
                        <span
                          key={idx}
                          className={`px-3 py-1 bg-[#050505] border border-zinc-800 rounded-lg text-xs font-medium text-zinc-300 ${jetBrainsMono.className}`}
                        >
                          {tech}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-zinc-500">
                        Nenhuma assinatura tecnológica adicional reportada pelo HTTPX.
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Card Direito: Security Score & Severidades (espelhando AuditReportVisual Module 2) */}
            <div className="lg:col-span-5 xl:col-span-4 bg-[#0A0A0A]/90 border border-zinc-800/80 hover:border-zinc-700/80 rounded-3xl p-6 md:p-7 flex flex-col justify-between gap-6 transition-colors relative overflow-hidden">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-[11px] font-semibold text-zinc-400 uppercase tracking-widest">
                  Indicador de Segurança
                </h2>
                <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${scoreTone.badge}`}>
                  {report.riskLevel}
                </span>
              </div>

              {/* Gauge Circular */}
              <div className="flex flex-col items-center justify-center py-2">
                <div className="relative flex items-center justify-center">
                  <div
                    className={`absolute inset-0 ${scoreTone.glow} blur-2xl rounded-full scale-110`}
                  />
                  <svg className="w-36 h-36 transform -rotate-90 relative z-10">
                    <circle
                      cx="72"
                      cy="72"
                      r="62"
                      stroke="currentColor"
                      strokeWidth="6"
                      fill="transparent"
                      className="text-zinc-900"
                    />
                    <motion.circle
                      cx="72"
                      cy="72"
                      r="62"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      strokeDasharray={circleCircumference}
                      strokeDashoffset={circleCircumference}
                      className={scoreTone.stroke}
                      strokeLinecap="round"
                      animate={{
                        strokeDashoffset:
                          circleCircumference - (circleCircumference * report.score) / 100,
                      }}
                      transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center flex-col z-20">
                    <span className={`text-4xl font-bold text-white ${jetBrainsMono.className}`}>
                      {report.score}
                    </span>
                    <span className={`text-[10px] text-zinc-500 ${jetBrainsMono.className}`}>
                      / 100
                    </span>
                  </div>
                </div>
              </div>

              {/* Distribuição por Severidade */}
              <div className="flex flex-col gap-3 pt-2 border-t border-zinc-800/60">
                {severityBars.map((item) => {
                  const pct = Math.min(100, Math.round((item.count / totalSeverityItems) * 100));
                  return (
                    <div key={item.label} className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-400 font-medium">{item.label}</span>
                        <span className={`font-semibold ${item.text} ${jetBrainsMono.className}`}>
                          {item.count}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: item.count > 0 ? `${Math.max(8, pct)}%` : '0%' }}
                          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
                          className={`h-full rounded-full ${item.color}`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>

          {/* Console de Achados e Vulnerabilidades */}
          <motion.div
            variants={itemVariants}
            className="w-full bg-[#0A0A0A]/90 border border-zinc-800/80 rounded-3xl overflow-hidden"
          >
            {/* Header & Filtros */}
            <div className="px-6 md:px-8 py-6 flex flex-col gap-5 border-b border-zinc-800/80 bg-[#070707]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => setIsTableExpanded(!isTableExpanded)}
                  className="flex items-center gap-3 text-left cursor-pointer group w-fit"
                >
                  <h3 className="text-xl font-semibold text-white group-hover:text-zinc-200 transition-colors">
                    Achados das Ferramentas
                  </h3>
                  
                  {isTableExpanded ? (
                    <ChevronUp className="w-5 h-5 text-zinc-500 group-hover:text-white transition-colors" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-zinc-500 group-hover:text-white transition-colors" />
                  )}
                </button>

                {/* Busca Textual */}
                <div className="no-print relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar endpoint, porta ou CVE..."
                    className={`w-full bg-[#050505] border border-zinc-800 focus:border-zinc-500 rounded-full pl-9 pr-8 py-2 text-xs text-white placeholder:text-zinc-500 focus:outline-none transition-colors ${jetBrainsMono.className}`}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      aria-label="Limpar busca"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Pílulas de Filtro (Ferramenta + Severidade) */}
              <div className="no-print flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold flex items-center gap-1.5 mr-1">
                    <Filter className="w-3.5 h-3.5" />
                    Ferramenta:
                  </span>
                  {['all', 'Nuclei', 'Nmap', 'FFUF', 'HTTPX'].map((tool) => (
                    <button
                      key={tool}
                      type="button"
                      onClick={() => setFilterTool(tool)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-colors cursor-pointer flex items-center gap-1.5 ${
                        filterTool.toLowerCase() === tool.toLowerCase()
                          ? 'bg-white text-black border-white font-semibold'
                          : 'bg-[#050505] text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-zinc-200'
                      }`}
                    >
                      <span>{tool === 'all' ? 'Todas' : tool}</span>
                      <span className={`text-[10px] opacity-70 ${jetBrainsMono.className}`}>
                        {toolCounts[tool] ?? 0}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold mr-1">
                    Risco:
                  </span>
                  {['all', 'Crítico', 'Alto', 'Médio', 'Baixo/Info'].map((sev) => (
                    <button
                      key={sev}
                      type="button"
                      onClick={() => setFilterSeverity(sev)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-colors cursor-pointer ${
                        filterSeverity === sev
                          ? 'bg-white text-black border-white font-semibold'
                          : 'bg-[#050505] text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-zinc-200'
                      }`}
                    >
                      {sev === 'all' ? 'Todos' : sev}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <AnimatePresence>
              {isTableExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <div className="w-full text-left text-sm text-zinc-400">
                    {/* Cabeçalho de Colunas Desktop */}
                    <div className="hidden md:grid grid-cols-12 px-8 py-3.5 text-[11px] text-zinc-500 uppercase tracking-wider font-semibold border-b border-zinc-800/60 bg-[#050505]">
                      <div className="col-span-2">Severidade</div>
                      <div className="col-span-2">Ferramenta</div>
                      <div className="col-span-4">Identificação / Achado</div>
                      <div className="col-span-3">Endpoint / Alvo</div>
                      <div className="col-span-1 text-right">Detalhes</div>
                    </div>

                    <div className="divide-y divide-zinc-800/50">
                      {filteredFindings.length > 0 ? (
                        filteredFindings.map((vuln) => {
                          const isExpanded = expandedRow === vuln.id;
                          const isReviewed = Boolean(reviewedIds[vuln.id]);
                          return (
                            <div key={vuln.id} className="flex flex-col">
                              {/* Linha Principal (Responsiva: Stack no Mobile / 12-col Grid no Desktop) */}
                              <div
                                role="button"
                                tabIndex={0}
                                onClick={() => toggleRow(vuln.id)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    toggleRow(vuln.id);
                                  }
                                }}
                                className={`flex flex-col md:grid md:grid-cols-12 px-5 sm:px-6 md:px-8 py-4 gap-3 md:gap-2 items-start md:items-center cursor-pointer transition-colors ${
                                  isExpanded
                                    ? 'bg-zinc-900/50'
                                    : 'hover:bg-zinc-900/35'
                                } ${isReviewed ? 'opacity-65' : ''}`}
                              >
                                {/* Severidade */}
                                <div className="md:col-span-2 flex items-center gap-2">
                                  <span
                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getSeverityBadge(
                                      vuln.severity
                                    )}`}
                                  >
                                    {vuln.severity}
                                  </span>
                                  {/* Badge da ferramenta no mobile */}
                                  <span
                                    className={`md:hidden inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${getToolBadge(
                                      vuln.tool
                                    )}`}
                                  >
                                    {vuln.tool}
                                  </span>
                                </div>

                                {/* Ferramenta Desktop */}
                                <div className="hidden md:flex md:col-span-2 items-center">
                                  <span
                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold border ${getToolBadge(
                                      vuln.tool
                                    )}`}
                                  >
                                    {vuln.tool}
                                  </span>
                                </div>

                                {/* Título e ID */}
                                <div className="w-full md:col-span-4 pr-2 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-zinc-100 truncate">
                                      {vuln.title}
                                    </span>
                                    {isReviewed && (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full shrink-0">
                                        <Check className="w-2.5 h-2.5" />
                                        Revisado
                                      </span>
                                    )}
                                  </div>
                                  <div
                                    className={`text-[11px] text-zinc-500 mt-0.5 ${jetBrainsMono.className}`}
                                  >
                                    {vuln.id}
                                  </div>
                                </div>

                                {/* Endpoint */}
                                <div className="w-full md:col-span-3 pr-2 min-w-0">
                                  <code
                                    className={`bg-[#050505] border border-zinc-800/90 text-zinc-300 px-2.5 py-1 rounded-lg text-xs truncate block max-w-full ${jetBrainsMono.className}`}
                                  >
                                    {vuln.endpoint}
                                  </code>
                                </div>

                                {/* Chevron */}
                                <div className="hidden md:flex md:col-span-1 justify-end items-center">
                                  <ChevronDown
                                    className={`w-4 h-4 text-zinc-500 transform transition-transform duration-300 ${
                                      isExpanded ? 'rotate-180 text-purple-400' : ''
                                    }`}
                                  />
                                </div>
                              </div>

                              {/* Gaveta de Detalhes Expandida */}
                              <AnimatePresence>
                                {isExpanded && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.22 }}
                                    className="overflow-hidden bg-[#050505] border-t border-zinc-800/50"
                                  >
                                    <div className="px-5 sm:px-6 md:px-8 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
                                      <div className="lg:col-span-8 flex flex-col gap-5">
                                        <div>
                                          <h4 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                                            <Layers className="w-3.5 h-3.5 text-purple-400" />
                                            Evidência Técnica
                                          </h4>
                                          <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-line">
                                            {vuln.details}
                                          </p>
                                        </div>

                                        <div className="bg-purple-500/[0.06] border border-purple-500/20 rounded-2xl p-4">
                                          <h4 className="text-[11px] font-semibold text-purple-300 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                                            <Wrench className="w-3.5 h-3.5 text-purple-400" />
                                            Recomendação de Mitigação
                                          </h4>
                                          <p className="text-sm text-zinc-300 leading-relaxed">
                                            {vuln.recommendation}
                                          </p>
                                        </div>
                                      </div>

                                      <div className="lg:col-span-4 flex flex-col justify-between gap-4 bg-[#0A0A0A] border border-zinc-800/80 rounded-2xl p-4">
                                        <div className="flex flex-col gap-3 text-xs">
                                          <div className="flex items-center justify-between border-b border-zinc-800/60 pb-2">
                                            <span className="text-zinc-500">Origem</span>
                                            <span className="font-semibold text-white">
                                              {vuln.tool}
                                            </span>
                                          </div>
                                          <div className="flex items-center justify-between border-b border-zinc-800/60 pb-2">
                                            <span className="text-zinc-500">Status</span>
                                            <span className="font-semibold text-zinc-200">
                                              {isReviewed ? 'Revisado' : vuln.status}
                                            </span>
                                          </div>
                                          <div className="flex flex-col gap-1">
                                            <span className="text-zinc-500">Alvo / Endpoint</span>
                                            <code
                                              className={`text-zinc-300 break-all bg-[#050505] border border-zinc-800 px-2.5 py-1.5 rounded-lg ${jetBrainsMono.className}`}
                                            >
                                              {vuln.endpoint}
                                            </code>
                                          </div>
                                        </div>

                                        <div className="no-print flex flex-wrap gap-2 pt-2">
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleCopyEndpoint(vuln.id, vuln.endpoint)
                                            }
                                            className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-medium bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 px-3 py-2 rounded-xl transition-colors cursor-pointer"
                                          >
                                            {copiedId === vuln.id ? (
                                              <>
                                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                                Copiado
                                              </>
                                            ) : (
                                              <>
                                                <Copy className="w-3.5 h-3.5 text-zinc-400" />
                                                Copiar
                                              </>
                                            )}
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => toggleReviewed(vuln.id)}
                                            className={`flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border transition-colors cursor-pointer ${
                                              isReviewed
                                                ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-300'
                                                : 'bg-white hover:bg-zinc-200 border-white text-[#030303]'
                                            }`}
                                          >
                                            <Check className="w-3.5 h-3.5" />
                                            {isReviewed ? 'Revisado' : 'Marcar Revisado'}
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })
                      ) : (
                        <div className="px-8 py-14 text-center flex flex-col items-center gap-3 text-zinc-500">
                          <ShieldAlert className="w-8 h-8 text-zinc-700" />
                          <p className="text-sm text-zinc-400">
                            Nenhum achado corresponde aos filtros aplicados.
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setFilterTool('all');
                              setFilterSeverity('all');
                              setSearchQuery('');
                            }}
                            className="text-xs font-semibold text-purple-400 hover:text-purple-300 underline underline-offset-4 cursor-pointer"
                          >
                            Limpar filtros
                          </button>
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

      <div className="no-print">
        <Footer />
      </div>
    </motion.div>
  );
}
