"use client";

import React, { useEffect, useState } from "react";
import { Navbar } from "../../components/Navbar";

export default function DocsPage() {
  const [activeId, setActiveId] = useState<string>("como-funciona");

  useEffect(() => {
    // Adiciona o smooth scroll ao documento para âncoras
    document.documentElement.style.scrollBehavior = "smooth";

    const handleScroll = () => {
      const headings = Array.from(document.querySelectorAll("section[id]"));
      let currentId = headings[0]?.id;

      for (const heading of headings) {
        const rect = heading.getBoundingClientRect();
        // Ajuste no offset para capturar melhor a seção ao rolar
        if (rect.top <= 250) {
          currentId = heading.id;
        }
      }
      setActiveId(currentId);
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll(); // Trigger initially
    
    return () => {
      window.removeEventListener("scroll", handleScroll);
      // Remove o smooth scroll ao sair da página (boa prática)
      document.documentElement.style.scrollBehavior = "auto";
    };
  }, []);

  return (
    <main className="min-h-screen bg-[#050505] font-sans selection:bg-purple-500/30">
      <Navbar />
      
      <div className="pt-32 px-6 lg:px-8 w-full flex flex-row items-start relative pb-32">
        
        {/* Left Sidebar (Fixa à esquerda) */}
        <div className="hidden lg:flex w-[456px] shrink-0">
          <aside className="flex flex-col gap-4 w-64 fixed top-32 ml-[200px]">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Documentação </span>
            <nav className="flex flex-col border-l border-zinc-800">
              {[
                { id: 'como-funciona', label: 'Como Funciona a análise?' },
                { id: 'instalacao', label: 'Instalando o Agente Local' },
                { id: 'autenticacao', label: 'Autenticação via API' },
                { id: 'relatorios', label: 'Relatórios e Exportação' },
                { id: 'webhooks', label: 'Configurando Webhooks' },
                { id: 'limites', label: 'Limites de Taxa e Quotas' },
              ].map(link => (
                <a
                  key={link.id}
                  href={`#${link.id}`} 
                  onClick={(e) => {
                    e.preventDefault();
                    const element = document.getElementById(link.id);
                    if (element) {
                      const offset = 128; // Espaço para compensar o header fixo (aprox 8rem)
                      const top = element.getBoundingClientRect().top + window.scrollY - offset;
                      window.scrollTo({ top, behavior: 'smooth' });
                      window.history.pushState(null, '', `#${link.id}`);
                    }
                  }}
                  className={`pl-4 py-2 text-sm transition-colors -ml-[1px] border-l ${
                    activeId === link.id 
                      ? "border-purple-700 text-purple-600 font-medium" 
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
              <h1 className="text-4xl lg:text-5xl font-bold text-white tracking-tight">Documentação</h1>
              <div className="text-zinc-400 text-lg flex flex-row items-center gap-1">
                Entenda todo o processo de operação do <span className="text-purple-500 font-medium">VulnScanner</span> por debaixo dos panos.
              </div>
            </header>

            <section className="flex flex-col gap-6 text-zinc-300 leading-relaxed scroll-mt-32" id="como-funciona">
              <h2 className="text-2xl font-semibold text-white">Como Funciona a análise?</h2>
              <p>
                O motor principal não realiza apenas requisições isoladas. Quando uma URL é submetida, o sistema cria uma árvore de tarefas. A primeira etapa é a resolução de DNS e o mapeamento de portas passivas. 
              </p>
              
              <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-lg flex flex-col gap-3">
                <span className="text-purple-400 font-mono text-sm">Fase 1: Reconhecimento</span>
                <p className="text-sm">Executa Nmap (via wrappers seguros) para portas abertas e banners visíveis.</p>
              </div>
              
              <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-lg flex flex-col gap-3">
                <span className="text-pink-400 font-mono text-sm">Fase 2: Fuzzing e Diretórios</span>
                <p className="text-sm">A partir das portas descobertas, iniciamos a descoberta de rotas através de bruteforce leve em caminhos comumente vulneráveis.</p>
              </div>

              <p>
                Toda a telemetria gerada é processada em tempo real para apresentar a pontuação de severidade final que você visualiza no Dashboard.
              </p>
            </section>

            <div className="h-px w-full bg-zinc-800/50" />

            <section className="flex flex-col gap-6 text-zinc-300 leading-relaxed scroll-mt-32" id="instalacao">
              <h2 className="text-2xl font-semibold text-white">Instalando o Agente Local</h2>
              <p>
                Para realizar pentests em infraestruturas internas ou redes privadas, você precisará instalar o nosso Agente Local. Ele funciona como uma ponte segura (tunneling) entre a nossa engine em nuvem e os seus servidores locais.
              </p>
              <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
                <code className="text-sm text-purple-400 font-mono">curl -sL https://vulnscanner.com/install.sh | bash</code>
              </div>
            </section>

            <div className="h-px w-full bg-zinc-800/50" />

            <section className="flex flex-col gap-6 text-zinc-300 leading-relaxed scroll-mt-32" id="autenticacao">
              <h2 className="text-2xl font-semibold text-white">Autenticação via API</h2>
              <p>
                Todas as requisições para a API do VulnScanner devem ser autenticadas através de um Bearer Token. Você pode gerar a sua chave de API diretamente no painel de configurações do usuário.
              </p>
              <p className="text-sm bg-purple-500/10 text-purple-300 p-4 rounded-lg border border-purple-500/20">
                <strong>Atenção:</strong> Nunca exponha a sua chave de API em repositórios públicos. Se a chave for comprometida, revogue-a imediatamente no painel.
              </p>
            </section>

            <div className="h-px w-full bg-zinc-800/50" />

            <section className="flex flex-col gap-6 text-zinc-300 leading-relaxed scroll-mt-32" id="relatorios">
              <h2 className="text-2xl font-semibold text-white">Relatórios e Exportação</h2>
              <p>
                Os dossiês gerados pela plataforma podem ser exportados em múltiplos formatos para facilitar a integração com suas ferramentas de gestão de vulnerabilidades (como Jira, ServiceNow ou repositórios locais).
              </p>
              <ul className="list-disc list-inside flex flex-col gap-2 ml-2">
                <li><strong>PDF Executivo:</strong> Resumo alto nível ideal para stakeholders.</li>
                <li><strong>JSON:</strong> Saída de dados estruturada para ingestão em pipelines CI/CD.</li>
                <li><strong>CSV:</strong> Tabela contendo CVEs, hosts afetados e pontuação CVSS.</li>
              </ul>
            </section>

            <div className="h-px w-full bg-zinc-800/50" />

            <section className="flex flex-col gap-6 text-zinc-300 leading-relaxed scroll-mt-32" id="webhooks">
              <h2 className="text-2xl font-semibold text-white">Configurando Webhooks</h2>
              <p>
                Automatize o seu fluxo de resposta a incidentes recebendo notificações HTTP POST em tempo real assim que uma varredura for concluída ou quando uma vulnerabilidade crítica for descoberta.
              </p>
              <p>
                Para adicionar um webhook, navegue até Configurações &gt; Integrações e insira a URL do seu endpoint. Nós enviaremos um payload contendo o ID do scan e o sumário de descobertas.
              </p>
            </section>

            <div className="h-px w-full bg-zinc-800/50" />

            <section className="flex flex-col gap-6 text-zinc-300 leading-relaxed scroll-mt-32" id="limites">
              <h2 className="text-2xl font-semibold text-white">Limites de Taxa e Quotas</h2>
              <p>
                Para garantir a estabilidade da plataforma para todos os clientes, a nossa API impõe limites de uso (Rate Limiting). O seu plano determina a quantidade de varreduras simultâneas que podem ser executadas.
              </p>
              <div className="flex flex-col gap-2 p-4 border border-zinc-800 rounded-lg bg-zinc-900/50">
                <div className="flex justify-between border-b border-zinc-800 pb-2">
                  <span className="text-zinc-400">Plano Starter</span>
                  <span className="font-mono text-white">10 scans/dia</span>
                </div>
                <div className="flex justify-between border-b border-zinc-800 py-2">
                  <span className="text-zinc-400">Plano Pro</span>
                  <span className="font-mono text-white">100 scans/dia</span>
                </div>
                <div className="flex justify-between pt-2">
                  <span className="text-zinc-400">Plano Enterprise</span>
                  <span className="font-mono text-purple-400">Ilimitado</span>
                </div>
              </div>
            </section>

          </div>
        </div>

        {/* Right Spacer (Equilibra o layout para manter o conteúdo no centro exato da tela) */}
        <div className="hidden lg:block w-[456px] shrink-0" />

      </div>
    </main>
  );
}
