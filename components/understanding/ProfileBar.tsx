"use client";

import { useState } from "react";
import { costParams } from "@/lib/data";
import {
  type DrivingProfile,
  formatProfileChip,
  saveProfile,
} from "@/lib/understanding/profile";
import DriveSelect from "@/components/ui/DriveSelect";
import DriveRange from "@/components/ui/DriveRange";

export default function ProfileBar({
  profile,
  onChange,
}: {
  profile: DrivingProfile;
  onChange: (p: DrivingProfile) => void;
}) {
  const [open, setOpen] = useState(false);

  const update = (patch: Partial<DrivingProfile>) => {
    const next = { ...profile, ...patch };
    saveProfile(next);
    onChange(next);
  };

  return (
    <div className="border border-white/[0.08] rounded-xl p-3 bg-white/[0.02]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-secondary">
          Personalizing for:{" "}
          <span className="text-primary font-medium">{formatProfileChip(profile)}</span>
        </p>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="text-xs text-[var(--accent)] hover:underline min-h-[48px] min-w-[48px] px-2 -mr-2"
        >
          {open ? "Done" : "Adjust my driving"}
        </button>
      </div>
      {open && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 text-sm">
          <label className="block">
            <span className="text-xs text-secondary mb-1 block">City</span>
            <DriveSelect
              value={profile.cityId}
              onChange={(val) => update({ cityId: val })}
              ariaLabel="City"
              options={costParams.cities.map((c) => ({ value: c.id, label: c.name }))}
              className="w-full"
            />
          </label>
          <DriveRange
            label="Annual km"
            value={profile.annualKm}
            onChange={(annualKm) => update({ annualKm })}
            min={5000}
            max={30000}
            step={1000}
            format={(v) => v.toLocaleString("en-IN")}
            presets={[8000, 12000, 18000]}
            presetFormat={(v) => `${v / 1000}k`}
          />
          <DriveRange
            label="Highway share"
            value={Math.round(profile.highwayPct * 100)}
            onChange={(pct) => update({ highwayPct: pct / 100 })}
            min={0}
            max={80}
            step={5}
            format={(v) => `${v}%`}
            presets={[20, 40, 60]}
            presetFormat={(v) => `${v}%`}
          />
          <label className="flex items-center gap-3 min-h-[48px] cursor-pointer">
            <input
              type="checkbox"
              checked={profile.newDriver}
              onChange={(e) => update({ newDriver: e.target.checked })}
              className="w-5 h-5 accent-[var(--accent)]"
            />
            <span className="text-sm">New or returning driver</span>
          </label>
        </div>
      )}
    </div>
  );
}
