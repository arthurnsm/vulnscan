import Link from "next/link";
import { jakarta, jetBrainsMono } from "../app/fonts";

export function Footer() {
  return (
    <footer
      className={`w-full relative z-20 bg-[#030303] border-t border-zinc-800/80 text-zinc-400 ${jakarta.className}`}
    >
      <div className="w-full px-4 md:px-[200px] lg:px-[224px] py-12 flex flex-col gap-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          {/* Identidade da Marca */}
          <div className="flex flex-col gap-2">
            <Link
              href="/"
              className="font-semibold text-xl tracking-tight text-white flex items-center gap-3 w-fit"
            >
              <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-[#030303]" />
              </div>
              <span className="bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-transparent">
                VulnScan
              </span>
            </Link>
            <p className="text-sm text-zinc-500 max-w-sm">
              Diagnóstico de segurança e orquestração sequencial de ferramentas
              de pentest em minutos.
            </p>
          </div>

          {/* Links de Navegação */}
          <nav className="flex flex-wrap items-center gap-8 text-sm font-medium text-zinc-400">
            <Link href="/" className="hover:text-white transition-colors">
              Início
            </Link>
            <Link href="/docs" className="hover:text-white transition-colors">
              Documentação
            </Link>
            <Link href="/report" className="hover:text-white transition-colors">
              Relatório
            </Link>
            <a
              href="https://github.com/arthurnsm/vulnscan"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              Repositório
            </a>
          </nav>
        </div>

        <div className="h-px w-full bg-zinc-800/60" />

        {/* Créditos ao Criador */}
        
      </div>
    </footer>
  );
}
