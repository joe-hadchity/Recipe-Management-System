"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import RecipeForm from "@/components/recipes/RecipeForm";
import PageHeader from "@/components/ui/PageHeader";

export default function EditRecipePage() {
  const params = useParams();
  const router = useRouter();
  const [recipe, setRecipe] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchRecipe() {
      setError("");
      setIsLoading(true);
      const response = await fetch(`/api/recipes/${params.id}`);
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(json.error || "Could not load this recipe.");
      } else {
        const recipeData = json.recipe || {};
        const normalized = {
          ...recipeData,
          ingredients: Array.isArray(recipeData.recipe_ingredients)
            ? recipeData.recipe_ingredients.map((item, index) => ({
                item_name: item.item_name || "",
                food_item_id: item.food_item_id || undefined,
                grams: Number(item.grams ?? item.quantity ?? 100),
                quantity: Number(item.quantity ?? item.grams ?? 100),
                unit: item.unit || "g",
                notes: item.notes || "",
                sort_order: Number(item.sort_order ?? index),
                calories: Number(item.calories || 0),
                protein_g: Number(item.protein_g || 0),
                carbs_g: Number(item.carbs_g || 0),
                fat_g: Number(item.fat_g || 0)
              }))
            : []
        };
        setRecipe(normalized);
      }
      setIsLoading(false);
    }
    fetchRecipe();
  }, [params.id]);

  if (isLoading) {
    return <p className="text-sm text-slate-500" role="status" aria-live="polite">Loading recipe details...</p>;
  }

  if (error) {
    return (
      <p className="rounded-xl border border-rose-100 bg-rose-50 p-3 text-sm text-rose-700" role="status" aria-live="polite">
        {error}
      </p>
    );
  }

  return (
    <section className="space-y-6">
      <PageHeader title="Edit Recipe" subtitle="Update ingredients, nutrition, and visibility settings." />
      <RecipeForm
        initialValues={recipe}
        onSubmit={async (payload) => {
          setError("");
          try {
            const response = await fetch(`/api/recipes/${params.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload)
            });
            if (response.ok) {
              router.push(`/recipes/${params.id}`);
            } else {
              const json = await response.json().catch(() => ({}));
              setError(json.error || "Could not update recipe.");
            }
          } catch {
            setError("Could not update recipe right now. Please try again.");
          }
        }}
      />
      {error ? (
        <div className="rounded-xl border border-rose-100 bg-rose-50 p-3 text-sm text-rose-700" role="status" aria-live="polite">
          {error}
        </div>
      ) : null}
    </section>
  );
}
