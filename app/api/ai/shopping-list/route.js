import { NextResponse } from "next/server";
import { getAuthedContext } from "@/app/api/_utils";
import { generateStructuredJson } from "@/lib/services/ai/azureOpenAIService";

export async function POST(request) {
  const context = await getAuthedContext();
  if (context.error) return context.error;

  try {
    const { recipes = [] } = await request.json();
    const output = await generateStructuredJson({
      systemPrompt:
        "Build a shopping list JSON grouped by aisle with totals. Return only JSON with aisles and items.",
      userPrompt: JSON.stringify({ recipes })
    });
    return NextResponse.json({ shoppingList: JSON.parse(output) });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
