export function Navbar() {
  return (
    <nav className="w-full relative z-50">
      {/* Max-width aumentado (max-w-7xl) e padding ajustado para distribuir os elementos nos cantos */}
      <div className="w-full max-w-7xl mx-auto px-8 md:px-12 h-24 flex items-center justify-between">
        
        {/* Logo alinhada à esquerda */}
        <div className="font-semibold text-xl tracking-tight text-white z-10 flex items-center gap-3">
          <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-[#030303]" />
          </div>
          VulnScan
        </div>
        
        {/* Links alinhados à direita (Entrar removido) */}
        <div className="hidden md:flex items-center gap-12 text-sm font-medium text-zinc-500">
          <a href="#" className="hover:text-white transition-colors">Início</a>
          <a href="#" className="hover:text-white transition-colors">Integração</a>
          <a href="#" className="hover:text-white transition-colors">Docs</a>
        </div>
        
      </div>
    </nav>
  );
}
