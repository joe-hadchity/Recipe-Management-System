import PageHeader from "@/components/ui/PageHeader";
import ExploreSearchClient from "@/components/explore/ExploreSearchClient";
import { createClient } from "@/lib/supabase/server";

export default async function ExplorePage() {
  const supabase = await createClient();
  const { data: recipes } = await supabase
    .from("recipes")
    .select("*")
    .eq("visibility", "public")
    .order("created_at", { ascending: false })
    .limit(12);

  return (
    <section className="space-y-6">
      <PageHeader title="Explore Public Recipes" subtitle="Discover what other users are sharing." />
      <ExploreSearchClient initialRecipes={recipes || []} />
    </section>
  );
}
