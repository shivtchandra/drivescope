"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Feature } from "@/lib/types";
import type { SpecUnderstanding } from "@/lib/types";
import {
  getFeatureUnderstanding,
  loadProfile,
  resolveContext,
  type DrivingProfile,
} from "@/lib/understanding";
import type { SceneSpecProps } from "./registry";
import VisualScene from "./VisualScene";
import ContextBrief from "./ContextBrief";
import ValueScore from "./ValueScore";
import ProfileBar from "./ProfileBar";

export type UnderstandingTarget =
  | { type: "feature"; feature: Feature }
  | {
      type: "spec";
      spec: SpecUnderstanding;
      specProps: SceneSpecProps;
      rawValue?: string;
    };

export default function UnderstandingPanel({
  target,
  onClose,
}: {
  target: UnderstandingTarget | null;
  onClose: () => void;
}) {
  const [profile, setProfile] = useState<DrivingProfile>(loadProfile);

  useEffect(() => {
    setProfile(loadProfile());
  }, [target]);

  const content = useMemo(() => {
    if (!target) return null;

    if (target.type === "feature") {
      const understanding = getFeatureUnderstanding(target.feature.id, target.feature);
      const context = resolveContext(understanding, profile);
      return {
        title: target.feature.name,
        category: target.feature.category,
        whatItIs: target.feature.whatItIs,
        visual: understanding.visual,
        context,
        value: understanding.value,
        specProps: undefined as SceneSpecProps | undefined,
      };
    }

    return {
      title: target.spec.label,
      category: "dimensions",
      whatItIs: target.rawValue,
      visual: target.spec.visual,
      context: {
        usefulIf: target.spec.context.usefulIf,
        notUsefulIf: target.spec.context.notUsefulIf,
      },
      value: {
        practicalScore: target.spec.value.practicalScore,
        experienceScore: target.spec.value.experienceScore,
        ownershipImpact: 2 as const,
      },
      specProps: target.specProps,
    };
  }, [target, profile]);

  return (
    <AnimatePresence>
      {target && content && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-end sm:items-stretch sm:justify-end bg-black/55 sm:bg-black/70 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full sm:max-w-lg max-h-[92dvh] sm:max-h-[100dvh] sm:h-full overflow-y-auto rounded-t-2xl sm:rounded-none bg-[#F5F1E8] border border-[#161616]/10 border-b-0 sm:border-l sm:border-y-0 sm:border-r-0 p-5 sm:p-8 shadow-[0_-12px_40px_rgba(22,22,22,0.18)]"
            initial={{ opacity: 0, y: 48 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 48 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h3 className="text-2xl font-semibold tracking-tight">{content.title}</h3>
                <p className="text-xs uppercase tracking-widest text-secondary mt-1">
                  {content.category}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="text-secondary hover:text-primary text-2xl leading-none min-h-[48px] min-w-[48px] flex items-center justify-center"
              >
                ×
              </button>
            </div>

            <ProfileBar profile={profile} onChange={setProfile} />

            <motion.div
              className="mt-6 space-y-8"
              initial="hidden"
              animate="show"
              variants={{
                hidden: {},
                show: { transition: { staggerChildren: 0.08 } },
              }}
            >
              <motion.section variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}>
                <h4 className="text-xs uppercase tracking-widest text-[var(--accent)] mb-3">
                  Layer 1 — See it
                </h4>
                <VisualScene
                  scene={content.visual.scene}
                  steps={content.visual.steps}
                  captions={"captions" in content.visual ? content.visual.captions : undefined}
                  specProps={content.specProps}
                />
              </motion.section>

              <motion.section variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}>
                <h4 className="text-xs uppercase tracking-widest text-[var(--accent)] mb-3">
                  Layer 2 — For your driving
                </h4>
                {content.whatItIs && target.type === "spec" && (
                  <p className="text-sm text-secondary mb-3">{content.whatItIs}</p>
                )}
                <ContextBrief context={content.context} />
              </motion.section>

              <motion.section variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}>
                <h4 className="text-xs uppercase tracking-widest text-[var(--accent)] mb-3">
                  Layer 3 — Worth paying for?
                </h4>
                <ValueScore
                  practicalScore={content.value.practicalScore}
                  experienceScore={content.value.experienceScore}
                  ownershipImpact={content.value.ownershipImpact}
                />
                {target.type === "feature" && (
                  <p className="mt-4 text-xs text-secondary">{target.feature.whyItMatters}</p>
                )}
              </motion.section>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
