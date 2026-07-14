"use client";

import { useState } from "react";
import type { Feature } from "@/lib/types";
import { hasCustomScene } from "@/lib/understanding";
import UnderstandingPanel, { type UnderstandingTarget } from "./understanding/UnderstandingPanel";

const CATEGORY_ORDER = ["safety", "comfort", "tech", "convenience", "performance"] as const;

const CATEGORY_LABELS: Record<(typeof CATEGORY_ORDER)[number], string> = {
  safety: "Safety",
  comfort: "Comfort",
  tech: "Tech",
  convenience: "Convenience",
  performance: "Performance",
};

function FeatureChip({ feature, onOpen }: { feature: Feature; onOpen: () => void }) {
  const hasVisual = hasCustomScene(feature.id);
  const isHighImpact = feature.impactScore === 3;

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`group inline-flex max-w-full items-center gap-2 rounded-full border px-4 py-2.5 text-left transition-colors duration-200 min-h-[44px] ${
        isHighImpact
          ? "border-[#C84C31]/40 bg-[#C84C31]/10 text-[#161616] text-sm font-medium hover:bg-[#C84C31]/15"
          : "border-[#161616]/12 bg-[#ECE7DF] text-[#161616] text-sm hover:border-[#161616]/25 hover:bg-[#E5DFC8]"
      }`}
    >
      {hasVisual && (
        <span
          className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#C84C31]"
          aria-hidden
          title="Animated preview"
        />
      )}
      <span className="truncate">{feature.name}</span>
    </button>
  );
}

export default function FeatureGrid({ features }: { features: Feature[] }) {
  const [target, setTarget] = useState<UnderstandingTarget | null>(null);

  if (features.length === 0) {
    return (
      <p className="text-sm text-[#4b4b4b]">No feature list available for this trim yet.</p>
    );
  }

  return (
    <div className="space-y-7 sm:space-y-9">
      {CATEGORY_ORDER.map((cat) => {
        const inCat = features
          .filter((f) => f.category === cat)
          .sort((a, b) => b.impactScore - a.impactScore);
        if (inCat.length === 0) return null;
        return (
          <div key={cat}>
            <h3 className="text-xs uppercase tracking-widest text-[#4b4b4b] font-mono mb-3">
              {CATEGORY_LABELS[cat]}
            </h3>
            <div className="flex flex-wrap gap-2">
              {inCat.map((f) => (
                <FeatureChip
                  key={f.id}
                  feature={f}
                  onOpen={() => setTarget({ type: "feature", feature: f })}
                />
              ))}
            </div>
          </div>
        );
      })}
      <UnderstandingPanel target={target} onClose={() => setTarget(null)} />
    </div>
  );
}
