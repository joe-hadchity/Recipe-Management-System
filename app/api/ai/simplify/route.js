import { NextResponse } from "next/server";
import { getAuthedContext } from "@/app/api/_utils";
import { generateStructuredJson } from "@/lib/services/ai/azureOpenAIService";

export async function POST(request) {
  const context = await getAuthedContext();
  if (context.error) return context.error;

  try {
    const { recipeName, instructions } = await request.json();
    const output = await generateStructuredJson({
      systemPrompt: "Simplify recipe instructions. Return JSON with steps array.",
      userPrompt: JSON.stringify({ recipeName, instructions })
    });
    return NextResponse.json({ simplified: JSON.parse(output) });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
