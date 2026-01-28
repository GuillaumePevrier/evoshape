"use client";

import { useEffect, useState } from "react";

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

type CalorieGaugeProps = {
  consumed: number;
  burned: number;
  target: number;
  net: number;
  size?: number;
  showLegend?: boolean;
  showTargetTick?: boolean;
  showTargetValue?: boolean;
};

export function CalorieGauge({
  consumed,
  burned,
  target,
  net,
  size = 220,
  showLegend = true,
  showTargetTick = true,
  showTargetValue = true,
}: CalorieGaugeProps) {
  const [showTargetHint, setShowTargetHint] = useState(false);
  const safeConsumed = Number.isFinite(consumed) ? consumed : 0;
  const safeBurned = Number.isFinite(burned) ? burned : 0;
  const safeTarget = Number.isFinite(target) && target > 0 ? target : 1;
  const targetValue = Number.isFinite(target) ? Math.round(target) : 0;

  useEffect(() => {
    if (!showTargetHint) {
      return;
    }
    const timeout = window.setTimeout(() => setShowTargetHint(false), 2200);
    return () => window.clearTimeout(timeout);
  }, [showTargetHint]);
  const consumedProgress = clamp(safeConsumed / safeTarget, 0, 1);
  const burnedProgress = clamp(safeBurned / safeTarget, 0, 1);

  const stroke = 14;
  const innerStroke = 10;
  const center = size / 2;
  const outerRadius = center - stroke;
  const innerRadius = outerRadius - 18;
  const outerCirc = 2 * Math.PI * outerRadius;
  const innerCirc = 2 * Math.PI * innerRadius;

  const consumedOffset = outerCirc * (1 - consumedProgress);
  const burnedOffset = innerCirc * (1 - burnedProgress);

  return (
    <div className="relative flex flex-col items-center justify-center">
      <div className="group relative">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90"
          aria-hidden="true"
        >
        <circle
          cx={center}
          cy={center}
          r={outerRadius}
          fill="none"
          stroke="var(--surface-strong)"
          strokeWidth={stroke}
        />
        {showTargetTick ? (
          <line
            x1={center + outerRadius + 2}
            y1={center}
            x2={center + outerRadius + 12}
            y2={center}
            stroke="var(--accent-strong)"
            strokeWidth={3}
            strokeLinecap="round"
          />
        ) : null}
        <circle
          cx={center}
          cy={center}
          r={outerRadius}
          fill="none"
          stroke="#F59E0B"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={outerCirc}
          strokeDashoffset={consumedOffset}
          className="gauge-ring"
        />
        <circle
          cx={center}
          cy={center}
          r={innerRadius}
          fill="none"
          stroke="var(--surface-strong)"
          strokeWidth={innerStroke}
        />
        <circle
          cx={center}
          cy={center}
          r={innerRadius}
          fill="none"
          stroke="#38BDF8"
          strokeWidth={innerStroke}
          strokeLinecap="round"
          strokeDasharray={innerCirc}
          strokeDashoffset={burnedOffset}
          className="gauge-ring"
        />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
            Net
          </p>
          <p className="mt-1 text-3xl font-semibold text-[var(--foreground)]">
            {net.toFixed(0)}
          </p>
          <p className="text-xs text-[var(--muted)]">kcal</p>
        </div>

        {showTargetTick || showTargetValue ? (
          <div className="pointer-events-none absolute left-1/2 top-2 flex -translate-x-1/2 flex-col items-center gap-1">
            {showTargetTick ? (
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--accent-strong)]">
                Objectif
              </span>
            ) : null}
            {showTargetValue ? (
              <span
                className={`rounded-full border border-[var(--border)] bg-white/80 px-2 py-0.5 text-[10px] font-semibold text-[var(--foreground)] transition ${showTargetHint ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 group-focus-within:opacity-100 group-focus-within:translate-y-0"}`}
              >
                {targetValue} kcal
              </span>
            ) : null}
          </div>
        ) : null}

        {showTargetValue ? (
          <button
            type="button"
            className="absolute left-1/2 top-3 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            aria-label="Afficher la valeur de l'objectif"
            onClick={() => setShowTargetHint(true)}
          />
        ) : null}
      </div>

      {showLegend ? (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#F59E0B]" />
            Repas
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#38BDF8]" />
            Activite
          </div>
        </div>
      ) : null}
    </div>
  );
}
