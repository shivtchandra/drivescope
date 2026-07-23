"use client";

import React from "react";
import Link from "next/link";
import EvVsPetrolCalculator from "./EvVsPetrolCalculator";

export default function SimulationBay() {
  return (
    <div className="space-y-16 text-[#161616] pb-safe">
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <svg className="w-full h-full opacity-[0.02]" viewBox="0 0 1440 400" preserveAspectRatio="xMidYMid slice">
          {Array.from({ length: 12 }).map((_, i) => (
            <path
              key={i}
              d={`M ${-100 + i * 120},200 Q ${200 + i * 80},${100 + i * 15} ${400 + i * 90},200 T ${900 + i * 60},200`}
              fill="none"
              stroke="#161616"
              strokeWidth="0.8"
              className="animate-streamline-flow"
              style={{ animationDelay: `${i * 0.4}s` }}
            />
          ))}
        </svg>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 relative z-10" data-reveal>
        {[
          { label: "0–100 Drag Race", metric: "4.2s", unit: "best in class", href: "/simulate" },
          { label: "Braking Distance", metric: "38.4m", unit: "100–0 km/h", href: "/simulate" },
          { label: "Highway Overtake", metric: "3.1s", unit: "80–120 km/h", href: "/drive" },
        ].map((sim) => (
          <Link
            key={sim.label}
            href={sim.href}
            className="border border-[#161616]/10 bg-[#ECE7DF] p-6 rounded-2xl group hover:border-[#C74B32]/30 transition-colors"
          >
            <p className="font-mono text-[9px] tracking-widest text-[#C74B32] uppercase mb-3">{sim.label}</p>
            <p className="font-display text-3xl font-bold text-[#161616] group-hover:text-[#C74B32] transition-colors">{sim.metric}</p>
            <p className="text-xs text-[#161616]/60 mt-1 font-mono">{sim.unit}</p>
            <p className="font-mono text-[9px] text-[#161616]/50 mt-4 uppercase tracking-widest group-hover:text-[#C74B32]/80 transition-colors">
              Enter simulation →
            </p>
          </Link>
        ))}
      </div>

      <div className="relative z-10" data-reveal>
        <div className="mb-6 space-y-1">
          <span className="font-mono text-[9px] tracking-[0.3em] text-[#C74B32] uppercase font-bold">
            Chapter 04 · Fuel Type Analysis
          </span>
          <h3 className="font-display text-2xl sm:text-3xl text-[#161616]">
            EV vs Petrol — the break-even math
          </h3>
        </div>
        <EvVsPetrolCalculator />
      </div>
    </div>
  );
}
