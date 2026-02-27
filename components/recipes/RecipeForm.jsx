"use client";

import { useMemo, useState } from "react";
import CardSection from "@/components/ui/CardSection";
import FieldLabel from "@/components/ui/FieldLabel";
import FormHelpText from "@/components/ui/FormHelpText";
import NumberInput from "@/components/ui/NumberInput";
import PrimaryButton from "@/components/ui/PrimaryButton";
import SecondaryButton from "@/components/ui/SecondaryButton";
import SelectInput from "@/components/ui/SelectInput";
import TextInput from "@/components/ui/TextInput";
import { RECIPE_STATUS_TAGS, VISIBILITY_OPTIONS } from "@/lib/constants/tags";

const blankIngredient = {
  item_name: "",
  food_item_id: undefined,
  grams: 100,
  calories: 0,
  protein_g: 0,
  carbs_g: 0,
  fat_g: 0,
  quantity: 0,
  unit: "g",
  notes: "",
  sort_order: 0
};

function normalizeIngredientFromFood(food, index) {
  return {
    ...blankIngredient,
    item_name: food.name || "",
    food_item_id: food.id || undefined,
    grams: 100,
    calories: Number(food.calories_per_100g || 0),
    protein_g: Number(food.protein_per_100g || 0),
    carbs_g: Number(food.carbs_per_100g || 0),
    fat_g: Number(food.fat_per_100g || 0),
    quantity: 100,
    unit: "g",
    notes: "",
    sort_order: index
  };
}

export default function RecipeForm({ initialValues = null, onSubmit }) {
  const normalizedInitialValues = initialValues
    ? {
        ...initialValues,
        ingredients:
          Array.isArray(initialValues.ingredients) && initialValues.ingredients.length
            ? initialValues.ingredients.map((ingredient, index) => ({
                ...blankIngredient,
                ...ingredient,
                grams: Number(ingredient.grams ?? ingredient.quantity ?? 100),
                quantity: Number(ingredient.quantity ?? ingredient.grams ?? 100),
                unit: ingredient.unit || "g",
                sort_order: Number(ingredient.sort_order ?? index)
              }))
            : [blankIngredient]
      }
    : null;

  const [form, setForm] = useState(
    normalizedInitialValues || {
      name: "",
      ingredients: [blankIngredient],
      instructions: "",
      prep_time_min: 15,
      cook_time_min: 20,
      servings: 2,
      calories: undefined,
      protein_g: undefined,
      carbs_g: undefined,
      fat_g: undefined,
      visibility: "private",
      status_tag: "to_try"
    }
  );
  const [error, setError] = useState("");
  const [ingredientQueries, setIngredientQueries] = useState({});
  const [ingredientResults, setIngredientResults] = useState({});
  const [searchingIndex, setSearchingIndex] = useState(null);

  const updateIngredient = (index, key, value) => {
    const ingredients = [...form.ingredients];
    ingredients[index] = { ...ingredients[index], [key]: value };
    setForm((prev) => ({ ...prev, ingredients }));
  };

  const removeIngredient = (index) => {
    const nextIngredients = form.ingredients.filter((_, ingredientIndex) => ingredientIndex !== index);
    setForm((prev) => ({ ...prev, ingredients: nextIngredients.length ? nextIngredients : [blankIngredient] }));
  };

  const addIngredient = () => setForm((prev) => ({ ...prev, ingredients: [...prev.ingredients, blankIngredient] }));

  const runIngredientSearch = async (index) => {
    const q = (ingredientQueries[index] || "").trim();
    if (!q) return;
    setSearchingIndex(index);
    try {
      const response = await fetch(`/api/foods/search?q=${encodeURIComponent(q)}`);
      const json = await response.json();
      if (!response.ok) {
        setError(json.error || "Failed to search foods.");
        return;
      }
      setIngredientResults((prev) => ({ ...prev, [index]: json.foods || [] }));
    } finally {
      setSearchingIndex(null);
    }
  };

  const selectFoodForIngredient = (index, food) => {
    const ingredients = [...form.ingredients];
    ingredients[index] = normalizeIngredientFromFood(food, index);
    setForm((prev) => ({ ...prev, ingredients }));
    setIngredientResults((prev) => ({ ...prev, [index]: [] }));
    setIngredientQueries((prev) => ({ ...prev, [index]: food.name || "" }));
  };

  const perServingTotals = useMemo(() => {
    const ingredientList = Array.isArray(form.ingredients) ? form.ingredients : [];
    const totals = ingredientList.reduce(
      (acc, ingredient) => {
        const grams = Number(ingredient.grams || 0);
        const factor = grams / 100;
        acc.calories += Number(ingredient.calories || 0) * factor;
        acc.protein += Number(ingredient.protein_g || 0) * factor;
        acc.carbs += Number(ingredient.carbs_g || 0) * factor;
        acc.fat += Number(ingredient.fat_g || 0) * factor;
        return acc;
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
    const servings = Math.max(1, Number(form.servings || 1));
    const calculated = {
      calories: Number((totals.calories / servings).toFixed(2)),
      protein: Number((totals.protein / servings).toFixed(2)),
      carbs: Number((totals.carbs / servings).toFixed(2)),
      fat: Number((totals.fat / servings).toFixed(2))
    };

    const hasCalculatedMacros =
      calculated.calories > 0 || calculated.protein > 0 || calculated.carbs > 0 || calculated.fat > 0;

    if (hasCalculatedMacros) {
      return calculated;
    }

    // Keep existing saved macros when legacy ingredient rows lack per-ingredient nutrition.
    return {
      calories: Number(form.calories || 0),
      protein: Number(form.protein_g || 0),
      carbs: Number(form.carbs_g || 0),
      fat: Number(form.fat_g || 0)
    };
  }, [form.ingredients, form.servings, form.calories, form.protein_g, form.carbs_g, form.fat_g]);

  const fieldIds = {
    name: "recipe-name",
    instructions: "recipe-instructions",
    prep: "recipe-prep-time",
    cook: "recipe-cook-time",
    servings: "recipe-servings",
    calories: "recipe-calories",
    protein: "recipe-protein",
    carbs: "recipe-carbs",
    fat: "recipe-fat",
    visibility: "recipe-visibility",
    status: "recipe-status"
  };

  return (
    <form
      className="space-y-5"
      noValidate
      onSubmit={async (event) => {
        event.preventDefault();
        setError("");
        const cleanedIngredients = form.ingredients.filter((item) => item.item_name.trim());
        if (!form.name.trim()) {
          setError("Recipe name is required.");
          return;
        }
        if (!cleanedIngredients.length) {
          setError("Add at least one ingredient before saving.");
          return;
        }

        await onSubmit?.({
          ...form,
          calories: perServingTotals.calories,
          protein_g: perServingTotals.protein,
          carbs_g: perServingTotals.carbs,
          fat_g: perServingTotals.fat,
          ingredients: cleanedIngredients.map((item, i) => ({
            ...item,
            food_item_id: item.food_item_id || undefined,
            sort_order: i
          }))
        });
      }}
    >
      <CardSection title="Recipe Basics" description="Give your recipe a clear name and core prep details.">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <FieldLabel htmlFor={fieldIds.name} required>
              Recipe name
            </FieldLabel>
            <TextInput
              id={fieldIds.name}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Example: High Protein Chicken Bowl"
            />
          </div>
          <div>
            <FieldLabel htmlFor={fieldIds.servings} required>
              Servings
            </FieldLabel>
            <NumberInput
              id={fieldIds.servings}
              min={1}
              value={form.servings}
              onChange={(e) => setForm({ ...form, servings: Number(e.target.value) })}
            />
          </div>
          <div>
            <FieldLabel htmlFor={fieldIds.prep} required>
              Prep time (minutes)
            </FieldLabel>
            <NumberInput
              id={fieldIds.prep}
              min={0}
              value={form.prep_time_min}
              onChange={(e) => setForm({ ...form, prep_time_min: Number(e.target.value) })}
            />
          </div>
          <div>
            <FieldLabel htmlFor={fieldIds.cook} required>
              Cook time (minutes)
            </FieldLabel>
            <NumberInput
              id={fieldIds.cook}
              min={0}
              value={form.cook_time_min}
              onChange={(e) => setForm({ ...form, cook_time_min: Number(e.target.value) })}
            />
          </div>
        </div>
      </CardSection>

      <CardSection title="Ingredients" description="Compact mode: quick search, grams, and optional advanced macros.">
        <div className="space-y-3">
          {form.ingredients.map((ingredient, index) => (
            <div key={index} className="rounded-xl border border-slate-200 bg-slate-50/70 p-2.5">
              <div className="grid grid-cols-1 gap-2 md:grid-cols-12">
                <div className="md:col-span-5">
                  <FieldLabel htmlFor={`ingredient-search-${index}`}>Food search</FieldLabel>
                  <div className="flex gap-1.5">
                    <TextInput
                      id={`ingredient-search-${index}`}
                      value={ingredientQueries[index] || ""}
                      onChange={(e) => setIngredientQueries((prev) => ({ ...prev, [index]: e.target.value }))}
                      placeholder="Search food"
                      className="py-2"
                    />
                    <SecondaryButton type="button" onClick={() => runIngredientSearch(index)} className="px-3 py-2">
                      {searchingIndex === index ? "..." : "Go"}
                    </SecondaryButton>
                  </div>
                </div>
                <div className="md:col-span-4">
                  <FieldLabel htmlFor={`ingredient-name-${index}`} required>
                    Name
                  </FieldLabel>
                  <TextInput
                    id={`ingredient-name-${index}`}
                    value={ingredient.item_name}
                    onChange={(e) => updateIngredient(index, "item_name", e.target.value)}
                    placeholder="Ingredient"
                    className="py-2"
                  />
                </div>
                <div className="md:col-span-2">
                  <FieldLabel htmlFor={`ingredient-grams-${index}`}>Grams</FieldLabel>
                  <NumberInput
                    id={`ingredient-grams-${index}`}
                    min={0}
                    step="0.01"
                    value={ingredient.grams}
                    onChange={(e) => {
                      updateIngredient(index, "grams", Number(e.target.value));
                      updateIngredient(index, "quantity", Number(e.target.value));
                      updateIngredient(index, "unit", "g");
                    }}
                    className="py-2"
                  />
                </div>
                <div className="md:col-span-1 flex items-end">
                  <SecondaryButton type="button" onClick={() => removeIngredient(index)} className="w-full px-2 py-2">
                    X
                  </SecondaryButton>
                </div>
              </div>

              {ingredientResults[index]?.length ? (
                <div className="mt-2 max-h-28 space-y-1 overflow-auto rounded-lg border border-slate-200 bg-white p-2">
                  {ingredientResults[index].map((food, resultIndex) => (
                    <button
                      type="button"
                      key={`${food.external_id || food.name}-${resultIndex}`}
                      onClick={() => selectFoodForIngredient(index, food)}
                      className="w-full rounded-md px-2 py-1 text-left text-xs hover:bg-violet-50"
                    >
                      {food.name} ({food.calories_per_100g || 0} kcal/100g)
                    </button>
                  ))}
                </div>
              ) : null}

              <details className="mt-2 rounded-lg border border-slate-200 bg-white p-2">
                <summary className="cursor-pointer text-xs font-medium text-slate-600">Advanced macros & notes</summary>
                <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-5">
                  <NumberInput
                    id={`ingredient-calories-${index}`}
                    min={0}
                    value={ingredient.calories}
                    onChange={(e) => updateIngredient(index, "calories", Number(e.target.value))}
                    placeholder="kcal/100g"
                    className="py-2 text-sm"
                  />
                  <NumberInput
                    id={`ingredient-protein-${index}`}
                    min={0}
                    value={ingredient.protein_g}
                    onChange={(e) => updateIngredient(index, "protein_g", Number(e.target.value))}
                    placeholder="P/100g"
                    className="py-2 text-sm"
                  />
                  <NumberInput
                    id={`ingredient-carbs-${index}`}
                    min={0}
                    value={ingredient.carbs_g}
                    onChange={(e) => updateIngredient(index, "carbs_g", Number(e.target.value))}
                    placeholder="C/100g"
                    className="py-2 text-sm"
                  />
                  <NumberInput
                    id={`ingredient-fat-${index}`}
                    min={0}
                    value={ingredient.fat_g}
                    onChange={(e) => updateIngredient(index, "fat_g", Number(e.target.value))}
                    placeholder="F/100g"
                    className="py-2 text-sm"
                  />
                  <TextInput
                    id={`ingredient-notes-${index}`}
                    value={ingredient.notes}
                    onChange={(e) => updateIngredient(index, "notes", e.target.value)}
                    placeholder="Notes"
                    className="py-2 text-sm"
                  />
                </div>
              </details>
            </div>
          ))}
          <SecondaryButton type="button" onClick={addIngredient}>
            Add ingredient row
          </SecondaryButton>
        </div>
      </CardSection>

      <CardSection title="Instructions" description="Keep instructions clear and step-by-step.">
        <FieldLabel htmlFor={fieldIds.instructions} required>
          Cooking instructions
        </FieldLabel>
        <textarea
          id={fieldIds.instructions}
          value={form.instructions}
          onChange={(e) => setForm({ ...form, instructions: e.target.value })}
          placeholder="Step 1: ... Step 2: ..."
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm transition focus:border-violet-400"
          rows={6}
        />
      </CardSection>

      <CardSection title="Nutrition Per Serving" description="These values appear in search and dashboard summaries.">
        <div className="mb-3 rounded-xl bg-violet-50 p-3 text-sm text-slate-700">
          Auto-calculated from ingredients: {perServingTotals.calories} kcal | {perServingTotals.protein}P {perServingTotals.carbs}C{" "}
          {perServingTotals.fat}F per serving.
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <FieldLabel htmlFor={fieldIds.calories}>Calories (kcal) - Auto</FieldLabel>
            <NumberInput
              id={fieldIds.calories}
              min={0}
              value={perServingTotals.calories}
              readOnly
            />
          </div>
          <div>
            <FieldLabel htmlFor={fieldIds.protein}>Protein (g) - Auto</FieldLabel>
            <NumberInput
              id={fieldIds.protein}
              min={0}
              value={perServingTotals.protein}
              readOnly
            />
          </div>
          <div>
            <FieldLabel htmlFor={fieldIds.carbs}>Carbs (g) - Auto</FieldLabel>
            <NumberInput
              id={fieldIds.carbs}
              min={0}
              value={perServingTotals.carbs}
              readOnly
            />
          </div>
          <div>
            <FieldLabel htmlFor={fieldIds.fat}>Fat (g) - Auto</FieldLabel>
            <NumberInput
              id={fieldIds.fat}
              min={0}
              value={perServingTotals.fat}
              readOnly
            />
          </div>
        </div>
      </CardSection>

      <CardSection title="Sharing and Status" description="Control visibility and track your cooking progress.">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <FieldLabel htmlFor={fieldIds.visibility}>Visibility</FieldLabel>
            <SelectInput
              id={fieldIds.visibility}
              value={form.visibility}
              onChange={(e) => setForm({ ...form, visibility: e.target.value })}
            >
              {VISIBILITY_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </SelectInput>
            <FormHelpText>Public recipes appear in Explore. Private recipes are visible only to you.</FormHelpText>
          </div>
          <div>
            <FieldLabel htmlFor={fieldIds.status}>Status tag</FieldLabel>
            <SelectInput id={fieldIds.status} value={form.status_tag} onChange={(e) => setForm({ ...form, status_tag: e.target.value })}>
              {RECIPE_STATUS_TAGS.map((item) => (
                <option key={item} value={item}>
                  {item.replace("_", " ")}
                </option>
              ))}
            </SelectInput>
          </div>
        </div>
      </CardSection>

      {error ? (
        <div className="rounded-xl border border-rose-100 bg-rose-50 p-3">
          <FormHelpText isError>{error}</FormHelpText>
        </div>
      ) : null}

      <div className="sticky bottom-4 z-10 flex justify-end rounded-xl border border-violet-100 bg-white/90 p-3 shadow-sm backdrop-blur">
        <PrimaryButton type="submit">Save Recipe</PrimaryButton>
      </div>
    </form>
  );
}
