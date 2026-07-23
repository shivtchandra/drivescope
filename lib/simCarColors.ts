/**
 * Distinct sim colours per model — easy to tell apart in 3D races and legends.
 * Compact-SUV peers (Creta segment) each get a unique hue; others fall back to brand colour.
 */
export const SIM_MODEL_COLORS: Record<string, string> = {
  // ── Compact SUV (Creta rivals) ──
  "hyundai-creta": "#C84C31",         // Vermillion (Japanese Editorial Accent)
  "kia-seltos": "#1D4ED8",            // Imperial Royal Blue
  "maruti-grand-vitara": "#065F46",   // Deep Forest Teal Green
  "toyota-hyryder": "#8F99A5",        // Titanium Metallic Silver
  "honda-elevate": "#EA580C",         // Phoenix Orange
  "vw-taigun": "#EAB308",             // Curcuma Yellow Gold
  "skoda-kushaq": "#475569",          // Carbon Steel Dark Grey
  "tata-curvv": "#0891B2",            // Virtual Cyan-Teal
  "mahindra-xuv-3xo": "#BE185D",      // Crimson Pink/Red
  "mg-astor": "#DB2777",              // Deep Pink
  "mg-windsor": "#7C3AED",            // Claypot Violet/Purple
  "mg-zs-ev": "#059669",              // Emerald Green
  "toyota-taisor": "#BE185D",
  "vinfast-vf6": "#0D9488",
  "audi-q3": "#64748B",

  // ── Sub-4m / other frequent sim picks ──
  "tata-nexon": "#0E7490",
  "maruti-brezza": "#15803D",
  "hyundai-venue": "#1D4ED8",
  "kia-sonet": "#B91C1C",
  "tata-punch": "#CA8A04",
  "renault-kiger": "#FACC15",
  "nissan-magnite": "#475569",
  "hyundai-exter": "#F97316",
  "skoda-kylaq": "#4F46E5",
  "tata-safari": "#0369A1",
  "tata-altroz": "#4B5563",
  "mahindra-thar": "#B45309",
  "mahindra-scorpio-classic": "#1E293B",
  "mahindra-bolero": "#4D7C0F",
  "maruti-baleno": "#1E40AF",
  "maruti-fronx": "#991B1B",
  "maruti-ertiga": "#854D0E",
  "hyundai-i20": "#DC2626",
  "kia-carens": "#4338CA",
  "jeep-compass": "#166534",

  // ── Larger SUVs often compared ──
  "mahindra-scorpio-n": "#92400E",
  "mahindra-xuv700": "#78350F",
  "tata-harrier": "#1E3A8A",
  "mg-hector": "#831843",
  "mahindra-thar-roxx": "#374151",
  "vinfast-vf7": "#115E59",
  "audi-q5": "#334155",
  "toyota-fortuner": "#0F172A",
  "hyundai-tucson": "#0284C7",
  "byd-atto3": "#0891B2",
  "byd-seal": "#2563EB",
  "skoda-kodiaq": "#5B21B6",
};

export function getSimCarColor(modelId: string, brandFallback?: string): string {
  return SIM_MODEL_COLORS[modelId] ?? brandFallback ?? "#888888";
}

/** High-contrast colours for Car 1 / Car 2 / Car 3 in multi-car sims (same model safe). */
export const SIM_COMPARISON_COLORS = ["#C84C31", "#35D6FF", "#4ADE80"] as const;

export function getSimComparisonColor(slotIndex: number): string {
  return SIM_COMPARISON_COLORS[slotIndex % SIM_COMPARISON_COLORS.length];
}
