"use client";

import { useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Search, X } from "lucide-react";
import { brands, models, getBrand, getVariantsForModel, formatLakh } from "@/lib/data";
import type { Fuel, Segment, Transmission } from "@/lib/types";
import CarPhoto from "./CarPhoto";
import DriveSelect from "./ui/DriveSelect";
import MobileFilterSheet from "@/components/mobile/MobileFilterSheet";
import { usePersistedPageState, usePersistedScroll } from "@/lib/use-persisted-page-state";

const PRICE_BANDS = [
  { id: "all", label: "Any price", min: 0, max: Infinity },
  { id: "u12", label: "Under ₹12L", min: 0, max: 1200000 },
  { id: "12-16", label: "₹12–16L", min: 1200000, max: 1600000 },
  { id: "16p", label: "₹16L+", min: 1600000, max: Infinity },
];

const TRANSMISSIONS: ("all" | Transmission)[] = ["all", "MT", "AMT", "CVT", "DCT", "AT"];
const FUELS: ("all" | Fuel)[] = ["all", "petrol", "diesel", "cng", "ev"];
const SEGMENTS: { id: "all" | Segment; label: string }[] = [
  { id: "all", label: "All segments" },
  { id: "compact-hatch", label: "Premium Hatchback" },
  { id: "compact-sedan", label: "Compact Sedan" },
  { id: "sub-4m-suv", label: "Sub-4m SUV" },
  { id: "compact-suv", label: "Compact SUV" },
  { id: "midsize-sedan", label: "Midsize sedan" },
  { id: "midsize-suv", label: "Bigger SUV" },
];

type FilterKey = "brand" | "price" | "trans" | "fuel" | "segment" | null;

type ExploreFilters = {
  brandId: string;
  band: string;
  trans: "all" | Transmission;
  fuel: "all" | Fuel;
  segment: "all" | Segment;
  query: string;
};

const EXPLORE_DEFAULTS: ExploreFilters = {
  brandId: "all",
  band: "all",
  trans: "all",
  fuel: "all",
  segment: "all",
  query: "",
};

export default function ExplorerGrid() {
  const [filters, setFilters] = usePersistedPageState("explore", EXPLORE_DEFAULTS);
  const { brandId, band, trans, fuel, segment, query } = filters;
  const setBrandId = useCallback((v: string) => setFilters((p) => ({ ...p, brandId: v })), [setFilters]);
  const setBand = useCallback((v: string) => setFilters((p) => ({ ...p, band: v })), [setFilters]);
  const setTrans = useCallback((v: "all" | Transmission) => setFilters((p) => ({ ...p, trans: v })), [setFilters]);
  const setFuel = useCallback((v: "all" | Fuel) => setFilters((p) => ({ ...p, fuel: v })), [setFilters]);
  const setSegment = useCallback((v: "all" | Segment) => setFilters((p) => ({ ...p, segment: v })), [setFilters]);
  const setQuery = useCallback((v: string) => setFilters((p) => ({ ...p, query: v })), [setFilters]);
  usePersistedScroll("explore");
  const [openFilter, setOpenFilter] = useState<FilterKey>(null);

  const filtered = useMemo(() => {
    const b = PRICE_BANDS.find((p) => p.id === band)!;
    const q = query.trim().toLowerCase();
    return models.filter((m) => {
      if (brandId !== "all" && m.brandId !== brandId) return false;
      if (segment !== "all" && m.segment !== segment) return false;
      if (q) {
        const brand = getBrand(m.brandId);
        const haystack = `${brand?.name ?? ""} ${m.name} ${m.id}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      const vs = getVariantsForModel(m.id).filter(
        (v) =>
          v.priceExShowroom >= b.min &&
          v.priceExShowroom < b.max &&
          (trans === "all" || v.transmission === trans) &&
          (fuel === "all" || v.fuel === fuel)
      );
      return vs.length > 0;
    });
  }, [brandId, band, trans, fuel, segment, query]);

  const brandLabel = brandId === "all" ? "All brands" : getBrand(brandId)?.name ?? "Brand";
  const priceLabel = PRICE_BANDS.find((p) => p.id === band)?.label ?? "Price";
  const transLabel = trans === "all" ? "Any gearbox" : trans;
  const fuelLabel = fuel === "all" ? "Any fuel" : fuel[0].toUpperCase() + fuel.slice(1);
  const segmentLabel = SEGMENTS.find((s) => s.id === segment)?.label ?? "Segment";

  const filterChips = [
    { key: "brand" as const, label: brandLabel },
    { key: "price" as const, label: priceLabel },
    { key: "fuel" as const, label: fuelLabel },
    { key: "segment" as const, label: segmentLabel },
    { key: "trans" as const, label: transLabel },
  ];

  return (
    <div>
      <div className="relative mb-6 sm:mb-8">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#161616]/40" aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search cars or brands…"
          aria-label="Search cars"
          enterKeyHint="search"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          className="w-full min-h-11 rounded-xl border border-[#161616]/12 bg-[#F5F1E8] py-2.5 pl-10 pr-10 text-base text-[#161616] placeholder:text-[#161616]/45 shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_8px_20px_rgba(22,22,22,0.04)] transition focus:border-[#C84C31]/40 focus:outline-none focus:ring-4 focus:ring-[#C84C31]/12 sm:text-sm [&::-webkit-search-cancel-button]:hidden"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-[#161616]/50 transition hover:bg-[#161616]/5 hover:text-[#161616]"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Mobile filter chips */}
      <div className="sm:hidden flex gap-2 overflow-x-auto scrollbar-none mb-6 -mx-1 px-1">
        {filterChips.map((chip) => (
          <button
            key={chip.key}
            type="button"
            onClick={() => setOpenFilter(chip.key)}
            className={`shrink-0 min-h-9 px-3 py-2 rounded-full text-xs font-medium border ${
              chip.key === "brand" && brandId !== "all" ||
              chip.key === "price" && band !== "all" ||
              chip.key === "fuel" && fuel !== "all" ||
              chip.key === "segment" && segment !== "all" ||
              chip.key === "trans" && trans !== "all"
                ? "border-[#C84C31] bg-[#C84C31]/10 text-[#C84C31]"
                : "border-[#161616]/10 text-secondary"
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      <MobileFilterSheet open={openFilter === "brand"} title="Brand" onClose={() => setOpenFilter(null)}>
        <DriveSelect
          value={brandId}
          onChange={(v) => { setBrandId(v); setOpenFilter(null); }}
          ariaLabel="Brand"
          options={[{ value: "all", label: "All brands" }, ...brands.map((b) => ({ value: b.id, label: b.name }))]}
          className="w-full"
        />
      </MobileFilterSheet>
      <MobileFilterSheet open={openFilter === "price"} title="Price band" onClose={() => setOpenFilter(null)}>
        <DriveSelect
          value={band}
          onChange={(v) => { setBand(v); setOpenFilter(null); }}
          ariaLabel="Price band"
          options={PRICE_BANDS.map((p) => ({ value: p.id, label: p.label }))}
          className="w-full"
        />
      </MobileFilterSheet>
      <MobileFilterSheet open={openFilter === "trans"} title="Transmission" onClose={() => setOpenFilter(null)}>
        <DriveSelect
          value={trans}
          onChange={(v) => { setTrans(v as "all" | Transmission); setOpenFilter(null); }}
          ariaLabel="Transmission"
          options={TRANSMISSIONS.map((item) => ({ value: item, label: item === "all" ? "Any transmission" : item }))}
          className="w-full"
        />
      </MobileFilterSheet>
      <MobileFilterSheet open={openFilter === "fuel"} title="Fuel" onClose={() => setOpenFilter(null)}>
        <DriveSelect
          value={fuel}
          onChange={(v) => { setFuel(v as "all" | Fuel); setOpenFilter(null); }}
          ariaLabel="Fuel"
          options={FUELS.map((item) => ({ value: item, label: item === "all" ? "Any fuel" : item[0].toUpperCase() + item.slice(1) }))}
          className="w-full"
        />
      </MobileFilterSheet>
      <MobileFilterSheet open={openFilter === "segment"} title="Segment" onClose={() => setOpenFilter(null)}>
        <DriveSelect
          value={segment}
          onChange={(v) => { setSegment(v as "all" | Segment); setOpenFilter(null); }}
          ariaLabel="Segment"
          options={SEGMENTS.map((item) => ({ value: item.id, label: item.label }))}
          className="w-full"
        />
      </MobileFilterSheet>

      {/* Desktop filters */}
      <div className="hidden sm:flex flex-wrap gap-3 mb-10">
        <DriveSelect value={brandId} onChange={setBrandId} ariaLabel="Brand" options={[{ value: "all", label: "All brands" }, ...brands.map((b) => ({ value: b.id, label: b.name }))]} className="w-48" />
        <DriveSelect value={band} onChange={setBand} ariaLabel="Price band" options={PRICE_BANDS.map((p) => ({ value: p.id, label: p.label }))} className="w-44" />
        <DriveSelect value={trans} onChange={(v) => setTrans(v as "all" | Transmission)} ariaLabel="Transmission" options={TRANSMISSIONS.map((item) => ({ value: item, label: item === "all" ? "Any transmission" : item }))} className="w-56" />
        <DriveSelect value={fuel} onChange={(v) => setFuel(v as "all" | Fuel)} ariaLabel="Fuel" options={FUELS.map((item) => ({ value: item, label: item === "all" ? "Any fuel" : item[0].toUpperCase() + item.slice(1) }))} className="w-40" />
        <DriveSelect value={segment} onChange={(v) => setSegment(v as "all" | Segment)} ariaLabel="Segment" options={SEGMENTS.map((item) => ({ value: item.id, label: item.label }))} className="w-64" />
      </div>

      <p className="text-xs text-[#4b4b4b] mb-4">
        {filtered.length} {filtered.length === 1 ? "car" : "cars"} match
        {query.trim() ? ` for “${query.trim()}”` : ""}
      </p>

      {filtered.length === 0 ? (
        <div className="glass p-12 text-center text-[#4b4b4b]">
          No cars match{query.trim() ? ` “${query.trim()}”` : ""} — try a different search or widen your filters.
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((m, i) => {
            const brand = getBrand(m.brandId)!;
            const vs = getVariantsForModel(m.id);
            const topPs = Math.max(...vs.map((v) => v.engine.ps));
            const bestFE = Math.max(...vs.map((v) => v.claimedFE));
            return (
              <motion.div key={m.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: i * 0.04, ease: "easeOut" }}>
                <Link href={`/cars/${m.id}`} className="glass glass-hover block p-6 group relative">
                  <CarPhoto src={m.heroImage} alt={`${brand.name} ${m.name}`} color={brand.color} className="w-full h-36 mb-4" />
                  <p className="text-xs text-secondary">{brand.name}</p>
                  <h2 className="text-lg font-semibold">{m.name}</h2>
                  <p className="stat-num text-sm text-secondary mt-1">{formatLakh(m.priceRange.min)} – {formatLakh(m.priceRange.max)}</p>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="stat-num text-base font-medium" style={{ color: "#4b4b4b" }}>{topPs}</p>
                      <p className="text-xs text-secondary">PS (top)</p>
                    </div>
                    <div>
                      <p className="stat-num text-base font-medium" style={{ color: "#4b4b4b" }}>{bestFE.toFixed(1)}</p>
                      <p className="text-xs text-secondary">km/l ARAI</p>
                    </div>
                    <div>
                      <p className="stat-num text-base font-medium" style={{ color: "#4b4b4b" }}>{m.ncap.adultStars ?? "—"}</p>
                      <p className="text-xs text-secondary">{m.ncap.agency ? `${m.ncap.agency} ★` : "not rated"}</p>
                    </div>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 px-6 py-4 rounded-b-2xl bg-[#ECE7DF]/95 border-t border-[#161616]/10 backdrop-blur-xl opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-250 ease-out pointer-events-none hidden sm:block">
                    <p className="text-xs text-[#161616]/85 leading-relaxed line-clamp-3">{m.aiSummary}</p>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
