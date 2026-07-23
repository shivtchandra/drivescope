"use client";

import { FormEvent, useEffect, useMemo, useState, useCallback } from "react";
import {
  addDoc,
  collection,
  doc,
  increment,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type DocumentData,
} from "firebase/firestore";
import {
  CheckCircle2, Filter, LayoutList, MessageSquarePlus,
  Pin, Plus, Send, SlidersHorizontal, ThumbsUp, X, Zap,
} from "lucide-react";
import { communityWallSeedPosts } from "@/data/community-wall-posts";
import { getDb } from "@/lib/firebase/client";
import { COLLECTIONS } from "@/lib/firestore/collections";
import DriveSelect from "@/components/ui/DriveSelect";
import type {
  CommunityWallCategory,
  CommunityWallOdometer,
  CommunityWallOwnershipStage,
  CommunityWallPost,
  CommunityWallPostFormat,
  CommunityWallSections,
  CommunityWallSentiment,
  CommunityWallVariant,
  CommunityWallYearBought,
  Model,
} from "@/lib/types";
import { usePersistedPageState, usePersistedScroll } from "@/lib/use-persisted-page-state";

type ModelOption = Pick<Model, "id" | "name">;
type SectionKey = keyof CommunityWallSections;

const sectionDefs: { key: SectionKey; label: string; hint: string }[] = [
  { key: "engine",    label: "Engine & Drive",   hint: "Power delivery, throttle response, fuel efficiency, refinement" },
  { key: "ride",      label: "Ride & Handling",  hint: "Suspension comfort, road noise, cornering, stability" },
  { key: "cabin",     label: "Cabin & Space",    hint: "Materials, NVH, rear legroom, boot, build quality" },
  { key: "tech",      label: "Tech & Features",  hint: "Infotainment, ADAS, camera, connectivity, ease of use" },
  { key: "ownership", label: "Ownership",        hint: "Service cost, dealer experience, reliability, running cost" },
];

const categories: CommunityWallCategory[] = [
  "performance & comfort",
  "features & tech",
  "ownership & service",
  "value & cost",
  "general",
];

const ownershipStages: CommunityWallOwnershipStage[] = [
  "considering", "booked", "0-6 months", "6-24 months", "2+ years",
];

const variants: CommunityWallVariant[] = [
  "Petrol Manual", "Petrol Automatic", "Diesel Manual", "Diesel Automatic",
  "Hybrid", "Electric", "CNG",
];

const yearsBought: CommunityWallYearBought[] = [
  "2026", "2025", "2024", "2023", "2022", "2021", "2020", "2019", "2018",
];

const odometers: CommunityWallOdometer[] = [
  "< 5,000 km", "5k – 15k km", "15k – 30k km", "30k – 60k km", "60k+ km",
];

const sentiments: CommunityWallSentiment[] = ["positive", "mixed", "negative", "question"];

const stagePrompts: Record<CommunityWallOwnershipStage, string[]> = {
  considering: [
    "What's stopping you from deciding?",
    "What are you most unsure about?",
    "What do you wish reviews told you?",
  ],
  booked: [
    "Why did you pick this over the alternatives?",
    "What tipped the decision?",
  ],
  "0-6 months": [
    "What surprised you most in the first few weeks?",
    "Anything you wish the dealer had told you?",
  ],
  "6-24 months": [
    "What's held up well? What hasn't?",
    "Any unexpected running costs?",
  ],
  "2+ years": [
    "Would you buy it again?",
    "What do long-term owners know that buyers don't?",
  ],
};

const stageHasOdometer: Record<CommunityWallOwnershipStage, boolean> = {
  considering: false, booked: false,
  "0-6 months": true, "6-24 months": true, "2+ years": true,
};

const noteStyles = [
  { bg: "#F8E36D", tape: "#F5F1E8", rotate: "-rotate-2" },
  { bg: "#FFB4A2", tape: "#ECE7DF", rotate: "rotate-1" },
  { bg: "#A7D8FF", tape: "#F5F1E8", rotate: "rotate-2" },
  { bg: "#B8F2D0", tape: "#ECE7DF", rotate: "-rotate-1" },
  { bg: "#F7B7D2", tape: "#F5F1E8", rotate: "rotate-1" },
  { bg: "#FFD166", tape: "#ECE7DF", rotate: "-rotate-2" },
];

const sentimentTone: Record<CommunityWallSentiment, string> = {
  positive: "text-[#2d6a4f] border-[#2d6a4f]/30 bg-[#2d6a4f]/10",
  mixed:    "text-[#8a5a00] border-[#d97706]/35 bg-[#d97706]/10",
  negative: "text-[#C84C31] border-[#C84C31]/35 bg-[#C84C31]/10",
  question: "text-[#4F6B8A] border-[#4F6B8A]/35 bg-[#4F6B8A]/10",
};

function charFeedback(len: number): string {
  if (len < 40)  return "Add a bit more — even one specific detail helps.";
  if (len <= 100) return "Good start.";
  return "✓ That's a useful note.";
}

function specificityLevel(text: string): "brief" | "specific" | "detailed" {
  let score = 0;
  if (/\d/.test(text)) score += 2;
  if (/\b(km|kmpl|km\/l|cc|ps|kw|kmph|bhp|nm|lakh|rs\.?)\b/i.test(text)) score += 2;
  if (/\b(but|however|though|although|except|surprisingly|despite)\b/i.test(text)) score += 1;
  if (/\b(vs|versus|compared|than|better|worse|over|unlike)\b/i.test(text)) score += 1;
  const words = text.trim().split(/\s+/).length;
  if (words >= 25) score += 1;
  if (words >= 45) score += 1;
  if (score >= 5) return "detailed";
  if (score >= 2) return "specific";
  return "brief";
}

const specificityStyle: Record<"brief" | "specific" | "detailed", { dot: string; label: string }> = {
  brief:    { dot: "bg-[#161616]/20", label: "Brief" },
  specific: { dot: "bg-[#d97706]",   label: "Specific" },
  detailed: { dot: "bg-[#2d6a4f]",   label: "Detailed" },
};

function compileSections(sections: Partial<CommunityWallSections>): string {
  return sectionDefs
    .filter((def) => sections[def.key]?.trim())
    .map((def) => `${def.label}: ${sections[def.key]!.trim()}`)
    .join("\n");
}

function fieldFromDoc(data: DocumentData, fallback: Partial<CommunityWallPost>): CommunityWallPost {
  const createdAt  = data.createdAt?.toDate?.().toISOString?.() ?? fallback.createdAt ?? new Date().toISOString();
  const approvedAt = data.approvedAt?.toDate?.().toISOString?.() ?? fallback.approvedAt ?? null;
  return {
    id:             fallback.id ?? "",
    modelId:        String(data.modelId   ?? fallback.modelId   ?? ""),
    modelName:      String(data.modelName ?? fallback.modelName ?? "Unknown car"),
    authorName:     String(data.authorName ?? fallback.authorName ?? "Owner"),
    ownershipStage: (data.ownershipStage ?? fallback.ownershipStage ?? "considering") as CommunityWallOwnershipStage,
    variant:        (data.variant     ?? fallback.variant     ?? undefined) as CommunityWallVariant | undefined,
    yearBought:     (data.yearBought  ?? fallback.yearBought  ?? undefined) as CommunityWallYearBought | undefined,
    odometer:       (data.odometer    ?? fallback.odometer    ?? undefined) as CommunityWallOdometer | undefined,
    category:       (data.category    ?? fallback.category    ?? "general") as CommunityWallCategory,
    sentiment:      (data.sentiment   ?? fallback.sentiment   ?? "mixed")   as CommunityWallSentiment,
    text:           String(data.text  ?? fallback.text ?? ""),
    postFormat:     (data.postFormat  ?? fallback.postFormat  ?? "quick")   as CommunityWallPostFormat,
    sections:       (data.sections    ?? fallback.sections    ?? undefined) as CommunityWallSections | undefined,
    status:         (data.status      ?? fallback.status      ?? "approved") as CommunityWallPost["status"],
    createdAt,
    approvedAt,
    helpfulCount:   typeof data.helpfulCount === "number" ? data.helpfulCount : (fallback.helpfulCount ?? 0),
  };
}

function sortPosts(posts: CommunityWallPost[]) {
  return [...posts].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

function loadVotedPosts(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    return new Set(JSON.parse(localStorage.getItem("drivescope_voted_posts") ?? "[]") as string[]);
  } catch { return new Set(); }
}

export default function CommunityWall({ models }: { models: ModelOption[] }) {
  const [posts,          setPosts]          = useState<CommunityWallPost[]>(communityWallSeedPosts);
  const [filters, setFilters] = usePersistedPageState("wall", {
    modelFilter: "all",
    categoryFilter: "all" as "all" | CommunityWallCategory,
    sentimentFilter: "all" as "all" | CommunityWallSentiment,
  });
  const { modelFilter, categoryFilter, sentimentFilter } = filters;
  const setModelFilter = useCallback((v: string) => setFilters((p) => ({ ...p, modelFilter: v })), [setFilters]);
  const setCategoryFilter = useCallback(
    (v: "all" | CommunityWallCategory) => setFilters((p) => ({ ...p, categoryFilter: v })),
    [setFilters],
  );
  const setSentimentFilter = useCallback(
    (v: "all" | CommunityWallSentiment) => setFilters((p) => ({ ...p, sentimentFilter: v })),
    [setFilters],
  );
  usePersistedScroll("wall");
  const [authorName,     setAuthorName]     = useState("");
  const [modelId,        setModelId]        = useState(models[0]?.id ?? "");
  const [ownershipStage, setOwnershipStage] = useState<CommunityWallOwnershipStage>("0-6 months");
  const [variant,        setVariant]        = useState<CommunityWallVariant>("Petrol Manual");
  const [yearBought,     setYearBought]     = useState<CommunityWallYearBought>("2024");
  const [odometer,       setOdometer]       = useState<CommunityWallOdometer>("5k – 15k km");
  const [category,       setCategory]       = useState<CommunityWallCategory>("performance & comfort");
  const [postFormat,     setPostFormat]     = useState<CommunityWallPostFormat>("quick");
  const [text,           setText]           = useState("");
  const [sections,       setSections]       = useState<Partial<CommunityWallSections>>({});
  const [statusMessage,  setStatusMessage]  = useState<string | null>(null);
  const [formError,      setFormError]      = useState<string | null>(null);
  const [isSubmitting,   setIsSubmitting]   = useState(false);
  const [isLive,         setIsLive]         = useState(false);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [votedPosts,     setVotedPosts]     = useState<Set<string>>(loadVotedPosts);

  useEffect(() => {
    try {
      const wallQuery = query(
        collection(getDb(), COLLECTIONS.communityWallPosts),
        where("status", "==", "approved")
      );
      return onSnapshot(
        wallQuery,
        (snapshot) => {
          const livePosts = snapshot.docs.map((d) => fieldFromDoc(d.data(), { id: d.id }));
          const merged = new Map<string, CommunityWallPost>();
          communityWallSeedPosts.forEach((p) => merged.set(p.id, p));
          livePosts.forEach((p) => merged.set(p.id, p));
          setPosts(sortPosts(Array.from(merged.values())));
          setIsLive(true);
        },
        () => { setPosts(sortPosts(communityWallSeedPosts)); setIsLive(false); }
      );
    } catch { return undefined; }
  }, []);

  const filteredPosts = useMemo(() =>
    posts.filter((p) => {
      const modelMatch    = modelFilter    === "all" || p.modelId  === modelFilter;
      const categoryMatch = categoryFilter === "all" || p.category === categoryFilter;
      const sentimentMatch= sentimentFilter === "all" || p.sentiment === sentimentFilter;
      return modelMatch && categoryMatch && sentimentMatch;
    }),
    [posts, modelFilter, categoryFilter, sentimentFilter]
  );

  const wallDensity = useMemo(() => {
    if (filteredPosts.length >= 48) return {
      columns: "columns-3 gap-2 sm:columns-4 lg:columns-6 2xl:columns-8",
      wrapper: "mb-2 sm:mb-3", note: "p-3 sm:p-3.5",
      title: "text-sm", body: "text-xs sm:text-[13px]", meta: "text-[9px]",
      tape: "h-4 w-14", showExtra: false,
    };
    if (filteredPosts.length >= 24) return {
      columns: "columns-2 gap-2 sm:columns-3 lg:columns-5 2xl:columns-7",
      wrapper: "mb-3 sm:mb-4", note: "p-3.5 sm:p-4",
      title: "text-sm sm:text-base", body: "text-[13px] sm:text-sm", meta: "text-[9px]",
      tape: "h-4 w-16", showExtra: false,
    };
    if (filteredPosts.length >= 12) return {
      columns: "columns-2 gap-3 sm:columns-3 lg:columns-5 2xl:columns-6",
      wrapper: "mb-4", note: "p-4",
      title: "text-base", body: "text-sm", meta: "text-[10px]",
      tape: "h-5 w-16", showExtra: true,
    };
    return {
      columns: "columns-2 gap-3 sm:columns-3 sm:gap-4 lg:columns-4 2xl:columns-5",
      wrapper: "mb-4 sm:mb-5", note: "p-4 sm:p-5",
      title: "text-base sm:text-lg", body: "text-sm sm:text-[15px]", meta: "text-[10px]",
      tape: "h-5 w-20", showExtra: true,
    };
  }, [filteredPosts.length]);

  const selectedModelName = useMemo(
    () => models.find((m) => m.id === modelId)?.name ?? "Unknown car",
    [modelId, models]
  );
  const modelOptions = useMemo(() => models.map((m) => ({ value: m.id, label: m.name })), [models]);

  const resetFilters = () => { setModelFilter("all"); setCategoryFilter("all"); setSentimentFilter("all"); };

  async function voteHelpful(postId: string) {
    if (votedPosts.has(postId)) return;
    const next = new Set(votedPosts);
    next.add(postId);
    setVotedPosts(next);
    localStorage.setItem("drivescope_voted_posts", JSON.stringify([...next]));
    setPosts((cur) => cur.map((p) => p.id === postId ? { ...p, helpfulCount: (p.helpfulCount ?? 0) + 1 } : p));
    try {
      await updateDoc(doc(getDb(), COLLECTIONS.communityWallPosts, postId), { helpfulCount: increment(1) });
    } catch { /* seed posts not in Firestore — local tracking fine */ }
  }

  function openComposer() {
    setFormError(null);
    setStatusMessage(null);
    setIsComposerOpen(true);
  }

  function switchFormat(fmt: CommunityWallPostFormat) {
    setPostFormat(fmt);
    setFormError(null);
  }

  const submitPost = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setStatusMessage(null);

    const cleanName = authorName.trim().slice(0, 40) || "Anonymous owner";

    if (!modelId) { setFormError("Pick a car before pinning the note."); return; }

    let finalText = "";
    let finalSections: CommunityWallSections | undefined;

    if (postFormat === "quick") {
      const cleanText = text.trim();
      if (cleanText.length < 20) { setFormError("Add a little more detail so the note helps another buyer."); return; }
      if (cleanText.length > 420) { setFormError("Keep the note under 420 characters."); return; }
      finalText = cleanText;
    } else {
      const filledSections = Object.fromEntries(
        sectionDefs.map((d) => [d.key, sections[d.key]?.trim() ?? ""])
          .filter(([, v]) => v)
      ) as CommunityWallSections;
      const filled = Object.values(filledSections).filter(Boolean);
      if (filled.length === 0) { setFormError("Fill at least one section."); return; }
      if (!filled.some((v) => v.length >= 20)) { setFormError("At least one section needs a bit more detail (20+ characters)."); return; }
      finalText    = compileSections(filledSections);
      finalSections = filledSections;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(getDb(), COLLECTIONS.communityWallPosts), {
        modelId, modelName: selectedModelName, authorName: cleanName,
        ownershipStage, variant, yearBought,
        ...(stageHasOdometer[ownershipStage] ? { odometer } : {}),
        category,
        sentiment:   "mixed",
        text:        finalText,
        postFormat,
        ...(finalSections ? { sections: finalSections } : {}),
        status:      "pending",
        createdAt:   serverTimestamp(),
        approvedAt:  null,
        helpfulCount: 0,
      });
      setAuthorName(""); setText(""); setSections({});
      setStatusMessage("Pinned for review. Once approved, it joins the public wall.");
      setIsComposerOpen(false);
    } catch (err) {
      setFormError(`Submit failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#D9D2C3] text-[#161616]">
      <div className="absolute inset-0 opacity-70 [background-image:linear-gradient(rgba(22,22,22,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(22,22,22,0.06)_1px,transparent_1px)] [background-size:54px_54px]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(53,214,255,0.20),transparent_30%),radial-gradient(circle_at_80%_0%,rgba(200,76,49,0.14),transparent_28%),linear-gradient(180deg,rgba(245,241,232,0.72),rgba(217,210,195,0.78)_18%,rgba(217,210,195,0.92))]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-[#F5F1E8] via-[#F5F1E8]/72 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#D9D2C3] to-transparent" />

      <section className="relative z-10 px-3 pb-28 pt-28 sm:px-5 lg:px-8">
        {/* Header + filters */}
        <div className="relative z-20 mb-4 flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl rounded-lg border border-[#161616]/10 bg-[#F5F1E8]/72 px-4 py-4 shadow-[0_18px_45px_rgba(22,22,22,0.08)] backdrop-blur-md sm:px-5">
            <span className="font-mono text-[9px] font-bold uppercase tracking-[0.3em] text-[#C84C31]">
              Chapter 06 // Owner Signal Wall // Airflow Board
            </span>
            <h1 className="mt-2 font-display text-4xl leading-none sm:text-6xl">The wall is alive.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed sm:text-base" style={{ color: "#4b4b4b" }}>
              Real owner notes pinned to the board. Tap the plus to add your own car experience.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[#161616]/10 bg-[#ECE7DF]/78 p-2 shadow-[0_16px_40px_rgba(22,22,22,0.07)] backdrop-blur-md">
            <div className="flex items-center gap-2 px-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[#161616]/60">
              <SlidersHorizontal className="h-3.5 w-3.5" />Filter
            </div>
            <DriveSelect value={modelFilter} onChange={setModelFilter} ariaLabel="Wall car filter"
              options={[{ value: "all", label: "All cars" }, ...modelOptions]} className="w-48" />
            <DriveSelect value={categoryFilter}
              onChange={(n) => setCategoryFilter(n as "all" | CommunityWallCategory)}
              ariaLabel="Wall topic filter"
              options={[{ value: "all", label: "All topics" }, ...categories.map((c) => ({ value: c, label: c }))]}
              className="w-44" />
            <DriveSelect value={sentimentFilter}
              onChange={(n) => setSentimentFilter(n as "all" | CommunityWallSentiment)}
              ariaLabel="Wall tone filter"
              options={[{ value: "all", label: "All tones" }, ...sentiments.map((s) => ({ value: s, label: s }))]}
              className="w-40" />
            <button type="button" onClick={resetFilters}
              className="min-h-10 rounded-md border border-[#161616]/10 px-3 text-xs font-mono text-[#161616]/65 transition hover:bg-[#161616]/5">
              Reset
            </button>
          </div>
        </div>

        <div className="mb-5 flex flex-wrap items-center gap-2 px-1">
          <div className="flex items-center gap-2 rounded-full border border-[#35D6FF]/35 bg-[#35D6FF]/12 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-[#0f6375]">
            <Filter className="h-3.5 w-3.5" />{filteredPosts.length} visible pins
          </div>
          <div className="rounded-full border border-[#161616]/10 bg-[#F5F1E8]/62 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-[#161616]/55">
            {isLive ? "Live wall + seeds" : "Seed wall"}
          </div>
          <div className="rounded-full border border-[#161616]/10 bg-[#F5F1E8]/62 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-[#161616]/55">
            Moderated before public
          </div>
        </div>

        {/* Wall */}
        <div className="relative min-h-[calc(100vh-220px)] w-full overflow-visible border-y border-[#161616]/10 py-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]">
          {filteredPosts.length === 0 ? (
            <div className="flex min-h-[420px] items-center justify-center px-6 text-center">
              <div className="max-w-sm rounded-lg border border-[#161616]/10 bg-[#F5F1E8]/72 p-6 backdrop-blur-md">
                <p className="font-display text-3xl">No notes in this breeze.</p>
                <p className="mt-2 text-sm text-[#161616]/62">Clear the filters or pin the first note for this lane.</p>
              </div>
            </div>
          ) : (
            <div className={wallDensity.columns}>
              {filteredPosts.map((post, index) => {
                const style       = noteStyles[index % noteStyles.length];
                const textForSpec = post.postFormat === "structured" ? compileSections(post.sections ?? {}) : post.text;
                const specificity = specificityLevel(textForSpec);
                const specStyle   = specificityStyle[specificity];
                const hasVoted    = votedPosts.has(post.id);
                const isStructured = post.postFormat === "structured" && post.sections;
                const filledSections = isStructured
                  ? sectionDefs.filter((d) => post.sections![d.key])
                  : [];

                return (
                  <div key={post.id}
                    className={`inline-block w-full break-inside-avoid ${wallDensity.wrapper}`}>
                    <article
                      className={`relative shadow-[0_18px_34px_rgba(22,22,22,0.2)] transition-[box-shadow,border-color] duration-200 hover:shadow-[0_22px_40px_rgba(22,22,22,0.24)] ${wallDensity.note} ${style.rotate}`}
                      style={{ backgroundColor: style.bg }}>
                      <div className={`absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rotate-1 border border-[#161616]/10 opacity-80 shadow-sm ${wallDensity.tape}`}
                        style={{ backgroundColor: style.tape }} />
                      <div className="wall-note-corner absolute bottom-0 right-0 h-10 w-10" />

                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div>
                          <p className={`font-mono uppercase tracking-[0.18em] text-[#161616]/55 ${wallDensity.meta}`}>
                            {post.modelName}
                          </p>
                          <h2 className={`mt-1 font-semibold capitalize leading-tight ${wallDensity.title}`} style={{ color: "#333333" }}>
                            {post.category}
                          </h2>
                        </div>
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <Pin className="h-4 w-4 text-[#161616]/45" />
                          <span className={`h-2 w-2 rounded-full ${specStyle.dot}`} title={`${specStyle.label} review`} />
                          {isStructured && (
                            <span className="rounded-sm bg-[#161616]/10 px-1 py-0.5 font-mono text-[8px] uppercase tracking-[0.1em] text-[#161616]/55">
                              Full
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Content */}
                      {isStructured ? (
                        <div className="space-y-2.5">
                          {filledSections.map((def) => (
                            <div key={def.key}>
                              <p className="font-mono text-[8px] uppercase tracking-[0.22em] text-[#161616]/45 mb-0.5">
                                {def.label}
                              </p>
                              <p className={`leading-relaxed ${wallDensity.body}`} style={{ color: "#2f2f2f" }}>
                                {post.sections![def.key]}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className={`leading-relaxed ${wallDensity.body}`} style={{ color: "#2f2f2f" }}>
                          {post.text}
                        </p>
                      )}

                      <div className="mt-4 flex flex-wrap items-center gap-1.5">
                        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-mono uppercase ${sentimentTone[post.sentiment]}`}>
                          {post.sentiment}
                        </span>
                        <span className="rounded-full border border-[#161616]/12 bg-[#F5F1E8]/45 px-2.5 py-1 text-[10px] font-mono uppercase text-[#161616]/62">
                          {post.ownershipStage}
                        </span>
                        {wallDensity.showExtra && post.variant && (
                          <span className="rounded-full border border-[#161616]/12 bg-[#161616]/6 px-2.5 py-1 text-[10px] font-mono uppercase text-[#161616]/55">
                            {post.variant}
                          </span>
                        )}
                        {wallDensity.showExtra && post.yearBought && (
                          <span className="rounded-full border border-[#161616]/12 bg-[#161616]/6 px-2.5 py-1 text-[10px] font-mono text-[#161616]/55">
                            {post.yearBought}
                          </span>
                        )}
                        {wallDensity.showExtra && post.odometer && (
                          <span className="rounded-full border border-[#161616]/12 bg-[#161616]/6 px-2.5 py-1 text-[10px] font-mono uppercase text-[#161616]/55">
                            {post.odometer}
                          </span>
                        )}
                      </div>

                      <div className="mt-3 flex items-center justify-between border-t border-[#161616]/10 pt-3">
                        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#161616]/52">
                          {post.authorName}
                        </p>
                        <button type="button" onClick={() => void voteHelpful(post.id)} disabled={hasVoted}
                          title="Mark as still true"
                          className={`flex items-center gap-1 rounded-md px-2 py-1 font-mono text-[10px] uppercase tracking-[0.1em] transition ${hasVoted ? "cursor-default text-[#2d6a4f]" : "text-[#161616]/45 hover:text-[#2d6a4f]"}`}>
                          <ThumbsUp className="h-3 w-3" />
                          {(post.helpfulCount ?? 0) > 0 ? post.helpfulCount : "Still true?"}
                        </button>
                      </div>
                    </article>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {statusMessage && !isComposerOpen && (
        <div className="fixed bottom-24 left-1/2 z-40 flex -translate-x-1/2 items-start gap-2 rounded-lg border border-[#2d6a4f]/25 bg-[#F5F1E8] px-4 py-3 text-sm text-[#1f563c] shadow-[0_18px_45px_rgba(22,22,22,0.16)]">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />{statusMessage}
        </div>
      )}

      <button type="button" onClick={openComposer}
        className="fixed bottom-6 right-5 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-[#C84C31] text-[#F5F1E8] shadow-[0_20px_50px_rgba(200,76,49,0.35)] transition hover:-translate-y-1 hover:bg-[#161616] focus:outline-none focus:ring-4 focus:ring-[#35D6FF]/30"
        aria-label="Add a wall note">
        <Plus className="h-7 w-7" />
      </button>

      {isComposerOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#161616]/35 px-3 pb-3 backdrop-blur-sm sm:items-center sm:p-6">
          <form onSubmit={submitPost}
            className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-[#161616]/10 bg-[#ECE7DF] p-5 shadow-[0_30px_90px_rgba(22,22,22,0.28)] sm:p-6">

            {/* Header */}
            <div className="mb-5 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#C84C31] text-[#F5F1E8]">
                  <MessageSquarePlus className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#C84C31]">Pin a note</p>
                  <h2 className="mt-1 text-2xl font-semibold tracking-tight">Add your ownership signal</h2>
                </div>
              </div>
              <button type="button" onClick={() => setIsComposerOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-md border border-[#161616]/10 text-[#161616]/62 transition hover:bg-[#161616]/5"
                aria-label="Close note composer">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Format toggle */}
            <div className="mb-5 flex gap-2 rounded-lg border border-[#161616]/10 bg-[#F5F1E8]/60 p-1">
              <button type="button" onClick={() => switchFormat("quick")}
                className={`flex flex-1 items-center justify-center gap-2 rounded-md py-2 text-sm font-semibold transition ${postFormat === "quick" ? "bg-[#161616] text-[#F5F1E8]" : "text-[#161616]/55 hover:text-[#161616]"}`}>
                <Zap className="h-3.5 w-3.5" />Quick note
              </button>
              <button type="button" onClick={() => switchFormat("structured")}
                className={`flex flex-1 items-center justify-center gap-2 rounded-md py-2 text-sm font-semibold transition ${postFormat === "structured" ? "bg-[#161616] text-[#F5F1E8]" : "text-[#161616]/55 hover:text-[#161616]"}`}>
                <LayoutList className="h-3.5 w-3.5" />Full review
              </button>
            </div>

            {/* Row 1: Car + Fuel & Gearbox + Year */}
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="block">
                <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.16em] text-[#161616]/55">Car</span>
                <DriveSelect value={modelId} onChange={setModelId} ariaLabel="Car" options={modelOptions} />
              </label>
              <label className="block">
                <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.16em] text-[#161616]/55">Fuel & gearbox</span>
                <DriveSelect value={variant} onChange={(n) => setVariant(n as CommunityWallVariant)}
                  ariaLabel="Fuel and gearbox" options={variants.map((v) => ({ value: v, label: v }))} />
              </label>
              <label className="block">
                <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.16em] text-[#161616]/55">Year bought</span>
                <DriveSelect value={yearBought} onChange={(n) => setYearBought(n as CommunityWallYearBought)}
                  ariaLabel="Year bought" options={yearsBought.map((y) => ({ value: y, label: y }))} />
              </label>
            </div>

            {/* Row 2: Stage + Odometer */}
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.16em] text-[#161616]/55">Stage</span>
                <DriveSelect value={ownershipStage} onChange={(n) => setOwnershipStage(n as CommunityWallOwnershipStage)}
                  ariaLabel="Ownership stage" options={ownershipStages.map((s) => ({ value: s, label: s }))} />
              </label>
              {stageHasOdometer[ownershipStage] && (
                <label className="block">
                  <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.16em] text-[#161616]/55">Odometer</span>
                  <DriveSelect value={odometer} onChange={(n) => setOdometer(n as CommunityWallOdometer)}
                    ariaLabel="Odometer range" options={odometers.map((o) => ({ value: o, label: o }))} />
                </label>
              )}
            </div>

            {/* QUICK NOTE content */}
            {postFormat === "quick" && (
              <>
                <label className="mt-4 block">
                  <span className="mb-1.5 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.16em] text-[#161616]/55">
                    Experience<span>{text.length}/420</span>
                  </span>
                  <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={420} rows={5}
                    placeholder="What should another buyer know before choosing this car?"
                    className="w-full resize-none rounded-md border border-[#161616]/10 bg-[#F5F1E8] px-3 py-3 text-sm leading-relaxed text-[#161616] outline-none transition placeholder:text-[#161616]/38 focus:border-[#C84C31]" />
                  <p className="mt-1.5 text-xs text-[#161616]/48">{charFeedback(text.length)}</p>
                </label>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {stagePrompts[ownershipStage].map((prompt) => (
                    <button key={prompt} type="button"
                      onClick={() => setText((cur) => cur.trim() ? cur : prompt)}
                      className="rounded-md border border-[#161616]/10 px-3 py-2 text-left text-sm text-[#161616]/72 transition hover:border-[#35D6FF]/45 hover:bg-[#35D6FF]/10">
                      {prompt}
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* STRUCTURED REVIEW content */}
            {postFormat === "structured" && (
              <div className="mt-4 space-y-4">
                <p className="text-xs text-[#161616]/52">
                  Fill only the sections you&apos;ve actually experienced. Empty ones are skipped.
                </p>
                {sectionDefs.map((def) => {
                  const val = sections[def.key] ?? "";
                  return (
                    <label key={def.key} className="block">
                      <span className="mb-1 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.16em] text-[#161616]/55">
                        {def.label}
                        <span className={val.length > 0 ? "text-[#161616]/40" : "opacity-0"}>{val.length}/150</span>
                      </span>
                      <p className="mb-1.5 text-[11px] text-[#161616]/42">{def.hint}</p>
                      <textarea value={val}
                        onChange={(e) => setSections((s) => ({ ...s, [def.key]: e.target.value }))}
                        maxLength={150} rows={2}
                        placeholder={`Your experience with ${def.label.toLowerCase()}...`}
                        className="w-full resize-none rounded-md border border-[#161616]/10 bg-[#F5F1E8] px-3 py-2.5 text-sm leading-relaxed text-[#161616] outline-none transition placeholder:text-[#161616]/30 focus:border-[#C84C31]" />
                    </label>
                  );
                })}
              </div>
            )}

            {/* Row 3: Topic + Name */}
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.16em] text-[#161616]/55">Topic</span>
                <DriveSelect value={category} onChange={(n) => setCategory(n as CommunityWallCategory)}
                  ariaLabel="Topic" options={categories.map((c) => ({ value: c, label: c }))} />
              </label>
              <label className="block">
                <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.16em] text-[#161616]/55">
                  Name <span className="normal-case tracking-normal opacity-60">(optional)</span>
                </span>
                <input value={authorName} onChange={(e) => setAuthorName(e.target.value)} maxLength={40}
                  placeholder="First name or nickname"
                  className="min-h-11 w-full rounded-md border border-[#161616]/10 bg-[#F5F1E8] px-3 text-sm text-[#161616] outline-none transition focus:border-[#C84C31]" />
              </label>
            </div>

            {formError && (
              <p className="mt-4 rounded-md border border-[#C84C31]/25 bg-[#C84C31]/10 px-3 py-2 text-sm text-[#8f2d1d]">
                {formError}
              </p>
            )}

            <button type="submit" disabled={isSubmitting}
              className="mt-5 flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-[#161616] px-4 py-3 text-sm font-semibold text-[#F5F1E8] transition hover:bg-[#C84C31] disabled:cursor-not-allowed disabled:opacity-60">
              <Send className="h-4 w-4" />
              {isSubmitting ? "Pinning..." : "Pin for review"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
