"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import RecipeForm from "@/components/recipes/RecipeForm";
import PageHeader from "@/components/ui/PageHeader";

export default function NewRecipePage() {
  const router = useRouter();
  const [saveError, setSaveError] = useState("");

  return (
    <section className="space-y-6">
      <PageHeader title="Create Recipe" subtitle="Add all details so this recipe is easy to reuse later." />
      {saveError ? (
        <div className="rounded-xl border border-rose-100 bg-rose-50 p-3 text-sm text-rose-700" role="status" aria-live="polite">
          {saveError}
        </div>
      ) : null}
      <RecipeForm
        onSubmit={async (payload) => {
          setSaveError("");
          try {
            const response = await fetch("/api/recipes", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload)
            });

            if (response.ok) {
              router.push("/recipes");
            } else {
              const json = await response.json().catch(() => ({}));
              setSaveError(json.error || "Could not save recipe. Please check the fields and try again.");
            }
          } catch {
            setSaveError("Could not save recipe right now. Please try again.");
          }
        }}
      />
    </section>
  );
}
