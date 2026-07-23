"use client";

import React, { useState, useMemo } from "react";
import DriveRange from "@/components/ui/DriveRange";

export default function EvVsPetrolCalculator() {
  const [annualKm, setAnnualKm] = useState(15000);
  const [petrolPrice, setPetrolPrice] = useState(102);
  const [electricityPrice, setElectricityPrice] = useState(8);

  const stats = useMemo(() => {
    const petrolEx = 1250000;
    const evEx = 1500000;
    const premium = evEx - petrolEx;

    const petrolFe = 13.2;
    const evFe = 6.2;

    const petrolPerKm = petrolPrice / petrolFe;
    const evPerKm = electricityPrice / evFe;

    const petrolMaint = 12000;
    const evMaint = 5000;

    const runningSavingsPerKm = petrolPerKm - evPerKm;
    const annualMaintenanceSavings = petrolMaint - evMaint;
    const annualRunningSavings = annualKm * runningSavingsPerKm + annualMaintenanceSavings;

    const breakevenYears = annualRunningSavings > 0 ? premium / annualRunningSavings : null;
    const breakevenKm = breakevenYears ? breakevenYears * annualKm : null;

    const timeline = Array.from({ length: 8 }, (_, i) => {
      const yr = i + 1;
      const petrolCost = petrolEx + yr * annualKm * petrolPerKm + yr * petrolMaint;
      const evCost = evEx + yr * annualKm * evPerKm + yr * evMaint;
      return {
        year: yr,
        petrol: petrolCost,
        ev: evCost,
        savings: petrolCost - evCost,
      };
    });

    return {
      premium,
      petrolPerKm,
      evPerKm,
      annualRunningSavings,
      breakevenYears,
      breakevenKm,
      timeline,
    };
  }, [annualKm, petrolPrice, electricityPrice]);

  const formatCurrency = (val: number) => {
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)}L`;
    return `₹${Math.round(val).toLocaleString("en-IN")}`;
  };

  return (
    <div className="glass p-4 sm:p-6 w-full border-[#161616]/10 bg-[#161616]/[0.02] rounded-[24px] sm:rounded-[32px]">
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#161616]/10 pb-4 mb-6 gap-2">
        <div>
          <h3 className="text-xl font-semibold tracking-tight">EV vs Petrol Break-Even</h3>
          <p className="text-xs text-secondary mt-0.5">Understand the exact mileage math of the EV transition premium.</p>
        </div>
        <span className="font-geist text-[10px] tracking-widest text-[var(--accent)] uppercase self-start md:self-center">Analysis Engine</span>
      </div>

      <div className="grid lg:grid-cols-12 gap-6 sm:gap-8 items-start">
        <div className="lg:col-span-4 space-y-5 sm:space-y-6">
          <DriveRange
            label="Annual Drive Distance"
            value={annualKm}
            onChange={setAnnualKm}
            min={5000}
            max={30000}
            step={1000}
            format={(v) => `${v.toLocaleString()} km/yr`}
            presets={[10000, 15000, 20000]}
            presetFormat={(v) => `${v / 1000}k km/yr`}
          />

          <DriveRange
            label="Petrol Price"
            value={petrolPrice}
            onChange={setPetrolPrice}
            min={85}
            max={120}
            step={1}
            mobileStep={2}
            format={(v) => `₹${v}/L`}
            presets={[95, 102, 110]}
            presetFormat={(v) => `₹${v}`}
          />

          <DriveRange
            label="Electricity Rate"
            value={electricityPrice}
            onChange={setElectricityPrice}
            min={3}
            max={15}
            step={0.5}
            mobileStep={1}
            format={(v) => `₹${v}/kWh`}
            presets={[8, 10, 13]}
            presetFormat={(v) => `₹${v}`}
          />

          <div className="p-4 bg-[#161616]/[0.03] border border-[#161616]/10 rounded-2xl flex justify-between items-center text-xs gap-3">
            <div>
              <span className="text-secondary font-medium">EV Acquisition Premium</span>
              <p className="text-[10px] text-secondary/60">Typical initial ex-showroom gap</p>
            </div>
            <span className="font-semibold stat-num text-primary shrink-0">{formatCurrency(stats.premium)}</span>
          </div>
        </div>

        <div className="lg:col-span-8 space-y-5 sm:space-y-6">
          <div className="space-y-4">
            <span className="text-secondary text-xs block font-semibold uppercase tracking-wider">Running cost per kilometre</span>

            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:items-center text-xs">
                  <span className="text-secondary font-medium">Petrol Vehicle (13.2 km/l)</span>
                  <span className="font-mono text-primary font-semibold">₹{stats.petrolPerKm.toFixed(2)}/km</span>
                </div>
                <div className="w-full h-3 bg-[#161616]/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-red-500 to-orange-500 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, (stats.petrolPerKm / 10) * 100)}%` }}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:items-center text-xs">
                  <span className="text-secondary font-medium">Electric Vehicle (6.2 km/kWh)</span>
                  <span className="font-mono text-[#4ade80] font-semibold">₹{stats.evPerKm.toFixed(2)}/km</span>
                </div>
                <div className="w-full h-3 bg-[#161616]/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, (stats.evPerKm / 10) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 border border-[#161616]/10 bg-[#161616]/[0.02] p-4 sm:p-5 rounded-2xl">
            <div>
              <p className="text-xs text-secondary">Break-Even Point</p>
              {stats.breakevenYears !== null && stats.breakevenYears > 0 ? (
                <>
                  <p className="text-3xl font-bold stat-num text-[var(--accent)] mt-1">
                    {stats.breakevenYears.toFixed(1)} <span className="text-base font-normal font-sans text-secondary">Years</span>
                  </p>
                  <p className="text-[10px] text-secondary/60 mt-1">
                    Or ≈ <span className="font-mono">{Math.round(stats.breakevenKm!).toLocaleString()} km</span> cumulative driving.
                  </p>
                </>
              ) : (
                <p className="text-sm font-semibold text-red-400 mt-2">EV premium will never break even.</p>
              )}
            </div>

            <div className="border-t sm:border-t-0 sm:border-l border-[#161616]/10 pt-4 sm:pt-0 sm:pl-5 text-xs text-secondary/90 leading-relaxed">
              <span className="font-semibold text-primary block mb-1">Financial Analysis</span>
              {stats.breakevenYears && stats.breakevenYears <= 3.5
                ? "Highly Favored: Your usage is high enough that the EV option pays for its premium within 3.5 years, yielding pure savings after that point."
                : stats.breakevenYears && stats.breakevenYears <= 5.5
                  ? "Viable Option: Break-even is reached in the mid-ownership cycle (3.5 to 5.5 years). Recommend EV if you plan to hold the vehicle for 5+ years."
                  : "Extended Break-even: It will take over 5.5 years to recoup the EV premium. Financially, the petrol model is likely the more cost-effective choice."}
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-secondary text-xs block font-semibold uppercase tracking-wider">Cumulative TCO Projections (Includes Maintenance)</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
              {[1, 3, 5, 8].map((yr) => {
                const dataPoint = stats.timeline.find((t) => t.year === yr)!;
                const evIsCheaper = dataPoint.savings > 0;
                return (
                  <div
                    key={yr}
                    className={`border border-[#161616]/10 p-3 rounded-xl ${evIsCheaper ? "bg-green-500/[0.02]" : "bg-red-500/[0.01]"}`}
                  >
                    <p className="text-secondary font-medium">Year {yr}</p>
                    <p className="font-semibold stat-num mt-1 text-primary text-[11px] sm:text-xs leading-snug">
                      {evIsCheaper ? `Saved ${formatCurrency(dataPoint.savings)}` : `EV +${formatCurrency(Math.abs(dataPoint.savings))}`}
                    </p>
                    <span className={`text-[9px] ${evIsCheaper ? "text-green-400" : "text-red-400"}`}>
                      {evIsCheaper ? "EV Cheaper" : "Petrol Cheaper"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
