-- Recipe AI Manager V3 schema
create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  target_calories integer not null default 2000 check (target_calories >= 0),
  target_protein_g numeric(8,2) not null default 150 check (target_protein_g >= 0),
  target_carbs_g numeric(8,2) not null default 220 check (target_carbs_g >= 0),
  target_fat_g numeric(8,2) not null default 70 check (target_fat_g >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  instructions text not null,
  cuisine text not null,
  prep_time_min integer not null default 0 check (prep_time_min >= 0),
  cook_time_min integer not null default 0 check (cook_time_min >= 0),
  servings integer not null check (servings > 0),
  calories numeric(10,2) not null default 0 check (calories >= 0),
  protein_g numeric(10,2) not null default 0 check (protein_g >= 0),
  carbs_g numeric(10,2) not null default 0 check (carbs_g >= 0),
  fat_g numeric(10,2) not null default 0 check (fat_g >= 0),
  visibility text not null default 'private' check (visibility in ('public','private')),
  status_tag text not null default 'to_try' check (status_tag in ('favorite','to_try','made_before')),
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  item_name text not null,
  food_item_id uuid,
  grams numeric(10,2) check (grams >= 0),
  calories numeric(10,2) default 0 check (calories >= 0),
  protein_g numeric(10,2) default 0 check (protein_g >= 0),
  carbs_g numeric(10,2) default 0 check (carbs_g >= 0),
  fat_g numeric(10,2) default 0 check (fat_g >= 0),
  quantity numeric(10,2) check (quantity >= 0),
  unit text,
  notes text,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.food_items (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'manual' check (source in ('openfoodfacts', 'manual')),
  external_id text,
  name text not null,
  brand text,
  serving_size_g numeric(10,2),
  calories_per_100g numeric(10,2) not null default 0 check (calories_per_100g >= 0),
  protein_per_100g numeric(10,2) not null default 0 check (protein_per_100g >= 0),
  carbs_per_100g numeric(10,2) not null default 0 check (carbs_per_100g >= 0),
  fat_per_100g numeric(10,2) not null default 0 check (fat_per_100g >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  food_item_id uuid references public.food_items(id) on delete restrict,
  recipe_id uuid references public.recipes(id) on delete set null,
  consumed_at timestamptz not null default now(),
  serving_grams numeric(10,2) not null check (serving_grams > 0),
  calories numeric(10,2) not null default 0 check (calories >= 0),
  protein_g numeric(10,2) not null default 0 check (protein_g >= 0),
  carbs_g numeric(10,2) not null default 0 check (carbs_g >= 0),
  fat_g numeric(10,2) not null default 0 check (fat_g >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (food_item_id is not null or recipe_id is not null)
);

create index if not exists idx_recipes_owner_created on public.recipes(owner_id, created_at desc);
create index if not exists idx_recipes_visibility_created on public.recipes(visibility, created_at desc);
create index if not exists idx_recipes_cuisine on public.recipes(cuisine);
create unique index if not exists idx_food_items_source_external_unique
  on public.food_items(source, external_id)
  where external_id is not null;
create index if not exists idx_food_logs_user_consumed_at on public.food_logs(user_id, consumed_at desc);
create index if not exists idx_food_logs_recipe on public.food_logs(recipe_id);

create index if not exists idx_recipes_name_trgm on public.recipes using gin (name gin_trgm_ops);
create index if not exists idx_recipe_ingredients_item_name_trgm on public.recipe_ingredients using gin (item_name gin_trgm_ops);
create index if not exists idx_food_items_name_trgm on public.food_items using gin (name gin_trgm_ops);

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_recipes_updated_at on public.recipes;
create trigger set_recipes_updated_at
before update on public.recipes
for each row execute function public.set_updated_at();

drop trigger if exists set_recipe_ingredients_updated_at on public.recipe_ingredients;
create trigger set_recipe_ingredients_updated_at
before update on public.recipe_ingredients
for each row execute function public.set_updated_at();

drop trigger if exists set_food_items_updated_at on public.food_items;
create trigger set_food_items_updated_at
before update on public.food_items
for each row execute function public.set_updated_at();

drop trigger if exists set_food_logs_updated_at on public.food_logs;
create trigger set_food_logs_updated_at
before update on public.food_logs
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();
