import { NextRequest, NextResponse } from "next/server";

const FDC_API_BASE = "https://api.nal.usda.gov/fdc/v1";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const searchCache = new Map<string, { expiresAt: number; data: unknown }>();

export async function GET(request: NextRequest) {
  const apiKey = process.env.USDA_FDC_API_KEY ?? "";
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing USDA_FDC_API_KEY" },
      { status: 500 }
    );
  }

  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim() ?? "";
  const limitParam = url.searchParams.get("limit");
  const limit = Math.min(Math.max(Number(limitParam ?? 8), 1), 20);

  if (!query || query.length < 2) {
    return NextResponse.json({ foods: [] });
  }

  const cacheKey = `${query.toLowerCase()}|${limit}`;
  const cached = searchCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.data);
  }

  const searchUrl = new URL(`${FDC_API_BASE}/foods/search`);
  searchUrl.searchParams.set("api_key", apiKey);
  searchUrl.searchParams.set("query", query);
  searchUrl.searchParams.set("pageSize", String(limit));

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);
  let response: Response;
  try {
    response = await fetch(searchUrl, {
      cache: "no-store",
      signal: controller.signal,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[api/food/search] fetch failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "FDC search failed" }, { status: 502 });
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    return NextResponse.json(
      { error: "FDC search failed" },
      { status: response.status }
    );
  }

  const payload = (await response.json()) as {
    foods?: Array<{ fdcId: number; description: string; brandOwner?: string; dataType?: string }>;
  };

  const foods = (payload.foods ?? []).map((food) => ({
    fdcId: food.fdcId,
    description: food.description,
    brandOwner: food.brandOwner ?? null,
    dataType: food.dataType ?? null,
  }));

  const data = { foods };
  searchCache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, data });
  return NextResponse.json(data);
}
