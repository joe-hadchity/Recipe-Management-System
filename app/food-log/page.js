import FoodLogClient from "@/components/food/FoodLogClient";
import { requireUser } from "@/lib/auth";

export default async function FoodLogPage() {
  await requireUser();
  return <FoodLogClient />;
}
