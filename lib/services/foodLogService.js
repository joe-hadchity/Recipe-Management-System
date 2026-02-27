import { foodLogInputSchema, foodItemInputSchema } from "@/lib/validators/foodValidators";

function round2(value) {
  return Number(value.toFixed(2));
}

function getDayRange(dateString) {
  const date = dateString ? new Date(`${dateString}T00:00:00`) : new Date();
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}

const FOOD_LOG_SELECT_WITH_RECIPE =
  "id, user_id, food_item_id, recipe_id, consumed_at, serving_grams, calories, protein_g, carbs_g, fat_g, notes";
const FOOD_LOG_SELECT_NO_RECIPE =
  "id, user_id, food_item_id, consumed_at, serving_grams, calories, protein_g, carbs_g, fat_g, notes";

function isMissingRecipeIdColumnError(error) {
  const message = error?.message || "";
  return message.includes("Could not find the 'recipe_id' column of 'food_logs' in the schema cache");
}

function normalizeFoodLogInsertError(error) {
  const message = error?.message || "";
  if (message.includes("null value in column \"food_item_id\" of relation \"food_logs\" violates not-null constraint")) {
    return new Error(
      "Recipe logging requires food_logs.food_item_id to be nullable. Run supabase/fix_food_logs_recipe_id.sql in Supabase SQL Editor."
    );
  }
  return error;
}

async function supportsFoodLogRecipeId(supabase) {
  const { error } = await supabase.from("food_logs").select("id, recipe_id").limit(1);
  if (!error) return true;
  if (isMissingRecipeIdColumnError(error)) return false;
  throw error;
}

async function hydrateFoodLogRelations(supabase, logs) {
  if (!logs?.length) return [];

  const recipeIds = [...new Set(logs.map((log) => log.recipe_id).filter(Boolean))];
  const foodItemIds = [...new Set(logs.map((log) => log.food_item_id).filter(Boolean))];

  let recipeMap = new Map();
  let foodItemMap = new Map();

  if (recipeIds.length) {
    const { data: recipes } = await supabase.from("recipes").select("id, name").in("id", recipeIds);
    recipeMap = new Map((recipes || []).map((recipe) => [recipe.id, recipe]));
  }

  if (foodItemIds.length) {
    const { data: foodItems } = await supabase.from("food_items").select("id, name, brand").in("id", foodItemIds);
    foodItemMap = new Map((foodItems || []).map((item) => [item.id, item]));
  }

  return logs.map((log) => ({
    ...log,
    recipes: log.recipe_id ? recipeMap.get(log.recipe_id) || null : null,
    food_items: log.food_item_id ? foodItemMap.get(log.food_item_id) || null : null
  }));
}

export async function upsertFoodItem(supabase, foodItemInput) {
  const foodItem = foodItemInputSchema.parse(foodItemInput);

  if (foodItem.source === "openfoodfacts" && foodItem.external_id) {
    const { data: existingRows, error: existingError } = await supabase
      .from("food_items")
      .select("*")
      .eq("source", foodItem.source)
      .eq("external_id", foodItem.external_id)
      .order("updated_at", { ascending: false })
      .limit(1);

    if (existingError) throw existingError;

    const existing = existingRows?.[0];
    if (existing) {
      const { data, error } = await supabase
        .from("food_items")
        .update(foodItem)
        .eq("id", existing.id)
        .select("*")
        .single();
      if (error) throw error;
      return data;
    }

    const { data, error } = await supabase
      .from("food_items")
      .insert(foodItem)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase.from("food_items").insert(foodItem).select("*").single();
  if (error) throw error;
  return data;
}

export function computeSnapshotMacros(foodItem, servingGrams) {
  const factor = Number(servingGrams) / 100;
  return {
    calories: round2((foodItem.calories_per_100g || 0) * factor),
    protein_g: round2((foodItem.protein_per_100g || 0) * factor),
    carbs_g: round2((foodItem.carbs_per_100g || 0) * factor),
    fat_g: round2((foodItem.fat_per_100g || 0) * factor)
  };
}

export async function createFoodLog(supabase, userId, input) {
  const parsed = foodLogInputSchema.parse(input);
  const recipeIdSupported = await supportsFoodLogRecipeId(supabase);

  if (parsed.recipe_id) {
    if (!recipeIdSupported) {
      throw new Error("Recipe logging requires the food_logs.recipe_id column. Please run the latest Supabase schema update.");
    }

    const servings = Number(parsed.recipe_servings || 1);
    const { data: recipe, error: recipeError } = await supabase
      .from("recipes")
      .select("id, name, calories, protein_g, carbs_g, fat_g")
      .eq("id", parsed.recipe_id)
      .single();
    if (recipeError) throw recipeError;

    const payload = {
      user_id: userId,
      recipe_id: recipe.id,
      serving_grams: parsed.serving_grams,
      consumed_at: parsed.consumed_at || new Date().toISOString(),
      notes: parsed.notes || null,
      calories: round2(Number(recipe.calories || 0) * servings),
      protein_g: round2(Number(recipe.protein_g || 0) * servings),
      carbs_g: round2(Number(recipe.carbs_g || 0) * servings),
      fat_g: round2(Number(recipe.fat_g || 0) * servings)
    };

    const { data, error } = await supabase
      .from("food_logs")
      .insert(payload)
      .select(FOOD_LOG_SELECT_WITH_RECIPE)
      .single();
    if (error) throw normalizeFoodLogInsertError(error);
    const hydrated = await hydrateFoodLogRelations(supabase, [data]);
    return hydrated[0];
  }

  let foodItem = null;
  if (parsed.food_item_id) {
    const { data, error } = await supabase.from("food_items").select("*").eq("id", parsed.food_item_id).single();
    if (error) throw error;
    foodItem = data;
  } else if (parsed.food_item) {
    foodItem = await upsertFoodItem(supabase, parsed.food_item);
  } else {
    throw new Error("Provide either food_item_id or food_item.");
  }

  const macros = computeSnapshotMacros(foodItem, parsed.serving_grams);
  const payload = {
    user_id: userId,
    food_item_id: foodItem.id,
    serving_grams: parsed.serving_grams,
    consumed_at: parsed.consumed_at || new Date().toISOString(),
    notes: parsed.notes || null,
    ...macros
  };

  const { data, error } = await supabase
    .from("food_logs")
    .insert(payload)
    .select(recipeIdSupported ? FOOD_LOG_SELECT_WITH_RECIPE : FOOD_LOG_SELECT_NO_RECIPE)
    .single();
  if (error) throw normalizeFoodLogInsertError(error);
  const hydrated = await hydrateFoodLogRelations(supabase, [data]);
  return hydrated[0];
}

export async function listFoodLogs(supabase, userId, dateString) {
  const { start, end } = getDayRange(dateString);
  const recipeIdSupported = await supportsFoodLogRecipeId(supabase);
  const selectFields = recipeIdSupported ? FOOD_LOG_SELECT_WITH_RECIPE : FOOD_LOG_SELECT_NO_RECIPE;

  const { data, error } = await supabase
    .from("food_logs")
    .select(selectFields)
    .eq("user_id", userId)
    .gte("consumed_at", start)
    .lte("consumed_at", end)
    .order("consumed_at", { ascending: false });

  if (error) return { data: null, error };
  const hydrated = await hydrateFoodLogRelations(supabase, data || []);
  return { data: hydrated, error: null };
}

export async function getDailyNutritionSummary(supabase, userId, dateString) {
  const { data, error } = await listFoodLogs(supabase, userId, dateString);
  if (error) throw error;

  const totals = (data || []).reduce(
    (acc, log) => ({
      calories: round2(acc.calories + Number(log.calories || 0)),
      protein: round2(acc.protein + Number(log.protein_g || 0)),
      carbs: round2(acc.carbs + Number(log.carbs_g || 0)),
      fat: round2(acc.fat + Number(log.fat_g || 0))
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  return { totals, logs: data || [] };
}
