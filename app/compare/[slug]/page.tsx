import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import CompareView from "@/components/CompareView";
import CompareHeadToHead from "@/components/CompareHeadToHead";
import {
  buildHeadToHead,
  getSeedSlugs,
  parseCompareSlug,
} from "@/lib/compare-seo";

export function generateStaticParams() {
  return getSeedSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const parsed = parseCompareSlug(slug);
  if (!parsed.modelIds) {
    return { title: "Compare Cars" };
  }
  const data = buildHeadToHead(parsed.modelIds[0], parsed.modelIds[1]);
  if (!data) return { title: "Compare Cars" };

  const canonical = `/compare/${data.slug}`;
  return {
    title: data.title,
    description: data.description,
    keywords: [
      `${data.a.name} vs ${data.b.name}`,
      `${data.b.name} vs ${data.a.name}`,
      `${data.a.name} vs ${data.b.name} which is better`,
      `compare ${data.a.name} ${data.b.name}`,
      `${data.a.name} ${data.b.name} price mileage features`,
      `${data.brandA} ${data.a.name}`,
      `${data.brandB} ${data.b.name}`,
      "ownership cost",
      "car comparison India",
    ],
    alternates: { canonical },
    openGraph: {
      title: `${data.brandA} ${data.a.name} vs ${data.brandB} ${data.b.name} — DriveScope`,
      description: data.description,
      url: canonical,
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: `${data.a.name} vs ${data.b.name} — DriveScope`,
      description: data.description,
    },
  };
}

export default async function CompareSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const parsed = parseCompareSlug(slug);
  if (!parsed.modelIds || !parsed.canonicalSlug) notFound();
  if (parsed.needsRedirect) redirect(`/compare/${parsed.canonicalSlug}`);

  const [idA, idB] = parsed.modelIds;
  const data = buildHeadToHead(idA, idB);
  if (!data) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        name: data.title,
        description: data.description,
        url: `https://drivescope.com/compare/${data.slug}`,
        isPartOf: { "@type": "WebSite", name: "DriveScope", url: "https://drivescope.com" },
        breadcrumb: {
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: "https://drivescope.com/" },
            { "@type": "ListItem", position: 2, name: "Compare", item: "https://drivescope.com/compare" },
            {
              "@type": "ListItem",
              position: 3,
              name: `${data.a.name} vs ${data.b.name}`,
              item: `https://drivescope.com/compare/${data.slug}`,
            },
          ],
        },
      },
      {
        "@type": "ItemList",
        name: `${data.brandA} ${data.a.name} vs ${data.brandB} ${data.b.name}`,
        numberOfItems: 2,
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            item: {
              "@type": "Product",
              name: `${data.brandA} ${data.a.name}`,
              url: `https://drivescope.com/cars/${data.a.id}`,
              brand: { "@type": "Brand", name: data.brandA },
              offers: {
                "@type": "AggregateOffer",
                priceCurrency: "INR",
                lowPrice: data.a.priceRange.min,
                highPrice: data.a.priceRange.max,
              },
            },
          },
          {
            "@type": "ListItem",
            position: 2,
            item: {
              "@type": "Product",
              name: `${data.brandB} ${data.b.name}`,
              url: `https://drivescope.com/cars/${data.b.id}`,
              brand: { "@type": "Brand", name: data.brandB },
              offers: {
                "@type": "AggregateOffer",
                priceCurrency: "INR",
                lowPrice: data.b.priceRange.min,
                highPrice: data.b.priceRange.max,
              },
            },
          },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: data.faqs.map((f) => ({
          "@type": "Question",
          name: f.question,
          acceptedAnswer: { "@type": "Answer", text: f.answer },
        })),
      },
    ],
  };

  return (
    <div className="blueprint-grid min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-24 sm:pt-32 pb-10">
        <CompareHeadToHead data={data} />
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 pb-24 border-t border-[#161616]/10 pt-12">
        <p className="section-label mb-3">Interactive compare</p>
        <h2 className="font-display text-2xl sm:text-3xl text-[#161616] mb-2">
          Adjust fuel and add a third car
        </h2>
        <p className="page-header-description mb-8 max-w-xl text-sm">
          Radar and specs update live. Shareable URL stays synced when you change cars.
        </p>
        <CompareView initialIds={[idA, idB]} syncUrl />
      </div>
    </div>
  );
}
