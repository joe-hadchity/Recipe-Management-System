-- Enable row level security
alter table public.profiles enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.food_items enable row level security;
alter table public.food_logs enable row level security;

-- Profiles
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
for select using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
for update using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
for insert with check (auth.uid() = id);

-- Recipes
drop policy if exists "recipes_select_owner_or_public" on public.recipes;
create policy "recipes_select_owner_or_public" on public.recipes
for select using (owner_id = auth.uid() or visibility = 'public');

drop policy if exists "recipes_insert_owner" on public.recipes;
create policy "recipes_insert_owner" on public.recipes
for insert with check (owner_id = auth.uid());

drop policy if exists "recipes_update_owner" on public.recipes;
create policy "recipes_update_owner" on public.recipes
for update using (owner_id = auth.uid());

drop policy if exists "recipes_delete_owner" on public.recipes;
create policy "recipes_delete_owner" on public.recipes
for delete using (owner_id = auth.uid());

-- Recipe ingredients
drop policy if exists "recipe_ingredients_select_owner_or_public" on public.recipe_ingredients;
create policy "recipe_ingredients_select_owner_or_public" on public.recipe_ingredients
for select using (
  exists (
    select 1
    from public.recipes r
    where r.id = recipe_ingredients.recipe_id
      and (r.owner_id = auth.uid() or r.visibility = 'public')
  )
);

drop policy if exists "recipe_ingredients_insert_owner_recipe" on public.recipe_ingredients;
create policy "recipe_ingredients_insert_owner_recipe" on public.recipe_ingredients
for insert with check (
  exists (
    select 1 from public.recipes r
    where r.id = recipe_ingredients.recipe_id
      and r.owner_id = auth.uid()
  )
);

drop policy if exists "recipe_ingredients_update_owner_recipe" on public.recipe_ingredients;
create policy "recipe_ingredients_update_owner_recipe" on public.recipe_ingredients
for update using (
  exists (
    select 1 from public.recipes r
    where r.id = recipe_ingredients.recipe_id
      and r.owner_id = auth.uid()
  )
);

drop policy if exists "recipe_ingredients_delete_owner_recipe" on public.recipe_ingredients;
create policy "recipe_ingredients_delete_owner_recipe" on public.recipe_ingredients
for delete using (
  exists (
    select 1 from public.recipes r
    where r.id = recipe_ingredients.recipe_id
      and r.owner_id = auth.uid()
  )
);

-- Food items
drop policy if exists "food_items_select_authenticated" on public.food_items;
create policy "food_items_select_authenticated" on public.food_items
for select using (auth.uid() is not null);

drop policy if exists "food_items_insert_authenticated" on public.food_items;
create policy "food_items_insert_authenticated" on public.food_items
for insert with check (auth.uid() is not null);

drop policy if exists "food_items_update_authenticated" on public.food_items;
create policy "food_items_update_authenticated" on public.food_items
for update using (auth.uid() is not null);

-- Food logs
drop policy if exists "food_logs_select_own" on public.food_logs;
create policy "food_logs_select_own" on public.food_logs
for select using (user_id = auth.uid());

drop policy if exists "food_logs_insert_own" on public.food_logs;
create policy "food_logs_insert_own" on public.food_logs
for insert with check (user_id = auth.uid());

drop policy if exists "food_logs_update_own" on public.food_logs;
create policy "food_logs_update_own" on public.food_logs
for update using (user_id = auth.uid());

drop policy if exists "food_logs_delete_own" on public.food_logs;
create policy "food_logs_delete_own" on public.food_logs
for delete using (user_id = auth.uid());
