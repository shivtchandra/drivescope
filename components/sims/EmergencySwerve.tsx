"use client";

import { useEffect, useRef, useState } from "react";
import { TriangleAlert, RotateCcw, ShieldCheck } from "lucide-react";
import { getBrand, getModel, getTestData, getVariant } from "@/lib/data";
import VariantSelect from "./VariantSelect";
import DriveRange from "@/components/ui/DriveRange";

type Surface = "dry" | "wet";

const SURFACES: { id: Surface; label: string; base: number }[] = [
  { id: "dry", label: "Dry tarmac", base: 0.95 },
  { id: "wet", label: "Wet road", base: 0.72 },
];

function clamp(x: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, x));
}

export default function EmergencySwerve({ initialVariant }: { initialVariant?: string }) {
  const [id, setId] = useState(initialVariant ?? "creta-sx-o-turbo-dct");
  const [surface, setSurface] = useState<Surface>("dry");
  const [approach, setApproach] = useState(70);
  const [state, setState] = useState<"idle" | "running" | "finished">("idle");
  const [anim, setAnim] = useState({ p: 0, y: 120, spin: 0, hit: false });
  const raf = useRef({ t: 0, last: 0, id: 0 });

  const v = getVariant(id);
  const m = v && getModel(v.modelId);
  const td = v && getTestData(v.id);
  const kerbWeight = v?.kerbWeight ?? 1300;
  const t100 = td?.zeroTo100.value ?? 11;
  const heightMm = m?.dimensions.heightMm ?? 1600;
  const hasEsc = v?.featureIds.includes("esc") ?? false;
  const color = m ? getBrand(m.brandId)?.color ?? "#C84C31" : "#C84C31";
  const surf = SURFACES.find((s) => s.id === surface)!;

  // Lateral grip (mirrors race grip) + transient stability factors.
  const mu = Math.max(0.3, surf.base - clamp((kerbWeight - 1200) / 1600, 0, 0.25) + (t100 < 9 ? 0.06 : 0));
  // Max stable double-lane-change speed: grip-led, penalised by tall/heavy bodies, helped by ESC.
  const heightPenalty = clamp((heightMm - 1500) / 18, 0, 12);
  const maxStable = Math.max(30, mu * 82 - heightPenalty + (hasEsc ? 7 : 0));
  const demand = approach / maxStable;

  const verdict =
    demand <= 1.0
      ? { tone: "good", title: "Clean avoidance", note: "Grip and balance are within budget — the car darts around and settles straight." }
      : demand <= 1.12
      ? hasEsc
        ? { tone: "warn", title: "ESC catches the slide", note: "The tail steps out on the return, but ESC brakes individual wheels and pulls it straight." }
        : { tone: "bad", title: "Snap oversteer", note: "The rear breaks away on the recovery and, with no ESC, the car spins." }
      : { tone: "bad", title: "Can't avoid in time", note: "The car can't change direction fast enough and clips the obstacle." };

  const run = () => {
    setState("running");
    raf.current = { t: 0, last: performance.now(), id: 0 };
    const amp = clamp(1.3 - demand * 0.45, 0.35, 1); // how fully it clears the lane
    const willHit = demand > 1.12;
    const willSpin = demand > 1.0 && !hasEsc && demand > 1.04;
    const loop = (now: number) => {
      const dt = (now - raf.current.last) / 1000;
      raf.current.last = now;
      raf.current.t += dt;
      const p = Math.min(raf.current.t / 3.2, 1);
      // Double lane change: out to lane 2, then back.
      const gate = (a: number, b: number) => clamp((p - a) / (b - a), 0, 1);
      const out = gate(0.28, 0.46) - gate(0.6, 0.8);
      let y = 120 - 40 * out * amp;
      let spin = 0;
      if (willSpin && p > 0.72) spin = (p - 0.72) * 540;
      if (willHit && p > 0.58) y = Math.min(y, 118); // failed to clear → stays in obstacle lane
      const hit = willHit && p > 0.62 && p < 0.66;
      setAnim({ p, y, spin, hit: hit || (willHit && p >= 0.62) });
      if (p >= 1) {
        setState("finished");
        return;
      }
      raf.current.id = requestAnimationFrame(loop);
    };
    raf.current.id = requestAnimationFrame(loop);
  };

  useEffect(() => () => cancelAnimationFrame(raf.current.id), []);
  useEffect(() => setState("idle"), [id, surface, approach]);

  const carX = 60 + anim.p * 600;
  const obstacleX = 430;

  return (
    <div className="glass p-6 rounded-[32px] overflow-hidden">
      <div className="grid gap-4 md:grid-cols-4 items-end mb-5">
        <VariantSelect label="Your Vehicle" value={id} onChange={setId} />
        <div className="text-sm">
          <span className="text-secondary text-xs block mb-1.5">Surface</span>
          <div className="flex rounded-xl border border-[#161616]/12 overflow-hidden">
            {SURFACES.map((s) => (
              <button
                key={s.id}
                onClick={() => setSurface(s.id)}
                className={`flex-1 px-2 py-2 text-xs transition-colors ${
                  surface === s.id ? "bg-[rgba(200,76,49,0.12)] text-primary font-semibold" : "text-secondary hover:text-primary"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <DriveRange
          label="Approach speed"
          value={approach}
          onChange={setApproach}
          min={40}
          max={130}
          step={5}
          mobileStep={10}
          format={(v) => `${v} km/h`}
          presets={[60, 80, 100]}
          presetFormat={(v) => `${v}`}
          accentClass="accent-[#C84C31]"
        />
        <div
          className={`text-xs font-mono rounded-xl border px-3 py-2.5 flex items-center gap-2 ${
            hasEsc ? "border-[#2d6a4f]/40 text-[#2d6a4f]" : "border-[#d97706]/40 text-[#d97706]"
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          {hasEsc ? "ESC fitted" : "No ESC"}
        </div>
      </div>

      <div className="relative w-full aspect-[22/8] bg-[#0A0710] rounded-2xl overflow-hidden border border-white/[0.08]">
        <div className="absolute inset-0 bg-gradient-to-b from-[#15101e] to-[#0A0710]" />
        <svg viewBox="0 0 700 200" className="absolute inset-0 w-full h-full">
          {/* two-lane road */}
          <rect x={0} y={60} width={700} height={100} fill="rgba(255,255,255,0.05)" />
          <line x1={0} y1={110} x2={700} y2={110} stroke="rgba(255,255,255,0.12)" strokeWidth={1.5} strokeDasharray="14 12" />
          <line x1={0} y1={62} x2={700} y2={62} stroke="rgba(79,107,138,0.4)" strokeWidth={1.5} />
          <line x1={0} y1={158} x2={700} y2={158} stroke="rgba(79,107,138,0.4)" strokeWidth={1.5} />

          {/* gate cones for the lane change */}
          {[350, 510].map((gx) => (
            <g key={gx}>
              <circle cx={gx} cy={70} r={3} fill="#d97706" />
              <circle cx={gx} cy={150} r={3} fill="#d97706" />
            </g>
          ))}

          {/* obstacle in lane 1 */}
          <g transform={`translate(${obstacleX}, 124)`}>
            <rect x={-14} y={-12} width={28} height={24} rx={4} fill={anim.hit ? "#ef4444" : "#8F3A28"} stroke="#C84C31" strokeWidth={1.5} />
            <text x={0} y={4} textAnchor="middle" fontSize={9} fill="#fff" fontFamily="monospace">!</text>
          </g>

          {/* car */}
          <g transform={`translate(${carX}, ${anim.y}) rotate(${anim.spin})`}>
            <rect x={-15} y={-8} width={30} height={16} rx={4} fill={color} stroke="rgba(0,0,0,0.3)" strokeWidth={1} />
            <rect x={4} y={-5} width={8} height={10} rx={2} fill="rgba(0,0,0,0.35)" />
          </g>
        </svg>

        <div className="absolute top-3 left-3 bg-black/55 rounded-xl border border-white/[0.08] px-3 py-2 backdrop-blur-sm pointer-events-none">
          <div className="flex gap-4 text-[10px] font-mono text-[#9CA3AF]">
            <div>
              <span className="block">STABLE UP TO</span>
              <span className="text-sm font-bold text-white">{maxStable.toFixed(0)} km/h</span>
            </div>
            <div>
              <span className="block">APPROACH</span>
              <span className={`text-sm font-bold ${demand > 1 ? "text-[#d97706]" : "text-white"}`}>{approach} km/h</span>
            </div>
          </div>
        </div>

        {state === "idle" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/35 backdrop-blur-[1.5px] z-10">
            <p className="text-secondary font-mono text-xs uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <TriangleAlert className="w-3.5 h-3.5" /> Emergency Swerve (Moose Test)
            </p>
            <h3 className="text-lg font-bold tracking-tight text-white mb-5 uppercase">Avoid the obstacle at {approach} km/h</h3>
            <button onClick={run} className="px-10 py-4 bg-accent text-white font-bold text-base rounded-xl hover:scale-105 transition-transform duration-200">
              RUN THE SWERVE
            </button>
          </div>
        )}
      </div>

      {state === "finished" && (
        <div className="grid md:grid-cols-12 gap-6 mt-6">
          <div className="md:col-span-5 space-y-4">
            <div
              className={`glass p-5 rounded-2xl border ${
                verdict.tone === "good" ? "border-[#2d6a4f]/40" : verdict.tone === "warn" ? "border-[#d97706]/40" : "border-[#C84C31]/50"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                {verdict.tone !== "good" && <TriangleAlert className="w-4 h-4 text-[#d97706]" />}
                <h4
                  className={`text-base font-bold ${
                    verdict.tone === "good" ? "text-[#2d6a4f]" : verdict.tone === "warn" ? "text-[#d97706]" : "text-[#C84C31]"
                  }`}
                >
                  {verdict.title}
                </h4>
              </div>
              <p className="text-xs text-secondary leading-relaxed">{verdict.note}</p>
            </div>
            <button
              onClick={run}
              className="w-full py-3 border border-black/10 hover:bg-black/5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-colors text-primary flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Re-run swerve
            </button>
          </div>
          <div className="md:col-span-7 glass border border-[var(--accent)]/30 p-5 rounded-2xl">
            <span className="text-[9px] font-mono tracking-widest text-[var(--accent)] uppercase">AI SAFETY LAB ADVICE</span>
            <h4 className="text-base font-semibold mt-1 mb-3 text-primary">Why it reacts this way</h4>
            <p className="text-xs text-secondary leading-relaxed mb-3">
              <span className="text-[var(--accent)] font-semibold">PHYSICS: </span>
              At {kerbWeight} kg and {heightMm} mm tall on {surf.label.toLowerCase()} (µ ≈ {mu.toFixed(2)}), the {m?.name} stays
              composed through a sudden double lane-change up to about <strong>{maxStable.toFixed(0)} km/h</strong>. Taller, heavier
              bodies roll more and reach that limit sooner.
            </p>
            <p className="text-xs text-secondary leading-relaxed">
              <span className="text-[var(--accent)] font-semibold">BUYING IMPACT: </span>
              {hasEsc
                ? "ESC (electronic stability control) is fitted here — it brakes individual wheels to catch the slide and is the single biggest reason modern cars survive this test."
                : "This variant lacks ESC, so a fast swerve can spin it. If you drive on highways, prioritise a trim with ESC."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
