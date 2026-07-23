"use client";

import { useEffect, useRef, useState } from "react";
import { Compass, Gauge, TrendingUp } from "lucide-react";
import { getBrand, getModel, getTestData, getVariant } from "@/lib/data";
import { SCENE_COLORS } from "@/components/understanding/scenes/shared/sceneTokens";
import VariantSelect from "./VariantSelect";
import DriveRange from "@/components/ui/DriveRange";
import { CAR_IMAGE_MAP } from "@/lib/carImageMap";

export default function HillClimb({ initialVariant }: { initialVariant?: string }) {
  const [id, setId] = useState(initialVariant ?? "creta-sx-o-turbo-dct");
  const [incline, setIncline] = useState<number>(15); // degrees
  const [payload, setPayload] = useState<number>(250); // kg (passengers + luggage)
  const [state, setState] = useState<"idle" | "running" | "finished">("idle");
  
  const [loadedImage, setLoadedImage] = useState<HTMLImageElement | null>(null);
  const stateRef = useRef({ t: 0, last: 0, raf: 0 });
  
  const v = getVariant(id);
  const m = v && getModel(v.modelId);

  // Engine Spec details
  const isTurbo = v?.engine.turbo ?? false;
  const isEv = v?.fuel === "ev";
  const isHybrid = v?.hybrid === "strong";
  const maxPs = v?.engine.ps ?? 115;
  const maxNm = v?.engine.nm ?? 144;
  const trans = v?.transmission ?? "MT";
  const kerbWeight = v?.kerbWeight ?? 1300;
  const totalWeight = kerbWeight + payload;

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

  const [simState, setSimState] = useState({
    carX: 80,
    carY: 150,
    rpm: 800,
    boost: 0,
    gear: "N",
    speed: 0,
  });

  const runClimb = () => {
    setState("running");
    stateRef.current = { t: 0, last: performance.now(), raf: 0 };

    const targetSpeed = isEv ? 65 : isTurbo ? 60 : isHybrid ? 58 : 50; // NA engines struggle more on steep climbs

    const loop = (now: number) => {
      const dt = (now - stateRef.current.last) / 1000;
      stateRef.current.last = now;
      stateRef.current.t += dt;
      const t = stateRef.current.t;

      // Position along incline
      const climbDuration = 6.0;
      const progress = Math.min(t / climbDuration, 1);
      
      const startX = 80;
      const endX = 480;
      const currentX = startX + progress * (endX - startX);
      
      // Slope Y formula (slopes up to the right)
      // angle is incline. slope = Math.tan(incline * Math.PI / 180)
      const slope = Math.tan((incline * Math.PI) / 180);
      const currentY = 160 - (currentX - startX) * slope * 0.9;

      // Real-time speed build-up
      const currentSpeed = Math.min(targetSpeed, (t / 1.5) * targetSpeed);

      // RPM, Boost, Gear shifting dynamics
      let rpm = 800;
      let boost = 0;
      let gear = "D1";

      if (isEv) {
        // EV: Single-speed reduction, no gears, RPM scales with speed
        rpm = 800 + progress * 3200;
        boost = 0.3 + (incline / 20) * 0.5 + (payload / 400) * 0.15; // motor effort
        gear = "1ST";
      } else if (isHybrid) {
        // Strong Hybrid: CVT transitions, steady RPM
        rpm = 1500 + (incline / 20) * 1200 + (payload / 400) * 800;
        boost = 0.1; // battery takes load
        gear = "eCVT";
      } else if (isTurbo) {
        // Turbocharged Engine: low-mid range torque, holds gears better
        boost = 0.5 + (incline / 20) * 0.8 + (payload / 400) * 0.2; // turbo spooling
        if (progress < 0.25) {
          gear = "D1";
          rpm = 1500 + progress * 1500;
        } else if (progress >= 0.25 && progress < 0.6) {
          gear = "D2";
          rpm = 1800 + (progress - 0.25) * 1200;
        } else {
          gear = "D3";
          rpm = 2000 + (progress - 0.6) * 800;
        }
      } else {
        // Naturally Aspirated: Needs to rev high, drops gears
        boost = 0;
        if (progress < 0.3) {
          gear = "D1";
          rpm = 1800 + progress * 3200;
        } else if (progress >= 0.3 && progress < 0.75) {
          // drops back to D1 or struggles in D2
          gear = incline > 14 ? "D1" : "D2";
          rpm = incline > 14 ? 3800 : 2600 + (progress - 0.3) * 1800;
        } else {
          gear = incline > 14 ? "D1" : "D2";
          rpm = incline > 14 ? 4400 : 3400;
        }
      }

      setSimState({
        carX: currentX,
        carY: currentY,
        rpm,
        boost,
        gear,
        speed: currentSpeed,
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

    const loadDesc = payload > 300 ? "fully loaded" : payload > 150 ? "moderately loaded" : "lightly loaded";
    
    if (isEv) {
      interpretation = `The electric drivetrain delivers instant peak torque (${maxNm} Nm) directly to the wheels. There are no gears to downshift, allowing a smooth, silent climb at ${simState.speed.toFixed(0)} km/h.`;
      buyingAdvice = `EVs are unmatched on steep basement ramps and mountain hairpins. Zero gear search means the driver feels no struggle, and there's no rollback lag.`;
    } else if (isHybrid) {
      interpretation = `The strong hybrid powertrain combines electric propulsion with engine assist, mediated by e-CVT. Engine effort is optimized, revving steadily around ${Math.round(simState.rpm)} RPM.`;
      buyingAdvice = `Highly efficient. The electric motor absorbs the initial gravity drag, preventing the engine from revving loudly unless the incline is extremely steep.`;
    } else if (isTurbo) {
      interpretation = `With turbo boost peaking at ${simState.boost.toFixed(1)} bar, the engine develops peak torque (${maxNm} Nm) early in the rev range. It holds ${simState.gear} gear comfortably.`;
      buyingAdvice = `Turbocharged engines (whether DCT or MT) maintain high gear ratios and low RPMs on slopes. This means less cabin noise and plenty of power in reserve for overtaking on winding mountain roads.`;
    } else {
      interpretation = `Naturally aspirated engine runs out of breath. Lacking turbo help, the engine must drop to ${simState.gear} and rev high (above ${Math.round(simState.rpm)} RPM) to sustain climb velocity.`;
      buyingAdvice = `NA engines require manual downshifting and create noticeable cabin noise when climbing flyovers or mountain roads with a full family load. If you travel regularly in hilly regions, look for a turbo or hybrid option.`;
    }

    return {
      interpretation,
      buyingAdvice,
    };
  };

  const explain = aiExplanation();
  const rpmAngle = -140 + (simState.rpm / 8000) * 280;
  const boostAngle = -140 + Math.min(1.5, simState.boost) * 180;

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
          label="Incline Angle"
          value={incline}
          onChange={(v) => { setState("idle"); setIncline(v); }}
          min={10}
          max={22}
          step={1}
          format={(v) => `${v}°`}
          presets={[12, 15, 20]}
          presetFormat={(v) => `${v}°`}
          accentClass="accent-[#C84C31]"
        />

        <DriveRange
          label="Cabin Payload (Load)"
          value={payload}
          onChange={(v) => { setState("idle"); setPayload(v); }}
          min={75}
          max={450}
          step={25}
          mobileStep={50}
          format={(v) => `${v} kg`}
          presets={[100, 200, 350]}
          presetFormat={(v) => `${v}kg`}
          accentClass="accent-[#C84C31]"
        />

        <div className="text-[#9CA3AF] text-xs font-mono">
          WEIGHT EST: <span className="text-[#C84C31] font-semibold font-sans">{totalWeight} kg</span>
        </div>
      </div>

      {/* ── SIMULATION VIEWPORT ── */}
      <div className="relative w-full aspect-[22/8] bg-[#0A0710] rounded-2xl overflow-hidden border border-white/[0.08]">
        {/* Sky */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#1b1424] via-[#100b1a] to-[#0A0710] opacity-90" />
        
        <svg viewBox="0 0 700 200" className="absolute inset-0 w-full h-full">
          {/* Mountain Incline Road line */}
          {/* Starts flat, then slopes upwards */}
          <path
            d={`M 0,160 L 80,160 L 600,${160 - 520 * Math.tan((incline * Math.PI) / 180) * 0.9} L 700,${160 - 520 * Math.tan((incline * Math.PI) / 180) * 0.9}`}
            fill="none"
            stroke={SCENE_COLORS.roadLine}
            strokeWidth={2}
          />
          <path
            d={`M 0,161 L 80,161 L 600,${161 - 520 * Math.tan((incline * Math.PI) / 180) * 0.9} L 700,${161 - 520 * Math.tan((incline * Math.PI) / 180) * 0.9}`}
            fill="none"
            stroke="rgba(79, 107, 138, 0.15)"
            strokeWidth={12}
          />

          {/* Mountains Silhouette in background */}
          <path d="M 100,100 L 220,40 L 320,80 L 450,20 L 580,70 L 700,40 L 700,180 L 0,180 Z" fill="rgba(79,107,138,0.03)" stroke="none" />

          {/* Car profile */}
          <g
            transform={`translate(${simState.carX}, ${simState.carY}) rotate(${-incline * 0.8}, 0, 0)`}
          >
            {loadedImage ? (
              <image
                href={loadedImage.src}
                x={-42}
                y={-14}
                width={84}
                height={30}
                preserveAspectRatio="xMidYMidMeet"
              />
            ) : (
              // Stylized car profile outline
              <path
                d="M -36,10 L -36,2 C -36,-2 -32,-7 -22,-7 L 4,-7 C 12,-7 18,-3 28,2 L 36,8 C 38,9 39,12 36,14 L -36,14 Z"
                fill="none"
                stroke={v ? getBrand(m!.brandId)!.color : "#4F6B8A"}
                strokeWidth={1.5}
              />
            )}

            {/* Exhaust Smoke (more dense if engine is revving hard/high payload) */}
            {state === "running" && !isEv && (
              <g opacity={(simState.rpm / 6000) * 0.8}>
                <ellipse cx={-46} cy={8} rx={simState.rpm > 3500 ? 8 : 4} ry={simState.rpm > 3500 ? 5 : 2} fill="#7F7F7F" filter="blur(2px)" />
              </g>
            )}
          </g>

          {/* Real-time speed indicator floating near car */}
          <g transform={`translate(${simState.carX + 48}, ${simState.carY + 2})`} opacity={0.9}>
            <text fill="#F7F7F5" fontSize={7.5} fontFamily="monospace" fontWeight="bold">
              {simState.speed.toFixed(0)} km/h
            </text>
          </g>
        </svg>

        {/* ── ANALOG DIALS (RPM & BOOST) OVERLAYS ── */}
        <div className="absolute top-4 right-4 flex gap-4 bg-black/60 p-3 rounded-2xl border border-white/[0.08] backdrop-blur-sm pointer-events-none">
          {/* RPM Dial */}
          <div className="flex flex-col items-center">
            <svg width="60" height="60" className="transform -rotate-90">
              <circle cx="30" cy="30" r="24" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
              <path
                d="M 30,6 A 24 24 0 0 1 54,30 A 24 24 0 0 1 30,54"
                fill="none"
                stroke="rgba(79, 107, 138, 0.4)"
                strokeWidth="3"
                strokeDasharray="90"
                strokeDashoffset="20"
              />
              {/* Needle */}
              <line
                x1="30"
                y1="30"
                x2={30 + 22 * Math.cos((rpmAngle * Math.PI) / 180)}
                y2={30 + 22 * Math.sin((rpmAngle * Math.PI) / 180)}
                stroke="#C84C31"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            <span className="text-[7.5px] font-mono text-[#9CA3AF] mt-1">RPM: {Math.round(simState.rpm)}</span>
          </div>

          {/* Boost Dial (Hidden for EVs) */}
          {!isEv && (
            <div className="flex flex-col items-center">
              <svg width="60" height="60" className="transform -rotate-90">
                <circle cx="30" cy="30" r="24" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
                <path
                  d="M 30,6 A 24 24 0 0 1 54,30"
                  fill="none"
                  stroke="rgba(200, 76, 49, 0.4)"
                  strokeWidth="3"
                />
                {/* Needle */}
                <line
                  x1="30"
                  y1="30"
                  x2={30 + 22 * Math.cos((boostAngle * Math.PI) / 180)}
                  y2={30 + 22 * Math.sin((boostAngle * Math.PI) / 180)}
                  stroke="#C84C31"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              <span className="text-[7.5px] font-mono text-[#9CA3AF] mt-1">BOOST: {simState.boost.toFixed(1)} bar</span>
            </div>
          )}

          {/* Gear Readout */}
          <div className="flex flex-col items-center justify-center min-w-[32px] border-l border-white/[0.1] pl-3">
            <span className="text-[7.5px] font-mono text-[#9CA3AF]">GEAR</span>
            <span className="text-xl font-bold font-mono text-[#C84C31]">{simState.gear}</span>
          </div>
        </div>

        {/* ── IDLE / INITIAL STATE SCREEN ── */}
        {state === "idle" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/35 backdrop-blur-[1.5px] z-10">
            <p className="text-secondary font-mono text-xs uppercase tracking-widest mb-3 flex items-center gap-1.5"><Compass className="w-3.5 h-3.5 text-secondary" /> Gradeability Analyzer</p>
            <h3 className="text-xl font-bold tracking-tight text-white mb-6 uppercase">
              HILL CLIMB: {incline}° INCLINE ({payload}kg LOAD)
            </h3>
            <button
              onClick={runClimb}
              className="px-10 py-4 bg-accent text-white font-bold text-base rounded-xl hover:scale-105 transition-transform duration-200 flex items-center gap-2"
            >
              <TrendingUp className="w-4 h-4 text-white" />
              LAUNCH CLIMB TEST
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
                ENGINE SPEC telemetries
              </h4>
              
              <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                <div>
                  <span className="text-[#9CA3AF] block">PEAK POWER</span>
                  <span className="text-base font-bold text-white">{maxPs} PS</span>
                </div>
                <div>
                  <span className="text-[#9CA3AF] block">PEAK TORQUE</span>
                  <span className="text-base font-bold text-white">{maxNm} Nm</span>
                </div>
                <div>
                  <span className="text-[#9CA3AF] block">TRANSMISSION</span>
                  <span className="text-base font-bold text-white">{trans}</span>
                </div>
                <div>
                  <span className="text-[#9CA3AF] block">ENGINE STYLE</span>
                  <span className="text-base font-bold text-white">{isTurbo ? "Turbocharged" : isEv ? "Electric" : isHybrid ? "Strong Hybrid" : "Nat. Aspirated"}</span>
                </div>
              </div>
            </div>

            <button
              onClick={runClimb}
              className="w-full py-3 border border-black/10 hover:bg-black/5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-colors text-primary"
            >
              Re-run Climb
            </button>
          </div>

          {/* AI Explanation Box (col-span-7) */}
          <div className="md:col-span-7 glass border border-[var(--accent)]/30 p-5 rounded-2xl relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--accent)]/5 blur-2xl rounded-full" />
            <div>
              <span className="text-[9px] font-mono tracking-widest text-[var(--accent)] uppercase">AI ENGINE LAB ADVICE</span>
              <h4 className="text-base font-semibold mt-1 mb-3 text-primary">How this engine climbs</h4>
              
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
              <span>GRADE FORCE MODEL // torque-RPM maps</span>
              <span>DRIVESCOPE LABS</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
