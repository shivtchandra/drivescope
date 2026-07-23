"use client";

import React, { useMemo, useCallback } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { costParams, formatLakh, getModel, getVariant, formatCityFuelLabel } from "@/lib/data";
import { computeCost } from "@/lib/cost";
import EstimatedBadge from "./EstimatedBadge";
import VariantSelect from "./sims/VariantSelect";
import DriveSelect from "@/components/ui/DriveSelect";
import DriveRange from "@/components/ui/DriveRange";
import MobileResultsBar from "@/components/mobile/MobileResultsBar";
import { usePersistedPageState } from "@/lib/use-persisted-page-state";

const SERIES = [
  { key: "fuel", label: "Fuel", color: "#C74B32" },
  { key: "insurance", label: "Insurance", color: "#161616" },
  { key: "maintenance", label: "Maintenance", color: "rgba(22, 22, 22, 0.6)" },
  { key: "tyres", label: "Tyres", color: "rgba(22, 22, 22, 0.35)" },
  { key: "depreciation", label: "Depreciation", color: "rgba(22, 22, 22, 0.15)" },
] as const;

function variantLabel(variantId: string) {
  const v = getVariant(variantId);
  const m = v && getModel(v.modelId);
  return v && m ? `${m.name} ${v.name}` : variantId;
}

function ownershipScore(costPerKm: number, total: number): number {
  const benchmark = 8.5;
  const kmScore = Math.max(0, Math.min(5, (benchmark - costPerKm) / benchmark * 5 + 2.5));
  const totalLakh = total / 100000;
  const costScore = Math.max(0, Math.min(5, 5 - (totalLakh - 4) / 8));
  return Math.round((kmScore + costScore) * 10) / 10;
}

export default function FinancialCommandCenter() {
  const [state, setState] = usePersistedPageState("home-cost", {
    idA: "creta-sx-mt",
    idB: "",
    compareEnabled: false,
    cityId: "hyderabad",
    kmPerYear: 12000,
    years: 5,
  });
  const { idA, idB, compareEnabled, cityId, kmPerYear, years } = state;
  const setIdA = useCallback((v: string) => setState((p) => ({ ...p, idA: v })), [setState]);
  const setIdB = useCallback((v: string) => setState((p) => ({ ...p, idB: v })), [setState]);
  const setCompareEnabled = useCallback((v: boolean) => setState((p) => ({ ...p, compareEnabled: v })), [setState]);
  const setCityId = useCallback((v: string) => setState((p) => ({ ...p, cityId: v })), [setState]);
  const setKmPerYear = useCallback((v: number) => setState((p) => ({ ...p, kmPerYear: v })), [setState]);
  const setYears = useCallback((v: number) => setState((p) => ({ ...p, years: v })), [setState]);

  const city = useMemo(() => costParams.cities.find((c) => c.id === cityId)!, [cityId]);
  const costA = useMemo(() => computeCost(idA, city, kmPerYear, years), [idA, city, kmPerYear, years]);
  const costB = useMemo(() => (compareEnabled && idB ? computeCost(idB, city, kmPerYear, years) : null), [compareEnabled, idB, city, kmPerYear, years]);

  const score = costA ? ownershipScore(costA.costPerKm, costA.total) : 0;

  const chartData = useMemo(() => {
    if (!costA) return [];
    return costA.years.map((y) => {
      const row: Record<string, number | string> = { name: `Yr ${y.year}` };
      for (const s of SERIES) row[s.label] = Math.round(y[s.key as keyof typeof y]);
      return row;
    });
  }, [costA]);

  const delta = costA && costB ? costA.total - costB.total : null;

  const profileFields = (
    <>
      <label className="block text-sm">
        <span className="text-[#161616]/65 text-xs block mb-1 uppercase tracking-wider">City Location</span>
        <DriveSelect
          value={cityId}
          onChange={setCityId}
          ariaLabel="City Location"
          options={costParams.cities.map((c) => ({ value: c.id, label: formatCityFuelLabel(c) }))}
          className="w-full mt-2"
        />
      </label>
      <DriveRange
        label="Driving"
        value={kmPerYear}
        onChange={setKmPerYear}
        min={5000}
        max={30000}
        step={1000}
        format={(v) => `${(v / 1000).toFixed(0)}k km/yr`}
        presets={[8000, 12000, 18000]}
        presetFormat={(v) => `${v / 1000}k km/yr`}
        accentClass="accent-[#C74B32]"
      />
      <DriveRange
        label="Ownership"
        value={years}
        onChange={setYears}
        min={3}
        max={8}
        step={1}
        format={(v) => `${v} years`}
        presets={[3, 5, 7]}
        presetFormat={(v) => `${v} yr`}
        accentClass="accent-[#C74B32]"
      />
    </>
  );

  const outputCard = costA && (
    <div className="border border-[#161616]/10 bg-[#ECE7DF] p-6 rounded-2xl relative overflow-hidden">
      <p className="text-[9px] tracking-widest text-[#C74B32] uppercase mb-3 font-bold">Output Terminal</p>
      <p className="text-4xl font-semibold text-[#161616]">
        ₹{costA.costPerKm.toFixed(1)}
        <span className="text-base text-[#161616]/60 font-normal ml-1">/km</span>
      </p>
      <p className="text-sm text-[#C74B32] font-semibold mt-2 flex items-center gap-1.5">
        {formatLakh(costA.total)} total lifecycle
        <EstimatedBadge tooltip="Modeled using city fuel price, brand maintenance, tyres and depreciation." />
      </p>
      <div className="mt-5 pt-4 border-t border-[#161616]/5 grid grid-cols-2 gap-3 text-xs">
        {[
          { l: "Fuel", v: formatLakh(costA.totalFuel) },
          { l: "Maintenance", v: formatLakh(costA.totalMaintenance) },
          { l: "Insurance", v: formatLakh(costA.totalInsurance) },
          { l: "Depreciation", v: formatLakh(costA.totalDepreciation), accent: true },
        ].map((row) => (
          <div key={row.l}>
            <span className="block text-[#161616]/50 text-[9px] uppercase">{row.l}</span>
            <span className={`font-semibold ${row.accent ? "text-[#C74B32]" : "text-[#161616]"}`}>{row.v}</span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-12 text-[#161616] pb-safe">
      {/* Mobile: flat form, live results */}
      <div className="sm:hidden space-y-5">
        <div className="border border-[#161616]/10 bg-[#ECE7DF] p-5 rounded-2xl space-y-5">
          <VariantSelect label="Your car" value={idA} onChange={setIdA} />
          <div className="rounded-xl border border-[#C84C31]/25 bg-[#C84C31]/[0.06] p-4 space-y-3">
            <label className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Compare with another car</p>
                <p className="text-xs text-secondary mt-1">See who costs less over {years} years.</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={compareEnabled}
                onClick={() => { setCompareEnabled(!compareEnabled); if (compareEnabled) setIdB(""); }}
                className={`relative shrink-0 w-11 h-6 rounded-full transition-colors mt-0.5 ${compareEnabled ? "bg-[#C74B32]" : "bg-[#161616]/15"}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${compareEnabled ? "translate-x-5" : ""}`} />
              </button>
            </label>
            {compareEnabled && <VariantSelect label="Car to compare" value={idB} onChange={setIdB} />}
          </div>
          <div className="border-t border-[#161616]/10 pt-5 space-y-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#161616]/50">Your driving profile</p>
            {profileFields}
          </div>
        </div>
        {outputCard}
        {costB && (
          <div className="border border-[#161616]/10 bg-[#ECE7DF] p-5 rounded-2xl text-sm">
            <p className="text-[9px] text-[#161616]/50 uppercase tracking-widest mb-2">Comparison</p>
            <p className="text-[#161616]/90">
              <span className="font-semibold">{variantLabel(idB)}</span> — <span className="text-[#C74B32] font-bold">{formatLakh(costB.total)}</span>
            </p>
          </div>
        )}
      </div>

      {/* Desktop 3-column */}
      <div className="hidden lg:grid lg:grid-cols-12 gap-6 lg:gap-4 items-stretch">
        <div className="lg:col-span-4 space-y-5" data-reveal>
          <div className="border border-[#161616]/10 bg-[#ECE7DF] p-6 rounded-2xl space-y-5 h-full">
            <p className="text-[9px] tracking-[0.3em] text-[#C74B32] uppercase font-bold">Input Terminal</p>
            <VariantSelect label="Your car" value={idA} onChange={setIdA} />
            <VariantSelect label="Compare against (optional)" value={idB} allowNone onChange={(v) => { setIdB(v); setCompareEnabled(!!v); }} />
            {profileFields}
          </div>
        </div>
        <div className="lg:col-span-4 flex items-center justify-center" data-reveal>
          <div className="relative w-full max-w-[280px] aspect-square flex items-center justify-center">
            <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 200 200">
              <circle cx="100" cy="100" r="88" fill="none" stroke="rgba(22, 22, 22, 0.05)" strokeWidth="3" />
              <circle cx="100" cy="100" r="88" fill="none" stroke="#C74B32" strokeWidth="3" strokeLinecap="round" strokeDasharray={`${(score / 10) * 553} 553`} className="transition-all duration-700" />
            </svg>
            <div className="text-center z-10">
              <p className="text-[9px] tracking-[0.35em] text-[#C74B32] uppercase mb-2 font-bold">Ownership Score</p>
              <p className="text-6xl sm:text-7xl font-bold text-[#161616]">{score.toFixed(1)}</p>
              <p className="text-xs text-[#161616]/60 mt-1">out of 10.0</p>
              {costA && <p className="text-[9px] text-[#161616]/50 mt-4 uppercase tracking-widest max-w-[180px] mx-auto truncate">{variantLabel(idA)}</p>}
            </div>
            <div className="absolute inset-4 rounded-full border border-[#161616]/5 pointer-events-none" />
          </div>
        </div>
        <div className="lg:col-span-4 space-y-4" data-reveal>
          {outputCard}
          {costB && (
            <div className="border border-[#161616]/10 bg-[#ECE7DF] p-5 rounded-2xl text-sm">
              <p className="text-[9px] text-[#161616]/50 uppercase tracking-widest mb-2">Comparison</p>
              <p className="text-[#161616]/90">
                <span className="font-semibold">{variantLabel(idB)}</span> — <span className="text-[#C74B32] font-bold">{formatLakh(costB.total)}</span>
              </p>
            </div>
          )}
        </div>
      </div>

      {delta !== null && Math.abs(delta) > 1000 && (
        <div className="border-l-2 pl-4 py-1.5 border-[#C74B32] bg-[#C74B32]/5 max-w-3xl" data-reveal>
          <p className="text-sm text-[#161616]/90 leading-relaxed">
            Insight: <span className="font-semibold">{variantLabel(delta > 0 ? idB : idA)}</span> costs{" "}
            <span className="font-bold text-[#C74B32]">{formatLakh(Math.abs(delta))}</span> less over {years} years.
          </p>
        </div>
      )}

      {costA && chartData.length > 0 && (
        <div className="border border-[#161616]/10 bg-[#ECE7DF] p-6 sm:p-8 rounded-2xl" data-reveal>
          <h4 className="text-xs text-[#C74B32] uppercase tracking-widest mb-6 font-bold">
            Year-over-Year Accumulation — {variantLabel(idA)}
          </h4>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                <XAxis dataKey="name" stroke="#161616" strokeOpacity={0.6} fontSize={11} tickLine={false} />
                <YAxis stroke="#161616" strokeOpacity={0.6} fontSize={11} tickLine={false} tickFormatter={(v: number) => `${(v / 100000).toFixed(1)}L`} />
                <Tooltip formatter={(v) => `₹${Number(v).toLocaleString("en-IN")}`} contentStyle={{ background: "#F4F0E8", border: "1px solid rgba(22, 22, 22, 0.1)", borderRadius: 12 }} labelStyle={{ color: "#161616", fontSize: 12 }} itemStyle={{ color: "#161616" }} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                {SERIES.map((s) => (
                  <Bar key={s.key} dataKey={s.label} stackId="a" fill={s.color} radius={s.key === "depreciation" ? [4, 4, 0, 0] : 0} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {costA && (
        <MobileResultsBar
          headline={`₹${costA.costPerKm.toFixed(1)}/km`}
          subline={`${formatLakh(costA.total)} total · ${variantLabel(idA)}`}
          lines={[
            { label: "Fuel", value: formatLakh(costA.totalFuel) },
            { label: "Insurance", value: formatLakh(costA.totalInsurance) },
            { label: "Maintenance", value: formatLakh(costA.totalMaintenance) },
            { label: "Depreciation", value: formatLakh(costA.totalDepreciation), accent: true },
          ]}
        />
      )}
    </div>
  );
}
