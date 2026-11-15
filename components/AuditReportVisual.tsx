"use client";

import React, { useEffect, useRef } from "react";
import { HL } from "./hairlineKernel";
import { bindViewportTrigger } from "./viewportTrigger";

const PAGE_X0 = -8;
const PAGE_Y0 = -15;
const PAGE_X1 = 132;
const PAGE_Y1 = 154;
const PAGE_R = 6.5;
const PAGE_B = 1.6;
const PAGE_THICK = 5.0;

const LIFT = 7.5;
const WAVE = 3.2;
const NEIGHBOR_WAVE = 1.0;
const STAGGER = 115;
const LIFT_DUR = 380;
const GAUGE_DUR = 480;
const TARGET_SCORE = 0.68;
const HOVER_SCORE = 0.75;

type ModuleRole = "header" | "preview" | "score" | "finding";

interface ModuleSpec {
  id: number;
  label: string;
  role: ModuleRole;
  findingIdx: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  cx: number;
  cy: number;
  r: number;
  b: number;
  thick: number;
  zRest: number;
}

function makeModule(
  id: number,
  label: string,
  role: ModuleRole,
  findingIdx: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  r: number,
  b: number,
  thick: number
): ModuleSpec {
  return {
    id,
    label,
    role,
    findingIdx,
    x0,
    y0,
    x1,
    y1,
    cx: (x0 + x1) / 2,
    cy: (y0 + y1) / 2,
    r,
    b,
    thick,
    // Todos os blocos internos repousam apoiados sobre o topo da página web (z = PAGE_THICK)
    zRest: PAGE_THICK,
  };
}

function buildModules(): ModuleSpec[] {
  return [
    // 0: Cabeçalho do relatório (título, metadados, botão PDF)
    makeModule(0, "header", "header", -1, 0, 0, 124, 19, 4.0, 1.2, 4.0),
    // 1: Preview do domínio analisado (janela + globo central)
    makeModule(1, "preview", "preview", -1, 0, 29, 70, 83, 4.5, 1.3, 4.0),
    // 2: Painel de Security Score (gauge 68% + 4 severidades)
    makeModule(2, "score", "score", -1, 77, 29, 124, 83, 4.5, 1.3, 4.2),
    // 3..5: Lista de vulnerabilidades em cascata com separação visível de contorno
    makeModule(3, "finding-0", "finding", 0, 0, 93, 124, 105, 3.4, 1.0, 3.0),
    makeModule(4, "finding-1", "finding", 1, 0, 113, 124, 125, 3.4, 1.0, 2.8),
    makeModule(5, "finding-2", "finding", 2, 0, 133, 124, 145, 3.4, 1.0, 2.6),
  ];
}

export function AuditReportVisual() {
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stageEl = stageRef.current;
    if (!stageEl) return;
    const stage: HTMLDivElement = stageEl;

    const {
      Cam,
      circ,
      clamp,
      facing,
      fit,
      open,
      poly,
      prism,
      proj,
      rad,
      ringAt,
      rings,
      rrect,
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
      register,
      solid,
      inject,
    } = HL as any;

    inject(document);
    stage.replaceChildren();

    const svg = mk(
      "svg",
      { viewBox: "0 0 400 320", "aria-hidden": "true" },
      stage
    );
    const bag = disposer();
    const specs = buildModules();

    const C = Cam(45, 0.5, 1.6);
    const bounds: [number, number, number][] = [
      [PAGE_X0, PAGE_Y0, PAGE_THICK],
      [PAGE_X0, PAGE_Y1, 0],
      [PAGE_X1, PAGE_Y0, 0],
      [PAGE_X1, PAGE_Y1, -4],
    ];
    for (const s of specs) {
      bounds.push([s.x0, s.y0, s.zRest + s.thick + LIFT + WAVE]);
    }
    fit(C, bounds, 200, 160);
    const P = proj(C);
    const front = facing(C);

    const g = mk("g", {}, svg);

    // 1. Geometria base da página web externa e contorno inferior limpo (sem linhas verticais sobressalentes)
    const [pageRing, pageInner] = rings(
      PAGE_X0,
      PAGE_Y0,
      PAGE_X1,
      PAGE_Y1,
      PAGE_R,
      PAGE_B
    );
    const pageFrontRim = run(pageRing, front);
    const pageBaseEcho = mk(
      "path",
      {
        class: "nf",
        d: open(ringAt(P, pageFrontRim, -2.2)),
      },
      g
    );

    // 2. Caixa maior envolvendo todos os blocos como uma página web isométrica
    const pageGrp = mk("g", {}, g);
    const pageBody = solid(pageGrp);
    put(pageBody, prism(P, front, pageRing, pageInner, 0, PAGE_THICK));

    const pageDivider = mk("path", { class: "nf lo" }, pageGrp);
    pageDivider.setAttribute(
      "d",
      seg(P(-5, -4.5, PAGE_THICK), P(129, -4.5, PAGE_THICK))
    );
    const pageUrlPill = mk("path", { class: "nf lo" }, pageGrp);
    pageUrlPill.setAttribute(
      "d",
      poly(ringAt(P, rrect(44, -12, 80, -7, 1.8, 3), PAGE_THICK))
    );
    const pageDots: SVGElement[] = [
      flatDot(pageGrp, C, 0.56, "dot"),
      flatDot(pageGrp, C, 0.56, "dot off"),
      flatDot(pageGrp, C, 0.56, "dot off"),
    ];
    place(pageDots[0], P(2.0, -9.5, PAGE_THICK));
    place(pageDots[1], P(6.5, -9.5, PAGE_THICK));
    place(pageDots[2], P(11.0, -9.5, PAGE_THICK));

    interface ModuleRuntime extends ModuleSpec {
      ring: any;
      inner: any;
      body: { g: SVGGElement; sil: SVGPathElement; cr: SVGPathElement };
      details: SVGPathElement[];
      dots: SVGElement[];
      z: any;
      targetZ: number;
      drawnZ: number;
    }

    const modules: ModuleRuntime[] = new Array(specs.length);
    const gaugeTween = tween(0, GAUGE_DUR);
    let targetGauge = 0;
    let drawnGauge = NaN;

    function offsetCircleRing(cx: number, cy: number, radius: number, steps = 32) {
      return circ(radius, steps).map((q: any) => ({
        ...q,
        u: cx + q.u,
        v: cy + q.v,
      }));
    }

    function createModuleElement(s: ModuleSpec): ModuleRuntime {
      const grp = mk("g", {}, g);
      const body = solid(grp);
      const [ring, inner] = rings(s.x0, s.y0, s.x1, s.y1, s.r, s.b);
      const details: SVGPathElement[] = [];
      const dots: SVGElement[] = [];

      if (s.role === "header") {
        for (let k = 0; k < 5; k++) details.push(mk("path", { class: "nf lo" }, grp));
        dots.push(flatDot(grp, C, 0.68, "dot off"));
        dots.push(flatDot(grp, C, 0.6, "dot off"));
      } else if (s.role === "preview") {
        for (let k = 0; k < 4; k++) details.push(mk("path", { class: "nf lo" }, grp));
        for (let k = 0; k < 4; k++) {
          dots.push(flatDot(grp, C, k < 3 ? 0.5 : 0.6, "dot off"));
        }
      } else if (s.role === "score") {
        for (let k = 0; k < 7; k++) details.push(mk("path", { class: "nf lo" }, grp));
        for (let k = 0; k < 5; k++) {
          dots.push(flatDot(grp, C, k === 0 ? 0.62 : 0.5, "dot off"));
        }
      } else {
        for (let k = 0; k < 3; k++) details.push(mk("path", { class: "nf lo" }, grp));
        dots.push(flatDot(grp, C, 0.56, "dot off"));
      }

      return {
        ...s,
        ring,
        inner,
        body,
        details,
        dots,
        z: tween(s.zRest, LIFT_DUR),
        targetZ: s.zRest,
        drawnZ: NaN,
      };
    }

    // 3. Todos os blocos internos pintados estritamente back-to-front sobre a página web
    for (const s of specs) {
      modules[s.id] = createModuleElement(s);
    }

    function drawModuleGeometry(m: ModuleRuntime, z0: number, gaugeP: number) {
      const needGeom = z0 !== m.drawnZ;
      const needGauge = m.role === "score" && gaugeP !== drawnGauge;
      if (!needGeom && !needGauge) return;

      const z1 = z0 + m.thick;
      if (needGeom) {
        m.drawnZ = z0;
        put(m.body, prism(P, front, m.ring, m.inner, z0, z1));

        if (m.role === "header") {
          m.details[0].setAttribute(
            "d",
            poly(ringAt(P, rrect(6, 4.8, 41, 14.2, 2.2, 3), z1))
          );
          m.details[1].setAttribute(
            "d",
            poly(ringAt(P, rrect(46, 5.4, 60, 13.6, 1.8, 3), z1))
          );
          m.details[2].setAttribute(
            "d",
            poly(ringAt(P, rrect(64, 5.4, 78, 13.6, 1.8, 3), z1))
          );
          m.details[3].setAttribute(
            "d",
            poly(ringAt(P, rrect(82, 5.4, 95, 13.6, 1.8, 3), z1))
          );
          m.details[4].setAttribute(
            "d",
            poly(ringAt(P, rrect(101, 4.8, 118.5, 14.2, 2.5, 3), z1))
          );
          place(m.dots[0], P(10, 9.5, z1));
          place(m.dots[1], P(114.5, 9.5, z1));
        } else if (m.role === "preview") {
          m.details[0].setAttribute(
            "d",
            seg(P(3.5, 40.5, z1), P(66.5, 40.5, z1))
          );
          m.details[1].setAttribute(
            "d",
            poly(ringAt(P, rrect(24, 32.0, 59, 37.0, 1.6, 3), z1))
          );
          m.details[2].setAttribute(
            "d",
            poly(ringAt(P, offsetCircleRing(35, 59.5, 9.5, 32), z1))
          );
          const merPts: [number, number][] = [];
          for (let step = 0; step < 24; step++) {
            const a = (step / 24) * Math.PI * 2;
            merPts.push(P(35 + Math.cos(a) * 4.5, 59.5 + Math.sin(a) * 9.5, z1));
          }
          m.details[3].setAttribute(
            "d",
            poly(merPts) +
              seg(P(25.5, 59.5, z1), P(44.5, 59.5, z1)) +
              seg(P(25, 75.0, z1), P(45, 75.0, z1))
          );
          place(m.dots[0], P(8, 34.5, z1));
          place(m.dots[1], P(12.2, 34.5, z1));
          place(m.dots[2], P(16.4, 34.5, z1));
          place(m.dots[3], P(35, 59.5, z1));
        } else if (m.role === "score") {
          const gcx = 93;
          const gcy = 52;
          const rGauge = 9.5;
          m.details[0].setAttribute(
            "d",
            poly(ringAt(P, offsetCircleRing(gcx, gcy, rGauge, 32), z1))
          );
          m.details[2].setAttribute(
            "d",
            poly(ringAt(P, rrect(84.5, 67.5, 101.5, 73.5, 2.0, 3), z1)) +
              seg(P(84.5, 35.5, z1), P(101.5, 35.5, z1))
          );
          const ys = [39.5, 49.5, 59.5, 69.5];
          const widths = [4.0, 5.2, 6.4, 7.6];
          for (let k = 0; k < 4; k++) {
            const yy = ys[k];
            m.details[3 + k].setAttribute(
              "d",
              seg(P(111.5, yy - 1.5, z1), P(111.5 + widths[k], yy - 1.5, z1)) +
                seg(P(111.5, yy + 1.8, z1), P(111.5 + 3.4, yy + 1.8, z1))
            );
            place(m.dots[1 + k], P(108.5, yy, z1));
          }
          place(m.dots[0], P(gcx, gcy, z1));
        } else {
          const k = m.findingIdx;
          const cy = m.cy;
          m.details[0].setAttribute(
            "d",
            seg(P(14, cy, z1), P(64 - k * 9, cy, z1))
          );
          m.details[1].setAttribute(
            "d",
            seg(P(78, cy, z1), P(102 - k * 4, cy, z1))
          );
          m.details[2].setAttribute(
            "d",
            poly(ringAt(P, rrect(109, cy - 2.2, 117, cy + 2.2, 1.2, 2), z1))
          );
          place(m.dots[0], P(8, cy, z1));
        }
      }

      if (m.role === "score" && (needGeom || needGauge)) {
        drawnGauge = gaugeP;
        if (gaugeP <= 0.01) {
          m.details[1].setAttribute("d", "");
        } else {
          const arcPts: [number, number][] = [];
          const nSteps = 28;
          const sweep = clamp(gaugeP, 0, 1) * 360;
          for (let step = 0; step <= nSteps; step++) {
            const deg = -135 + (step / nSteps) * sweep;
            const ang = rad(deg);
            arcPts.push(
              P(93 + Math.cos(ang) * 9.5, 52 + Math.sin(ang) * 9.5, z1)
            );
          }
          m.details[1].setAttribute("d", open(arcPts));
        }
      }
    }

    let scrollActive = false;
    let pointerFocused = false;
    let keyboardFocused = false;
    let hoveredModule = -1;
    let wasActive = false;

    function isFocused() {
      return scrollActive || pointerFocused || keyboardFocused;
    }

    function updateTargets() {
      const now = performance.now();
      const active = isFocused();
      const entranceStagger = !wasActive && active ? STAGGER : 0;

      for (const m of modules) {
        let nextZ = m.zRest;
        if (active) {
          const isSelf = m.id === hoveredModule;
          const isNeighbor =
            hoveredModule !== -1 && Math.abs(m.id - hoveredModule) === 1;
          const extra = isSelf ? WAVE : isNeighbor ? NEIGHBOR_WAVE : 0;
          nextZ = m.zRest + LIFT + extra;
        }
        if (m.targetZ !== nextZ) {
          m.targetZ = nextZ;
          const delay = !active
            ? (specs.length - 1 - m.id) * STAGGER
            : entranceStagger * m.id;
          tset(m.z, nextZ, now, delay);
        }
      }

      const nextGauge = !active
        ? 0
        : hoveredModule === 2
          ? HOVER_SCORE
          : TARGET_SCORE;
      if (targetGauge !== nextGauge) {
        targetGauge = nextGauge;
        tset(gaugeTween, nextGauge, now, !wasActive && active ? STAGGER * 2 : 0);
      }

      wasActive = active;
      stage.setAttribute("data-stage", active ? "focused" : "rest");
      B.wake();
    }

    function syncVisualState() {
      const active = isFocused();
      const hoveringInteractive = pointerFocused || keyboardFocused;

      // Página web envolvente e contorno inferior acendem com a chegada do scroll e permanecem acesos
      pageBaseEcho.setAttribute("class", active ? "nf sil" : "nf");
      pageBody.sil.setAttribute("class", active ? "sil hi" : "sil");
      pageBody.cr.setAttribute("class", active ? "nf sil" : "nf");
      pageDivider.setAttribute("class", active ? "nf hi" : "nf");
      pageUrlPill.setAttribute("class", active ? "nf hi" : "nf");
      pageDots[0].setAttribute("class", "dot");
      pageDots[1].setAttribute(
        "class",
        !active ? "dot off" : hoveringInteractive ? "dot" : "dot m"
      );
      pageDots[2].setAttribute(
        "class",
        !active ? "dot off" : hoveringInteractive ? "dot" : "dot m"
      );

      // Todos os elementos internos permanecem acesos juntos, preservando microinterações de hover e contornos 3D
      for (const m of modules) {
        const lit = active || m.drawnZ > m.zRest + LIFT * 0.25;
        const isSelf = lit && m.id === hoveredModule;
        m.body.sil.setAttribute("class", lit ? "sil hi" : "sil");
        m.body.cr.setAttribute("class", lit ? "nf sil" : "nf");

        if (m.role === "score") {
          m.details[0].setAttribute("class", lit ? "nf sil" : "nf");
          m.details[1].setAttribute(
            "class",
            drawnGauge > 0.04 ? "nf hi" : "nf lo"
          );
          for (let k = 2; k < m.details.length; k++) {
            m.details[k].setAttribute("class", lit ? "nf hi" : "nf lo");
          }
        } else {
          for (const el of m.details) {
            el.setAttribute("class", lit ? "nf hi" : "nf lo");
          }
        }

        if (m.role === "header") {
          m.dots[0].setAttribute("class", lit ? "dot" : "dot off");
          m.dots[1].setAttribute(
            "class",
            !lit ? "dot off" : isSelf ? "dot" : "dot m"
          );
        } else if (m.role === "preview") {
          for (let k = 0; k < 3; k++) {
            m.dots[k].setAttribute(
              "class",
              !lit ? "dot off" : isSelf ? "dot" : "dot m"
            );
          }
          m.dots[3].setAttribute("class", lit ? "dot" : "dot off");
        } else if (m.role === "score") {
          m.dots[0].setAttribute("class", lit ? "dot" : "dot off");
          for (let k = 0; k < 4; k++) {
            const cls = !lit ? "dot off" : isSelf || k < 2 ? "dot" : "dot m";
            m.dots[1 + k].setAttribute("class", cls);
          }
        } else {
          m.dots[0].setAttribute("class", lit ? "dot" : "dot off");
        }
      }
    }

    const B = register(stage, (_dt: number, now: number) => {
      let moving = false;
      const gaugeP = tval(gaugeTween, now);
      if (!tdone(gaugeTween, now)) moving = true;

      for (const m of modules) {
        const z = tval(m.z, now);
        drawModuleGeometry(m, z, gaugeP);
        if (!tdone(m.z, now)) moving = true;
      }
      syncVisualState();

      // Para de consumir CPU imediatamente quando todas as elevações e o arco estabilizarem
      return moving;
    });
    bag.add(B.unregister);

    // Pintura inicial síncrona em repouso para exibir caixas e contornos antes do trigger de 50%
    for (const m of modules) {
      drawModuleGeometry(m, m.zRest, 0);
    }
    syncVisualState();

    // Rule 01: Hit test estático no plano de repouso da página web e dos módulos
    function hitTest([sx, sy]: [number, number]): { overPage: boolean; mod: number } {
      const [px, py] = unproj(C, sx, sy, PAGE_THICK);
      const overPage =
        px >= PAGE_X0 - 4 &&
        px <= PAGE_X1 + 4 &&
        py >= PAGE_Y0 - 4 &&
        py <= PAGE_Y1 + 4;

      if (!overPage) return { overPage: false, mod: -1 };

      let best = -1;
      let bestDist = 1e9;
      for (const m of modules) {
        const [wx, wy] = unproj(C, sx, sy, m.zRest + m.thick);
        const padX = (m.x1 - m.x0) * 0.52 + 1.5;
        const padY = (m.y1 - m.y0) * 0.52 + 1.5;
        const dx = Math.abs(wx - m.cx);
        const dy = Math.abs(wy - m.cy);
        if (dx <= padX && dy <= padY) {
          const dist = Math.hypot(dx / padX, dy / padY);
          if (dist < bestDist) {
            bestDist = dist;
            best = m.id;
          }
        }
      }
      return { overPage: true, mod: best };
    }

    bag.add(
      pointer(stage, {
        move: (p: [number, number]) => {
          const { overPage, mod } = hitTest(p);
          if (overPage !== pointerFocused || mod !== hoveredModule) {
            pointerFocused = overPage;
            hoveredModule = mod;
            updateTargets();
          }
        },
        leave: () => {
          if (pointerFocused || hoveredModule !== -1) {
            pointerFocused = false;
            hoveredModule = -1;
            updateTargets();
          }
        },
      })
    );

    bag.on(stage, "focusin", () => {
      keyboardFocused = true;
      updateTargets();
    });
    bag.on(stage, "focusout", () => {
      keyboardFocused = false;
      updateTargets();
    });

    const textTarget =
      stage
        .closest("[data-feature-row]")
        ?.querySelector<HTMLElement>("[data-feature-text]") ?? stage;

    bag.add(
      bindViewportTrigger(
        textTarget,
        (nextScrollActive) => {
          if (nextScrollActive !== scrollActive) {
            scrollActive = nextScrollActive;
            updateTargets();
          }
        },
        0.7
      )
    );

    bag.add(() => svg.replaceChildren());

    return () => {
      bag.dispose();
    };
  }, []);

  return (
    <div className=" absolute inset-0 flex items-center justify-center overflow-hidden select-none m-0 p-0">
      <div className="relative w-full h-full flex items-center justify-center m-0 p-0">
        <div
          ref={stageRef}
          tabIndex={0}
          data-hairline="audit-report-page"
          data-hairline-theme="dark"
          role="img"
          aria-label="Página web isométrica do relatório de auditoria contendo cabeçalho, preview da URL, painel de score com severidades e lista de vulnerabilidades."
          className="w-full max-w-[600px] lg:max-w-[680px] cursor-crosshair rounded-2xl m-0 p-0"
          style={
            {
              "--hairline-plate": "#050505",
              "--hairline-hi": "#e4e7ee",
              "--hairline-edge": "#565862",
              "--hairline-mid": "#3a3b42",
              "--hairline-lo": "#2e3038",
            } as React.CSSProperties
          }
        />
      </div>
    </div>
  );
}
