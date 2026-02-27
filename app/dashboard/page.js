import NutritionProgressCards from "@/components/dashboard/NutritionProgressCards";
import Link from "next/link";
import CardSection from "@/components/ui/CardSection";
import PageHeader from "@/components/ui/PageHeader";
import PrimaryButton from "@/components/ui/PrimaryButton";
import SecondaryButton from "@/components/ui/SecondaryButton";
import { requireUser } from "@/lib/auth";
import { getDailyNutritionSummary } from "@/lib/services/foodLogService";

async function getDashboardData(supabase, userId) {
  const profileResult = await supabase
    .from("profiles")
    .select("target_calories,target_protein_g,target_carbs_g,target_fat_g")
    .eq("id", userId)
    .maybeSingle();

  let summary = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  try {
    const daily = await getDailyNutritionSummary(supabase, userId);
    summary = daily.totals;
  } catch {
    summary = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  }

  const profile = profileResult.data || {};
  return {
    summary,
    targets: {
      calories: Number(profile.target_calories ?? 2000),
      protein: Number(profile.target_protein_g ?? 150),
      carbs: Number(profile.target_carbs_g ?? 220),
      fat: Number(profile.target_fat_g ?? 70)
    },
    userId
  };
}

export default async function DashboardPage() {
  const { user, supabase } = await requireUser();
  const data = await getDashboardData(supabase, user.id);

  return (
    <section className="space-y-6">
      <PageHeader title="Dashboard" subtitle="Track your daily macros based on your food logs and targets." />
      <CardSection>
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-2xl bg-gradient-to-br from-violet-600 via-violet-500 to-fuchsia-500 p-5 text-white shadow-sm">
            <p className="text-xs uppercase tracking-wider text-violet-100">Today at a glance</p>
            <h2 className="mt-2 text-2xl font-bold">Keep your nutrition streak going</h2>
            <p className="mt-2 text-sm text-violet-100">
              Log foods, review your recipes, and stay on target with a few quick actions.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/food-log">
                <PrimaryButton className="bg-white text-violet-700 hover:bg-violet-100">🥗 Log Food</PrimaryButton>
              </Link>
              <Link href="/recipes/new">
                <SecondaryButton className="border-violet-200 bg-violet-500/20 text-white hover:bg-violet-500/30">
                  🍳 New Recipe
                </SecondaryButton>
              </Link>
            </div>
          </div>
          <div className="card-soft p-4">
            <p className="text-sm font-semibold text-slate-700">Targets Snapshot</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li>🔥 Calories target: {data.targets.calories} kcal</li>
              <li>💪 Protein target: {data.targets.protein} g</li>
              <li>⚡ Carbs target: {data.targets.carbs} g</li>
              <li>🥑 Fat target: {data.targets.fat} g</li>
            </ul>
          </div>
        </div>
      </CardSection>
      <CardSection>
        <NutritionProgressCards summary={data.summary} targets={data.targets} />
      </CardSection>
    </section>
  );
}
