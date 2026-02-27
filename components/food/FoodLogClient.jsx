"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import CardSection from "@/components/ui/CardSection";
import FieldLabel from "@/components/ui/FieldLabel";
import FormHelpText from "@/components/ui/FormHelpText";
import NumberInput from "@/components/ui/NumberInput";
import PageHeader from "@/components/ui/PageHeader";
import PrimaryButton from "@/components/ui/PrimaryButton";
import SecondaryButton from "@/components/ui/SecondaryButton";
import TextInput from "@/components/ui/TextInput";

function todayDateString() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function FoodLogClient() {
  const [date, setDate] = useState(todayDateString());
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedFood, setSelectedFood] = useState(null);
  const [servingGrams, setServingGrams] = useState(100);
  const [notes, setNotes] = useState("");
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [manualFoodName, setManualFoodName] = useState("");
  const [manualMacros, setManualMacros] = useState({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  const [logs, setLogs] = useState([]);
  const [totals, setTotals] = useState({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  const [isAdding, setIsAdding] = useState(false);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState("neutral");
  const [recipes, setRecipes] = useState([]);
  const [selectedRecipeId, setSelectedRecipeId] = useState("");
  const [recipeServings, setRecipeServings] = useState(1);

  const refreshLogs = useCallback(async (targetDate = date) => {
    try {
      const [logsResponse, dailyResponse] = await Promise.all([
        fetch(`/api/foods/logs?date=${targetDate}`),
        fetch(`/api/nutrition/daily?date=${targetDate}`)
      ]);
      const logsJson = await logsResponse.json();
      const dailyJson = await dailyResponse.json();

      if (logsResponse.ok) setLogs(logsJson.logs || []);
      if (dailyResponse.ok) setTotals(dailyJson.totals || { calories: 0, protein: 0, carbs: 0, fat: 0 });
    } catch {
      setMessageTone("error");
      setMessage("Could not refresh food logs right now.");
    }
  }, [date]);

  async function addFoodLog(payload) {
    setIsAdding(true);
    setMessage("");
    setMessageTone("neutral");
    try {
      const response = await fetch("/api/foods/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          serving_grams: Number(payload.serving_grams ?? servingGrams),
          consumed_at: `${date}T12:00:00.000Z`,
          notes
        })
      });
      const json = await response.json();
      if (!response.ok) {
        setMessageTone("error");
        setMessage(json.error || "Failed to add food log.");
        return;
      }
      setMessageTone("success");
      setMessage("Food log added.");
      setSelectedFood(null);
      setNotes("");
      setSearchResults([]);
      setQuery("");
      await refreshLogs(date);
    } finally {
      setIsAdding(false);
    }
  }

  async function addSelectedFood() {
    if (!selectedFood) {
      setMessageTone("error");
      setMessage("Select a food item first.");
      return;
    }
    await addFoodLog({ food_item: selectedFood });
  }

  async function addManualFood() {
    if (!manualFoodName.trim()) {
      setMessageTone("error");
      setMessage("Enter a manual food name.");
      return;
    }
    await addFoodLog({
      food_item: {
        source: "manual",
        name: manualFoodName.trim(),
        calories_per_100g: Number(manualMacros.calories),
        protein_per_100g: Number(manualMacros.protein),
        carbs_per_100g: Number(manualMacros.carbs),
        fat_per_100g: Number(manualMacros.fat)
      }
    });
  }

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await fetch(`/api/foods/search?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal
        });
        const json = await response.json();
        if (!response.ok) {
          setMessageTone("error");
          setMessage(json.error || "Live search failed.");
          return;
        }
        setSearchResults(json.foods || []);
      } catch (error) {
        if (error.name !== "AbortError") {
          setMessageTone("error");
          setMessage("Could not complete live search.");
        }
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [query]);

  useEffect(() => {
    refreshLogs(date);
  }, [date, refreshLogs]);

  useEffect(() => {
    async function loadRecipes() {
      const response = await fetch("/api/recipes");
      const json = await response.json().catch(() => ({}));
      if (response.ok) {
        setRecipes(json.recipes || []);
      }
    }
    loadRecipes();
  }, []);

  const selectedPreview = useMemo(() => {
    if (!selectedFood) return null;
    const factor = Number(servingGrams || 0) / 100;
    return {
      calories: Number(((selectedFood.calories_per_100g || 0) * factor).toFixed(2)),
      protein: Number(((selectedFood.protein_per_100g || 0) * factor).toFixed(2)),
      carbs: Number(((selectedFood.carbs_per_100g || 0) * factor).toFixed(2)),
      fat: Number(((selectedFood.fat_per_100g || 0) * factor).toFixed(2))
    };
  }, [selectedFood, servingGrams]);

  return (
    <section className="space-y-6">
      <PageHeader
        title="Food Log"
        subtitle="Live search foods and add them quickly. Use manual entry only when needed."
      />

      <CardSection title="Daily Totals" description="Totals are calculated from your logged foods for the selected date.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Calories", key: "calories", unit: "kcal" },
            { label: "Protein", key: "protein", unit: "g" },
            { label: "Carbs", key: "carbs", unit: "g" },
            { label: "Fat", key: "fat", unit: "g" }
          ].map((item) => (
            <div key={item.key} className="rounded-xl bg-violet-50 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">{item.label}</p>
              <p className="text-lg font-semibold text-slate-800">
                {Number(totals[item.key] || 0)} {item.unit}
              </p>
            </div>
          ))}
        </div>
      </CardSection>

      <CardSection title="Date">
        <div className="max-w-sm">
          <FieldLabel htmlFor="log-date">Select date</FieldLabel>
          <TextInput id="log-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </CardSection>

      <CardSection title="Quick Log a Created Recipe" description="Log one of your saved recipes directly to today's food log.">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="md:col-span-2">
            <FieldLabel htmlFor="recipe-log-select">Recipe</FieldLabel>
            <select
              id="recipe-log-select"
              value={selectedRecipeId}
              onChange={(e) => setSelectedRecipeId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-800 shadow-sm"
            >
              <option value="">Select recipe</option>
              {recipes.map((recipe) => (
                <option key={recipe.id} value={recipe.id}>
                  {recipe.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel htmlFor="recipe-log-servings">Servings</FieldLabel>
            <NumberInput
              id="recipe-log-servings"
              min={0.25}
              step={0.25}
              value={recipeServings}
              onChange={(e) => setRecipeServings(Number(e.target.value))}
            />
          </div>
        </div>
        <div className="mt-3">
          <PrimaryButton
            onClick={async () => {
              if (!selectedRecipeId) {
                setMessageTone("error");
                setMessage("Select a recipe first.");
                return;
              }
              await addFoodLog({
                recipe_id: selectedRecipeId,
                recipe_servings: recipeServings,
                serving_grams: Math.max(1, Number(recipeServings) * 100)
              });
            }}
            disabled={isAdding}
          >
            {isAdding ? "Logging..." : "Log Recipe"}
          </PrimaryButton>
        </div>
      </CardSection>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <CardSection title="1) Live Food Search" description="Type at least 2 characters. Results update automatically.">
          <div className="space-y-3">
            <TextInput
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by food name or brand (elastic-style live search)"
            />
            {isSearching ? <p className="text-sm text-slate-500">Searching...</p> : null}
            {!isSearching && query.trim().length > 1 && !searchResults.length ? (
              <p className="text-sm text-slate-500">No foods found. Try a broader term or use manual entry below.</p>
            ) : null}
            <div className="max-h-96 space-y-2 overflow-auto pr-1">
              {searchResults.map((food, index) => (
                <button
                  type="button"
                  key={`${food.external_id || food.name}-${index}`}
                  onClick={() => setSelectedFood(food)}
                  className={`w-full rounded-xl border p-3 text-left transition ${
                    selectedFood?.external_id === food.external_id && selectedFood?.name === food.name
                      ? "border-violet-400 bg-violet-50"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <p className="font-medium text-slate-800">{food.name}</p>
                  <p className="text-sm text-slate-500">{food.brand || "No brand"}</p>
                  <p className="text-xs text-slate-500">
                    Per 100g: {food.calories_per_100g || 0} kcal, {food.protein_per_100g || 0}P, {food.carbs_per_100g || 0}C,{" "}
                    {food.fat_per_100g || 0}F
                  </p>
                </button>
              ))}
            </div>
          </div>

          <details
            className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3"
            open={isManualOpen}
            onToggle={(e) => setIsManualOpen(e.currentTarget.open)}
          >
            <summary className="cursor-pointer text-sm font-semibold text-slate-700">Manual food entry (optional)</summary>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div className="md:col-span-2">
                <FieldLabel htmlFor="manual-name">Food name</FieldLabel>
                <TextInput
                  id="manual-name"
                  value={manualFoodName}
                  onChange={(e) => setManualFoodName(e.target.value)}
                  placeholder="Homemade chicken soup"
                />
              </div>
              <div>
                <FieldLabel htmlFor="manual-calories">Calories per 100g</FieldLabel>
                <NumberInput
                  id="manual-calories"
                  min={0}
                  value={manualMacros.calories}
                  onChange={(e) => setManualMacros({ ...manualMacros, calories: Number(e.target.value) })}
                />
              </div>
              <div>
                <FieldLabel htmlFor="manual-protein">Protein per 100g</FieldLabel>
                <NumberInput
                  id="manual-protein"
                  min={0}
                  value={manualMacros.protein}
                  onChange={(e) => setManualMacros({ ...manualMacros, protein: Number(e.target.value) })}
                />
              </div>
              <div>
                <FieldLabel htmlFor="manual-carbs">Carbs per 100g</FieldLabel>
                <NumberInput
                  id="manual-carbs"
                  min={0}
                  value={manualMacros.carbs}
                  onChange={(e) => setManualMacros({ ...manualMacros, carbs: Number(e.target.value) })}
                />
              </div>
              <div>
                <FieldLabel htmlFor="manual-fat">Fat per 100g</FieldLabel>
                <NumberInput
                  id="manual-fat"
                  min={0}
                  value={manualMacros.fat}
                  onChange={(e) => setManualMacros({ ...manualMacros, fat: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="mt-3">
              <SecondaryButton onClick={addManualFood} disabled={isAdding}>
                {isAdding ? "Adding..." : "Add Manual Food"}
              </SecondaryButton>
            </div>
          </details>
        </CardSection>

        <CardSection title="2) Add Selected Food" description="Adjust serving size and confirm before adding.">
          {selectedFood ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-violet-100 bg-violet-50 p-3">
                <p className="font-semibold text-slate-800">{selectedFood.name}</p>
                <p className="text-sm text-slate-500">{selectedFood.brand || "No brand"}</p>
                <p className="mt-2 text-xs text-slate-500">
                  Per 100g: {selectedFood.calories_per_100g || 0} kcal, {selectedFood.protein_per_100g || 0}P,{" "}
                  {selectedFood.carbs_per_100g || 0}C, {selectedFood.fat_per_100g || 0}F
                </p>
              </div>
              <div className="grid gap-3">
                <div>
                  <FieldLabel htmlFor="serving-grams">Serving grams</FieldLabel>
                  <NumberInput
                    id="serving-grams"
                    min={1}
                    value={servingGrams}
                    onChange={(e) => setServingGrams(Number(e.target.value))}
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="food-note">Note (optional)</FieldLabel>
                  <TextInput
                    id="food-note"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Breakfast, post workout, etc."
                  />
                </div>
              </div>
              {selectedPreview ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="rounded-lg bg-slate-50 p-2 text-sm">Calories: {selectedPreview.calories} kcal</div>
                  <div className="rounded-lg bg-slate-50 p-2 text-sm">Protein: {selectedPreview.protein} g</div>
                  <div className="rounded-lg bg-slate-50 p-2 text-sm">Carbs: {selectedPreview.carbs} g</div>
                  <div className="rounded-lg bg-slate-50 p-2 text-sm">Fat: {selectedPreview.fat} g</div>
                </div>
              ) : null}
              <PrimaryButton onClick={addSelectedFood} disabled={isAdding}>
                {isAdding ? "Adding..." : "Add Food to Log"}
              </PrimaryButton>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Choose a food from live search results to continue.</p>
          )}
        </CardSection>
      </div>

      {message ? (
        <div
          className={`rounded-xl border p-3 ${
            messageTone === "error"
              ? "border-rose-100 bg-rose-50"
              : messageTone === "success"
                ? "border-emerald-100 bg-emerald-50"
                : "border-violet-100 bg-violet-50"
          }`}
          role="status"
          aria-live="polite"
        >
          <FormHelpText isError={messageTone === "error"}>{message}</FormHelpText>
        </div>
      ) : null}

      <CardSection title="Logged Foods" description="Most recent entries for the selected date.">
        <div className="space-y-2">
          {logs.length ? (
            logs.map((log) => (
              <div key={log.id} className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="font-medium text-slate-800">
                  {log.recipes?.name ? `Recipe: ${log.recipes.name}` : log.food_items?.name}
                  {!log.recipes?.name && log.food_items?.brand ? ` (${log.food_items.brand})` : ""}
                </p>
                <p className="text-sm text-slate-500">
                  {log.serving_grams}g | {log.calories} kcal | {log.protein_g}P {log.carbs_g}C {log.fat_g}F
                </p>
                {log.notes ? <p className="mt-1 text-xs text-slate-500">{log.notes}</p> : null}
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500">No food logs for this date yet.</p>
          )}
        </div>
      </CardSection>
    </section>
  );
}
