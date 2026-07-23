"use client";

import { useEffect, useRef, useState } from "react";
import { Gauge, RotateCcw, AlertTriangle } from "lucide-react";
import { getBrand, getModel, getTestData, getVariant } from "@/lib/data";
import { cornerSpeedCapKmh } from "@/lib/race/grip";
import { CAR_IMAGE_MAP } from "@/lib/carImageMap";
import { SCENE_COLORS } from "@/components/understanding/scenes/shared/sceneTokens";
import VariantSelect from "./VariantSelect";
import DriveRange from "@/components/ui/DriveRange";

type Surface = "dry" | "wet" | "mud";

const CORNERS = [
  { id: "hairpin", label: "Hairpin", radiusM: 12 },
  { id: "tight",   label: "Tight bend", radiusM: 28 },
  { id: "sweeper", label: "Fast sweeper", radiusM: 70 },
] as const;

type CornerId = (typeof CORNERS)[number]["id"];

const SURFACES: { id: Surface; label: string; base: number }[] = [
  { id: "dry", label: "Dry tarmac", base: 0.95 },
  { id: "wet", label: "Wet road",   base: 0.72 },
  { id: "mud", label: "Mud / loose", base: 0.55 },
];

function clamp(x: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, x));
}

function muFor(base: number, kerbWeight: number, t100: number) {
  return Math.max(0.3, base - clamp((kerbWeight - 1200) / 1600, 0, 0.25) + (t100 < 9 ? 0.06 : 0));
}

export default function CorneringLab({ initialVariant }: { initialVariant?: string }) {
  const [id, setId] = useState(initialVariant ?? "creta-sx-o-turbo-dct");
  const [cornerId, setCornerId] = useState<CornerId>("tight");
  const [surface, setSurface] = useState<Surface>("dry");
  const [entrySpeed, setEntrySpeed] = useState(55);
  const [state, setState] = useState<"idle" | "running" | "finished">("idle");
  const [anim, setAnim] = useState({ p: 0, wide: 0, latG: 0, spun: false });
  const [loadedImage, setLoadedImage] = useState<HTMLImageElement | null>(null);
  const rafRef = useRef({ t: 0, last: 0, id: 0 });
  const shakeRef = useRef({ x: 0, y: 0 });

  const v = getVariant(id);
  const m = v ? getModel(v.modelId) : null;
  const td = v ? getTestData(v.id) : null;
  const kerbWeight = v?.kerbWeight ?? 1300;
  const t100 = td?.zeroTo100.value ?? 11;
  const brandColor = m ? (getBrand(m.brandId)?.color ?? "#C84C31") : "#C84C31";

  useEffect(() => {
    if (!m) return;
    const url = CAR_IMAGE_MAP[m.id];
    if (!url) { setLoadedImage(null); return; }
    setLoadedImage(null);
    const img = new Image();
    img.src = url;
    img.onload = () => setLoadedImage(img);
    img.onerror = () => setLoadedImage(null);
  }, [id, m]);

  const corner = CORNERS.find((c) => c.id === cornerId)!;
  const surf = SURFACES.find((s) => s.id === surface)!;
  const mu = muFor(surf.base, kerbWeight, t100);
  const maxSpeed = cornerSpeedCapKmh(1 / corner.radiusM, mu);
  const ratio = entrySpeed / maxSpeed;
  const peakLatG = (entrySpeed / 3.6) ** 2 / corner.radiusM / 9.81;

  const verdict =
    ratio <= 1.0
      ? { tone: "good" as const, title: "Holds the line",     note: "Tyres have grip to spare — the car tracks the apex cleanly." }
      : ratio <= 1.15
      ? { tone: "warn" as const, title: "Understeers wide",   note: "Front tyres saturate; the nose washes out toward the outer edge." }
      : { tone: "bad"  as const, title: "Grip lost — runs off", note: "Demand far exceeds grip. The car ploughs straight on and leaves the road." };

  const run = () => {
    setState("running");
    rafRef.current = { t: 0, last: performance.now(), id: 0 };
    const overshoot = Math.max(0, ratio - 1);

    const loop = (now: number) => {
      const dt = (now - rafRef.current.last) / 1000;
      rafRef.current.last = now;
      rafRef.current.t += dt;
      const duration = 4.2;
      const p = Math.min(rafRef.current.t / duration, 1);

      // Corner zone p = 0.28 → 0.74
      const inCorner = p > 0.28 && p < 0.74;
      const cornerFrac = inCorner ? (p - 0.28) / 0.46 : 0;
      const apexFactor = Math.sin(cornerFrac * Math.PI); // peaks at midpoint

      const wide  = clamp(overshoot * 3.0, 0, 2.8) * apexFactor;
      const spun  = overshoot > 0.15 && p > 0.55;
      const latG  = inCorner ? peakLatG * apexFactor : 0;

      if (latG > 0.8) {
        shakeRef.current = {
          x: (Math.random() - 0.5) * latG * 1.6,
          y: (Math.random() - 0.5) * latG * 0.8,
        };
      } else {
        shakeRef.current = { x: 0, y: 0 };
      }

      setAnim({ p, wide, latG, spun });

      if (p >= 1) { setState("finished"); return; }
      rafRef.current.id = requestAnimationFrame(loop);
    };
    rafRef.current.id = requestAnimationFrame(loop);
  };

  useEffect(() => () => cancelAnimationFrame(rafRef.current.id), []);
  useEffect(() => setState("idle"), [id, cornerId, surface, entrySpeed]);

  // ── SVG scene constants ──
  const ROAD_CY = 142;   // road centre Y
  const ROAD_H  = 34;    // half-height of road band
  const CAR_X   = 60 + anim.p * 570;
  const CORNER_X0 = 60 + 0.28 * 570;
  const CORNER_X1 = 60 + 0.74 * 570;
  const APEX_X    = (CORNER_X0 + CORNER_X1) / 2;

  // Car drifts upward (toward top) when running wide
  const CAR_Y    = ROAD_CY - anim.wide * 14 - (anim.spun ? Math.sin(anim.p * 10) * 5 : 0);
  const bodyRoll = anim.wide * 7 + clamp(anim.latG - 1, 0, 2) * 3; // outward roll

  // Lateral G needle angle: -140° = 0 g, +140° = 3 g
  const latGNeedle = -140 + clamp(anim.latG / 3, 0, 1) * 280;

  // Build skid-mark trail from history
  const skids: { x: number; y: number; op: number }[] = [];
  if (state !== "idle" && anim.wide > 0.3) {
    for (let i = 1; i <= 5; i++) {
      const pp = Math.max(0, anim.p - i * 0.04);
      if (pp > 0.28 && pp < 0.74) {
        const cf = (pp - 0.28) / 0.46;
        const af = Math.sin(cf * Math.PI);
        const w  = clamp((ratio - 1) * 3.0, 0, 2.8) * af;
        skids.push({ x: 60 + pp * 570, y: ROAD_CY - w * 14, op: (1 - i / 6) * Math.min(1, anim.wide) });
      }
    }
  }

  const smokeColor = surface === "mud" ? "#7a5a3a" : "#CCCCCC";

  return (
    <div className="glass p-6 rounded-[32px] overflow-hidden">
      {/* ── Configurator ── */}
      <div className="grid gap-4 md:grid-cols-4 items-end mb-5">
        <VariantSelect
          label="Your Vehicle"
          value={id}
          onChange={(x) => { setState("idle"); setId(x); }}
        />

        <div className="text-sm">
          <span className="text-secondary text-xs block mb-1.5">Corner type</span>
          <div className="flex rounded-xl border border-[#161616]/12 overflow-hidden">
            {CORNERS.map((c) => (
              <button
                key={c.id}
                onClick={() => { setState("idle"); setCornerId(c.id); }}
                className={`flex-1 px-2 py-2 text-xs transition-colors ${
                  cornerId === c.id
                    ? "bg-[rgba(200,76,49,0.12)] text-primary font-semibold"
                    : "text-secondary hover:text-primary"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="text-sm">
          <span className="text-secondary text-xs block mb-1.5">Surface</span>
          <div className="flex rounded-xl border border-[#161616]/12 overflow-hidden">
            {SURFACES.map((s) => (
              <button
                key={s.id}
                onClick={() => { setState("idle"); setSurface(s.id); }}
                className={`flex-1 px-2 py-2 text-xs transition-colors ${
                  surface === s.id
                    ? "bg-[rgba(200,76,49,0.12)] text-primary font-semibold"
                    : "text-secondary hover:text-primary"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <DriveRange
          label="Entry speed"
          value={entrySpeed}
          onChange={(v) => { setState("idle"); setEntrySpeed(v); }}
          min={20}
          max={140}
          step={5}
          mobileStep={10}
          format={(v) => `${v} km/h`}
          presets={[40, 80, 120]}
          presetFormat={(v) => `${v}`}
          accentClass="accent-[#C84C31]"
        />
      </div>

      {/* ── Viewport ── */}
      <div className="relative w-full aspect-[22/8] bg-[#0A0710] rounded-2xl overflow-hidden border border-white/[0.08]">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0d0a1b] via-[#100b1c] to-[#0A0710]" />

        <svg
          viewBox="0 0 700 200"
          className="absolute inset-0 w-full h-full"
          style={{ transform: `translate(${shakeRef.current.x}px, ${shakeRef.current.y}px)` }}
        >
          {/* Background ridge silhouette */}
          <path
            d="M 0,110 L 70,78 L 180,98 L 300,62 L 420,88 L 550,68 L 700,82 L 700,122 L 0,122 Z"
            fill="rgba(79,107,138,0.04)"
          />

          {/* Road band */}
          <rect x={0} y={ROAD_CY - ROAD_H} width={700} height={ROAD_H * 2} fill={SCENE_COLORS.road} />
          <line x1={0} y1={ROAD_CY - ROAD_H} x2={700} y2={ROAD_CY - ROAD_H}
            stroke={SCENE_COLORS.roadEdge} strokeWidth={1.5} />
          <line x1={0} y1={ROAD_CY + ROAD_H} x2={700} y2={ROAD_CY + ROAD_H}
            stroke={SCENE_COLORS.roadEdge} strokeWidth={1.5} />

          {/* Scrolling centre dashes */}
          <line
            x1={0} y1={ROAD_CY} x2={700} y2={ROAD_CY}
            stroke={SCENE_COLORS.roadLine} strokeWidth={1.5}
            strokeDasharray="24 16"
            strokeDashoffset={state === "running" ? -(anim.p * 340) : 0}
          />

          {/* Corner zone tint */}
          <rect
            x={CORNER_X0} y={ROAD_CY - ROAD_H}
            width={CORNER_X1 - CORNER_X0} height={ROAD_H * 2}
            fill="rgba(200,76,49,0.04)"
          />

          {/* Cone markers — 3 pairs along the corner zone */}
          {[CORNER_X0 + 20, APEX_X, CORNER_X1 - 20].map((cx, i) => (
            <g key={i}>
              {/* Outer cone (outside of bend — top of road) */}
              <polygon
                points={`${cx},${ROAD_CY - ROAD_H - 2} ${cx - 4},${ROAD_CY - ROAD_H + 11} ${cx + 4},${ROAD_CY - ROAD_H + 11}`}
                fill="#d97706" opacity={0.9}
              />
              {/* Inner kerb dot */}
              <circle cx={cx} cy={ROAD_CY + ROAD_H - 5} r={3} fill="#d97706" opacity={0.65} />
            </g>
          ))}

          {/* Ideal racing line (hugs inner kerb) */}
          <path
            d={`M 40,${ROAD_CY + 10} L ${CORNER_X0},${ROAD_CY + 10} Q ${APEX_X},${ROAD_CY - 12} ${CORNER_X1},${ROAD_CY + 10} L 660,${ROAD_CY + 10}`}
            fill="none"
            stroke="rgba(200,76,49,0.28)"
            strokeWidth={1.5}
            strokeDasharray="5 7"
          />

          {/* Apex marker dot */}
          <circle cx={APEX_X} cy={ROAD_CY - 10} r={3.5} fill="#C84C31" opacity={0.7} />

          {/* Skid marks */}
          {skids.map((sk, i) => (
            <g key={i}>
              <ellipse cx={sk.x - 18} cy={sk.y + 13} rx={7} ry={2.5} fill="#ffffff" opacity={sk.op * 0.22} />
              <ellipse cx={sk.x + 18} cy={sk.y + 13} rx={7} ry={2.5} fill="#ffffff" opacity={sk.op * 0.22} />
            </g>
          ))}

          {/* ── Car ── */}
          <g transform={`translate(${CAR_X}, ${CAR_Y}) rotate(${bodyRoll})`}>
            {loadedImage ? (
              <image
                href={loadedImage.src}
                x={-42} y={-14}
                width={84} height={30}
                preserveAspectRatio="xMidYMidMeet"
              />
            ) : (
              <path
                d="M -36,10 L -36,2 C -36,-2 -32,-7 -22,-7 L 4,-7 C 12,-7 18,-3 28,2 L 36,8 C 38,9 39,12 36,14 L -36,14 Z"
                fill="none"
                stroke={brandColor}
                strokeWidth={1.5}
              />
            )}

            {/* Tyre smoke / mud spray when sliding */}
            {state === "running" && anim.wide > 0.45 && (
              <g opacity={Math.min(1, anim.wide * 0.55)}>
                <ellipse cx={-28} cy={15} rx={surface === "mud" ? 11 : 7} ry={3} fill={smokeColor} filter="blur(2px)" />
                <ellipse cx={22} cy={15} rx={surface === "mud" ? 11 : 7} ry={3} fill={smokeColor} filter="blur(2px)" />
              </g>
            )}

            {/* Brake lights glow on wide */}
            {anim.wide > 0.6 && (
              <circle cx={-38} cy={2} r={3.5} fill="#ff3030" filter="blur(1px)" opacity={0.8} className="animate-pulse" />
            )}
          </g>

          {/* Speed readout near car */}
          <g transform={`translate(${Math.min(CAR_X + 48, 648)}, ${CAR_Y + 4})`} opacity={0.9}>
            <text fill="#F7F7F5" fontSize={7.5} fontFamily="monospace" fontWeight="bold">
              {entrySpeed} km/h
            </text>
          </g>
        </svg>

        {/* ── Analog dials overlay (top-right) ── */}
        <div className="absolute top-4 right-4 flex gap-3 bg-black/60 p-3 rounded-2xl border border-white/[0.08] backdrop-blur-sm pointer-events-none">
          {/* Lateral G dial */}
          <div className="flex flex-col items-center">
            <svg width="60" height="60" className="transform -rotate-90">
              <circle cx="30" cy="30" r="24" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
              {/* Scale arc */}
              <path
                d="M 30,6 A 24 24 0 0 1 54,30 A 24 24 0 0 1 6,30"
                fill="none" stroke="rgba(79,107,138,0.35)" strokeWidth="3"
                strokeDasharray="90" strokeDashoffset="8"
              />
              {/* Red zone arc (> 1 g) */}
              <path d="M 47,16 A 24 24 0 0 1 54,30" fill="none" stroke="rgba(200,76,49,0.55)" strokeWidth="3" />
              {/* Needle */}
              <line
                x1="30" y1="30"
                x2={30 + 22 * Math.cos((latGNeedle * Math.PI) / 180)}
                y2={30 + 22 * Math.sin((latGNeedle * Math.PI) / 180)}
                stroke="#C84C31" strokeWidth="2" strokeLinecap="round"
              />
              <circle cx="30" cy="30" r="2.5" fill="#C84C31" />
            </svg>
            <span className="text-[7.5px] font-mono text-[#9CA3AF] mt-1">
              LAT-G: {anim.latG.toFixed(2)}g
            </span>
          </div>

          {/* Grip + radius info */}
          <div className="flex flex-col items-center justify-center min-w-[44px] border-l border-white/[0.1] pl-3 gap-1">
            <span className="text-[7.5px] font-mono text-[#9CA3AF]">GRIP µ</span>
            <span
              className="text-base font-bold font-mono"
              style={{ color: ratio > 1 ? "#d97706" : "#C84C31" }}
            >
              {mu.toFixed(2)}
            </span>
            <span className="text-[7.5px] font-mono text-[#9CA3AF]">r={corner.radiusM}m</span>
          </div>
        </div>

        {/* Running HUD bottom-right */}
        {state === "running" && (
          <div className="absolute bottom-3 right-4 bg-black/60 px-3 py-1.5 rounded-lg border border-white/[0.08] text-[9px] font-mono text-[#9CA3AF] space-y-1">
            <div>
              LATERAL LOAD:{" "}
              <span className={`font-semibold ${anim.latG > mu * 9.81 / 9.81 ? "text-[#d97706]" : "text-white"}`}>
                {anim.latG.toFixed(2)}g
              </span>
            </div>
            <div>
              GRIP LIMIT: <span className="text-[#C84C31] font-semibold">{maxSpeed.toFixed(0)} km/h</span>
            </div>
          </div>
        )}

        {/* Idle overlay */}
        {state === "idle" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/35 backdrop-blur-[1.5px] z-10">
            <p className="text-secondary font-mono text-xs uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5" /> Cornering Grip Analyzer
            </p>
            <h3 className="text-xl font-bold tracking-tight text-white mb-6 uppercase text-center px-4">
              {corner.label} · r {corner.radiusM} m · {surf.label}
            </h3>
            <button
              onClick={run}
              className="px-10 py-4 bg-accent text-white font-bold text-base rounded-xl hover:scale-105 transition-transform duration-200"
            >
              TAKE THE CORNER
            </button>
          </div>
        )}
      </div>

      {/* Live stat bar below viewport */}
      <div className="flex flex-wrap gap-x-6 gap-y-1 mt-3 px-1 text-[10px] font-mono text-secondary">
        <span>
          MAX SAFE <span className="text-primary font-bold ml-1">{maxSpeed.toFixed(0)} km/h</span>
        </span>
        <span>
          YOUR ENTRY{" "}
          <span className={`font-bold ml-1 ${ratio > 1 ? "text-[#d97706]" : "text-primary"}`}>{entrySpeed} km/h</span>
        </span>
        <span>
          LATERAL G <span className="text-primary font-bold ml-1">{peakLatG.toFixed(2)}g</span>
        </span>
        <span>
          OVER LIMIT{" "}
          <span className={`font-bold ml-1 ${ratio > 1 ? "text-[#d97706]" : "text-primary"}`}>
            {ratio > 1 ? `+${((ratio - 1) * 100).toFixed(0)}%` : "0%"}
          </span>
        </span>
      </div>

      {/* Verdict + AI insight */}
      {state === "finished" && (
        <div className="grid md:grid-cols-12 gap-6 mt-4">
          <div className="md:col-span-5 space-y-4">
            <div
              className={`glass p-5 rounded-2xl border ${
                verdict.tone === "good"
                  ? "border-[#2d6a4f]/40"
                  : verdict.tone === "warn"
                  ? "border-[#d97706]/40"
                  : "border-[#C84C31]/50"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                {verdict.tone !== "good" && <AlertTriangle className="w-4 h-4 text-[#d97706]" />}
                <h4
                  className={`text-base font-bold ${
                    verdict.tone === "good"
                      ? "text-[#2d6a4f]"
                      : verdict.tone === "warn"
                      ? "text-[#d97706]"
                      : "text-[#C84C31]"
                  }`}
                >
                  {verdict.title}
                </h4>
              </div>
              <p className="text-xs text-secondary leading-relaxed">{verdict.note}</p>
              <div className="grid grid-cols-3 gap-3 mt-4 text-xs font-mono">
                <div>
                  <span className="text-[#9CA3AF] block">GRIP µ</span>
                  <span className="font-bold text-primary">{mu.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-[#9CA3AF] block">OVER LIMIT</span>
                  <span className="font-bold text-primary">
                    {ratio > 1 ? `+${((ratio - 1) * 100).toFixed(0)}%` : "0%"}
                  </span>
                </div>
                <div>
                  <span className="text-[#9CA3AF] block">KERB WT</span>
                  <span className="font-bold text-primary">{kerbWeight} kg</span>
                </div>
              </div>
            </div>
            <button
              onClick={run}
              className="w-full py-3 border border-black/10 hover:bg-black/5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-colors text-primary flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Re-run corner
            </button>
          </div>

          <div className="md:col-span-7 glass border border-[var(--accent)]/30 p-5 rounded-2xl relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--accent)]/5 blur-2xl rounded-full" />
            <div>
              <span className="text-[9px] font-mono tracking-widest text-[var(--accent)] uppercase">
                AI HANDLING LAB ADVICE
              </span>
              <h4 className="text-base font-semibold mt-1 mb-3 text-primary">Why it behaves this way</h4>
              <p className="text-xs text-secondary leading-relaxed mb-3">
                <span className="text-[var(--accent)] font-semibold">PHYSICS: </span>
                A {corner.label.toLowerCase()} of radius {corner.radiusM} m on {surf.label.toLowerCase()} allows up to{" "}
                <strong>{maxSpeed.toFixed(0)} km/h</strong> before the {kerbWeight} kg {m?.name} runs out of grip (µ ≈{" "}
                {mu.toFixed(2)}). At {entrySpeed} km/h you&apos;re demanding{" "}
                <strong>{peakLatG.toFixed(2)}g</strong> of lateral force at the apex.
              </p>
              <p className="text-xs text-secondary leading-relaxed">
                <span className="text-[var(--accent)] font-semibold">BUYING IMPACT: </span>
                {surface === "dry"
                  ? "Heavier cars and softer SUV tyres saturate earlier — lighter, sportier setups hold tighter lines. "
                  : "Low-grip surfaces slash safe corner speed dramatically; ESC and a stiffer suspension matter most here. "}
                Slow into the bend and the same car corners with composure — speed, not the car, is usually the limit.
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-black/10 flex justify-between items-center text-[10px] text-secondary">
              <span>FRICTION CIRCLE MODEL // µ·g/r</span>
              <span>DRIVESCOPE LABS</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
