import { NextResponse } from "next/server";
import { getAuthedContext } from "@/app/api/_utils";
import { searchOpenFoodFacts } from "@/lib/services/openFoodFactsService";

export async function GET(request) {
  const context = await getAuthedContext();
  if (context.error) return context.error;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";

  if (!q.trim()) {
    return NextResponse.json({ foods: [] });
  }

  try {
    const [openFoods, localFoodsResult] = await Promise.all([
      searchOpenFoodFacts(q),
      context.supabase
        .from("food_items")
        .select("*")
        .ilike("name", `%${q}%`)
        .order("updated_at", { ascending: false })
        .limit(10)
    ]);

    const localFoods = localFoodsResult.data || [];
    const merged = [...localFoods, ...openFoods];

    return NextResponse.json({ foods: merged });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
