import Link from "next/link";
import CardSection from "@/components/ui/CardSection";
import PageHeader from "@/components/ui/PageHeader";
import PrimaryButton from "@/components/ui/PrimaryButton";
import IngredientSuggestionPanel from "@/components/recipes/IngredientSuggestionPanel";
import RecipeStatusBadge from "@/components/recipes/RecipeStatusBadge";
import { requireUser } from "@/lib/auth";
import { listRecipes } from "@/lib/services/recipeService";

export default async function RecipesPage() {
  const { supabase, user } = await requireUser();
  const { data: recipes, error } = await listRecipes(supabase, { userId: user.id, includePublic: false });

  if (error) {
    return <p className="rounded-xl border border-rose-100 bg-rose-50 p-3 text-sm text-rose-700">Failed to load recipes: {error.message}</p>;
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title="Recipes"
        subtitle="Create, organize, and revisit your favorite meals."
        actions={
          <Link href="/recipes/new">
            <PrimaryButton>New Recipe</PrimaryButton>
          </Link>
        }
      />
      <IngredientSuggestionPanel />
      <CardSection>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {recipes?.length ? (
            recipes.map((recipe) => (
              <Link key={recipe.id} href={`/recipes/${recipe.id}`} className="rounded-xl border border-slate-200 bg-violet-50/40 p-4 transition hover:bg-violet-50">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-slate-800">{recipe.name}</p>
                  <RecipeStatusBadge status={recipe.status_tag} />
                </div>
                <p className="mt-2 text-sm text-slate-500">
                  {recipe.calories} kcal | {recipe.protein_g}P {recipe.carbs_g}C {recipe.fat_g}F
                </p>
                <p className="mt-2 text-xs text-slate-500">Visibility: {recipe.visibility}</p>
              </Link>
            ))
          ) : (
            <p className="text-sm text-slate-500">No recipes yet. Start by creating your first one.</p>
          )}
        </div>
      </CardSection>
    </section>
  );
}
