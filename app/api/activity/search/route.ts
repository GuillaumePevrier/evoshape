import { NextRequest, NextResponse } from "next/server";

const WGER_BASE = "https://wger.de/api/v2/exerciseinfo/";
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const MAX_FETCH = 500;

let cache:
  | {
      fetchedAt: number;
      items: WgerExerciseInfo[];
    }
  | null = null;

type WgerTranslation = {
  name?: string;
};

type WgerCategory = {
  name?: string;
};

type WgerEquipment = {
  name?: string;
};

type WgerExerciseInfo = {
  id: number;
  translations?: WgerTranslation[];
  category?: WgerCategory;
  equipment?: WgerEquipment[];
};

type WgerResponse = {
  next?: string | null;
  results?: WgerExerciseInfo[];
};

const fetchExercises = async () => {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.items;
  }

  let nextUrl: string | null = `${WGER_BASE}?limit=200`;
  const items: WgerExerciseInfo[] = [];

  while (nextUrl && items.length < MAX_FETCH) {
    const response = await fetch(nextUrl, { cache: "no-store" });
    if (!response.ok) {
      break;
    }
    const payload = (await response.json()) as WgerResponse;
    items.push(...(payload.results ?? []));
    nextUrl = payload.next ?? null;
  }

  cache = { fetchedAt: Date.now(), items };
  return items;
};

const pickTranslation = (translations: WgerTranslation[], queryLower: string) => {
  if (!translations.length) return "";
  const match = translations.find((item) =>
    item.name?.toLowerCase().includes(queryLower)
  );
  return match?.name ?? translations[0].name ?? "";
};

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim() ?? "";
  const limitParam = url.searchParams.get("limit");
  const limit = Math.min(Math.max(Number(limitParam ?? 8), 1), 20);

  if (!query || query.length < 2) {
    return NextResponse.json({ items: [] });
  }

  const queryLower = query.toLowerCase();
  const items = await fetchExercises();

  const filtered = items
    .filter((item) =>
      (item.translations ?? []).some((translation) =>
        translation.name?.toLowerCase().includes(queryLower)
      )
    )
    .slice(0, limit)
    .map((item) => ({
      id: item.id,
      name: pickTranslation(item.translations ?? [], queryLower),
      category: item.category?.name ?? null,
      equipment: (item.equipment ?? []).map((eq) => eq.name ?? "").filter(Boolean),
    }));

  return NextResponse.json({ items: filtered });
}
