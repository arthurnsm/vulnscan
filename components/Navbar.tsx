import Link from "next/link";

export function Navbar() {
  return (
    <nav className="w-full relative z-50">
      {/* Container sem limite de largura (max-w) e com padding reduzido para aproximar das bordas */}
      <div className="w-full px-4 md:px-6 h-24 flex items-center relative">
        
        {/* Logo alinhada à esquerda com 200px de margem */}
        <Link href="/" className="ml-[200px] font-semibold text-xl tracking-tight text-white z-10 flex items-center gap-3">
          <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-[#030303]" />
          </div>
          VulnScan
        </Link>

        {/* Links ao centro */}
        <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center gap-12 text-sm font-medium text-zinc-300">
          <a href="/" className="hover:text-white transition-colors">Início</a>
          <a href="#" className="hover:text-white transition-colors">Integração</a>
          <a href="/docs" className="hover:text-white transition-colors">Docs</a>
        </div>
        
      </div>
    </nav>
  );
}
