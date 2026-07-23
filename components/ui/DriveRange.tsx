"use client";

import React, { useEffect, useState } from "react";
import ChipPresets from "@/components/mobile/ChipPresets";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function snap(value: number, min: number, max: number, step: number) {
  const snapped = Math.round((value - min) / step) * step + min;
  return clamp(Number(snapped.toFixed(6)), min, max);
}

export default function DriveRange({
  label,
  value,
  onChange,
  min,
  max,
  step,
  mobileStep,
  format,
  presets,
  presetFormat,
  showSteppers = true,
  className = "",
  accentClass = "accent-[var(--accent)]",
  disabled = false,
}: {
  label: React.ReactNode;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  mobileStep?: number;
  format: (value: number) => string;
  presets?: number[];
  presetFormat?: (value: number) => string;
  showSteppers?: boolean;
  className?: string;
  accentClass?: string;
  disabled?: boolean;
}) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const activeStep = isMobile && mobileStep != null ? mobileStep : step;

  const nudge = (direction: -1 | 1) => {
    if (disabled) return;
    onChange(snap(value + direction * activeStep, min, max, activeStep));
  };

  return (
    <div className={`space-y-2 ${className} ${disabled ? "opacity-40 pointer-events-none" : ""}`}>
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="text-secondary font-medium">{label}</span>
        <div className="flex items-center gap-1.5 shrink-0">
          {showSteppers && (
            <button
              type="button"
              onClick={() => nudge(-1)}
              disabled={disabled || value <= min}
              aria-label="Decrease value"
              className="sm:hidden flex h-9 w-9 items-center justify-center rounded-lg border border-[#161616]/12 bg-[#F5F1E8] text-base font-semibold text-[#161616] disabled:opacity-30"
            >
              −
            </button>
          )}
          <span className="font-semibold stat-num text-primary min-w-[4.5rem] text-right">
            {format(value)}
          </span>
          {showSteppers && (
            <button
              type="button"
              onClick={() => nudge(1)}
              disabled={disabled || value >= max}
              aria-label="Increase value"
              className="sm:hidden flex h-9 w-9 items-center justify-center rounded-lg border border-[#161616]/12 bg-[#F5F1E8] text-base font-semibold text-[#161616] disabled:opacity-30"
            >
              +
            </button>
          )}
        </div>
      </div>

      {presets && presets.length > 0 && (
        <ChipPresets
          options={presets}
          value={value}
          onChange={onChange}
          format={presetFormat ?? format}
        />
      )}

      <div className="drive-range-track min-h-11 flex items-center touch-pan-x">
        <input
          type="range"
          min={min}
          max={max}
          step={activeStep}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          className={`w-full ${accentClass} disabled:opacity-30`}
        />
      </div>
    </div>
  );
}
