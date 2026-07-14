import brandsJson from "@/data/brands.json";
import modelsJson from "@/data/models.json";
import variantsJson from "@/data/variants.json";
import featuresJson from "@/data/features.json";
import testDataJson from "@/data/test-data.json";
import costParamsJson from "@/data/cost-params.json";
import ownerVoicesJson from "@/data/owner-voices.json";
import detailedReviewsJson from "@/data/detailed-reviews.json";
import type {
  Brand,
  CostParams,
  DriveCoverage,
  DriveMetricCoverage,
  DriveMeasuredMetric,
  DriveSectorId,
  Feature,
  Model,
  OwnerVoices,
  TestData,
  Variant,
  DetailedReview,
} from "./types";

export const brands = brandsJson as Brand[];
export const models = modelsJson as Model[];
export const variants = variantsJson as Variant[];
export const features = featuresJson as Feature[];
export const testData = testDataJson as TestData[];
export const costParams = costParamsJson as unknown as CostParams;
export const ownerVoices = ownerVoicesJson as OwnerVoices[];
export const detailedReviews = detailedReviewsJson as DetailedReview[];

export const getBrand = (id: string) => brands.find((b) => b.id === id);
export const getModel = (id: string) => models.find((m) => m.id === id);
export const getVariant = (id: string) => variants.find((v) => v.id === id);
export const getFeature = (id: string) => features.find((f) => f.id === id);
export const getTestData = (variantId: string) => testData.find((t) => t.variantId === variantId);
export const getVariantsForModel = (modelId: string) =>
  variants.filter((v) => v.modelId === modelId);
export const getOwnerVoices = (modelId: string) =>
  ownerVoices.find((o) => o.modelId === modelId)?.voices ?? [];
export const getDetailedReviews = (modelId: string) =>
  detailedReviews.filter((r) => r.modelId === modelId);

const SECTOR_REQUIREMENTS: Record<DriveSectorId, DriveMeasuredMetric[]> = {
  launch: ["zeroTo100"],
  control: [],
  brake: ["braking100to0"],
};

function metricCoverage(figure: TestData[keyof Pick<TestData, "zeroTo100" | "sixtyTo100" | "braking100to0">]): DriveMetricCoverage {
  return {
    available: figure.value !== null,
    measured: figure.value !== null && !figure.estimated,
    source: figure.value !== null ? figure.source : null,
  };
}

export function getDriveCoverage(variantId: string): DriveCoverage {
  const td = getTestData(variantId);

  const metrics: Record<DriveMeasuredMetric, DriveMetricCoverage> = {
    zeroTo100: td ? metricCoverage(td.zeroTo100) : { available: false, measured: false, source: null },
    sixtyTo100: td ? metricCoverage(td.sixtyTo100) : { available: false, measured: false, source: null },
    braking100to0: td ? metricCoverage(td.braking100to0) : { available: false, measured: false, source: null },
  };

  const certifiedSectors = (Object.entries(SECTOR_REQUIREMENTS) as Array<[DriveSectorId, DriveMeasuredMetric[]]>)
    .filter(([, required]) => required.every((metric) => metrics[metric].measured))
    .map(([sectorId]) => sectorId);

  const measuredCount = Object.values(metrics).filter((metric) => metric.measured).length;
  const hasAnyData = Object.values(metrics).some((metric) => metric.available);
  const certification =
    certifiedSectors.length === Object.keys(SECTOR_REQUIREMENTS).length
      ? "measured"
      : measuredCount > 0
      ? "partial"
      : "preview";

  let previewOnlyReason: string | null = null;
  if (certification === "partial") {
    previewOnlyReason =
      "Only part of this trial uses measured figures. Launch timing may be real, but braking and grading stay preview-only.";
  } else if (certification === "preview" && hasAnyData) {
    previewOnlyReason =
      "This car can be explored in preview mode, but its drive-trial figures are modeled rather than instrumented.";
  } else if (!hasAnyData) {
    previewOnlyReason = "No drive-test figures are available for this car yet.";
  }

  return {
    certification,
    mode: "drive-trial",
    metrics,
    certifiedSectors,
    previewOnlyReason,
  };
}

/** "₹11.10L" style formatting for ex-showroom prices. */
export function formatLakh(inr: number): string {
  return `₹${(inr / 100000).toFixed(2)}L`;
}

/** City picker label: "Bengaluru · P ₹103 · D ₹91" */
export function formatCityFuelLabel(city: { name: string; petrolPrice: number; dieselPrice: number }): string {
  return `${city.name} · P ₹${city.petrolPrice.toFixed(0)} · D ₹${city.dieselPrice.toFixed(0)}`;
}
