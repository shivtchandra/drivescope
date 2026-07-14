"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

// Japanese Editorial theme (lib/theme.ts)
const INK = "#161616";
const VERMILLION = "#C84C31";
const BONE = "#F5F1E8";

// Ferrari-inspired racing livery (original artwork — no team marks)
const SCARLET = "#E10600";
const SCARLET_DEEP = "#B00500";
const DARK = "#1A1A1A";
const YELLOW = "#FFD500";
const CLEAR = "rgba(0,0,0,0)";

type Phase = "draw" | "fill" | "reveal";

export default function IntroSequence() {
  const reduceMotion = useReducedMotion();
  const pathname = usePathname();
  const isSeoLanding = pathname.startsWith("/compare/") || pathname.startsWith("/cars/");
  const [active, setActive] = useState(false);
  const [phase, setPhase] = useState<Phase>("draw");
  const [visitCount, setVisitCount] = useState<number>(1);

  useEffect(() => {
    if (isSeoLanding) {
      queueMicrotask(() => setActive(false));
      return;
    }
    
    // Play only once per session to avoid running on client-side route changes
    try {
      const hasPlayed = sessionStorage.getItem("drivescope_intro_played");
      if (hasPlayed === "true") {
        setActive(false);
        return;
      }
      sessionStorage.setItem("drivescope_intro_played", "true");
    } catch (e) {
      console.warn("sessionStorage not accessible:", e);
    }

    if (reduceMotion) return;
    queueMicrotask(() => setActive(true));

    try {
      const isSessionActive = sessionStorage.getItem("drivescope_session_active");
      const stored = localStorage.getItem("drivescope_visit_count");
      let current = stored ? parseInt(stored, 10) : 0;

      if (!isSessionActive) {
        current += 1;
        localStorage.setItem("drivescope_visit_count", current.toString());
        sessionStorage.setItem("drivescope_session_active", "true");
      }
      queueMicrotask(() => setVisitCount(current));
    } catch (e) {
      console.warn("storage not available:", e);
    }
  }, [isSeoLanding, reduceMotion]);

  useEffect(() => {
    if (!active) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const toFill = setTimeout(() => setPhase("fill"), 2500);
    const toReveal = setTimeout(() => setPhase("reveal"), 5400);
    const done = setTimeout(() => setActive(false), 6600);
    return () => {
      clearTimeout(toFill);
      clearTimeout(toReveal);
      clearTimeout(done);
    };
  }, [active]);

  function skip() {
    setPhase("reveal");
    setTimeout(() => setActive(false), 350);
  }

  if (isSeoLanding || !active) return null;

  const filled = phase === "fill" || phase === "reveal";

  // Draw a stroke on, then flood its fill once `filled`.
  // Fill MUST go through `animate` (not style) — framer-motion ignores style.fill
  // on elements that animate pathLength.
  const part = (color: string, delay: number, dur = 1.3) => ({
    initial: { pathLength: 0 },
    animate: { pathLength: 1, fill: filled ? color : CLEAR },
    transition: {
      pathLength: { duration: dur, ease: "easeInOut" as const, delay },
      fill: { duration: 0.6 },
    },
  });

  return (
    <AnimatePresence>
      <motion.div
        key="intro"
        className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden"
        initial={{ opacity: 1 }}
        animate={phase === "reveal" ? { opacity: 0, scale: 1.1 } : { opacity: 1, scale: 1 }}
        transition={{ duration: phase === "reveal" ? 1.2 : 0.6, ease: "easeInOut" }}
        style={{ pointerEvents: phase === "reveal" ? "none" : "auto" }}
        aria-hidden="true"
      >
        {/* Background */}
        <div className="absolute inset-0" style={{ background: BONE }} />
        <motion.div
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: filled ? 1 : 0 }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          style={{
            background:
              "radial-gradient(120% 120% at 50% 45%, #FBEFE6 0%, #F5F1E8 55%, #EFE7D6 100%)",
          }}
        />
        {/* Blueprint grid */}
        <motion.div
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: filled ? 0.1 : 0.4 }}
          transition={{ duration: 0.5 }}
          style={{
            backgroundImage: `linear-gradient(${INK}1a 1px, transparent 1px), linear-gradient(90deg, ${INK}1a 1px, transparent 1px)`,
            backgroundSize: "46px 46px",
          }}
        />

        {/* Skip */}
        <button
          onClick={skip}
          className="absolute top-5 right-5 z-10 font-mono text-[10px] tracking-[0.2em] uppercase text-[#161616]/55 hover:text-[#C84C31] transition-colors px-4 py-3 min-h-[48px]"
        >
          Skip →
        </button>

        {/* Header tags */}
        <div className="absolute top-6 left-0 right-0 px-8 flex items-center justify-between font-mono text-[9px] sm:text-[11px] tracking-[0.28em] uppercase pointer-events-none">
          <motion.span animate={{ color: filled ? SCARLET : `${INK}99` }} transition={{ duration: 0.5 }}>
            {filled ? "DriveScope Racing" : "Formula Chassis // Blueprint-F1"}
          </motion.span>
          <motion.span animate={{ color: filled ? SCARLET : `${INK}66` }} transition={{ duration: 0.5 }}>
            {filled ? "Scuderia-inspired" : "Scale 1:18"}
          </motion.span>
        </div>

        {/* F1 START LIGHTS — illuminate left-to-right, then "lights out" on launch */}
        <div className="absolute top-[14%] left-1/2 -translate-x-1/2 flex gap-2.5 sm:gap-4">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex flex-col gap-1.5 rounded-md bg-[#161616]/90 p-1.5 shadow-sm">
              {[0, 1].map((j) => (
                <motion.span
                  key={j}
                  className="block w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full"
                  initial={{ backgroundColor: "#3a0d0d", boxShadow: "0 0 0px rgba(255,40,40,0)" }}
                  animate={
                    filled
                      ? { backgroundColor: "#2a0808", boxShadow: "0 0 0px rgba(255,40,40,0)" }
                      : { backgroundColor: "#ff2a2a", boxShadow: "0 0 12px rgba(255,40,40,0.9)" }
                  }
                  transition={{ duration: 0.15, delay: filled ? 0 : 0.5 + i * 0.32 }}
                />
              ))}
            </div>
          ))}
        </div>

        {/* THE CAR — full-bleed side profile (nose left) */}
        <div className="relative w-full">
          <motion.svg
            viewBox="0 0 1600 560"
            fill="none"
            className="w-full"
            style={{ overflow: "visible" }}
            animate={filled ? { scale: [1, 1.03, 1] } : { scale: 1 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            {/* ground line */}
            <motion.line
              x1={40} y1={462} x2={1560} y2={462}
              stroke={INK} strokeWidth={1.5}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.9 }}
              transition={{ pathLength: { duration: 0.8, delay: 0.1, ease: "easeInOut" }, opacity: { duration: 0.2, delay: 0.1 } }}
            />

            {/* continuous speed streaks — keep racing while held */}
            {filled && (
              <g>
                {[130, 185, 240, 300, 360, 415, 215, 330, 270, 390].map((y, i) => (
                  <motion.rect
                    key={i}
                    y={y} height={i % 2 ? 3 : 2} width={130 + (i % 4) * 70} rx={2}
                    fill={i % 3 === 0 ? SCARLET : INK}
                    style={{ opacity: 0.26 }}
                    initial={{ x: 1750 }}
                    animate={{ x: -420 }}
                    transition={{ duration: 0.5 + (i % 3) * 0.18, repeat: Infinity, ease: "linear", delay: 0.05 * i }}
                  />
                ))}
              </g>
            )}

            {/* road rushing by underneath */}
            {filled && (
              <g>
                {Array.from({ length: 16 }).map((_, i) => (
                  <motion.rect
                    key={i}
                    y={456} width={64} height={3} rx={1.5} fill={INK}
                    style={{ opacity: 0.16 }}
                    initial={{ x: i * 120 }}
                    animate={{ x: i * 120 - 120 }}
                    transition={{ duration: 0.22, repeat: Infinity, ease: "linear" }}
                  />
                ))}
              </g>
            )}

            {/* floor / plank */}
            <motion.path
              d="M 360 418 L 1230 418 L 1250 432 L 350 432 Z"
              stroke={INK} strokeWidth={1.5}
              {...part(DARK, 0.3, 1)}
            />

            {/* main body: nose + monocoque + engine cover */}
            <motion.path
              d="M 110 402
                 C 165 394, 235 388, 305 378
                 C 375 366, 420 350, 455 320
                 L 575 310
                 L 1000 300
                 C 1030 298, 1052 292, 1072 262
                 C 1088 240, 1098 236, 1106 244
                 C 1114 254, 1122 286, 1140 312
                 C 1190 322, 1250 332, 1300 352
                 L 1300 412
                 L 320 412
                 C 245 412, 175 408, 128 406
                 C 112 405, 106 404, 110 402 Z"
              stroke={INK} strokeWidth={2}
              {...part(SCARLET, 0.4, 1.5)}
            />

            {/* sidepod */}
            <motion.path
              d="M 575 330
                 C 545 330, 528 345, 528 372
                 C 528 400, 545 414, 580 414
                 L 1010 414
                 C 1035 414, 1052 398, 1052 372
                 C 1052 348, 1035 330, 1005 330 Z"
              stroke={INK} strokeWidth={1.8}
              {...part(SCARLET_DEEP, 0.9, 1.2)}
            />
            {/* sidepod intake mouth */}
            <motion.path
              d="M 540 350 C 515 352, 512 392, 538 396"
              stroke={INK} strokeWidth={1.4}
              {...part(DARK, 1.3, 0.6)}
            />
            {/* cooling gills */}
            <motion.g
              stroke={filled ? YELLOW : INK} strokeWidth={1.2}
              initial={{ opacity: 0 }} animate={{ opacity: filled ? 0.95 : 0.5 }}
              transition={{ duration: 0.5, delay: 1.5 }}
            >
              <line x1={930} y1={348} x2={995} y2={348} />
              <line x1={945} y1={362} x2={1000} y2={362} />
              <line x1={955} y1={376} x2={1002} y2={376} />
            </motion.g>

            {/* race number roundel on the sidepod */}
            <motion.g
              initial={{ opacity: 0 }}
              animate={{ opacity: filled ? 1 : 0 }}
              transition={{ duration: 0.4, delay: filled ? 0.55 : 0 }}
            >
              <circle cx={800} cy={372} r={23} fill={BONE} stroke={SCARLET} strokeWidth={3} />
              <text
                x={800}
                y={visitCount.toString().length <= 2 ? 381 : visitCount.toString().length === 3 ? 379 : 377}
                textAnchor="middle"
                fill={DARK}
                className="font-sans"
                style={{
                  fontSize: visitCount.toString().length <= 2 ? 24 : visitCount.toString().length === 3 ? 18 : 13,
                  fontWeight: 800
                }}
              >
                {visitCount}
              </text>
            </motion.g>

            {/* airbox intake above driver */}
            <motion.path
              d="M 1006 268 C 1016 250, 1030 248, 1040 256 C 1034 264, 1026 272, 1020 282 Z"
              stroke={INK} strokeWidth={1.4}
              {...part(DARK, 1.2, 0.6)}
            />

            {/* shark-fin engine cover */}
            <motion.path
              d="M 1095 252 C 1170 248, 1250 262, 1300 300 L 1300 330 C 1230 316, 1150 306, 1100 302 Z"
              stroke={INK} strokeWidth={1.6}
              {...part(SCARLET, 1.0, 0.9)}
            />

            {/* cockpit notch */}
            <motion.path
              d="M 880 300 C 885 286, 905 282, 945 282 C 985 282, 1000 286, 1004 300"
              stroke={INK} strokeWidth={1.5}
              {...part(DARK, 1.1, 0.6)}
            />

            {/* halo */}
            <motion.path
              d="M 862 308 C 858 282, 868 268, 895 266 C 945 262, 992 266, 1018 280"
              stroke={filled ? DARK : INK} strokeWidth={filled ? 7 : 2} strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ pathLength: { duration: 0.7, delay: 1.25, ease: "easeInOut" }, opacity: { duration: 0.2, delay: 1.25 } }}
            />
            <motion.line
              x1={862} y1={308} x2={868} y2={282}
              stroke={filled ? DARK : INK} strokeWidth={filled ? 5 : 2} strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ pathLength: { duration: 0.4, delay: 1.35, ease: "easeInOut" }, opacity: { duration: 0.2, delay: 1.35 } }}
            />

            {/* driver helmet */}
            <motion.g initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 1.5 }}>
              <motion.path
                d="M 916 290 C 916 276, 928 268, 944 268 C 960 268, 970 276, 970 290 L 970 296 L 916 296 Z"
                stroke={INK} strokeWidth={1.3}
                animate={{ fill: filled ? YELLOW : CLEAR }} transition={{ fill: { duration: 0.6 } }}
              />
              <motion.path
                d="M 922 282 L 966 282 L 964 290 L 922 290 Z"
                stroke={INK} strokeWidth={1}
                animate={{ fill: filled ? DARK : CLEAR }} transition={{ fill: { duration: 0.6 } }}
              />
              {filled && <line x1={943} y1={268} x2={943} y2={296} stroke={SCARLET} strokeWidth={2} />}
            </motion.g>

            {/* front wing (left, low) */}
            <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, delay: 1.0 }}>
              <motion.path d="M 70 412 L 320 412 L 320 426 L 80 432 Z" stroke={INK} strokeWidth={1.5} {...part(SCARLET, 1.0, 0.7)} />
              <motion.path d="M 80 432 L 300 426 L 300 440 L 90 446 Z" stroke={INK} strokeWidth={1.3} {...part(YELLOW, 1.15, 0.6)} />
              <motion.rect x={66} y={400} width={8} height={52} rx={2} stroke={INK} strokeWidth={1.4} {...part(DARK, 1.0, 0.5)} />
              <motion.path d="M 110 402 C 95 404, 92 412, 100 414 L 150 412 Z" stroke={INK} strokeWidth={1.4} {...part(YELLOW, 0.5, 0.5)} />
            </motion.g>

            {/* rear wing (right, tall) */}
            <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, delay: 1.1 }}>
              <motion.rect x={1300} y={236} width={250} height={30} rx={3} stroke={INK} strokeWidth={1.8} {...part(SCARLET, 1.1, 0.7)} />
              <motion.rect x={1315} y={214} width={228} height={16} rx={2} stroke={INK} strokeWidth={1.4} {...part(YELLOW, 1.25, 0.6)} />
              <motion.rect x={1538} y={208} width={10} height={132} rx={2} stroke={INK} strokeWidth={1.5} {...part(DARK, 1.1, 0.6)} />
              <motion.path
                d="M 1296 352 C 1340 338, 1380 300, 1404 266"
                stroke={filled ? DARK : INK} strokeWidth={filled ? 6 : 2} strokeLinecap="round"
                initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                transition={{ pathLength: { duration: 0.6, delay: 1.15, ease: "easeInOut" } }}
              />
              <motion.rect x={1330} y={326} width={180} height={12} rx={2} stroke={INK} strokeWidth={1.2} {...part(SCARLET_DEEP, 1.3, 0.5)} />
            </motion.g>

            {/* wheels */}
            {[
              { cx: 430, r: 72, delay: 1.4 },
              { cx: 1170, r: 82, delay: 1.55 },
            ].map((w) => (
              <motion.g key={w.cx} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, delay: w.delay }}>
                <motion.circle cx={w.cx} cy={462 - w.r} r={w.r} stroke={INK} strokeWidth={2.4} {...part(DARK, w.delay, 0.8)} />
                <motion.circle cx={w.cx} cy={462 - w.r} r={w.r * 0.42} stroke={filled ? SCARLET : INK} strokeWidth={2} {...part("#2a2a2a", w.delay + 0.15, 0.6)} />
                {/* spinning spokes — keep the wheels turning */}
                {filled && (
                  <g transform={`translate(${w.cx} ${462 - w.r})`}>
                    <motion.g animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.32, ease: "linear" }}>
                      {[0, 120, 240].map((a) => (
                        <line
                          key={a}
                          x1={0} y1={0}
                          x2={w.r * 0.4 * Math.cos((a * Math.PI) / 180)}
                          y2={w.r * 0.4 * Math.sin((a * Math.PI) / 180)}
                          stroke={SCARLET} strokeWidth={2.2} strokeLinecap="round"
                        />
                      ))}
                    </motion.g>
                  </g>
                )}
                <circle cx={w.cx} cy={462 - w.r} r={4} fill={filled ? SCARLET : INK} />
              </motion.g>
            ))}

            {/* dimension line (blueprint only) */}
            <motion.g
              stroke={VERMILLION} strokeWidth={0.9}
              initial={{ opacity: 0 }} animate={{ opacity: filled ? 0 : 0.7 }}
              transition={{ duration: 0.5, delay: filled ? 0 : 1.8 }}
            >
              <line x1={110} y1={500} x2={1300} y2={500} />
              <polygon points="110,500 122,497 122,503" fill={VERMILLION} />
              <polygon points="1300,500 1288,497 1288,503" fill={VERMILLION} />
              <text x={705} y={494} textAnchor="middle" fill={VERMILLION} className="font-mono" style={{ fontSize: 12, letterSpacing: "0.18em", fontWeight: 600 }}>
                OVERALL LENGTH · 5600 MM
              </text>
            </motion.g>
          </motion.svg>
        </div>

        {/* Footer line */}
        <div className="absolute bottom-8 left-0 right-0 text-center font-mono text-[10px] sm:text-xs tracking-[0.22em] uppercase pointer-events-none">
          <motion.span animate={{ color: filled ? SCARLET : `${INK}55`, opacity: filled ? 1 : 0.55 }} transition={{ duration: 0.5 }}>
            {filled ? "Lights out · and away we go" : "Loading chassis geometry…"}
          </motion.span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
