import { redirect } from "next/navigation";
import CompareView from "@/components/CompareView";
import CompactPageHeader from "@/components/mobile/CompactPageHeader";
import Link from "next/link";
import type { Metadata } from "next";
import { getSeedPairs, pairHref } from "@/lib/compare-seo";
import { getBrand, getModel } from "@/lib/data";

export const metadata: Metadata = {
  title: "Compare Cars — Price, Specs & Ownership Cost",
  description:
    "Compare Indian cars side-by-side with scored axes and 5-year ownership cost. Explore head-to-heads like Brezza vs Creta, Creta vs Seltos, and more.",
  openGraph: {
    title: "Compare Cars — DriveScope",
    description:
      "Formula-backed car comparisons for India — radar scores, price, mileage, and ownership cost.",
  },
};

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ cars?: string }>;
}) {
  const sp = await searchParams;
  const ids = sp.cars?.split(",").filter(Boolean) ?? [];

  // Query-param pairs → crawlable slug (avoids duplicate thin URLs)
  if (ids.length >= 2) {
    const a = getModel(ids[0]);
    const b = getModel(ids[1]);
    if (a && b) redirect(pairHref(a.id, b.id));
  }

  const featured = getSeedPairs().slice(0, 18);

  return (
    <div className="blueprint-grid min-h-screen">
      <CompactPageHeader
        label="Side-by-side comparison"
        title="Compare. Decide. Drive."
        description="Two or three cars, six scored axes, no opinions — every number traces to a formula. Pick a popular head-to-head or build your own below."
        className="pb-8 sm:pb-12"
      />
      <div className="mx-auto max-w-6xl px-4 sm:px-6 pb-10">
        <p className="section-label mb-3">Popular head-to-heads</p>
        <div className="flex flex-wrap gap-2 mb-12">
          {featured.map(([aId, bId]) => {
            const a = getModel(aId);
            const b = getModel(bId);
            if (!a || !b) return null;
            const ba = getBrand(a.brandId)?.name ?? "";
            const bb = getBrand(b.brandId)?.name ?? "";
            return (
              <Link
                key={`${aId}-${bId}`}
                href={pairHref(aId, bId)}
                className="glass px-3 py-2 text-sm text-[#161616] hover:border-[#C84C31]/40 transition"
              >
                {a.name} vs {b.name}
                <span className="text-[#4b4b4b] text-xs ml-1.5">
                  {ba} · {bb}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-4 sm:px-6 pb-24">
        <CompareView initialIds={ids} syncUrl />
      </div>
    </div>
  );
}
