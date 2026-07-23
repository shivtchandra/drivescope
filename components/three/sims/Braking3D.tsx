"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { getBrand, getModel, getTestData, getVariant } from "@/lib/data";
import { getSimCarColor } from "@/lib/simCarColors";
import {
  KMH_TO_MS,
  REACTION_TIME_S,
  brakingDistance,
  decelFromBraking100,
  downloadCanvasPng,
  impactSpeed,
  totalStoppingDistance,
} from "@/lib/sim";
import EstimatedBadge from "@/components/EstimatedBadge";
import VariantSelect from "@/components/sims/VariantSelect";
import DriveRange from "@/components/ui/DriveRange";
import Stage from "../Stage";
import StylizedCar, { type CarMotionRef } from "../StylizedCar";
import { LANE_W, Road } from "./Road";
import { getVehicleDNA } from "@/lib/vehicle-dna";

const CAR_LENGTH_M = 4.4;
const OBSTACLE_AT: Record<number, number> = { 60: 45, 80: 70, 100: 100 };
const WHEEL_R = 0.38;

interface BrakeCar {
  id: string;
  modelId: string;
  label: string;
  color: string;
  d100: number;
  estimated: boolean;
  total: number;
  wheelbaseMm: number;
  bootLitres: number;
  bodyStyle: "suv" | "sedan";
  dna: any;
}

function build(id: string, speed: number): BrakeCar | null {
  const v = getVariant(id);
  if (!v) return null;
  const m = getModel(v.modelId)!;
  const td = getTestData(id);
  const d100 = td?.braking100to0.value;
  if (!d100) return null;
  return {
    id,
    modelId: m.id,
    label: `${m.name} ${v.name}`,
    color: getSimCarColor(m.id, getBrand(m.brandId)!.color),
    d100,
    estimated: td.braking100to0.estimated,
    total: totalStoppingDistance(speed, d100),
    wheelbaseMm: m.dimensions.wheelbaseMm,
    bootLitres: m.dimensions.bootLitres,
    bodyStyle: m.bodyStyle ?? "suv",
    dna: getVehicleDNA(m),
  };
}

function BrakeScene({
  cars,
  speed,
  runningRef,
  slowMoRef,
  onDone,
}: {
  cars: BrakeCar[];
  speed: number;
  runningRef: React.MutableRefObject<boolean>;
  slowMoRef: React.MutableRefObject<boolean>;
  onDone: () => void;
}) {
  const t = useRef(0);
  const done = useRef(false);
  const groups = useRef<(THREE.Group | null)[]>([]);
  const motions = useRef(cars.map(() => ({ current: { wheelSpeed: 0, pitch: 0 } as CarMotionRef })));

  const v0 = speed * KMH_TO_MS;
  const reactionDist = v0 * REACTION_TIME_S;
  const obstacle = OBSTACLE_AT[speed];
  const maxTotal = Math.max(...cars.map((c) => c.total), obstacle) + 12;
  const maxT = REACTION_TIME_S + Math.max(...cars.map((c) => v0 / decelFromBraking100(c.d100))) + 0.6;

  const posAt = (time: number, d100: number) => {
    if (time <= REACTION_TIME_S) return v0 * time;
    const a = decelFromBraking100(d100);
    const tb = Math.min(time - REACTION_TIME_S, v0 / a);
    return v0 * REACTION_TIME_S + v0 * tb - 0.5 * a * tb * tb;
  };

  useFrame(({ camera }, delta) => {
    if (runningRef.current && !done.current) {
      t.current += Math.min(delta, 0.05) * (slowMoRef.current ? 0.25 : 1);
    }
    const now = t.current;
    cars.forEach((c, i) => {
      const g = groups.current[i];
      const x = Math.min(posAt(now, c.d100), c.total);
      if (g) g.position.x = x;
      const a = decelFromBraking100(c.d100);
      const vNow = now <= REACTION_TIME_S ? v0 : Math.max(0, v0 - a * (now - REACTION_TIME_S));
      motions.current[i].current.wheelSpeed = vNow / WHEEL_R;
      // dive under braking
      motions.current[i].current.pitch = now > REACTION_TIME_S && vNow > 0 ? 0.03 : 0;
    });

    // high tilted top-down framing the whole strip
    camera.position.set(maxTotal * 0.45, maxTotal * 0.42, maxTotal * 0.3);
    camera.lookAt(maxTotal * 0.45, 0, 0);

    if (runningRef.current && !done.current && now >= maxT) {
      done.current = true;
      onDone();
    }
  });

  return (
    <>
      <Road x0={-12} x1={maxTotal + 14} lanes={cars.length} />
      {/* reaction zone — amber translucent strip */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[reactionDist / 2, 0.008, 0]}>
        <planeGeometry args={[reactionDist, cars.length * LANE_W]} />
        <meshStandardMaterial color="#FBBF24" transparent opacity={0.13} />
      </mesh>
      {/* obstacle pylon */}
      <mesh position={[obstacle, 0.8, 0]} castShadow>
        <coneGeometry args={[0.5, 1.6, 12]} />
        <meshStandardMaterial color="#F87171" emissive="#F87171" emissiveIntensity={0.5} />
      </mesh>
      {/* per-car stop markers */}
      {cars.map((c, i) => {
        const laneZ = (i - (cars.length - 1) / 2) * LANE_W;
        return (
          <group key={c.id}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[c.total, 0.007, laneZ]}>
              <planeGeometry args={[0.35, LANE_W - 0.5]} />
              <meshStandardMaterial color={c.color} emissive={c.color} emissiveIntensity={0.4} />
            </mesh>
            <group
              ref={(el) => {
                groups.current[i] = el;
              }}
              position={[0, 0, laneZ]}
            >
              <StylizedCar
                modelId={c.modelId}
                color={c.color}
                wheelbaseMm={c.wheelbaseMm}
                bootLitres={c.bootLitres}
                bodyStyle={c.bodyStyle}
                dna={c.dna}
                motionRef={motions.current[i]}
              />
            </group>
          </group>
        );
      })}
    </>
  );
}

export default function Braking3D({
  initialVariant,
  initialComparison,
}: {
  initialVariant?: string;
  initialComparison?: string;
}) {
  const [idA, setIdA] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("drivescope_selected_variant");
      if (stored) return stored;
    }
    return initialVariant ?? "creta-sx-o-turbo-dct";
  });
  const [idB, setIdB] = useState(initialComparison ?? "");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("drivescope_selected_variant");
      if (stored && stored !== idA) {
        setIdA(stored);
      }
    }
  }, []);
  const [speed, setSpeed] = useState(80);
  const [running, setRunning] = useState(false);
  const [runId, setRunId] = useState(0);
  const [slowMo, setSlowMo] = useState(false);
  const [done, setDone] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const runningRef = useRef(false);
  const slowMoRef = useRef(false);
  runningRef.current = running;
  slowMoRef.current = slowMo;

  const cars = useMemo(
    () => [idA, idB].filter(Boolean).map((id) => build(id, speed)).filter((c): c is BrakeCar => !!c),
    [idA, idB, speed]
  );
  const gapCarLengths = cars.length === 2 ? Math.abs(cars[0].total - cars[1].total) / CAR_LENGTH_M : null;

  return (
    <div className="glass p-6">
      <div className="grid gap-3 sm:grid-cols-3 mb-5">
        <VariantSelect label="Car" value={idA} onChange={(x) => {
          setIdA(x);
          setDone(false);
          if (typeof window !== "undefined") {
            localStorage.setItem("drivescope_selected_variant", x);
          }
        }} />
        <VariantSelect label="Compare against (optional)" value={idB} allowNone onChange={(x) => { setIdB(x); setDone(false); }} />
        <DriveRange
          label="Speed"
          value={speed}
          onChange={(v) => { setSpeed(v); setDone(false); }}
          min={60}
          max={100}
          step={20}
          format={(v) => `${v} km/h`}
          presets={[60, 80, 100]}
          presetFormat={(v) => `${v}`}
          accentClass="accent-[#E8590C]"
        />
      </div>

      <div className="relative">
        <div ref={containerRef} className="relative w-full aspect-[16/9] sm:aspect-[21/9] rounded-xl overflow-hidden">
          <Stage key={`${cars.map((c) => c.id).join(",")}-${speed}-${runId}`} camera={{ position: [30, 40, 26], fov: 40 }} fog={[80, 300]}>
            <BrakeScene
              cars={cars}
              speed={speed}
              runningRef={runningRef}
              slowMoRef={slowMoRef}
              onDone={() => { setRunning(false); setDone(true); }}
            />
          </Stage>
        </div>

        <div className="sm:absolute relative sm:top-3 sm:left-4 top-auto left-auto mt-3 sm:mt-0 p-3 rounded-xl border border-[#161616]/10 bg-[#F4F0E8]/90 backdrop-blur-sm text-[10px] sm:text-xs text-secondary stat-num pointer-events-none z-10 shadow-sm">
          from {speed} km/h · reaction 1.0 s shown in amber
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mt-5">
        <button
          onClick={() => { setDone(false); setRunId((r) => r + 1); setRunning(true); }}
          disabled={running || cars.length === 0}
          className="px-8 py-3 rounded-xl bg-accent text-white font-semibold text-lg disabled:opacity-40 transition-transform duration-200 hover:scale-[1.03]"
        >
          {running ? "Braking…" : "Run"}
        </button>
        <label className="flex items-center gap-2 text-sm text-secondary cursor-pointer">
          <input type="checkbox" checked={slowMo} onChange={(e) => setSlowMo(e.target.checked)} />
          Slow-mo replay
        </label>
        <button
          onClick={() => {
            const canvas = containerRef.current?.querySelector("canvas");
            if (canvas) downloadCanvasPng(canvas as HTMLCanvasElement, "drivescope-braking.png");
          }}
          className="px-4 py-2 rounded-lg glass text-sm hover:bg-white/[0.08]"
        >
          Share image ↓
        </button>
        {cars.some((c) => c.estimated) && (
          <EstimatedBadge tooltip="Braking distances are modeled from the segment baseline (41 m from 100), adjusted for weight and brake/wheel spec." />
        )}
      </div>

      {done && cars.length > 0 && (
        <div className="mt-4 text-sm leading-relaxed space-y-1">
          {cars.map((c) => {
            const obstacle = OBSTACLE_AT[speed];
            const vImpact = impactSpeed(speed, c.d100, obstacle);
            return (
              <p key={c.id}>
                {c.label}: <span className="stat-num">{c.total.toFixed(1)} m</span> total from {speed} km/h
                (incl. {(speed * KMH_TO_MS * REACTION_TIME_S).toFixed(0)} m reaction,{" "}
                {brakingDistance(speed, c.d100).toFixed(1)} m braking).{" "}
                {c.total <= obstacle ? (
                  <span style={{ color: "var(--positive)" }}>
                    Stops {(obstacle - c.total).toFixed(1)} m before the obstacle.
                  </span>
                ) : (
                  <span style={{ color: "var(--warning)" }}>
                    Would reach the obstacle at ~{vImpact.toFixed(0)} km/h.
                  </span>
                )}
              </p>
            );
          })}
          {gapCarLengths !== null && (
            <p style={{ color: "var(--accent)" }}>Gap: {gapCarLengths.toFixed(1)} car lengths.</p>
          )}
        </div>
      )}

      <div className="border border-[#161616]/10 bg-[#F4F0E8]/40 p-4 rounded-2xl mt-5 text-[11px] text-secondary leading-relaxed">
        <p className="font-semibold text-primary mb-1 font-mono uppercase tracking-wider text-[10px]">Jargon Guide: Reaction vs Braking distance //</p>
        <p>
          <strong>Reaction Distance</strong> is the distance the car covers while you are moving your foot from the gas to the brake pedal (modeled at a standard 1.0 second reaction time).
          <strong> Braking Distance</strong> is the physical stopping distance once the brakes are fully clamped. Total stopping distance is the sum of both.
        </p>
      </div>
    </div>
  );
}
