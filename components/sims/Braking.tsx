"use client";

import { useEffect, useRef, useState } from "react";
import { getBrand, getModel, getTestData, getVariant } from "@/lib/data";
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
import VariantSelect from "./VariantSelect";
import DriveRange from "@/components/ui/DriveRange";
import { ACCENT, CANVAS_BG, MONO_FONT, TEXT_PRIMARY, TEXT_SECONDARY, drawCarTop } from "./simCanvas";

const CAR_LENGTH_M = 4.4;

// Obstacle appears at a fixed, speed-dependent distance (typical urban/highway hazard gaps).
const OBSTACLE_AT: Record<number, number> = { 60: 45, 80: 70, 100: 100 };

export default function Braking({ initialVariant, initialComparison }: { initialVariant?: string; initialComparison?: string }) {
  const [idA, setIdA] = useState(initialVariant ?? "creta-sx-o-turbo-dct");
  const [idB, setIdB] = useState(initialComparison ?? "");
  const [speed, setSpeed] = useState(80);
  const [running, setRunning] = useState(false);
  const [slowMo, setSlowMo] = useState(false);
  const [done, setDone] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({ t: 0, last: 0, raf: 0 });
  const slowMoRef = useRef(false);
  slowMoRef.current = slowMo;

  const cars = [idA, idB].filter(Boolean).map((id) => {
    const v = getVariant(id);
    if (!v) return null;
    const m = getModel(v.modelId)!;
    const td = getTestData(id);
    const d100 = td?.braking100to0.value;
    if (!d100) return null;
    return {
      id,
      label: `${m.name} ${v.name}`,
      color: getBrand(m.brandId)!.color,
      d100,
      estimated: td.braking100to0.estimated,
      total: totalStoppingDistance(speed, d100),
      braking: brakingDistance(speed, d100),
    };
  }).filter((c): c is NonNullable<typeof c> => !!c);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || cars.length === 0) return;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.width, H = canvas.height;
    const maxTotal = Math.max(...cars.map((c) => c.total)) * 1.15;
    const pxPerM = (W - 60) / maxTotal;
    const v0 = speed * KMH_TO_MS;

    const posAt = (t: number, d100: number) => {
      if (t <= REACTION_TIME_S) return v0 * t;
      const a = decelFromBraking100(d100);
      const tb = Math.min(t - REACTION_TIME_S, v0 / a);
      return v0 * REACTION_TIME_S + v0 * tb - 0.5 * a * tb * tb;
    };
    const speedAtT = (t: number, d100: number) => {
      if (t <= REACTION_TIME_S) return speed;
      const a = decelFromBraking100(d100);
      return Math.max(0, (v0 - a * (t - REACTION_TIME_S)) / KMH_TO_MS);
    };

    const draw = (t: number) => {
      ctx.fillStyle = CANVAS_BG;
      ctx.fillRect(0, 0, W, H);
      const laneH = H / cars.length;

      cars.forEach((c, i) => {
        const y = laneH * i;
        // reaction zone band
        const reactionPx = v0 * REACTION_TIME_S * pxPerM;
        ctx.fillStyle = "rgba(251,191,36,0.08)";
        ctx.fillRect(30, y + laneH * 0.2, reactionPx, laneH * 0.6);
        ctx.fillStyle = "rgba(251,191,36,0.6)";
        ctx.font = MONO_FONT;
        ctx.fillText("reaction 1.0s", 34, y + laneH * 0.32);

        // stopping point marker
        ctx.strokeStyle = c.color;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(30 + c.total * pxPerM, y + laneH * 0.15);
        ctx.lineTo(30 + c.total * pxPerM, y + laneH * 0.85);
        ctx.stroke();
        ctx.setLineDash([]);

        const dist = Math.min(posAt(t, c.d100), c.total);
        drawCarTop(ctx, 30 + dist * pxPerM - 36, y + laneH * 0.36, 56, laneH * 0.28, c.color);

        ctx.fillStyle = TEXT_PRIMARY;
        ctx.fillText(c.label, 34, y + 16);
        ctx.fillStyle = TEXT_SECONDARY;
        ctx.fillText(
          `${speedAtT(t, c.d100).toFixed(0)} km/h · ${dist.toFixed(1)} m`,
          W - 150, y + 16
        );
      });

      // obstacle marker
      const obstaclePx = 30 + OBSTACLE_AT[speed] * pxPerM;
      ctx.fillStyle = "rgba(248,113,113,0.85)";
      ctx.fillRect(obstaclePx - 3, 8, 6, H - 28);
      ctx.font = MONO_FONT;
      ctx.fillText(`obstacle · ${OBSTACLE_AT[speed]} m`, obstaclePx + 8, 20);

      ctx.fillStyle = TEXT_SECONDARY;
      ctx.font = MONO_FONT;
      ctx.fillText(`from ${speed} km/h${slowMoRef.current ? " (slow-mo ×0.25)" : ""}`, 30, H - 8);
    };

    if (!running) { draw(done ? 99 : 0); return; }

    const maxT = REACTION_TIME_S + Math.max(...cars.map((c) => v0 / decelFromBraking100(c.d100))) + 0.4;
    stateRef.current = { t: 0, last: performance.now(), raf: 0 };
    const loop = (now: number) => {
      const dt = ((now - stateRef.current.last) / 1000) * (slowMoRef.current ? 0.25 : 1);
      stateRef.current.last = now;
      stateRef.current.t += dt;
      draw(stateRef.current.t);
      if (stateRef.current.t >= maxT) { setRunning(false); setDone(true); return; }
      stateRef.current.raf = requestAnimationFrame(loop);
    };
    stateRef.current.raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(stateRef.current.raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, idA, idB, speed]);

  const gapCarLengths =
    cars.length === 2 ? Math.abs(cars[0].total - cars[1].total) / CAR_LENGTH_M : null;

  return (
    <div className="glass p-6">
      <div className="grid gap-3 sm:grid-cols-3 mb-5">
        <VariantSelect label="Car" value={idA} onChange={(x) => { setIdA(x); setDone(false); }} />
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

      <canvas ref={canvasRef} width={840} height={240} className="w-full rounded-xl" />

      <div className="flex flex-wrap items-center gap-3 mt-5">
        <button
          onClick={() => { setDone(false); setRunning(true); }}
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
          onClick={() => canvasRef.current && downloadCanvasPng(canvasRef.current, "drivescope-braking.png")}
          className="px-4 py-2 rounded-lg glass text-sm hover:bg-white/[0.08]"
        >
          Share image ↓
        </button>
        {cars.some((c) => c.estimated) && <EstimatedBadge tooltip="Braking distances are modeled from the segment baseline (41 m from 100), adjusted for weight and brake/wheel spec." />}
      </div>

      {done && cars.length > 0 && (
        <div className="mt-4 text-sm leading-relaxed space-y-1">
          {cars.map((c) => {
            const obstacle = OBSTACLE_AT[speed];
            const vImpact = impactSpeed(speed, c.d100, obstacle);
            return (
              <p key={c.id}>
                {c.label}: <span className="stat-num">{c.total.toFixed(1)} m</span> total from {speed} km/h
                (incl. {(speed * KMH_TO_MS * REACTION_TIME_S).toFixed(0)} m reaction).{" "}
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
            <p style={{ color: ACCENT }}>
              Gap: {gapCarLengths.toFixed(1)} car lengths.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
