"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState, useCallback } from "react";
import useWebGLSupport from "./three/useWebGLSupport";
import MobileSegmentedTabs from "@/components/mobile/MobileSegmentedTabs";
import { usePersistedPageState, usePersistedScroll } from "@/lib/use-persisted-page-state";

const LaunchChallenge = dynamic(() => import("./sims/LaunchChallenge"));
const HighwayOvertake = dynamic(() => import("./sims/HighwayOvertake"));
const BrakingLab = dynamic(() => import("./sims/BrakingLab"));
const HillClimb = dynamic(() => import("./sims/HillClimb"));
const GroundClearance = dynamic(() => import("./sims/GroundClearance"));
const CityDriving = dynamic(() => import("./sims/CityDriving"));
const CorneringLab = dynamic(() => import("./sims/CorneringLab"));
const EmergencySwerve = dynamic(() => import("./sims/EmergencySwerve"));
const FeaturePlayground = dynamic(() => import("./sims/FeaturePlayground"), {
  loading: () => <div className="glass h-72 animate-pulse rounded-2xl" />,
});

const DragRace3D = dynamic(() => import("./three/sims/DragRace3D"), { ssr: false });
const Overtake3D = dynamic(() => import("./three/sims/Overtake3D"), { ssr: false });
const Braking3D = dynamic(() => import("./three/sims/Braking3D"), { ssr: false });
const HillClimb3D = dynamic(() => import("./three/sims/HillClimb3D"), { ssr: false });
const GroundClearance3D = dynamic(() => import("./three/sims/GroundClearance3D"), { ssr: false });
const Cornering3D = dynamic(() => import("./three/sims/Cornering3D"), { ssr: false });

const TABS = [
  { id: "launch", label: "Launch Challenge", category: "speed" },
  { id: "overtake", label: "Highway Overtake", category: "speed" },
  { id: "braking", label: "Braking Lab", category: "safety" },
  { id: "swerve", label: "Emergency Swerve", category: "safety" },
  { id: "cornering", label: "Cornering Lab", category: "safety" },
  { id: "hill-climb", label: "Hill Climb", category: "terrain" },
  { id: "clearance", label: "Ground Clearance", category: "terrain" },
  { id: "city", label: "City Simulator", category: "terrain" },
  { id: "playground", label: "Feature Playground", category: "features" },
] as const;

const CATEGORIES = [
  { id: "speed", label: "Speed" },
  { id: "safety", label: "Safety" },
  { id: "terrain", label: "Terrain" },
  { id: "features", label: "Features" },
] as const;

export type SimTab = (typeof TABS)[number]["id"];

const MODE_KEY = "ds-sim-mode";

export default function SimulationLab({
  initialSim = "launch",
  initialVariants = [],
}: {
  initialSim?: SimTab;
  initialVariants?: string[];
  initialFeature?: string;
}) {
  const initialTab = TABS.find((t) => t.id === initialSim) ?? TABS[0];
  const [persisted, setPersisted] = usePersistedPageState("simulate", {
    tab: initialSim,
    category: initialTab.category,
  });
  const { tab, category } = persisted;
  const setTab = useCallback(
    (id: SimTab) => setPersisted((p) => ({ ...p, tab: id })),
    [setPersisted],
  );
  const setCategory = useCallback(
    (id: (typeof CATEGORIES)[number]["id"]) => setPersisted((p) => ({ ...p, category: id })),
    [setPersisted],
  );
  usePersistedScroll("simulate");
  const webgl = useWebGLSupport();
  const [mode, setMode] = useState<"3d" | "2d" | null>(null);

  const categorySims = useMemo(
    () => TABS.filter((t) => t.category === category),
    [category]
  );

  useEffect(() => {
    if (!categorySims.some((t) => t.id === tab)) {
      setTab(categorySims[0].id);
    }
  }, [category, categorySims, tab, setTab]);

  useEffect(() => {
    if (webgl === null) return;
    const saved = typeof window !== "undefined" ? localStorage.getItem(MODE_KEY) : null;
    if (saved === "2d" || saved === "3d") setMode(webgl ? (saved as "3d" | "2d") : "2d");
    else setMode(webgl ? "3d" : "2d");
  }, [webgl]);

  const pickMode = (m: "3d" | "2d") => {
    setMode(m);
    localStorage.setItem(MODE_KEY, m);
  };

  const is3d = mode === "3d";
  const has3dOption = tab === "launch" || tab === "overtake" || tab === "braking" || tab === "hill-climb" || tab === "clearance" || tab === "cornering";

  const tabPicker = (className = "") => (
    <MobileSegmentedTabs
      className={className}
      tabs={categorySims.map((t) => ({ id: t.id, label: t.label }))}
      activeId={tab}
      onChange={(id) => setTab(id as SimTab)}
    />
  );

  return (
    <div className="pb-safe">
      <p className="text-sm text-secondary mb-4 sm:hidden">Pick a scenario, choose cars, then run the test.</p>

      {/* Mobile: category then sim */}
      <div className="sm:hidden space-y-3 mb-6">
        <MobileSegmentedTabs
          tabs={CATEGORIES.map((c) => ({ id: c.id, label: c.label }))}
          activeId={category}
          onChange={(id) => {
            const next = id as typeof category;
            setCategory(next);
            const first = TABS.find((t) => t.category === next);
            if (first) setTab(first.id);
          }}
        />
        {tabPicker()}
      </div>

      {/* Desktop: all tabs */}
      <div className="hidden sm:flex flex-wrap items-center gap-2 mb-6">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setTab(t.id);
              setCategory(t.category);
            }}
            className={`px-4 py-2 rounded-full text-sm border transition-colors duration-200 ${
              tab === t.id
                ? "border-[var(--accent)] text-primary bg-[rgba(232,89,12,0.1)]"
                : "border-[#161616]/10 text-secondary hover:text-primary"
            }`}
          >
            {t.label}
          </button>
        ))}
        {has3dOption && webgl && mode && (
          <div className="ml-auto flex rounded-full border border-[#161616]/10 overflow-hidden text-xs">
            {(["3d", "2d"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => pickMode(m)}
                className={`px-3.5 py-1.5 uppercase tracking-wide transition-colors duration-200 ${
                  mode === m ? "bg-[rgba(232,89,12,0.15)] text-primary" : "text-secondary hover:text-primary"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Mobile 3d/2d toggle */}
      {has3dOption && webgl && mode && (
        <div className="sm:hidden flex rounded-full border border-[#161616]/10 overflow-hidden text-xs mb-4 w-fit">
          {(["3d", "2d"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => pickMode(m)}
              className={`px-3.5 py-2 uppercase tracking-wide ${
                mode === m ? "bg-[rgba(232,89,12,0.15)] text-primary" : "text-secondary"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      )}

      {tab === "playground" ? (
        <FeaturePlayground />
      ) : mode === null && has3dOption ? (
        <div className="glass h-72 animate-pulse" />
      ) : (
        <>
          {tab === "launch" &&
            (is3d ? <DragRace3D initialVariants={initialVariants} /> : <LaunchChallenge initialVariants={initialVariants} />)}
          {tab === "overtake" &&
            (is3d ? <Overtake3D initialVariant={initialVariants[0]} /> : <HighwayOvertake initialVariant={initialVariants[0]} />)}
          {tab === "braking" &&
            (is3d ? (
              <Braking3D initialVariant={initialVariants[0]} initialComparison={initialVariants[1]} />
            ) : (
              <BrakingLab initialVariant={initialVariants[0]} />
            ))}
          {tab === "hill-climb" &&
            (is3d ? <HillClimb3D initialVariant={initialVariants[0]} /> : <HillClimb initialVariant={initialVariants[0]} />)}
          {tab === "clearance" &&
            (is3d ? <GroundClearance3D initialVariant={initialVariants[0]} /> : <GroundClearance initialVariant={initialVariants[0]} />)}
          {tab === "cornering" &&
            (is3d ? <Cornering3D initialVariant={initialVariants[0]} /> : <CorneringLab initialVariant={initialVariants[0]} />)}
          {tab === "swerve" && <EmergencySwerve initialVariant={initialVariants[0]} />}
          {tab === "city" && <CityDriving initialVariant={initialVariants[0]} />}
        </>
      )}
    </div>
  );
}
