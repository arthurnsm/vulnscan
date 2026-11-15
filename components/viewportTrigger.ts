/**
 * Observa um elemento de palco e dispara quando ele aparece ao rolar a tela ("appear")
 * ou quando atinge um percentual da altura vertical da viewport (ex: 0.3, 0.4),
 * resetando somente após sair totalmente da viewport.
 */
export type ViewportTriggerTarget = "appear" | number;

export function bindViewportTrigger(
  element: HTMLElement,
  onChange: (active: boolean) => void,
  trigger: ViewportTriggerTarget = "appear"
): () => void {
  let active = false;

  const isOutOfViewport = (rect: DOMRect, vh: number) =>
    rect.height > 0 && (rect.bottom <= 0 || rect.top >= vh);

  const hasReachedTrigger = (rect: DOMRect, vh: number) => {
    if (rect.height <= 0 || vh <= 0) return false;

    if (trigger === "appear") {
      // Dispara imediatamente no momento em que o elemento começa a aparecer na tela ao rolar
      return rect.top < vh - 15 && rect.bottom > 15;
    }

    const ratio = typeof trigger === "number" ? trigger : 0.7;
    const elCenter = rect.top + rect.height * 0.5;
    if (elCenter <= vh * ratio && rect.bottom > vh * 0.08) {
      return true;
    }

    const doc = document.documentElement;
    const scrollY = window.scrollY ?? window.pageYOffset ?? doc.scrollTop ?? 0;
    const atPageBottom =
      doc.scrollHeight > vh && scrollY + vh >= doc.scrollHeight - 24;
    return atPageBottom && rect.top < vh * 0.65 && rect.bottom > vh * 0.2;
  };

  const evaluate = () => {
    const rect = element.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight;

    if (isOutOfViewport(rect, vh)) {
      if (active) {
        active = false;
        onChange(false);
      }
      return;
    }

    if (!active && hasReachedTrigger(rect, vh)) {
      active = true;
      onChange(true);
    }
  };

  window.addEventListener("scroll", evaluate, { passive: true });
  window.addEventListener("resize", evaluate, { passive: true });

  let io: IntersectionObserver | null = null;
  if (typeof IntersectionObserver !== "undefined") {
    io = new IntersectionObserver(evaluate, {
      rootMargin: "40px",
      threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.75, 1],
    });
    io.observe(element);
  }

  const initRaf = window.requestAnimationFrame(evaluate);

  return () => {
    window.cancelAnimationFrame(initRaf);
    window.removeEventListener("scroll", evaluate);
    window.removeEventListener("resize", evaluate);
    io?.disconnect();
  };
}
