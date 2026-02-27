import { NextResponse } from "next/server";
import { getAuthedContext } from "@/app/api/_utils";
import { parseNaturalLanguageSearch } from "@/lib/services/ai/queryParser";

export async function POST(request) {
  const context = await getAuthedContext();
  if (context.error) return context.error;

  try {
    const { query } = await request.json();
    const filters = await parseNaturalLanguageSearch(query);
    return NextResponse.json({ filters });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
