import { NextResponse } from "next/server";
import { getAuthedContext } from "@/app/api/_utils";
import { createFoodLog, listFoodLogs } from "@/lib/services/foodLogService";

export async function GET(request) {
  const context = await getAuthedContext();
  if (context.error) return context.error;

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") || undefined;

  try {
    const { data, error } = await listFoodLogs(context.supabase, context.user.id, date);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ logs: data || [] });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function POST(request) {
  const context = await getAuthedContext();
  if (context.error) return context.error;

  try {
    const body = await request.json();
    const log = await createFoodLog(context.supabase, context.user.id, body);
    return NextResponse.json({ log }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
