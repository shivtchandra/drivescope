"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { getModel, getTestData, getVariant } from "@/lib/data";
import { getSimComparisonColor } from "@/lib/simCarColors";
import { distanceAt, downloadCanvasPng, speedAt } from "@/lib/sim";
import EstimatedBadge from "@/components/EstimatedBadge";
import VariantSelect from "@/components/sims/VariantSelect";
import Stage from "../Stage";
import StylizedCar, { type CarMotionRef } from "../StylizedCar";
import { LANE_W, Road, FinishGate } from "./Road";
import { getVehicleDNA } from "@/lib/vehicle-dna";

const WHEEL_R = 0.38;

interface Racer {
  variantId: string;
  modelId: string;
  label: string;
  shortLabel: string;
  slot: number;
  color: string;
  fuel: string;
  transmission: string;
  t100: number;
  estimated: boolean;
  wheelbaseMm: number;
  bootLitres: number;
  bodyStyle: "suv" | "sedan";
  dna: ReturnType<typeof getVehicleDNA>;
}

function buildRacer(variantId: string, slotIndex: number): Racer | null {
  const v = getVariant(variantId);
  if (!v) return null;
  const m = getModel(v.modelId)!;
  const td = getTestData(variantId);
  if (!td?.zeroTo100.value) return null;
  return {
    variantId,
    modelId: m.id,
    label: `${m.name} ${v.name}`,
    shortLabel: v.name,
    slot: slotIndex + 1,
    color: getSimComparisonColor(slotIndex),
    fuel: v.fuel,
    transmission: v.transmission,
    t100: td.zeroTo100.value,
    estimated: td.zeroTo100.estimated,
    wheelbaseMm: m.dimensions.wheelbaseMm,
    bootLitres: m.dimensions.bootLitres,
    bodyStyle: m.bodyStyle ?? "suv",
    dna: getVehicleDNA(m),
  };
}

function RaceScene({
  racers,
  runningRef,
  slowMoRef,
  speedEls,
  onFinish,
}: {
  racers: Racer[];
  runningRef: React.MutableRefObject<boolean>;
  slowMoRef: React.MutableRefObject<boolean>;
  speedEls: React.MutableRefObject<Record<string, HTMLSpanElement | null>>;
  onFinish: (caption: string | null) => void;
}) {
  const t = useRef(0);
  const finished = useRef(false);
  const cars = useRef<(THREE.Group | null)[]>([]);
  const motions = useRef<React.MutableRefObject<CarMotionRef>[]>(
    racers.map(() => ({ current: { wheelSpeed: 0, pitch: 0 } }))
  );

  const slowest = Math.max(...racers.map((r) => r.t100), 1);
  const fastestT = Math.min(...racers.map((r) => r.t100));
  const trackM = distanceAt(slowest, fastestT);
  const roadWidth = racers.length * LANE_W + 2.4;

  useFrame(({ camera }, delta) => {
    if (runningRef.current && !finished.current) {
      t.current += Math.min(delta, 0.05) * (slowMoRef.current ? 0.25 : 1);
    }
    const now = t.current;

    let leadX = 0;
    racers.forEach((r, i) => {
      const dist = distanceAt(Math.min(now, r.t100), r.t100);
      const speed = speedAt(now, r.t100);
      leadX = Math.max(leadX, dist);
      const g = cars.current[i];
      if (g) g.position.x = dist;
      const mref = motions.current[i];
      mref.current.wheelSpeed = (speed / 3.6) / WHEEL_R;
      mref.current.pitch = runningRef.current && now < r.t100 * 0.25 ? -0.025 : 0;
      const el = speedEls.current[r.variantId];
      if (el) el.textContent = `${speed.toFixed(0)} km/h${now >= r.t100 ? ` · ${r.t100.toFixed(1)}s` : ""}`;
    });

    camera.position.x += (leadX + 6 - camera.position.x) * 0.08;
    camera.position.y += (3.2 - camera.position.y) * 0.05;
    camera.position.z += (11 - camera.position.z) * 0.05;
    camera.lookAt(leadX + 2, 0.85, 0);

    if (runningRef.current && !finished.current && now >= slowest + 0.5) {
      finished.current = true;
      const winner = [...racers].sort((a, b) => a.t100 - b.t100)[0];
      const last = [...racers].sort((a, b) => b.t100 - a.t100)[0];
      if (winner !== last) {
        const lastSpeed = speedAt(winner.t100, last.t100);
        const gapM = distanceAt(winner.t100, winner.t100) - distanceAt(winner.t100, last.t100);
        onFinish(
          `The ${winner.label} reaches 100 while the ${last.label} is still at ${lastSpeed.toFixed(0)} km/h — a gap of ${gapM.toFixed(0)} m and ${(last.t100 - winner.t100).toFixed(1)} s.`
        );
      } else {
        onFinish(null);
      }
    }
  });

  return (
    <>
      <Road x0={-20} x1={trackM + 60} lanes={racers.length} />
      <FinishGate x={trackM} width={roadWidth} />
      {racers.map((r, i) => {
        const laneZ = (i - (racers.length - 1) / 2) * LANE_W;
        return (
          <group
            key={r.variantId}
            ref={(el) => {
              cars.current[i] = el;
            }}
            position={[0, 0, laneZ]}
          >
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-1.2, 0.007, 0]}>
              <planeGeometry args={[1.5, 1.1]} />
              <meshStandardMaterial color={r.color} emissive={r.color} emissiveIntensity={0.35} />
            </mesh>
            <StylizedCar
              modelId={r.modelId}
              color={r.color}
              wheelbaseMm={r.wheelbaseMm}
              bootLitres={r.bootLitres}
              bodyStyle={r.bodyStyle}
              dna={r.dna}
              motionRef={motions.current[i]}
            />
            <Html position={[0, 1.55, 0]} center distanceFactor={11}>
              <div
                className="pointer-events-none select-none whitespace-nowrap rounded-md border px-2 py-1 text-center font-mono shadow-[0_8px_24px_rgba(0,0,0,0.45)]"
                style={{
                  borderColor: `${r.color}99`,
                  background: "rgba(9, 6, 13, 0.88)",
                  color: "#F5F1E8",
                }}
              >
                <div className="text-[9px] font-bold uppercase tracking-wider" style={{ color: r.color }}>
                  Car {r.slot}
                </div>
                <div className="text-[10px] font-semibold">{r.shortLabel}</div>
              </div>
            </Html>
          </group>
        );
      })}
    </>
  );
}

export default function DragRace3D({ initialVariants }: { initialVariants: string[] }) {
  const [ids, setIds] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("drivescope_selected_variant");
      if (stored) return [stored, initialVariants[1] ?? "gv-zeta-plus-hybrid", initialVariants[2] ?? ""];
    }
    return [
      initialVariants[0] ?? "creta-sx-o-turbo-dct",
      initialVariants[1] ?? "gv-zeta-plus-hybrid",
      initialVariants[2] ?? "",
    ];
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("drivescope_selected_variant");
      if (stored && stored !== ids[0]) {
        setIds((prev) => [stored, prev[1], prev[2]]);
      }
    }
  }, []);
  const [running, setRunning] = useState(false);
  const [runId, setRunId] = useState(0);
  const [slowMo, setSlowMo] = useState(false);
  const [caption, setCaption] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const runningRef = useRef(false);
  const slowMoRef = useRef(false);
  const speedEls = useRef<Record<string, HTMLSpanElement | null>>({});
  runningRef.current = running;
  slowMoRef.current = slowMo;

  const racers = useMemo(
    () =>
      ids
        .map((id, slot) => (id ? buildRacer(id, slot) : null))
        .filter((r): r is Racer => !!r),
    [ids]
  );
  const sceneKey = racers.map((r) => r.variantId).join(",");

  const exportPng = () => {
    const canvas = containerRef.current?.querySelector("canvas");
    if (canvas) downloadCanvasPng(canvas as HTMLCanvasElement, "drivescope-drag-race.png");
  };

  return (
    <div className="glass p-6">
      <div className="grid gap-3 sm:grid-cols-3 mb-5">
        {[0, 1, 2].map((i) => (
          <VariantSelect
            key={i}
            label={i === 2 ? "Car 3 (optional)" : `Car ${i + 1}`}
            value={ids[i]}
            allowNone={i === 2}
            onChange={(nextId) => {
              setRunning(false);
              setCaption(null);
              setIds((p) => p.map((x, j) => (j === i ? nextId : x)));
              if (i === 0 && typeof window !== "undefined") {
                localStorage.setItem("drivescope_selected_variant", nextId);
              }
            }}
          />
        ))}
      </div>

      {racers.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {racers.map((r) => (
            <div
              key={r.variantId}
              className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-[#161616]/10 bg-[#F4F0E8]/90 px-3 py-2 text-xs sm:min-w-[200px] sm:flex-none"
              style={{ boxShadow: `inset 3px 0 0 ${r.color}` }}
            >
              <span
                className="shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase text-white"
                style={{ background: r.color }}
              >
                Car {r.slot}
              </span>
              <div className="min-w-0">
                <p className="truncate font-semibold text-primary">{r.label}</p>
                <p className="truncate font-mono text-[10px] text-secondary">
                  {r.fuel.toUpperCase()} · {r.transmission}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="relative">
        <div ref={containerRef} className="relative w-full aspect-[16/9] sm:aspect-[21/8] rounded-xl overflow-hidden">
          <Stage key={`${sceneKey}-${runId}`} camera={{ position: [6, 3.2, 11], fov: 42 }} fog={[24, 70]}>
            <RaceScene
              racers={racers}
              runningRef={runningRef}
              slowMoRef={slowMoRef}
              speedEls={speedEls}
              onFinish={(c) => {
                setRunning(false);
                if (c) setCaption(c);
              }}
            />
          </Stage>
        </div>

        <div className="sm:absolute relative sm:top-3 sm:left-4 top-auto left-auto mt-3 sm:mt-0 p-3 rounded-xl border border-[#161616]/10 bg-[#F4F0E8]/95 backdrop-blur-sm space-y-2 text-[10px] sm:text-xs stat-num pointer-events-none z-10 shadow-sm max-w-[min(100%,18rem)]">
          {racers.map((r) => (
            <div key={r.variantId} className="flex items-start gap-2 border-l-[3px] pl-2" style={{ borderColor: r.color }}>
              <span
                className="mt-0.5 inline-flex shrink-0 rounded px-1 py-0.5 font-mono text-[9px] font-bold uppercase text-white"
                style={{ background: r.color }}
              >
                Car {r.slot}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-primary leading-tight">{r.shortLabel}</p>
                <p className="truncate text-[9px] text-secondary">{r.fuel.toUpperCase()} · {r.transmission}</p>
                <span
                  ref={(el) => {
                    speedEls.current[r.variantId] = el;
                  }}
                  className="text-primary font-bold"
                >
                  0 km/h
                </span>
                {r.estimated && <span className="text-warning"> ~</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mt-5">
        <button
          onClick={() => {
            setCaption(null);
            setRunId((r) => r + 1);
            setRunning(true);
          }}
          disabled={running || racers.length < 2}
          className="px-8 py-3 rounded-xl bg-accent text-white font-semibold text-lg disabled:opacity-40 transition-transform duration-200 hover:scale-[1.03]"
        >
          {running ? "Racing…" : "Run"}
        </button>
        <label className="flex items-center gap-2 text-sm text-secondary cursor-pointer">
          <input type="checkbox" checked={slowMo} onChange={(e) => setSlowMo(e.target.checked)} />
          Slow-mo replay
        </label>
        <button onClick={exportPng} className="px-4 py-2 rounded-lg glass text-sm hover:bg-white/[0.08]">
          Share image ↓
        </button>
        {racers.some((r) => r.estimated) && (
          <EstimatedBadge tooltip="One or more 0–100 times are modeled from weight and power, not instrumented tests." />
        )}
      </div>

      {caption && (
        <p className="mt-4 text-sm leading-relaxed border-l-2 pl-4" style={{ borderColor: "var(--accent)" }}>
          {caption}
        </p>
      )}

      <div className="border border-[#161616]/10 bg-[#F4F0E8]/40 p-4 rounded-2xl mt-5 text-[11px] text-secondary leading-relaxed">
        <p className="font-semibold text-primary mb-1.5 font-mono uppercase tracking-wider text-[10px]">Jargon Guide: Power vs Torque //</p>
        <p className="mb-1.5">
          <strong>Torque (The &quot;Punch&quot;)</strong>: Think of this as muscle strength. It is the engine&apos;s raw twisting force that shoves you back in your seat when you step on the gas. High torque makes starting from a stop and overtaking heavy trucks feel effortless.
        </p>
        <p>
          <strong>Power (The &quot;Speed&quot;)</strong>: Think of this as athletic running speed. It determines how fast the car can sustain high speeds once it is already moving, setting your highway limits.
        </p>
      </div>
    </div>
  );
}
