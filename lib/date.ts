const pad2 = (value: number) => String(value).padStart(2, "0");

export function getISODate(date: Date = new Date()) {
  const year = date.getFullYear();
  const month = pad2(date.getMonth() + 1);
  const day = pad2(date.getDate());
  return `${year}-${month}-${day}`;
}

export function formatShortDate(value: string) {
  const parts = value.split("-").map(Number);
  const date =
    parts.length === 3 && parts.every((part) => Number.isFinite(part))
      ? new Date(parts[0], parts[1] - 1, parts[2])
      : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
  }).format(date);
}
