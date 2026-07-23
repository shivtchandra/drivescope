"use client";

import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { getBrand, getModel, getVariant } from "@/lib/data";
import { getSimCarColor } from "@/lib/simCarColors";
import VariantSelect from "@/components/sims/VariantSelect";
import DriveRange from "@/components/ui/DriveRange";
import Stage from "../Stage";
import StylizedCar, { type CarMotionRef } from "../StylizedCar";
import EstimatedBadge from "@/components/EstimatedBadge";
import { getVehicleDNA } from "@/lib/vehicle-dna";

const GEARS: [number, number][] = [
  [0, 22], [22, 42], [42, 68], [68, 96], [96, 130], [130, 200],
];
function currentGear(kmh: number): number {
  for (let i = 0; i < GEARS.length; i++) if (kmh < GEARS[i][1]) return i + 1;
  return GEARS.length;
}

interface ClimbSpec {
  modelId: string;
  psMax: number; nmMax: number; kerbKg: number; payloadKg: number;
  isEv: boolean; isTurbo: boolean; isHybrid: boolean;
  wheelbaseMm: number; bootLitres: number; bodyStyle: "suv" | "sedan";
  color: string; label: string;
  dna: any;
}

function buildSpec(variantId: string, payloadKg: number): ClimbSpec | null {
  const v = getVariant(variantId);
  if (!v) return null;
  const m = getModel(v.modelId)!;
  return {
    modelId: m.id,
    psMax: v.engine.ps, nmMax: v.engine.nm, kerbKg: v.kerbWeight, payloadKg,
    isEv: v.fuel === "ev", isTurbo: v.engine.turbo, isHybrid: v.hybrid === "strong",
    wheelbaseMm: m.dimensions.wheelbaseMm, bootLitres: m.dimensions.bootLitres,
    bodyStyle: m.bodyStyle ?? "suv",
    color: getSimCarColor(m.id, getBrand(m.brandId)!.color), label: `${m.name} ${v.name}`,
    dna: getVehicleDNA(m),
  };
}

function computeAccel(spec: ClimbSpec, speedMs: number, inclineDeg: number): number {
  const mass = spec.kerbKg + spec.payloadKg;
  const bonus = spec.isTurbo ? 1.08 : spec.isEv ? 1.15 : spec.isHybrid ? 1.05 : 1.0;
  const force = Math.min((spec.psMax * 735.5 / Math.max(speedMs, 0.5)) * bonus, mass * 5.5);
  const gravity = mass * 9.81 * Math.sin((inclineDeg * Math.PI) / 180);
  const drag = 0.5 * 1.2 * 0.35 * 2.2 * speedMs * speedMs;
  return (force - gravity - drag) / mass;
}

function engineEffort(spec: ClimbSpec, speedMs: number, inclineDeg: number): number {
  const mass = spec.kerbKg + spec.payloadKg;
  const gravity = mass * 9.81 * Math.sin((inclineDeg * Math.PI) / 180);
  const maxForce = spec.psMax * 735.5 / Math.max(speedMs, 0.5);
  return Math.min(gravity / maxForce, 1.0);
}

function Mountains() {
  const peaks: [number, number, number, number][] = [
    [-60, 0, -30, 22], [-20, 0, -35, 30], [20, 0, -30, 26],
    [65, 0, -28, 20], [100, 0, -35, 35],
  ];
  return (
    <group>
      {peaks.map(([x, , z, h], i) => (
        <mesh key={i} position={[x, h / 2, z]}>
          <coneGeometry args={[h * 0.7, h, 5]} />
          <meshStandardMaterial color="#1a1c2a" roughness={1} />
        </mesh>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[20, -0.1, -20]}>
        <planeGeometry args={[200, 50]} />
        <meshStandardMaterial color="#12131a" roughness={1} />
      </mesh>
    </group>
  );
}

function HillRoad({ inclineDeg, length = 120 }: { inclineDeg: number; length?: number }) {
  const inclineRad = (inclineDeg * Math.PI) / 180;
  return (
    <group rotation={[0, 0, inclineRad]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[length / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[length, 7]} />
        <meshStandardMaterial color="#131316" roughness={0.95} />
      </mesh>
      {Array.from({ length: 15 }).map((_, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[i * 8 + 4, 0.005, 0]}>
          <planeGeometry args={[2.6, 0.14]} />
          <meshStandardMaterial color="#52525b" />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <mesh key={s} rotation={[-Math.PI / 2, 0, 0]} position={[length / 2, 0.005, s * 3]}>
          <planeGeometry args={[length, 0.12]} />
          <meshStandardMaterial color="#3f3f46" />
        </mesh>
      ))}
    </group>
  );
}

function ClimbScene({
  spec, inclineDeg, running, onFinish,
}: {
  spec: ClimbSpec; inclineDeg: number; running: boolean;
  onFinish: (topSpeed: number, effort: number) => void;
}) {
  const inclineRad = (inclineDeg * Math.PI) / 180;
  const motionRef = useRef<CarMotionRef>({ wheelSpeed: 0, pitch: 0 });
  const carGroup = useRef<THREE.Group>(null);
  const state = useRef({ speedMs: 0, distM: 0, t: 0, done: false });
  const [hud, setHud] = useState({ speedKmh: 0, gear: 1 });

  useFrame(({ camera }, delta) => {
    if (!running || state.current.done) return;
    const dt = Math.min(delta, 0.05);
    const accel = computeAccel(spec, state.current.speedMs, inclineDeg);
    state.current.speedMs = Math.max(0, state.current.speedMs + accel * dt);
    state.current.distM += state.current.speedMs * dt;
    state.current.t += dt;
    const kmh = state.current.speedMs * 3.6;
    motionRef.current.wheelSpeed = state.current.speedMs / 0.35;
    motionRef.current.pitch = inclineRad * 0.9;
    if (carGroup.current) {
      carGroup.current.position.x = state.current.distM * Math.cos(inclineRad);
      carGroup.current.position.y = state.current.distM * Math.sin(inclineRad);
      carGroup.current.rotation.z = inclineRad;
    }
    const wx = state.current.distM * Math.cos(inclineRad);
    const wy = state.current.distM * Math.sin(inclineRad);
    camera.position.set(wx - 8, wy + 3.5, 7);
    camera.lookAt(wx + 2, wy + 1, 0);
    setHud({ speedKmh: kmh, gear: currentGear(kmh) });
    if (state.current.t >= 8) {
      state.current.done = true;
      onFinish(kmh, engineEffort(spec, state.current.speedMs, inclineDeg));
    }
  });

  return (
    <group>
      <Mountains />
      <HillRoad inclineDeg={inclineDeg} />
      <group ref={carGroup}>
        <StylizedCar
          modelId={spec.modelId}
          color={spec.color} wheelbaseMm={spec.wheelbaseMm}
          bootLitres={spec.bootLitres} bodyStyle={spec.bodyStyle}
          dna={spec.dna} motionRef={motionRef}
        />
        <Html position={[0, 2.8, 0]} center distanceFactor={8}>
          <div style={{ fontFamily: "monospace", textAlign: "center", pointerEvents: "none" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#35D6FF", textShadow: "0 0 8px rgba(0,0,0,0.9)" }}>
              {hud.speedKmh.toFixed(0)} km/h
            </div>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.65)", textShadow: "0 0 6px rgba(0,0,0,0.9)" }}>
              GEAR {hud.gear}
            </div>
          </div>
        </Html>
      </group>
    </group>
  );
}

export default function HillClimb3D({ initialVariant }: { initialVariant?: string }) {
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
  const [incline, setIncline] = useState(15);
  const [payload, setPayload] = useState(250);
  const [state, setState] = useState<"idle" | "running" | "done">("idle");
  const [results, setResults] = useState<{ topSpeed: number; effort: number } | null>(null);
  const [runId, setRunId] = useState(0);

  const spec = buildSpec(id, payload);

  const reset = () => { setState("idle"); setResults(null); setRunId((k) => k + 1); };

  const explain = (() => {
    if (!spec || !results) return null;
    const { topSpeed, effort } = results;
    if (topSpeed > 55) return {
      interp: `The ${spec.label} maintains ${topSpeed.toFixed(0)} km/h on a ${incline}° gradient with ${payload}kg load — strong hill performance.`,
      advice: `This powertrain handles loaded inclines comfortably. Recommended for Ghats, hill stations, and steep city fly-overs.`,
    };
    if (topSpeed > 38) return {
      interp: `The ${spec.label} settles at ${topSpeed.toFixed(0)} km/h — adequate but the engine is under ${(effort * 100).toFixed(0)}% load.`,
      advice: `Manageable for occasional hill use, but expect gear hunting and higher fuel consumption on sustained climbs.`,
    };
    return {
      interp: `The ${spec.label} slows to ${topSpeed.toFixed(0)} km/h — near its limit on this gradient with this payload.`,
      advice: `Not ideal for frequent hill driving. Consider a turbo or hybrid variant for relaxed mountain driving.`,
    };
  })();

  return (
    <div className="space-y-4">
      {/* Controls — match existing sim card style */}
      <div className="grid gap-4 md:grid-cols-4 items-end">
        <VariantSelect label="Vehicle" value={id} onChange={(x) => {
          reset();
          setId(x);
          if (typeof window !== "undefined") {
            localStorage.setItem("drivescope_selected_variant", x);
          }
        }} />
        <DriveRange
          label="Incline"
          value={incline}
          onChange={(v) => { reset(); setIncline(v); }}
          min={5}
          max={30}
          step={5}
          format={(v) => `${v}°`}
          presets={[10, 15, 20]}
          presetFormat={(v) => `${v}°`}
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
        <div className="flex gap-2">
          <button
            onClick={() => { if (state === "idle") setState("running"); else reset(); }}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-transform hover:scale-[1.03]"
            style={{ background: "var(--accent, #C84C31)" }}
          >
            {state === "done" ? "Re-run" : state === "running" ? "Running…" : "Start Climb"}
          </button>
        </div>
      </div>

      {/* 3D Canvas — no explicit background, matches existing sim look */}
      <div className="relative rounded-2xl overflow-hidden border border-black/[0.08]" style={{ height: 380 }}>
        {spec && (
          <Stage key={runId} camera={{ position: [-8, 3.5, 7], fov: 42 }} fog={[30, 80]} className="w-full h-full">
            <ClimbScene spec={spec} inclineDeg={incline} running={state === "running"} onFinish={(s, e) => { setResults({ topSpeed: s, effort: e }); setState("done"); }} />
          </Stage>
        )}
        {/* Live effort bar */}
        {state === "running" && (
          <div className="absolute bottom-3 left-4 right-4 pointer-events-none z-10 flex items-center gap-3">
            <span className="text-[10px] font-mono text-white/70 uppercase">Engine Load</span>
            <div className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full rounded-full animate-pulse" style={{ width: `${Math.min(30 + incline * 2.5, 100)}%`, background: "linear-gradient(90deg,#35D6FF,#C84C31)" }} />
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      {state === "done" && explain && (
        <div className="grid md:grid-cols-12 gap-4">
          <div className="md:col-span-4 glass p-5 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-secondary">Climb Results</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-secondary text-xs block">Sustained speed</span><span className="font-semibold stat-num">{results!.topSpeed.toFixed(0)} km/h</span></div>
              <div><span className="text-secondary text-xs block">Engine load</span><span className="font-semibold stat-num">{(results!.effort * 100).toFixed(0)}%</span></div>
              <div><span className="text-secondary text-xs block">Incline</span><span className="font-semibold">{incline}°</span></div>
              <div><span className="text-secondary text-xs block">Payload</span><span className="font-semibold">{payload} kg</span></div>
            </div>
            <button onClick={reset} className="w-full py-2 rounded-lg text-xs font-semibold border border-black/10 hover:bg-black/5 transition-colors">Re-run</button>
          </div>
          <div className="md:col-span-8 glass p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-secondary mb-1 flex items-center gap-2">
              Buying insight <EstimatedBadge tooltip="Derived from physics model — real-world results vary." />
            </p>
            <h4 className="font-semibold mb-3">What this means on Indian roads</h4>
            <p className="text-sm text-secondary leading-relaxed mb-2"><span className="font-medium text-primary">Result: </span>{explain.interp}</p>
            <p className="text-sm text-secondary leading-relaxed"><span className="font-medium text-primary">Advice: </span>{explain.advice}</p>
          </div>
        </div>
      )}

      <div className="border border-[#161616]/10 bg-[#F4F0E8]/40 p-4 rounded-2xl mt-5 text-[11px] text-secondary leading-relaxed">
        <p className="font-semibold text-primary mb-1 font-mono uppercase tracking-wider text-[10px]">Jargon Guide: Incline Angle &amp; Engine Load //</p>
        <p>
          <strong>Incline / Gradient (Degrees)</strong> measures the steepness of a hill. Standard highway flyovers are 3–5°, while steep mountain passes (Ghats) can exceed 15–20°.
          <strong> Engine Load / Effort</strong> is the percentage of the engine's maximum power required to sustain speed against gravity. Lower load means the engine isn't straining, leading to smoother drives and better durability.
        </p>
      </div>
    </div>
  );
}
