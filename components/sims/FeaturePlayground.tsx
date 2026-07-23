"use client";

import React, { useState, useEffect } from "react";
import { Shield, Navigation, Eye, Wind, Snowflake, Sun, Video, Camera, AlertTriangle } from "lucide-react";
import { SCENE_COLORS } from "@/components/understanding/scenes/shared/sceneTokens";
import DriveRange from "@/components/ui/DriveRange";

type PlaySubTab = "adas" | "sunroof" | "seats" | "camera";

export default function FeaturePlayground() {
  const [activeTab, setActiveTab] = useState<PlaySubTab>("adas");

  return (
    <div className="glass p-4 sm:p-6 bg-[#ECE7DF]/35 text-[#161616] border-[#161616]/10 rounded-[24px] sm:rounded-[32px] overflow-hidden min-h-[320px] sm:min-h-[460px] flex flex-col" style={{ background: "rgba(236, 231, 223, 0.45)" }}>
      {/* Tab select header */}
      <div className="flex border-b border-[#161616]/10 pb-4 mb-5 sm:mb-6 overflow-x-auto gap-2 sm:gap-4 scrollbar-none">
        {([
          { id: "adas" as const, short: "ADAS", long: "ADAS Demonstrator" },
          { id: "sunroof" as const, short: "Sunroof", long: "Panoramic Sunroof" },
          { id: "seats" as const, short: "Seats", long: "Ventilated Seats" },
          { id: "camera" as const, short: "360° Cam", long: "360° Camera View" },
        ]).map((tab) => {
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`shrink-0 px-3.5 py-2.5 text-xs font-mono font-bold uppercase tracking-wider rounded-lg transition-colors border min-h-11 ${
                activeTab === tab.id
                  ? "border-[#C84C31] bg-[#C84C31]/5 text-[#C84C31]"
                  : "border-[#161616]/10 text-[#4b4b4b] hover:text-[#161616]"
              }`}
            >
              <span className="sm:hidden">{tab.short}</span>
              <span className="hidden sm:inline">{tab.long}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Views */}
      <div className="flex-1">
        {activeTab === "adas" && <AdasDemoView />}
        {activeTab === "sunroof" && <SunroofDemoView />}
        {activeTab === "seats" && <SeatsDemoView />}
        {activeTab === "camera" && <Camera360DemoView />}
      </div>
    </div>
  );
}

// ── 1. ADAS DEMONSTRATOR ──
function AdasDemoView() {
  const [scenario, setScenario] = useState<"idle" | "drift" | "acc" | "bsm">("idle");
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    let raf = 0;
    if (scenario !== "idle") {
      const tick = () => {
        setFrame((f) => f + 1);
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    } else {
      setFrame(0);
    }
    return () => cancelAnimationFrame(raf);
  }, [scenario]);

  let carX = 180;
  let carY = 110;
  let carAngle = 0;
  let showBsmIcon = false;
  let adasStatusText = "ADAS PASSIVE MONITORING";
  let showSteeringWheel = false;
  let steerAngle = 0;

  const cycleLength = 240;
  const progress = (frame % cycleLength) / cycleLength;

  if (scenario === "drift") {
    if (progress < 0.4) {
      const p = progress / 0.4;
      carY = 110 + p * 22;
      carAngle = p * 10;
      adasStatusText = "WARNING: LANE DEPARTURE";
    } else if (progress >= 0.4 && progress < 0.75) {
      const p = (progress - 0.4) / 0.35;
      carY = 132 - p * 22;
      carAngle = 10 - p * 10;
      adasStatusText = "LANE KEEP ASSIST CORRECTING";
      showSteeringWheel = true;
      steerAngle = -25 * Math.sin(p * Math.PI); // steer counter-clockwise to correct
    } else {
      carY = 110;
      carAngle = 0;
      adasStatusText = "LANE STABILIZED";
    }
  } else if (scenario === "acc") {
    adasStatusText = "ADAPTIVE CRUISE LOCK (50M GAP)";
  } else if (scenario === "bsm") {
    adasStatusText = "BLIND SPOT MONITOR ACTIVE";
    if (progress > 0.25 && progress < 0.85) {
      showBsmIcon = true;
    }
  }

  const leadCarX = scenario === "acc"
    ? 440 + Math.sin(progress * Math.PI * 2) * 40
    : 440;
  const egoCarX = scenario === "acc"
    ? leadCarX - 150 - Math.sin(progress * Math.PI * 2) * 15
    : 180;

  // Road center line offset scrolling
  const roadScroll = (frame * 2.5) % 32;

  return (
    <div className="grid md:grid-cols-12 gap-6 items-start">
      <div className="md:col-span-8 relative aspect-[16/10] sm:aspect-[22/10] md:aspect-[22/8] min-h-[200px] bg-[#0A0710] rounded-2xl border border-white/[0.08] overflow-hidden">
        {/* Sky */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0e0c1f] to-[#0A0710] opacity-90" />
        
        <svg viewBox="0 0 700 200" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid meet">
          {/* Lanes */}
          <line x1="0" y1="75" x2="700" y2="75" stroke="rgba(247,247,245,0.06)" strokeWidth={1} />
          <line x1="0" y1="135" x2="700" y2="135" stroke="rgba(247,247,245,0.06)" strokeWidth={1} />
          
          {/* Center dashes */}
          <line
            x1="0"
            y1="105"
            x2="700"
            y2="105"
            stroke="rgba(245,241,232,0.15)"
            strokeWidth={1.5}
            strokeDasharray="16 16"
            strokeDashoffset={scenario !== "idle" ? roadScroll : 0}
          />

          {/* Lane drift boundaries when warning flashes */}
          {scenario === "drift" && progress >= 0.4 && progress < 0.75 && (
            <line x1="0" y1="135" x2="700" y2="135" stroke="#C84C31" strokeWidth={2.5} opacity={0.6} className="animate-pulse" />
          )}

          {/* ADAS Camera vision field (floating Steel Blue triangle) */}
          <path
            d={`M ${egoCarX + 25},${carY} L 700,${carY - 95} L 700,${carY + 95} Z`}
            fill="none"
            stroke="rgba(79, 107, 138, 0.15)"
            strokeWidth={1.25}
            strokeDasharray="2 3"
          />
          <path
            d={`M ${egoCarX + 25},${carY} L 700,${carY - 95} L 700,${carY + 95} Z`}
            fill={scenario === "drift" && progress >= 0.4 ? "rgba(200,76,49,0.05)" : "rgba(79, 107, 138, 0.04)"}
            stroke="none"
          />

          {/* 1. Ego Car (Detailed Top-down) */}
          <g transform={`translate(${egoCarX}, ${carY}) rotate(${carAngle})`}>
            {/* Wheels */}
            {[[-14, -8], [14, -8], [-14, 8], [14, 8]].map(([wx, wy], idx) => (
              <rect key={idx} x={wx - 4} y={wy - 1.5} width={8} height={3} fill="#141416" stroke="#4F6B8A" strokeWidth={0.5} />
            ))}
            {/* Body */}
            <rect x="-22" y="-9" width="44" height="18" rx="3" fill="#1A1A1E" stroke={SCENE_COLORS.textPrimary} strokeWidth={1} />
            {/* Glasshouse */}
            <path d="M -8,-6.5 L 6,-6.5 L 12,-3 L 12,3 L 6,6.5 L -8,6.5 Z" fill="rgba(79, 107, 138, 0.2)" stroke={SCENE_COLORS.textPrimary} strokeWidth={0.5} />
            {/* Headlights */}
            <rect x="20" y="-7" width="3" height="2" fill="#fff" opacity={0.8} />
            <rect x="20" y="5" width="3" height="2" fill="#fff" opacity={0.8} />
            {/* Taillights */}
            <rect x="-23" y="-7" width="2" height="2" fill={scenario === "acc" && Math.sin(progress * Math.PI * 2) > 0 ? "#C84C31" : "#551111"} />
            <rect x="-23" y="5" width="2" height="2" fill={scenario === "acc" && Math.sin(progress * Math.PI * 2) > 0 ? "#C84C31" : "#551111"} />

            {/* Radar wave */}
            {scenario === "acc" && (
              <path d="M 28,-6 A 12 12 0 0,1 28,6" fill="none" stroke="#4F6B8A" strokeWidth={1.25} className="animate-pulse" />
            )}
          </g>

          {/* 2. Lead Car */}
          {(scenario === "acc" || scenario === "idle") && (
            <g transform={`translate(${leadCarX}, 110)`}>
              {/* Wheels */}
              {[[-14, -8], [14, -8], [-14, 8], [14, 8]].map(([wx, wy], idx) => (
                <rect key={idx} x={wx - 4} y={wy - 1.5} width={8} height={3} fill="#141416" stroke="#4F6B8A" strokeWidth={0.5} />
              ))}
              <rect x="-22" y="-9" width="44" height="18" rx="3" fill="#222228" stroke="rgba(247,247,245,0.4)" strokeWidth={1} />
              <path d="M -8,-6.5 L 6,-6.5 L 12,-3 L 12,3 L 6,6.5 L -8,6.5 Z" fill="rgba(79, 107, 138, 0.1)" stroke="rgba(247,247,245,0.3)" strokeWidth={0.5} />
              {/* Brake lights activated when slowing */}
              <rect x="-23" y="-7" width="2" height="2" fill={scenario === "acc" && Math.sin(progress * Math.PI * 2) > 0 ? "#C84C31" : "#551111"} />
              <rect x="-23" y="5" width="2" height="2" fill={scenario === "acc" && Math.sin(progress * Math.PI * 2) > 0 ? "#C84C31" : "#551111"} />
            </g>
          )}

          {/* 3. BSM Motorbike */}
          {scenario === "bsm" && (
            <g transform={`translate(120 + ${progress * 130}, 80)`}>
              {/* Wheels */}
              <line x1="-12" y1="0" x2="-6" y2="0" stroke="#141416" strokeWidth={2.5} />
              <line x1="6" y1="0" x2="12" y2="0" stroke="#141416" strokeWidth={2.5} />
              {/* Body */}
              <rect x="-6" y="-2.5" width="12" height="5" rx="1.2" fill="#C84C31" />
              <circle cx="0" cy="0" r="2" fill="#F7F7F5" />
            </g>
          )}

          {/* Steering wheel overlay overlay */}
          {showSteeringWheel && (
            <g transform={`translate(${egoCarX}, ${carY - 35}) rotate(${steerAngle})`}>
              <circle cx="0" cy="0" r="12" fill="none" stroke="#C84C31" strokeWidth={2} />
              <line x1="-12" y1="0" x2="12" y2="0" stroke="#C84C31" strokeWidth={1.5} />
              <line x1="0" y1="0" x2="0" y2="12" stroke="#C84C31" strokeWidth={1.5} />
            </g>
          )}

          {/* Side Mirror Indicator */}
          {showBsmIcon && (
            <g transform={`translate(${egoCarX - 35}, ${carY - 25})`}>
              <rect x="-10" y="-8" width="20" height="16" rx="2" fill="#0A0710" stroke="#C84C31" strokeWidth={1.25} />
              {/* Alert Triangle */}
              <path d="M 0,-5 L 6,5 L -6,5 Z" fill="none" stroke="#C84C31" strokeWidth={1} />
              <circle cx="0" cy="3" r="0.5" fill="#C84C31" />
            </g>
          )}
        </svg>

        {/* HUD */}
        <div className="absolute top-3 left-4 bg-black/60 px-3 py-1.5 rounded-lg border border-white/[0.08] text-[9.5px] font-mono text-[#C84C31] uppercase tracking-wide">
          {adasStatusText}
        </div>
      </div>

      {/* Controls */}
      <div className="md:col-span-4 space-y-4">
        <h4 className="text-sm font-semibold tracking-tight text-[#161616] uppercase font-mono">Test ADAS Interventions</h4>
        <div className="grid grid-cols-1 gap-2">
          <button
            onClick={() => setScenario("drift")}
            className={`w-full py-3 bg-[#120E18] text-white hover:bg-[#C84C31]/10 text-xs font-semibold rounded-xl border transition-all text-left px-4 flex items-center gap-3 ${
              scenario === "drift" ? "border-[#C84C31]" : "border-transparent"
            }`}
          >
            <Navigation className="w-4 h-4 text-[#C84C31]" />
            Lane Keep Nudge Assist
          </button>
          <button
            onClick={() => setScenario("acc")}
            className={`w-full py-3 bg-[#120E18] text-white hover:bg-[#C84C31]/10 text-xs font-semibold rounded-xl border transition-all text-left px-4 flex items-center gap-3 ${
              scenario === "acc" ? "border-[#C84C31]" : "border-transparent"
            }`}
          >
            <Shield className="w-4 h-4 text-[#C84C31]" />
            Adaptive Cruise Control
          </button>
          <button
            onClick={() => setScenario("bsm")}
            className={`w-full py-3 bg-[#120E18] text-white hover:bg-[#C84C31]/10 text-xs font-semibold rounded-xl border transition-all text-left px-4 flex items-center gap-3 ${
              scenario === "bsm" ? "border-[#C84C31]" : "border-transparent"
            }`}
          >
            <Eye className="w-4 h-4 text-[#C84C31]" />
            Blind Spot Detection
          </button>
          <button
            onClick={() => setScenario("idle")}
            className="w-full py-2 text-xs font-mono text-[#9CA3AF] hover:text-[#161616] transition-colors"
          >
            Reset Simulator
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 2. PANORAMIC SUNROOF ──
function SunroofDemoView() {
  const [shadePct, setShadePct] = useState(0);
  const [glassPct, setGlassPct] = useState(0);

  const ambientRating = shadePct < 20 ? 15 : shadePct < 80 ? 60 : 100;
  const moodDesc = shadePct < 20 ? "Cooped Up / Dark" : glassPct > 20 ? "Open-Air Breeze / Spacious" : "Bright & Light-Flooded";

  return (
    <div className="grid md:grid-cols-12 gap-6 items-start">
      <div className="md:col-span-8 relative aspect-[16/10] sm:aspect-[22/10] md:aspect-[22/8] min-h-[200px] bg-[#0A0710] rounded-2xl border border-white/[0.08] overflow-hidden">
        {/* Sky / Ambient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0d0c24] to-[#0A0710] opacity-90" />
        
        <svg viewBox="0 0 700 200" className="absolute inset-0 w-full h-full">
          {/* Sky visible through open glass */}
          {shadePct > 30 && (
            <g opacity={(shadePct / 100) * 0.85}>
              <rect x="220" y="42" width="260" height="60" fill="#2C5282" />
              {/* Clouds outline */}
              <path d="M 260,65 Q 275,55 290,65 Q 305,55 320,65 Q 330,75 310,75 L 250,75 Z" fill="rgba(255,255,255,0.15)" stroke="none" />
              <path d="M 380,55 Q 395,45 410,55 Q 425,45 440,55 L 370,55 Z" fill="rgba(255,255,255,0.12)" stroke="none" />
            </g>
          )}

          {/* Cabin silhouette */}
          <path
            d="M 50,165 H 650 M 120,165 L 140,85 M 380,165 L 400,85"
            fill="none"
            stroke="rgba(79, 107, 138, 0.35)"
            strokeWidth={1.5}
          />
          
          {/* Seats profile */}
          {/* Driver seat */}
          <path d="M 170,165 L 220,165 L 205,95 M 190,95 L 190,82" stroke="rgba(79,107,138,0.5)" strokeWidth={2} fill="none" />
          <rect x="182" y="72" width="16" height="10" rx="2" fill="none" stroke="rgba(79,107,138,0.5)" strokeWidth={1.5} />

          {/* Rear seat */}
          <path d="M 430,165 L 480,165 L 465,95 M 450,95 L 450,82" stroke="rgba(79,107,138,0.5)" strokeWidth={2} fill="none" />
          <rect x="442" y="72" width="16" height="10" rx="2" fill="none" stroke="rgba(79,107,138,0.5)" strokeWidth={1.5} />

          {/* Sunlight rays flooding inside */}
          {shadePct > 10 && (
            <polygon
              points={`220,42 ${220 + shadePct * 2.6},42 ${220 + shadePct * 2.2},165 170,165`}
              fill="url(#sunlight-glow)"
              opacity={(shadePct / 100) * 0.25}
            />
          )}

          <defs>
            <linearGradient id="sunlight-glow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ECC94B" />
              <stop offset="100%" stopColor="#ECC94B" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Slidable fabric shade */}
          <line
            x1={480 - (shadePct / 100) * 260}
            y1="45"
            x2="480"
            y2="45"
            stroke="#16161A"
            strokeWidth={4.5}
          />

          {/* Sunroof glass panel sliding */}
          <line
            x1={220 + (glassPct / 100) * 110}
            y1="40"
            x2={480 + (glassPct / 100) * 110}
            y2="40"
            stroke="#4F6B8A"
            strokeWidth={2.5}
            opacity={0.9}
          />

          {/* Air flowlines if glass is open */}
          {glassPct > 15 && (
            <g opacity={(glassPct / 100) * 0.6} stroke="#35D6FF" strokeWidth={1} fill="none">
              <path d="M 180,35 Q 230,22 280,38" />
              <path d="M 230,37 Q 280,24 330,42" />
            </g>
          )}

          {/* Passengers */}
          {/* Driver */}
          <g transform="translate(190, 120)" stroke="rgba(247,247,245,0.7)" strokeWidth={1.5} fill="none">
            <circle cx="0" cy="-22" r="6" />
            <line x1="0" y1="-16" x2="-4" y2="12" />
            {/* Steering arm */}
            <path d="M -4,-2 L -12,-8 L -15,-6" />
          </g>
          
          {/* Rear passenger */}
          <g transform="translate(445, 120)" stroke="rgba(247,247,245,0.7)" strokeWidth={1.5} fill="none">
            <circle cx="0" cy="-22" r="6" />
            <line x1="0" y1="-16" x2="-4" y2="12" />
          </g>
        </svg>

        {/* HUD */}
        <div className="absolute bottom-3 right-4 bg-black/60 px-3 py-1.5 rounded-lg border border-white/[0.08] text-[9.5px] font-mono text-[#35D6FF] flex items-center gap-1.5">
          <Sun className="w-3.5 h-3.5" />
          <span>AMBIENCE: {moodDesc} ({ambientRating}% brightness)</span>
        </div>
      </div>

      {/* Controls */}
      <div className="md:col-span-4 space-y-6">
        <h4 className="text-sm font-semibold tracking-tight text-[#161616] uppercase font-mono">Sunroof Configurator</h4>
        
        <DriveRange
          label={`Sunshade Rollout: ${shadePct}% Open`}
          value={shadePct}
          onChange={(v) => {
            setShadePct(v);
            if (v < 100) setGlassPct(0);
          }}
          min={0}
          max={100}
          step={5}
          mobileStep={10}
          format={(v) => `${v}%`}
          presets={[0, 50, 100]}
          presetFormat={(v) => `${v}%`}
          accentClass="accent-[#C84C31]"
        />

        <DriveRange
          label={`Glass Slide: ${glassPct}% Open`}
          value={glassPct}
          onChange={setGlassPct}
          min={0}
          max={100}
          step={5}
          mobileStep={10}
          format={(v) => `${v}%`}
          presets={[0, 50, 100]}
          presetFormat={(v) => `${v}%`}
          disabled={shadePct < 100}
          accentClass="accent-[#C84C31]"
        />

        <div className="p-4 bg-[#ECE7DF] border border-[#161616]/10 rounded-xl text-[10px] text-[#161616]/70 leading-normal flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-[#C84C31] shrink-0" />
          <span>Sunroofs elevate cabin premium feel and passenger comfort during winter/evenings, but can overload AC cooling in hot Indian summers.</span>
        </div>
      </div>
    </div>
  );
}

// ── 3. VENTILATED SEATS ──
function SeatsDemoView() {
  const [active, setActive] = useState(false);
  const [comfortVal, setComfortVal] = useState(10);

  useEffect(() => {
    let interval: any = 0;
    if (active) {
      interval = setInterval(() => {
        setComfortVal((c) => Math.min(96, c + 6));
      }, 120);
    } else {
      setComfortVal(10);
    }
    return () => clearInterval(interval);
  }, [active]);

  const dialAngle = -140 + (comfortVal / 100) * 280;

  return (
    <div className="grid md:grid-cols-12 gap-6 items-start">
      <div className="md:col-span-8 relative aspect-[16/10] sm:aspect-[22/10] md:aspect-[22/8] min-h-[200px] bg-[#0A0710] rounded-2xl border border-white/[0.08] overflow-hidden">
        {/* Sky / Heat grid */}
        <div className={`absolute inset-0 bg-gradient-to-b ${active ? "from-[#081615] to-[#0A0710]" : "from-[#1a080c] to-[#0A0710]"} transition-colors duration-700`} />
        
        <svg viewBox="0 0 700 200" className="absolute inset-0 w-full h-full">
          {/* Thermal heat waves rising from seat (Vermillion waves) */}
          {!active && (
            <g stroke="#C84C31" strokeWidth={1} fill="none" opacity={0.65}>
              {[275, 295, 315].map((wx, idx) => (
                <path
                  key={idx}
                  d={`M ${wx},140 Q ${wx + 8},100 ${wx - 2},70`}
                  className="animate-pulse"
                />
              ))}
            </g>
          )}

          {/* Perforations cooling flow (Blue arrow flow vectors) */}
          {active && (
            <g stroke="#4F6B8A" strokeWidth={1.25} fill="none" opacity={comfortVal / 100}>
              {[280, 295, 310, 325, 340].map((cx, idx) => (
                <line
                  key={idx}
                  x1={cx}
                  y1="125"
                  x2={cx - 15}
                  y2="108"
                  strokeDasharray="2 2"
                />
              ))}
              {[70, 85, 100, 115].map((cy, idx) => (
                <line
                  key={idx}
                  x1="332"
                  y1={cy}
                  x2="352"
                  y2={cy - 10}
                  strokeDasharray="2 2"
                />
              ))}
            </g>
          )}

          {/* Perforated Seat Casing (Detailed Profile) */}
          {/* Bottom cushion */}
          <path d="M 240,140 H 335 C 345,140 348,135 348,125" stroke={active ? "#4F6B8A" : "#C84C31"} strokeWidth={2} fill="none" />
          {/* Back cushion */}
          <path d="M 330,128 L 362,56 C 365,50 358,45 352,48 L 320,120" stroke={active ? "#4F6B8A" : "#C84C31"} strokeWidth={2} fill="none" />
          
          {/* Seat perforations pattern (Tiny dots inside seat outline) */}
          <g fill={active ? "#4F6B8A" : "#C84C31"} opacity={0.35}>
            {[250, 260, 270, 280, 290, 300, 310, 320].map((dx) => (
              <circle key={dx} cx={dx} cy="135" r="1" />
            ))}
            {[60, 70, 80, 90, 100, 110].map((dy) => (
              <circle key={dy} cx="340" cy={dy} r="1" />
            ))}
          </g>

          {/* Seat base anchor frame */}
          <path d="M 260,140 L 250,170 H 330 L 320,140" stroke="rgba(79, 107, 138, 0.4)" strokeWidth={1.5} fill="none" />
        </svg>

        {/* Dynamic comfort indicator gauge */}
        <div className="absolute top-4 right-4 bg-black/60 p-3 rounded-2xl border border-white/[0.08]">
          <div className="flex flex-col items-center">
            <svg width="50" height="50" className="transform -rotate-90">
              <circle cx="25" cy="25" r="20" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2.5" />
              {/* Scale */}
              <path d="M 25,5 A 20 20 0 0,1 45,25" fill="none" stroke={active ? "#4F6B8A" : "#C84C31"} strokeWidth="2.5" />
              {/* Dial needle */}
              <line
                x1="25"
                y1="25"
                x2={25 + 18 * Math.cos((dialAngle * Math.PI) / 180)}
                y2={25 + 18 * Math.sin((dialAngle * Math.PI) / 180)}
                stroke="#F7F7F5"
                strokeWidth={1.5}
              />
            </svg>
            <span className="text-[7px] font-mono text-[#9CA3AF] mt-1">COMFORT: {comfortVal}%</span>
          </div>
        </div>

        {/* HUD */}
        <div className="absolute bottom-3 left-4 bg-black/60 px-3 py-1.5 rounded-lg border border-white/[0.08] text-[9.5px] font-mono text-[#4F6B8A]">
          SEAT STATE: {active ? "VENTILATING (COOL AIRFLOW)" : "HEAT ABSORBING"}
        </div>
      </div>

      {/* Controls */}
      <div className="md:col-span-4 space-y-6">
        <h4 className="text-sm font-semibold tracking-tight text-[#161616] uppercase font-mono">Seat Climate Sandbox</h4>
        
        <button
          onClick={() => setActive(!active)}
          className={`w-full py-4 rounded-xl font-bold text-xs transition-all uppercase flex items-center justify-center gap-3 ${
            active ? "bg-[#4F6B8A] text-white" : "bg-[#C84C31] text-white"
          }`}
        >
          {active ? (
            <>
              <Snowflake className="w-4 h-4 animate-spin" />
              COOLING ACTIVE (TURN OFF)
            </>
          ) : (
            <>
              <Wind className="w-4 h-4" />
              40°C CABIN (TURN ON VENTILATION)
            </>
          )}
        </button>

        <div className="p-4 bg-[#ECE7DF] border border-[#161616]/10 rounded-xl text-[10px] text-[#161616]/70 leading-normal flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-[#C84C31] shrink-0" />
          <span>Ventilated seats pull air through the perforated cushions to dissipate body heat, preventing sweating within 30 seconds of activation.</span>
        </div>
      </div>
    </div>
  );
}

// ── 4. 360° CAMERA VIEW ──
function Camera360DemoView() {
  const [cameraView, setCameraView] = useState<"standard" | "stitched">("standard");

  return (
    <div className="grid md:grid-cols-12 gap-6 items-start">
      <div className="md:col-span-8 relative aspect-[16/10] sm:aspect-[22/10] md:aspect-[22/8] min-h-[200px] bg-[#0A0710] rounded-2xl border border-white/[0.08] overflow-hidden">
        {/* Ambient Dark Viewport Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0C0A10] to-[#050408] opacity-95" />
        
        <svg viewBox="0 0 700 200" className="absolute inset-0 w-full h-full">
          {cameraView === "standard" ? (
            // ── Standard Rear Camera View (Full Screen) ──
            <g>
              {/* Ground Pavement in Perspective */}
              <polygon points="0,200 220,70 480,70 700,200" fill="#141318" />
              <line x1="220" y1="70" x2="480" y2="70" stroke="rgba(247,247,245,0.08)" strokeWidth={1} />
              
              {/* Parking Grid Lines in Perspective */}
              <line x1="280" y1="70" x2="150" y2="200" stroke="rgba(79,107,138,0.15)" strokeWidth={1} />
              <line x1="420" y1="70" x2="550" y2="200" stroke="rgba(79,107,138,0.15)" strokeWidth={1} />
              
              {/* Parked Sedan Behind (Perspective View) */}
              <g transform="translate(350, 72)">
                {/* Car Shadow */}
                <ellipse cx="0" cy="8" rx="55" ry="8" fill="rgba(0,0,0,0.6)" />
                {/* Rear Bumper/Body */}
                <rect x="-50" y="-12" width="100" height="20" rx="4" fill="#2E2E35" stroke="rgba(247,247,245,0.15)" strokeWidth={1} />
                {/* Windshield */}
                <polygon points="-42,-12 -34,-26 34,-26 42,-12" fill="rgba(79, 107, 138, 0.25)" stroke="rgba(247,247,245,0.1)" strokeWidth={0.5} />
                {/* Taillights */}
                <rect x="-46" y="-8" width="12" height="4" rx="1" fill="#7a1a1a" />
                <rect x="34" y="-8" width="12" height="4" rx="1" fill="#7a1a1a" />
                <text x="0" y="3" fill="rgba(247,247,245,0.2)" fontSize={6} fontFamily="monospace" textAnchor="middle">PARKED CAR</text>
              </g>

              {/* Dynamic Overlay Guidelines */}
              {/* Active curving path lines */}
              <path d="M 230,200 Q 310,130 335,80" fill="none" stroke="#2d6a4f" strokeWidth={2.5} opacity={0.85} />
              <path d="M 470,200 Q 390,130 365,80" fill="none" stroke="#2d6a4f" strokeWidth={2.5} opacity={0.85} />
              
              {/* Distance guides */}
              <line x1="280" y1="160" x2="420" y2="160" stroke="#C84C31" strokeWidth={1.5} opacity={0.8} /> {/* Red STOP */}
              <line x1="300" y1="120" x2="400" y2="120" stroke="#d97706" strokeWidth={1.5} opacity={0.8} /> {/* Yellow CAUTION */}
              <line x1="315" y1="90" x2="385" y2="90" stroke="#2d6a4f" strokeWidth={1.5} opacity={0.8} />  {/* Green SAFE */}

              {/* Rear Bumper Overlay (Ego Car bumper at bottom of camera view) */}
              <path d="M 120,200 Q 350,185 580,200 L 580,205 L 120,205 Z" fill="#1C1C22" stroke="#4F6B8A" strokeWidth={1} />
              <circle cx="350" cy="195" r="2" fill="#C84C31" opacity={0.7} /> {/* Camera lens center indicator */}

              {/* Alert - Explaining the blindspot */}
              <g transform="translate(350, 160)">
                <text fill="#FFB300" fontSize={8.5} fontFamily="monospace" textAnchor="middle" fontWeight="bold" letterSpacing="0.5">
                  REAR PATH CLEAR · FRONT BLIND SPOT COLLISION DANGER ACTIVE
                </text>
                <text fill="rgba(247,247,245,0.45)" fontSize={7} fontFamily="monospace" textAnchor="middle" y="12">
                  (Obstacle next to front bumper is completely out of standard rear camera field of view)
                </text>
              </g>
            </g>
          ) : (
            // ── 360° Stitched Surround view (Split Screen) ──
            <g>
              {/* Left Screen: Standard Rear View (Scaled to left half) */}
              <g>
                <rect x="0" y="0" width="300" height="200" fill="#0C0A10" />
                {/* Perspective Pavement */}
                <polygon points="0,200 90,70 210,70 300,200" fill="#141318" />
                
                {/* Parked Sedan behind */}
                <g transform="translate(150, 72)">
                  <ellipse cx="0" cy="8" rx="35" ry="6" fill="rgba(0,0,0,0.6)" />
                  <rect x="-35" y="-12" width="70" height="15" rx="3" fill="#2E2E35" stroke="rgba(247,247,245,0.15)" strokeWidth={0.75} />
                  <polygon points="-28,-12 -23,-22 23,-22 28,-12" fill="rgba(79, 107, 138, 0.25)" stroke="rgba(247,247,245,0.1)" strokeWidth={0.5} />
                </g>

                {/* Perspective Guidelines */}
                <path d="M 60,200 Q 120,130 138,80" fill="none" stroke="#2d6a4f" strokeWidth={2} opacity={0.8} />
                <path d="M 240,200 Q 180,130 162,80" fill="none" stroke="#2d6a4f" strokeWidth={2} opacity={0.8} />
                <line x1="100" y1="160" x2="200" y2="160" stroke="#C84C31" strokeWidth={1} opacity={0.7} />
                <line x1="115" y1="120" x2="185" y2="120" stroke="#d97706" strokeWidth={1} opacity={0.7} />

                {/* Bumper Lip */}
                <path d="M 40,200 Q 150,188 260,200 L 260,205 L 40,205 Z" fill="#1C1C22" stroke="#4F6B8A" strokeWidth={0.75} />

                {/* Divider Line */}
                <line x1="300" y1="0" x2="300" y2="200" stroke="rgba(79, 107, 138, 0.35)" strokeWidth={1.5} />
              </g>

              {/* Right Screen: 360° Bird's Eye View (Stitched top-down) */}
              <g transform="translate(300, 0)">
                <rect x="0" y="0" width="400" height="200" fill="#0A0A0E" />
                
                {/* Parking Bay Lines (Horizontal curb lines and dividers) */}
                <line x1="20" y1="50" x2="380" y2="50" stroke="rgba(247,247,245,0.12)" strokeWidth={1} />
                <line x1="20" y1="150" x2="380" y2="150" stroke="rgba(247,247,245,0.12)" strokeWidth={1} />
                {/* Slot Dividers */}
                <line x1="110" y1="50" x2="110" y2="150" stroke="rgba(247,247,245,0.08)" strokeDasharray="3 3" />
                <line x1="290" y1="50" x2="290" y2="150" stroke="rgba(247,247,245,0.08)" strokeDasharray="3 3" />

                {/* Left Parked Car (Sedan) */}
                <g transform="translate(65, 100)">
                  <rect x="-25" y="-12" width="50" height="24" rx="3" fill="#222226" stroke="rgba(247,247,245,0.15)" strokeWidth={1} />
                  <path d="M 15,-9 L 20,-5 L 20,5 L 15,9 Z" fill="rgba(79, 107, 138, 0.2)" />
                  <text x="0" y="3" fill="rgba(247,247,245,0.15)" fontSize={6} fontFamily="monospace" textAnchor="middle">PARKED</text>
                </g>

                {/* Right Parked Car (SUV) */}
                <g transform="translate(335, 100)">
                  <rect x="-27" y="-14" width="54" height="28" rx="4" fill="#2F2F35" stroke="rgba(247,247,245,0.15)" strokeWidth={1} />
                  <path d="M -15,-11 L -20,-7 L -20,7 L -15,11 Z" fill="rgba(79, 107, 138, 0.2)" />
                  <text x="0" y="3" fill="rgba(247,247,245,0.15)" fontSize={6} fontFamily="monospace" textAnchor="middle">PARKED</text>
                </g>

                {/* Stitching Seam Lines (Diagonal camera boundary overlays) */}
                {/* Radiating from corners of the ego car (centered at 200, 100, length 60, width 24) */}
                {/* Ego car boundaries: x from 170 to 230, y from 88 to 112 */}
                <line x1="230" y1="88" x2="400" y2="0" stroke="rgba(79, 107, 138, 0.2)" strokeWidth={1} strokeDasharray="3 3" />
                <line x1="230" y1="112" x2="400" y2="200" stroke="rgba(79, 107, 138, 0.2)" strokeWidth={1} strokeDasharray="3 3" />
                <line x1="170" y1="88" x2="0" y2="0" stroke="rgba(79, 107, 138, 0.2)" strokeWidth={1} strokeDasharray="3 3" />
                <line x1="170" y1="112" x2="0" y2="200" stroke="rgba(79, 107, 138, 0.2)" strokeWidth={1} strokeDasharray="3 3" />

                {/* Ego Car (High Fidelity Top-down blueprint vector) */}
                <g transform="translate(200, 100)">
                  {/* Wheels */}
                  {[[-16, -12.5], [16, -12.5], [-16, 12.5], [16, 12.5]].map(([wx, wy], idx) => (
                    <rect key={idx} x={wx - 4} y={wy - 1} width={8} height={2} fill="#141416" />
                  ))}
                  {/* Body shape */}
                  <rect x="-30" y="-12" width="60" height="24" rx="4" fill="#1F1E24" stroke="#4F6B8A" strokeWidth={1.5} />
                  {/* Windshield */}
                  <path d="M 12,-9 L 20,-6 L 20,6 L 12,9 Z" fill="rgba(79, 107, 138, 0.35)" stroke="rgba(247,247,245,0.2)" strokeWidth={0.5} />
                  {/* Glasshouse/Sunroof */}
                  <rect x="-10" y="-8" width="18" height="16" rx="1.5" fill="rgba(79, 107, 138, 0.2)" stroke="rgba(247,247,245,0.15)" strokeWidth={0.5} />
                  {/* Rear glass */}
                  <path d="M -22,-8 L -16,-6 L -16,6 L -22,8 Z" fill="rgba(79, 107, 138, 0.35)" stroke="rgba(247,247,245,0.2)" strokeWidth={0.5} />
                  {/* Side Mirrors */}
                  <rect x="8" y="-14" width="3" height="2" fill="#1F1E24" rx={0.5} />
                  <rect x="8" y="12" width="3" height="2" fill="#1F1E24" rx={0.5} />
                  {/* Headlights */}
                  <polygon points="28,-10 30,-9 30,-5 28,-6" fill="#FFF" opacity={0.8} />
                  <polygon points="28,10 30,9 30,5 28,6" fill="#FFF" opacity={0.8} />

                  {/* Soft camera field projection cones */}
                  <polygon points="30,-6 30,6 70,20 70,-20" fill="rgba(79,107,138,0.04)" /> {/* Front */}
                  <polygon points="-30,-6 -30,6 -70,20 -70,-20" fill="rgba(79,107,138,0.04)" /> {/* Rear */}
                </g>

                {/* Danger Obstacle: Concrete Pillar/Column in Parking Bay */}
                {/* Placed at cx=226, cy=68 (near the front-left wheel bumper) */}
                <g>
                  {/* Blinking Radar Distance Rings */}
                  <path d="M 215,82 A 12 12 0 0,1 236,78" fill="none" stroke="#C84C31" strokeWidth={1.75} className="animate-pulse" />
                  <path d="M 210,86 A 20 20 0 0,1 242,80" fill="none" stroke="#C84C31" strokeWidth={1} opacity={0.6} className="animate-pulse" />
                  
                  {/* Concrete block */}
                  <rect x="220" y="60" width="12" height="12" rx="1" fill="#75757C" stroke="#1C1C22" strokeWidth={1} />
                  {/* Safety caution hazard stripes on column (yellow/black diagonals) */}
                  <line x1="220" y1="64" x2="224" y2="60" stroke="#FFB300" strokeWidth={1.5} />
                  <line x1="220" y1="70" x2="230" y2="60" stroke="#FFB300" strokeWidth={1.5} />
                  <line x1="224" y1="72" x2="232" y2="64" stroke="#FFB300" strokeWidth={1.5} />
                  <line x1="228" y1="72" x2="232" y2="68" stroke="#FFB300" strokeWidth={1.5} />

                  {/* Red bumper warning lock line */}
                  <line x1="226" y1="88" x2="226" y2="72" stroke="#C84C31" strokeWidth={1.5} strokeDasharray="2 1" />
                  
                  {/* Warning Box overlay (Triangle path instead of emoji) */}
                  <g transform="translate(230, 42)">
                    <path d="M 0,-4 L 5,5 L -5,5 Z" fill="#C84C31" />
                    <rect x="-0.5" y="-1.5" width="1" height="3" fill="#FFF" />
                    <circle cx="0" cy="3" r="0.6" fill="#FFF" />
                    <text x="10" y="4" fill="#C84C31" fontSize={8} fontFamily="monospace" fontWeight="bold" className="animate-pulse">
                      PILLAR OBSTACLE
                    </text>
                  </g>
                </g>
              </g>
            </g>
          )}
        </svg>

        {/* HUD */}
        <div className="absolute top-3 left-4 bg-black/60 px-3 py-1.5 rounded-lg border border-white/[0.08] text-[9.5px] font-mono text-[#F5F1E8]/80 uppercase">
          VIEW MODE: {cameraView === "standard" ? "180° REAR FEED ONLY" : "360° STITCHED SURROUND FEED"}
        </div>
      </div>

      {/* Controls */}
      <div className="md:col-span-4 space-y-6">
        <h4 className="text-sm font-semibold tracking-tight text-[#161616] uppercase font-mono">Camera View Sandbox</h4>
        <div className="grid grid-cols-1 gap-2">
          <button
            onClick={() => setCameraView("standard")}
            className={`w-full py-3 rounded-xl font-bold text-xs transition-colors border flex items-center gap-3 px-4 ${
              cameraView === "standard"
                ? "border-[#C84C31] bg-[#C84C31]/5 text-[#C84C31]"
                : "border-white/[0.08] bg-[#120E18] text-[#9CA3AF] hover:text-white"
            }`}
          >
            <Video className="w-4 h-4" />
            Standard Rear Camera
          </button>
          <button
            onClick={() => setCameraView("stitched")}
            className={`w-full py-3 rounded-xl font-bold text-xs transition-colors border flex items-center gap-3 px-4 ${
              cameraView === "stitched"
                ? "border-[#C84C31] bg-[#C84C31]/5 text-[#C84C31]"
                : "border-white/[0.08] bg-[#120E18] text-[#9CA3AF] hover:text-white"
            }`}
          >
            <Camera className="w-4 h-4" />
            360° Bird's Eye View
          </button>
        </div>

        <div className="p-4 bg-[#ECE7DF] border border-[#161616]/10 rounded-xl text-[10px] text-[#161616]/70 leading-normal flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-[#C84C31] shrink-0" />
          <span>A 360° camera stitches front, back, and side mirror feeds to reveal low walls, fire hydrants, or pillars that standard rear sensors fail to capture.</span>
        </div>
      </div>
    </div>
  );
}
