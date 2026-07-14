"use client";

import { useMemo, useState } from "react";
import { costParams, formatLakh, getModel, getVariant, models, variants, formatCityFuelLabel } from "@/lib/data";
import { dieselPairsForModel, fuelDecision } from "@/lib/cost";
import EstimatedBadge from "./EstimatedBadge";
import DriveSelect from "@/components/ui/DriveSelect";

export default function FuelDecisionCard({ initialModelId }: { initialModelId?: string }) {
  const dieselModels = useMemo(
    () =>
      models.filter(
        (m) =>
          variants.some((v) => v.modelId === m.id && v.fuel === "diesel") &&
          dieselPairsForModel(m.id).length > 0
      ),
    []
  );
  const [modelId, setModelId] = useState(
    initialModelId && dieselModels.some((m) => m.id === initialModelId)
      ? initialModelId
      : dieselModels[0]?.id
  );
  const [cityId, setCityId] = useState("hyderabad");
  const [kmPerYear, setKmPerYear] = useState(12000);

  const pairs = useMemo(() => dieselPairsForModel(modelId), [modelId]);
  const [pairIdx, setPairIdx] = useState(0);
  const pair = pairs[Math.min(pairIdx, pairs.length - 1)];
  const city = costParams.cities.find((c) => c.id === cityId)!;
  const fd = pair ? fuelDecision(pair.petrolId, pair.dieselId, city, kmPerYear) : null;
  const model = getModel(modelId);

  if (dieselModels.length === 0) return null;

  return (
    <div className="glass p-8">
      <h2 className="text-2xl font-semibold tracking-tight mb-1">Petrol or diesel?</h2>
      <p className="text-sm text-secondary mb-6">
        Same car, two fuels — how many kilometres until the diesel premium pays for itself.
      </p>

      <div className="grid gap-4 sm:grid-cols-4 mb-6">
        <label className="block text-sm">
          <span className="mb-1.5 block text-secondary text-xs">Car</span>
          <DriveSelect
            value={modelId!}
            onChange={(val) => { setModelId(val); setPairIdx(0); }}
            ariaLabel="Car"
            options={dieselModels.map((m) => ({ value: m.id, label: m.name }))}
            className="w-full"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block text-secondary text-xs">Trim pair</span>
          <DriveSelect
            value={pairIdx.toString()}
            onChange={(val) => setPairIdx(Number(val))}
            ariaLabel="Trim pair"
            options={pairs.map((p, i) => ({ value: i.toString(), label: p.label }))}
            className="w-full"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block text-secondary text-xs">City</span>
          <DriveSelect
            value={cityId}
            onChange={setCityId}
            ariaLabel="City"
            options={costParams.cities.map((c) => ({ value: c.id, label: formatCityFuelLabel(c) }))}
            className="w-full"
          />
        </label>
        <label className="block text-sm">
          <span className="text-secondary text-xs">
            Driving: <span className="stat-num text-primary">{(kmPerYear / 1000).toFixed(0)}k km/yr</span>
          </span>
          <input
            type="range" min={5000} max={30000} step={1000} value={kmPerYear}
            onChange={(e) => setKmPerYear(Number(e.target.value))}
            className="w-full mt-3 accent-[#E8590C]"
          />
        </label>
      </div>

      {fd && pair && (
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="stat-num text-3xl font-semibold">{formatLakh(fd.premium)}</p>
            <p className="text-xs text-secondary mt-1">
              diesel premium ({getVariant(pair.dieselId)?.name} vs {getVariant(pair.petrolId)?.name})
            </p>
          </div>
          <div>
            <p className="stat-num text-3xl font-semibold">
              ₹{fd.dieselFuelPerKm.toFixed(1)} <span className="text-base text-secondary">vs ₹{fd.petrolFuelPerKm.toFixed(1)}/km</span>
            </p>
            <p className="text-xs text-secondary mt-1">fuel cost per km, diesel vs petrol <EstimatedBadge /></p>
          </div>
          <div>
            {fd.breakevenKm !== null ? (
              <>
                <p className="stat-num text-3xl font-semibold" style={{ color: fd.breakevenYears! <= 5 ? "var(--positive)" : "var(--warning)" }}>
                  {(fd.breakevenKm / 1000).toFixed(0)}k km
                </p>
                <p className="text-xs text-secondary mt-1">
                  breakeven — ~{fd.breakevenYears!.toFixed(1)} years at your usage.{" "}
                  {fd.breakevenYears! <= 5
                    ? `${model?.name} diesel makes sense for you.`
                    : "Below ~5 years is where diesel starts making sense."}
                </p>
              </>
            ) : (
              <p className="text-sm text-secondary">Diesel never pays back at these prices.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
