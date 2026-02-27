import { NextResponse } from "next/server";
import { getAuthedContext } from "@/app/api/_utils";
import { deleteRecipe, getRecipeById, updateRecipe } from "@/lib/services/recipeService";

export async function GET(_request, { params }) {
  const context = await getAuthedContext();
  if (context.error) return context.error;

  const { id } = await params;
  const { data, error } = await getRecipeById(context.supabase, id);
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });

  return NextResponse.json({ recipe: data });
}

export async function PATCH(request, { params }) {
  const context = await getAuthedContext();
  if (context.error) return context.error;

  const { id } = await params;
  try {
    const payload = await request.json();
    await updateRecipe(context.supabase, id, payload);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE(_request, { params }) {
  const context = await getAuthedContext();
  if (context.error) return context.error;

  const { id } = await params;
  const { error } = await deleteRecipe(context.supabase, id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
