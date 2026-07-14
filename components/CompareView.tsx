"use client";

import { useMemo, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
} from "recharts";
import { formatLakh, getBrand, getModel, getTestData, getVariantsForModel } from "@/lib/data";
import type { Fuel } from "@/lib/types";
import { estimate5yrCost, radarScoresWithFuel } from "@/lib/scores";
import { pairHref } from "@/lib/compare-seo";
import EstimatedBadge from "./EstimatedBadge";
import CarPhoto from "./CarPhoto";
import OwnerVoicesPanel from "./OwnerVoicesPanel";
import ModelSelect from "./sims/ModelSelect";
import MobileSwipePanels from "@/components/mobile/MobileSwipePanels";
import { usePersistedPageState, usePersistedScroll } from "@/lib/use-persisted-page-state";

const AXES = [
  { key: "performance", label: "Performance" },
  { key: "efficiency", label: "Efficiency" },
  { key: "safety", label: "Safety" },
  { key: "features", label: "Features" },
  { key: "space", label: "Space" },
  { key: "ownership", label: "Ownership" },
] as const;

const PALETTE = ["#E8590C", "#60A5FA", "#4ADE80"];
const CAR_LABELS = ["Car A", "Car B", "Car C"];

function buildDefaultSelections(initialIds: string[]) {
  let initialModels = ["hyundai-creta", "kia-seltos"];
  if (initialIds.length >= 2) {
    initialModels = initialIds.slice(0, 3);
  } else if (initialIds.length === 1) {
    const mainCar = initialIds[0];
    const rival = mainCar === "hyundai-creta" ? "kia-seltos" : "hyundai-creta";
    initialModels = [mainCar, rival];
  }
  return initialModels.map((modelId) => {
    const m = getModel(modelId);
    const vs = m ? getVariantsForModel(m.id) : [];
    const defaultFuel = vs[0]?.fuel ?? "petrol";
    return { modelId, fuel: defaultFuel };
  });
}

function CarPicker({
  index,
  selection,
  setSlotModel,
  setSlotFuel,
  allowNone,
}: {
  index: number;
  selection?: { modelId: string; fuel: Fuel };
  setSlotModel: (i: number, modelId: string) => void;
  setSlotFuel: (i: number, fuel: Fuel) => void;
  allowNone?: boolean;
}) {
  const model = selection ? getModel(selection.modelId) : null;
  const vs = model ? getVariantsForModel(model.id) : [];
  const uniqueFuels = Array.from(new Set(vs.map((v) => v.fuel)));

  return (
    <div className="flex flex-col gap-2 glass p-4">
      <span className="text-[10px] text-secondary uppercase tracking-wider font-semibold">{CAR_LABELS[index]}</span>
      <ModelSelect
        value={selection?.modelId ?? ""}
        onChange={(val) => setSlotModel(index, val)}
        label={index < 2 ? "Pick a car" : "Add a third car (optional)"}
        allowNone={allowNone}
      />
      {selection && uniqueFuels.length > 0 && (
        <div className="flex gap-2 items-center text-xs mt-1.5">
          <span className="text-secondary">Fuel:</span>
          <div className="flex flex-wrap gap-1.5">
            {uniqueFuels.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setSlotFuel(index, f as Fuel)}
                className={`min-h-9 px-2.5 py-1 rounded-lg border text-xs uppercase tracking-wider transition-all duration-150 ${
                  selection.fuel === f
                    ? "border-[#C84C31] bg-[#C84C31]/5 text-[#C84C31] font-bold"
                    : "border-[#161616]/10 bg-[#ECE7DF]/60 text-[#161616]/75 hover:bg-[#ECE7DF]"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CompareView({
  initialIds,
  syncUrl = false,
}: {
  initialIds: string[];
  /** When true, keep the browser URL on /compare/{a}-vs-{b} for the first two cars. */
  syncUrl?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const skipFirstSync = useRef(true);

  const [persisted, setPersisted] = usePersistedPageState("compare", {
    selections: buildDefaultSelections(initialIds),
    mobileResultTab: "radar",
    reviewCarIndex: 0,
  });
  const { selections, mobileResultTab, reviewCarIndex } = persisted;
  const setSelections = useCallback(
    (updater: React.SetStateAction<{ modelId: string; fuel: Fuel }[]>) => {
      setPersisted((prev) => ({
        ...prev,
        selections: typeof updater === "function" ? updater(prev.selections) : updater,
      }));
    },
    [setPersisted],
  );
  const setMobileResultTab = useCallback(
    (tab: string) => setPersisted((prev) => ({ ...prev, mobileResultTab: tab })),
    [setPersisted],
  );
  const setReviewCarIndex = useCallback(
    (index: number) => setPersisted((prev) => ({ ...prev, reviewCarIndex: index })),
    [setPersisted],
  );
  usePersistedScroll("compare");

  // Prefer initialIds when landing on a slug page (override stale session picks once)
  const seededRef = useRef(false);
  useEffect(() => {
    if (seededRef.current) return;
    if (initialIds.length >= 1) {
      seededRef.current = true;
      setSelections(buildDefaultSelections(initialIds));
    }
  }, [initialIds, setSelections]);

  useEffect(() => {
    if (!syncUrl) return;
    if (skipFirstSync.current) {
      skipFirstSync.current = false;
      return;
    }
    const ids = selections.map((s) => s.modelId).filter(Boolean);
    if (ids.length < 2) return;
    const href = pairHref(ids[0], ids[1]);
    if (pathname !== href) {
      router.replace(href, { scroll: false });
    }
  }, [selections, syncUrl, router, pathname]);

  const selected = useMemo(() => {
    return selections
      .map((sel) => {
        const m = getModel(sel.modelId);
        if (!m) return null;
        return {
          ...m,
          selectedFuel: sel.fuel,
          uniqueKey: `${m.id}-${sel.fuel}`,
          displayName: `${m.name} (${sel.fuel.toUpperCase()})`,
        };
      })
      .filter((m): m is NonNullable<typeof m> => !!m);
  }, [selections]);

  const scores = useMemo(() => {
    return radarScoresWithFuel(selections.filter((s) => s.modelId));
  }, [selections]);

  const chartData = useMemo(() => {
    return AXES.map((axis) => {
      const row: Record<string, string | number> = { axis: axis.label };
      for (const m of selected) {
        row[m.displayName] = Number(scores[m.uniqueKey]?.[axis.key]?.toFixed(1) ?? 0);
      }
      return row;
    });
  }, [selected, scores]);

  const stats = useMemo(() => {
    return selected.map((m) => {
      const vs = getVariantsForModel(m.id).filter((v) => v.fuel === m.selectedFuel);
      const activeVs = vs.length > 0 ? vs : getVariantsForModel(m.id);
      const top = activeVs.reduce((a, b) => (b.priceExShowroom > a.priceExShowroom ? b : a), activeVs[0]);
      const best100 = Math.min(...activeVs.map((v) => getTestData(v.id)?.zeroTo100.value ?? 99));
      return {
        model: m,
        displayName: m.displayName,
        uniqueKey: m.uniqueKey,
        price: Math.min(...activeVs.map((v) => v.priceExShowroom)),
        ps: Math.max(...activeVs.map((v) => v.engine.ps)),
        fe: Math.max(...activeVs.map((v) => v.realWorldFE)),
        zeroTo100: best100,
        cost5yr: estimate5yrCost(m, top),
        ncap: m.ncap.adultStars ?? 0,
      };
    });
  }, [selected]);

  const winner = useMemo(() => {
    if (stats.length === 0) return { price: 0, ps: 0, fe: 0, zeroTo100: 0, cost5yr: 0, ncap: 0 };
    return {
      price: Math.min(...stats.map((s) => s.price)),
      ps: Math.max(...stats.map((s) => s.ps)),
      fe: Math.max(...stats.map((s) => s.fe)),
      zeroTo100: Math.min(...stats.map((s) => s.zeroTo100)),
      cost5yr: Math.min(...stats.map((s) => s.cost5yr)),
      ncap: Math.max(...stats.map((s) => s.ncap)),
    };
  }, [stats]);

  const variantIdsForSims = useMemo(() => {
    return selected
      .map((m) => {
        const vs = getVariantsForModel(m.id).filter((v) => v.fuel === m.selectedFuel);
        const activeVs = vs.length > 0 ? vs : getVariantsForModel(m.id);
        return activeVs.reduce((a, b) => (b.priceExShowroom > a.priceExShowroom ? b : a), activeVs[0]).id;
      })
      .join(",");
  }, [selected]);

  const setSlotModel = (i: number, modelId: string) => {
    setSelections((prev) => {
      const next = [...prev];
      if (modelId === "") {
        next.splice(i, 1);
      } else {
        const m = getModel(modelId);
        const vs = m ? getVariantsForModel(m.id) : [];
        const defaultFuel = vs[0]?.fuel ?? "petrol";
        next[i] = { modelId, fuel: defaultFuel };
      }
      return next;
    });
  };

  const setSlotFuel = (i: number, fuel: Fuel) => {
    setSelections((prev) => {
      const next = [...prev];
      if (next[i]) next[i] = { ...next[i], fuel };
      return next;
    });
  };

  const Win = ({ children, on }: { children: React.ReactNode; on: boolean }) => (
    <span className={on ? "text-accent font-semibold" : undefined}>{children}</span>
  );

  const radarBlock = (
    <div className="glass p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <h2 className="text-sm text-secondary flex items-center gap-1.5 flex-wrap">
          Six axes, scored 1–10 by formula
          <EstimatedBadge tooltip="Scores are normalized across all combinations of models and fuels." />
        </h2>
        <div className="flex gap-4 text-xs flex-wrap">
          {selected.map((m, i) => (
            <div key={m.uniqueKey} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: PALETTE[i] }} />
              <span className="text-primary font-medium">{m.displayName}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="h-72 sm:h-96">
        <ResponsiveContainer>
          <RadarChart data={chartData} outerRadius="74%" margin={{ top: 8, right: 12, bottom: 8, left: 12 }}>
            <PolarGrid stroke="rgba(255,255,255,0.12)" />
            <PolarAngleAxis dataKey="axis" tick={{ fill: "#A1A1AA", fontSize: 11 }} />
            <PolarRadiusAxis domain={[0, 10]} tick={false} axisLine={false} />
            {selected.map((m, i) => (
              <Radar
                key={m.uniqueKey}
                name={m.displayName}
                dataKey={m.displayName}
                stroke={PALETTE[i]}
                fill={PALETTE[i]}
                fillOpacity={0.12}
                strokeWidth={2}
              />
            ))}
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  const specsTable = (
    <div className="glass overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-[#161616]/10 bg-[#ECE7DF]/50">
              <th className="p-3 text-xs uppercase tracking-widest text-[#161616]/50 font-bold sticky left-0 bg-[#ECE7DF]/95 z-10">Spec</th>
              {stats.map((s) => (
                <th key={s.uniqueKey} className="p-3 text-center min-w-[100px]">
                  <div className="flex flex-col items-center gap-1.5">
                    <CarPhoto src={s.model.heroImage} alt={s.displayName} color={getBrand(s.model.brandId)?.color ?? "#666"} className="w-16 h-8 object-contain" />
                    <span className="font-semibold text-xs text-primary">{s.displayName}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#161616]/5">
            {[
              { label: "Starts at", key: "price" as const, fmt: (s: typeof stats[0]) => formatLakh(s.price), win: (s: typeof stats[0]) => s.price === winner.price },
              { label: "Max power", key: "ps" as const, fmt: (s: typeof stats[0]) => `${s.ps} PS`, win: (s: typeof stats[0]) => s.ps === winner.ps },
              { label: "Best real FE", key: "fe" as const, fmt: (s: typeof stats[0]) => `~${s.fe.toFixed(1)} km/l`, win: (s: typeof stats[0]) => s.fe === winner.fe },
              { label: "Best 0–100", key: "zeroTo100" as const, fmt: (s: typeof stats[0]) => `${s.zeroTo100.toFixed(1)} s`, win: (s: typeof stats[0]) => s.zeroTo100 === winner.zeroTo100 },
              { label: "NCAP adult", key: "ncap" as const, fmt: (s: typeof stats[0]) => `${s.ncap || "—"}★`, win: (s: typeof stats[0]) => s.ncap === winner.ncap },
              { label: "5-yr cost ~", key: "cost5yr" as const, fmt: (s: typeof stats[0]) => formatLakh(s.cost5yr), win: (s: typeof stats[0]) => s.cost5yr === winner.cost5yr },
            ].map((row) => (
              <tr key={row.label}>
                <td className="p-3 font-medium text-[#161616]/70 text-xs sticky left-0 bg-[#F5F1E8] z-10">{row.label}</td>
                {stats.map((s) => (
                  <td key={s.uniqueKey} className="p-3 text-center stat-num text-xs">
                    <Win on={row.win(s)}>{row.fmt(s)}</Win>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="sm:hidden border-t border-[#161616]/10 p-4 space-y-4">
        {selected.map((m) => (
          <div key={m.uniqueKey} className="text-sm">
            <h4 className="font-semibold mb-2">{m.displayName}</h4>
            <ul className="space-y-1">
              {m.prosCons.pros.map((p) => (
                <li key={p} className="flex gap-2 text-secondary"><span className="text-[var(--positive)]">+</span>{p}</li>
              ))}
              {m.prosCons.cons.map((c) => (
                <li key={c} className="flex gap-2 text-secondary"><span className="text-[var(--negative)]">−</span>{c}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );

  const summaryStrip = selected.length >= 2 && (
    <div className="glass p-4 flex gap-3 overflow-x-auto scrollbar-none">
      {stats.map((s, i) => (
        <div key={s.uniqueKey} className="shrink-0 min-w-[140px] border border-[#161616]/10 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PALETTE[i] }} />
            <span className="text-xs font-semibold truncate">{s.displayName}</span>
          </div>
          <p className="text-sm font-bold text-primary">{formatLakh(s.price)}</p>
          <p className="text-[10px] text-secondary mt-0.5">5yr ~{formatLakh(s.cost5yr)}</p>
        </div>
      ))}
    </div>
  );

  const reviewsPanel = (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto scrollbar-none">
        {selected.map((m, i) => (
          <button
            key={m.uniqueKey}
            type="button"
            onClick={() => setReviewCarIndex(i)}
            className={`shrink-0 px-3 py-2 rounded-full text-xs font-medium border ${
              reviewCarIndex === i ? "bg-[#C84C31] text-[#F5F1E8] border-[#C84C31]" : "border-[#161616]/10 text-secondary"
            }`}
          >
            {m.displayName}
          </button>
        ))}
      </div>
      <div className="glass p-5">
        <OwnerVoicesPanel modelId={selected[reviewCarIndex]?.id ?? selected[0].id} showDisclaimer />
      </div>
    </div>
  );

  return (
    <div className="space-y-10 pb-safe">
      {/* Mobile: flat pickers + live swipeable results */}
      <div className="sm:hidden space-y-5">
        <div className="glass p-5 space-y-4">
          <CarPicker index={0} selection={selections[0]} setSlotModel={setSlotModel} setSlotFuel={setSlotFuel} />
          <CarPicker index={1} selection={selections[1]} setSlotModel={setSlotModel} setSlotFuel={setSlotFuel} />
          {selections.length >= 3 ? (
            <CarPicker index={2} selection={selections[2]} setSlotModel={setSlotModel} setSlotFuel={setSlotFuel} allowNone />
          ) : (
            <button
              type="button"
              onClick={() => setSelections((prev) => [...prev, { modelId: "", fuel: "petrol" }])}
              className="w-full min-h-11 border border-dashed border-[#161616]/20 rounded-xl text-sm text-secondary hover:border-[#C84C31]/40"
            >
              + Add third car (optional)
            </button>
          )}
        </div>

        {selected.length < 2 && (
          <p className="text-sm text-secondary text-center px-4">Pick two cars above — results update as you go.</p>
        )}

        {selected.length >= 2 && (
          <>
            {summaryStrip}
            <MobileSwipePanels
              activeId={mobileResultTab}
              onChange={setMobileResultTab}
              panels={[
                { id: "radar", label: "Radar", content: radarBlock },
                { id: "specs", label: "Specs", content: specsTable },
                { id: "reviews", label: "Reviews", content: reviewsPanel },
              ]}
            />
            <div className="flex flex-wrap gap-3">
              <Link href={`/simulate?sim=drag&variants=${variantIdsForSims}`} className="glass glass-hover px-4 py-2.5 text-sm">Race →</Link>
              <Link href={`/cost?variants=${variantIdsForSims.split(",").slice(0, 2).join(",")}`} className="glass glass-hover px-4 py-2.5 text-sm">5-yr cost →</Link>
            </div>
          </>
        )}
      </div>

      {/* Desktop pickers */}
      <div className="hidden sm:grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <CarPicker
            key={i}
            index={i}
            selection={selections[i]}
            setSlotModel={setSlotModel}
            setSlotFuel={setSlotFuel}
            allowNone={i >= 2}
          />
        ))}
      </div>

      {selected.length >= 2 && (
        <>
          <div className="hidden sm:block space-y-10">
            {radarBlock}
            <div className={`grid gap-6 ${selected.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
              {stats.map((s) => (
                <div key={s.uniqueKey} className="glass p-7">
                  <CarPhoto src={s.model.heroImage} alt={s.displayName} color={getBrand(s.model.brandId)?.color ?? "#666"} className="w-full h-28 mb-4" />
                  <h3 className="font-semibold text-lg mb-4">{s.displayName}</h3>
                  <dl className="space-y-3 text-sm">
                    <div className="flex justify-between"><dt className="text-secondary">Starts at</dt><dd className="stat-num"><Win on={s.price === winner.price}>{formatLakh(s.price)}</Win></dd></div>
                    <div className="flex justify-between"><dt className="text-secondary">Max power</dt><dd className="stat-num"><Win on={s.ps === winner.ps}>{s.ps} PS</Win></dd></div>
                    <div className="flex justify-between"><dt className="text-secondary">Best real FE</dt><dd className="stat-num"><Win on={s.fe === winner.fe}>~{s.fe.toFixed(1)} km/l</Win></dd></div>
                    <div className="flex justify-between"><dt className="text-secondary">Best 0–100</dt><dd className="stat-num"><Win on={s.zeroTo100 === winner.zeroTo100}>{s.zeroTo100.toFixed(1)} s</Win></dd></div>
                    <div className="flex justify-between"><dt className="text-secondary">NCAP adult</dt><dd className="stat-num"><Win on={s.ncap === winner.ncap}>{s.ncap || "—"}★</Win></dd></div>
                    <div className="flex justify-between"><dt className="text-secondary">5-yr cost ~</dt><dd className="stat-num"><Win on={s.cost5yr === winner.cost5yr}>{formatLakh(s.cost5yr)}</Win></dd></div>
                  </dl>
                </div>
              ))}
            </div>
            <div className={`grid gap-6 grid-cols-1 ${selected.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
              {selected.map((m) => (
                <div key={m.uniqueKey} className="glass p-7 text-sm">
                  <h3 className="font-semibold mb-3">{m.displayName}</h3>
                  <ul className="space-y-1.5">
                    {m.prosCons.pros.map((p) => (
                      <li key={p} className="flex gap-2"><span style={{ color: "var(--positive)" }}>+</span><span className="text-secondary">{p}</span></li>
                    ))}
                  </ul>
                  <ul className="space-y-1.5 mt-3">
                    {m.prosCons.cons.map((c) => (
                      <li key={c} className="flex gap-2"><span style={{ color: "var(--negative)" }}>−</span><span className="text-secondary">{c}</span></li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className={`grid gap-6 grid-cols-1 ${selected.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
              {selected.map((m, i) => (
                <div key={m.uniqueKey} className="glass p-7">
                  <OwnerVoicesPanel modelId={m.id} showDisclaimer={i === 0} />
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href={`/simulate?sim=drag&variants=${variantIdsForSims}`} className="glass glass-hover px-5 py-3 text-sm">Race these →</Link>
              <Link href={`/simulate?sim=braking&variants=${variantIdsForSims}`} className="glass glass-hover px-5 py-3 text-sm">Braking duel →</Link>
              <Link href={`/cost?variants=${variantIdsForSims.split(",").slice(0, 2).join(",")}`} className="glass glass-hover px-5 py-3 text-sm">5-year cost →</Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
