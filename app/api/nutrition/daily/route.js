import { NextResponse } from "next/server";
import { getAuthedContext } from "@/app/api/_utils";
import { getDailyNutritionSummary } from "@/lib/services/foodLogService";

export async function GET(request) {
  const context = await getAuthedContext();
  if (context.error) return context.error;

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") || undefined;

  try {
    const summary = await getDailyNutritionSummary(context.supabase, context.user.id, date);
    return NextResponse.json(summary);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
