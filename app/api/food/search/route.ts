import { NextRequest, NextResponse } from "next/server";

const FDC_API_BASE = "https://api.nal.usda.gov/fdc/v1";

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

  const searchUrl = new URL(`${FDC_API_BASE}/foods/search`);
  searchUrl.searchParams.set("api_key", apiKey);
  searchUrl.searchParams.set("query", query);
  searchUrl.searchParams.set("pageSize", String(limit));

  const response = await fetch(searchUrl, { cache: "no-store" });
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

  return NextResponse.json({ foods });
}
