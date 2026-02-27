import { z } from "zod";
import { RECIPE_STATUS_TAGS, VISIBILITY_OPTIONS } from "@/lib/constants/tags";

export const ingredientSchema = z.object({
  item_name: z.string().min(1),
  food_item_id: z.string().uuid().optional(),
  grams: z.number().positive().optional(),
  calories: z.number().nonnegative().optional(),
  protein_g: z.number().nonnegative().optional(),
  carbs_g: z.number().nonnegative().optional(),
  fat_g: z.number().nonnegative().optional(),
  quantity: z.number().nonnegative().optional(),
  unit: z.string().optional(),
  notes: z.string().optional(),
  sort_order: z.number().int().nonnegative().default(0)
});

export const recipeSchema = z.object({
  name: z.string().min(1),
  ingredients: z.array(ingredientSchema).min(1),
  instructions: z.string().min(1),
  prep_time_min: z.number().int().nonnegative(),
  cook_time_min: z.number().int().nonnegative(),
  servings: z.number().int().positive(),
  calories: z.number().nonnegative(),
  protein_g: z.number().nonnegative(),
  carbs_g: z.number().nonnegative(),
  fat_g: z.number().nonnegative(),
  visibility: z.enum(VISIBILITY_OPTIONS),
  status_tag: z.enum(RECIPE_STATUS_TAGS)
});
