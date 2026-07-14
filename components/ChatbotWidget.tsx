"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  MessageSquare,
  X,
  RefreshCw,
  Check,
  Search,
  ChevronRight,
  Sliders,
  Maximize2,
  Minimize2
} from "lucide-react";
import { brands, models, variants, features } from "@/lib/data";
import { Model, Variant, Feature, Fuel, Transmission } from "@/lib/types";

// Popular features subset for easy quick-access checkboxes
const POPULAR_FEATURE_IDS = [
  "camera-360",
  "adas-l2",
  "pano-sunroof",
  "sunroof",
  "ventilated-seats",
  "cruise-control",
  "airbags-6",
  "esc",
  "rear-camera",
  "wireless-charger"
];

interface ChatMessage {
  id: string;
  sender: "bot" | "user";
  type: "text" | "feature-select" | "fuel-select" | "transmission-select" | "budget-select" | "results";
  text: string;
  timestamp: Date;
  meta?: any;
}

export default function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [featureSearchQuery, setFeatureSearchQuery] = useState("");
  const [selectedFuels, setSelectedFuels] = useState<Fuel[]>(["petrol", "diesel", "ev", "cng"]);
  const [selectedTransmissions, setSelectedTransmissions] = useState<string[]>(["manual", "automatic"]);
  const [minBudgetLakh, setMinBudgetLakh] = useState<number>(5);
  const [maxBudgetLakh, setMaxBudgetLakh] = useState<number>(60);
  const [isCustomBudget, setIsCustomBudget] = useState(false);
  const [comparisonSelections, setComparisonSelections] = useState<string[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize conversation
  const startConversation = () => {
    setSelectedFeatures([]);
    setFeatureSearchQuery("");
    setSelectedFuels(["petrol", "diesel", "ev", "cng"]);
    setSelectedTransmissions(["manual", "automatic"]);
    setMinBudgetLakh(5);
    setMaxBudgetLakh(60);
    setIsCustomBudget(false);
    setComparisonSelections([]);

    const initialMessages: ChatMessage[] = [
      {
        id: "msg-1",
        sender: "bot",
        type: "text",
        text: "Hello! I am the DriveScope Assistant. Let me help you find the perfect car variant based on your desired features, fuel choice, gearbox preference, and budget.",
        timestamp: new Date()
      },
      {
        id: "msg-2",
        sender: "bot",
        type: "feature-select",
        text: "Which features are must-haves for you? Select all that apply or search the database below:",
        timestamp: new Date()
      }
    ];
    setMessages(initialMessages);
  };

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      startConversation();
    }
  }, [isOpen]);

  // Scroll to bottom whenever messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle Feature Confirmation
  const handleConfirmFeatures = () => {
    const selectedNames = features
      .filter((f) => selectedFeatures.includes(f.id))
      .map((f) => f.name);

    const userMsgText = selectedNames.length > 0
      ? `I want: ${selectedNames.join(", ")}`
      : "I don't have any specific feature requirements.";

    const newMessages: ChatMessage[] = [
      ...messages,
      {
        id: `user-features-${Date.now()}`,
        sender: "user",
        type: "text",
        text: userMsgText,
        timestamp: new Date()
      },
      {
        id: `bot-fuel-prompt-${Date.now()}`,
        sender: "bot",
        type: "fuel-select",
        text: "Got it. What fuel type preferences do you have?",
        timestamp: new Date()
      }
    ];

    setMessages(newMessages);
  };

  // Handle Fuel Selection
  const toggleFuel = (fuel: Fuel) => {
    if (selectedFuels.includes(fuel)) {
      if (selectedFuels.length > 1) {
        setSelectedFuels(selectedFuels.filter((f) => f !== fuel));
      }
    } else {
      setSelectedFuels([...selectedFuels, fuel]);
    }
  };

  const handleConfirmFuel = () => {
    const fuelLabels = selectedFuels.map((f) => f.toUpperCase());
    const userMsgText = `Fuel Preference: ${fuelLabels.join(", ")}`;

    const newMessages: ChatMessage[] = [
      ...messages,
      {
        id: `user-fuel-${Date.now()}`,
        sender: "user",
        type: "text",
        text: userMsgText,
        timestamp: new Date()
      },
      {
        id: `bot-trans-prompt-${Date.now()}`,
        sender: "bot",
        type: "transmission-select",
        text: "Which gearbox type do you prefer?",
        timestamp: new Date()
      }
    ];

    setMessages(newMessages);
  };

  // Handle Transmission Selection
  const toggleTransmission = (type: string) => {
    if (selectedTransmissions.includes(type)) {
      if (selectedTransmissions.length > 1) {
        setSelectedTransmissions(selectedTransmissions.filter((t) => t !== type));
      }
    } else {
      setSelectedTransmissions([...selectedTransmissions, type]);
    }
  };

  const handleConfirmTransmission = () => {
    const transLabels = selectedTransmissions.map((t) => t.charAt(0).toUpperCase() + t.slice(1));
    const userMsgText = `Gearbox Preference: ${transLabels.join(", ")}`;

    const newMessages: ChatMessage[] = [
      ...messages,
      {
        id: `user-trans-${Date.now()}`,
        sender: "user",
        type: "text",
        text: userMsgText,
        timestamp: new Date()
      },
      {
        id: `bot-budget-prompt-${Date.now()}`,
        sender: "bot",
        type: "budget-select",
        text: "Finally, what is your Ex-showroom budget range?",
        timestamp: new Date()
      }
    ];

    setMessages(newMessages);
  };

  // Handle Preset Budget Choice
  const handleSelectPresetBudget = (minLakh: number, maxLakh: number, label: string) => {
    setMinBudgetLakh(minLakh);
    setMaxBudgetLakh(maxLakh);
    submitBudgetSelection(minLakh * 100000, maxLakh * 100000, `Budget: ${label}`);
  };

  // Submit custom budget
  const handleConfirmCustomBudget = () => {
    submitBudgetSelection(
      minBudgetLakh * 100000,
      maxBudgetLakh * 100000,
      `Budget: ₹${minBudgetLakh}L - ₹${maxBudgetLakh}L`
    );
  };

  const submitBudgetSelection = (minPrice: number, maxPrice: number, label: string) => {
    // Run the matching engine
    const matchedModels = runMatchingEngine(minPrice, maxPrice);

    const newMessages: ChatMessage[] = [
      ...messages,
      {
        id: `user-budget-${Date.now()}`,
        sender: "user",
        type: "text",
        text: label,
        timestamp: new Date()
      },
      {
        id: `bot-results-${Date.now()}`,
        sender: "bot",
        type: "results",
        text: matchedModels.length > 0
          ? `I analyzed the variants. Here are the options that fit your specifications, ranked by feature matches:`
          : "I couldn't find any variants matching your requirements within that budget range. Try adjusting your preferences.",
        timestamp: new Date(),
        meta: { results: matchedModels }
      }
    ];

    setMessages(newMessages);
  };

  // The Matching Engine
  const runMatchingEngine = (minPrice: number, maxPrice: number) => {
    // Filter variants based on Price, Fuel, and Transmission criteria
    const validVariants = variants.filter((v) => {
      // 1. Price check
      if (v.priceExShowroom < minPrice || v.priceExShowroom > maxPrice) return false;

      // 2. Fuel check
      if (!selectedFuels.includes(v.fuel)) return false;

      // 3. Transmission check
      const isManualVariant = v.transmission === "MT";
      const isAutoVariant = ["AMT", "CVT", "DCT", "AT"].includes(v.transmission);
      
      const wantsManual = selectedTransmissions.includes("manual");
      const wantsAuto = selectedTransmissions.includes("automatic");

      if (isManualVariant && !wantsManual) return false;
      if (isAutoVariant && !wantsAuto) return false;

      return true;
    });

    // Group variants by model, scoring feature matches
    const modelToBestVariant: Record<
      string,
      {
        variant: Variant;
        matchedFeatures: string[];
        missingFeatures: string[];
        matchCount: number;
      }
    > = {};

    validVariants.forEach((v) => {
      const matched = v.featureIds.filter((fId) => selectedFeatures.includes(fId));
      const missing = selectedFeatures.filter((fId) => !v.featureIds.includes(fId));
      const matchCount = matched.length;

      // Keep variant with maximum matching features per model
      if (
        !modelToBestVariant[v.modelId] ||
        modelToBestVariant[v.modelId].matchCount < matchCount ||
        (modelToBestVariant[v.modelId].matchCount === matchCount &&
          v.priceExShowroom < modelToBestVariant[v.modelId].variant.priceExShowroom)
      ) {
        modelToBestVariant[v.modelId] = {
          variant: v,
          matchedFeatures: matched,
          missingFeatures: missing,
          matchCount
        };
      }
    });

    // Map to models with brand details and sort
    const matchedModelsList = Object.entries(modelToBestVariant)
      .map(([modelId, info]) => {
        const model = models.find((m) => m.id === modelId);
        if (!model) return null;
        
        // Find brand for name formatting
        const brand = brands.find((b) => b.id === model.brandId);

        return {
          model,
          brandName: brand ? brand.name : "",
          bestVariant: info.variant,
          matchedFeatures: info.matchedFeatures,
          missingFeatures: info.missingFeatures,
          matchCount: info.matchCount,
          totalSelectedCount: selectedFeatures.length,
          matchPercentage: selectedFeatures.length > 0 ? (info.matchCount / selectedFeatures.length) * 100 : 100
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    // Sort by match percentage (descending) and then ex-showroom minimum price (ascending)
    matchedModelsList.sort((a, b) => {
      if (b.matchPercentage !== a.matchPercentage) {
        return b.matchPercentage - a.matchPercentage;
      }
      return a.model.priceRange.min - b.model.priceRange.min;
    });

    return matchedModelsList; // Return all matching options to "show all"
  };

  // Toggle comparison selections
  const toggleComparisonSelection = (modelId: string) => {
    if (comparisonSelections.includes(modelId)) {
      setComparisonSelections(comparisonSelections.filter((id) => id !== modelId));
    } else {
      setComparisonSelections([...comparisonSelections, modelId]);
    }
  };

  // Toggle selection helper
  const toggleFeature = (fId: string) => {
    if (selectedFeatures.includes(fId)) {
      setSelectedFeatures(selectedFeatures.filter((id) => id !== fId));
    } else {
      setSelectedFeatures([...selectedFeatures, fId]);
    }
  };

  // Search feature catalog helper
  const filteredSearchFeatures = featureSearchQuery.trim()
    ? features
        .filter(
          (f) =>
            !POPULAR_FEATURE_IDS.includes(f.id) &&
            f.name.toLowerCase().includes(featureSearchQuery.toLowerCase())
        )
        .slice(0, 5)
    : [];

  return (
    <>
      {/* Floating Launcher Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-[#C84C31] text-[#F5F1E8] shadow-2xl flex items-center justify-center cursor-pointer transition-all duration-300 hover:scale-105 active:scale-95 group border border-[#161616]/10"
          aria-label="Open DriveScope Assistant"
        >
          <MessageSquare className="h-6 w-6" />
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C84C31] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-[#C84C31] border border-[#F5F1E8]"></span>
          </span>
          
          {/* Tooltip */}
          <div className="absolute right-16 bg-[#F5F1E8] text-[#161616] text-xs font-mono py-1.5 px-3 rounded-lg border border-[#161616]/10 opacity-0 scale-95 origin-right transition-all group-hover:opacity-100 group-hover:scale-100 shadow-md whitespace-nowrap pointer-events-none">
            Find Cars by Features
          </div>
        </button>
      )}

      {/* Chat Window Panel */}
      {isOpen && (
        <div
          className={`fixed z-50 border border-[#161616]/10 flex flex-col overflow-hidden shadow-2xl transition-all duration-300 ${
            isFullScreen
              ? "inset-0 w-screen h-screen rounded-none"
              : "bottom-6 right-6 w-[380px] h-[580px] max-h-[85vh] max-w-[calc(100vw-2rem)] rounded-2xl"
          }`}
          style={{
            background: "rgba(245, 241, 232, 0.98)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
          }}
        >
          {/* Panel Header */}
          <div className="px-4 py-3 bg-[#F5F1E8] border-b border-[#161616]/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <div>
                <h3 className="font-mono text-sm font-bold text-[#161616] tracking-tight">
                  DriveScope Assistant
                </h3>
                <p className="text-[10px] text-[#161616]/65 font-mono">
                  Guided Car Variant Finder
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-1.5">
              {/* Fullscreen Toggle */}
              <button
                onClick={() => setIsFullScreen(!isFullScreen)}
                className="p-1 rounded-lg text-[#161616]/60 hover:text-[#161616] hover:bg-[#161616]/5 transition cursor-pointer"
                title={isFullScreen ? "Exit Full Screen" : "Make Full Screen"}
                aria-label={isFullScreen ? "Exit Full Screen" : "Make Full Screen"}
              >
                {isFullScreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
              
              {/* Close Panel */}
              <button
                onClick={() => {
                  setIsOpen(false);
                  setIsFullScreen(false);
                }}
                className="p-1 rounded-lg text-[#161616]/60 hover:text-[#161616] hover:bg-[#161616]/5 transition cursor-pointer"
                aria-label="Close Assistant"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 font-sans text-sm">
            {messages.map((msg, index) => {
              const isBot = msg.sender === "bot";
              return (
                <div key={msg.id} className={`flex flex-col ${isBot ? "items-start" : "items-end"}`}>
                  
                  {/* Bubble */}
                  <div
                    className={`max-w-[85%] rounded-xl px-3.5 py-2.5 shadow-sm font-sans ${
                      isBot
                        ? "bg-[#ECE7DF] text-[#161616] border border-[#161616]/5"
                        : "bg-[#C84C31] text-[#F5F1E8]"
                    }`}
                  >
                    <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                  </div>

                  {/* Message timestamp */}
                  <span className="text-[9px] text-[#161616]/40 font-mono mt-1 px-1">
                    {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>

                  {/* Interactive Option Components */}
                  {isBot && msg.type === "feature-select" && index === messages.length - 1 && (
                    <div className="mt-3 w-full bg-[#ECE7DF]/50 border border-[#161616]/10 rounded-xl p-3.5 space-y-3 shadow-inner">
                      <p className="font-mono text-[10px] tracking-wide text-[#161616]/70 uppercase font-bold">
                        Key Features Checklist:
                      </p>
                      
                      <div className="grid grid-cols-2 gap-2">
                        {POPULAR_FEATURE_IDS.map((fId) => {
                          const feat = features.find((f) => f.id === fId);
                          if (!feat) return null;
                          const selected = selectedFeatures.includes(fId);
                          return (
                            <button
                              key={fId}
                              onClick={() => toggleFeature(fId)}
                              className={`flex items-center gap-2 p-2 rounded-lg border text-left text-xs font-mono transition cursor-pointer ${
                                selected
                                  ? "bg-[#C84C31] text-[#F5F1E8] border-[#C84C31]"
                                  : "bg-[#F5F1E8] text-[#161616] border-[#161616]/10 hover:border-[#161616]/30"
                              }`}
                            >
                              <div className={`h-3.5 w-3.5 rounded border flex items-center justify-center flex-shrink-0 ${
                                selected ? "border-[#F5F1E8]" : "border-[#161616]/20 bg-[#F5F1E8]"
                              }`}>
                                {selected && <Check className="h-2.5 w-2.5" />}
                              </div>
                              <span className="truncate">{feat.name}</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Feature search database bar */}
                      <div className="space-y-1.5 pt-1 border-t border-[#161616]/5">
                        <div className="relative">
                          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#161616]/40" />
                          <input
                            type="text"
                            placeholder="Search more features (e.g. ADAS, ESC)..."
                            value={featureSearchQuery}
                            onChange={(e) => setFeatureSearchQuery(e.target.value)}
                            className="w-full pl-8 pr-3 py-2 border border-[#161616]/15 rounded-lg bg-[#F5F1E8] text-xs font-mono focus:outline-none focus:border-[#C84C31]"
                          />
                        </div>

                        {/* Search Results */}
                        {filteredSearchFeatures.length > 0 && (
                          <div className="bg-[#F5F1E8] border border-[#161616]/10 rounded-lg p-1.5 space-y-1 shadow-sm max-h-32 overflow-y-auto">
                            {filteredSearchFeatures.map((feat) => {
                              const selected = selectedFeatures.includes(feat.id);
                              return (
                                <button
                                  key={feat.id}
                                  onClick={() => toggleFeature(feat.id)}
                                  className={`w-full flex items-center justify-between p-1.5 rounded text-xs font-mono text-left cursor-pointer transition ${
                                    selected ? "bg-[#C84C31]/10 text-[#C84C31]" : "hover:bg-[#161616]/5"
                                  }`}
                                >
                                  <span>{feat.name}</span>
                                  <span className="text-[10px] text-[#161616]/45 italic">
                                    {feat.category}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={handleConfirmFeatures}
                        className="w-full py-2.5 rounded-lg bg-[#C84C31] text-[#F5F1E8] text-xs font-mono font-bold hover:opacity-90 transition cursor-pointer flex items-center justify-center gap-1"
                      >
                        Confirm Features ({selectedFeatures.length} selected)
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}

                  {isBot && msg.type === "fuel-select" && index === messages.length - 1 && (
                    <div className="mt-3 w-full bg-[#ECE7DF]/50 border border-[#161616]/10 rounded-xl p-3.5 space-y-3 shadow-inner">
                      <p className="font-mono text-[10px] tracking-wide text-[#161616]/70 uppercase font-bold">
                        Select Fuel Type:
                      </p>

                      <div className="grid grid-cols-2 gap-2">
                        {(["petrol", "diesel", "ev", "cng"] as Fuel[]).map((fuel) => {
                          const selected = selectedFuels.includes(fuel);
                          return (
                            <button
                              key={fuel}
                              onClick={() => toggleFuel(fuel)}
                              className={`flex items-center gap-2 p-2 rounded-lg border text-left text-xs font-mono transition cursor-pointer ${
                                selected
                                  ? "bg-[#C84C31] text-[#F5F1E8] border-[#C84C31]"
                                  : "bg-[#F5F1E8] text-[#161616] border-[#161616]/10 hover:border-[#161616]/30"
                              }`}
                            >
                              <div className={`h-3.5 w-3.5 rounded border flex items-center justify-center flex-shrink-0 ${
                                selected ? "border-[#F5F1E8]" : "border-[#161616]/20 bg-[#F5F1E8]"
                              }`}>
                                {selected && <Check className="h-2.5 w-2.5" />}
                              </div>
                              <span className="capitalize">{fuel}</span>
                            </button>
                          );
                        })}
                      </div>

                      <button
                        onClick={handleConfirmFuel}
                        className="w-full py-2.5 rounded-lg bg-[#C84C31] text-[#F5F1E8] text-xs font-mono font-bold hover:opacity-90 transition cursor-pointer flex items-center justify-center gap-1"
                      >
                        Confirm Fuel Selection
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}

                  {isBot && msg.type === "transmission-select" && index === messages.length - 1 && (
                    <div className="mt-3 w-full bg-[#ECE7DF]/50 border border-[#161616]/10 rounded-xl p-3.5 space-y-3 shadow-inner">
                      <p className="font-mono text-[10px] tracking-wide text-[#161616]/70 uppercase font-bold">
                        Select Gearbox Type:
                      </p>

                      <div className="grid grid-cols-2 gap-2">
                        {["manual", "automatic"].map((type) => {
                          const selected = selectedTransmissions.includes(type);
                          return (
                            <button
                              key={type}
                              onClick={() => toggleTransmission(type)}
                              className={`flex items-center gap-2 p-2 rounded-lg border text-left text-xs font-mono transition cursor-pointer ${
                                selected
                                  ? "bg-[#C84C31] text-[#F5F1E8] border-[#C84C31]"
                                  : "bg-[#F5F1E8] text-[#161616] border-[#161616]/10 hover:border-[#161616]/30"
                              }`}
                            >
                              <div className={`h-3.5 w-3.5 rounded border flex items-center justify-center flex-shrink-0 ${
                                selected ? "border-[#F5F1E8]" : "border-[#161616]/20 bg-[#F5F1E8]"
                              }`}>
                                {selected && <Check className="h-2.5 w-2.5" />}
                              </div>
                              <span className="capitalize">{type}</span>
                            </button>
                          );
                        })}
                      </div>

                      <button
                        onClick={handleConfirmTransmission}
                        className="w-full py-2.5 rounded-lg bg-[#C84C31] text-[#F5F1E8] text-xs font-mono font-bold hover:opacity-90 transition cursor-pointer flex items-center justify-center gap-1"
                      >
                        Confirm Gearbox Selection
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}

                  {isBot && msg.type === "budget-select" && index === messages.length - 1 && (
                    <div className="mt-3 w-full bg-[#ECE7DF]/50 border border-[#161616]/10 rounded-xl p-3.5 space-y-3 shadow-inner">
                      <p className="font-mono text-[10px] tracking-wide text-[#161616]/70 uppercase font-bold">
                        Choose Ex-Showroom Budget:
                      </p>

                      {!isCustomBudget ? (
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => handleSelectPresetBudget(0, 10, "Under ₹10 Lakh")}
                              className="py-2 px-3 bg-[#F5F1E8] hover:border-[#C84C31]/40 border border-[#161616]/10 rounded-lg text-xs font-mono text-[#161616] cursor-pointer text-center"
                            >
                              Under ₹10 Lakh
                            </button>
                            <button
                              onClick={() => handleSelectPresetBudget(10, 20, "₹10L - ₹20 Lakh")}
                              className="py-2 px-3 bg-[#F5F1E8] hover:border-[#C84C31]/40 border border-[#161616]/10 rounded-lg text-xs font-mono text-[#161616] cursor-pointer text-center"
                            >
                              ₹10L - ₹20 Lakh
                            </button>
                            <button
                              onClick={() => handleSelectPresetBudget(20, 50, "₹20L - ₹50 Lakh")}
                              className="py-2 px-3 bg-[#F5F1E8] hover:border-[#C84C31]/40 border border-[#161616]/10 rounded-lg text-xs font-mono text-[#161616] cursor-pointer text-center"
                            >
                              ₹20L - ₹50 Lakh
                            </button>
                            <button
                              onClick={() => handleSelectPresetBudget(50, 200, "Above ₹50 Lakh")}
                              className="py-2 px-3 bg-[#F5F1E8] hover:border-[#C84C31]/40 border border-[#161616]/10 rounded-lg text-xs font-mono text-[#161616] cursor-pointer text-center"
                            >
                              Above ₹50 Lakh
                            </button>
                          </div>
                          
                          <button
                            onClick={() => setIsCustomBudget(true)}
                            className="w-full py-2 bg-[#F5F1E8] border border-dashed border-[#161616]/20 rounded-lg text-xs font-mono text-[#C84C31] font-bold flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Sliders className="h-3 w-3" />
                            Use Custom Budget Slider
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="space-y-3">
                            <div className="space-y-1">
                              <div className="flex justify-between font-mono text-xs text-[#161616]">
                                <span>Min Budget:</span>
                                <span className="font-bold">₹{minBudgetLakh} Lakh</span>
                              </div>
                              <input
                                type="range"
                                min="3"
                                max="100"
                                value={minBudgetLakh}
                                onChange={(e) => setMinBudgetLakh(Number(e.target.value))}
                                className="w-full accent-[#C84C31]"
                              />
                            </div>

                            <div className="space-y-1">
                              <div className="flex justify-between font-mono text-xs text-[#161616]">
                                <span>Max Budget:</span>
                                <span className="font-bold">₹{maxBudgetLakh} Lakh</span>
                              </div>
                              <input
                                type="range"
                                min="5"
                                max="200"
                                value={maxBudgetLakh}
                                onChange={(e) => setMaxBudgetLakh(Number(e.target.value))}
                                className="w-full accent-[#C84C31]"
                              />
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => setIsCustomBudget(false)}
                              className="px-3 py-2 bg-[#F5F1E8] border border-[#161616]/10 rounded-lg text-xs font-mono text-[#161616]/70 hover:bg-[#161616]/5 cursor-pointer"
                            >
                              Back
                            </button>
                            <button
                              onClick={handleConfirmCustomBudget}
                              disabled={minBudgetLakh >= maxBudgetLakh}
                              className="flex-1 py-2 bg-[#C84C31] text-[#F5F1E8] text-xs font-mono font-bold rounded-lg hover:opacity-90 transition disabled:opacity-50 cursor-pointer"
                            >
                              Confirm: ₹{minBudgetLakh}L - ₹{maxBudgetLakh}L
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {isBot && msg.type === "results" && msg.meta?.results && (
                    <div className="mt-3 w-full space-y-4">
                      {/* Comparison sticky header selection bar inside results */}
                      {comparisonSelections.length > 0 && (
                        <div className="p-3 bg-[#C84C31]/5 border border-[#C84C31]/20 rounded-xl flex items-center justify-between gap-3 animate-fade-in shadow-sm">
                          <div className="font-mono text-[11px] text-[#161616]/85">
                            <strong>{comparisonSelections.length}</strong> {comparisonSelections.length === 1 ? "car" : "cars"} selected
                            {comparisonSelections.length < 2 && " (Select at least 2 to compare)"}
                          </div>
                          <Link
                            href={`/compare?cars=${comparisonSelections.join(",")}`}
                            onClick={(e) => {
                              if (comparisonSelections.length < 2) {
                                e.preventDefault();
                              }
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold text-center transition ${
                              comparisonSelections.length >= 2
                                ? "bg-[#C84C31] text-[#F5F1E8] hover:opacity-90 cursor-pointer"
                                : "bg-[#161616]/10 text-[#161616]/40 cursor-not-allowed"
                            }`}
                          >
                            Compare Selected
                          </Link>
                        </div>
                      )}

                      {/* Carousel wrapper displaying ALL matched cars */}
                      <div className="flex overflow-x-auto gap-3 pb-2 pt-1 px-0.5 scrollbar-thin">
                        {msg.meta.results.map((res: any) => {
                          const modelPriceMin = (res.model.priceRange.min / 100000).toFixed(1);
                          const modelPriceMax = (res.model.priceRange.max / 100000).toFixed(1);
                          const isSelectedForCompare = comparisonSelections.includes(res.model.id);
                          
                          return (
                            <div
                              key={res.model.id}
                              className="w-[260px] flex-shrink-0 bg-[#F5F1E8] border border-[#161616]/15 rounded-xl p-3 shadow-sm flex flex-col justify-between"
                            >
                              <div className="space-y-2">
                                {/* Car Silhouette / Hero image */}
                                <div className="h-28 w-full bg-[#ECE7DF] rounded-lg overflow-hidden relative flex items-center justify-center">
                                  {res.model.heroImage ? (
                                    <img
                                      src={res.model.heroImage}
                                      alt={res.model.name}
                                      className="object-cover h-full w-full opacity-90"
                                      onError={(e) => {
                                        (e.target as HTMLElement).style.display = 'none';
                                      }}
                                    />
                                  ) : null}
                                  <div className="absolute top-2 left-2 bg-[#C84C31] text-[#F5F1E8] text-[9px] font-mono font-bold py-0.5 px-1.5 rounded-full">
                                    {res.matchCount} / {res.totalSelectedCount} Matches
                                  </div>
                                  
                                  {/* Select checkbox for comparison */}
                                  <button
                                    onClick={() => toggleComparisonSelection(res.model.id)}
                                    className={`absolute top-2 right-2 px-2 py-0.5 rounded text-[9px] font-mono font-bold border transition cursor-pointer shadow-sm ${
                                      isSelectedForCompare
                                        ? "bg-[#C84C31] text-[#F5F1E8] border-[#C84C31]"
                                        : "bg-[#F5F1E8]/90 text-[#161616] border-[#161616]/15 hover:border-[#161616]/30"
                                    }`}
                                  >
                                    {isSelectedForCompare ? "✓ Selected" : "+ Compare"}
                                  </button>
                                </div>

                                {/* Title & Brand */}
                                <div>
                                  <span className="font-mono text-[9px] text-[#161616]/50 uppercase tracking-wider block">
                                    {res.brandName}
                                  </span>
                                  {/* Using font-sans here ensures names render reliably without display-font layout issues */}
                                  <h4 className="font-sans text-sm font-bold text-[#161616] leading-tight mt-0.5">
                                    {res.model.name}
                                  </h4>
                                  <p className="font-mono text-xs font-semibold text-[#C84C31] mt-0.5">
                                    ₹{modelPriceMin}L - ₹{modelPriceMax}L
                                  </p>
                                  <p className="font-mono text-[10px] text-[#161616]/65 mt-0.5">
                                    Best trim: {res.bestVariant.name} ({res.bestVariant.fuel.toUpperCase()} · {res.bestVariant.transmission} · ₹{(res.bestVariant.priceExShowroom / 100000).toFixed(2)}L)
                                  </p>
                                </div>

                                {/* Feature checklist details */}
                                {res.totalSelectedCount > 0 && (
                                  <div className="space-y-1 pt-1.5 border-t border-[#161616]/5">
                                    <p className="font-mono text-[9px] text-[#161616]/50 uppercase tracking-wider">
                                      Feature Checklist:
                                    </p>
                                    <div className="flex flex-wrap gap-1">
                                      {res.matchedFeatures.map((fId: string) => {
                                        const feat = features.find((f) => f.id === fId);
                                        return (
                                          <span
                                            key={fId}
                                            className="text-[9px] font-mono bg-emerald-500/10 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-500/20"
                                          >
                                            ✓ {feat?.name}
                                          </span>
                                        );
                                      })}
                                      {res.missingFeatures.map((fId: string) => {
                                        const feat = features.find((f) => f.id === fId);
                                        return (
                                          <span
                                            key={fId}
                                            className="text-[9px] font-mono bg-[#161616]/5 text-[#161616]/45 px-1.5 py-0.5 rounded border border-[#161616]/10 line-through"
                                          >
                                            ✕ {feat?.name}
                                          </span>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Card CTAs */}
                              <div className="grid grid-cols-2 gap-1.5 pt-3 mt-3 border-t border-[#161616]/10">
                                <Link
                                  href={`/cars/${res.model.id}`}
                                  className="py-1.5 px-2 bg-[#ECE7DF] hover:bg-[#161616]/5 border border-[#161616]/10 text-center font-mono text-[10px] font-bold text-[#161616] rounded-md transition"
                                >
                                  View Specs
                                </Link>
                                <Link
                                  href={`/compare?cars=${res.model.id}`}
                                  className="py-1.5 px-2 bg-[#C84C31] text-[#F5F1E8] text-center font-mono text-[10px] font-bold rounded-md hover:opacity-90 transition"
                                >
                                  Quick Compare
                                </Link>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Bot restart / retry query */}
                      {index === messages.length - 1 && (
                        <div className="flex justify-between items-center pt-1">
                          <span className="text-[10px] text-[#161616]/55 font-mono">
                            Found {msg.meta.results.length} matched cars
                          </span>
                          <button
                            onClick={startConversation}
                            className="flex items-center gap-1.5 text-xs font-mono font-bold text-[#C84C31] hover:underline bg-transparent border-0 cursor-pointer"
                          >
                            <RefreshCw className="h-3 w-3" />
                            Search Again
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Reset / Status bar */}
          <div className="p-3 bg-[#ECE7DF] border-t border-[#161616]/10 flex items-center justify-between text-xs font-mono text-[#161616]/65">
            <button
              onClick={startConversation}
              className="flex items-center gap-1 hover:text-[#C84C31] transition cursor-pointer"
            >
              <RefreshCw className="h-3 w-3" />
              Reset Conversation
            </button>
            <span>Ask questions above</span>
          </div>
        </div>
      )}
    </>
  );
}
