import { cn } from "@/lib/cn";

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

type CalorieGaugeProps = {
  consumed: number;
  burned: number;
  target: number;
  net: number;
  delta: number;
  size?: number;
};

export function CalorieGauge({
  consumed,
  burned,
  target,
  net,
  delta,
  size = 220,
}: CalorieGaugeProps) {
  const safeTarget = target > 0 ? target : 1;
  const consumedProgress = clamp(consumed / safeTarget, 0, 1);
  const burnedProgress = clamp(burned / safeTarget, 0, 1);

  const stroke = 14;
  const innerStroke = 10;
  const center = size / 2;
  const outerRadius = center - stroke;
  const innerRadius = outerRadius - 18;
  const outerCirc = 2 * Math.PI * outerRadius;
  const innerCirc = 2 * Math.PI * innerRadius;

  const consumedOffset = outerCirc * (1 - consumedProgress);
  const burnedOffset = innerCirc * (1 - burnedProgress);

  const deltaLabel = delta === 0 ? "0" : delta > 0 ? `+${delta}` : `${delta}`;

  return (
    <div className="relative flex items-center justify-center">
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
        <div
          className={cn(
            "mt-2 rounded-full px-3 py-1 text-[11px] font-semibold",
            delta > 0
              ? "bg-red-100 text-red-700"
              : "bg-emerald-100 text-emerald-700",
            delta !== 0 ? "delta-pulse" : null
          )}
        >
          {deltaLabel} kcal
        </div>
      </div>
    </div>
  );
}
