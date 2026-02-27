import Link from "next/link";
import CardSection from "@/components/ui/CardSection";
import PageHeader from "@/components/ui/PageHeader";
import PrimaryButton from "@/components/ui/PrimaryButton";
import SecondaryButton from "@/components/ui/SecondaryButton";

export default function HomePage() {
  return (
    <section className="space-y-6">
      <PageHeader
        title="Recipe AI Manager"
        subtitle="Manage recipes, log foods, track nutrition, and discover public recipes with a guided workflow."
      />
      <CardSection>
        <div className="flex flex-wrap gap-3">
          <Link href="/dashboard">
            <PrimaryButton>📊 Go to Dashboard</PrimaryButton>
          </Link>
          <Link href="/food-log">
            <SecondaryButton>🥗 Log Food</SecondaryButton>
          </Link>
          <Link href="/explore">
            <SecondaryButton>🌎 Explore Public Content</SecondaryButton>
          </Link>
        </div>
      </CardSection>
    </section>
  );
}
