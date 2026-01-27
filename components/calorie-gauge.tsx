import { cn } from "@/lib/cn";

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

type CalorieGaugeProps = {
  net: number;
  target: number;
};

export function CalorieGauge({ net, target }: CalorieGaugeProps) {
  const ratio = target > 0 ? net / target : 0;
  const progress = clamp(ratio, 0, 1);
  const overflowRatio = target > 0 ? (net - target) / target : 0;
  const overflow = overflowRatio > 0 ? Math.min(overflowRatio, 0.45) : 0;
  const hasTarget = target > 0;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative flex h-[240px] w-24 items-end justify-center overflow-visible">
        {overflow > 0 ? (
          <div
            className="absolute bottom-full left-3 right-3 rounded-t-[28px] bg-red-500/85"
            style={{ height: `${(overflow * 100).toFixed(0)}%` }}
          />
        ) : null}
        <div className="relative h-full w-full overflow-hidden rounded-[32px] border border-[var(--border)] bg-[var(--surface-strong)]">
          <div className="absolute left-2 right-2 top-4 h-[2px] rounded-full bg-[var(--accent-strong)]/60" />
          <span className="absolute -right-10 top-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
            Objectif
          </span>
          <div
            className={cn(
              "w-full rounded-[28px] bg-gradient-to-t from-[var(--accent-strong)] via-[var(--accent)] to-emerald-300 transition-all duration-300"
            )}
            style={{ height: `${(progress * 100).toFixed(0)}%` }}
          />
        </div>
      </div>
      <p className="text-xs text-[var(--muted)]">
        {hasTarget ? `${(progress * 100).toFixed(0)}%` : "Objectif a definir"}
      </p>
    </div>
  );
}
