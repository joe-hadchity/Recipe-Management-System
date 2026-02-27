import { NextResponse } from "next/server";
import { getAuthedContext } from "@/app/api/_utils";
import { analyzeNutrition } from "@/lib/services/nutritionService";

export async function POST(request) {
  const context = await getAuthedContext();
  if (context.error) return context.error;

  try {
    const body = await request.json();
    const result = await analyzeNutrition({
      ingredients: body.ingredients || [],
      servings: body.servings || 1
    });
    return NextResponse.json({ nutrition: result });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
