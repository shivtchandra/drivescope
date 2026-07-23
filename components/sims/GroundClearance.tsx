"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, ShieldAlert, Sparkles } from "lucide-react";
import { getBrand, getModel, getVariant } from "@/lib/data";
import { SCENE_COLORS } from "@/components/understanding/scenes/shared/sceneTokens";
import VariantSelect from "./VariantSelect";
import DriveRange from "@/components/ui/DriveRange";
import { CAR_IMAGE_MAP } from "@/lib/carImageMap";

export default function GroundClearance({ initialVariant }: { initialVariant?: string }) {
  const [id, setId] = useState(initialVariant ?? "creta-sx-o-turbo-dct");
  const [breakerHeight, setBreakerHeight] = useState<number>(150); // mm
  const [payload, setPayload] = useState<number>(75); // kg
  const [state, setState] = useState<"idle" | "running" | "finished">("idle");
  const [slowMo, setSlowMo] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);

  const [loadedImage, setLoadedImage] = useState<HTMLImageElement | null>(null);
  const stateRef = useRef({ t: 0, last: 0, raf: 0 });
  const slowMoRef = useRef(false);
  slowMoRef.current = slowMo;

  const v = getVariant(id);
  const m = v && getModel(v.modelId);

  // Ground Clearance dynamic physics
  const baseGC = m?.dimensions.groundClearanceMm ?? 190;
  // Suspension compression: 0.06mm drop per kg of payload
  const suspensionCompression = Math.round(payload * 0.06);
  const effectiveGC = baseGC - suspensionCompression;
  const clears = effectiveGC >= breakerHeight;

  useEffect(() => {
    if (!m) return;
    const url = CAR_IMAGE_MAP[m.id];
    if (url) {
      setLoadedImage(null);
      const img = new Image();
      img.src = url;
      img.onload = () => setLoadedImage(img);
      img.onerror = () => setLoadedImage(null);
    } else {
      setLoadedImage(null);
    }
  }, [id, m]);

  // Animation parameters
  const [simState, setSimState] = useState({
    carX: -130,
    yFrontWheel: 150,
    yRearWheel: 150,
    frontLift: 0,
    rearLift: 0,
    isScraping: false,
  });

  const runGC = () => {
    setState("running");
    setElapsedTime(0);
    stateRef.current = { t: 0, last: performance.now(), raf: 0 };

    const breakerCenterX = 350;
    const breakerRadius = 80;
    // 1mm = 0.22px coordinate scale
    const scale = 0.22;
    const breakerPeakPx = breakerHeight * scale;

    const getBumpHeight = (x: number) => {
      if (x < breakerCenterX - breakerRadius || x > breakerCenterX + breakerRadius) {
        return 0;
      }
      const pct = (x - breakerCenterX) / breakerRadius;
      return breakerPeakPx * (1 - pct * pct);
    };

    const loop = (now: number) => {
      const dt = ((now - stateRef.current.last) / 1000) * (slowMoRef.current ? 0.25 : 1);
      stateRef.current.last = now;
      stateRef.current.t += dt;
      const t = stateRef.current.t;
      setElapsedTime(t);

      // Car drives from left to right (x= -100 to x=800) over 6 seconds
      const climbDuration = 6.0;
      const progress = Math.min(t / climbDuration, 1);
      const currentX = -100 + progress * 900;

      // Wheel centers relative to car center (wheelbase scale)
      const xFront = currentX + 75;
      const xRear = currentX - 75;

      const frontLift = getBumpHeight(xFront);
      const rearLift = getBumpHeight(xRear);

      const yFrontWheel = 150 - 18 - frontLift;
      const yRearWheel = 150 - 18 - rearLift;

      const midY = (yFrontWheel + yRearWheel) / 2;
      const clearancePx = effectiveGC * scale;
      const underbodyY = midY + 18 - clearancePx;

      const centerBumpHeight = getBumpHeight(currentX);
      const centerBumpY = 150 - centerBumpHeight;

      const scrapeAmount = underbodyY - centerBumpY; // positive = scraping
      const isScraping = scrapeAmount > 0;

      setSimState({
        carX: currentX,
        yFrontWheel,
        yRearWheel,
        frontLift,
        rearLift,
        isScraping,
      });

      if (t >= climbDuration) {
        setState("finished");
        cancelAnimationFrame(stateRef.current.raf);
        return;
      }

      stateRef.current.raf = requestAnimationFrame(loop);
    };

    stateRef.current.raf = requestAnimationFrame(loop);
  };

  useEffect(() => {
    return () => cancelAnimationFrame(stateRef.current.raf);
  }, []);

  const aiExplanation = () => {
    if (!v || !m) return null;
    let interpretation = "";
    let buyingAdvice = "";

    const compressionText = suspensionCompression > 0 
      ? `, dropping by ${suspensionCompression}mm to ${effectiveGC}mm under your ${payload}kg payload`
      : "";

    interpretation = `Standard clearance is ${baseGC}mm${compressionText}. Crossing a ${breakerHeight}mm speed breaker leaves a dynamic margin of ${clears ? `+${(effectiveGC - breakerHeight)}mm (Safe)` : `${(effectiveGC - breakerHeight)}mm (Will Scrape)`}.`;
    
    if (clears) {
      buyingAdvice = `This variant clears the selected speed breaker safely. SUVs with clearance above 180mm are highly suited for standard Indian speed breakers, city basements, and potholed monsoon roads.`;
    } else {
      buyingAdvice = `Warning: This configuration will likely scrape the underbody center. Sedans or low-slung variants (clearance < 165mm) fully loaded with 4 passengers must be driven diagonally ("crab crawl") and extremely slowly over high breakers to avoid oil sump or exhaust damage.`;
    }

    return {
      interpretation,
      buyingAdvice,
    };
  };

  const explain = aiExplanation();

  // Perspective calculation for car body Y translation and pitch angle
  const midY = (simState.yFrontWheel + simState.yRearWheel) / 2;
  const carAngle = Math.atan2(simState.yFrontWheel - simState.yRearWheel, 150);
  const scale = 0.22;
  const breakerPeakPx = breakerHeight * scale;
  const breakerCenterX = 350;
  const breakerRadius = 80;
  const centerBumpHeight = simState.carX > breakerCenterX - breakerRadius && simState.carX < breakerCenterX + breakerRadius
    ? breakerPeakPx * (1 - Math.pow((simState.carX - breakerCenterX) / breakerRadius, 2))
    : 0;

  const clearancePx = effectiveGC * scale;
  const underbodyY = midY + 18 - clearancePx;
  const centerBumpY = 150 - centerBumpHeight;
  const scrapeAmount = underbodyY - centerBumpY;
  const isScrapingNow = scrapeAmount > 0;
  const liftAmount = isScrapingNow ? scrapeAmount : 0;
  const adjustedMidY = midY - liftAmount;
  const adjustedUnderbodyY = underbodyY - liftAmount;

  // Sparks spray
  const sparks = isScrapingNow
    ? Array.from({ length: 8 }).map((_, i) => {
        const seed = Math.sin(elapsedTime * 60 + i * 12);
        const angle = -Math.PI / 2 + seed * (Math.PI / 4);
        const speed = 10 + Math.abs(Math.cos(elapsedTime * 40 + i)) * 25;
        return {
          dx: Math.cos(angle) * speed * 0.4,
          dy: Math.sin(angle) * speed * 0.4,
        };
      })
    : [];

  return (
    <div className="glass p-6 rounded-[32px] overflow-hidden">
      
      {/* ── CONTEXT CONFIGURATOR ── */}
      <div className="grid gap-4 md:grid-cols-4 items-end mb-6">
        <VariantSelect
          label="Your Vehicle"
          value={id}
          onChange={(x) => {
            setState("idle");
            setId(x);
          }}
        />
        
        <DriveRange
          label="Obstacle Height"
          value={breakerHeight}
          onChange={(v) => { setState("idle"); setBreakerHeight(v); }}
          min={100}
          max={200}
          step={10}
          format={(v) => `${v} mm`}
          presets={[120, 150, 180]}
          presetFormat={(v) => `${v}mm`}
          accentClass="accent-[#C84C31]"
        />

        <DriveRange
          label="Payload (Cabin Weight)"
          value={payload}
          onChange={(v) => { setState("idle"); setPayload(v); }}
          min={0}
          max={400}
          step={50}
          format={(v) => `${v} kg`}
          presets={[0, 150, 300]}
          presetFormat={(v) => `${v}kg`}
          accentClass="accent-[#C84C31]"
        />

        <div className="text-secondary text-xs font-mono">
          SUSPENSION COMPRESSION: <span className="text-warning font-semibold font-sans">-{suspensionCompression} mm</span>
        </div>
      </div>

      {/* ── SIMULATION VIEWPORT ── */}
      <div className="relative w-full aspect-[22/8] bg-[#0A0710] rounded-2xl overflow-hidden border border-white/[0.08]">
        {/* Sky */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0e0c1f] via-[#09060d] to-[#0A0710] opacity-90" />
        
        <svg viewBox="0 0 700 200" className="absolute inset-0 w-full h-full">
          {/* Grid annotations */}
          <g opacity={0.2} fill={SCENE_COLORS.secondary} className="font-mono text-[7px]">
            <text x="10" y="20">GC UNDERBODY SCRAPE INTEGRATOR</text>
            <text x="10" y="30">ROAD HEIGHT BASELINE: 150px</text>
          </g>

          {/* Road */}
          <line x1="5" y1="150" x2="695" y2="150" stroke="rgba(79, 107, 138, 0.3)" strokeWidth={1.5} />
          
          {/* Speed Breaker Shape */}
          <path
            d={`M ${breakerCenterX - breakerRadius},150 Q ${breakerCenterX},${150 - breakerPeakPx} ${breakerCenterX + breakerRadius},150`}
            fill="#141416"
            stroke="rgba(79, 107, 138, 0.4)"
            strokeWidth={1.5}
          />
          
          {/* Breaker Dimension Flag */}
          <line x1={breakerCenterX} y1={150} x2={breakerCenterX} y2={150 - breakerPeakPx} stroke="rgba(79, 107, 138, 0.25)" strokeWidth={1} strokeDasharray="2 2" />
          <text x={breakerCenterX + 5} y={150 - breakerPeakPx + 10} fill={SCENE_COLORS.secondary} fontSize={7.5} fontFamily="monospace" opacity={0.8}>
            {breakerHeight}mm Breaker
          </text>

          {/* Dynamic scrape indicator arrow */}
          {state === "running" && isScrapingNow && (
            <g transform={`translate(${simState.carX}, ${150 - centerBumpHeight})`}>
              {sparks.map((s, idx) => (
                <line
                  key={idx}
                  x1={0}
                  y1={0}
                  x2={s.dx}
                  y2={s.dy}
                  stroke={idx % 2 === 0 ? "#FFD700" : SCENE_COLORS.accent}
                  strokeWidth={1.5}
                  strokeLinecap="round"
                />
              ))}
            </g>
          )}

          {/* Car profile */}
          <g transform={`translate(${simState.carX}, ${adjustedMidY}) rotate(${(carAngle * 180) / Math.PI}, 0, 0)`}>
            {/* Car body vector (Clearance specific) */}
            <path
              d={`M -90,${18 - clearancePx} 
                 L -78,${18 - clearancePx} 
                 Q -58,-18 -38,${18 - clearancePx} 
                 L 38,${18 - clearancePx} 
                 Q 58,-18 78,${18 - clearancePx} 
                 L 95,${18 - clearancePx} 
                 L 97,-8 
                 Q 95,-16 78,-18 
                 L 55,-20 
                 L 28,-42 
                 Q 24,-44 -20,-44 
                 L -50,-21 
                 L -85,-20 
                 Z`}
              fill="none"
              stroke={isScrapingNow ? SCENE_COLORS.accent : "rgba(79, 107, 138, 0.6)"}
              strokeWidth={1.5}
            />

            {/* Glowing underbody panel when scraping */}
            {isScrapingNow && (
              <path
                d={`M -30,${18 - clearancePx} L 30,${18 - clearancePx}`}
                stroke="#C84C31"
                strokeWidth={2.5}
                opacity={0.8}
              />
            )}

            {/* Rear Wheel (Translates around rear axle) */}
            <g transform="translate(-58, 0) rotate(0)">
              <circle cx={0} cy={0} r={15} fill="#0F0F11" stroke="rgba(79, 107, 138, 0.7)" strokeWidth={1} />
              <line x1={-15} y1={0} x2={15} y2={0} stroke="rgba(79, 107, 138, 0.4)" strokeWidth={0.5} />
              <line x1={0} y1={-15} x2={0} y2={15} stroke="rgba(79, 107, 138, 0.4)" strokeWidth={0.5} />
            </g>
            {/* Front Wheel (Translates around front axle) */}
            <g transform="translate(58, 0) rotate(0)">
              <circle cx={0} cy={0} r={15} fill="#0F0F11" stroke="rgba(79, 107, 138, 0.7)" strokeWidth={1} />
              <line x1={-15} y1={0} x2={15} y2={0} stroke="rgba(79, 107, 138, 0.4)" strokeWidth={0.5} />
              <line x1={0} y1={-15} x2={0} y2={15} stroke="rgba(79, 107, 138, 0.4)" strokeWidth={0.5} />
            </g>
          </g>

          {/* Dynamic real-time clearances measurement labels */}
          {state === "running" && Math.abs(simState.carX - breakerCenterX) < 50 && (
            <g>
              {clears ? (
                <g>
                  <line x1={breakerCenterX} y1={centerBumpY} x2={breakerCenterX} y2={adjustedUnderbodyY} stroke="#4F6B8A" strokeWidth={1.25} />
                  <text x={breakerCenterX + 8} y={(centerBumpY + adjustedUnderbodyY)/2 + 3} fill="#4F6B8A" fontSize={8} fontFamily="monospace">
                    +{(effectiveGC - breakerHeight)}mm clear
                  </text>
                </g>
              ) : (
                <g>
                  <rect x={breakerCenterX - 55} y={centerBumpY - 36} width={110} height={20} rx={2} fill="rgba(200, 76, 49, 0.15)" stroke="#C84C31" strokeWidth={0.5} />
                  <text x={breakerCenterX} y={centerBumpY - 24} fill="#C84C31" fontSize={8} fontFamily="monospace" textAnchor="middle" fontWeight="bold">
                    SCRAPE DELTA: {(breakerHeight - effectiveGC)}mm
                  </text>
                </g>
              )}
            </g>
          )}
        </svg>

        {/* ── IDLE STATE SCREEN ── */}
        {state === "idle" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/35 backdrop-blur-[1.5px] z-10">
            <p className="text-secondary font-mono text-xs uppercase tracking-widest mb-3 flex items-center gap-1.5"><ShieldAlert className="w-3.5 h-3.5 text-secondary" /> Underbody Impact Engine</p>
            <h3 className="text-xl font-bold tracking-tight text-white mb-6 uppercase">
              GC DEMO: {effectiveGC}mm EFFECTIVE CLEARANCE vs {breakerHeight}mm BREAKER
            </h3>
            <button
              onClick={runGC}
              className="px-10 py-4 bg-accent text-white font-bold text-base rounded-xl hover:scale-105 transition-transform duration-200 flex items-center gap-2"
            >
              <AlertTriangle className="w-4 h-4 text-white" />
              RUN CLEARANCE CHECK
            </button>
          </div>
        )}
      </div>

      {/* ── STATS & AI INSIGHTS ── */}
      {state === "finished" && explain && (
        <div className="grid md:grid-cols-12 gap-6 mt-6 animate-fade-in">
          {/* Numerical readout (col-span-5) */}
          <div className="md:col-span-5 space-y-4">
            <div className="glass p-5 rounded-2xl space-y-4">
              <h4 className="text-xs font-semibold tracking-tight text-[var(--accent)] uppercase font-mono">
                CLEARANCE DISSENT
              </h4>
              
              <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                <div>
                  <span className="text-[#9CA3AF] block">FACTORY SPEC GC</span>
                  <span className="text-base font-bold text-white">{baseGC} mm</span>
                </div>
                 <div>
                  <span className="text-[#9CA3AF] block">LOADED GC</span>
                  <span className="text-base font-bold text-[#C84C31]">{effectiveGC} mm</span>
                </div>
                <div>
                  <span className="text-[#9CA3AF] block">TARGET OBSTACLE</span>
                  <span className="text-base font-bold text-white">{breakerHeight} mm</span>
                </div>
                <div>
                  <span className="text-[#9CA3AF] block">CLEARANCE VERDICT</span>
                  <span className={`text-base font-bold uppercase ${clears ? "text-[#4F6B8A]" : "text-[#C84C31]"}`}>
                    {clears ? "Safe Pass" : "Will Scrape"}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={runGC}
              className="w-full py-3 border border-black/10 hover:bg-black/5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-colors text-primary"
            >
              Re-run Simulator
            </button>
          </div>

          {/* AI Explanation Box (col-span-7) */}
          <div className="md:col-span-7 glass border border-[var(--accent)]/30 p-5 rounded-2xl relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--accent)]/5 blur-2xl rounded-full" />
            <div>
              <span className="text-[9px] font-mono tracking-widest text-[var(--accent)] uppercase">AI BODY DESIGN ADVICE</span>
              <h4 className="text-base font-semibold mt-1 mb-3 text-primary">How body clearance impacts daily ownership</h4>
              
              <p className="text-xs text-secondary leading-relaxed mb-3">
                <span className="text-[var(--accent)] font-semibold">DYNAMICS: </span>
                {explain.interpretation}
              </p>
              <p className="text-xs text-secondary leading-relaxed">
                <span className="text-[var(--accent)] font-semibold">BUYING IMPACT: </span>
                {explain.buyingAdvice}
              </p>
            </div>
            
            <div className="mt-4 pt-4 border-t border-black/10 flex justify-between items-center text-[10px] text-secondary">
              <span>SUSPENSION COMPRESSION GEOMETRY</span>
              <span>DRIVESCOPE LABS</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
