import { recipeSchema } from "@/lib/validators/recipeValidators";

function buildIngredientRowsWithMacros(ingredients, recipeId) {
  return ingredients.map((item, index) => ({
    recipe_id: recipeId,
    item_name: item.item_name,
    food_item_id: item.food_item_id || null,
    grams: Number(item.grams ?? item.quantity ?? 0),
    calories: Number(item.calories ?? 0),
    protein_g: Number(item.protein_g ?? 0),
    carbs_g: Number(item.carbs_g ?? 0),
    fat_g: Number(item.fat_g ?? 0),
    quantity: Number(item.grams ?? item.quantity ?? 0),
    unit: item.unit || "g",
    notes: item.notes || null,
    sort_order: Number(item.sort_order ?? index)
  }));
}

function buildIngredientRowsBasic(ingredients, recipeId) {
  return ingredients.map((item, index) => ({
    recipe_id: recipeId,
    item_name: item.item_name,
    quantity: Number(item.grams ?? item.quantity ?? 0),
    unit: item.unit || "g",
    notes: item.notes || null,
    sort_order: Number(item.sort_order ?? index)
  }));
}

async function insertIngredientsWithFallback(supabase, recipeId, ingredients) {
  const fullRows = buildIngredientRowsWithMacros(ingredients, recipeId);
  const { error: fullError } = await supabase.from("recipe_ingredients").insert(fullRows);
  if (!fullError) return;

  const basicRows = buildIngredientRowsBasic(ingredients, recipeId);
  const { error: basicError } = await supabase.from("recipe_ingredients").insert(basicRows);
  if (basicError) throw basicError;
}

export async function listRecipes(supabase, { userId, includePublic = false, filters = {} }) {
  let query = supabase.from("recipes").select("*").order("created_at", { ascending: false });

  if (includePublic) {
    query = query.or(`owner_id.eq.${userId},visibility.eq.public`);
  } else {
    query = query.eq("owner_id", userId);
  }

  if (filters.name) query = query.ilike("name", `%${filters.name}%`);
  if (filters.maxPrepTime) query = query.lte("prep_time_min", Number(filters.maxPrepTime));

  return query;
}

export async function getRecipeById(supabase, id) {
  return supabase
    .from("recipes")
    .select("*, recipe_ingredients(*)")
    .eq("id", id)
    .single();
}

export async function createRecipe(supabase, payload, ownerId) {
  const data = recipeSchema.parse(payload);
  const { ingredients, ...recipeData } = data;
  const normalizedRecipeData = { cuisine: "general", ...recipeData };

  const { data: inserted, error } = await supabase
    .from("recipes")
    .insert({ ...normalizedRecipeData, owner_id: ownerId })
    .select("*")
    .single();

  if (error) throw error;

  if (ingredients.length) {
    await insertIngredientsWithFallback(supabase, inserted.id, ingredients);
  }

  return inserted;
}

export async function updateRecipe(supabase, id, payload) {
  const data = recipeSchema.partial().parse(payload);
  const { ingredients, ...recipeData } = data;

  if (Object.keys(recipeData).length > 0) {
    const { error } = await supabase.from("recipes").update(recipeData).eq("id", id);
    if (error) throw error;
  }

  if (ingredients) {
    await supabase.from("recipe_ingredients").delete().eq("recipe_id", id);
    if (ingredients.length) {
      await insertIngredientsWithFallback(supabase, id, ingredients);
    }
  }
}

export async function deleteRecipe(supabase, id) {
  return supabase.from("recipes").delete().eq("id", id);
}
