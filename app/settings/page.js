"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CardSection from "@/components/ui/CardSection";
import FieldLabel from "@/components/ui/FieldLabel";
import FormHelpText from "@/components/ui/FormHelpText";
import NumberInput from "@/components/ui/NumberInput";
import PageHeader from "@/components/ui/PageHeader";
import PrimaryButton from "@/components/ui/PrimaryButton";
import SecondaryButton from "@/components/ui/SecondaryButton";

const defaultTargets = {
  target_calories: 2000,
  target_protein_g: 150,
  target_carbs_g: 220,
  target_fat_g: 70
};

export default function SettingsPage() {
  const router = useRouter();
  const [targets, setTargets] = useState(defaultTargets);
  const [message, setMessage] = useState("");
  const [statusTone, setStatusTone] = useState("neutral");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      const response = await fetch("/api/profile");
      if (!response.ok) return;
      const json = await response.json();
      if (json.profile) {
        setTargets((prev) => ({ ...prev, ...json.profile }));
      }
    }
    loadProfile();
  }, []);

  async function saveSettings(event) {
    event.preventDefault();
    setStatusTone("neutral");
    setIsSaving(true);
    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(targets)
      });
      setMessage(response.ok ? "Saved your daily targets." : "Failed to save settings.");
      setStatusTone(response.ok ? "success" : "error");
    } finally {
      setIsSaving(false);
    }
  }

  function resetTargets() {
    setTargets(defaultTargets);
    setMessage("Default targets loaded. Click Save Targets to apply.");
    setStatusTone("neutral");
  }

  async function logout() {
    setIsLoggingOut(true);
    setMessage("");
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title="Settings"
        subtitle="Manage nutrition goals and your account in one place."
      />
      <form onSubmit={saveSettings} className="max-w-3xl space-y-4">
        <CardSection title="Daily Macro Targets" description="These goals drive your dashboard and daily progress cards.">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="target_calories">Calories target (kcal)</FieldLabel>
              <NumberInput
                id="target_calories"
                min={0}
                value={targets.target_calories}
                onChange={(e) => setTargets({ ...targets, target_calories: Number(e.target.value) })}
              />
              <FormHelpText>Recommended range for many users: 1600 - 2800 kcal.</FormHelpText>
            </div>
            <div>
              <FieldLabel htmlFor="target_protein_g">Protein target (g)</FieldLabel>
              <NumberInput
                id="target_protein_g"
                min={0}
                value={targets.target_protein_g}
                onChange={(e) => setTargets({ ...targets, target_protein_g: Number(e.target.value) })}
              />
              <FormHelpText>Higher protein can help satiety and muscle recovery.</FormHelpText>
            </div>
            <div>
              <FieldLabel htmlFor="target_carbs_g">Carbs target (g)</FieldLabel>
              <NumberInput
                id="target_carbs_g"
                min={0}
                value={targets.target_carbs_g}
                onChange={(e) => setTargets({ ...targets, target_carbs_g: Number(e.target.value) })}
              />
              <FormHelpText>Use this to match your activity level and energy needs.</FormHelpText>
            </div>
            <div>
              <FieldLabel htmlFor="target_fat_g">Fat target (g)</FieldLabel>
              <NumberInput
                id="target_fat_g"
                min={0}
                value={targets.target_fat_g}
                onChange={(e) => setTargets({ ...targets, target_fat_g: Number(e.target.value) })}
              />
              <FormHelpText>Keep enough healthy fats for balance and hormones.</FormHelpText>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <PrimaryButton type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Targets"}
            </PrimaryButton>
            <SecondaryButton type="button" onClick={resetTargets} disabled={isSaving}>
              Reset to Defaults
            </SecondaryButton>
            {message ? (
              <p
                className={`text-sm ${
                  statusTone === "error" ? "text-rose-600" : statusTone === "success" ? "text-emerald-600" : "text-slate-600"
                }`}
              >
                {message}
              </p>
            ) : null}
          </div>
        </CardSection>

        <CardSection title="Account" description="Sign out of your account safely on this device.">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-sm text-slate-700">Use logout when you are done, especially on shared computers.</p>
          </div>
          <div className="mt-4">
            <SecondaryButton type="button" onClick={logout} disabled={isLoggingOut}>
              {isLoggingOut ? "Logging out..." : "Logout"}
            </SecondaryButton>
          </div>
        </CardSection>
      </form>
    </section>
  );
}
