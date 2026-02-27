"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import SecondaryButton from "@/components/ui/SecondaryButton";

export default function RecipeVisibilityToggle({ recipeId, currentVisibility }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const nextVisibility = currentVisibility === "public" ? "private" : "public";

  return (
    <SecondaryButton
      type="button"
      onClick={async () => {
        setLoading(true);
        try {
          const response = await fetch(`/api/recipes/${recipeId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ visibility: nextVisibility })
          });
          if (response.ok) {
            router.refresh();
          }
        } finally {
          setLoading(false);
        }
      }}
    >
      {loading ? "Updating..." : `Set ${nextVisibility}`}
    </SecondaryButton>
  );
}
