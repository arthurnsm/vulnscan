"use client";

import React, { useEffect, useRef, useState } from "react";
import { HL } from "./hairlineKernel";
import { jetBrainsMono } from "../app/fonts";

const N = 5;
const STEP_XY = 19;
const STEP_Z = 12;
const THICK = 8;
const LIFT = 13;
const W_OUT = 136;
const W_MID = 114;
const D = 26;
const LABELS = ["00 · url", "01 · nmap", "02 · ffuf", "03 · httpx", "04 · report"];
const TOUR_STOPS: ([number, number] | null)[] = [
  [200, 74],
  [200, 108],
  [200, 144],
  [200, 180],
  [200, 218],
  null,
];

function spec(i: number) {
  const outer = i === 0 || i === N - 1;
  const w = outer ? W_OUT : W_MID;
  const cx = i * STEP_XY;
  const cy = i * STEP_XY;
  const x0 = cx - D / 2;
  const x1 = cx + D / 2;
  const y0 = cy - w / 2;
  const y1 = cy + w / 2;
  const zRest = (N - 1 - i) * STEP_Z + (i === 0 ? 3 : i === N - 1 ? 0 : 1.5);
  return { i, outer, w, cx, cy, x0, x1, y0, y1, zRest };
}

export function SequentialPipelineVisual() {
  const stageRef = useRef<HTMLDivElement>(null);
  const [readout, setReadout] = useState<string>("rest");

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const {
      Cam,
      facing,
      fit,
      open,
      prism,
      proj,
      ringAt,
      rings,
      run,
      seg,
      tdone,
      tset,
      tval,
      tween,
      unproj,
      disposer,
      flatDot,
      mk,
      place,
      pointer,
      put,
      reflect,
      register,
      solid,
      inject,
      tour,
    } = HL as any;

    inject(document);
    stage.replaceChildren();

    const svg = mk("svg", { viewBox: "0 0 400 320", "aria-hidden": "true" }, stage);
    const bag = disposer();
    let stag = 45;

    const items: ReturnType<typeof spec>[] = [];
    for (let i = 0; i < N; i++) items.push(spec(i));

    const C = Cam(45, 0.5, 1.44);
    const bounds: [number, number, number][] = [];
    for (const s of items) {
      bounds.push(
        [s.x0 - 4, s.y0 - 4, -8],
        [s.x1 + 4, s.y1 + 4, s.zRest + THICK + LIFT]
      );
    }
    fit(C, bounds, 200, 174);
    const P = proj(C);
    const front = facing(C);

    const g = mk("g", {}, svg);

    // Reflexo sob a bandeja coletora final (Relatório)
    const last = items[N - 1];
    const [lastRing] = rings(last.x0, last.y0, last.x1, last.y1, 4.5, 1.6);
    reflect(svg, g, P, front, lastRing, last.zRest, 12);

    // Guias tracejadas verticais de cascata atrás dos sólidos (Rule 06)
    const guides: SVGPathElement[] = [];
    for (let i = 0; i < N - 1; i++) {
      guides.push(mk("path", { class: "nf dash" }, g));
    }

    // Construção back-to-front dos 5 estágios em cascata
    const trays = items.map((s, i) => {
      const grp = mk("g", {}, g);
      const body = solid(grp);
      const slot = mk("path", { class: "nf lo" }, grp);
      const lineA = mk("path", { class: "nf lo" }, grp);
      const lineB = mk("path", { class: "nf lo" }, grp);
      const dots: SVGElement[] = [];
      for (let k = 0; k < N; k++) {
        dots.push(flatDot(grp, C, 0.72, k === i ? "dot m" : "dot off"));
      }
      return {
        ...s,
        grp,
        body,
        slot,
        lineA,
        lineB,
        dots,
        z: tween(s.zRest),
        slide: tween(0),
        drawnZ: NaN,
        drawnS: NaN,
      };
    });

    function drawTray(t: (typeof trays)[number], z0: number, slide: number) {
      if (z0 === t.drawnZ && slide === t.drawnS) return;
      t.drawnZ = z0;
      t.drawnS = slide;
      const z1 = z0 + THICK;
      const x0 = t.x0 + slide;
      const x1 = t.x1 + slide;
      const y0 = t.y0 + slide;
      const y1 = t.y1 + slide;
      const cx = t.cx + slide;
      const cy = t.cy + slide;

      const [ring, inner] = rings(x0, y0, x1, y1, 4.5, 1.6);
      put(t.body, prism(P, front, ring, inner, z0, z1));

      const [sRing] = rings(
        cx - 5,
        cy - t.w * 0.36,
        cx + 5,
        cy - t.w * 0.14,
        1.6,
        0.6
      );
      t.slot.setAttribute("d", open(ringAt(P, run(sRing, front), z1)));
      t.lineA.setAttribute(
        "d",
        seg(P(cx - 2.8, cy - t.w * 0.04, z1), P(cx - 2.8, cy + t.w * 0.36, z1))
      );
      t.lineB.setAttribute(
        "d",
        seg(P(cx + 2.8, cy - t.w * 0.04, z1), P(cx + 2.8, cy + t.w * 0.25, z1))
      );

      for (let k = 0; k < N; k++) {
        const dy = -t.w * 0.36 + k * 4.6;
        place(t.dots[k], P(cx + 7.2, cy + dy, z1));
      }
    }

    function drawGuides() {
      for (let i = 0; i < N - 1; i++) {
        const a = trays[i];
        const b = trays[i + 1];
        const ax = a.cx + a.drawnS + D * 0.42;
        const ay = a.cy + a.drawnS;
        const bx = b.cx + b.drawnS - D * 0.15;
        const by = b.cy + b.drawnS;
        const p0 = P(ax, ay, a.drawnZ + THICK * 0.5);
        const p1 = P(ax, ay, b.drawnZ + THICK + 3);
        const p2 = P(bx, by, b.drawnZ + THICK);
        guides[i].setAttribute("d", seg(p0, p1) + seg(p1, p2));
      }
    }

    let act = -1;
    function applyHighlight() {
      const hiIdx = act >= 0 ? act : N - 1;
      trays.forEach((t, i) => {
        const isHi = i === hiIdx;
        t.body.sil.classList.toggle("hi", isHi);
        t.lineA.classList.toggle("hi", isHi);
        t.lineA.classList.toggle("lo", !isHi);
        t.dots[i].setAttribute("class", isHi ? "dot" : "dot m");
      });
    }

    applyHighlight();

    const B = register(stage, (_dt: number, now: number) => {
      let moving = false;
      for (const t of trays) {
        const z = tval(t.z, now);
        const s = tval(t.slide, now);
        drawTray(t, z, s);
        if (!tdone(t.z, now) || !tdone(t.slide, now)) moving = true;
      }
      drawGuides();
      return moving;
    });
    bag.add(B.unregister);

    // Rule 01: Hit test estático na pose de repouso de cada estágio
    function hit([sx, sy]: [number, number]) {
      let best = -1;
      let bestDist = 1e9;
      for (let i = 0; i < N; i++) {
        const t = trays[i];
        const [wx, wy] = unproj(C, sx, sy, t.zRest + THICK);
        const dx = Math.abs(wx - t.cx) / (D * 0.65);
        const dy = Math.abs(wy - t.cy) / (t.w * 0.54);
        const d = Math.max(dx, dy);
        if (d <= 1 && d < bestDist) {
          bestDist = d;
          best = i;
        }
      }
      return best;
    }

    function setActive(a: number) {
      if (a === act) return;
      const now = performance.now();
      const from = a >= 0 ? a : act;
      act = a;
      trays.forEach((t, i) => {
        const delay = Math.abs(i - from) * stag;
        const zTarget =
          a < 0
            ? t.zRest
            : i === a
            ? t.zRest + LIFT
            : i < a
            ? t.zRest + 3
            : t.zRest - 3;
        const sTarget = a < 0 ? 0 : i < a ? -2.2 : i > a ? 2.2 : 0;
        tset(t.z, zTarget, now, delay);
        tset(t.slide, sTarget, now, delay);
      });
      applyHighlight();
      setReadout(a < 0 ? "rest" : LABELS[a]);
      B.wake();
    }

    bag.add(
      pointer(stage, {
        move: (p: [number, number]) => setActive(hit(p)),
        leave: () => setActive(-1),
      })
    );

    // Tour automático enquanto visível (cede imediatamente ao ponteiro real)
    const tourHandle = tour(stage, TOUR_STOPS);
    bag.add(tourHandle.stop);
    bag.add(() => svg.replaceChildren());

    return () => {
      bag.dispose();
    };
  }, []);

  return (
    <div className="w-full h-full absolute inset-0 bg-[#08090a] flex flex-col justify-between p-6 sm:p-8 overflow-hidden select-none">
      {/* Tags de canto no padrão oficial do bench.html (@lucasmarkes/hairline) */}
      <div
        className={`flex items-center justify-between w-full text-[11px] tracking-[0.02em] z-10 pointer-events-none ${jetBrainsMono.className}`}
      >
        <span className="text-[#8a8c95]">cascade</span>
        <span className="text-[#d0d6e0] tabular-nums">{readout}</span>
      </div>

      {/* Stage SVG Isométrico do Kernel Hairline */}
      <div className="relative flex-1 w-full flex items-center justify-center min-h-0">
        <div
          ref={stageRef}
          data-hairline="cascade"
          data-hairline-theme="dark"
          role="img"
          aria-label="Five stepped scan stages cascade downward; hovering a stage lifts it and parts the flight in turn."
          className="w-full max-w-[520px] cursor-crosshair"
          style={
            {
              "--hairline-plate": "#08090a",
              "--hairline-hi": "#d0d6e0",
              "--hairline-edge": "#5b5d64",
              "--hairline-mid": "#3e3e44",
              "--hairline-lo": "#29292d",
            } as React.CSSProperties
          }
        />
      </div>

      {/* Legenda discreta inferior em estilo bench */}
      <div
        className={`flex flex-wrap items-center justify-between gap-2 w-full text-[11px] text-[#6f6f78] z-10 pointer-events-none ${jetBrainsMono.className}`}
      >
        <span>00 url · 01 nmap · 02 ffuf · 03 httpx · 04 report</span>
        <span>01 hit · 02 order · 04 accent · 08 clock · 09 radius</span>
      </div>
    </div>
  );
}
