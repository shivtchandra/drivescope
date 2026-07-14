"use client";

import React, { useState, useEffect } from "react";

interface CarDetailPageLayoutProps {
  overviewSection: React.ReactNode;
  ownerVoicesSection: React.ReactNode;
  variantsSection: React.ReactNode;
  understandSection: React.ReactNode;
  simulationsSection: React.ReactNode;
  costSection: React.ReactNode;
}

type TabKey = "trims" | "features" | "simulations" | "cost";

export default function CarDetailPageLayout({
  overviewSection,
  ownerVoicesSection,
  variantsSection,
  understandSection,
  simulationsSection,
  costSection,
}: CarDetailPageLayoutProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("trims");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const tabs = [
    { key: "trims" as TabKey, label: "Trims" },
    { key: "features" as TabKey, label: "Features" },
    { key: "simulations" as TabKey, label: "Sims" },
    { key: "cost" as TabKey, label: "Cost" },
  ];

  if (!isMobile) {
    return (
      <div className="pt-28">
        {overviewSection}
        {ownerVoicesSection}
        {variantsSection}
        {understandSection}
        {simulationsSection}
        {costSection}
      </div>
    );
  }

  return (
    <div className="pt-24 pb-12">
      {/* Overview/Hero (Always visible at the top) */}
      {overviewSection}

      {/* Owner Voices (Always visible below Overview on mobile) */}
      {ownerVoicesSection}

      {/* Sticky Tab Nav Bar */}
      <div
        className="sticky top-[72px] z-40 border-y border-[#161616]/10 py-3 mb-6"
        style={{
          background: "rgba(245, 241, 232, 0.92)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}
      >
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`shrink-0 px-4 py-2.5 text-xs font-mono rounded-xl border transition-all duration-200 ${
                  activeTab === tab.key
                    ? "border-[#C84C31] bg-[#C84C31]/5 text-[#C84C31] font-bold"
                    : "border-[#161616]/5 bg-[#ECE7DF]/60 text-[#161616]/75 hover:bg-[#ECE7DF]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Active Tab Content */}
      <div className="transition-all duration-200">
        {activeTab === "trims" && variantsSection}
        {activeTab === "features" && understandSection}
        {activeTab === "simulations" && simulationsSection}
        {activeTab === "cost" && costSection}
      </div>
    </div>
  );
}
