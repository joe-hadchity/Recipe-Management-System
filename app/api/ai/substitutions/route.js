import { NextResponse } from "next/server";
import { getAuthedContext } from "@/app/api/_utils";
import { generateStructuredJson } from "@/lib/services/ai/azureOpenAIService";

export async function POST(request) {
  const context = await getAuthedContext();
  if (context.error) return context.error;

  try {
    const { ingredient, restrictions = [] } = await request.json();
    const output = await generateStructuredJson({
      systemPrompt: "Return JSON with ingredient substitutions.",
      userPrompt: JSON.stringify({ ingredient, restrictions })
    });
    return NextResponse.json({ substitutions: JSON.parse(output) });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
