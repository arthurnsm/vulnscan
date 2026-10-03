import React from "react";
import { Navbar } from "../../components/Navbar";

export default function DocsPage() {
  return (
    <main className="min-h-screen bg-[#050505] font-sans selection:bg-purple-500/30">
      <Navbar />
      <div className="pt-32 px-6 lg:px-20 max-w-5xl mx-auto flex flex-col gap-12">
        
        <header className="flex flex-col gap-4 border-b border-zinc-800 pb-8">
          <h1 className="text-4xl lg:text-5xl font-bold text-white tracking-tight">Documentação Oficial</h1>
          <p className="text-zinc-400 text-lg">
            Entenda como o nosso pipeline sequencial opera nos bastidores, encadeando varreduras passivas para um mapeamento de superfície perfeito.
          </p>
        </header>

        <section className="flex flex-col gap-6 text-zinc-300 leading-relaxed">
          <h2 className="text-2xl font-semibold text-white">Como Funciona a Varredura</h2>
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

      </div>
    </main>
  );
}
