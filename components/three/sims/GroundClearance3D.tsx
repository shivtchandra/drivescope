"use client";

import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html, Line } from "@react-three/drei";
import * as THREE from "three";
import { getBrand, getModel, getVariant } from "@/lib/data";
import { getSimCarColor } from "@/lib/simCarColors";
import VariantSelect from "@/components/sims/VariantSelect";
import DriveRange from "@/components/ui/DriveRange";
import Stage from "../Stage";
import StylizedCar from "../StylizedCar";
import EstimatedBadge from "@/components/EstimatedBadge";
import { getVehicleDNA } from "@/lib/vehicle-dna";
import { Check, AlertTriangle } from "lucide-react";

const BUMP_CENTER_X = 14;
const BUMP_RADIUS = 0.85;
const ROAD_WIDTH = 6;

function bumpHeightAt(x: number, peakM: number): number {
  const dx = x - BUMP_CENTER_X;
  if (Math.abs(dx) > BUMP_RADIUS) return 0;
  return peakM * (1 - (dx / BUMP_RADIUS) ** 2);
}

function RoadWithBump({ peakM, scraping }: { peakM: number; scraping: boolean }) {
  return (
    <group>
      {/* Flat road sections */}
      {[-5, 5].map((offset) => (
        <mesh key={offset} rotation={[-Math.PI / 2, 0, 0]} position={[BUMP_CENTER_X + offset * 1.5, 0, 0]} receiveShadow>
          <planeGeometry args={[15, ROAD_WIDTH]} />
          <meshStandardMaterial color="#131316" roughness={0.95} />
        </mesh>
      ))}
      {/* Speed breaker */}
      <mesh position={[BUMP_CENTER_X, peakM / 2, 0]} receiveShadow castShadow>
        <boxGeometry args={[BUMP_RADIUS * 2, peakM, ROAD_WIDTH]} />
        <meshStandardMaterial
          color={scraping ? "#8a1a0a" : "#2a2a30"} roughness={0.8}
          emissive={scraping ? "#C84C31" : "#000"} emissiveIntensity={scraping ? 0.5 : 0}
        />
      </mesh>
      {/* Yellow warning stripes */}
      {[-0.3, 0, 0.3].map((dz) => (
        <mesh key={dz} position={[BUMP_CENTER_X, peakM + 0.005, dz]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[BUMP_RADIUS * 1.7, 0.1]} />
          <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.6} />
        </mesh>
      ))}
      {/* Edge lines */}
      {[-1, 1].map((s) => (
        <mesh key={s} rotation={[-Math.PI / 2, 0, 0]} position={[BUMP_CENTER_X, 0.003, s * (ROAD_WIDTH / 2 - 0.3)]}>
          <planeGeometry args={[28, 0.1]} />
          <meshStandardMaterial color="#3f3f46" />
        </mesh>
      ))}
      {/* Bump height annotation */}
      <Line
        points={[[BUMP_CENTER_X + BUMP_RADIUS + 0.5, 0, 0], [BUMP_CENTER_X + BUMP_RADIUS + 0.5, peakM, 0]]}
        color="#35D6FF" lineWidth={1.5}
      />
      <Line points={[[BUMP_CENTER_X + BUMP_RADIUS + 0.25, 0, 0], [BUMP_CENTER_X + BUMP_RADIUS + 0.75, 0, 0]]} color="#35D6FF" lineWidth={1} />
      <Line points={[[BUMP_CENTER_X + BUMP_RADIUS + 0.25, peakM, 0], [BUMP_CENTER_X + BUMP_RADIUS + 0.75, peakM, 0]]} color="#35D6FF" lineWidth={1} />
      <Html position={[BUMP_CENTER_X + BUMP_RADIUS + 1.6, peakM / 2, 0]} center>
        <div style={{ fontFamily: "monospace", fontSize: 10, color: "#35D6FF", whiteSpace: "nowrap", pointerEvents: "none", textShadow: "0 0 8px rgba(0,0,0,0.9)" }}>
          {Math.round(peakM * 1000)}mm
        </div>
      </Html>
    </group>
  );
}

function Sparks({ x, y }: { x: number; y: number }) {
  useFrame(() => {}); // keep mounted
  return (
    <group>
      {Array.from({ length: 10 }).map((_, i) => {
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.2;
        const r = 0.2 + Math.random() * 0.6;
        return (
          <mesh key={i} position={[x + Math.cos(angle) * r, y + Math.abs(Math.sin(angle)) * r * 0.5, (Math.random() - 0.5) * 0.4]}>
            <sphereGeometry args={[0.03, 4, 4]} />
            <meshStandardMaterial color={i % 3 === 0 ? "#FFD700" : "#ff5020"} emissive={i % 3 === 0 ? "#FFD700" : "#ff5020"} emissiveIntensity={8} toneMapped={false} />
          </mesh>
        );
      })}
    </group>
  );
}

interface GCSpec {
  modelId: string;
  gcMm: number; wheelbaseMm: number; bootLitres: number;
  bodyStyle: "suv" | "sedan"; color: string; label: string;
  dna: any;
}
function buildSpec(id: string): GCSpec | null {
  const v = getVariant(id);
  if (!v) return null;
  const m = getModel(v.modelId)!;
  return {
    modelId: m.id,
    gcMm: m.dimensions.groundClearanceMm ?? 190,
    wheelbaseMm: m.dimensions.wheelbaseMm, bootLitres: m.dimensions.bootLitres,
    bodyStyle: m.bodyStyle ?? "suv", color: getSimCarColor(m.id, getBrand(m.brandId)!.color),
    label: `${m.name} ${v.name}`,
    dna: getVehicleDNA(m),
  };
}

function GCScene({ spec, peakM, payloadKg, running, onFinish }: {
  spec: GCSpec; peakM: number; payloadKg: number; running: boolean;
  onFinish: (cleared: boolean, marginMm: number) => void;
}) {
  const carGroup = useRef<THREE.Group>(null);
  const state = useRef({ distM: 0, t: 0, done: false });
  const [rs, setRs] = useState({ x: 4, scraping: false, nearBump: false, clearMm: 0 });

  const effGcM = (spec.gcMm - payloadKg * 0.06) / 1000;
  const wheelR = spec.bodyStyle === "suv" ? 0.38 : 0.33;
  const wb = spec.wheelbaseMm / 1000;

  useFrame(({ camera }, delta) => {
    if (!running || state.current.done) return;
    const dt = Math.min(delta, 0.05);
    state.current.distM += 4 * dt; // 14.4 km/h approach
    state.current.t += dt;
    const carX = 4 + state.current.distM;
    const frontLift = bumpHeightAt(carX + wb / 2, peakM);
    const rearLift = bumpHeightAt(carX - wb / 2, peakM);
    const carY = wheelR + (frontLift + rearLift) / 2;
    const pitch = Math.atan2(frontLift - rearLift, wb);
    const bumpAtCenter = bumpHeightAt(carX, peakM);
    const underbodyY = carY - effGcM;
    const scraping = underbodyY < bumpAtCenter && bumpAtCenter > 0.01;
    const nearBump = Math.abs(carX - BUMP_CENTER_X) < 3;
    const clearMm = (underbodyY - bumpAtCenter) * 1000;

    if (carGroup.current) {
      carGroup.current.position.x = carX;
      carGroup.current.position.y = carY;
      carGroup.current.rotation.z = pitch;
    }
    // Side-view camera tracking
    camera.position.set(carX - 1, 2.5, 10);
    camera.lookAt(carX + 1.5, 1, 0);

    setRs({ x: carX, scraping, nearBump, clearMm });

    if (state.current.t > 6) {
      state.current.done = true;
      onFinish(!scraping, clearMm);
    }
  });

  const clears = effGcM * 1000 >= peakM * 1000;

  return (
    <group>
      <RoadWithBump peakM={peakM} scraping={rs.scraping} />
      <group ref={carGroup} position={[4, wheelR, 0]}>
        <StylizedCar
          modelId={spec.modelId}
          color={rs.scraping ? "#C84C31" : spec.color}
          wheelbaseMm={spec.wheelbaseMm}
          bootLitres={spec.bootLitres}
          bodyStyle={spec.bodyStyle}
          dna={spec.dna}
        />
        {rs.nearBump && (
          <Html position={[0, -effGcM / 2 - wheelR + 0.2, 2.8]} center>
            <div style={{
              fontFamily: "monospace", fontSize: 11, fontWeight: 700, pointerEvents: "none",
              color: clears ? "#35D6FF" : "#C84C31", background: "rgba(0,0,0,0.7)",
              padding: "2px 7px", borderRadius: 4, whiteSpace: "nowrap",
              textShadow: "none",
            }}>
              {clears ? `+${Math.round(effGcM * 1000 - peakM * 1000)}mm clear` : `−${Math.round(peakM * 1000 - effGcM * 1000)}mm SCRAPE`}
            </div>
          </Html>
        )}
      </group>
      {rs.scraping && <Sparks x={BUMP_CENTER_X} y={peakM + 0.06} />}
      {rs.scraping && <pointLight position={[rs.x, peakM + 0.1, 0]} intensity={15} color="#ff4020" distance={3} />}
    </group>
  );
}

export default function GroundClearance3D({ initialVariant }: { initialVariant?: string }) {
  const [id, setId] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("drivescope_selected_variant");
      if (stored) return stored;
    }
    return initialVariant ?? "creta-sx-o-turbo-dct";
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("drivescope_selected_variant");
      if (stored && stored !== id) {
        setId(stored);
      }
    }
  }, []);
  const [bumpMm, setBumpMm] = useState(150);
  const [payload, setPayload] = useState(75);
  const [simState, setSimState] = useState<"idle" | "running" | "done">("idle");
  const [sceneKey, setSceneKey] = useState(0);
  const [result, setResult] = useState<{ cleared: boolean; marginMm: number } | null>(null);

  const spec = buildSpec(id);
  const peakM = bumpMm / 1000;
  const effGcMm = spec ? spec.gcMm - payload * 0.06 : 190;
  const clears = effGcMm >= bumpMm;

  const reset = () => { setSimState("idle"); setResult(null); setSceneKey((k) => k + 1); };

  const explain = (() => {
    if (!spec || !result) return null;
    const margin = Math.abs(result.marginMm).toFixed(0);
    if (result.cleared) return {
      verdict: `Clears with ${margin}mm to spare`,
      interp: `${spec.label}'s ${spec.gcMm}mm clearance (drops to ${effGcMm.toFixed(0)}mm under ${payload}kg load) passes the ${bumpMm}mm breaker with ${margin}mm margin.`,
      advice: `This vehicle handles standard Indian speed breakers safely, even when fully loaded. Ground clearance above 180mm is ideal for potholed roads and high breakers.`,
    };
    return {
      verdict: `Scrapes by ${margin}mm`,
      interp: `Loaded clearance (${effGcMm.toFixed(0)}mm) is ${margin}mm short of the ${bumpMm}mm obstacle. Exhaust or underbody panels will contact.`,
      advice: `Cross at an angle and very slowly. Avoid this loading on high-breaker roads. A taller SUV variant or sedan with more clearance would solve this.`,
    };
  })();

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="grid gap-4 md:grid-cols-4 items-end">
        <VariantSelect label="Your Vehicle" value={id} onChange={(x) => {
          reset();
          setId(x);
          if (typeof window !== "undefined") {
            localStorage.setItem("drivescope_selected_variant", x);
          }
        }} />
        <DriveRange
          label="Obstacle Height"
          value={bumpMm}
          onChange={(v) => { reset(); setBumpMm(v); }}
          min={80}
          max={200}
          step={10}
          format={(v) => `${v} mm`}
          presets={[120, 150, 180]}
          presetFormat={(v) => `${v}mm`}
          accentClass="accent-[#C84C31]"
        />
        <DriveRange
          label="Payload"
          value={payload}
          onChange={(v) => { reset(); setPayload(v); }}
          min={0}
          max={400}
          step={50}
          format={(v) => `${v} kg`}
          presets={[0, 150, 300]}
          presetFormat={(v) => `${v}kg`}
          accentClass="accent-[#C84C31]"
        />
        <div className="space-y-1.5">
          <div className="text-xs font-mono text-secondary">
            Effective GC:{" "}
            <span className={`inline-flex items-center gap-1 font-bold ${clears ? "text-[#4ade80]" : "text-[#C84C31]"}`}>
              {effGcMm.toFixed(0)}mm ·{" "}
              {clears ? (
                <>
                  <Check className="w-3.5 h-3.5" /> Safe
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3.5 h-3.5" /> Scrape
                </>
              )}
            </span>
          </div>
          <button onClick={() => simState === "idle" ? setSimState("running") : reset()}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-transform hover:scale-[1.03]"
            style={{ background: "var(--accent, #C84C31)" }}>
            {simState === "idle" ? "Run Check" : "Reset"}
          </button>
        </div>
      </div>

      {/* 3D Canvas */}
      <div className="relative rounded-2xl overflow-hidden border border-black/[0.08]" style={{ height: 380 }}>
        {spec && (
          <Stage key={sceneKey} camera={{ position: [8, 2.5, 10], fov: 40 }} fog={[28, 65]} className="w-full h-full">
            <GCScene spec={spec} peakM={peakM} payloadKg={payload} running={simState === "running"} onFinish={(c, m) => { setResult({ cleared: c, marginMm: m }); setSimState("done"); }} />
          </Stage>
        )}
      </div>

      {/* Results */}
      {simState === "done" && explain && (
        <div className="grid md:grid-cols-12 gap-4">
          <div className="md:col-span-4 glass p-5 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-secondary">Clearance Results</p>
            <p className={`text-base font-bold ${result!.cleared ? "text-[#4ade80]" : "text-[#C84C31]"}`}>{explain.verdict}</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-secondary text-xs block">Factory GC</span><span className="font-semibold stat-num">{spec!.gcMm}mm</span></div>
              <div><span className="text-secondary text-xs block">Loaded GC</span><span className="font-semibold stat-num">{effGcMm.toFixed(0)}mm</span></div>
              <div><span className="text-secondary text-xs block">Obstacle</span><span className="font-semibold">{bumpMm}mm</span></div>
              <div><span className="text-secondary text-xs block">Suspension drop</span><span className="font-semibold text-warning">−{(payload * 0.06).toFixed(0)}mm</span></div>
            </div>
            <button onClick={reset} className="w-full py-2 rounded-lg text-xs font-semibold border border-black/10 hover:bg-black/5 transition-colors">Re-run</button>
          </div>
          <div className="md:col-span-8 glass p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-secondary mb-1 flex items-center gap-2">
              Buying insight <EstimatedBadge tooltip="Physics model — real suspension behavior varies by setup." />
            </p>
            <h4 className="font-semibold mb-3">What this means on Indian roads</h4>
            <p className="text-sm text-secondary leading-relaxed mb-2"><span className="font-medium text-primary">Result: </span>{explain.interp}</p>
            <p className="text-sm text-secondary leading-relaxed"><span className="font-medium text-primary">Advice: </span>{explain.advice}</p>
          </div>
        </div>
      )}

      <div className="border border-[#161616]/10 bg-[#F4F0E8]/40 p-4 rounded-2xl mt-5 text-[11px] text-secondary leading-relaxed">
        <p className="font-semibold text-primary mb-1 font-mono uppercase tracking-wider text-[10px]">Jargon Guide: Ground Clearance &amp; Suspension Drop //</p>
        <p>
          <strong>Ground Clearance (GC)</strong> is the height of the lowest point of the car body above the flat ground. Taller numbers mean you scrape less speedbreakers.
          <strong> Suspension Drop</strong> is the drop in clearance as passengers or bags are added to the vehicle. We model this as a standard 0.06mm drop per kg of load (payload).
        </p>
      </div>
    </div>
  );
}
