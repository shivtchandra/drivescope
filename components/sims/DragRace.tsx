"use client";

import { useEffect, useRef, useState } from "react";
import { getModel, getTestData, getVariant } from "@/lib/data";
import { getSimComparisonColor } from "@/lib/simCarColors";
import { distanceAt, downloadCanvasPng, speedAt } from "@/lib/sim";
import EstimatedBadge from "@/components/EstimatedBadge";
import VariantSelect from "./VariantSelect";
import { ACCENT, CANVAS_BG, MONO_FONT, TEXT_PRIMARY, TEXT_SECONDARY, drawCarSide } from "./simCanvas";

import { CAR_IMAGE_MAP } from "@/lib/carImageMap";

interface Racer {
  variantId: string;
  label: string;
  shortLabel: string;
  slot: number;
  color: string;
  t100: number;
  estimated: boolean;
  modelId: string;
}

function buildRacer(variantId: string, slotIndex: number): Racer | null {
  const v = getVariant(variantId);
  if (!v) return null;
  const m = getModel(v.modelId)!;
  const td = getTestData(v.id);
  if (!td?.zeroTo100.value) return null;
  return {
    variantId,
    label: `${m.name} ${v.name}`,
    shortLabel: v.name,
    slot: slotIndex + 1,
    color: getSimComparisonColor(slotIndex),
    t100: td.zeroTo100.value,
    estimated: td.zeroTo100.estimated,
    modelId: v.modelId,
  };
}

export default function DragRace({ initialVariants }: { initialVariants: string[] }) {
  const [ids, setIds] = useState<string[]>([
    initialVariants[0] ?? "creta-sx-o-turbo-dct",
    initialVariants[1] ?? "gv-zeta-plus-hybrid",
    initialVariants[2] ?? "",
  ]);
  const [running, setRunning] = useState(false);
  const [slowMo, setSlowMo] = useState(false);
  const [caption, setCaption] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({ t: 0, last: 0, raf: 0 });
  const slowMoRef = useRef(false);
  slowMoRef.current = slowMo;

  const [loadedImages, setLoadedImages] = useState<Record<string, HTMLImageElement | null>>({});

  const racers = ids
    .map((id, slot) => (id ? buildRacer(id, slot) : null))
    .filter((r): r is Racer => !!r);

  // Pre-load transparent car PNG images when selected ids change
  useEffect(() => {
    const newImages: Record<string, HTMLImageElement | null> = {};
    let active = true;

    racers.forEach((r) => {
      const url = CAR_IMAGE_MAP[r.modelId];
      if (url) {
        // Only load if not already loaded
        if (!loadedImages[r.modelId]) {
          const img = new Image();
          img.src = url;
          img.onload = () => {
            if (active) {
              setLoadedImages((prev) => ({ ...prev, [r.modelId]: img }));
            }
          };
          img.onerror = () => {
            if (active) {
              setLoadedImages((prev) => ({ ...prev, [r.modelId]: null }));
            }
          };
        }
      }
    });

    return () => {
      active = false;
    };
  }, [ids, racers]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.width, H = canvas.height;
    const slowest = Math.max(...racers.map((r) => r.t100), 1);
    const trackM = distanceAt(slowest, Math.min(...racers.map((r) => r.t100), slowest));
    const pxPerM = (W - 140) / trackM;

    const draw = (t: number) => {
      ctx.fillStyle = CANVAS_BG;
      ctx.fillRect(0, 0, W, H);
      const laneH = H / Math.max(racers.length, 1);

      racers.forEach((r, i) => {
        const y = laneH * i;
        // lane divider + finish-ish marker for the fastest car's 100 km/h point
        ctx.strokeStyle = "rgba(255,255,255,0.07)";
        ctx.beginPath();
        ctx.moveTo(0, y + laneH);
        ctx.lineTo(W, y + laneH);
        ctx.stroke();

        const dist = distanceAt(Math.min(t, r.t100), r.t100);
        const speed = speedAt(t, r.t100);
        const x = 20 + dist * pxPerM;
        const img = loadedImages[r.modelId] || null;
        drawCarSide(ctx, x, y + laneH * 0.25, 84, laneH * 0.5, r.color, img);

        ctx.fillStyle = TEXT_PRIMARY;
        ctx.font = MONO_FONT;
        ctx.fillText(`Car ${r.slot} · ${r.shortLabel}`, 20, y + 18);
        ctx.fillStyle = speed >= 100 ? ACCENT : TEXT_SECONDARY;
        ctx.fillText(`${speed.toFixed(0)} km/h${r.estimated ? " ~" : ""}`, W - 90, y + 18);
        if (t >= r.t100) ctx.fillText(`${r.t100.toFixed(1)}s`, W - 90, y + 34);
      });

      ctx.fillStyle = TEXT_SECONDARY;
      ctx.font = MONO_FONT;
      ctx.fillText(`t = ${t.toFixed(2)}s${slowMoRef.current ? "  (slow-mo ×0.25)" : ""}`, 20, H - 10);
    };

    if (!running) {
      draw(stateRef.current.t);
      return;
    }

    stateRef.current = { t: 0, last: performance.now(), raf: 0 };
    const loop = (now: number) => {
      const dt = ((now - stateRef.current.last) / 1000) * (slowMoRef.current ? 0.25 : 1);
      stateRef.current.last = now;
      stateRef.current.t += dt;
      const t = stateRef.current.t;
      draw(t);

      if (t >= slowest + 0.5) {
        const winner = [...racers].sort((a, b) => a.t100 - b.t100)[0];
        const last = [...racers].sort((a, b) => b.t100 - a.t100)[0];
        if (winner !== last) {
          const lastSpeed = speedAt(winner.t100, last.t100);
          const gapM = distanceAt(winner.t100, winner.t100) - distanceAt(winner.t100, last.t100);
          setCaption(
            `The ${winner.label} reaches 100 while the ${last.label} is still at ${lastSpeed.toFixed(0)} km/h — a gap of ${gapM.toFixed(0)} m and ${(last.t100 - winner.t100).toFixed(1)} s.`
          );
        }
        setRunning(false);
        return;
      }
      stateRef.current.raf = requestAnimationFrame(loop);
    };
    stateRef.current.raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(stateRef.current.raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, ids.join(",")]);

  return (
    <div className="glass p-6">
      <div className="grid gap-3 sm:grid-cols-3 mb-5">
        {[0, 1, 2].map((i) => (
          <VariantSelect
            key={i}
            label={i === 2 ? "Car 3 (optional)" : `Car ${i + 1}`}
            value={ids[i]}
            allowNone={i === 2}
            onChange={(id) => setIds((p) => p.map((x, j) => (j === i ? id : x)))}
          />
        ))}
      </div>

      <canvas ref={canvasRef} width={840} height={300} className="w-full rounded-xl" />

      <div className="flex flex-wrap items-center gap-3 mt-5">
        <button
          onClick={() => { setCaption(null); setRunning(true); }}
          disabled={running || racers.length < 2}
          className="px-8 py-3 rounded-xl bg-accent text-white font-semibold text-lg disabled:opacity-40 transition-transform duration-200 hover:scale-[1.03]"
        >
          {running ? "Racing…" : "Run"}
        </button>
        <label className="flex items-center gap-2 text-sm text-secondary cursor-pointer">
          <input type="checkbox" checked={slowMo} onChange={(e) => setSlowMo(e.target.checked)} />
          Slow-mo replay
        </label>
        <button
          onClick={() => canvasRef.current && downloadCanvasPng(canvasRef.current, "drivescope-drag-race.png")}
          className="px-4 py-2 rounded-lg glass text-sm hover:bg-white/[0.08]"
        >
          Share image ↓
        </button>
        {racers.some((r) => r.estimated) && <EstimatedBadge tooltip="One or more 0–100 times are modeled from weight and power, not instrumented tests." />}
      </div>

      {caption && <p className="mt-4 text-sm leading-relaxed border-l-2 pl-4" style={{ borderColor: ACCENT }}>{caption}</p>}
    </div>
  );
}
