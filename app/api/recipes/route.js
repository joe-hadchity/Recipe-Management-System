import { NextResponse } from "next/server";
import { getAuthedContext } from "@/app/api/_utils";
import { createRecipe, listRecipes } from "@/lib/services/recipeService";

export async function GET(request) {
  const context = await getAuthedContext();
  if (context.error) return context.error;

  const { searchParams } = new URL(request.url);
  const includePublic = searchParams.get("includePublic") === "true";
  const filters = {
    name: searchParams.get("name") || undefined,
    maxPrepTime: searchParams.get("maxPrepTime") || undefined
  };

  const { data, error } = await listRecipes(context.supabase, {
    userId: context.user.id,
    includePublic,
    filters
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ recipes: data });
}

export async function POST(request) {
  const context = await getAuthedContext();
  if (context.error) return context.error;

  try {
    const payload = await request.json();
    const created = await createRecipe(context.supabase, payload, context.user.id);
    return NextResponse.json({ recipe: created }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
