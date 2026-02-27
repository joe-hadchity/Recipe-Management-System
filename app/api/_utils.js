import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function getAuthedContext() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  return { supabase, user };
}
