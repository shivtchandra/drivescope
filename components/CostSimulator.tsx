"use client";

import { useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { costParams, formatLakh, getModel, getVariant, formatCityFuelLabel } from "@/lib/data";
import { computeCost, type CostResult } from "@/lib/cost";
import EstimatedBadge from "./EstimatedBadge";
import VariantSelect from "./sims/VariantSelect";
import DriveSelect from "@/components/ui/DriveSelect";
import DriveRange from "@/components/ui/DriveRange";
import { TrendingDown, Wrench, Disc } from "lucide-react";
import MobileResultsBar from "@/components/mobile/MobileResultsBar";
import MobileSwipePanels from "@/components/mobile/MobileSwipePanels";
import { usePersistedPageState, usePersistedScroll } from "@/lib/use-persisted-page-state";

const SERIES = [
  { key: "fuel", label: "Fuel", color: "#E8590C" },
  { key: "insurance", label: "Insurance", color: "#60A5FA" },
  { key: "maintenance", label: "Maintenance", color: "#4ADE80" },
  { key: "tyres", label: "Tyres", color: "#FBBF24" },
  { key: "depreciation", label: "Depreciation", color: "#A1A1AA" },
] as const;

function label(variantId: string) {
  const v = getVariant(variantId);
  const m = v && getModel(v.modelId);
  return v && m ? `${m.name} ${v.name}` : variantId;
}

function JargonDecoupler({
  activeJargonTab,
  setActiveJargonTab,
}: {
  activeJargonTab: "depreciation" | "maintenance" | "tyres";
  setActiveJargonTab: (t: "depreciation" | "maintenance" | "tyres") => void;
}) {
  return (
    <div className="glass p-6 bg-[#161616]/2 border-[#161616]/10 rounded-2xl">
      <h4 className="text-[10px] text-secondary uppercase tracking-[0.2em] mb-4 font-bold">
        Jargon Decoupler // Click to translate the math
      </h4>
      <div className="flex gap-1.5 border-b border-[#161616]/10 pb-3 mb-4 overflow-x-auto scrollbar-none">
        {[
          { key: "depreciation" as const, label: "Depreciation", icon: <TrendingDown className="h-3.5 w-3.5" /> },
          { key: "maintenance" as const, label: "Maintenance", icon: <Wrench className="h-3.5 w-3.5" /> },
          { key: "tyres" as const, label: "Tyres", icon: <Disc className="h-3.5 w-3.5" /> },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveJargonTab(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer ${
              activeJargonTab === tab.key
                ? "bg-[#C84C31] text-[#F5F1E8] shadow-sm"
                : "text-secondary hover:bg-[#161616]/5"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="text-xs leading-relaxed text-secondary space-y-3">
        {activeJargonTab === "depreciation" && (
          <>
            <p className="text-primary font-semibold text-sm flex items-center gap-1.5">
              <TrendingDown className="h-4 w-4" /> Depreciation: The &quot;Newness Tax&quot;
            </p>
            <p>
              <strong>The Analogy:</strong> Think of buying a car like buying fresh bananas. The second you walk out of the grocery store, they start ripening.
            </p>
          </>
        )}
        {activeJargonTab === "maintenance" && (
          <>
            <p className="text-primary font-semibold text-sm flex items-center gap-1.5">
              <Wrench className="h-4 w-4" /> Maintenance: Gym Membership for Cars
            </p>
            <p>
              <strong>The Analogy:</strong> Keeping a car running is like staying fit. Some cars keep fit on simple home-cooked meals.
            </p>
          </>
        )}
        {activeJargonTab === "tyres" && (
          <>
            <p className="text-primary font-semibold text-sm flex items-center gap-1.5">
              <Disc className="h-4 w-4" /> Tyres: Designer Sneakers vs Running Shoes
            </p>
            <p>
              <strong>The Analogy:</strong> Tyres are literally your car&apos;s shoes.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function CostResultCard({ id, r, cityName, years }: { id: string; r: CostResult; cityName: string; years: number }) {
  return (
    <div className="glass p-6 sm:p-8">
      <p className="text-sm text-secondary">{label(id)} · {cityName} · {years} yrs</p>
      <p className="stat-num text-4xl sm:text-5xl font-semibold mt-2">
        ₹{r.costPerKm.toFixed(1)}<span className="text-lg sm:text-xl text-secondary">/km</span>
      </p>
      <p className="stat-num text-secondary mt-2">
        {formatLakh(r.total)} total <EstimatedBadge tooltip="Modeled from city fuel price, brand maintenance and resale-retention tables in cost-params.json." />
      </p>
      <ul className="mt-5 space-y-1.5 text-sm text-secondary">
        <li>Fuel {formatLakh(r.totalFuel)} · Insurance {formatLakh(r.totalInsurance)}</li>
        <li>Maintenance {formatLakh(r.totalMaintenance)} · Tyres {formatLakh(r.totalTyres)}</li>
        <li>Depreciation {formatLakh(r.totalDepreciation)}</li>
      </ul>
    </div>
  );
}

function CompareSection({
  compareEnabled,
  setCompareEnabled,
  idB,
  setIdB,
  years,
}: {
  compareEnabled: boolean;
  setCompareEnabled: (v: boolean) => void;
  idB: string;
  setIdB: (v: string) => void;
  years: number;
}) {
  return (
    <div className="rounded-xl border border-[#C84C31]/25 bg-[#C84C31]/[0.06] p-4 space-y-3">
      <label className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-primary">Compare with another car</p>
          <p className="text-xs text-secondary mt-1 leading-relaxed">
            Add a second car to see who costs less over {years} years — side by side.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={compareEnabled}
          onClick={() => {
            setCompareEnabled(!compareEnabled);
            if (compareEnabled) setIdB("");
          }}
          className={`relative shrink-0 w-11 h-6 rounded-full transition-colors mt-0.5 ${compareEnabled ? "bg-[#C84C31]" : "bg-[#161616]/15"}`}
        >
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${compareEnabled ? "translate-x-5" : ""}`} />
        </button>
      </label>
      {compareEnabled && (
        <VariantSelect label="Car to compare" value={idB} onChange={setIdB} />
      )}
    </div>
  );
}

export default function CostSimulator({ initialVariants = [] }: { initialVariants?: string[] }) {
  const [state, setState] = usePersistedPageState("cost", {
    idA: initialVariants[0] ?? "creta-sx-mt",
    idB: initialVariants[1] ?? "",
    compareEnabled: !!initialVariants[1],
    cityId: "hyderabad",
    kmPerYear: 12000,
    years: 5,
    activeJargonTab: "depreciation" as "depreciation" | "maintenance" | "tyres",
    mobileResultTab: "summary",
  });
  const {
    idA, idB, compareEnabled, cityId, kmPerYear, years, activeJargonTab, mobileResultTab,
  } = state;
  const setIdA = useCallback((v: string) => setState((p) => ({ ...p, idA: v })), [setState]);
  const setIdB = useCallback((v: string) => setState((p) => ({ ...p, idB: v })), [setState]);
  const setCompareEnabled = useCallback((v: boolean) => setState((p) => ({ ...p, compareEnabled: v })), [setState]);
  const setCityId = useCallback((v: string) => setState((p) => ({ ...p, cityId: v })), [setState]);
  const setKmPerYear = useCallback((v: number) => setState((p) => ({ ...p, kmPerYear: v })), [setState]);
  const setYears = useCallback((v: number) => setState((p) => ({ ...p, years: v })), [setState]);
  const setActiveJargonTab = useCallback(
    (v: "depreciation" | "maintenance" | "tyres") => setState((p) => ({ ...p, activeJargonTab: v })),
    [setState],
  );
  const setMobileResultTab = useCallback((v: string) => setState((p) => ({ ...p, mobileResultTab: v })), [setState]);
  usePersistedScroll("cost");

  const city = costParams.cities.find((c) => c.id === cityId)!;
  const a = computeCost(idA, city, kmPerYear, years);
  const b = compareEnabled && idB ? computeCost(idB, city, kmPerYear, years) : null;

  const chartData =
    a?.years.map((y) => {
      const row: Record<string, number | string> = { name: `Yr ${y.year}` };
      for (const s of SERIES) row[s.label] = Math.round(y[s.key]);
      return row;
    }) ?? [];

  const delta = a && b ? a.total - b.total : null;

  const profileFields = (
    <>
      <label className="block text-sm">
        <span className="mb-1.5 block text-secondary text-xs">City</span>
        <DriveSelect
          value={cityId}
          onChange={setCityId}
          ariaLabel="City"
          options={costParams.cities.map((c) => ({
            value: c.id,
            label: formatCityFuelLabel(c),
          }))}
          className="w-full"
        />
        <p className="mt-1.5 text-[10px] text-[#4b4b4b]">
          Petrol ₹{city.petrolPrice.toFixed(2)}/l · Diesel ₹{city.dieselPrice.toFixed(2)}/l
          <span className="text-[#161616]/40"> · retail rates ~Apr 2026</span>
        </p>
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
        accentClass="accent-[#E8590C]"
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
        accentClass="accent-[#E8590C]"
      />
    </>
  );

  const chartBlock = a && (
    <div className="glass p-6">
      <h3 className="text-sm text-secondary mb-4">
        Yearly breakdown — {label(idA)} <EstimatedBadge />
      </h3>
      <div className="h-72">
        <ResponsiveContainer>
          <BarChart data={chartData}>
            <XAxis dataKey="name" stroke="#A1A1AA" fontSize={12} tickLine={false} />
            <YAxis stroke="#A1A1AA" fontSize={12} tickLine={false} tickFormatter={(v: number) => `${(v / 100000).toFixed(1)}L`} />
            <Tooltip
              formatter={(v) => `₹${Number(v).toLocaleString("en-IN")}`}
              contentStyle={{ background: "#F4F0E8", border: "1px solid rgba(22, 22, 22, 0.1)", borderRadius: 12 }}
              labelStyle={{ color: "#161616" }}
              itemStyle={{ color: "#161616" }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {SERIES.map((s) => (
              <Bar key={s.key} dataKey={s.label} stackId="a" fill={s.color} radius={s.key === "depreciation" ? [4, 4, 0, 0] : 0} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  const deltaBlock = delta !== null && Math.abs(delta) > 1000 && (
    <p className="text-base leading-relaxed border-l-2 pl-4 text-primary" style={{ borderColor: "var(--accent)" }}>
      The <span className="font-medium text-primary">{label(delta > 0 ? idB : idA)}</span> costs{" "}
      <span className="stat-num font-bold text-primary">{formatLakh(Math.abs(delta))}</span> less over {years} years
      {(() => {
        const cheaperId = delta > 0 ? idB : idA;
        const dearerUpfront =
          (getVariant(cheaperId)?.priceExShowroom ?? 0) >
          (getVariant(cheaperId === idA ? idB : idA)?.priceExShowroom ?? 0);
        return dearerUpfront ? " despite the higher purchase price" : "";
      })()}
      . <EstimatedBadge />
    </p>
  );

  return (
    <div className="space-y-8 pb-safe">
      {/* Mobile: single scrollable form, live results */}
      <div className="sm:hidden space-y-5">
        <div className="glass p-5 space-y-5">
          <VariantSelect label="Your car" value={idA} onChange={setIdA} />
          <CompareSection
            compareEnabled={compareEnabled}
            setCompareEnabled={setCompareEnabled}
            idB={idB}
            setIdB={setIdB}
            years={years}
          />
          <div className="border-t border-[#161616]/10 pt-5 space-y-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-secondary">Your driving profile</p>
            {profileFields}
          </div>
        </div>

        {a && (
          <MobileSwipePanels
            activeId={mobileResultTab}
            onChange={setMobileResultTab}
            panels={[
              {
                id: "summary",
                label: "Summary",
                content: (
                  <div className="space-y-4">
                    <CostResultCard id={idA} r={a} cityName={city.name} years={years} />
                    {b && <CostResultCard id={idB} r={b} cityName={city.name} years={years} />}
                    {deltaBlock}
                  </div>
                ),
              },
              { id: "chart", label: "Chart", content: chartBlock },
              {
                id: "explain",
                label: "Explain",
                content: <JargonDecoupler activeJargonTab={activeJargonTab} setActiveJargonTab={setActiveJargonTab} />,
              },
            ]}
          />
        )}

        {a && (
          <MobileResultsBar
            headline={`₹${a.costPerKm.toFixed(1)}/km`}
            subline={`${formatLakh(a.total)} total · ${label(idA)}${b ? ` vs ${label(idB)}` : ""}`}
            lines={[
              { label: "Fuel", value: formatLakh(a.totalFuel) },
              { label: "Insurance", value: formatLakh(a.totalInsurance) },
              { label: "Maintenance", value: formatLakh(a.totalMaintenance) },
              { label: "Tyres", value: formatLakh(a.totalTyres) },
              { label: "Depreciation", value: formatLakh(a.totalDepreciation), accent: true },
            ]}
          />
        )}
      </div>

      {/* Desktop inputs */}
      <div className="hidden sm:grid glass p-6 gap-5 sm:grid-cols-2 lg:grid-cols-5">
        <VariantSelect label="Your car" value={idA} onChange={setIdA} />
        <VariantSelect label="Compare against (optional)" value={idB} allowNone onChange={(v) => { setIdB(v); setCompareEnabled(!!v); }} />
        {profileFields}
      </div>

      {/* Desktop results */}
      <div className="hidden sm:block space-y-8">
        {a && (
          <div className="grid gap-6 sm:grid-cols-2">
            {[{ id: idA, r: a }, ...(b ? [{ id: idB, r: b }] : [])].map(({ id, r }) => (
              <CostResultCard key={id} id={id} r={r} cityName={city.name} years={years} />
            ))}
          </div>
        )}
        {deltaBlock}
        {chartBlock}
        <JargonDecoupler activeJargonTab={activeJargonTab} setActiveJargonTab={setActiveJargonTab} />
      </div>
    </div>
  );
}
