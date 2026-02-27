import { z } from "zod";

export const foodItemInputSchema = z.object({
  source: z.enum(["openfoodfacts", "manual"]).default("manual"),
  external_id: z.string().min(1).optional(),
  name: z.string().min(1),
  brand: z.string().optional(),
  serving_size_g: z.number().positive().optional(),
  calories_per_100g: z.number().nonnegative().default(0),
  protein_per_100g: z.number().nonnegative().default(0),
  carbs_per_100g: z.number().nonnegative().default(0),
  fat_per_100g: z.number().nonnegative().default(0)
});

export const foodLogInputSchema = z.object({
  food_item_id: z.string().uuid().optional(),
  food_item: foodItemInputSchema.optional(),
  recipe_id: z.string().uuid().optional(),
  recipe_servings: z.number().positive().optional(),
  serving_grams: z.number().positive(),
  consumed_at: z.string().datetime().optional(),
  notes: z.string().max(500).optional()
});
