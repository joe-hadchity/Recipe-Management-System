"use client";

import Link from "next/link";
import { useState } from "react";
import CardSection from "@/components/ui/CardSection";
import FieldLabel from "@/components/ui/FieldLabel";
import FormHelpText from "@/components/ui/FormHelpText";
import NumberInput from "@/components/ui/NumberInput";
import PrimaryButton from "@/components/ui/PrimaryButton";
import TextInput from "@/components/ui/TextInput";

export default function IngredientSuggestionPanel() {
  const [pantryText, setPantryText] = useState("");
  const [filters, setFilters] = useState({
    maxPrepTime: "",
    maxCalories: "",
    minProtein: "",
    cuisine: "",
    includePublic: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [pantryItems, setPantryItems] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [generatedRecipes, setGeneratedRecipes] = useState([]);
  const [savingName, setSavingName] = useState("");

  async function onSuggest() {
    setError("");
    setIsLoading(true);
    try {
      const response = await fetch("/api/ai/ingredient-recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pantryText,
          filters: {
            ...filters,
            maxPrepTime: filters.maxPrepTime ? Number(filters.maxPrepTime) : undefined,
            maxCalories: filters.maxCalories ? Number(filters.maxCalories) : undefined,
            minProtein: filters.minProtein ? Number(filters.minProtein) : undefined
          }
        })
      });
      const json = await response.json();
      if (!response.ok) {
        setError(json.error || "Failed to generate suggestions.");
        setSuggestions([]);
        setGeneratedRecipes([]);
        return;
      }
      setPantryItems(json.pantry_items || []);
      setSuggestions(json.suggestions || []);
      setGeneratedRecipes(json.generated_recipes || []);
    } catch {
      setError("Could not generate recipe suggestions right now.");
      setSuggestions([]);
      setGeneratedRecipes([]);
    } finally {
      setIsLoading(false);
    }
  }

  async function saveGeneratedRecipe(recipe) {
    setError("");
    setSavingName(recipe.name);
    try {
      const payload = {
        name: recipe.name,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
        prep_time_min: Number(recipe.prep_time_min || 0),
        cook_time_min: Number(recipe.cook_time_min || 0),
        servings: Number(recipe.servings || 1),
        calories: Number(recipe.calories || 0),
        protein_g: Number(recipe.protein_g || 0),
        carbs_g: Number(recipe.carbs_g || 0),
        fat_g: Number(recipe.fat_g || 0),
        visibility: "private",
        status_tag: "to_try"
      };

      const response = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await response.json();
      if (!response.ok) {
        setError(json.error || "Could not save generated recipe.");
        return;
      }
      setGeneratedRecipes((prev) => prev.filter((item) => item.name !== recipe.name));
    } catch {
      setError("Could not save generated recipe right now.");
    } finally {
      setSavingName("");
    }
  }

  return (
    <CardSection
      title="What I Have (AI Suggestions)"
      description="AI will generate new full recipes and also suggest best matches from your recipes/Explore."
    >
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="lg:col-span-2">
          <FieldLabel htmlFor="pantry-text" required>
            Ingredients you have
          </FieldLabel>
          <textarea
            id="pantry-text"
            value={pantryText}
            onChange={(e) => setPantryText(e.target.value)}
            placeholder="eggs, tomato, onion, rice, chicken breast"
            rows={4}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-800 shadow-sm transition focus:border-violet-400"
          />
          <FormHelpText>Use commas or new lines. Example: eggs, greek yogurt, oats.</FormHelpText>
        </div>
        <div>
          <FieldLabel htmlFor="max-prep-time">Max prep time (min)</FieldLabel>
          <NumberInput
            id="max-prep-time"
            min={0}
            value={filters.maxPrepTime}
            onChange={(e) => setFilters((prev) => ({ ...prev, maxPrepTime: e.target.value }))}
          />
        </div>
        <div>
          <FieldLabel htmlFor="max-calories">Max calories</FieldLabel>
          <NumberInput
            id="max-calories"
            min={0}
            value={filters.maxCalories}
            onChange={(e) => setFilters((prev) => ({ ...prev, maxCalories: e.target.value }))}
          />
        </div>
        <div>
          <FieldLabel htmlFor="min-protein">Min protein (g)</FieldLabel>
          <NumberInput
            id="min-protein"
            min={0}
            value={filters.minProtein}
            onChange={(e) => setFilters((prev) => ({ ...prev, minProtein: e.target.value }))}
          />
        </div>
        <div>
          <FieldLabel htmlFor="cuisine-filter">Cuisine (optional)</FieldLabel>
          <TextInput
            id="cuisine-filter"
            value={filters.cuisine}
            onChange={(e) => setFilters((prev) => ({ ...prev, cuisine: e.target.value }))}
            placeholder="italian"
          />
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <input
          id="include-public"
          type="checkbox"
          checked={filters.includePublic}
          onChange={(e) => setFilters((prev) => ({ ...prev, includePublic: e.target.checked }))}
          className="h-4 w-4 rounded border-slate-300"
        />
        <label htmlFor="include-public" className="text-sm text-slate-700">
          Include public recipes from Explore
        </label>
      </div>

      <div className="mt-4">
        <PrimaryButton onClick={onSuggest} disabled={isLoading}>
          {isLoading ? "Generating..." : "AI Generate + Suggest Recipes"}
        </PrimaryButton>
      </div>

      {error ? (
        <div className="mt-3 rounded-xl border border-rose-100 bg-rose-50 p-3">
          <FormHelpText isError>{error}</FormHelpText>
        </div>
      ) : null}

      {pantryItems.length ? (
        <p className="mt-4 text-xs text-slate-500">Pantry parsed: {pantryItems.join(", ")}</p>
      ) : null}

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {suggestions.map((item) => (
          <article key={item.recipe_id} className="rounded-xl border border-violet-100 bg-violet-50/50 p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold text-slate-800">{item.recipe_name}</p>
              <span className="rounded-full bg-violet-600 px-2 py-0.5 text-xs font-semibold text-white">
                {item.match_score}% match
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-600">{item.why_this_match}</p>
            <p className="mt-2 text-xs text-slate-500">
              {item.calories} kcal | {item.protein_g}P | Prep {item.prep_time_min || 0} min
            </p>
            {item.missing_ingredients?.length ? (
              <p className="mt-2 text-xs text-slate-600">Missing: {item.missing_ingredients.join(", ")}</p>
            ) : (
              <p className="mt-2 text-xs text-emerald-700">You already have the key ingredients.</p>
            )}
            <div className="mt-3">
              <Link href={`/recipes/${item.recipe_id}`} className="text-sm font-semibold text-violet-700 hover:text-violet-800">
                View recipe
              </Link>
            </div>
          </article>
        ))}
      </div>

      {generatedRecipes.length ? (
        <div className="mt-6">
          <h3 className="text-base font-semibold text-slate-800">New AI Generated Recipes</h3>
          <p className="mt-1 text-sm text-slate-500">These are fully generated recipes from your ingredients. Save any of them directly.</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {generatedRecipes.map((item, index) => (
              <article key={`${item.name}-${index}`} className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
                <p className="font-semibold text-slate-800">{item.name}</p>
                <p className="mt-1 text-sm text-slate-600">{item.ai_reason}</p>
                <p className="mt-2 text-xs text-slate-500">
                  {item.calories} kcal | {item.protein_g}P {item.carbs_g}C {item.fat_g}F | Prep {item.prep_time_min} min | Cook{" "}
                  {item.cook_time_min} min
                </p>
                <p className="mt-2 text-xs text-slate-600">
                  Ingredients: {item.ingredients?.map((ingredient) => ingredient.item_name).slice(0, 6).join(", ")}
                  {item.ingredients?.length > 6 ? ", ..." : ""}
                </p>
                <p className="mt-2 max-h-20 overflow-hidden text-xs text-slate-600 whitespace-pre-line">{item.instructions}</p>
                <div className="mt-3">
                  <PrimaryButton onClick={() => saveGeneratedRecipe(item)} disabled={savingName === item.name}>
                    {savingName === item.name ? "Saving..." : "Save as Recipe"}
                  </PrimaryButton>
                </div>
              </article>
            ))}
          </div>
        </div>
      ) : null}

      {!isLoading && !error && pantryItems.length > 0 && suggestions.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">No matching recipes found. Try removing a filter or adding more pantry items.</p>
      ) : null}
      {!isLoading && !error && pantryItems.length > 0 && generatedRecipes.length === 0 ? (
        <p className="mt-2 text-sm text-amber-700">
          AI could not return generated recipes this time. Try again or shorten your pantry text.
        </p>
      ) : null}
    </CardSection>
  );
}
