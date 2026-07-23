"use client";

import { useEffect, useRef, useState } from "react";
import { Zap, Timer, Gauge } from "lucide-react";
import { getModel, getTestData, getVariant, formatLakh } from "@/lib/data";
import { getSimComparisonColor } from "@/lib/simCarColors";
import { distanceAt, downloadCanvasPng, speedAt, KMH_TO_MS } from "@/lib/sim";
import EstimatedBadge from "@/components/EstimatedBadge";
import VariantSelect from "./VariantSelect";
import { CAR_IMAGE_MAP } from "@/lib/carImageMap";
import { SCENE_COLORS } from "@/components/understanding/scenes/shared/sceneTokens";

interface Racer {
  variantId: string;
  label: string;
  shortLabel: string;
  slot: number;
  color: string;
  t100: number;
  estimated: boolean;
  modelId: string;
  transmission: string;
  powerPs: number;
  torqueNm: number;
  weightKg: number;
  engineType: string;
}

function buildRacer(variantId: string, slotIndex: number): Racer | null {
  const v = getVariant(variantId);
  if (!v) return null;
  const m = getModel(v.modelId)!;
  const td = getTestData(v.id);
  const t100 = td?.zeroTo100.value ?? 11.0;
  
  return {
    variantId,
    label: `${m.name} ${v.name}`,
    shortLabel: v.name,
    slot: slotIndex + 1,
    color: getSimComparisonColor(slotIndex),
    t100,
    estimated: td?.zeroTo100.estimated ?? true,
    modelId: v.modelId,
    transmission: v.transmission,
    powerPs: v.engine.ps,
    torqueNm: v.engine.nm,
    weightKg: v.kerbWeight,
    engineType: `${v.engine.turbo ? "Turbo " : ""}${v.fuel.toUpperCase()}`,
  };
}

// Analytical solver for quarter mile time
function quarterMileTime(t100: number): number {
  const accelDist = (100 * KMH_TO_MS * t100) / 1.8;
  const target = 402.336;
  if (accelDist >= target) {
    return t100 * Math.pow(target / accelDist, 1 / 1.8);
  }
  return t100 + (target - accelDist) / (100 * KMH_TO_MS);
}

export default function LaunchChallenge({ initialVariants }: { initialVariants: string[] }) {
  const [ids, setIds] = useState<string[]>([
    initialVariants[0] ?? "creta-sx-o-turbo-dct",
    initialVariants[1] ?? "gv-zeta-plus-hybrid",
    initialVariants[2] ?? "",
  ]);

  const [targetMode, setTargetMode] = useState<"100" | "402">("100"); // 0-100 sprint vs 402m quarter mile
  const [state, setState] = useState<"idle" | "countdown" | "racing" | "finished">("idle");
  const [countdownText, setCountdownText] = useState("");
  const [slowMo, setSlowMo] = useState(false);
  const [loadedImages, setLoadedImages] = useState<Record<string, HTMLImageElement | null>>({});
  const [resultsData, setResultsData] = useState<Array<{ racer: Racer; time: number; speed: number; dist: number }>>([]);
  
  const stateRef = useRef({ t: 0, last: 0, raf: 0 });
  const shakeRef = useRef({ x: 0, y: 0, intensity: 0 });
  const racers = ids
    .map((id, slot) => (id ? buildRacer(id, slot) : null))
    .filter((r): r is Racer => !!r);

  // Pre-load images
  useEffect(() => {
    let active = true;
    racers.forEach((r) => {
      const url = CAR_IMAGE_MAP[r.modelId];
      if (url && !loadedImages[r.modelId]) {
        const img = new Image();
        img.src = url;
        img.onload = () => active && setLoadedImages((prev) => ({ ...prev, [r.modelId]: img }));
        img.onerror = () => active && setLoadedImages((prev) => ({ ...prev, [r.modelId]: null }));
      }
    });
    return () => { active = false; };
  }, [ids]);

  const svgRef = useRef<SVGSVGElement>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [carPositions, setCarPositions] = useState<Array<{ id: string; x: number; y: number; speed: number; dist: number }>>([]);

  const runChallenge = () => {
    setState("countdown");
    setElapsedTime(0);
    setCarPositions([]);
    setResultsData([]);
    
    // Countdown sequence
    const sequence = ["3", "2", "1", "LAUNCH!"];
    let step = 0;
    
    const nextStep = () => {
      if (step < sequence.length) {
        setCountdownText(sequence[step]);
        if (sequence[step] === "LAUNCH!") {
          shakeRef.current.intensity = 8; // big launch shake!
          setTimeout(() => {
            setState("racing");
            startRaceLoop();
          }, 600);
        } else {
          step++;
          setTimeout(nextStep, 800);
        }
      }
    };
    nextStep();
  };

  const startRaceLoop = () => {
    stateRef.current = { t: 0, last: performance.now(), raf: 0 };
    
    const slowestTarget = Math.max(
      ...racers.map((r) => (targetMode === "100" ? r.t100 : quarterMileTime(r.t100)))
    );

    const loop = (now: number) => {
      const dt = ((now - stateRef.current.last) / 1000) * (slowMo ? 0.25 : 1);
      stateRef.current.last = now;
      stateRef.current.t += dt;
      
      const t = stateRef.current.t;
      setElapsedTime(t);

      // Camera Shake decay
      if (shakeRef.current.intensity > 0.1) {
        shakeRef.current.intensity *= 0.92;
        shakeRef.current.x = (Math.random() - 0.5) * shakeRef.current.intensity;
        shakeRef.current.y = (Math.random() - 0.5) * shakeRef.current.intensity;
      } else {
        shakeRef.current.x = 0;
        shakeRef.current.y = 0;
      }

      // Calculate physics
      const currentPos = racers.map((r, i) => {
        const tLimit = targetMode === "100" ? r.t100 : quarterMileTime(r.t100);
        const tc = Math.min(t, tLimit);
        const dist = distanceAt(tc, r.t100);
        const speed = speedAt(tc, r.t100);
        return { racer: r, dist, speed, tLimit };
      });

      // Follow Camera Logic: relative to leader car
      const leadDist = Math.max(...currentPos.map((cp) => cp.dist));
      const pxPerM = 8; // scale factor
      
      const positions = currentPos.map((cp, i) => {
        // Lead car sits at x = 460. Trailing cars sit behind it relative to leadDist.
        const relX = 460 + (cp.dist - leadDist) * pxPerM;
        // Clamp min position to screen boundary
        const clampedX = Math.max(120, relX);
        const laneH = 40;
        const laneY = 70 + i * laneH;
        return {
          id: cp.racer.variantId,
          x: clampedX,
          y: laneY,
          speed: cp.speed,
          dist: cp.dist,
        };
      });

      setCarPositions(positions);

      // Check race end
      if (t >= slowestTarget + 0.3) {
        const finalResults = currentPos.map((cp) => ({
          racer: cp.racer,
          time: cp.tLimit,
          speed: targetMode === "100" ? 100 : speedAt(cp.tLimit, cp.racer.t100),
          dist: targetMode === "100" ? distanceAt(cp.tLimit, cp.racer.t100) : 402.336,
        })).sort((a, b) => a.time - b.time);

        setResultsData(finalResults);
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

  // AI Explanation calculation
  const aiExplanation = () => {
    if (resultsData.length < 2) return null;
    const winner = resultsData[0];
    const runnerUp = resultsData[1];
    const timeDelta = runnerUp.time - winner.time;
    
    let interpretation = "";
    let buyingAdvice = "";

    if (targetMode === "100") {
      interpretation = `The ${winner.racer.label} is noticeably faster off the line, reaching 100 km/h in ${winner.time.toFixed(1)}s, whereas the ${runnerUp.racer.label} takes ${runnerUp.time.toFixed(1)}s (${timeDelta.toFixed(1)}s slower).`;
      
      if (winner.time < 9.5) {
        buyingAdvice = `Highly recommended if you commute on high-speed expressways or need rapid pull-away power for highway slip roads. A sub-10s sprint makes quick maneuvers effortless.`;
      } else {
        buyingAdvice = `A sprint time above 10s is standard for normal family cars. It's perfectly adequate for relaxed city cruises and normal cruising, but requires a bit more throttle planning when overtaking.`;
      }
    } else {
      interpretation = `Over a 400m drag, the ${winner.racer.label} crosses the finish line at ${winner.speed.toFixed(0)} km/h in ${winner.time.toFixed(1)}s, establishing a significant gap of ${(winner.dist - distanceAt(winner.time, runnerUp.racer.t100)).toFixed(0)} meters over the ${runnerUp.racer.label}.`;
      
      buyingAdvice = `Quarter-mile performance indicates the engine's mid-range stamina. Turbocharged variants (like DCT/Turbo Petrol) sustain acceleration better at higher speeds, making them far more relaxing for long-distance cruising compared to heavy, naturally aspirated, or hybrid variants under load.`;
    }

    return {
      raw: `Winner: ${winner.racer.label} (${winner.time.toFixed(1)}s) vs ${runnerUp.racer.label} (${runnerUp.time.toFixed(1)}s)`,
      interpretation,
      buyingAdvice,
    };
  };

  const explain = aiExplanation();

  return (
    <div className="glass p-6 rounded-[32px] overflow-hidden">
      
      {/* ── CONTEXT CONFIGURATOR ── */}
      <div className="grid gap-4 md:grid-cols-4 items-end mb-6">
        {[0, 1, 2].map((i) => (
          <VariantSelect
            key={i}
            label={i === 2 ? "Car 3 (Optional)" : `Vehicle ${i + 1}`}
            value={ids[i]}
            allowNone={i === 2}
            onChange={(id) => {
              setState("idle");
              setIds((p) => p.map((x, j) => (j === i ? id : x)));
            }}
          />
        ))}
        <label className="block text-sm">
          <span className="text-secondary text-xs block mb-1">Target Milestone</span>
          <select
            value={targetMode}
            onChange={(e) => {
              setState("idle");
              setTargetMode(e.target.value as any);
            }}
            className="block w-full px-3 py-2 text-primary text-sm outline-none border border-black/10 rounded-xl"
          >
            <option value="100">0–100 km/h Sprint</option>
            <option value="402">Quarter Mile (402m) Drag</option>
          </select>
        </label>
      </div>

      {/* ── SIMULATION VIEWPORT ── */}
      <div className="relative w-full aspect-[22/8] bg-[#0A0710] rounded-2xl overflow-hidden border border-white/[0.08]">
        {/* Sky Sunset background */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#120a1c] via-[#210f1d] to-[#0A0710] opacity-95" />
        
        {/* Dynamic stars/runway markings */}
        <svg
          ref={svgRef}
          viewBox="0 0 700 200"
          className="absolute inset-0 w-full h-full"
          style={{
            transform: `translate(${shakeRef.current.x}px, ${shakeRef.current.y}px)`,
          }}
        >
          {/* Runway perspective lines */}
          <line x1="0" y1="180" x2="700" y2="180" stroke="rgba(79, 107, 138, 0.25)" strokeWidth={1.5} />
          <line x1="0" y1="50" x2="700" y2="50" stroke="rgba(79, 107, 138, 0.1)" strokeWidth={1} strokeDasharray="3 3" />
          
          {/* Runway center dashes (scroll offset based on lead car distance) */}
          <line
            x1="0"
            y1="110"
            x2="700"
            y2="110"
            stroke="rgba(247, 247, 245, 0.12)"
            strokeWidth={2}
            strokeDasharray="24 16"
            strokeDashoffset={state === "racing" ? elapsedTime * 180 : 0}
          />

          {/* Runway lights fading by speed */}
          <g opacity={0.65}>
            {[50, 150, 250, 350, 450, 550, 650].map((lx, idx) => {
              const animatedLX = state === "racing" ? (lx - elapsedTime * 200) % 700 : lx;
              const finalX = animatedLX < 0 ? animatedLX + 700 : animatedLX;
              return (
                <circle
                  key={idx}
                  cx={finalX}
                  cy="176"
                  r="2.5"
                  fill="#C84C31"
                  filter={state === "racing" ? "blur(0.5px)" : undefined}
                />
              );
            })}
          </g>

          {/* Start Line */}
          {state !== "racing" && (
            <line x1="120" y1="50" x2="120" y2="180" stroke={SCENE_COLORS.accent} strokeWidth={2} opacity={0.6} />
          )}

          {/* RACERS */}
          {racers.map((r, i) => {
            const pos = carPositions.find((cp) => cp.id === r.variantId);
            const carX = pos ? pos.x : 120;
            const carY = pos ? pos.y : 70 + i * 40;
            const currentSpeed = pos ? pos.speed : 0;
            
            const img = loadedImages[r.modelId];
            return (
              <g key={r.variantId}>
                {/* Car Silhouette/Image */}
                <g transform={`translate(${carX}, ${carY})`}>
                  {img ? (
                    <image
                      href={img.src}
                      x={-45}
                      y={-14}
                      width={90}
                      height={32}
                      preserveAspectRatio="xMidYMidMeet"
                    />
                  ) : (
                    // Stylized top-down or side blueprint vector outline
                    <path
                      d="M -40,10 L -40,2 C -40,-2 -35,-8 -25,-8 L 5,-8 C 15,-8 22,-3 32,2 L 40,8 C 42,9 43,12 40,14 L -40,14 Z"
                      fill="none"
                      stroke={r.color}
                      strokeWidth={1.5}
                    />
                  )}
                  {/* Glowing exhaust/underglow visualizer during launch */}
                  {state === "racing" && (
                    <ellipse cx={-44} cy={6} rx={12} ry={4} fill="rgba(200, 76, 49, 0.45)" filter="blur(3px)" />
                  )}
                </g>

                {/* HUD speed indicators floating near cars */}
                <g transform={`translate(${carX - 8}, ${carY - 18})`} opacity={0.95}>
                  <rect x={-2} y={-10} width={88} height={12} rx={3} fill={r.color} />
                  <text fill="#fff" fontSize={7} fontFamily="monospace" fontWeight="bold" x={2} y={-1}>
                    CAR {r.slot}
                  </text>
                </g>
                <g transform={`translate(${carX + 50}, ${carY + 4})`} opacity={0.85}>
                  <text fill="#F7F7F5" fontSize={8} fontFamily="monospace" fontWeight="bold">
                    {currentSpeed.toFixed(0)} km/h
                  </text>
                </g>
              </g>
            );
          })}
        </svg>

        {/* ── COUNTDOWN SCREEN OVERLAY ── */}
        {state === "countdown" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/45 backdrop-blur-sm z-10 transition-all duration-300">
            <h2 className="text-7xl font-extrabold tracking-tight text-[#C84C31] animate-ping font-mono">
              {countdownText}
            </h2>
          </div>
        )}

        {/* ── IDLE / INITIAL SCREEN ── */}
        {state === "idle" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 backdrop-blur-[1.5px] z-10">
            <p className="text-secondary font-mono text-xs uppercase tracking-widest mb-3 flex items-center gap-1.5"><Timer className="w-3.5 h-3.5" /> Launch Telemetry Engine</p>
            <h3 className="text-2xl font-bold tracking-tight text-white mb-6">READY TO SIMULATE LAUNCH</h3>
            <button
              onClick={runChallenge}
              className="px-10 py-4 bg-accent text-white font-bold text-lg rounded-xl hover:scale-105 transition-transform duration-200 flex items-center gap-2"
            >
              <Zap className="w-5 h-5 fill-white" />
              IGNITION & LAUNCH
            </button>
          </div>
        )}

        {/* ── REAL-TIME RUNNING DATA READOUT ── */}
        {state === "racing" && (
          <div className="absolute bottom-3 right-4 bg-black/60 px-3 py-1.5 rounded-lg border border-white/[0.08] text-[10px] font-mono text-[#9CA3AF]">
            ELAPSED TIME: <span className="text-white font-semibold">{elapsedTime.toFixed(2)}s</span>
          </div>
        )}
      </div>

      {/* ── CHALLENGE OUTPUT RESULTS ── */}
      {state === "finished" && resultsData.length > 0 && (
        <div className="grid md:grid-cols-12 gap-6 mt-6 animate-fade-in">
          {/* Results Table (col-span-5) */}
          <div className="md:col-span-5 space-y-4">
            <div className="glass p-5 rounded-2xl">
              <h4 className="text-sm font-semibold tracking-tight text-[var(--accent)] mb-3 uppercase font-mono">
                MILSTONE RESULTS ({targetMode === "100" ? "0–100 km/h" : "402m Drag"})
              </h4>
              <div className="space-y-3">
                {resultsData.map((r, i) => (
                  <div key={r.racer.variantId} className="flex justify-between items-center border-b border-black/[0.06] pb-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded px-1 py-0.5 font-mono text-[8px] font-bold uppercase text-white" style={{ background: r.racer.color }}>
                        Car {r.racer.slot}
                      </span>
                      <span className="text-xs font-medium">{r.racer.label}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-primary font-mono">{r.time.toFixed(2)}s</span>
                      <span className="text-[9px] text-secondary block font-mono">
                        {targetMode === "100" ? `60-100: ${(r.time*0.528).toFixed(2)}s` : `${r.speed.toFixed(0)} km/h exit`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={runChallenge}
              className="w-full py-3 border border-black/10 hover:bg-black/5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-colors text-primary"
            >
              Rerun Challenge
            </button>
          </div>

          {/* AI Explanation layer card (col-span-7) */}
          {explain && (
            <div className="md:col-span-7 glass border border-[var(--accent)]/30 p-5 rounded-2xl relative overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--accent)]/5 blur-2xl rounded-full" />
              <div>
                <span className="text-[9px] font-mono tracking-widest text-[var(--accent)] uppercase">AI INSIGHT LAYER</span>
                <h4 className="text-base font-semibold mt-1 mb-3 text-primary">How this translates to your ownership</h4>
                
                <p className="text-xs text-secondary leading-relaxed mb-3">
                  <span className="text-[var(--accent)] font-semibold">INTERPRETATION: </span>
                  {explain.interpretation}
                </p>
                <p className="text-xs text-secondary leading-relaxed">
                  <span className="text-[var(--accent)] font-semibold">BUYING ADVICE: </span>
                  {explain.buyingAdvice}
                </p>
              </div>
              
              <div className="mt-4 pt-4 border-t border-black/10 flex justify-between items-center text-[10px] text-secondary">
                <span>PHYSICS ENGINE // INSTRUMENTED DATA</span>
                <span>DRIVESCOPE LABS</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
