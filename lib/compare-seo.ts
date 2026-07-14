/**
 * SEO compare helpers — crawlable /compare/{a}-vs-{b} pages.
 * Slugs and H2H copy are deterministic from catalog + scores (no AI).
 */
import pairsJson from "@/data/compare-pairs.json";
import { computeCost } from "@/lib/cost";
import { costParams, formatLakh, getBrand, getModel, getVariantsForModel, models } from "@/lib/data";
import { estimate5yrCost, radarScores, type RadarScores } from "@/lib/scores";
import type { Model, Variant } from "@/lib/types";

export type ComparePair = [string, string];

const RAW_PAIRS = pairsJson as ComparePair[];

const AXIS_LABELS = {
  performance: "Performance",
  efficiency: "Efficiency",
  safety: "Safety",
  features: "Features",
  space: "Space",
  ownership: "Ownership cost",
} as const;

export type AxisKey = keyof typeof AXIS_LABELS;

/** Short slug piece from modelId (brezza, creta, grand-vitara). */
export function shortSlug(modelId: string): string {
  const m = getModel(modelId);
  if (!m) return modelId;
  const brand = getBrand(m.brandId);
  const brandSlug = brand?.id ?? m.brandId;
  const rest = modelId.startsWith(`${brandSlug}-`)
    ? modelId.slice(brandSlug.length + 1)
    : modelId;
  return rest || modelId;
}

function shortNameCounts(): Map<string, number> {
  const counts = new Map<string, number>();
  for (const m of models) {
    const s = shortSlug(m.id);
    counts.set(s, (counts.get(s) ?? 0) + 1);
  }
  return counts;
}

let _shortCounts: Map<string, number> | null = null;
function getShortCounts() {
  if (!_shortCounts) _shortCounts = shortNameCounts();
  return _shortCounts;
}

/** Prefer short name; if collision across catalog, use full modelId. */
export function compareToken(modelId: string): string {
  const short = shortSlug(modelId);
  const count = getShortCounts().get(short) ?? 0;
  return count > 1 ? modelId : short;
}

/** Canonical order: alphabetical modelId (stable redirects). */
export function canonicalPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

export function pairSlug(a: string, b: string): string {
  const [x, y] = canonicalPair(a, b);
  return `${compareToken(x)}-vs-${compareToken(y)}`;
}

export function pairHref(a: string, b: string): string {
  return `/compare/${pairSlug(a, b)}`;
}

/** Unique canonical seed pairs (deduped reverse duplicates). */
export function getSeedPairs(): ComparePair[] {
  const seen = new Set<string>();
  const out: ComparePair[] = [];
  for (const [a, b] of RAW_PAIRS) {
    if (!getModel(a) || !getModel(b) || a === b) continue;
    const [x, y] = canonicalPair(a, b);
    const key = `${x}|${y}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push([x, y]);
  }
  return out;
}

export function getSeedSlugs(): string[] {
  return getSeedPairs().map(([a, b]) => pairSlug(a, b));
}

/** Map short token / modelId → modelId using catalog + seed pairs. */
function buildTokenIndex(): Map<string, string> {
  const map = new Map<string, string>();
  for (const m of models) {
    map.set(m.id, m.id);
    const token = compareToken(m.id);
    if (!map.has(token)) map.set(token, m.id);
  }
  return map;
}

let _tokenIndex: Map<string, string> | null = null;
function tokenIndex() {
  if (!_tokenIndex) _tokenIndex = buildTokenIndex();
  return _tokenIndex;
}

export function parseCompareSlug(slug: string): {
  modelIds: [string, string] | null;
  canonicalSlug: string | null;
  needsRedirect: boolean;
} {
  const parts = slug.toLowerCase().split("-vs-");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return { modelIds: null, canonicalSlug: null, needsRedirect: false };
  }
  const idx = tokenIndex();
  const a = idx.get(parts[0]);
  const b = idx.get(parts[1]);
  if (!a || !b || a === b) {
    return { modelIds: null, canonicalSlug: null, needsRedirect: false };
  }
  const [x, y] = canonicalPair(a, b);
  const canonicalSlug = pairSlug(x, y);
  return {
    modelIds: [x, y],
    canonicalSlug,
    needsRedirect: canonicalSlug !== slug,
  };
}

export function rivalsForModel(modelId: string): { otherId: string; href: string; label: string }[] {
  const results: { otherId: string; href: string; label: string }[] = [];
  for (const [a, b] of getSeedPairs()) {
    if (a !== modelId && b !== modelId) continue;
    const otherId = a === modelId ? b : a;
    const other = getModel(otherId);
    const brand = other ? getBrand(other.brandId) : null;
    if (!other) continue;
    results.push({
      otherId,
      href: pairHref(modelId, otherId),
      label: `${brand?.name ?? ""} ${other.name}`.trim(),
    });
  }
  return results;
}

function midVariant(m: Model) {
  const vs = [...getVariantsForModel(m.id)].sort((a, b) => a.priceExShowroom - b.priceExShowroom);
  return vs[Math.floor(vs.length / 2)] ?? vs[0];
}

export interface HeadToHeadData {
  a: Model;
  b: Model;
  brandA: string;
  brandB: string;
  slug: string;
  title: string;
  description: string;
  quickAnswer: string;
  verdict: string;
  chooseA: string;
  chooseB: string;
  axes: { key: AxisKey; label: string; scoreA: number; scoreB: number; winner: "a" | "b" | "tie" }[];
  costA: number;
  costB: number;
  costWinner: "a" | "b" | "tie";
  costDelta: number;
  priceA: string;
  priceB: string;
  feA: number;
  feB: number;
  powerA: number;
  powerB: number;
  midVariantIdA: string;
  midVariantIdB: string;
  recommendedA: VariantPick;
  recommendedB: VariantPick;
  cityCosts: {
    city: string;
    costA: number;
    costB: number;
    winner: "a" | "b" | "tie";
    delta: number;
  }[];
  related: { href: string; label: string }[];
  updatedLabel: string;
  faqs: { question: string; answer: string }[];
}

export interface VariantPick {
  id: string;
  name: string;
  fuel: string;
  transmission: string;
  price: string;
  reason: string;
}

export function buildHeadToHead(modelIdA: string, modelIdB: string): HeadToHeadData | null {
  const [idA, idB] = canonicalPair(modelIdA, modelIdB);
  const a = getModel(idA);
  const b = getModel(idB);
  if (!a || !b) return null;

  const brandA = getBrand(a.brandId)?.name ?? a.brandId;
  const brandB = getBrand(b.brandId)?.name ?? b.brandId;
  const scores = radarScores([idA, idB]);
  const sa = scores[idA];
  const sb = scores[idB];
  if (!sa || !sb) return null;

  const midA = midVariant(a);
  const midB = midVariant(b);
  const costA = estimate5yrCost(a, midA);
  const costB = estimate5yrCost(b, midB);
  const costDelta = Math.abs(costA - costB);
  const costWinner: "a" | "b" | "tie" =
    Math.abs(costA - costB) < 5000 ? "tie" : costA < costB ? "a" : "b";

  const axes = (Object.keys(AXIS_LABELS) as AxisKey[]).map((key) => {
    const scoreA = Math.round(sa[key] * 10) / 10;
    const scoreB = Math.round(sb[key] * 10) / 10;
    const winner: "a" | "b" | "tie" =
      Math.abs(scoreA - scoreB) < 0.15 ? "tie" : scoreA > scoreB ? "a" : "b";
    return { key, label: AXIS_LABELS[key], scoreA, scoreB, winner };
  });

  const winsA = axes.filter((x) => x.winner === "a").length;
  const winsB = axes.filter((x) => x.winner === "b").length;
  const leadName = winsA === winsB ? null : winsA > winsB ? `${brandA} ${a.name}` : `${brandB} ${b.name}`;
  const costName =
    costWinner === "tie"
      ? "Neither (near-parity)"
      : costWinner === "a"
        ? `${brandA} ${a.name}`
        : `${brandB} ${b.name}`;

  const verdict = leadName
    ? `${leadName} leads on more scored axes (${Math.max(winsA, winsB)}–${Math.min(winsA, winsB)}). On estimated 5-year ownership (Delhi, 12,000 km/yr), ${costName} is cheaper by about ${formatLakh(costDelta)}.`
    : `Scores are closely matched across axes. On estimated 5-year ownership (Delhi, 12,000 km/yr), ${costName}${costWinner === "tie" ? " — costs are nearly identical" : ` is cheaper by about ${formatLakh(costDelta)}`}.`;

  const chooseA = buildChooseLine(a, brandA, sa, sb, costWinner === "a", a.prosCons.pros[0]);
  const chooseB = buildChooseLine(b, brandB, sb, sa, costWinner === "b", b.prosCons.pros[0]);

  const priceA = `${formatLakh(a.priceRange.min)}–${formatLakh(a.priceRange.max)}`;
  const priceB = `${formatLakh(b.priceRange.min)}–${formatLakh(b.priceRange.max)}`;
  const feA = Math.max(...getVariantsForModel(a.id).map((v) => v.realWorldFE));
  const feB = Math.max(...getVariantsForModel(b.id).map((v) => v.realWorldFE));
  const powerA = Math.max(...getVariantsForModel(a.id).map((v) => v.engine.ps));
  const powerB = Math.max(...getVariantsForModel(b.id).map((v) => v.engine.ps));

  const slug = pairSlug(idA, idB);
  const title = `${brandA} ${a.name} vs ${brandB} ${b.name} (2026) — Which Is Better?`;
  const quickAnswer = buildQuickAnswer({
    a,
    b,
    brandA,
    brandB,
    axes,
    costWinner,
    costDelta,
    costName,
    winsA,
    winsB,
  });
  const description = `Compare ${brandA} ${a.name} (${priceA}) vs ${brandB} ${b.name} (${priceB}) on price, mileage, features, safety, space and 5-year ownership cost. ${quickAnswer}`;
  const cityCosts = buildCityCosts(a, b, midA, midB);
  const recommendedA = buildVariantPick(a, brandA, midA, costWinner === "a");
  const recommendedB = buildVariantPick(b, brandB, midB, costWinner === "b");
  const related = relatedComparisons(idA, idB);

  const faqs = [
    {
      question: `Which is cheaper to own — ${a.name} or ${b.name}?`,
      answer:
        costWinner === "tie"
          ? `Estimated 5-year ownership costs are nearly the same (~${formatLakh(costA)} vs ~${formatLakh(costB)} in Delhi at 12,000 km/yr). City fuel prices change the fuel layer.`
          : `${costName} is cheaper to own by about ${formatLakh(costDelta)} over 5 years in our Delhi / 12,000 km model (fuel, insurance, maintenance, tyres, depreciation).`,
    },
    {
      question: `${a.name} vs ${b.name} — who has better mileage?`,
      answer: `Best real-world FE in our catalog: ${a.name} ~${feA.toFixed(1)} km/l equivalent vs ${b.name} ~${feB.toFixed(1)}. Actual figures vary by fuel (petrol/diesel/CNG/EV) and city traffic.`,
    },
    {
      question: `What is the price difference between ${a.name} and ${b.name}?`,
      answer: `${brandA} ${a.name} starts around ${formatLakh(a.priceRange.min)} (ex-showroom); ${brandB} ${b.name} from ${formatLakh(b.priceRange.min)}. Top trims reach ${formatLakh(a.priceRange.max)} and ${formatLakh(b.priceRange.max)} respectively.`,
    },
    {
      question: `Who wins performance — ${a.name} or ${b.name}?`,
      answer: `Peak power: ${a.name} ${powerA} PS vs ${b.name} ${powerB} PS. Our performance axis (power-to-weight + 0–100) scores ${sa.performance.toFixed(1)} vs ${sb.performance.toFixed(1)}.`,
    },
    {
      question: `Should I buy the ${a.name} or the ${b.name}?`,
      answer: `${chooseA} ${chooseB}`,
    },
  ];

  return {
    a,
    b,
    brandA,
    brandB,
    slug,
    title,
    description,
    verdict,
    chooseA,
    chooseB,
    axes,
    costA,
    costB,
    costWinner,
    costDelta,
    priceA,
    priceB,
    feA,
    feB,
    powerA,
    powerB,
    midVariantIdA: midA.id,
    midVariantIdB: midB.id,
    recommendedA,
    recommendedB,
    quickAnswer,
    cityCosts,
    related,
    updatedLabel: "Updated July 2026",
    faqs,
  };
}

function buildQuickAnswer({
  a,
  b,
  brandA,
  brandB,
  axes,
  costWinner,
  costDelta,
  costName,
  winsA,
  winsB,
}: {
  a: Model;
  b: Model;
  brandA: string;
  brandB: string;
  axes: HeadToHeadData["axes"];
  costWinner: "a" | "b" | "tie";
  costDelta: number;
  costName: string;
  winsA: number;
  winsB: number;
}) {
  const scoreLeader =
    winsA === winsB ? null : winsA > winsB ? `${brandA} ${a.name}` : `${brandB} ${b.name}`;
  const scoreLine = scoreLeader
    ? `${scoreLeader} is the stronger all-round pick on DriveScope's scored axes (${Math.max(winsA, winsB)}-${Math.min(winsA, winsB)}).`
    : `${brandA} ${a.name} and ${brandB} ${b.name} are closely matched overall.`;
  const costLine =
    costWinner === "tie"
      ? "Estimated 5-year ownership cost is nearly identical, so variant choice matters more."
      : `${costName} has the ownership-cost edge by about ${formatLakh(costDelta)} over 5 years.`;
  const biggestEdge = [...axes]
    .filter((axis) => axis.winner !== "tie")
    .sort((x, y) => Math.abs(y.scoreA - y.scoreB) - Math.abs(x.scoreA - x.scoreB))[0];
  const edgeLine = biggestEdge
    ? `The clearest difference is ${biggestEdge.label.toLowerCase()}, where ${
        biggestEdge.winner === "a" ? a.name : b.name
      } leads.`
    : "No single scoring axis creates a decisive split.";

  return `${scoreLine} ${costLine} ${edgeLine}`;
}

function buildCityCosts(a: Model, b: Model, midA: Variant, midB: Variant) {
  return costParams.cities.slice(0, 3).map((city) => {
    const costA = computeCost(midA.id, city, 12000, 5)?.total ?? estimate5yrCost(a, midA);
    const costB = computeCost(midB.id, city, 12000, 5)?.total ?? estimate5yrCost(b, midB);
    const delta = Math.abs(costA - costB);
    const winner: "a" | "b" | "tie" = delta < 5000 ? "tie" : costA < costB ? "a" : "b";
    return { city: city.name, costA, costB, winner, delta };
  });
}

function buildVariantPick(model: Model, brand: string, variant: Variant, cheaper: boolean): VariantPick {
  const fuelText = variant.fuel.toUpperCase();
  const reason = cheaper
    ? "Balanced mid-trim pick used for the ownership-cost edge on this page."
    : "Balanced mid-trim benchmark; upgrade only if the top features matter to you.";

  return {
    id: variant.id,
    name: `${brand} ${model.name} ${variant.name}`,
    fuel: fuelText,
    transmission: variant.transmission,
    price: formatLakh(variant.priceExShowroom),
    reason,
  };
}

function relatedComparisons(modelIdA: string, modelIdB: string) {
  const seen = new Set<string>([pairSlug(modelIdA, modelIdB)]);
  const rows: { href: string; label: string }[] = [];
  for (const [a, b] of getSeedPairs()) {
    if (rows.length >= 8) break;
    if (![a, b].includes(modelIdA) && ![a, b].includes(modelIdB)) continue;
    const slug = pairSlug(a, b);
    if (seen.has(slug)) continue;
    const left = getModel(a);
    const right = getModel(b);
    if (!left || !right) continue;
    seen.add(slug);
    rows.push({
      href: pairHref(a, b),
      label: `${left.name} vs ${right.name}`,
    });
  }
  return rows;
}

function buildChooseLine(
  model: Model,
  brand: string,
  mine: RadarScores,
  theirs: RadarScores,
  cheaper: boolean,
  topPro?: string
): string {
  const edges: string[] = [];
  for (const key of Object.keys(AXIS_LABELS) as AxisKey[]) {
    if (mine[key] - theirs[key] >= 0.4) edges.push(AXIS_LABELS[key].toLowerCase());
  }
  const edgeText = edges.length ? edges.slice(0, 2).join(" and ") : "balanced overall packaging";
  const costText = cheaper ? "lower estimated 5-year ownership cost" : "trim choice and dealership convenience";
  const pro = topPro ? ` Owners also cite: ${topPro}` : "";
  return `Choose the ${brand} ${model.name} if you prioritise ${edgeText} and ${costText}.${pro}`;
}
