Optional seed data template for local testing.
Replace user UUIDs with real auth.users IDs before running.

insert into public.recipes (
  owner_id, name, instructions, cuisine, prep_time_min, cook_time_min, servings,
  calories, protein_g, carbs_g, fat_g, visibility, status_tag
) values (
  '00000000-0000-0000-0000-000000000000',
  'High Protein Chicken Bowl',
  'Cook chicken and rice. Mix with vegetables and dressing.',
  'Mexican',
  15,
  20,
  2,
  520,
  42,
  50,
  16,
  'public',
  'favorite'
);
