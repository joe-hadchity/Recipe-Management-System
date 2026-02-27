import Link from "next/link";
import { notFound } from "next/navigation";
import CardSection from "@/components/ui/CardSection";
import PageHeader from "@/components/ui/PageHeader";
import RecipeStatusBadge from "@/components/recipes/RecipeStatusBadge";
import RecipeVisibilityToggle from "@/components/recipes/RecipeVisibilityToggle";
import SecondaryButton from "@/components/ui/SecondaryButton";
import { requireUser } from "@/lib/auth";
import { getRecipeById } from "@/lib/services/recipeService";

export default async function RecipeDetailPage({ params }) {
  const { id } = await params;
  const { supabase } = await requireUser();
  const { data: recipe } = await getRecipeById(supabase, id);

  if (!recipe) {
    notFound();
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title={recipe.name}
        subtitle={`Prep ${recipe.prep_time_min}m • Cook ${recipe.cook_time_min}m • Servings ${recipe.servings}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <RecipeVisibilityToggle recipeId={recipe.id} currentVisibility={recipe.visibility} />
            <Link href={`/recipes/${recipe.id}/edit`}>
              <SecondaryButton>Edit Recipe</SecondaryButton>
            </Link>
          </div>
        }
      />
      <div className="flex items-center gap-2 text-sm">
        <RecipeStatusBadge status={recipe.status_tag} />
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
          Visibility: {recipe.visibility}
        </span>
      </div>
      <CardSection title="Ingredients">
        <ul className="list-disc space-y-1 pl-6 text-slate-700">
          {recipe.recipe_ingredients?.length ? (
            recipe.recipe_ingredients.map((item) => (
              <li key={item.id}>
                {item.quantity} {item.unit} {item.item_name} {item.notes ? `(${item.notes})` : ""}
              </li>
            ))
          ) : (
            <li>No ingredients added.</li>
          )}
        </ul>
      </CardSection>
      <CardSection title="Instructions">
        <p className="whitespace-pre-wrap text-slate-700">{recipe.instructions}</p>
      </CardSection>
    </section>
  );
}
