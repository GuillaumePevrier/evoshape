import { NextRequest, NextResponse } from "next/server";

const FDC_API_BASE = "https://api.nal.usda.gov/fdc/v1";
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const detailCache = new Map<string, { expiresAt: number; data: unknown }>();

type FoodNutrient = {
  amount?: number;
  unitName?: string;
  nutrientNumber?: string;
  nutrientName?: string;
  nutrientId?: number;
  nutrient?: {
    number?: string;
    name?: string;
    id?: number;
    unitName?: string;
  };
};

const getEnergyNutrient = (nutrients: FoodNutrient[]) => {
  return (
    nutrients.find(
      (item) =>
        item.nutrient?.number === "208" ||
        item.nutrientNumber === "208" ||
        item.nutrient?.id === 1008 ||
        item.nutrientId === 1008 ||
        item.nutrient?.name === "Energy" ||
        item.nutrientName === "Energy"
    ) ?? null
  );
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fdcId: string }> }
) {
  const apiKey = process.env.USDA_FDC_API_KEY ?? "";
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing USDA_FDC_API_KEY" },
      { status: 500 }
    );
  }

  const { fdcId } = await params;
  const cached = detailCache.get(fdcId);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.data);
  }
  const url = new URL(`${FDC_API_BASE}/food/${fdcId}`);
  url.searchParams.set("api_key", apiKey);

  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    return NextResponse.json(
      { error: "FDC lookup failed" },
      { status: response.status }
    );
  }

  const food = (await response.json()) as {
    fdcId?: number;
    description?: string;
    brandOwner?: string;
    dataType?: string;
    servingSize?: number;
    servingSizeUnit?: string;
    labelNutrients?: { calories?: { value?: number } };
    foodNutrients?: FoodNutrient[];
  };

  const nutrients = food.foodNutrients ?? [];
  const energy = getEnergyNutrient(nutrients);
  const energyAmount = Number(energy?.amount ?? NaN);
  const energyUnit =
    energy?.nutrient?.unitName ?? energy?.unitName ?? "";
  const labelCalories = Number(food.labelNutrients?.calories?.value ?? NaN);

  const servingSize = Number(food.servingSize ?? NaN);
  const servingUnit = food.servingSizeUnit ?? null;

  let caloriesPerServing = Number.isFinite(labelCalories)
    ? labelCalories
    : Number.isFinite(energyAmount) && energyUnit.toLowerCase() === "kcal"
      ? energyAmount
      : null;

  let caloriesPer100g: number | null = null;
  if (
    Number.isFinite(servingSize) &&
    servingSize > 0 &&
    servingUnit?.toLowerCase() === "g" &&
    caloriesPerServing !== null
  ) {
    caloriesPer100g = (caloriesPerServing / servingSize) * 100;
  } else if (Number.isFinite(energyAmount) && energyUnit.toLowerCase() === "kcal") {
    caloriesPer100g = energyAmount;
  }

  const data = {
    source: "fdc",
    fdcId: food.fdcId ?? Number(fdcId),
    description: food.description ?? "",
    brandOwner: food.brandOwner ?? null,
    dataType: food.dataType ?? null,
    servingSize: Number.isFinite(servingSize) ? servingSize : null,
    servingSizeUnit: servingUnit,
    caloriesPerServing,
    caloriesPer100g,
  };
  detailCache.set(fdcId, { expiresAt: Date.now() + CACHE_TTL_MS, data });
  return NextResponse.json(data);
}
