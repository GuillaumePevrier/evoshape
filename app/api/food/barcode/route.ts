import { NextRequest, NextResponse } from "next/server";

const USER_AGENT = "EvoShape (https://github.com/GuillaumePevrier/evoshape)";

const parseServing = (raw: string | null) => {
  if (!raw) return { size: null, unit: null };
  const match = raw.replace(",", ".").match(/([0-9.]+)\s*([a-zA-Z]+)/);
  if (!match) return { size: null, unit: null };
  const size = Number(match[1]);
  return {
    size: Number.isFinite(size) ? size : null,
    unit: match[2] ?? null,
  };
};

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code")?.trim() ?? "";

  if (!code) {
    return NextResponse.json({ error: "Missing barcode" }, { status: 400 });
  }

  const apiUrl = new URL(
    `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}`
  );

  const response = await fetch(apiUrl, {
    cache: "no-store",
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    return NextResponse.json(
      { error: "Open Food Facts lookup failed" },
      { status: response.status }
    );
  }

  const payload = (await response.json()) as {
    status: number;
    product?: {
      product_name?: string;
      brands?: string;
      serving_size?: string;
      nutriments?: Record<string, number>;
    };
  };

  if (payload.status !== 1 || !payload.product) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const product = payload.product;
  const nutriments = product.nutriments ?? {};
  const caloriesPer100g = Number(nutriments["energy-kcal_100g"] ?? NaN);
  const caloriesPerServing = Number(nutriments["energy-kcal_serving"] ?? NaN);
  const { size: servingSize, unit: servingSizeUnit } = parseServing(
    product.serving_size ?? null
  );

  return NextResponse.json({
    source: "off",
    description: product.product_name ?? "",
    brandOwner: product.brands ?? null,
    caloriesPer100g: Number.isFinite(caloriesPer100g) ? caloriesPer100g : null,
    caloriesPerServing: Number.isFinite(caloriesPerServing)
      ? caloriesPerServing
      : null,
    servingSize,
    servingSizeUnit,
  });
}
