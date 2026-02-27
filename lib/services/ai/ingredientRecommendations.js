import { generateStructuredJson, generateTextCompletion } from "./azureOpenAIService";

function round2(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function normalizeIngredient(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parsePantryText(pantryText) {
  return [...new Set(String(pantryText || "").split(/[,\n]/).map(normalizeIngredient).filter(Boolean))];
}

function ingredientMatchesPantry(ingredientName, pantryItems) {
  const normalizedIngredient = normalizeIngredient(ingredientName);
  if (!normalizedIngredient) return false;

  return pantryItems.some((pantryItem) => {
    if (normalizedIngredient === pantryItem) return true;
    if (normalizedIngredient.includes(pantryItem) || pantryItem.includes(normalizedIngredient)) return true;
    const ingredientWords = normalizedIngredient.split(" ");
    const pantryWords = pantryItem.split(" ");
    return ingredientWords.some((word) => pantryWords.includes(word));
  });
}

function buildDeterministicSuggestions(recipes, pantryItems, filters = {}, limit = 6) {
  const cuisineFilter = normalizeIngredient(filters.cuisine);
  const maxPrepTime = Number(filters.maxPrepTime || 0);
  const maxCalories = Number(filters.maxCalories || 0);
  const minProtein = Number(filters.minProtein || 0);

  const suggestions = recipes
    .filter((recipe) => {
      if (maxPrepTime > 0 && Number(recipe.prep_time_min || 0) > maxPrepTime) return false;
      if (maxCalories > 0 && Number(recipe.calories || 0) > maxCalories) return false;
      if (minProtein > 0 && Number(recipe.protein_g || 0) < minProtein) return false;
      if (cuisineFilter && !normalizeIngredient(recipe.cuisine).includes(cuisineFilter)) return false;
      return true;
    })
    .map((recipe) => {
      const ingredientNames = (recipe.recipe_ingredients || []).map((item) => item.item_name).filter(Boolean);
      const uniqueIngredients = [...new Set(ingredientNames)];
      const matched = uniqueIngredients.filter((name) => ingredientMatchesPantry(name, pantryItems));
      const missing = uniqueIngredients.filter((name) => !ingredientMatchesPantry(name, pantryItems));
      const total = uniqueIngredients.length || 1;
      const matchScore = Math.round((matched.length / total) * 100);

      return {
        recipe_id: recipe.id,
        recipe_name: recipe.name,
        match_score: matchScore,
        matched_ingredients: matched.slice(0, 6),
        missing_ingredients: missing.slice(0, 6),
        prep_time_min: recipe.prep_time_min,
        calories: recipe.calories,
        protein_g: recipe.protein_g,
        why_this_match:
          matched.length > 0
            ? `Matches ${matched.length} of ${total} ingredients from your pantry.`
            : "Low direct ingredient overlap, but can be adapted with substitutions."
      };
    })
    .sort((a, b) => b.match_score - a.match_score || Number(a.prep_time_min || 0) - Number(b.prep_time_min || 0))
    .slice(0, limit);

  return suggestions;
}

function tryParseJson(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    const text = String(raw || "");
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced?.[1]) {
      try {
        return JSON.parse(fenced[1]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

function extractRecipeArray(parsed) {
  if (!parsed || typeof parsed !== "object") return [];
  if (Array.isArray(parsed.recipes)) return parsed.recipes;
  if (Array.isArray(parsed.generated_recipes)) return parsed.generated_recipes;
  if (Array.isArray(parsed.ideas)) return parsed.ideas;
  if (Array.isArray(parsed.recipe_suggestions)) return parsed.recipe_suggestions;
  if (parsed.name && parsed.ingredients) return [parsed];
  return [];
}

function toNonNegativeNumber(value, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return n;
}

function toPositiveInt(value, fallback = 1) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return n;
}

function estimateDefaultGrams(ingredientName) {
  const n = normalizeIngredient(ingredientName);
  if (!n) return 60;
  if (/(salt|pepper|spice|oregano|paprika|cumin|garlic powder|chili flakes)/.test(n)) return 3;
  if (/(oil|butter|ghee)/.test(n)) return 12;
  if (/(garlic|ginger)/.test(n)) return 10;
  if (/(egg)/.test(n)) return 50;
  if (/(onion|tomato|pepper|carrot|zucchini|broccoli|mushroom|spinach)/.test(n)) return 80;
  if (/(rice|pasta|oats|quinoa|flour)/.test(n)) return 75;
  if (/(chicken|beef|turkey|fish|salmon|shrimp|tofu)/.test(n)) return 140;
  if (/(milk|yogurt|broth|stock|sauce)/.test(n)) return 120;
  return 60;
}

function parseAmountToGrams(text) {
  const source = String(text || "").toLowerCase();
  const match = source.match(/(\d+(?:\.\d+)?)\s*(kg|g|gram|grams|ml|l|cup|cups|tbsp|tsp|oz|lb)\b/);
  if (!match) return null;
  const value = Number(match[1]);
  const unit = match[2];
  if (!Number.isFinite(value) || value <= 0) return null;

  if (unit === "kg") return value * 1000;
  if (unit === "g" || unit === "gram" || unit === "grams") return value;
  if (unit === "ml") return value;
  if (unit === "l") return value * 1000;
  if (unit === "cup" || unit === "cups") return value * 240;
  if (unit === "tbsp") return value * 15;
  if (unit === "tsp") return value * 5;
  if (unit === "oz") return value * 28.35;
  if (unit === "lb") return value * 453.6;
  return null;
}

function estimatePer100FromName(ingredientName) {
  const n = normalizeIngredient(ingredientName);
  if (!n) return { calories: 80, protein_g: 4, carbs_g: 8, fat_g: 3 };
  if (/(chicken|turkey)/.test(n)) return { calories: 165, protein_g: 31, carbs_g: 0, fat_g: 3.6 };
  if (/(beef)/.test(n)) return { calories: 250, protein_g: 26, carbs_g: 0, fat_g: 15 };
  if (/(salmon|fish|tuna|shrimp)/.test(n)) return { calories: 180, protein_g: 24, carbs_g: 0, fat_g: 8 };
  if (/(egg)/.test(n)) return { calories: 155, protein_g: 13, carbs_g: 1.1, fat_g: 11 };
  if (/(rice)/.test(n)) return { calories: 130, protein_g: 2.7, carbs_g: 28, fat_g: 0.3 };
  if (/(pasta)/.test(n)) return { calories: 157, protein_g: 5.8, carbs_g: 31, fat_g: 0.9 };
  if (/(oats)/.test(n)) return { calories: 389, protein_g: 17, carbs_g: 66, fat_g: 7 };
  if (/(potato)/.test(n)) return { calories: 77, protein_g: 2, carbs_g: 17, fat_g: 0.1 };
  if (/(onion|tomato|pepper|carrot|broccoli|spinach|mushroom)/.test(n)) return { calories: 35, protein_g: 1.8, carbs_g: 7, fat_g: 0.3 };
  if (/(beans|chickpea|lentil)/.test(n)) return { calories: 140, protein_g: 9, carbs_g: 24, fat_g: 1.5 };
  if (/(tofu)/.test(n)) return { calories: 76, protein_g: 8, carbs_g: 1.9, fat_g: 4.8 };
  if (/(milk)/.test(n)) return { calories: 60, protein_g: 3.2, carbs_g: 5, fat_g: 3.2 };
  if (/(yogurt)/.test(n)) return { calories: 59, protein_g: 10, carbs_g: 3.6, fat_g: 0.4 };
  if (/(oil|butter)/.test(n)) return { calories: 884, protein_g: 0, carbs_g: 0, fat_g: 100 };
  return { calories: 80, protein_g: 4, carbs_g: 8, fat_g: 3 };
}

function normalizeNameFromLine(line) {
  return String(line || "")
    .replace(/^[-*•\d\).\-\s]+/, "")
    .replace(/\b(\d+(?:\.\d+)?)\s*(kg|g|gram|grams|ml|l|cup|cups|tbsp|tsp|oz|lb)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function toTitleCase(value) {
  return String(value || "")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function isWeakRecipeName(name) {
  const n = normalizeIngredient(name);
  if (!n) return true;
  if (["recipe", "ingredients", "instructions", "steps", "method"].includes(n)) return true;
  if (/^ai pantry recipe(?:\s*\d+)?$/.test(n)) return true;
  if (/^ai recipe(?:\s*\d+)?$/.test(n)) return true;
  return n.length < 4;
}

function chooseIngredientByPattern(names, pattern) {
  return names.find((name) => pattern.test(normalizeIngredient(name)));
}

function generateRecipeNameFromIngredients(ingredients, fallbackName = "Generated Recipe") {
  const names = (ingredients || []).map((item) => item?.item_name).filter(Boolean);
  if (!names.length) return fallbackName;

  const protein =
    chooseIngredientByPattern(names, /(chicken|beef|turkey|salmon|fish|shrimp|tofu|egg|lentil|chickpea|beans)/) || names[0];
  const base =
    chooseIngredientByPattern(names, /(rice|pasta|quinoa|potato|oats|noodle|tortilla|bread)/) ||
    chooseIngredientByPattern(names, /(onion|tomato|pepper|broccoli|spinach|mushroom|zucchini)/) ||
    names[1] ||
    "Skillet";

  const style = chooseIngredientByPattern(names, /(garlic|ginger|yogurt|curry|lemon|chili|herb)/);
  const nameParts = [toTitleCase(protein), toTitleCase(base)];
  if (style) nameParts.unshift(toTitleCase(style));

  const title = `${nameParts.join(" ")} Bowl`.replace(/\s+/g, " ").trim();
  return title.length >= 5 ? title : fallbackName;
}

function splitInstructions(value) {
  if (!value) return "";
  if (Array.isArray(value)) {
    return value
      .map((step, index) => `${index + 1}. ${String(step || "").trim()}`)
      .filter(Boolean)
      .join("\n");
  }
  return String(value).trim();
}

function normalizeIngredientItem(item) {
  if (typeof item === "string") {
    const label = item.trim();
    if (!label) return null;
    const parsedGrams = parseAmountToGrams(label);
    const item_name = normalizeNameFromLine(label) || label;
    const grams = toNonNegativeNumber(parsedGrams ?? estimateDefaultGrams(item_name), 60);
    return {
      item_name,
      grams,
      calories: 0,
      protein_g: 0,
      carbs_g: 0,
      fat_g: 0,
      quantity: grams,
      unit: "g"
    };
  }

  if (!item || typeof item !== "object") return null;
  const name = String(item.item_name || item.name || item.ingredient || item.label || "").trim();
  if (!name) return null;

  const fallbackGrams = parseAmountToGrams(name) ?? estimateDefaultGrams(name);
  const grams = toNonNegativeNumber(item.grams ?? item.quantity ?? fallbackGrams, fallbackGrams);

  return {
    item_name: name,
    grams,
    calories: toNonNegativeNumber(item.calories ?? item.calories_per_item, 0),
    protein_g: toNonNegativeNumber(item.protein_g ?? item.protein, 0),
    carbs_g: toNonNegativeNumber(item.carbs_g ?? item.carbs, 0),
    fat_g: toNonNegativeNumber(item.fat_g ?? item.fat, 0),
    quantity: grams,
    unit: String(item.unit || "g").trim() || "g",
    notes: item.notes ? String(item.notes).trim() : undefined
  };
}

function fillIngredientMacrosIfMissing(ingredient) {
  const hasMacros =
    Number(ingredient.calories || 0) > 0 ||
    Number(ingredient.protein_g || 0) > 0 ||
    Number(ingredient.carbs_g || 0) > 0 ||
    Number(ingredient.fat_g || 0) > 0;
  if (hasMacros) return ingredient;

  const grams = toNonNegativeNumber(ingredient.grams, estimateDefaultGrams(ingredient.item_name));
  const base = estimatePer100FromName(ingredient.item_name);
  const factor = grams / 100;
  return {
    ...ingredient,
    grams,
    quantity: grams,
    calories: round2(base.calories * factor),
    protein_g: round2(base.protein_g * factor),
    carbs_g: round2(base.carbs_g * factor),
    fat_g: round2(base.fat_g * factor)
  };
}

function finalizeRecipeMacros(recipe) {
  const servings = toPositiveInt(recipe.servings, 2);
  const enrichedIngredients = (recipe.ingredients || []).map(fillIngredientMacrosIfMissing);
  const totals = enrichedIngredients.reduce(
    (acc, item) => ({
      calories: acc.calories + Number(item.calories || 0),
      protein_g: acc.protein_g + Number(item.protein_g || 0),
      carbs_g: acc.carbs_g + Number(item.carbs_g || 0),
      fat_g: acc.fat_g + Number(item.fat_g || 0)
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  );

  return {
    ...recipe,
    servings,
    ingredients: enrichedIngredients,
    calories: round2(totals.calories / servings),
    protein_g: round2(totals.protein_g / servings),
    carbs_g: round2(totals.carbs_g / servings),
    fat_g: round2(totals.fat_g / servings)
  };
}

function buildGuaranteedFallbackRecipe(pantryItems, filters = {}) {
  const picked = (pantryItems || []).slice(0, 8).map((item) => normalizeIngredientItem(item)).filter(Boolean);
  const ingredients =
    picked.length > 0
      ? picked.map((item, index) => ({ ...item, sort_order: index }))
      : [
          { item_name: "onion", grams: 80, quantity: 80, unit: "g", calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, sort_order: 0 },
          { item_name: "olive oil", grams: 12, quantity: 12, unit: "g", calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, sort_order: 1 },
          { item_name: "salt", grams: 3, quantity: 3, unit: "g", calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, sort_order: 2 }
        ];

  const recipeName = generateRecipeNameFromIngredients(ingredients, "Pantry Stir-Fry Bowl");
  const servings = Math.max(1, toPositiveInt(filters?.servings, 2));

  const instructions = [
    "1. Prep and chop all ingredients into bite-size pieces.",
    "2. Heat a pan with oil on medium heat and cook aromatics first.",
    "3. Add the remaining ingredients and cook until tender and cooked through.",
    "4. Season to taste, divide into servings, and serve warm."
  ].join("\n");

  return finalizeRecipeMacros({
    name: recipeName,
    ingredients,
    instructions,
    prep_time_min: 10,
    cook_time_min: 18,
    servings,
    calories: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
    visibility: "private",
    status_tag: "to_try",
    ai_reason: "Generated from your pantry ingredients using local fallback."
  });
}

function normalizeGeneratedRecipe(rawRecipe, fallbackName = "AI Recipe") {
  const candidate = rawRecipe?.recipe && typeof rawRecipe.recipe === "object" ? rawRecipe.recipe : rawRecipe;
  const ingredients = Array.isArray(candidate?.ingredients)
    ? candidate.ingredients
    : Array.isArray(candidate?.ingredient_list)
      ? candidate.ingredient_list
      : [];
  const normalizedIngredients = ingredients
    .map(normalizeIngredientItem)
    .filter(Boolean)
    .map((item, index) => ({ ...item, sort_order: index }));

  if (!normalizedIngredients.length) return null;

  const instructions = splitInstructions(candidate?.instructions || candidate?.steps || candidate?.method || "");

  const rawName = String(candidate?.name || candidate?.title || "").trim();
  const normalized = {
    name: isWeakRecipeName(rawName) ? generateRecipeNameFromIngredients(normalizedIngredients, fallbackName) : rawName,
    ingredients: normalizedIngredients,
    instructions:
      instructions ||
      "1. Prep the ingredients.\n2. Cook using your preferred method until done.\n3. Season to taste and serve.",
    prep_time_min: toPositiveInt(candidate?.prep_time_min ?? candidate?.prep_minutes, 10),
    cook_time_min: toPositiveInt(candidate?.cook_time_min ?? candidate?.cook_minutes, 15),
    servings: toPositiveInt(candidate?.servings, 2),
    calories: toNonNegativeNumber(candidate?.calories, 0),
    protein_g: toNonNegativeNumber(candidate?.protein_g ?? candidate?.protein, 0),
    carbs_g: toNonNegativeNumber(candidate?.carbs_g ?? candidate?.carbs, 0),
    fat_g: toNonNegativeNumber(candidate?.fat_g ?? candidate?.fat, 0),
    visibility: "private",
    status_tag: "to_try",
    ai_reason: String(candidate?.ai_reason || "Generated from your available ingredients.").trim()
  };
  return finalizeRecipeMacros(normalized);
}

function parseTextRecipe(rawText, fallbackName = "AI Pantry Recipe") {
  const text = String(rawText || "").trim();
  if (!text) return null;

  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const titleLine =
    lines.find((line) => line.length > 4 && !/^(ingredients|instructions|steps|method)[:\s]*$/i.test(line)) || fallbackName;
  const parsedTitle = titleLine.replace(/^recipe[:\-\s]*/i, "").trim();

  const ingredientSectionStart = lines.findIndex((line) => /^ingredients[:\s]*$/i.test(line) || /^ingredients[:]/i.test(line));
  const stepsSectionStart = lines.findIndex((line) => /^(instructions|steps|method)[:\s]*$/i.test(line) || /^(instructions|steps|method)[:]/i.test(line));

  let ingredientLines = [];
  let stepLines = [];

  if (ingredientSectionStart >= 0) {
    const end = stepsSectionStart > ingredientSectionStart ? stepsSectionStart : lines.length;
    ingredientLines = lines.slice(ingredientSectionStart + 1, end);
  }

  if (stepsSectionStart >= 0) {
    stepLines = lines.slice(stepsSectionStart + 1);
  }

  if (!ingredientLines.length) {
    ingredientLines = lines.filter((line) => /^[-*•]/.test(line)).slice(0, 8);
  }
  if (!stepLines.length) {
    stepLines = lines.filter((line) => /^\d+[\).\-\s]/.test(line)).slice(0, 8);
  }

  const ingredients = ingredientLines
    .map((line) => line.replace(/^[-*•\d\).\-\s]+/, "").trim())
    .filter(Boolean)
    .map((item_name, index) => ({
      item_name,
      grams: 100,
      calories: 0,
      protein_g: 0,
      carbs_g: 0,
      fat_g: 0,
      quantity: 100,
      unit: "g",
      sort_order: index
    }));

  const instructions = stepLines
    .map((line) => line.replace(/^\d+[\).\-\s]+/, "").trim())
    .filter(Boolean)
    .map((line, index) => `${index + 1}. ${line}`)
    .join("\n");

  if (!ingredients.length) return null;

  const normalized = {
    name: isWeakRecipeName(parsedTitle) ? generateRecipeNameFromIngredients(ingredients, fallbackName) : parsedTitle,
    ingredients,
    instructions:
      instructions ||
      "1. Prep the ingredients.\n2. Cook in a pan or pot until done.\n3. Season to taste and serve.",
    prep_time_min: 10,
    cook_time_min: 20,
    servings: 2,
    calories: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
    visibility: "private",
    status_tag: "to_try",
    ai_reason: "Generated from your pantry ingredients."
  };
  return finalizeRecipeMacros(normalized);
}

async function rerankWithAi(pantryItems, deterministic, filters) {
  if (!deterministic.length) return deterministic;

  const systemPrompt = `
You are a nutrition-aware recipe recommendation assistant.
Given pantry ingredients and candidate recipes, return a JSON object with key "suggestions".
Each suggestion object must have:
- recipe_id (string)
- match_score (integer 0-100)
- missing_ingredients (string array)
- why_this_match (short string)
Only use recipe_id values from provided candidates.
`;

  const userPrompt = JSON.stringify({
    pantry_ingredients: pantryItems,
    filters,
    candidates: deterministic.map((item) => ({
      recipe_id: item.recipe_id,
      recipe_name: item.recipe_name,
      match_score: item.match_score,
      matched_ingredients: item.matched_ingredients,
      missing_ingredients: item.missing_ingredients,
      prep_time_min: item.prep_time_min,
      calories: item.calories,
      protein_g: item.protein_g
    }))
  });

  const raw = await generateStructuredJson({
    systemPrompt,
    userPrompt,
    maxTokens: 1200
  });

  const parsed = tryParseJson(raw);
  const aiSuggestions = Array.isArray(parsed?.suggestions) ? parsed.suggestions : [];
  if (!aiSuggestions.length) return deterministic;

  const deterministicById = new Map(deterministic.map((item) => [item.recipe_id, item]));
  const merged = aiSuggestions
    .map((item) => {
      const base = deterministicById.get(item.recipe_id);
      if (!base) return null;
      return {
        ...base,
        match_score: Math.max(0, Math.min(100, Number(item.match_score ?? base.match_score))),
        missing_ingredients: Array.isArray(item.missing_ingredients) ? item.missing_ingredients : base.missing_ingredients,
        why_this_match: item.why_this_match || base.why_this_match
      };
    })
    .filter(Boolean);

  return merged.length ? merged : deterministic;
}

async function generateNewRecipesWithAi(pantryItems, filters, existingSuggestions, limit = 3) {
  const systemPrompt = `
You create practical home-cook recipes from pantry ingredients.
Return strict JSON with a top-level "recipes" array.
Each recipe must include:
- name (string)
- ai_reason (string)
- prep_time_min (integer >= 0)
- cook_time_min (integer >= 0)
- servings (integer > 0)
- calories (number >= 0, per serving)
- protein_g (number >= 0, per serving)
- carbs_g (number >= 0, per serving)
- fat_g (number >= 0, per serving)
- ingredients (array of objects with item_name, grams, calories, protein_g, carbs_g, fat_g, unit)
- instructions (array of concise step strings)
Keep recipes realistic and mostly based on pantry ingredients. Missing ingredients should be minimal.
`;

  const prompts = [
    JSON.stringify({
      pantry_ingredients: pantryItems,
      filters,
      generate_count: limit,
      inspiration_from_existing_recipes: existingSuggestions.slice(0, 4).map((item) => ({
        recipe_name: item.recipe_name,
        missing_ingredients: item.missing_ingredients,
        match_score: item.match_score
      }))
    }),
    JSON.stringify({
      pantry_ingredients: pantryItems,
      filters,
      generate_count: limit,
      instruction:
        'Return only JSON in this exact shape: {"recipes":[{"name":"...","ai_reason":"...","prep_time_min":10,"cook_time_min":20,"servings":2,"calories":430,"protein_g":28,"carbs_g":38,"fat_g":14,"ingredients":[{"item_name":"...","grams":100,"calories":120,"protein_g":8,"carbs_g":5,"fat_g":6,"unit":"g"}],"instructions":["Step 1","Step 2"]}]}.'
    }),
    JSON.stringify({
      pantry_ingredients: pantryItems,
      filters,
      instruction:
        "Create one complete recipe only. Return JSON object with keys: name, ingredients, instructions, prep_time_min, cook_time_min, servings, calories, protein_g, carbs_g, fat_g."
    })
  ];

  for (const userPrompt of prompts) {
    const raw = await generateStructuredJson({
      systemPrompt,
      userPrompt,
      maxTokens: 1800
    });

    const parsed = tryParseJson(raw);
    const rawRecipes = extractRecipeArray(parsed);
    const normalized = rawRecipes
      .map((item, index) => normalizeGeneratedRecipe(item, `AI Pantry Recipe ${index + 1}`))
      .filter(Boolean)
      .slice(0, limit);

    if (normalized.length > 0) return normalized;
  }

  // Fallback path: ask model in plain text style and parse it.
  const textPrompt = `Use these pantry items to generate ${limit} practical recipes: ${pantryItems.join(
    ", "
  )}. Include sections: Recipe Name, Ingredients, Instructions. Keep it concise and realistic.`;
  const textOutput = await generateTextCompletion({
    systemPrompt: "You are a helpful cooking assistant that writes complete, practical recipes.",
    userPrompt: textPrompt,
    maxTokens: 1400
  });
  const textBased = parseTextRecipe(textOutput, "AI Pantry Recipe");
  if (textBased) return [textBased];

  return [buildGuaranteedFallbackRecipe(pantryItems, filters)];
}

export async function suggestRecipesFromPantry(supabase, userId, pantryText, filters = {}) {
  const pantryItems = parsePantryText(pantryText);
  if (!pantryItems.length) {
    throw new Error("Please add at least one ingredient.");
  }

  const includePublic = Boolean(filters.includePublic);
  let query = supabase
    .from("recipes")
    .select("id,name,cuisine,prep_time_min,calories,protein_g,visibility,owner_id,recipe_ingredients(item_name)")
    .order("created_at", { ascending: false });

  if (includePublic) {
    query = query.or(`owner_id.eq.${userId},visibility.eq.public`);
  } else {
    query = query.eq("owner_id", userId);
  }

  const { data: recipes, error } = await query.limit(60);
  if (error) throw error;

  let candidateRecipes = recipes || [];
  let deterministic = buildDeterministicSuggestions(candidateRecipes, pantryItems, filters, Number(filters.limit || 6));

  // Auto-broaden with public recipes when personal results are weak.
  if (!includePublic && deterministic.length < 3) {
    const { data: publicRecipes, error: publicError } = await supabase
      .from("recipes")
      .select("id,name,cuisine,prep_time_min,calories,protein_g,visibility,owner_id,recipe_ingredients(item_name)")
      .or(`owner_id.eq.${userId},visibility.eq.public`)
      .order("created_at", { ascending: false })
      .limit(90);
    if (!publicError) {
      candidateRecipes = publicRecipes || candidateRecipes;
      deterministic = buildDeterministicSuggestions(candidateRecipes, pantryItems, { ...filters, includePublic: true }, Number(filters.limit || 6));
    }
  }

  const suggestions = await rerankWithAi(pantryItems, deterministic, filters);
  const generatedRecipes = await generateNewRecipesWithAi(
    pantryItems,
    filters,
    suggestions,
    Math.min(5, Math.max(1, Number(filters.generatedCount || 3)))
  );

  return {
    pantry_items: pantryItems,
    suggestions,
    generated_recipes: generatedRecipes
  };
}
