"use client";

import React, { useEffect, useRef } from "react";
import { HL } from "./hairlineKernel";
import { bindViewportTrigger } from "./viewportTrigger";

const LAT = 38;
const FWD_TOP = 38;
const FWD_BOT = 134;
const FWD_END = FWD_BOT + LAT; // 172 -> alinha centros de Entrada, R/L e Report em linhas retas 2:1
const LIFT = 8;
const WAVE = 2;
const STAGGER = 15;
const LIFT_DUR = 380;
const BRIDGE_DUR = 175;

type NodeRole = "entry" | "left" | "right" | "report";
type BranchSide = "left" | "right";
type ActiveSide = "none" | BranchSide;

interface NodeSpec {
  id: number;
  label: string;
  role: NodeRole;
  branchIdx: number;
  fwd: number;
  lat: number;
  w: number;
  thick: number;
  r: number;
  b: number;
  cx: number;
  cy: number;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  zRest: number;
}

interface FlowState {
  side: ActiveSide;
  step: number;
}

const LEFT_CHAIN = [0, 1, 2, 3, 9] as const;
const RIGHT_CHAIN = [0, 4, 5, 6, 7, 8, 9] as const;

const TIMELINE: ReadonlyArray<{ side: ActiveSide; step: number; ms: number }> = [
  { side: "none", step: 0, ms: 280 },
  // Fase 1 — Lado esquerdo (Fast Scan) em cascata rápida até o Report (direita em opacidade menor)
  { side: "left", step: 1, ms: 210 },
  { side: "left", step: 2, ms: 220 },
  { side: "left", step: 3, ms: 220 },
  { side: "left", step: 4, ms: 220 },
  { side: "left", step: 5, ms: 620 },
  // Após o Report, transição rápida para o lado direito (esquerda em opacidade menor)
  { side: "right", step: 0, ms: 260 },
  // Fase 2 — Lado direito (Deep Scan) em cascata rápida até o Report
  { side: "right", step: 1, ms: 175 },
  { side: "right", step: 2, ms: 175 },
  { side: "right", step: 3, ms: 175 },
  { side: "right", step: 4, ms: 175 },
  { side: "right", step: 5, ms: 175 },
  { side: "right", step: 6, ms: 175 },
  { side: "right", step: 7, ms: 650 },
  // Breve repouso composto antes de reiniciar
  { side: "none", step: 0, ms: 550 },
];

function makeSpec(
  id: number,
  label: string,
  role: NodeRole,
  branchIdx: number,
  fwd: number,
  lat: number,
  w: number,
  thick: number,
  r: number,
  b: number
): NodeSpec {
  const cx = fwd + lat;
  const cy = fwd - lat;
  const half = w / 2;
  // Inclinação linear proporcional a fwd mantém os 4 conectores diagonais estritamente retos e paralelos
  const zRest = 10 * (1 - fwd / FWD_END);
  return {
    id,
    label,
    role,
    branchIdx,
    fwd,
    lat,
    w,
    thick,
    r,
    b,
    cx,
    cy,
    x0: cx - half,
    x1: cx + half,
    y0: cy - half,
    y1: cy + half,
    zRest,
  };
}

function buildSpecs(): NodeSpec[] {
  const stepL = (FWD_BOT - FWD_TOP) / 2;
  const stepR = (FWD_BOT - FWD_TOP) / 4;
  return [
    makeSpec(0, "entry", "entry", 0, 0, 0, 34, 6.5, 4.8, 1.5),
    // Lado esquerdo — Fast Scan (3 módulos alinhados no centro do ramo esquerdo)
    makeSpec(1, "left-0", "left", 0, FWD_TOP, -LAT, 28, 5.5, 4.0, 1.2),
    makeSpec(2, "left-1", "left", 1, FWD_TOP + stepL, -LAT, 28, 5.5, 4.0, 1.2),
    makeSpec(3, "left-2", "left", 2, FWD_BOT, -LAT, 28, 5.5, 4.0, 1.2),
    // Lado direito — Deep Scan (5 módulos compactos alinhados no centro do ramo direito)
    makeSpec(4, "right-0", "right", 0, FWD_TOP, LAT, 17, 3.5, 2.6, 0.95),
    makeSpec(5, "right-1", "right", 1, FWD_TOP + stepR, LAT, 17, 3.5, 2.6, 0.95),
    makeSpec(6, "right-2", "right", 2, FWD_TOP + stepR * 2, LAT, 17, 3.5, 2.6, 0.95),
    makeSpec(7, "right-3", "right", 3, FWD_TOP + stepR * 3, LAT, 17, 3.5, 2.6, 0.95),
    makeSpec(8, "right-4", "right", 4, FWD_BOT, LAT, 17, 3.5, 2.6, 0.95),
    // Bloco final — Report (convergência reta dos dois caminhos)
    makeSpec(9, "report", "report", 0, FWD_END, 0, 34, 6.5, 4.8, 1.5),
  ];
}

export function SequentialPipelineVisual() {
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stageEl = stageRef.current;
    if (!stageEl) return;
    const stage: HTMLDivElement = stageEl;

    const {
      Cam,
      clamp,
      facing,
      fit,
      lerp,
      open,
      poly,
      prism,
      proj,
      rad,
      reducedMotion,
      ringAt,
      rings,
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
    } = HL as any;

    inject(document);
    stage.replaceChildren();

    const svg = mk(
      "svg",
      { viewBox: "0 0 400 320", "aria-hidden": "true" },
      stage
    );
    const bag = disposer();
    const specs = buildSpecs();

    const C = Cam(45, 0.5, 1.7);
    const bounds: [number, number, number][] = [];
    for (const s of specs) {
      bounds.push(
        [s.x0, s.y0, s.zRest + s.thick + LIFT + WAVE],
        [s.x0, s.y1, 0],
        [s.x1, s.y0, 0],
        [s.x1, s.y1, s.role === "report" ? -6 : 0]
      );
    }
    fit(C, bounds, 200, 161);
    const P = proj(C);
    const front = facing(C);

    const g = mk("g", {}, svg);

    interface NodeRuntime extends NodeSpec {
      ring: any;
      inner: any;
      body: { g: SVGGElement; sil: SVGPathElement; cr: SVGPathElement };
      details: SVGPathElement[];
      dots: SVGElement[];
      z: any;
      drawnZ: number;
    }

    interface BridgeDef {
      fromIdx: number;
      toIdx: number;
      branch: BranchSide;
      activateStep: number;
    }

    interface BridgeRuntime extends BridgeDef {
      dash: SVGPathElement;
      active: SVGPathElement;
      startDot: SVGElement;
      prog: any;
      drawnP: number;
      drawnZa: number;
      drawnZb: number;
    }

    const bridgeDefs: BridgeDef[] = [
      // Caminho esquerdo (Fast Scan)
      { fromIdx: 0, toIdx: 1, branch: "left", activateStep: 2 },
      { fromIdx: 1, toIdx: 2, branch: "left", activateStep: 3 },
      { fromIdx: 2, toIdx: 3, branch: "left", activateStep: 4 },
      { fromIdx: 3, toIdx: 9, branch: "left", activateStep: 5 },
      // Caminho direito (Deep Scan)
      { fromIdx: 0, toIdx: 4, branch: "right", activateStep: 2 },
      { fromIdx: 4, toIdx: 5, branch: "right", activateStep: 3 },
      { fromIdx: 5, toIdx: 6, branch: "right", activateStep: 4 },
      { fromIdx: 6, toIdx: 7, branch: "right", activateStep: 5 },
      { fromIdx: 7, toIdx: 8, branch: "right", activateStep: 6 },
      { fromIdx: 8, toIdx: 9, branch: "right", activateStep: 7 },
    ];

    const nodes: NodeRuntime[] = new Array(specs.length);
    const bridges: BridgeRuntime[] = [];

    function createNodeElement(s: NodeSpec): NodeRuntime {
      const grp = mk("g", {}, g);
      const body = solid(grp);
      const [ring, inner] = rings(s.x0, s.y0, s.x1, s.y1, s.r, s.b);
      const details: SVGPathElement[] = [];
      const dots: SVGElement[] = [];

      if (s.role === "entry") {
        details.push(mk("path", { class: "nf lo" }, grp));
        details.push(mk("path", { class: "nf lo" }, grp));
        dots.push(flatDot(grp, C, 0.72, "dot"));
      } else if (s.role === "left") {
        const count = s.branchIdx === 0 ? 1 : s.branchIdx === 1 ? 3 : 2;
        for (let k = 0; k < count; k++) {
          details.push(mk("path", { class: "nf lo" }, grp));
        }
        for (let k = 0; k < 3; k++) {
          dots.push(flatDot(grp, C, 0.56, "dot off"));
        }
      } else if (s.role === "right") {
        details.push(mk("path", { class: "nf lo" }, grp));
        details.push(mk("path", { class: "nf lo" }, grp));
        dots.push(flatDot(grp, C, 0.5, "dot off"));
      } else {
        for (let k = 0; k < 4; k++) {
          details.push(mk("path", { class: "nf lo" }, grp));
        }
        dots.push(flatDot(grp, C, 0.7, "dot off"));
        dots.push(flatDot(grp, C, 0.7, "dot off"));
      }

      return {
        ...s,
        ring,
        inner,
        body,
        details,
        dots,
        z: tween(s.zRest, LIFT_DUR),
        drawnZ: NaN,
      };
    }

    function createBridgeElement(def: BridgeDef) {
      const bGrp = mk("g", {}, g);
      const dash = mk("path", { class: "nf dash" }, bGrp);
      const active = mk("path", { class: "nf hi" }, bGrp);
      const startDot = flatDot(bGrp, C, 0.62, "dot off");
      bridges.push({
        ...def,
        dash,
        active,
        startDot,
        prog: tween(0, BRIDGE_DUR),
        drawnP: NaN,
        drawnZa: NaN,
        drawnZb: NaN,
      });
    }

    // Construção estritamente back-to-front (Rule 06: ordem crescente de fwd),
    // intercalando cada ponte após o bloco de origem e antes do bloco de destino.
    const orderedIds = [...specs]
      .sort((a, b) => a.fwd - b.fwd || a.lat - b.lat)
      .map((s) => s.id);

    for (const id of orderedIds) {
      const s = specs[id];
      if (s.role === "report") {
        const [reportRing] = rings(s.x0, s.y0, s.x1, s.y1, s.r, s.b);
        reflect(svg, g, P, front, reportRing, s.zRest, 6);
      }
      nodes[id] = createNodeElement(s);
      for (const def of bridgeDefs) {
        if (def.fromIdx === id) {
          createBridgeElement(def);
        }
      }
    }

    const leftReportBridge = bridges.find(
      (b) => b.branch === "left" && b.toIdx === 9
    );
    const rightReportBridge = bridges.find(
      (b) => b.branch === "right" && b.toIdx === 9
    );

    function drawNodeGeometry(n: NodeRuntime, z0: number) {
      if (z0 === n.drawnZ) return;
      n.drawnZ = z0;
      const z1 = z0 + n.thick;
      const { cx, cy } = n;

      put(n.body, prism(P, front, n.ring, n.inner, z0, z1));

      if (n.role === "entry") {
        const [fRing] = rings(cx - 6.5, cy - 7.5, cx + 6.5, cy + 7.5, 2.0, 0.45);
        n.details[0].setAttribute("d", poly(ringAt(P, fRing, z1)));
        n.details[1].setAttribute(
          "d",
          seg(P(cx - 3.8, cy - 4.0, z1), P(cx + 3.8, cy - 4.0, z1))
        );
        place(n.dots[0], P(cx, cy + 3.8, z1));
      } else if (n.role === "left") {
        for (let k = 0; k < 3; k++) {
          place(n.dots[k], P(cx - 8.8, cy - 5.2 + k * 5.2, z1));
        }
        if (n.branchIdx === 0) {
          n.details[0].setAttribute(
            "d",
            open([
              P(cx - 1.5, cy - 6.5, z1),
              P(cx + 2.5, cy - 2.2, z1),
              P(cx - 1.5, cy + 2.0, z1),
              P(cx + 5.5, cy + 6.5, z1),
            ])
          );
        } else if (n.branchIdx === 1) {
          const xs = [-1.5, 2.2, 5.9];
          const ys = [12.5, 8.5, 10.8];
          for (let k = 0; k < 3; k++) {
            n.details[k].setAttribute(
              "d",
              seg(P(cx + xs[k], cy - 6.2, z1), P(cx + xs[k], cy - 6.2 + ys[k], z1))
            );
          }
        } else {
          n.details[0].setAttribute(
            "d",
            seg(P(cx - 1.0, cy - 6, z1), P(cx - 1.0, cy + 6, z1))
          );
          n.details[1].setAttribute(
            "d",
            seg(P(cx + 4.5, cy - 3, z1), P(cx + 4.5, cy + 6, z1))
          );
        }
      } else if (n.role === "right") {
        place(n.dots[0], P(cx - 4.4, cy - 4.4, z1));
        const lenA = 5.4 + ((n.branchIdx * 2) % 4);
        const lenB = 8.0 - (n.branchIdx % 3);
        n.details[0].setAttribute(
          "d",
          seg(P(cx - 0.5, cy - 4.2, z1), P(cx - 0.5, cy - 4.2 + lenA, z1))
        );
        n.details[1].setAttribute(
          "d",
          seg(P(cx + 3.2, cy - 4.2, z1), P(cx + 3.2, cy - 4.2 + lenB, z1))
        );
      } else {
        // Report: 3 barras de resumo + arco do score + 2 receptores alinhados aos eixos de entrada
        n.details[0].setAttribute(
          "d",
          seg(P(cx - 5.5, cy - 3.5, z1), P(cx - 5.5, cy + 7.5, z1))
        );
        n.details[1].setAttribute(
          "d",
          seg(P(cx - 1.2, cy - 3.5, z1), P(cx - 1.2, cy + 4.5, z1))
        );
        n.details[2].setAttribute(
          "d",
          seg(P(cx + 3.0, cy - 3.5, z1), P(cx + 3.0, cy + 2.0, z1))
        );
        const arcPts: [number, number][] = [];
        const acx = cx + 6.2;
        const acy = cy + 7.2;
        const rArc = 3.8;
        for (let step = 0; step <= 8; step++) {
          const ang = rad(-145 + (step / 8) * 210);
          arcPts.push(
            P(acx + Math.cos(ang) * rArc, acy + Math.sin(ang) * rArc, z1)
          );
        }
        n.details[3].setAttribute("d", open(arcPts));
        place(n.dots[0], P(cx - 12.2, cy, z1));
        place(n.dots[1], P(cx, cy - 12.2, z1));
      }
    }

    function bridgeWorldEndpoints(
      a: NodeRuntime,
      next: NodeRuntime
    ): [[number, number, number], [number, number, number]] {
      // Altura uniforme relativa ao topo inclinado mantém as diagonais 100% retas e coplanares em repouso
      const za = a.drawnZ + 2.4;
      const zb = next.drawnZ + 2.4;

      if (a.role === "entry" && next.role === "left") {
        return [
          [a.cx, a.y1, za],
          [next.cx, next.y0, zb],
        ];
      }
      if (a.role === "entry" && next.role === "right") {
        return [
          [a.x1, a.cy, za],
          [next.x0, next.cy, zb],
        ];
      }
      if (a.role === "left" && next.role === "report") {
        return [
          [a.x1, a.cy, za],
          [next.x0, next.cy, zb],
        ];
      }
      if (a.role === "right" && next.role === "report") {
        return [
          [a.cx, a.y1, za],
          [next.cx, next.y0, zb],
        ];
      }
      // Ponte vertical alinhada ao eixo central entre blocos consecutivos da coluna
      const trimA = a.r * 0.293;
      const trimB = next.r * 0.35;
      return [
        [a.x1 - trimA, a.y1 - trimA, za],
        [next.x0 + trimB, next.y0 + trimB, zb],
      ];
    }

    function drawBridgeGeometry(b: BridgeRuntime, p: number) {
      const a = nodes[b.fromIdx];
      const next = nodes[b.toIdx];
      if (
        p === b.drawnP &&
        a.drawnZ === b.drawnZa &&
        next.drawnZ === b.drawnZb
      ) {
        return;
      }
      b.drawnP = p;
      b.drawnZa = a.drawnZ;
      b.drawnZb = next.drawnZ;

      const [wStart, wEnd] = bridgeWorldEndpoints(a, next);
      const p0 = P(wStart[0], wStart[1], wStart[2]);
      const p1 = P(wEnd[0], wEnd[1], wEnd[2]);

      b.dash.setAttribute("d", seg(p0, p1));
      place(b.startDot, p0);

      if (p <= 0.005) {
        b.active.setAttribute("d", "");
        return;
      }
      const u = clamp(p, 0, 1);
      const cur: [number, number] = [
        lerp(p0[0], p1[0], u),
        lerp(p0[1], p1[1], u),
      ];
      b.active.setAttribute("d", seg(p0, cur));
    }

    let state: FlowState = { side: "none", step: 0 };
    let lastBranch: BranchSide = "left";
    let scrollActive = false;
    let manualActive = false;
    let tlIdx = 1;
    let tlElapsed = 0;

    function applyFlowState(next: FlowState, now: number) {
      if (next.side === state.side && next.step === state.step) return;
      const prev = state;
      state = next;
      if (next.side === "left" || next.side === "right") {
        lastBranch = next.side;
      }

      const activeChain: readonly number[] =
        next.side === "left"
          ? LEFT_CHAIN
          : next.side === "right"
          ? RIGHT_CHAIN
          : [];

      const prevChain: readonly number[] =
        prev.side === "left"
          ? LEFT_CHAIN
          : prev.side === "right"
          ? RIGHT_CHAIN
          : [];

      for (const n of nodes) {
        const pos = activeChain.indexOf(n.id);
        if (pos >= 0 && pos < next.step) {
          const isFrontier = pos === next.step - 1;
          const targetZ = n.zRest + LIFT + (isFrontier ? WAVE : 0);
          tset(n.z, targetZ, now, 0);
        } else {
          const prevPos = prevChain.indexOf(n.id);
          const outDelay =
            prevPos >= 0 && prev.step > 0
              ? Math.max(0, (prev.step - 1 - prevPos) * STAGGER)
              : 0;
          tset(n.z, n.zRest, now, outDelay);
        }
      }

      for (const b of bridges) {
        const lit = b.branch === next.side && next.step >= b.activateStep;
        tset(b.prog, lit ? 1 : 0, now, 0);
      }

      const tag =
        next.side === "none" || next.step === 0
          ? "rest"
          : `${next.side} · ${next.step}`;
      stage.setAttribute("data-stage", tag);
    }

    function syncVisualState() {
      const inactiveSide: BranchSide | null =
        state.side === "left"
          ? "right"
          : state.side === "right"
          ? "left"
          : null;

      for (const n of nodes) {
        const isDimmed =
          inactiveSide !== null && n.role === inactiveSide;
        const isEvidenced =
          !isDimmed && n.drawnZ > n.zRest + LIFT * 0.22;

        if (isDimmed) {
          n.body.sil.setAttribute("class", "lo");
          n.body.cr.setAttribute("class", "nf lo");
        } else {
          n.body.sil.setAttribute("class", isEvidenced ? "sil hi" : "sil");
          n.body.cr.setAttribute("class", "nf lo");
        }

        for (const el of n.details) {
          el.setAttribute("class", isEvidenced ? "nf hi" : "nf lo");
        }

        if (n.role === "entry") {
          const dotOn = state.side === "none" || isEvidenced;
          n.dots[0].setAttribute("class", dotOn ? "dot" : "dot m");
        } else if (n.role === "left") {
          for (let k = 0; k < 3; k++) {
            let cls = "dot off";
            if (!isDimmed) {
              if (isEvidenced) {
                cls = k === n.branchIdx ? "dot" : k < n.branchIdx ? "dot m" : "dot off";
              } else if (k === n.branchIdx) {
                cls = "dot m";
              }
            }
            n.dots[k].setAttribute("class", cls);
          }
        } else if (n.role === "right") {
          const cls = isDimmed ? "dot off" : isEvidenced ? "dot" : "dot m";
          n.dots[0].setAttribute("class", cls);
        } else {
          const lCls =
            state.side === "right"
              ? "dot off"
              : leftReportBridge && leftReportBridge.drawnP > 0.7
              ? "dot"
              : state.side === "left"
              ? "dot m"
              : "dot off";
          const rCls =
            state.side === "left"
              ? "dot off"
              : rightReportBridge && rightReportBridge.drawnP > 0.7
              ? "dot"
              : state.side === "right"
              ? "dot m"
              : "dot off";
          n.dots[0].setAttribute("class", lCls);
          n.dots[1].setAttribute("class", rCls);
        }
      }

      for (const b of bridges) {
        const bDimmed =
          inactiveSide !== null && b.branch === inactiveSide;
        b.dash.setAttribute("class", bDimmed ? "nf dash lo" : "nf dash");

        if (bDimmed) {
          b.startDot.setAttribute("class", "dot off");
        } else if (b.drawnP > 0.12) {
          b.startDot.setAttribute("class", "dot");
        } else if (state.side === b.branch) {
          b.startDot.setAttribute("class", "dot m");
        } else {
          b.startDot.setAttribute("class", "dot off");
        }
      }
    }

    const B = register(stage, (dt: number, now: number) => {
      const autoPlay = scrollActive && !manualActive && !reducedMotion();
      if (autoPlay) {
        tlElapsed += dt * 1000;
        while (tlElapsed >= TIMELINE[tlIdx].ms) {
          tlElapsed -= TIMELINE[tlIdx].ms;
          tlIdx = (tlIdx + 1) % TIMELINE.length;
        }
        const kf = TIMELINE[tlIdx];
        applyFlowState({ side: kf.side, step: kf.step }, now);
      } else if (!manualActive) {
        applyFlowState({ side: "none", step: 0 }, now);
      }

      let moving = false;
      for (const n of nodes) {
        const z = tval(n.z, now);
        drawNodeGeometry(n, z);
        if (!tdone(n.z, now)) moving = true;
      }
      for (const b of bridges) {
        const p = tval(b.prog, now);
        drawBridgeGeometry(b, p);
        if (!tdone(b.prog, now)) moving = true;
      }
      syncVisualState();

      return autoPlay || moving;
    });
    bag.add(B.unregister);

    // Pintura inicial síncrona em repouso antes do disparo em 40% da viewport
    for (const n of nodes) {
      drawNodeGeometry(n, n.zRest);
    }
    for (const b of bridges) {
      drawBridgeGeometry(b, 0);
    }
    syncVisualState();

    // Rule 01: Hit test estático na altura de repouso de cada placa
    function hitNode([sx, sy]: [number, number]): number {
      let best = -1;
      let bestDist = 1e9;
      for (const n of nodes) {
        const [wx, wy] = unproj(C, sx, sy, n.zRest + n.thick);
        const halfHit = n.w * 0.65;
        const dx = Math.abs(wx - n.cx);
        const dy = Math.abs(wy - n.cy);
        if (dx <= halfHit && dy <= halfHit) {
          const dist = Math.hypot(dx / n.w, dy / n.w);
          if (dist < bestDist) {
            bestDist = dist;
            best = n.id;
          }
        }
      }
      return best;
    }

    function stateForNode(nodeId: number): FlowState {
      if (nodeId < 0) return { side: "none", step: 0 };
      if (nodeId === 0) return { side: lastBranch, step: 1 };
      if (nodeId >= 1 && nodeId <= 3) return { side: "left", step: nodeId + 1 };
      if (nodeId >= 4 && nodeId <= 8) return { side: "right", step: nodeId - 2 };
      return lastBranch === "right"
        ? { side: "right", step: 7 }
        : { side: "left", step: 5 };
    }

    function syncAutoFlow(now: number) {
      tlIdx = 1;
      tlElapsed = 0;
      const nextState: FlowState =
        scrollActive && !reducedMotion()
          ? { side: TIMELINE[1].side, step: TIMELINE[1].step }
          : { side: "none", step: 0 };
      applyFlowState(nextState, now);
      B.wake();
    }

    bag.add(
      pointer(stage, {
        move: (p: [number, number]) => {
          manualActive = true;
          const nodeId = hitNode(p);
          applyFlowState(stateForNode(nodeId), performance.now());
          B.wake();
        },
        leave: () => {
          manualActive = false;
          syncAutoFlow(performance.now());
        },
      })
    );

    bag.add(
      bindViewportTrigger(
        stage,
        (nextActive) => {
          if (nextActive === scrollActive) return;
          scrollActive = nextActive;
          if (!manualActive) {
            syncAutoFlow(performance.now());
          }
        },
        0.3
      )
    );

    bag.add(() => svg.replaceChildren());

    return () => {
      bag.dispose();
    };
  }, []);

  return (
    <div className="w-full h-full absolute inset-0 flex items-center justify-center overflow-hidden select-none m-0 p-0">
      <div className="relative w-full h-full flex items-center justify-center m-0 p-0">
        <div
          ref={stageRef}
          data-hairline="pipeline-fork"
          data-hairline-theme="dark"
          role="img"
          aria-label="Fluxograma isométrico de varredura sequencial: caminho esquerdo (Fast Scan) até o relatório, seguido pelo caminho direito (Deep Scan)."
          className="w-full max-w-[600px] lg:max-w-[680px] cursor-crosshair m-0 p-0"
          style={
            {
              "--hairline-plate": "#050505",
              "--hairline-hi": "#e4e7ee",
              "--hairline-edge": "#565862",
              "--hairline-mid": "#3a3b42",
              "--hairline-lo": "#212127",
            } as React.CSSProperties
          }
        />
      </div>
    </div>
  );
}
