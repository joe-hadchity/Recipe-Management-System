const EDAMAM_BASE_URL = "https://api.edamam.com/api/nutrition-details";

export function fallbackNutritionEstimate(servings = 1) {
  return {
    calories: 400 / servings,
    protein_g: 20 / servings,
    carbs_g: 40 / servings,
    fat_g: 15 / servings
  };
}

export async function analyzeNutrition({ ingredients, servings = 1 }) {
  const appId = process.env.EDAMAM_APP_ID;
  const appKey = process.env.EDAMAM_APP_KEY;

  if (!appId || !appKey) {
    return fallbackNutritionEstimate(servings);
  }

  const url = `${EDAMAM_BASE_URL}?app_id=${appId}&app_key=${appKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ingr: ingredients })
  });

  if (!response.ok) {
    return fallbackNutritionEstimate(servings);
  }

  const data = await response.json();
  return {
    calories: Number((data.calories / servings).toFixed(2)),
    protein_g: Number((data.totalNutrients?.PROCNT?.quantity / servings || 0).toFixed(2)),
    carbs_g: Number((data.totalNutrients?.CHOCDF?.quantity / servings || 0).toFixed(2)),
    fat_g: Number((data.totalNutrients?.FAT?.quantity / servings || 0).toFixed(2))
  };
}
