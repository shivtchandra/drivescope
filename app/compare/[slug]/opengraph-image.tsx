import { ImageResponse } from "next/og";
import { buildHeadToHead, getSeedSlugs, parseCompareSlug } from "@/lib/compare-seo";
import { formatLakh } from "@/lib/data";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return getSeedSlugs().map((slug) => ({ slug }));
}

export default async function OgImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const parsed = parseCompareSlug(slug);
  const data =
    parsed.modelIds && buildHeadToHead(parsed.modelIds[0], parsed.modelIds[1]);

  const left = data ? `${data.brandA} ${data.a.name}` : "Car A";
  const right = data ? `${data.brandB} ${data.b.name}` : "Car B";
  const sub = data
    ? `${data.priceA} vs ${data.priceB} · 5yr ~${formatLakh(Math.min(data.costA, data.costB))}`
    : "Scored compare · ownership cost";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 64,
          background: "linear-gradient(145deg, #F5F1E8 0%, #E5DFC8 55%, #ECE7DF 100%)",
          color: "#161616",
          fontFamily: "Georgia, serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 26, fontFamily: "monospace", fontWeight: 700 }}>
          Drive<span style={{ color: "#C84C31" }}>Scope</span>
          <span style={{ marginLeft: 16, color: "#4b4b4b", fontWeight: 500, fontSize: 20 }}>
            HEAD-TO-HEAD
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 24, fontSize: 52, fontWeight: 700 }}>
            <span>{left}</span>
            <span style={{ color: "#C84C31", fontSize: 36 }}>vs</span>
            <span>{right}</span>
          </div>
          <div style={{ fontSize: 24, color: "#4b4b4b", fontFamily: "sans-serif" }}>{sub}</div>
          {data && (
            <div style={{ display: "flex", gap: 12, marginTop: 16, fontFamily: "sans-serif", fontSize: 18 }}>
              {data.axes.slice(0, 4).map((ax) => (
                <div
                  key={ax.key}
                  style={{
                    display: "flex",
                    padding: "8px 14px",
                    borderRadius: 999,
                    background: "rgba(200,76,49,0.1)",
                    border: "1px solid rgba(200,76,49,0.25)",
                    color: "#161616",
                  }}
                >
                  {ax.label}: {ax.scoreA.toFixed(0)}–{ax.scoreB.toFixed(0)}
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: "flex", fontSize: 22, color: "#C84C31", fontFamily: "sans-serif" }}>
          Find the right car. Not just the popular one.
        </div>
      </div>
    ),
    size
  );
}
