"use client";

import React, { useEffect, useState } from "react";
import { Navbar } from "../../components/Navbar";
import { Footer } from "../../components/Footer";
import { jakarta, jetBrainsMono } from "../fonts";

interface ToolSpec {
  name: string;
  command: string;
  description: React.ReactNode;
}

const TOPICS = [
  { id: "como-funciona", label: "Como Funciona a Análise" },
  { id: "varredura-rapida", label: "Varredura Rápida" },
  { id: "varredura-profunda", label: "Varredura Profunda" },
  { id: "comparativo", label: "Rápido vs. Profundo" },
  { id: "score-relatorio", label: "Score e Relatório" },
] as const;

const FAST_SCAN_TOOLS: ToolSpec[] = [
  {
    name: "Nmap",
    command: "nmap -T4 -F <alvo>",
    description: (
      <>
        O <span className="text-purple-400 font-medium">-T4</span> acelera a
        execução (modo agressivo) e o{" "}
        <span className="text-purple-400 font-medium">-F</span> varre apenas as{" "}
        <span className="text-purple-400 font-medium">
          100 portas TCP mais comuns
        </span>{" "}
        (ao invés de 1000). No relatório, indica rapidamente se há serviços
        críticos expostos na rede (como HTTP, SSH ou FTP).
      </>
    ),
  },
  {
    name: "HTTPX",
    command: "httpx -u <url> -title -status-code",
    description: (
      <>
        Procura ativamente por servidores web rodando na URL fornecida,
        extraindo o código HTTP com{" "}
        <span className="text-purple-400 font-medium">-status-code</span> e o
        título com <span className="text-purple-400 font-medium">-title</span>.
        No relatório, confirma se a aplicação web está viva e o status da sua
        página principal.
      </>
    ),
  },
  {
    name: "FFUF",
    command: "ffuf -u <url>/FUZZ -w common.txt -t 50 -mc 200,301,403",
    description: (
      <>
        Fuzzing rápido usando uma wordlist pequena (
        <span className="text-purple-400 font-medium">common.txt</span>), com{" "}
        <span className="text-purple-400 font-medium">-t 50</span> (50 threads) e
        filtrando respostas válidas com{" "}
        <span className="text-purple-400 font-medium">-mc 200,301,403</span>. No
        relatório, revela as pastas e rotas principais e públicas da aplicação
        (ex: /admin, /api).
      </>
    ),
  },
];

const DEEP_SCAN_TOOLS: ToolSpec[] = [
  {
    name: "Nmap",
    command: "nmap -T4 -p- -sV -sC <alvo>",
    description: (
      <>
        O <span className="text-purple-400 font-medium">-p-</span> varre todas as{" "}
        <span className="text-purple-400 font-medium">65.535 portas</span>, o{" "}
        <span className="text-purple-400 font-medium">-sV</span> descobre a
        versão exata do software e o{" "}
        <span className="text-purple-400 font-medium">-sC</span> roda scripts de
        segurança. No relatório, entrega a topologia completa, revelando
        serviços escondidos em portas altas e softwares desatualizados.
      </>
    ),
  },
  {
    name: "HTTPX",
    command:
      "httpx -u <url> -title -status-code -tech-detect -follow-redirects -ip -cname",
    description: (
      <>
        Adiciona detecção de tecnologia (
        <span className="text-purple-400 font-medium">-tech-detect</span>), segue
        redirecionamentos (
        <span className="text-purple-400 font-medium">-follow-redirects</span>),
        mapeia infraestrutura (
        <span className="text-purple-400 font-medium">-ip</span>,{" "}
        <span className="text-purple-400 font-medium">-cname</span>) e extrai
        status e título (
        <span className="text-purple-400 font-medium">-status-code</span>,{" "}
        <span className="text-purple-400 font-medium">-title</span>). No
        relatório, revela uso de WAF, frameworks (ex: React, PHP) e para qual
        IP real a aplicação aponta.
      </>
    ),
  },
  {
    name: "FFUF",
    command:
      "ffuf -u <url>/FUZZ -w big_wordlist.txt -t 100 -e .php,.html,.txt,.bak,.env -mc 200,301,403",
    description: (
      <>
        Usa wordlist massiva (
        <span className="text-purple-400 font-medium">big_wordlist.txt</span>),{" "}
        <span className="text-purple-400 font-medium">-t 100</span> (100
        threads), respostas válidas (
        <span className="text-purple-400 font-medium">-mc 200,301,403</span>) e a
        flag{" "}
        <span className="text-purple-400 font-medium">
          -e .php,.html,.txt,.bak,.env
        </span>{" "}
        para buscar extensões específicas (backups, configs). No relatório,
        descobre painéis de controle obscuros e vazamento de dados críticos (ex:
        .env, .bak).
      </>
    ),
  },
  {
    name: "Nuclei",
    command:
      "nuclei -u <url> -t cves/,exposures/ -severity low,medium,high,critical",
    description: (
      <>
        Dispara pacotes com{" "}
        <span className="text-purple-400 font-medium">
          -t cves/,exposures/
        </span>{" "}
        para detectar vulnerabilidades catalogadas (CVEs) e exposições
        estruturadas, filtrando por severidade com{" "}
        <span className="text-purple-400 font-medium">
          -severity low,medium,high,critical
        </span>
        . No relatório, aponta diretamente falhas exploráveis, sendo o principal
        fator de aumento no{" "}
        <span className="text-purple-400 font-medium">
          &quot;Score de Risco&quot;
        </span>
        .
      </>
    ),
  },
  {
    name: "WhatWeb",
    command: "whatweb -a 3 <url>",
    description: (
      <>
        Realiza um fingerprinting agressivo com{" "}
        <span className="text-purple-400 font-medium">-a 3</span> (nível 3)
        injetando requisições para identificar versões de CMS e plugins. No
        relatório, refina a análise do HTTPX, extraindo cabeçalhos profundos e
        bibliotecas vulneráveis.
      </>
    ),
  },
];

function ToolCard({ tool, step }: { tool: ToolSpec; step: number }) {
  return (
    <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-lg flex flex-col gap-4">
      <div className={`text-sm ${jetBrainsMono.className} flex items-center gap-2`}>
        <span className="text-white">Etapa {step}:</span>
        <span className="font-semibold bg-gradient-to-b from-white to-zinc-500 bg-clip-text text-transparent">
          {tool.name}
        </span>
      </div>

      <div className="p-3.5 bg-[#050505] border border-zinc-800/90 rounded-md overflow-x-auto">
        <code
          className={`text-sm text-white ${jetBrainsMono.className} whitespace-nowrap`}
        >
          {tool.command}
        </code>
      </div>

      <div className="flex flex-col gap-1.5 pt-1 text-sm">
        <span className="text-md pb-3 font-bold  tracking-wider text-white">
          O que esse comando faz?
        </span>
        <p className="text-white leading-relaxed">{tool.description}</p>
      </div>
    </div>
  );
}

export default function DocsPage() {
  const [activeId, setActiveId] = useState<string>(TOPICS[0].id);

  useEffect(() => {
    document.documentElement.style.scrollBehavior = "smooth";

    const handleScroll = () => {
      const headings = Array.from(document.querySelectorAll("section[id]"));
      let currentId = headings[0]?.id ?? TOPICS[0].id;

      for (const heading of headings) {
        const rect = heading.getBoundingClientRect();
        if (rect.top <= 250) {
          currentId = heading.id;
        }
      }

      const atBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 24;
      if (atBottom && headings.length > 0) {
        currentId = headings[headings.length - 1].id;
      }

      setActiveId(currentId);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      document.documentElement.style.scrollBehavior = "auto";
    };
  }, []);

  const scrollToTopic = (id: string) => {
    const element = document.getElementById(id);
    if (!element) return;
    const offset = 128;
    const top = element.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: "smooth" });
    window.history.pushState(null, "", `#${id}`);
  };

  return (
    <main
      className={`min-h-screen bg-[#050505] ${jakarta.className} selection:bg-purple-500/30`}
    >
      <Navbar />

      <div className="pt-20 lg:pt-32 px-6 lg:px-8 w-full flex flex-row items-start relative pb-32">
        {/* Left Sidebar (Fixa à esquerda) */}
        <div className="hidden lg:flex w-[456px] shrink-0">
          <aside className="flex flex-col gap-4 w-64 fixed top-32 ml-[200px]">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">
              Documentação
            </span>
            <nav className="flex flex-col border-l border-zinc-800">
              {TOPICS.map((link) => (
                <a
                  key={link.id}
                  href={`#${link.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToTopic(link.id);
                  }}
                  className={`pl-4 py-2 text-sm transition-colors -ml-[1px] border-l ${
                    activeId === link.id
                      ? "border-purple-500 text-purple-400 font-medium"
                      : "border-transparent text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
                  }`}
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </aside>
        </div>

        {/* Main Content (Sempre Centralizado) */}
        <div className="flex-1 flex justify-center">
          <div className="w-full max-w-3xl flex flex-col gap-12">
            <header className="flex flex-col gap-4 border-b border-zinc-800 pb-8">
              <h1 className="text-4xl lg:text-5xl font-bold tracking-tight bg-gradient-to-b from-white to-zinc-500 bg-clip-text text-transparent">
                Documentação
              </h1>
              <p className="text-zinc-400 text-lg leading-relaxed">
                Entenda as ferramentas, flags e o pipeline sequencial executado
                pelo <span className="text-purple-400 font-medium">VulnScan</span>{" "}
                nos modos Rápido e Profundo.
              </p>

              {/* Navegação compacta no mobile */}
              <nav className="flex lg:hidden flex-wrap gap-2 pt-2">
                {TOPICS.map((link) => (
                  <button
                    key={link.id}
                    type="button"
                    onClick={() => scrollToTopic(link.id)}
                    className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                      activeId === link.id
                        ? "border-purple-500/60 bg-purple-500/10 text-purple-300"
                        : "border-zinc-800 bg-zinc-900/60 text-zinc-400"
                    }`}
                  >
                    {link.label}
                  </button>
                ))}
              </nav>
            </header>

            <section
              className="flex flex-col gap-6 text-zinc-300 leading-relaxed scroll-mt-32"
              id="como-funciona"
            >
              <h2 className="text-2xl font-semibold text-white">
                Como Funciona a Análise
              </h2>
              <p>
                Ao submeter uma URL ou endereço de destino na tela inicial, o{" "}
                <span className="text-white font-medium">VulnScan</span>{" "}
                orquestra um pipeline sequencial de ferramentas clássicas de
                pentest. A saída de cada etapa alimenta o próximo vetor de
                inspeção até a consolidação final do relatório.
              </p>
              <p>
                Você pode escolher entre dois perfis de execução diretamente no
                seletor ao lado do campo de busca: a{" "}
                <strong className="text-zinc-100">Varredura Rápida</strong>{" "}
                (para triagem imediata da superfície exposta) e a{" "}
                <strong className="text-purple-300">Varredura Profunda</strong>{" "}
                (auditoria completa de portas, tecnologias, arquivos sensíveis e
                CVEs).
              </p>
            </section>

            <div className="h-px w-full bg-zinc-800/50" />

            <section
              className="flex flex-col gap-6 text-zinc-300 leading-relaxed scroll-mt-32"
              id="varredura-rapida"
            >
              <div className="flex flex-col gap-2">
                <h2 className="text-2xl font-semibold text-white">
                  Varredura Rápida (Fast Scan)
                </h2>
                <p className="text-zinc-400">
                  Fluxo enxuto em 3 etapas projetado para validar rapidamente se
                  a aplicação está acessível, quais portas principais respondem
                  e quais rotas públicas estão expostas.
                </p>
              </div>

              <div className="flex flex-col gap-4">
                {FAST_SCAN_TOOLS.map((tool, index) => (
                  <ToolCard key={tool.name} tool={tool} step={index + 1} />
                ))}
              </div>
            </section>

            <div className="h-px w-full bg-zinc-800/50" />

            <section
              className="flex flex-col gap-6 text-zinc-300 leading-relaxed scroll-mt-32"
              id="varredura-profunda"
            >
              <div className="flex flex-col gap-2">
                <h2 className="text-2xl font-semibold text-white">
                  Varredura Profunda (Deep Scan)
                </h2>
                <p className="text-zinc-400">
                  Fluxo estendido em 5 etapas com enumeração total de portas,
                  identificação de infraestrutura, busca de arquivos críticos,
                  fingerprinting agressivo e varredura de CVEs.
                </p>
              </div>

              <p className="text-sm bg-purple-500/10 text-purple-300 p-4 rounded-lg border border-purple-500/20">
                <strong>Tempo de execução:</strong> Por varrer todas as 65.535
                portas e utilizar wordlists massivas com templates do Nuclei, a
                Varredura Profunda pode levar até 10 minutos para ser finalizada.
              </p>

              <div className="flex flex-col gap-4">
                {DEEP_SCAN_TOOLS.map((tool, index) => (
                  <ToolCard key={tool.name} tool={tool} step={index + 1} />
                ))}
              </div>
            </section>

            <div className="h-px w-full bg-zinc-800/50" />

            <section
              className="flex flex-col gap-6 text-zinc-300 leading-relaxed scroll-mt-32"
              id="comparativo"
            >
              <h2 className="text-2xl font-semibold text-white">
                Rápido vs. Profundo
              </h2>
              <p>
                Compare o escopo de cada perfil para escolher o nível de
                profundidade adequado ao seu objetivo de análise:
              </p>

              <div className="flex flex-col gap-2 p-5 border border-zinc-800 rounded-lg bg-zinc-900/50 text-sm">
                <div className="flex justify-between gap-4 border-b border-zinc-800 pb-3">
                  <span className="text-zinc-400">Portas TCP (Nmap)</span>
                  <span
                    className={`${jetBrainsMono.className} text-white text-right`}
                  >
                    100 comuns (-F) vs. 65.535 (-p- -sV -sC)
                  </span>
                </div>
                <div className="flex justify-between gap-4 border-b border-zinc-800 py-3">
                  <span className="text-zinc-400">HTTP &amp; Infra (HTTPX)</span>
                  <span
                    className={`${jetBrainsMono.className} text-white text-right`}
                  >
                    Status + Título vs. Tech, WAF, IP &amp; CNAME
                  </span>
                </div>
                <div className="flex justify-between gap-4 border-b border-zinc-800 py-3">
                  <span className="text-zinc-400">Fuzzing (FFUF)</span>
                  <span
                    className={`${jetBrainsMono.className} text-white text-right`}
                  >
                    common.txt (50t) vs. big_wordlist + extensões (100t)
                  </span>
                </div>
                <div className="flex justify-between gap-4 pt-2">
                  <span className="text-zinc-400">
                    CVEs &amp; Fingerprinting
                  </span>
                  <span
                    className={`${jetBrainsMono.className} text-purple-400 text-right`}
                  >
                    Exclusivo do Profundo (Nuclei + WhatWeb)
                  </span>
                </div>
              </div>
            </section>

            <div className="h-px w-full bg-zinc-800/50" />

            <section
              className="flex flex-col gap-6 text-zinc-300 leading-relaxed scroll-mt-32"
              id="score-relatorio"
            >
              <h2 className="text-2xl font-semibold text-white">
                Score de Risco e Relatório
              </h2>
              <p>
                Ao término do pipeline, todos os achados são consolidados no
                painel de relatório contendo o preview do alvo, o{" "}
                <strong className="text-white">Score de Risco</strong> e a lista
                detalhada de vulnerabilidades e exposições encontradas:
              </p>
              <ul className="list-disc list-inside flex flex-col gap-2 ml-2 text-zinc-300">
                <li>
                  <strong>Superfície de Rede e Serviços (Nmap):</strong> aponta
                  portas expostas, versões de serviços e scripts de segurança.
                </li>
                <li>
                  <strong>Stack, WAF e Redirecionamentos (HTTPX + WhatWeb):</strong>{" "}
                  identifica IP real, CNAME, frameworks, CMS e plugins.
                </li>
                <li>
                  <strong>Rotas e Arquivos Sensíveis (FFUF):</strong> destaca
                  diretórios ocultos e possíveis vazamentos como{" "}
                  <code className={jetBrainsMono.className}>.env</code> e{" "}
                  <code className={jetBrainsMono.className}>.bak</code>.
                </li>
                <li>
                  <strong>CVEs e Severidades (Nuclei):</strong> classifica
                  falhas exploráveis em{" "}
                  <span className="text-zinc-100">
                    low, medium, high e critical
                  </span>
                  , compondo o peso principal do Score de Risco.
                </li>
              </ul>
            </section>
          </div>
        </div>

        {/* Right Spacer (Equilibra o layout para manter o conteúdo no centro exato da tela) */}
        <div className="hidden lg:block w-[456px] shrink-0" />
      </div>

      <Footer />
    </main>
  );
}
