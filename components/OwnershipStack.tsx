"use client";

import React, { useState, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { costParams, formatLakh, getModel, getVariant, formatCityFuelLabel } from "@/lib/data";
import { computeCost } from "@/lib/cost";
import EstimatedBadge from "./EstimatedBadge";
import VariantSelect from "./sims/VariantSelect";
import DriveSelect from "@/components/ui/DriveSelect";
import DriveRange from "@/components/ui/DriveRange";
import { TrendingDown, Wrench, Disc, IndianRupee, Fuel, Shield, TrendingUp } from "lucide-react";

const CARDS = [
  {
    number: "01",
    title: "Purchase Cost",
    subtitle: "Ex-showroom + on-road taxes",
    body: "The sticker price is just the start. RTO registration, comprehensive insurance, TCS, and dealer handling charges add 15–20% on top. We show both so you're never surprised at the dealership.",
    accent: "#2563eb",
    icon: <IndianRupee className="h-5 w-5" />,
    detail: (
      <div className="border border-[#161616]/10 bg-[#161616]/2 p-5 rounded-2xl space-y-4 font-geist relative overflow-hidden">
        {/* Diagonal Tax Stamp watermark */}
        <div className="absolute -right-4 -top-2 rotate-12 bg-[#2563eb]/10 border border-[#2563eb]/20 text-[#2563eb] text-[9px] px-2.5 py-0.5 rounded font-bold select-none uppercase tracking-widest">
          RTO APPROVED
        </div>
        
        <h4 className="text-[10px] tracking-wider text-[#2563eb] uppercase font-bold">Purchase Bill of Quantities</h4>
        <div className="space-y-2 text-xs">
          <div className="flex justify-between border-b border-[#161616]/5 pb-1">
            <span className="text-secondary">Ex-Showroom Price</span>
            <span className="font-mono text-primary font-bold">100.0%</span>
          </div>
          <div className="flex justify-between border-b border-[#161616]/5 pb-1">
            <span className="text-secondary">State RTO Road Tax</span>
            <span className="font-mono text-[#2563eb] font-bold">+ 12.5% avg</span>
          </div>
          <div className="flex justify-between border-b border-[#161616]/5 pb-1">
            <span className="text-secondary">Comprehensive Insurance</span>
            <span className="font-mono text-primary font-bold">+ 3.2% avg</span>
          </div>
          <div className="flex justify-between border-b border-[#161616]/5 pb-1">
            <span className="text-secondary">TCS Surcharge (&gt;10L)</span>
            <span className="font-mono text-primary font-bold">+ 1.0%</span>
          </div>
          <div className="flex justify-between font-bold pt-1 text-[#161616]">
            <span>Total Acquisition Load</span>
            <span className="font-mono text-[#2563eb]">~ 116.7%</span>
          </div>
        </div>
        <div className="text-[9px] text-secondary/50 pt-2 border-t border-[#161616]/5 font-mono">
          INVOICE ID: DS-ACQ-9812 // STATE: TS
        </div>
      </div>
    ),
  },
  {
    number: "02",
    title: "Fuel Cost",
    subtitle: "Real running spend correction",
    body: "ARAI figures are tested in sterile lab environments. DriveScope applies city-traffic correction (×0.72) and uses your city's actual fuel price. Diesel vs petrol vs EV break-even calculated to the kilometre.",
    accent: "#FF6A00",
    icon: <Fuel className="h-5 w-5" />,
    detail: (
      <div className="border border-[#161616]/10 bg-[#161616]/2 p-5 rounded-2xl space-y-3 font-geist relative overflow-hidden">
        <h4 className="text-[10px] tracking-wider text-[#FF6A00] uppercase font-bold">Real-World Route Corrections</h4>
        
        {/* Stylized Road route map */}
        <div className="h-24 w-full border border-[#161616]/10 bg-[#161616]/3 rounded-xl relative overflow-hidden p-2">
          <svg className="w-full h-full" viewBox="0 0 200 80" preserveAspectRatio="none">
            <path d="M 10,70 Q 50,20 100,50 T 190,10" fill="none" stroke="rgba(22,22,22,0.06)" strokeWidth="8" strokeLinecap="round" />
            <path d="M 10,70 Q 50,20 100,50 T 190,10" fill="none" stroke="#FF6A00" strokeWidth="1.5" strokeDasharray="3 3" />
            <circle cx="10" cy="70" r="3.5" fill="#FF6A00" />
            <circle cx="100" cy="50" r="3.5" fill="#FF6A00" />
            <circle cx="190" cy="10" r="3.5" fill="#2563eb" />
            
            {/* Core corrections readouts */}
            <text x="35" y="32" fill="#FF6A00" fontSize="5.5" fontWeight="bold">CITY RUN: -28% TRAFFIC PENALTY</text>
            <text x="120" y="24" fill="#4ade80" fontSize="5.5" fontWeight="bold">HWY CRUISE: +8% ECONOMY</text>
          </svg>
        </div>

        <div className="flex justify-between text-xs pt-1 text-secondary">
          <span>ARAI Claimed FE</span>
          <span className="font-mono text-primary font-bold">20.1 km/l</span>
        </div>
        <div className="flex justify-between text-xs border-t border-[#161616]/5 pt-2 text-[#FF6A00]">
          <span className="font-semibold">DriveScope Model FE</span>
          <span className="font-mono font-bold">14.5 km/l</span>
        </div>
      </div>
    ),
  },
  {
    number: "03",
    title: "Maintenance",
    subtitle: "Brand-specific cost scaling",
    body: "Service costs vary wildly by brand heritage. Japanese/Korean cars average ₹8K/service; European brands can hit ₹25K. We model annual costs based on historical parts pricing and labor indexes.",
    accent: "#6366f1",
    icon: <Wrench className="h-5 w-5" />,
    detail: (
      <div className="border border-[#161616]/10 bg-[#161616]/2 p-5 rounded-2xl space-y-3 font-geist relative overflow-hidden">
        <h4 className="text-[10px] tracking-wider text-[#6366f1] uppercase font-bold">Exploded Mechanical Damper</h4>
        
        {/* Exploded shocks drawing */}
        <div className="h-24 w-full border border-[#161616]/10 bg-[#161616]/3 rounded-xl relative overflow-hidden p-1 flex items-center justify-center">
          <svg className="h-full w-40" viewBox="0 0 160 100">
            <g stroke="rgba(99, 102, 241, 0.7)" strokeWidth="0.75" fill="none">
              {/* Spring */}
              <path d="M 80,10 C 90,12 90,20 80,22 C 70,24 70,32 80,34 C 90,36 90,44 80,46 C 70,48 70,56 80,58 C 90,60 90,68 80,70" strokeWidth="1.25" />
              {/* Damper shaft */}
              <line x1="80" y1="20" x2="80" y2="90" strokeWidth="1.5" />
              <rect x="75" y="70" width="10" height="20" rx="1" fill="rgba(99, 102, 241, 0.15)" />
              
              {/* Exploded callout lines */}
              <line x1="92" y1="25" x2="125" y2="25" strokeDasharray="2 2" />
              <text x="128" y="27" fill="rgba(22,22,22,0.5)" fontSize="5" fontFamily="monospace">COIL SPRING</text>
              
              <line x1="68" y1="80" x2="35" y2="80" strokeDasharray="2 2" />
              <text x="10" y="82" fill="rgba(22,22,22,0.5)" fontSize="5" fontFamily="monospace">DAMPER SEAL</text>
            </g>
          </svg>
        </div>
        
        <div className="flex justify-between text-xs pt-1 text-secondary">
          <span>Yearly Parts Wear Index</span>
          <span className="font-mono text-primary font-bold">Base x 1.45</span>
        </div>
      </div>
    ),
  },
  {
    number: "04",
    title: "Insurance",
    subtitle: "IDV decay and risk curves",
    body: "First-year comprehensive runs 2.5–3.5% of IDV. Your premium drops as the car depreciates — but your out-of-pocket risk rises. We track both curves side by side over 5 years.",
    accent: "#8b5cf6",
    icon: <Shield className="h-5 w-5" />,
    detail: (
      <div className="border border-[#161616]/10 bg-[#161616]/2 p-5 rounded-2xl space-y-4 font-geist relative overflow-hidden">
        <h4 className="text-[10px] tracking-wider text-[#8b5cf6] uppercase font-bold">Insurance Risk Vector</h4>
        
        {/* Risk radar map */}
        <div className="h-24 w-full border border-[#161616]/10 bg-[#161616]/3 rounded-xl relative overflow-hidden flex items-center justify-center p-2">
          <svg className="w-24 h-24" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(139, 92, 246, 0.25)" strokeWidth="0.5" />
            <circle cx="50" cy="50" r="30" fill="none" stroke="rgba(139, 92, 246, 0.25)" strokeWidth="0.5" />
            <circle cx="50" cy="50" r="15" fill="none" stroke="rgba(139, 92, 246, 0.25)" strokeWidth="0.5" />
            
            {/* Risk axes */}
            <line x1="50" y1="5" x2="50" y2="95" stroke="rgba(139, 92, 246, 0.25)" strokeWidth="0.5" />
            <line x1="5" y1="50" x2="95" y2="50" stroke="rgba(139, 92, 246, 0.25)" strokeWidth="0.5" />
            
            {/* Risk polygon overlay */}
            <polygon points="50,15 78,50 50,75 25,50" fill="rgba(139, 92, 246, 0.12)" stroke="#8b5cf6" strokeWidth="1" />
            
            <text x="50" y="12" fill="#8b5cf6" fontSize="4.5" textAnchor="middle">OWN DAMAGE</text>
            <text x="82" y="52" fill="rgba(22,22,22,0.55)" fontSize="4.5">ACCIDENT</text>
            <text x="50" y="89" fill="rgba(22,22,22,0.55)" fontSize="4.5" textAnchor="middle">THIRD PARTY</text>
          </svg>
        </div>
        
        <div className="flex justify-between text-xs text-secondary">
          <span>IDV Depreciation Rate</span>
          <span className="font-mono text-[#8b5cf6] font-bold">-10% p.a.</span>
        </div>
      </div>
    ),
  },
  {
    number: "05",
    title: "Resale Value",
    subtitle: "Asset depreciation profile",
    body: "After 5 years, brand trust and segment demand drive residuals more than specifications. Maruti holds 60%+. Korean brands 50–55%. We factor this into the true cost of ownership.",
    accent: "#4ade80",
    icon: <TrendingUp className="h-5 w-5" />,
    detail: (
      <div className="border border-[#161616]/10 bg-[#161616]/2 p-5 rounded-2xl space-y-4 font-geist relative overflow-hidden">
        <h4 className="text-[10px] tracking-wider text-[#4ade80] uppercase font-bold">Residual Retention Curves</h4>
        
        {/* Resale value decay curves */}
        <div className="h-24 w-full border border-[#161616]/10 bg-[#161616]/3 rounded-xl relative overflow-hidden p-2 flex items-center justify-center">
          <svg className="w-full h-full" viewBox="0 0 160 80">
            <line x1="10" y1="10" x2="150" y2="10" stroke="rgba(22,22,22,0.06)" strokeWidth="0.5" />
            <line x1="10" y1="40" x2="150" y2="40" stroke="rgba(22,22,22,0.06)" strokeWidth="0.5" />
            <line x1="10" y1="70" x2="150" y2="70" stroke="rgba(22,22,22,0.12)" strokeWidth="0.5" />
            
            {/* Retention Curve 1: Maruti/Toyota (Holds value well) */}
            <path d="M 10,10 C 50,15 100,20 150,28" fill="none" stroke="#4ade80" strokeWidth="1.5" />
            <text x="125" y="24" fill="#4ade80" fontSize="5.5" fontWeight="bold">MARUTI/TOY: 62%</text>
            
            {/* Retention Curve 2: European (German luxury drops faster) */}
            <path d="M 10,10 C 40,30 90,50 150,58" fill="none" stroke="#f87171" strokeWidth="1" strokeDasharray="2 1" />
            <text x="125" y="54" fill="#f87171" fontSize="5.5" fontWeight="bold">EUR LUX: 44%</text>
            
            <text x="12" y="77" fill="rgba(22,22,22,0.55)" fontSize="4.5">YR 0</text>
            <text x="142" y="77" fill="rgba(22,22,22,0.55)" fontSize="4.5">YR 5</text>
          </svg>
        </div>
        
        <div className="flex justify-between text-xs text-secondary">
          <span>5-Yr Avg Segment Yield</span>
          <span className="font-mono text-primary font-bold">54.2%</span>
        </div>
      </div>
    ),
  },
];

const SERIES = [
  { key: "fuel", label: "Fuel", color: "#FF6A00" },
  { key: "insurance", label: "Insurance", color: "#8b5cf6" },
  { key: "maintenance", label: "Maintenance", color: "#6366f1" },
  { key: "tyres", label: "Tyres", color: "#FBBF24" },
  { key: "depreciation", label: "Depreciation", color: "#A1A1AA" },
] as const;

function variantLabel(variantId: string) {
  const v = getVariant(variantId);
  const m = v && getModel(v.modelId);
  return v && m ? `${m.name} ${v.name}` : variantId;
}

export default function OwnershipStack() {
  // Calculator states
  const [idA, setIdA] = useState("creta-sx-mt");
  const [idB, setIdB] = useState("");
  const [cityId, setCityId] = useState("hyderabad");
  const [kmPerYear, setKmPerYear] = useState(12000);
  const [years, setYears] = useState(5);
  const [activeJargonTab, setActiveJargonTab] = useState<"depreciation" | "maintenance" | "tyres">("depreciation");

  const city = useMemo(() => costParams.cities.find((c) => c.id === cityId)!, [cityId]);
  
  const costA = useMemo(() => computeCost(idA, city, kmPerYear, years), [idA, city, kmPerYear, years]);
  const costB = useMemo(() => idB ? computeCost(idB, city, kmPerYear, years) : null, [idB, city, kmPerYear, years]);

  const chartData = useMemo(() => {
    if (!costA) return [];
    return costA.years.map((y) => {
      const row: Record<string, number | string> = { name: `Yr ${y.year}` };
      for (const s of SERIES) {
        row[s.label] = Math.round(y[s.key as keyof typeof y]);
      }
      return row;
    });
  }, [costA]);

  const delta = costA && costB ? costA.total - costB.total : null;

  return (
    <div className="w-full space-y-28">
      
      {/* ── STACK SECTION: PINNED EXPLANATION + CARDS ── */}
      <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-start relative">
        
        {/* Left Column: Pinned Technical briefing */}
        <div className="lg:col-span-4 lg:sticky lg:top-[120px] self-start space-y-6">
          <span className="font-geist text-[9px] tracking-[0.35em] text-[#C84C31] uppercase font-bold">
            02 / COST LIFECYCLE
          </span>
          <h3 className="font-display text-4xl sm:text-5xl text-[#161616] leading-tight">
            Every car has two prices.
          </h3>
          <p className="text-sm text-secondary leading-relaxed font-sans">
            The upfront showroom cost is merely Phase One. The true lifecycle of a vehicle is defined by hidden cumulative layers that scale dynamically with your brand selection, fuel choice, and driving habits.
          </p>
          <p className="text-sm text-secondary leading-relaxed font-sans">
            Scroll down to see the five layers of cost slide into place.
          </p>
          
          <div className="hidden lg:flex flex-col gap-3.5 pt-6 border-t border-[#161616]/10">
            {CARDS.map((c) => (
              <div key={c.number} className="flex items-center gap-3.5 group">
                <span className="font-geist text-[10px] text-[#161616]/30 group-hover:text-[#2563EB]/80 transition-colors">
                  {c.number}
                </span>
                <span className="text-[11px] text-secondary/60 group-hover:text-primary transition-colors uppercase tracking-wider">
                  {c.title}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Sticky cards stack */}
        <div className="lg:col-span-8 space-y-16">
          {CARDS.map((card, i) => (
            <div
              key={card.number}
              className="sticky rounded-[28px] border border-[#161616]/10 p-8 sm:p-10 transition-all duration-300"
              style={{
                top: `${80 + i * 16}px`, // Apple stack offset
                zIndex: (i + 1) * 10,
                backgroundColor: "#FCFAF2", // Solid light base color to mask the card beneath it
                backgroundImage: "radial-gradient(ellipse at bottom right, rgba(200,76,49,0.02) 0%, transparent 60%)",
                boxShadow: "0 -10px 30px rgba(22, 22, 22, 0.05)",
              }}
            >
              <div className="grid md:grid-cols-5 gap-8 items-start">
                
                {/* Content side */}
                <div className="md:col-span-3 space-y-5">
                  <div className="flex items-center gap-4">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-bold"
                      style={{
                        backgroundColor: `${card.accent}12`,
                        border: `1px solid ${card.accent}33`,
                        color: card.accent,
                      }}
                    >
                      {card.icon}
                    </div>
                    <div>
                      <p className="font-geist text-[9px] tracking-widest uppercase" style={{ color: card.accent }}>
                        Phase {card.number}
                      </p>
                      <h4 className="text-2xl font-semibold leading-tight text-[#161616]">{card.title}</h4>
                    </div>
                  </div>

                  <p className="font-geist text-[9px] text-secondary/70 leading-relaxed uppercase tracking-widest">
                    {card.subtitle}
                  </p>

                  <p className="text-sm text-secondary/90 leading-relaxed font-sans">
                    {card.body}
                  </p>
                </div>

                {/* Technical data panel side */}
                <div className="md:col-span-2 w-full">
                  {card.detail}
                </div>

              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── CALCULATOR SECTION: INTERACTIVE COST BREAKDOWN + FINAL COST VISUALIZATION ── */}
      <div className="pt-24 border-t border-[#161616]/10 space-y-12">
        
        <div className="max-w-2xl space-y-3">
          <span className="font-geist text-[9px] tracking-[0.3em] text-[#2563EB] uppercase font-bold">
            Financial Command Center · Real Calculator
          </span>
          <h3 className="font-display text-4xl sm:text-5xl text-[#161616] leading-tight">
            Interactive Cost Breakdown
          </h3>
          <p className="text-sm text-secondary leading-relaxed font-sans">
            Adjust the sliders to model your real-world usage. Compare two variants side-by-side to visualize which car costs less over its lifetime, accounting for local fuel prices, tyres, brand maintenance curves, and depreciation.
          </p>
        </div>

        {/* Inputs glass panel */}
        <div className="glass p-6 sm:p-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-5 bg-[#161616]/2 border-[#161616]/10">
          <VariantSelect label="Primary Variant" value={idA} onChange={setIdA} />
          
          <VariantSelect label="Compare against (optional)" value={idB} allowNone onChange={setIdB} />
          
          <label className="block text-sm">
            <span className="text-secondary/70 text-xs block mb-1.5 font-geist uppercase tracking-wider">City Location</span>
            <DriveSelect
              value={cityId}
              onChange={setCityId}
              ariaLabel="City Location"
              options={costParams.cities.map((c) => ({
                value: c.id,
                label: formatCityFuelLabel(c),
              }))}
              className="w-full"
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
            accentClass="accent-[#2563EB]"
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
            accentClass="accent-[#2563EB]"
          />
        </div>

        {/* Hero outputs cards */}
        {costA && (
          <div className="grid gap-6 sm:grid-cols-2">
            {[{ id: idA, r: costA }, ...(costB ? [{ id: idB, r: costB }] : [])].map(({ id, r }) => (
              <div key={id} className="glass p-8 bg-[#161616]/2 border-[#161616]/10 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#2563EB]/5 blur-3xl rounded-full" />
                <p className="text-[11px] font-geist text-secondary/60 uppercase tracking-widest">{variantLabel(id)}</p>
                
                <p className="stat-num text-5xl font-semibold mt-3 text-[#161616]">
                  ₹{r.costPerKm.toFixed(1)}
                  <span className="text-base text-secondary/60 font-sans font-normal ml-1">/km</span>
                </p>
                
                <p className="stat-num text-sm text-[#2563EB] font-semibold mt-2.5 flex items-center gap-1.5">
                  {formatLakh(r.total)} total lifecycle cost
                  <EstimatedBadge tooltip="Modeled using city fuel price, brand maintenance factors, tyre sizes and depreciation drops." />
                </p>
                
                <div className="mt-6 pt-5 border-t border-[#161616]/5 grid grid-cols-2 gap-4 text-xs text-[#161616]/80">
                  <div>
                    <span className="block text-secondary/50 font-geist text-[9px] uppercase tracking-wider">Fuel Cost</span>
                    <span className="font-semibold text-[#161616] stat-num">{formatLakh(r.totalFuel)}</span>
                  </div>
                  <div>
                    <span className="block text-secondary/50 font-geist text-[9px] uppercase tracking-wider">Maintenance</span>
                    <span className="font-semibold text-[#161616] stat-num">{formatLakh(r.totalMaintenance)}</span>
                  </div>
                  <div>
                    <span className="block text-secondary/50 font-geist text-[9px] uppercase tracking-wider">Insurance</span>
                    <span className="font-semibold text-[#161616] stat-num">{formatLakh(r.totalInsurance)}</span>
                  </div>
                  <div>
                    <span className="block text-secondary/50 font-geist text-[9px] uppercase tracking-wider">Depreciation</span>
                    <span className="font-semibold text-[#FF6A00] stat-num">{formatLakh(r.totalDepreciation)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Delta Callout */}
        {delta !== null && Math.abs(delta) > 1000 && (
          <div className="border-l-2 pl-4 py-1.5 border-[#FF6A00] bg-[#FF6A00]/5 max-w-3xl">
            <p className="text-sm text-secondary/90 leading-relaxed font-sans">
              Insight: The <span className="font-semibold text-[#161616]">{variantLabel(delta > 0 ? idB : idA)}</span> costs{" "}
              <span className="stat-num font-bold text-[#FF6A00]">{formatLakh(Math.abs(delta))}</span> less over {years} years.
              {(() => {
                const cheaperId = delta > 0 ? idB : idA;
                const dearerUpfront =
                  (getVariant(cheaperId)?.priceExShowroom ?? 0) >
                  (getVariant(cheaperId === idA ? idB : idA)?.priceExShowroom ?? 0);
                return dearerUpfront ? " This is despite the higher initial acquisition sticker price, driven by fuel economy and depreciation offsets." : "";
              })()}
            </p>
          </div>
        )}

        {/* Stacked Chart (Final Cost Visualization) */}
        {costA && (
          <div className="glass p-6 sm:p-8 bg-[#161616]/2 border-[#161616]/10">
            <h4 className="text-sm font-geist text-secondary/70 uppercase tracking-widest mb-6">
              Final Cost Visualization: Year-over-Year Accumulation ({variantLabel(idA)})
            </h4>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                  <XAxis dataKey="name" stroke="#6B7280" fontSize={11} tickLine={false} />
                  <YAxis 
                    stroke="#6B7280" 
                    fontSize={11} 
                    tickLine={false} 
                    tickFormatter={(v: number) => `${(v / 100000).toFixed(1)}L`} 
                  />
                  <Tooltip
                    formatter={(v) => `₹${Number(v).toLocaleString("en-IN")}`}
                    contentStyle={{ 
                      background: "#F4F0E8", 
                      border: "1px solid rgba(22, 22, 22, 0.1)", 
                      borderRadius: 12 
                    }}
                    labelStyle={{ color: "#161616", fontFamily: "monospace", fontSize: 12 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                  {SERIES.map((s) => (
                    <Bar 
                      key={s.key} 
                      dataKey={s.label} 
                      stackId="a" 
                      fill={s.color} 
                      radius={s.key === "depreciation" ? [4, 4, 0, 0] : 0} 
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

      </div>

      {/* Jargon Decoupler Widget */}
      <div className="border border-white/10 bg-white/[0.02] p-6 rounded-2xl mt-12 text-xs leading-relaxed text-secondary/90 font-sans">
        <h4 className="text-[10px] font-mono text-white uppercase tracking-[0.2em] mb-4 font-bold">
          Jargon Decoupler // Click to translate the math
        </h4>
        <div className="flex gap-1.5 border-b border-white/10 pb-3 mb-4 overflow-x-auto">
          {[
            { key: "depreciation", label: "Depreciation", icon: <TrendingDown className="h-3.5 w-3.5" /> },
            { key: "maintenance", label: "Maintenance", icon: <Wrench className="h-3.5 w-3.5" /> },
            { key: "tyres", label: "Tyres", icon: <Disc className="h-3.5 w-3.5" /> },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveJargonTab(tab.key as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold font-mono transition-all duration-150 cursor-pointer ${
                activeJargonTab === tab.key
                  ? "bg-[#C84C31] text-white shadow-sm"
                  : "text-secondary/60 hover:bg-white/5"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
        
        <div className="space-y-3">
          {activeJargonTab === "depreciation" && (
            <>
              <p className="text-white font-semibold text-sm flex items-center gap-1.5">
                <TrendingDown className="h-4 w-4" /> Depreciation: The &quot;Newness Tax&quot;
              </p>
              <p>
                <strong>The Analogy:</strong> Think of buying a car like buying fresh bananas. The second you walk out of the grocery store, they start ripening. If you try to sell them 3 years later, nobody pays full price.
              </p>
              <div className="grid sm:grid-cols-3 gap-4 mt-3 pt-3 border-t border-white/5">
                <div>
                  <span className="font-semibold text-white block mb-0.5">Toyota &amp; Maruti</span>
                  Bananas that stay yellow longer (retain up to 60%+ value after 5 years).
                </div>
                <div>
                  <span className="font-semibold text-white block mb-0.5">German Luxury</span>
                  Organic avocados—they turn brown almost instantly (value drops fast, retaining &lt;44%).
                </div>
                <div>
                  <span className="font-semibold text-white block mb-0.5">Electric Vehicles (EVs)</span>
                  Like last year&apos;s iPad. Value depends on battery health, so buyers depreciate them fast fearing future battery replacement costs.
                </div>
              </div>
            </>
          )}
          {activeJargonTab === "maintenance" && (
            <>
              <p className="text-white font-semibold text-sm flex items-center gap-1.5">
                <Wrench className="h-4 w-4" /> Maintenance: Gym Membership for Cars
              </p>
              <p>
                <strong>The Analogy:</strong> Keeping a car running is like staying fit. Some cars keep fit on simple home-cooked meals, while others need premium imported health shakes.
              </p>
              <div className="grid sm:grid-cols-2 gap-4 mt-3 pt-3 border-t border-white/5">
                <div>
                  <span className="font-semibold text-white block mb-0.5">Japanese &amp; Korean Brands</span>
                  Eating healthy at home. Cheap, simple, standard parts available at every street corner.
                </div>
                <div>
                  <span className="font-semibold text-white block mb-0.5">European Brands</span>
                  Specialized personal trainers. You pay premium specialist rates and wait for imported ingredients.
                </div>
              </div>
            </>
          )}
          {activeJargonTab === "tyres" && (
            <>
              <p className="text-white font-semibold text-sm flex items-center gap-1.5">
                <Disc className="h-4 w-4" /> Tyres: Designer Sneakers vs Running Shoes
              </p>
              <p>
                <strong>The Analogy:</strong> Tyres are literally your car&apos;s shoes. High fashion looks cool, but everyday beaters save your wallet.
              </p>
              <div className="grid sm:grid-cols-2 gap-4 mt-3 pt-3 border-t border-white/5">
                <div>
                  <span className="font-semibold text-white block mb-0.5">Top Trims (17&quot; / 18&quot; Alloys)</span>
                  Designer Yeezys. They look aggressive and sporty, but replacing them when they wear out will break your wallet.
                </div>
                <div>
                  <span className="font-semibold text-white block mb-0.5">Lower Trims (15&quot; / 16&quot; Wheels)</span>
                  Comfortable daily trainers. Cheap, durable, easily replaceable, and ride softer.
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
