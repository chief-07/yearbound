"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";

export type TourStepId =
  | "wally"
  | "toggle"
  | "timetravel"
  | "send"
  | "send_setup"
  | "send_memo"
  | "hold_decision";

export interface TourStepConfig {
  id: TourStepId;
  targetSelector: string;
  body: string;
  interactive?: boolean;
  ctaLabel?: string;
  hintText?: string;
  reserveBottomPx?: number;
  dismissDelayMs?: number;
  hideSkip?: boolean;
}

interface AppTourProps {
  isOpen: boolean;
  steps: TourStepConfig[];
  currentIndex: number;
  shellRef: React.RefObject<HTMLDivElement | null>;
  onNext: () => void;
  onSkip: () => void;
}

interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
  shellWidth: number;
  shellHeight: number;
}

export function AppTour({
  isOpen,
  steps,
  currentIndex,
  shellRef,
  onNext,
  onSkip,
}: AppTourProps) {
  const step = steps[currentIndex];
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [rect, setRect] = useState<Rect | null>(null);
  const [cardHeight, setCardHeight] = useState<number>(130);
  const stepKey = isOpen && step ? `${currentIndex}:${step.id}` : null;
  const [unlockedStepKey, setUnlockedStepKey] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !step?.dismissDelayMs || !stepKey || !rect) return;
    if (unlockedStepKey === stepKey) return;
    const timer = setTimeout(() => {
      setUnlockedStepKey(stepKey);
    }, step.dismissDelayMs);
    return () => clearTimeout(timer);
  }, [isOpen, stepKey, step?.dismissDelayMs, Boolean(rect), unlockedStepKey]);

  useEffect(() => {
    if (!isOpen) {
      setUnlockedStepKey(null);
    }
  }, [isOpen]);

  const canDismiss = !step?.dismissDelayMs || unlockedStepKey === stepKey;

  const measure = () => {
    if (!isOpen || !step || !shellRef.current) return;
    const shell = shellRef.current;
    const target = shell.querySelector(step.targetSelector) as HTMLElement | null;
    if (!target) {
      setRect(null);
      return;
    }

    const sRect = shell.getBoundingClientRect();
    const tRect = target.getBoundingClientRect();

    // Ignore degenerate zero-sized / hidden targets
    if (tRect.width === 0 || tRect.height === 0) {
      setRect(null);
      return;
    }

    setRect({
      left: tRect.left - sRect.left,
      top: tRect.top - sRect.top,
      width: tRect.width,
      height: tRect.height,
      right: tRect.right - sRect.left,
      bottom: tRect.bottom - sRect.top,
      shellWidth: sRect.width,
      shellHeight: sRect.height,
    });
  };

  useEffect(() => {
    if (!isOpen || !step || !shellRef.current) return;
    const shell = shellRef.current;
    const target = shell.querySelector(step.targetSelector) as HTMLElement | null;
    if (target) {
      try {
        target.scrollIntoView({ behavior: "smooth", block: "nearest" });
      } catch {}
    }

    measure();
    const raf1 = requestAnimationFrame(measure);
    const t1 = setTimeout(measure, 80);
    const t2 = setTimeout(measure, 260);

    const handleUpdate = () => measure();
    window.addEventListener("resize", handleUpdate);
    shell.addEventListener("scroll", handleUpdate, true);

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(handleUpdate);
      ro.observe(shell);
      if (target) ro.observe(target);
    }

    return () => {
      cancelAnimationFrame(raf1);
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener("resize", handleUpdate);
      shell.removeEventListener("scroll", handleUpdate, true);
      if (ro) ro.disconnect();
    };
  }, [isOpen, currentIndex, step?.targetSelector]);

  useLayoutEffect(() => {
    if (cardRef.current) {
      const h = cardRef.current.offsetHeight;
      if (h > 0 && h !== cardHeight) {
        setCardHeight(h);
      }
    }
  });

  if (!isOpen || !step || !rect) return null;

  // On very tight mobile heights (e.g. virtual keyboard raised), step aside gently
  if (rect.shellHeight < 460) return null;

  const pad = 4;
  const cutLeft = Math.max(0, rect.left - pad);
  const cutTop = Math.max(0, rect.top - pad);
  const cutRight = Math.min(rect.shellWidth, rect.right + pad);
  const cutBottom = Math.min(rect.shellHeight, rect.bottom + pad);
  const cutWidth = Math.max(0, cutRight - cutLeft);
  const cutHeight = Math.max(0, cutBottom - cutTop);

  const horizontalMargin = 18;
  const cardWidth = Math.min(340, Math.max(240, rect.shellWidth - horizontalMargin * 2));
  const targetCenterX = rect.left + rect.width / 2;

  let cardLeft = targetCenterX - cardWidth / 2;
  cardLeft = Math.max(horizontalMargin, Math.min(rect.shellWidth - cardWidth - horizontalMargin, cardLeft));

  const pointerSize = 12;
  const pointerLeft = Math.max(
    18,
    Math.min(cardWidth - 30, targetCenterX - cardLeft - pointerSize / 2)
  );

  const reserveBottom = step.reserveBottomPx ?? 16;
  const maxBottomEdge = rect.shellHeight - reserveBottom;
  const minTopEdge = 16;
  const gap = 12;

  const canPlaceBelow = cutBottom + gap + cardHeight <= maxBottomEdge;
  const canPlaceAbove = cutTop - gap - cardHeight >= minTopEdge;

  let placement: "below" | "above" = "below";
  if (!canPlaceBelow && canPlaceAbove) {
    placement = "above";
  } else if (canPlaceBelow && canPlaceAbove && rect.top > rect.shellHeight * 0.5) {
    placement = "above";
  }

  let cardTop =
    placement === "below"
      ? cutBottom + gap
      : cutTop - gap - cardHeight;

  cardTop = Math.max(minTopEdge, Math.min(maxBottomEdge - cardHeight, cardTop));

  const showPointer =
    placement === "below"
      ? cardTop >= cutBottom - 2
      : cardTop + cardHeight <= cutTop + 2;

  const showDim = !step.interactive;

  return (
    <div
      className="absolute inset-0 z-50 pointer-events-none select-none"
      aria-live="polite"
    >
      {/* 4-segment dark cutout around the target (never blocks clicks inside target hole) */}
      {showDim && (
        <>
          <div
            className="absolute left-0 right-0 top-0 bg-black/62 transition-all duration-300 ease-out pointer-events-auto"
            style={{ height: `${cutTop}px` }}
          />
          <div
            className="absolute left-0 right-0 bottom-0 bg-black/62 transition-all duration-300 ease-out pointer-events-auto"
            style={{ top: `${cutBottom}px` }}
          />
          <div
            className="absolute left-0 bg-black/62 transition-all duration-300 ease-out pointer-events-auto"
            style={{
              top: `${cutTop}px`,
              height: `${cutHeight}px`,
              width: `${cutLeft}px`,
            }}
          />
          <div
            className="absolute right-0 bg-black/62 transition-all duration-300 ease-out pointer-events-auto"
            style={{
              top: `${cutTop}px`,
              height: `${cutHeight}px`,
              left: `${cutRight}px`,
            }}
          />
        </>
      )}

      {/* Gold pointer card with moving dotted outline */}
      <div
        ref={cardRef}
        className="absolute pointer-events-auto transition-all duration-300 ease-out"
        style={{
          left: `${cardLeft}px`,
          top: `${cardTop}px`,
          width: `${cardWidth}px`,
        }}
      >
        {/* Moving dotted outline around the card */}
        <svg
          width={cardWidth + 10}
          height={cardHeight + 10}
          viewBox={`0 0 ${cardWidth + 10} ${cardHeight + 10}`}
          className="absolute -inset-[5px] pointer-events-none z-0 overflow-visible"
          aria-hidden="true"
        >
          <rect
            x={1.5}
            y={1.5}
            width={cardWidth + 7}
            height={cardHeight + 7}
            rx={20}
            ry={20}
            fill="none"
            stroke="#ebaf64"
            strokeOpacity={0.9}
            strokeWidth={2}
            strokeLinecap="round"
            strokeDasharray="1.5 7.5"
            className="animate-tour-dots"
          />
        </svg>

        {/* Sliding pointer triangle aiming directly at target */}
        {showPointer && (
          <div
            className={`absolute z-20 w-3 h-3 bg-[#ebaf64] rotate-45 transition-all duration-300 ease-out pointer-events-none ${
              placement === "below" ? "-top-[6px]" : "-bottom-[6px]"
            }`}
            style={{ left: `${pointerLeft}px` }}
          />
        )}

        {/* Card face */}
        <div className="relative z-10 bg-[#ebaf64] text-black rounded-2xl p-4 shadow-[0_18px_44px_rgba(0,0,0,0.75)]">
          <p className="text-[13px] font-medium leading-[1.45] text-black">
            {step.body}
          </p>

          <div className="flex items-center justify-between gap-3 mt-3">
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-mono text-black/55">
                {currentIndex + 1}/{steps.length}
              </span>
              {!step.hideSkip && (
                <button
                  type="button"
                  onClick={onSkip}
                  className="text-xs font-medium text-black/65 hover:text-black transition-colors cursor-pointer"
                >
                  Skip
                </button>
              )}
            </div>

            {step.ctaLabel ? (
              <button
                type="button"
                onClick={onNext}
                disabled={!canDismiss}
                className={`py-1.5 px-4 rounded-full font-semibold text-xs transition-all duration-300 ${
                  canDismiss
                    ? "bg-black text-[#ebaf64] hover:bg-black/85 active:scale-95 cursor-pointer"
                    : "bg-black/20 text-black/40 cursor-default"
                }`}
              >
                {step.ctaLabel}
              </button>
            ) : step.hintText ? (
              <span className="text-[11px] font-mono font-semibold text-black/75">
                {step.hintText}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
