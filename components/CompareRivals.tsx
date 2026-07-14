import Link from "next/link";
import { rivalsForModel } from "@/lib/compare-seo";

export default function CompareRivals({ modelId }: { modelId: string }) {
  const rivals = rivalsForModel(modelId);
  if (rivals.length === 0) return null;

  return (
    <div className="mt-8">
      <p className="section-label mb-3">Compare with rivals</p>
      <div className="flex flex-wrap gap-2">
        {rivals.map((r) => (
          <Link
            key={r.otherId}
            href={r.href}
            className="glass px-3 py-2 text-sm text-[#161616] hover:border-[#C84C31]/40 transition"
          >
            vs {r.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
