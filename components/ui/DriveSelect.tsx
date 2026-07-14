"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search, X } from "lucide-react";

export interface DriveSelectOption<T extends string> {
  value: T;
  label: string;
}

interface Anchor {
  top?: number;
  bottom?: number;
  left: number;
  width: number;
}

const DROPDOWN_MAX_H = 340;
const OPTION_ROW_H = 44;
const LIST_PADDING = 16;
/** Search only helps once the list is long enough to scan. */
const SEARCH_MIN_OPTIONS = 8;

function useIsMobileSelect() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px), (pointer: coarse)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return isMobile;
}

export default function DriveSelect<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  className = "",
}: {
  value: T;
  options: DriveSelectOption<T>[];
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const [listOverflows, setListOverflows] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const listboxRef = useRef<HTMLDivElement | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);
  const listboxId = useId();
  const isMobile = useIsMobileSelect();
  const showSearch = options.length >= SEARCH_MIN_OPTIONS;

  const selected = options.find((option) => option.value === value) ?? options[0];
  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(query.trim().toLowerCase())
  );

  const closeMenu = useCallback(() => {
    setOpen(false);
    setQuery("");
  }, []);

  const measureAnchor = useCallback(() => {
    if (!triggerRef.current) return null;
    const rect = triggerRef.current.getBoundingClientRect();
    const gap = 6;
    const spaceBelow = window.innerHeight - rect.bottom - gap;
    if (spaceBelow >= DROPDOWN_MAX_H || spaceBelow >= rect.top) {
      return { top: rect.bottom + gap, left: rect.left, width: rect.width };
    }
    return { bottom: window.innerHeight - rect.top + gap, left: rect.left, width: rect.width };
  }, []);

  function openMenu() {
    if (isMobile) {
      setAnchor(null);
      setOpen(true);
      return;
    }
    const next = measureAnchor();
    if (!next) return;
    setAnchor(next);
    setOpen(true);
  }

  useLayoutEffect(() => {
    if (!open || !scrollAreaRef.current) return;
    const el = scrollAreaRef.current;
    setListOverflows(el.scrollHeight > el.clientHeight + 1);
  }, [open, filteredOptions.length, query, isMobile]);

  useEffect(() => {
    if (!open) return undefined;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || listboxRef.current?.contains(target)) {
        return;
      }
      closeMenu();
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeMenu();
    }

    function onScrollOrResize() {
      // Mobile sheet is fixed to the viewport — don't chase keyboard/resize jumpiness.
      if (isMobile) return;
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) {
        closeMenu();
        return;
      }
      const next = measureAnchor();
      if (next) setAnchor(next);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [open, closeMenu, measureAnchor, isMobile]);

  const estimatedListH = Math.max(
    filteredOptions.length * OPTION_ROW_H + LIST_PADDING,
    filteredOptions.length === 0 ? 88 : 0
  );
  const cappedListH = Math.min(estimatedListH, 288);

  function selectOption(optionValue: T) {
    onChange(optionValue);
    closeMenu();
  }

  const optionList = (
    <>
      {filteredOptions.length === 0 ? (
        <div className="px-3 py-6 text-center text-sm text-[#161616]/52">No matches</div>
      ) : (
        filteredOptions.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={active}
              onClick={() => selectOption(option.value)}
              className={`flex min-h-12 w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium transition active:bg-[#F5F1E8] ${
                active ? "text-[#333333]" : "text-[#4b4b4b] hover:bg-[#F5F1E8]"
              }`}
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
                  active
                    ? "border-[#C84C31] bg-[#C84C31] text-white"
                    : "border-[#161616]/18 bg-white text-transparent"
                }`}
              >
                <Check className="h-3.5 w-3.5" strokeWidth={3} />
              </span>
              <span className="truncate">{option.label}</span>
            </button>
          );
        })
      )}
    </>
  );

  const searchField = showSearch ? (
    <div className="border-b border-[#161616]/10 p-3">
      <label className="flex min-h-11 items-center gap-2 rounded-lg border border-[#161616]/14 bg-white px-3 text-sm text-[#161616]/72">
        <Search className="h-5 w-5 shrink-0 text-[#9a9a9a]" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={`Filter ${ariaLabel.toLowerCase()}…`}
          enterKeyHint="search"
          // Never steal focus on phones — keyboard opening is the main irritation.
          autoFocus={!isMobile}
          className="w-full bg-transparent text-[#161616] text-base outline-none placeholder:text-[#8a8a8a] sm:text-sm"
        />
        {query ? (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear filter"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[#161616]/45 hover:bg-[#161616]/5"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </label>
    </div>
  ) : null;

  const mobileSheet =
    open && isMobile ? (
      <div className="fixed inset-0 z-[9999] flex flex-col justify-end" role="presentation">
        <button
          type="button"
          aria-label="Close"
          className="absolute inset-0 bg-[#161616]/35"
          onClick={closeMenu}
        />
        <div
          ref={listboxRef}
          id={listboxId}
          role="listbox"
          aria-label={ariaLabel}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          className="relative z-10 flex max-h-[min(72vh,520px)] flex-col overflow-hidden rounded-t-2xl border border-[#161616]/12 bg-[#fffdf8] shadow-[0_-12px_40px_rgba(22,22,22,0.18)]"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
          <div className="flex items-center justify-between gap-3 border-b border-[#161616]/10 px-4 py-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#C84C31]">
                Choose
              </p>
              <p className="truncate text-base font-semibold text-[#161616]">{ariaLabel}</p>
            </div>
            <button
              type="button"
              onClick={closeMenu}
              aria-label="Close list"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#161616]/6 text-[#161616]/70"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {searchField}

          <div
            ref={scrollAreaRef}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-1"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {optionList}
          </div>
        </div>
      </div>
    ) : null;

  const desktopDropdown =
    open && !isMobile && anchor ? (
      <div
        ref={listboxRef}
        id={listboxId}
        role="listbox"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        style={{
          position: "fixed",
          top: anchor.top,
          bottom: anchor.bottom,
          left: anchor.left,
          minWidth: anchor.width,
          zIndex: 9999,
        }}
        className="w-max overflow-hidden rounded-xl border border-[#161616]/12 bg-[#fffdf8] shadow-[0_18px_50px_rgba(22,22,22,0.16)]"
      >
        {searchField}

        <div
          ref={scrollAreaRef}
          style={{
            maxHeight: cappedListH,
            overscrollBehavior: "contain",
            WebkitOverflowScrolling: "touch",
          }}
          className={`min-w-56 py-2 ${listOverflows ? "overflow-y-auto" : "overflow-y-hidden"}`}
        >
          {optionList}
        </div>

        {filteredOptions.length > 0 && !listOverflows && (
          <div className="border-t border-[#161616]/8 px-4 py-2 text-center text-[11px] text-[#161616]/42">
            All options shown
          </div>
        )}
        {filteredOptions.length > 0 && listOverflows && (
          <div className="border-t border-[#161616]/8 px-4 py-2 text-center text-[11px] text-[#161616]/42">
            Scroll for more
          </div>
        )}
      </div>
    ) : null;

  return (
    <div className={`relative min-w-40 ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={() => (open ? closeMenu() : openMenu())}
        className="flex min-h-11 w-full items-center justify-between gap-4 rounded-xl border border-[#161616]/12 bg-[#F5F1E8] px-3 py-2 text-left text-sm text-[#161616] shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_8px_20px_rgba(22,22,22,0.04)] transition hover:border-[#C84C31]/30 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_10px_24px_rgba(22,22,22,0.07)] focus:outline-none focus:ring-4 focus:ring-[#C84C31]/15"
      >
        <span className="truncate">{selected?.label}</span>
        <span className="flex items-center gap-2 border-l border-[#161616]/10 pl-3 text-[#4b4b4b]">
          <ChevronDown className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} />
        </span>
      </button>

      {typeof document !== "undefined" &&
        createPortal(isMobile ? mobileSheet : desktopDropdown, document.body)}
    </div>
  );
}
