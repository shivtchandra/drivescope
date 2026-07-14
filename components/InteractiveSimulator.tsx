"use client";

import React, { useState, useMemo } from "react";
import { Zap } from "lucide-react";
import DriveSelect from "@/components/ui/DriveSelect";
import { costParams, formatCityFuelLabel } from "@/lib/data";

export default function InteractiveSimulator() {
  // Inputs
  const [budget, setBudget] = useState(1500000); // default ₹15L
  const [fuelType, setFuelType] = useState<"petrol" | "diesel" | "ev" | "cng">("petrol");
  const [annualKm, setAnnualKm] = useState(12000);
  const [loanTenure, setLoanTenure] = useState<3 | 5 | 7>(5);
  const [downPayment, setDownPayment] = useState(300000); // default ₹3L
  const [cityId, setCityId] = useState("hyderabad");

  // Mobile Wizard State
  const [wizardStep, setWizardStep] = useState(1);

  // Enforce down payment is not greater than budget
  const sanitizedDownPayment = Math.min(downPayment, budget - 100000);

  // Dynamic calculations
  const results = useMemo(() => {
    const selectedCity = costParams.cities.find((c) => c.id === cityId) || costParams.cities[0];
    
    // 1. EMI Calculation (8.5% annual interest)
    const principal = Math.max(0, budget - sanitizedDownPayment);
    const annualRate = 0.085;
    const monthlyRate = annualRate / 12;
    const totalMonths = loanTenure * 12;
    
    let emi = 0;
    if (principal > 0) {
      emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) / 
            (Math.pow(1 + monthlyRate, totalMonths) - 1);
    }
    const totalLoanCost = emi * totalMonths;
    const interestPaid = Math.max(0, totalLoanCost - principal);

    // 2. Fuel Cost (5 years)
    let fuelPrice = selectedCity.petrolPrice;
    let fe = 13.5; // Petrol base
    if (fuelType === "diesel") {
      fuelPrice = selectedCity.dieselPrice;
      fe = 16.0;
    } else if (fuelType === "cng") {
      fuelPrice = selectedCity.cngPrice;
      fe = 18.5;
    } else if (fuelType === "ev") {
      fuelPrice = selectedCity.evPrice;
      fe = 6.2; // km per kWh
    }

    let fiveYearFuelCost = 0;
    if (fuelType === "ev") {
      // EV: (km / efficiency) * electricity cost per kWh
      fiveYearFuelCost = (annualKm * 5 / fe) * fuelPrice;
    } else {
      fiveYearFuelCost = (annualKm * 5 / fe) * fuelPrice;
    }

    // 3. Maintenance (5 years)
    // base scaling with car cost + fuel factor
    const baseMaint = 45000 + (budget * 0.015);
    const fuelMaintFactor = fuelType === "diesel" ? 1.25 : fuelType === "ev" ? 0.45 : fuelType === "cng" ? 1.15 : 1.0;
    const fiveYearMaintenance = baseMaint * fuelMaintFactor;

    // 4. Insurance (5 years)
    // Avg 2.2% of car value annually over 5 years (drops with IDV decay)
    const fiveYearInsurance = budget * 0.11;

    // 5. Resale Value & Depreciation (5 years)
    let retentionRate = 0.55; // Petrol base
    if (fuelType === "diesel") retentionRate = 0.51;
    if (fuelType === "cng") retentionRate = 0.48;
    if (fuelType === "ev") retentionRate = 0.40;
    
    const resaleValue = budget * retentionRate;
    const depreciation = budget - resaleValue;

    // 6. 5-Year True Cost of Ownership (TCO)
    // True cost = Interest + Fuel + Maintenance + Insurance + Depreciation
    const fiveYearCost = interestPaid + fiveYearFuelCost + fiveYearMaintenance + fiveYearInsurance + depreciation;

    // 7. Ownership Score (1.0 to 10.0 scale)
    // Base score is 10. Deduct for high EMI relative to budget, low downpayment ratio, high depreciation, and high fuel bills.
    const downPaymentRatio = sanitizedDownPayment / budget;
    const emiToIncomeRatio = emi / (budget / 24); // assuming monthly income is budget / 24
    
    let score = 9.5;
    if (downPaymentRatio < 0.2) score -= 1.0;
    if (downPaymentRatio >= 0.4) score += 0.5;
    if (emiToIncomeRatio > 0.45) score -= 1.5;
    if (loanTenure === 7) score -= 0.5;
    if (fuelType === "petrol") score -= 0.5;
    if (fuelType === "ev") score += 0.8; // EV boost

    const finalScore = Math.max(3.8, Math.min(9.8, score));

    return {
      emi,
      fiveYearFuelCost,
      fiveYearMaintenance,
      fiveYearInsurance,
      depreciation,
      resaleValue,
      fiveYearCost,
      interestPaid,
      finalScore
    };
  }, [budget, sanitizedDownPayment, fuelType, annualKm, loanTenure, cityId]);

  const formatCurrency = (val: number) => {
    if (val >= 100000) {
      return `₹${(val / 100000).toFixed(2)} Lakh`;
    }
    return `₹${Math.round(val).toLocaleString("en-IN")}`;
  };

  return (
    <div className="glass p-6 sm:p-8 md:p-10 w-full rounded-[32px] border-[#161616]/10" style={{ background: "rgba(236, 231, 223, 0.5)" }}>
      <div className="grid lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Inputs (lg:col-span-7) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex justify-between items-center border-b border-[#161616]/10 pb-4">
            <h3 className="text-xl font-semibold tracking-tight">Configure Ownership Tunables</h3>
            <span className="font-geist text-[10px] tracking-widest text-[#C84C31] uppercase">Simulation Panel</span>
          </div>

          {/* Mobile Step Header */}
          <div className="flex sm:hidden justify-between items-center bg-[#161616]/5 p-2.5 rounded-xl text-xs">
            <span className="text-secondary">Wizard Step {wizardStep} of 3</span>
            <div className="flex gap-1.5 justify-center py-2">
              {[1, 2, 3].map((s) => (
                <div key={s} className={`w-2 h-2 rounded-full ${wizardStep === s ? "bg-[#C84C31]" : "bg-[#161616]/20"}`} />
              ))}
            </div>
          </div>

          {/* STEP 1: Budget & City (Always visible on desktop, visible on Step 1 for mobile) */}
          <div className={`space-y-6 ${wizardStep !== 1 ? "hidden sm:block" : ""}`}>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-secondary font-medium">Vehicle Budget</span>
                <span className="font-semibold stat-num text-primary">{formatCurrency(budget)}</span>
              </div>
              <input
                type="range"
                min={500000}
                max={6000000}
                step={50000}
                value={budget}
                onChange={(e) => {
                  const b = Number(e.target.value);
                  setBudget(b);
                  if (downPayment > b) setDownPayment(b * 0.2);
                }}
                className="w-full accent-[#C84C31]"
              />
              <div className="flex justify-between text-[10px] text-secondary/60">
                <span>₹5 Lakh</span>
                <span>₹60 Lakh</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <label className="block text-sm">
                <span className="text-secondary text-xs block mb-1.5 font-medium">Select City</span>
                <DriveSelect
                  value={cityId}
                  onChange={setCityId}
                  ariaLabel="Select City"
                  options={costParams.cities.map((c) => ({ value: c.id, label: formatCityFuelLabel(c) }))}
                  className="w-full"
                />
              </label>

              <label className="block text-sm">
                <span className="text-secondary text-xs block mb-1.5 font-medium">Fuel Profile</span>
                <DriveSelect
                  value={fuelType}
                  onChange={(val) => setFuelType(val as any)}
                  ariaLabel="Fuel Profile"
                  options={[
                    { value: "petrol", label: "Petrol" },
                    { value: "diesel", label: "Diesel" },
                    { value: "ev", label: "Electric (EV)" },
                    { value: "cng", label: "CNG" },
                  ]}
                  className="w-full"
                />
              </label>
            </div>
          </div>

          {/* STEP 2: Usage & Financing (Visible on desktop, visible on Step 2 for mobile) */}
          <div className={`space-y-6 ${wizardStep !== 2 ? "hidden sm:block" : ""}`}>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-secondary font-medium">Annual Driving Distance</span>
                <span className="font-semibold stat-num text-primary">{(annualKm).toLocaleString("en-IN")} km/year</span>
              </div>
              <input
                type="range"
                min={5000}
                max={35000}
                step={1000}
                value={annualKm}
                onChange={(e) => setAnnualKm(Number(e.target.value))}
                className="w-full accent-[#C84C31]"
              />
              <div className="flex justify-between text-[10px] text-secondary/60">
                <span>5,000 km</span>
                <span>35,000 km</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-secondary font-medium">Down Payment</span>
                <span className="font-semibold stat-num text-primary">{formatCurrency(sanitizedDownPayment)}</span>
              </div>
              <input
                type="range"
                min={0}
                max={budget - 100000}
                step={25000}
                value={sanitizedDownPayment}
                onChange={(e) => setDownPayment(Number(e.target.value))}
                className="w-full accent-[#C84C31]"
              />
              <div className="flex justify-between text-[10px] text-secondary/60">
                <span>₹0 (Zero Down)</span>
                <span>Max {formatCurrency(budget - 100000)}</span>
              </div>
            </div>
          </div>

          {/* STEP 3: Tenure (Visible on desktop, visible on Step 3 for mobile) */}
          <div className={`space-y-4 ${wizardStep !== 3 ? "hidden sm:block" : ""}`}>
            <span className="text-secondary text-xs block font-medium">Loan Tenure</span>
            <div className="grid grid-cols-3 gap-2">
              {([3, 5, 7] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setLoanTenure(t)}
                  className={`py-3 rounded-xl border text-sm font-semibold transition-colors ${
                    loanTenure === t
                      ? "border-[#C84C31] bg-[#C84C31]/10 text-primary"
                      : "border-[#161616]/10 hover:border-[#161616]/20 text-secondary hover:text-primary"
                  }`}
                >
                  {t} Years <span className="font-normal text-xs block text-secondary/80">({t*12} months)</span>
                </button>
              ))}
            </div>

            <div className="p-3 bg-[#161616]/5 border border-[#161616]/10 rounded-xl mt-4">
              <p className="text-[11px] text-secondary/70 leading-normal">
                *Interest calculations are modeled at a flat <span className="text-primary font-semibold">8.5% p.a. reduced balance rate</span>. Dealer offers may vary.
              </p>
            </div>
          </div>

          {/* Mobile Wizard Nav Buttons */}
          <div className="flex sm:hidden justify-between gap-4 mt-6">
            <button
              onClick={() => setWizardStep((s) => Math.max(1, s - 1))}
              disabled={wizardStep === 1}
              className="px-4 py-2 text-xs border border-[#161616]/10 rounded-lg text-secondary disabled:opacity-30"
            >
              ← Previous
            </button>
            <button
              onClick={() => setWizardStep((s) => Math.min(3, s + 1))}
              disabled={wizardStep === 3}
              className="px-4 py-2 text-xs bg-[#C84C31] rounded-lg text-white font-medium disabled:opacity-30"
            >
              Next Step →
            </button>
          </div>
        </div>

        {/* Right Dashboard Results (lg:col-span-5) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="border border-[#161616]/10 p-6 rounded-3xl bg-[#ECE7DF] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#C84C31]/10 blur-xl rounded-full pointer-events-none" />
            
            <p className="font-geist text-[9px] tracking-widest text-[#C84C31] uppercase mb-1">Financial Intelligence</p>
            <h4 className="text-lg font-semibold mb-4">True Cost Metrics</h4>

            {/* Score circle & EMI */}
            <div className="grid grid-cols-2 gap-4 items-center mb-6 border-b border-[#161616]/10 pb-6">
              <div>
                <p className="text-xs text-secondary mb-1">Ownership Score</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-semibold stat-num text-[#C84C31]">{results.finalScore.toFixed(1)}</span>
                  <span className="text-xs text-secondary/60">/ 10</span>
                </div>
              </div>
              <div>
                <p className="text-xs text-secondary mb-1">Estimated EMI</p>
                <p className="text-xl font-semibold stat-num text-primary">₹{Math.round(results.emi).toLocaleString("en-IN")}<span className="text-[10px] text-secondary font-normal font-sans">/mo</span></p>
              </div>
            </div>

            {/* True cost totals */}
            <div className="space-y-4 text-sm">
              <div className="flex justify-between items-baseline">
                <span className="text-secondary">5-Yr Running Cost</span>
                <span className="stat-num font-semibold text-primary">{formatCurrency(results.fiveYearFuelCost)}</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-secondary">5-Yr Maintenance</span>
                <span className="stat-num font-semibold text-primary">{formatCurrency(results.fiveYearMaintenance)}</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-secondary">5-Yr Insurance</span>
                <span className="stat-num font-semibold text-primary">{formatCurrency(results.fiveYearInsurance)}</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-secondary">5-Yr Depreciation</span>
                <span className="stat-num font-semibold text-primary">{formatCurrency(results.depreciation)}</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-secondary">Loan Interest Load</span>
                <span className="stat-num font-semibold text-primary">{formatCurrency(results.interestPaid)}</span>
              </div>

              <div className="border-t border-[#161616]/10 pt-4 mt-2 flex justify-between items-center">
                <div>
                  <span className="text-xs text-[#C84C31] font-geist tracking-wider uppercase block">5-Year True Cost</span>
                  <span className="text-[9px] text-secondary/50 block">All expenses net of resale</span>
                </div>
                <span className="text-2xl font-semibold stat-num text-[#C84C31]">{formatCurrency(results.fiveYearCost)}</span>
              </div>
            </div>
          </div>

          {/* Quick analysis callout */}
          <div className="border border-[#161616]/10 bg-[#ECE7DF]/40 p-5 rounded-2xl text-xs space-y-2">
            <h5 className="font-semibold text-primary flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-[#FF6A00]" /> Decision Insight
            </h5>
            <p className="text-secondary leading-relaxed">
              {fuelType === "ev" ? (
                "Your EV selection cuts running costs significantly, saving roughly 70% on fuel bills compared to petrol. However, offset this against the higher upfront acquisition cost and the projected steeper resale depreciation curve."
              ) : fuelType === "diesel" && annualKm >= 15000 ? (
                "With annual usage above 15,000 km, your diesel selection makes strong economic sense. The fuel efficiency gap offsets the RTO premium and interest load within 3.5 years."
              ) : fuelType === "diesel" ? (
                "Diesel premium warning: At your driving volume of under 15,000 km/year, the ex-showroom premium and higher interest paid may not break even within 5 years of ownership."
              ) : (
                "Petrol selection provides the lowest initial purchase price and minimal loan interest cost. If your annual driving is low (under 10,000 km/year), this remains the most financially sound path."
              )}
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
