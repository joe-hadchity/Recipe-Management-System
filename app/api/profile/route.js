import { NextResponse } from "next/server";
import { getAuthedContext } from "@/app/api/_utils";

export async function GET() {
  const context = await getAuthedContext();
  if (context.error) return context.error;

  const { data, error } = await context.supabase
    .from("profiles")
    .select("*")
    .eq("id", context.user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ profile: data });
}

export async function PATCH(request) {
  const context = await getAuthedContext();
  if (context.error) return context.error;

  const payload = await request.json();
  const { data, error } = await context.supabase
    .from("profiles")
    .upsert({ id: context.user.id, ...payload }, { onConflict: "id" })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ profile: data });
}
