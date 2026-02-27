import { NextResponse } from "next/server";
import { getAuthedContext } from "@/app/api/_utils";
import { suggestRecipesFromPantry } from "@/lib/services/ai/ingredientRecommendations";

export async function POST(request) {
  const context = await getAuthedContext();
  if (context.error) return context.error;

  try {
    const { pantryText, filters = {} } = await request.json();
    const result = await suggestRecipesFromPantry(context.supabase, context.user.id, pantryText, filters);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error.message || "Failed to suggest recipes." }, { status: 400 });
  }
}
