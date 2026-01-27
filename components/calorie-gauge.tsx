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
  const remaining = target - net;
  const isOver = target > 0 && remaining < 0;

  const fillClass = isOver
    ? "bg-red-500"
    : ratio >= 0.8
      ? "bg-amber-400"
      : "bg-emerald-500";

  return (
    <div className="rounded-3xl border border-[var(--border)] bg-white/80 p-5 shadow-[0_12px_40px_rgba(17,16,14,0.08)]">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
            Budget calorique
          </p>
          <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
            {net.toFixed(0)} kcal nettes
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-[var(--muted)]">Objectif</p>
          <p className="text-lg font-semibold text-[var(--foreground)]">
            {target > 0 ? `${target.toFixed(0)} kcal` : "--"}
          </p>
        </div>
      </div>

      <div className="mt-5">
        <div className="h-3 w-full overflow-hidden rounded-full bg-[var(--surface-strong)]">
          <div
            className={cn("h-full transition-all", fillClass)}
            style={{ width: `${(progress * 100).toFixed(0)}%` }}
          />
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-[var(--muted)]">
          <span>Progression {(progress * 100).toFixed(0)}%</span>
          {target > 0 ? (
            <span
              className={cn(
                "font-semibold",
                isOver ? "text-red-600" : "text-emerald-600"
              )}
            >
              {isOver
                ? `Depassement ${Math.abs(remaining).toFixed(0)} kcal`
                : `Reste ${Math.max(remaining, 0).toFixed(0)} kcal`}
            </span>
          ) : (
            <span>Definis ton objectif pour commencer</span>
          )}
        </div>
      </div>

      {isOver ? (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Tu as depasse ton objectif calorique. Ajuste un repas ou ajoute une
          activite.
        </div>
      ) : null}
    </div>
  );
}
