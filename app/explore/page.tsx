import ExplorerGrid from "@/components/ExplorerGrid";
import CompactPageHeader from "@/components/mobile/CompactPageHeader";

import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Explore Cars",
  description: "Browse 130+ cars across India. Filter by budget, fuel type, transmission, and brand — then compare ownership cost and scored specs.",
  openGraph: {
    title: "Explore Cars — DriveScope",
    description: "Browse 130+ cars across India. Filter by budget, fuel type, transmission, and brand.",
  }
};

export default function ExplorePage() {
  return (
    <div>
      <CompactPageHeader
        title="Explore"
        description="130+ cars across hatch, sedan, and SUV segments. Filter by brand, budget, gearbox and fuel — or search by name."
        className="pb-6 sm:pb-10"
      />
      <div className="mx-auto max-w-6xl px-4 sm:px-6 pb-24">
        <ExplorerGrid />
      </div>
    </div>
  );
}
