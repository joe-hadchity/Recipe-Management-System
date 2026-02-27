import { NextResponse } from "next/server";
import { getAuthedContext } from "@/app/api/_utils";

export async function GET(request) {
  const context = await getAuthedContext();
  if (context.error) return context.error;

  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name");
  const ingredient = searchParams.get("ingredient");
  const cuisine = searchParams.get("cuisine");
  const cuisineType = searchParams.get("cuisineType");
  const maxPrepTime = searchParams.get("maxPrepTime");
  const publicOnly = searchParams.get("publicOnly") === "true";

  let query = context.supabase
    .from("recipes")
    .select("*, recipe_ingredients(item_name)")
    .order("created_at", { ascending: false });

  if (publicOnly) {
    query = query.eq("visibility", "public");
  } else {
    query = query.or(`owner_id.eq.${context.user.id},visibility.eq.public`);
  }

  if (name) query = query.ilike("name", `%${name}%`);
  if (cuisine) query = query.ilike("cuisine", `%${cuisine}%`);
  if (cuisineType) query = query.ilike("cuisine", `%${cuisineType}%`);
  if (maxPrepTime) query = query.lte("prep_time_min", Number(maxPrepTime));

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const ingredientTerms =
    ingredient && ingredient.trim()
      ? ingredient
          .split(",")
          .map((term) => term.trim().toLowerCase())
          .filter(Boolean)
      : [];

  const filtered = ingredientTerms.length
    ? data.filter((recipe) => {
        const ingredientNames = (recipe.recipe_ingredients || []).map((item) => String(item.item_name || "").toLowerCase());
        return ingredientTerms.every((term) => ingredientNames.some((name) => name.includes(term)));
      })
    : data;

  return NextResponse.json({ recipes: filtered });
}
