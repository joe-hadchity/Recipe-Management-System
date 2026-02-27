const OPEN_FOOD_FACTS_BASE_URL = process.env.OPENFOODFACTS_BASE_URL || "https://world.openfoodfacts.org";

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function searchOpenFoodFacts(query) {
  if (!query?.trim()) {
    return [];
  }

  const url = new URL("/cgi/search.pl", OPEN_FOOD_FACTS_BASE_URL);
  url.searchParams.set("search_terms", query.trim());
  url.searchParams.set("search_simple", "1");
  url.searchParams.set("action", "process");
  url.searchParams.set("json", "1");
  url.searchParams.set("page_size", "20");

  const response = await fetch(url.toString(), {
    headers: {
      "User-Agent": "RecipeAIManager/1.0 (food-logging)"
    }
  });

  if (!response.ok) {
    throw new Error("Failed to search Open Food Facts.");
  }

  const data = await response.json();
  const products = Array.isArray(data.products) ? data.products : [];

  return products
    .filter((product) => product.product_name)
    .map((product) => ({
      source: "openfoodfacts",
      external_id: String(product.code || ""),
      name: product.product_name,
      brand: product.brands || "",
      calories_per_100g: toNumber(product.nutriments?.["energy-kcal_100g"]),
      protein_per_100g: toNumber(product.nutriments?.proteins_100g),
      carbs_per_100g: toNumber(product.nutriments?.carbohydrates_100g),
      fat_per_100g: toNumber(product.nutriments?.fat_100g)
    }))
    .slice(0, 20);
}
