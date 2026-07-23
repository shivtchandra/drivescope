import React from "react";
import UnifiedCanvas from "@/components/UnifiedCanvas";
import SectionWrapper from "@/components/SectionWrapper";
import HeroReveal from "@/components/HeroReveal";
import EngineeringBoards from "@/components/facility/EngineeringBoards";
import FinancialCommandCenter from "@/components/FinancialCommandCenter";
import LifecycleJourney from "@/components/LifecycleJourney";
import SimulationBay from "@/components/SimulationBay";
import HomeComparisonEngine from "@/components/HomeComparisonEngine";
import LuxuryShowroom from "@/components/LuxuryShowroom";
import MobileStickyCTA from "@/components/MobileStickyCTA";

export default function Home() {
  return (
    <div className="relative w-full pb-safe sm:pb-0 bg-[#F5F1E8] text-[#161616]">
      {/* Giant Unified F1 Engineering Blueprint Backdrop */}
      <UnifiedCanvas />

      <div className="relative z-10 w-full">
        <MobileStickyCTA />

        {/* INTRO — THE SCIENCE OF CHOOSING A CAR */}
        <SectionWrapper mood="hero">
          <HeroReveal />
        </SectionWrapper>

        <div className="border-t border-[#4F6B8A]/10 mx-auto max-w-6xl" />

        {/* CHAPTER 01 — WHAT MAKES A GOOD CAR? */}
        <SectionWrapper mood="lab">
          <section className="py-16 sm:py-28 relative">
            <div className="mx-auto max-w-7xl px-6">
              <div className="mb-20 space-y-3">
                <span className="font-mono text-[9px] tracking-[0.3em] text-[#C84C31] uppercase font-bold block">
                  Chapter 01 // SECTION A-01 // FRONT AERODYNAMIC ASSEMBLY // SUSPENSION CELL
                </span>
                <h2 className="font-display text-5xl sm:text-6xl text-[#161616] leading-[1.1] max-w-2xl">
                  An automotive decision engine.<br />Not a classifieds site.
                </h2>
                <p className="text-base sm:text-lg text-[#161616]/75 max-w-xl leading-relaxed">
                  Three intelligence workstations. Each answers a question buyers never think to ask.
                </p>
              </div>
              <EngineeringBoards />
            </div>
          </section>
        </SectionWrapper>

        <div className="border-t border-[#4F6B8A]/10 mx-auto max-w-6xl" />

      {/* CHAPTER 02 — OWNERSHIP STORIES */}
      <SectionWrapper mood="lifecycle" className="py-0 relative overflow-visible">
        <LifecycleJourney />
      </SectionWrapper>

      <div className="border-t border-[#4F6B8A]/10 mx-auto max-w-6xl" />

      {/* CHAPTER 03 — COMPARE THOUGHTFULLY */}
      <SectionWrapper mood="comparison">
        <section id="compare" className="py-16 sm:py-28 relative">
          <div className="mx-auto max-w-7xl px-6 space-y-16">
            <div className="space-y-3">
              <span className="font-mono text-[9px] tracking-[0.3em] text-[#C84C31] uppercase font-bold block">
                Chapter 03 // SECTION B-04 // COMPARATIVE ANALYSIS // RADAR CHASSIS MATRIX
              </span>
              <h2 className="font-display text-5xl sm:text-6xl text-[#161616] leading-[1.1]">
                Compare vehicles.<br />On every axis.
              </h2>
              <p className="text-base sm:text-lg text-[#161616]/75 max-w-xl leading-relaxed">
                Performance, safety, and ownership radar charts. Side-by-side tactical analysis.
              </p>
            </div>
            <HomeComparisonEngine />
          </div>
        </section>
      </SectionWrapper>

      <div className="border-t border-[#4F6B8A]/10 mx-auto max-w-6xl" />

      {/* CHAPTER 04 — SIMULATE REALITY */}
      <SectionWrapper mood="financial">
        <section id="simulator" className="py-16 sm:py-28 relative">
          <div className="mx-auto max-w-7xl px-6 space-y-16">
            <div className="text-center max-w-2xl mx-auto space-y-4">
              <span className="font-mono text-[9px] tracking-[0.3em] text-[#C84C31] uppercase font-bold block">
                Chapter 04 // SECTION C-02 // POWERTRAIN & SIMULATION CENTER
              </span>
              <h2 className="font-display text-5xl sm:text-6xl text-[#161616] leading-[1.1]">
                The full picture.<br />Not just the sticker price.
              </h2>
              <p className="text-base sm:text-lg text-[#161616]/75 leading-relaxed">
                Configure your ownership parameters, run wind tunnel aerodynamics, and inspect real-world powertrain dynamics derived from chassis data.
              </p>
            </div>
            
            <FinancialCommandCenter />

            <div className="pt-16 border-t border-[#4F6B8A]/10">
              <div className="mb-12 space-y-3">
                <span className="font-mono text-[9px] tracking-[0.3em] text-[#C84C31] uppercase font-bold block">
                  Physics Simulator // SECTION D-01 // WIND TUNNEL & DYNO BAY
                </span>
                <h3 className="font-display text-4xl text-[#161616]">Interactive Overdrive Test</h3>
              </div>
              <SimulationBay />
            </div>
          </div>
        </section>
      </SectionWrapper>

      <div className="border-t border-[#4F6B8A]/10 mx-auto max-w-6xl" />

      {/* CHAPTER 05 — THE SHOWROOM */}
      <SectionWrapper mood="luxury">
        <LuxuryShowroom />
      </SectionWrapper>
      </div>
    </div>
  );
}
