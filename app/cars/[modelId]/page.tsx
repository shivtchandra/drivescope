import { notFound } from "next/navigation";
import Link from "next/link";
import {
  formatLakh,
  getBrand,
  getModel,
  getVariantsForModel,
  models,
  features as allFeatures,
} from "@/lib/data";
import { onRoadEstimate } from "@/lib/cost";
import { getVehicleDNA } from "@/lib/vehicle-dna";
import CarPhoto from "@/components/CarPhoto";
import FuelDecisionCard from "@/components/FuelDecisionCard";
import VariantIntelligence from "@/components/VariantIntelligence";
import SimulationLab from "@/components/SimulationLab";
import FeatureGrid from "@/components/FeatureGrid";
import SpecUnderstandingGrid from "@/components/understanding/SpecUnderstandingGrid";
import UnderstandingLayersGuide from "@/components/understanding/UnderstandingLayersGuide";
import EstimatedBadge from "@/components/EstimatedBadge";
import OwnerVoicesPanel from "@/components/OwnerVoicesPanel";
import CarDetailPageLayout from "@/components/CarDetailPageLayout";
import CompareRivals from "@/components/CompareRivals";

export function generateStaticParams() {
  return models.map((m) => ({ modelId: m.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ modelId: string }> }) {
  const { modelId } = await params;
  const m = getModel(modelId);
  if (!m) return { title: "DriveScope" };
  const brand = getBrand(m.brandId);
  
  const title = `${brand?.name} ${m.name} Price, Specs, Mileage & 5-Year Cost (India)`;
  const description = `${m.aiSummary} See real-world mileage, ownership costs, and head-to-head comparisons for the ${brand?.name} ${m.name}.`;

  return { 
    title,
    description,
    keywords: [m.name, brand?.name, "car price", "car specs", "mileage", "ownership cost", m.segment],
    openGraph: {
      title,
      description,
      images: [m.heroImage],
    }
  };
}

export default async function CarPage({ params }: { params: Promise<{ modelId: string }> }) {
  const { modelId } = await params;
  const model = getModel(modelId);
  if (!model) notFound();
  const brand = getBrand(model.brandId)!;
  const vehicleDna = getVehicleDNA(model);
  const variants = getVariantsForModel(model.id);
  const sorted = [...variants].sort((a, b) => a.priceExShowroom - b.priceExShowroom);
  const top = sorted[sorted.length - 1];
  const topPs = Math.max(...variants.map((v) => v.engine.ps));
  const bestRealFE = Math.max(...variants.map((v) => v.realWorldFE));
  const featuresHere = allFeatures.filter((f) => top.featureIds.includes(f.id));
  const simDefaults = [top.id, sorted[Math.floor(sorted.length / 2)]?.id].filter(Boolean) as string[];

  const dieselCount = variants.filter((v) => v.fuel === "diesel").length;
  const stats = [
    { label: "Ex-showroom", value: `${formatLakh(model.priceRange.min)}–${formatLakh(model.priceRange.max)}` },
    {
      label: "On-road (est.)",
      value: `~${formatLakh(onRoadEstimate(model.priceRange.min, "petrol"))}–${formatLakh(onRoadEstimate(top.priceExShowroom, top.fuel))}`,
      estimated: true,
    },
    { label: "Power (top)", value: `${topPs} PS` },
    { label: "Real-world FE", value: `~${bestRealFE.toFixed(1)} km/l`, estimated: true },
    {
      label: "Variants",
      value: dieselCount > 0 ? `${variants.length - dieselCount} petrol + ${dieselCount} diesel` : `${variants.length} petrol`,
    },
  ];

  return (
    <CarDetailPageLayout
      overviewSection={
        <section className="mx-auto max-w-6xl px-6 py-12">
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "Product",
                "name": `${brand.name} ${model.name}`,
                "image": `https://drivescope.com${model.heroImage}`,
                "description": model.aiSummary,
                "brand": {
                  "@type": "Brand",
                  "name": brand.name
                },
                "offers": {
                  "@type": "AggregateOffer",
                  "priceCurrency": "INR",
                  "lowPrice": model.priceRange.min,
                  "highPrice": model.priceRange.max,
                  "offerCount": variants.length
                }
              })
            }}
          />
          <div className="grid gap-10 lg:grid-cols-2 items-center">
            <div>
              <p className="text-sm text-secondary">{brand.name}</p>
              <h1 className="text-5xl sm:text-6xl font-semibold tracking-tight mt-1">{model.name}</h1>
              <p className="mt-5 text-secondary leading-relaxed max-w-lg">{model.aiSummary}</p>
              <div className="mt-5 flex items-center gap-3">
                {model.ncap.agency ? (
                  <span className="glass px-4 py-2 text-sm">
                    {model.ncap.agency}{" "}
                    {model.ncap.adultStars !== null ? (
                      <>
                        <span className="text-warning">{"★".repeat(model.ncap.adultStars)}</span>{" "}
                        <span className="text-secondary">adult{model.ncap.childStars ? ` · ${model.ncap.childStars}★ child` : ""}</span>
                      </>
                    ) : (
                      <span className="text-secondary">tested — rating awaited</span>
                    )}
                  </span>
                ) : (
                  <span className="glass px-4 py-2 text-sm text-secondary">Not yet crash-tested</span>
                )}
              </div>
            </div>
            <div>
              <CarPhoto
                src={model.heroImage}
                alt={`${brand.name} ${model.name}`}
                color={brand.color}
                dna={vehicleDna}
                className="w-full h-48 lg:h-64"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
          </div>

          <div className="mt-10 grid grid-cols-2 sm:grid-cols-5 gap-4">
            {stats.map((s) => (
              <div key={s.label} className="glass p-5">
                <p className="stat-num text-xl font-semibold leading-tight">{s.value}</p>
                <p className="text-xs text-secondary mt-1.5 flex items-center gap-2">
                  {s.label} {s.estimated && <EstimatedBadge tooltip="ARAI figure × 0.72 (city-heavy), ±10%." />}
                </p>
              </div>
            ))}
          </div>

          {/* anchor nav */}
          <nav className="mt-10 hidden md:flex gap-2 flex-wrap text-sm">
            {[
              { href: "variants", label: "variants" },
              { href: "understand", label: "understand" },
              { href: "simulations", label: "simulations" },
              { href: "cost", label: "cost" },
            ].map((a) => (
              <a
                key={a.href}
                href={`#${a.href}`}
                className="glass px-4 py-2 capitalize text-secondary hover:text-primary transition-colors"
              >
                {a.label}
              </a>
            ))}
          </nav>

          <CompareRivals modelId={model.id} />
        </section>
      }
      ownerVoicesSection={
        <section className="mx-auto max-w-6xl px-6 pb-4">
          <div className="glass p-8">
            <OwnerVoicesPanel modelId={model.id} />
          </div>
        </section>
      }
      variantsSection={
        <section id="variants" className="mx-auto max-w-6xl px-6 py-16 scroll-mt-28">
          <h2 className="text-3xl font-semibold tracking-tight mb-2">Is the upgrade worth it?</h2>
          <p className="text-secondary mb-8 max-w-xl text-sm">
            Pick two trims. We score every gained feature by real-world impact per lakh — deterministic, no AI opinions.
          </p>
          <VariantIntelligence model={model} variants={variants} />
        </section>
      }
      understandSection={
        <section id="understand" className="mx-auto max-w-6xl px-4 sm:px-6 py-10 sm:py-16 scroll-mt-28">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-2">Explain This Like I&apos;m Buying It</h2>
          <p className="text-[#4b4b4b] mb-6 max-w-xl text-sm">
            Every feature translated — what it is, when you&apos;ll use it, whether it&apos;s worth paying for.
          </p>
          {/* Features first on mobile so Specs & Tech tab isn't empty above the fold */}
          <div id="features" className="scroll-mt-28 mb-10">
            <h3 className="text-lg font-medium mb-4 text-[#161616]">
              Top trim features <span className="text-[#4b4b4b] text-sm font-normal">({top.name})</span>
            </h3>
            <FeatureGrid features={featuresHere} />
          </div>
          <UnderstandingLayersGuide />
          <SpecUnderstandingGrid model={model} />
        </section>
      }
      simulationsSection={
        <section id="simulations" className="mx-auto max-w-6xl px-6 py-16 scroll-mt-28">
          <h2 className="text-3xl font-semibold tracking-tight mb-8">See it move</h2>
          <SimulationLab initialVariants={simDefaults} />
        </section>
      }
      costSection={
        <section id="cost" className="mx-auto max-w-6xl px-6 py-16 scroll-mt-28 space-y-8">
          {variants.some((v) => v.fuel === "diesel") && <FuelDecisionCard initialModelId={model.id} />}
          <div className="glass p-10 flex flex-wrap items-center justify-between gap-6">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight">What will it really cost?</h2>
              <p className="text-secondary mt-2 text-sm max-w-md">
                Fuel, insurance, maintenance, tyres and depreciation over your ownership — tuned to your city and km.
              </p>
            </div>
            <Link
              href={`/cost?variants=${top.id}`}
              className="px-7 py-3.5 rounded-xl bg-accent text-[#F4F0E8] font-medium transition-transform duration-200 hover:scale-[1.03]"
            >
              Simulate 5-year cost →
            </Link>
          </div>
        </section>
      }
    />
  );
}
