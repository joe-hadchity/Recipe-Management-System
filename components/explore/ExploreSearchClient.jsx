"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import CardSection from "@/components/ui/CardSection";
import FormHelpText from "@/components/ui/FormHelpText";
import PrimaryButton from "@/components/ui/PrimaryButton";
import SecondaryButton from "@/components/ui/SecondaryButton";
import TextInput from "@/components/ui/TextInput";

function toStringValue(value) {
  if (Array.isArray(value)) return value.join(", ");
  return value == null ? "" : String(value);
}

export default function ExploreSearchClient({ initialRecipes = [] }) {
  const [query, setQuery] = useState("");
  const [recipes, setRecipes] = useState(initialRecipes);
  const [filters, setFilters] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState("");

  const hasActiveFilters = useMemo(() => {
    if (!filters) return false;
    return Boolean(filters.name || filters.ingredient || filters.cuisine || filters.cuisineType || filters.maxPrepTime);
  }, [filters]);

  async function runAiSearch() {
    if (!query.trim()) {
      setError("Enter a search query first.");
      return;
    }

    setError("");
    setIsSearching(true);
    try {
      const parseResponse = await fetch("/api/ai/query-parser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query })
      });
      const parsedJson = await parseResponse.json();
      if (!parseResponse.ok) {
        setError(parsedJson.error || "AI query parsing failed.");
        return;
      }

      const parsedFilters = parsedJson.filters || {};
      setFilters(parsedFilters);

      const params = new URLSearchParams();
      params.set("publicOnly", "true");
      if (parsedFilters.name) params.set("name", toStringValue(parsedFilters.name));
      if (parsedFilters.ingredient) params.set("ingredient", toStringValue(parsedFilters.ingredient));
      if (parsedFilters.cuisine) params.set("cuisine", toStringValue(parsedFilters.cuisine));
      if (parsedFilters.cuisineType) params.set("cuisineType", toStringValue(parsedFilters.cuisineType));
      if (parsedFilters.maxPrepTime) params.set("maxPrepTime", toStringValue(parsedFilters.maxPrepTime));

      const searchResponse = await fetch(`/api/search?${params.toString()}`);
      const searchJson = await searchResponse.json();
      if (!searchResponse.ok) {
        setError(searchJson.error || "Search failed.");
        return;
      }

      setRecipes(searchJson.recipes || []);
    } catch {
      setError("Could not run AI search right now.");
    } finally {
      setIsSearching(false);
    }
  }

  function resetSearch() {
    setRecipes(initialRecipes);
    setFilters(null);
    setQuery("");
    setError("");
  }

  return (
    <div className="space-y-6">
      <CardSection
        title="AI Explore Search"
        description="Search with natural language. AI will filter by name, ingredient, cuisine/cuisine type, and preparation time."
      >
        <div className="space-y-3">
          <TextInput
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="High-protein mexican chicken under 25 minutes with rice"
          />
          <div className="flex flex-wrap gap-2">
            <PrimaryButton onClick={runAiSearch} disabled={isSearching}>
              {isSearching ? "Searching..." : "AI Search"}
            </PrimaryButton>
            <SecondaryButton onClick={resetSearch} disabled={isSearching}>
              Reset
            </SecondaryButton>
          </div>
          {error ? <FormHelpText isError>{error}</FormHelpText> : null}
          {hasActiveFilters ? (
            <div className="rounded-xl border border-violet-100 bg-violet-50 p-3 text-xs text-slate-600">
              Parsed filters: {filters.name ? `Name=${toStringValue(filters.name)}; ` : ""}
              {filters.ingredient ? `Ingredient=${toStringValue(filters.ingredient)}; ` : ""}
              {filters.cuisine ? `Cuisine=${toStringValue(filters.cuisine)}; ` : ""}
              {filters.cuisineType ? `Cuisine Type=${toStringValue(filters.cuisineType)}; ` : ""}
              {filters.maxPrepTime ? `Max Prep=${toStringValue(filters.maxPrepTime)} min` : ""}
            </div>
          ) : null}
        </div>
      </CardSection>

      <CardSection title="Public Recipes">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {recipes?.length ? (
            recipes.map((recipe) => (
              <Link key={recipe.id} href={`/recipes/${recipe.id}`} className="rounded-xl border border-slate-200 bg-violet-50/40 p-4 transition hover:bg-violet-50">
                <p className="font-semibold text-slate-800">{recipe.name}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {recipe.cuisine || "general"} | Prep {recipe.prep_time_min || 0} min
                </p>
                <p className="text-sm text-slate-600">
                  {recipe.calories} kcal | {recipe.protein_g}P {recipe.carbs_g}C {recipe.fat_g}F
                </p>
              </Link>
            ))
          ) : (
            <p className="text-sm text-slate-500">No public recipes found for this search.</p>
          )}
        </div>
      </CardSection>
    </div>
  );
}
