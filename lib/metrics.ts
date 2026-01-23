type WeightEntry = {
  recorded_at: string;
  weight_kg: number | string;
};

export function calculateDelta7Days(entries: WeightEntry[]) {
  if (!entries.length) {
    return null;
  }

  const sorted = [...entries].sort(
    (a, b) =>
      new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
  );

  const latest = Number(sorted[0].weight_kg);
  if (Number.isNaN(latest)) {
    return null;
  }

  const target = new Date(sorted[0].recorded_at);
  target.setDate(target.getDate() - 7);

  const compare =
    sorted.find((entry) => new Date(entry.recorded_at) <= target) ??
    sorted[sorted.length - 1];

  if (!compare) {
    return null;
  }

  const compareValue = Number(compare.weight_kg);
  if (Number.isNaN(compareValue)) {
    return null;
  }

  return latest - compareValue;
}
