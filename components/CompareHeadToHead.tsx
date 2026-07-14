import Link from "next/link";
import { formatLakh } from "@/lib/data";
import type { HeadToHeadData } from "@/lib/compare-seo";
import EstimatedBadge from "@/components/EstimatedBadge";

export default function CompareHeadToHead({ data }: { data: HeadToHeadData }) {
  const {
    a,
    b,
    brandA,
    brandB,
    quickAnswer,
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
    faqs,
    cityCosts,
    recommendedA,
    recommendedB,
    related,
    updatedLabel,
  } = data;

  return (
    <article className="space-y-10">
      <header className="space-y-4">
        <p className="section-label">Head-to-head · Formula-backed · {updatedLabel}</p>
        <h1 className="font-display text-3xl sm:text-5xl leading-tight text-[#161616]">
          {brandA} {a.name} vs {brandB} {b.name}
        </h1>
        <div className="glass p-5 border-l-2 border-[#C84C31] max-w-3xl">
          <p className="text-[10px] uppercase tracking-wider text-[#4b4b4b] font-semibold mb-2">
            Quick answer
          </p>
          <p className="text-base leading-relaxed text-[#161616]">{quickAnswer}</p>
        </div>
        <p className="page-header-description max-w-3xl text-base leading-relaxed">{verdict}</p>
        <div className="flex flex-wrap gap-2 text-xs">
          <Link href={`/cars/${a.id}`} className="glass px-3 py-2 hover:border-[#C84C31]/40">
            {brandA} {a.name} →
          </Link>
          <Link href={`/cars/${b.id}`} className="glass px-3 py-2 hover:border-[#C84C31]/40">
            {brandB} {b.name} →
          </Link>
        </div>
      </header>

      {/* Snapshot */}
      <section className="grid gap-4 sm:grid-cols-2">
        {[
          {
            id: a.id,
            brand: brandA,
            name: a.name,
            price: priceA,
            fe: feA,
            power: powerA,
            cost: costA,
            win: costWinner === "a",
          },
          {
            id: b.id,
            brand: brandB,
            name: b.name,
            price: priceB,
            fe: feB,
            power: powerB,
            cost: costB,
            win: costWinner === "b",
          },
        ].map((car) => (
          <div
            key={car.id}
            className={`glass p-5 sm:p-6 ${car.win ? "ring-1 ring-[#C84C31]/35" : ""}`}
          >
            <p className="text-xs text-[#4b4b4b]">{car.brand}</p>
            <h2 className="text-xl font-semibold text-[#161616] mt-0.5">{car.name}</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-[#4b4b4b]">Ex-showroom</dt>
                <dd className="stat-num font-medium">{car.price}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[#4b4b4b]">Peak power</dt>
                <dd className="stat-num font-medium">{car.power} PS</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[#4b4b4b]">Best real FE</dt>
                <dd className="stat-num font-medium">~{car.fe.toFixed(1)} km/l</dd>
              </div>
              <div className="flex justify-between gap-3 border-t border-[#161616]/10 pt-2">
                <dt className="text-[#4b4b4b] flex items-center gap-1">
                  5-yr cost <EstimatedBadge tooltip="Delhi · 12,000 km/yr · fuel + insurance + maintenance + tyres + depreciation" />
                </dt>
                <dd className="stat-num font-semibold text-[#161616]">~{formatLakh(car.cost)}</dd>
              </div>
            </dl>
          </div>
        ))}
      </section>

      {costWinner !== "tie" && (
        <p className="text-sm text-[#161616] border-l-2 border-[#C84C31] pl-4">
          Ownership edge:{" "}
          <strong>
            {costWinner === "a" ? `${brandA} ${a.name}` : `${brandB} ${b.name}`}
          </strong>{" "}
          saves about <span className="stat-num font-semibold">{formatLakh(costDelta)}</span> over 5 years
          in our baseline model. Run the Cost simulator with your city for a tighter number.
        </p>
      )}

      {/* Variant picks */}
      <section>
        <h2 className="text-lg font-semibold text-[#161616] mb-4">
          Recommended variants for this comparison
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { pick: recommendedA, label: a.name },
            { pick: recommendedB, label: b.name },
          ].map(({ pick, label }) => (
            <div key={pick.id} className="glass p-5">
              <p className="text-[10px] uppercase tracking-wider text-[#4b4b4b] font-semibold">
                {label} benchmark
              </p>
              <h3 className="mt-2 text-base font-semibold text-[#161616]">{pick.name}</h3>
              <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
                <div>
                  <dt className="text-[10px] uppercase tracking-wider text-[#4b4b4b]">Price</dt>
                  <dd className="stat-num font-semibold">{pick.price}</dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-wider text-[#4b4b4b]">Fuel</dt>
                  <dd className="font-medium">{pick.fuel}</dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-wider text-[#4b4b4b]">Gearbox</dt>
                  <dd className="font-medium">{pick.transmission}</dd>
                </div>
              </dl>
              <p className="mt-3 text-sm text-[#4b4b4b] leading-relaxed">{pick.reason}</p>
            </div>
          ))}
        </div>
      </section>

      {/* City cost */}
      <section>
        <h2 className="text-lg font-semibold text-[#161616] mb-4">
          5-year ownership cost by city
        </h2>
        <div className="glass overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#161616]/10 bg-[#ECE7DF]/60 text-left">
                <th className="p-3 text-xs uppercase tracking-wider text-[#4b4b4b]">City</th>
                <th className="p-3 text-xs font-semibold">{a.name}</th>
                <th className="p-3 text-xs font-semibold">{b.name}</th>
                <th className="p-3 text-xs uppercase tracking-wider text-[#4b4b4b]">Lower cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#161616]/8">
              {cityCosts.map((row) => (
                <tr key={row.city}>
                  <td className="p-3 text-[#4b4b4b]">{row.city}</td>
                  <td className={`p-3 stat-num ${row.winner === "a" ? "font-bold text-[#C84C31]" : ""}`}>
                    ~{formatLakh(row.costA)}
                  </td>
                  <td className={`p-3 stat-num ${row.winner === "b" ? "font-bold text-[#C84C31]" : ""}`}>
                    ~{formatLakh(row.costB)}
                  </td>
                  <td className="p-3 text-xs text-[#4b4b4b]">
                    {row.winner === "tie"
                      ? "Near tie"
                      : `${row.winner === "a" ? a.name : b.name} by ${formatLakh(row.delta)}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] text-[#4b4b4b]">
          Uses the recommended benchmark variants above, 12,000 km/year, fuel, insurance,
          maintenance, tyres and depreciation.
        </p>
      </section>

      {/* Axes */}
      <section>
        <h2 className="text-lg font-semibold text-[#161616] mb-4">Six scored axes (1–10)</h2>
        <div className="glass overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#161616]/10 bg-[#ECE7DF]/60 text-left">
                <th className="p-3 text-xs uppercase tracking-wider text-[#4b4b4b]">Axis</th>
                <th className="p-3 text-xs font-semibold">{a.name}</th>
                <th className="p-3 text-xs font-semibold">{b.name}</th>
                <th className="p-3 text-xs uppercase tracking-wider text-[#4b4b4b]">Edge</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#161616]/8">
              {axes.map((row) => (
                <tr key={row.key}>
                  <td className="p-3 text-[#4b4b4b]">{row.label}</td>
                  <td className={`p-3 stat-num ${row.winner === "a" ? "font-bold text-[#C84C31]" : ""}`}>
                    {row.scoreA.toFixed(1)}
                  </td>
                  <td className={`p-3 stat-num ${row.winner === "b" ? "font-bold text-[#C84C31]" : ""}`}>
                    {row.scoreB.toFixed(1)}
                  </td>
                  <td className="p-3 text-xs text-[#4b4b4b]">
                    {row.winner === "tie"
                      ? "Tie"
                      : row.winner === "a"
                        ? a.name
                        : b.name}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] text-[#4b4b4b]">
          Scores normalize each axis across the full DriveScope catalog. Ownership inverts estimated 5-year cost.
        </p>
      </section>

      {/* Verdict choose */}
      <section className="grid gap-4 sm:grid-cols-2">
        <div className="glass p-5">
          <h3 className="font-semibold text-[#161616] mb-2">Choose {a.name} if…</h3>
          <p className="text-sm text-[#4b4b4b] leading-relaxed">{chooseA}</p>
          <ul className="mt-3 space-y-1.5 text-sm text-[#4b4b4b]">
            {a.prosCons.pros.slice(0, 3).map((p) => (
              <li key={p} className="flex gap-2">
                <span className="text-[var(--positive)]">+</span>
                {p}
              </li>
            ))}
          </ul>
        </div>
        <div className="glass p-5">
          <h3 className="font-semibold text-[#161616] mb-2">Choose {b.name} if…</h3>
          <p className="text-sm text-[#4b4b4b] leading-relaxed">{chooseB}</p>
          <ul className="mt-3 space-y-1.5 text-sm text-[#4b4b4b]">
            {b.prosCons.pros.slice(0, 3).map((p) => (
              <li key={p} className="flex gap-2">
                <span className="text-[var(--positive)]">+</span>
                {p}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CTAs */}
      <section className="flex flex-wrap gap-3">
        <Link
          href={`/cost?variants=${data.midVariantIdA},${data.midVariantIdB}`}
          className="px-5 py-3 rounded-xl bg-[#C84C31] text-[#F5F1E8] text-sm font-semibold hover:opacity-90"
        >
          Run 5-year cost →
        </Link>
        <Link
          href={`/simulate?variants=${data.midVariantIdA},${data.midVariantIdB}`}
          className="glass px-5 py-3 text-sm font-medium hover:border-[#C84C31]/40"
        >
          Open simulation lab →
        </Link>
        <Link
          href={`/race?car=${data.midVariantIdA}&rivals=${data.midVariantIdB}`}
          className="glass px-5 py-3 text-sm font-medium hover:border-[#C84C31]/40"
        >
          Race mode →
        </Link>
      </section>

      {/* FAQ */}
      <section>
        <h2 className="text-lg font-semibold text-[#161616] mb-4">
          {a.name} vs {b.name} — FAQs
        </h2>
        <div className="space-y-3">
          {faqs.map((faq) => (
            <details key={faq.question} className="glass p-4 group">
              <summary className="cursor-pointer font-medium text-[#161616] text-sm list-none flex justify-between gap-3">
                {faq.question}
                <span className="text-[#C84C31] group-open:rotate-45 transition">+</span>
              </summary>
              <p className="mt-3 text-sm text-[#4b4b4b] leading-relaxed">{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>

      {related.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-[#161616] mb-4">Related comparisons</h2>
          <div className="flex flex-wrap gap-2">
            {related.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="glass px-3 py-2 text-sm text-[#161616] hover:border-[#C84C31]/40 transition"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
