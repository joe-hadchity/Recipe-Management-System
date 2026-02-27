-- Run this once in Supabase SQL Editor to enable recipe logging in food_logs.

alter table public.food_logs
  add column if not exists recipe_id uuid references public.recipes(id) on delete set null;

alter table public.food_logs
  alter column food_item_id drop not null;

create index if not exists idx_food_logs_recipe on public.food_logs(recipe_id);

do $$
declare
  constraint_name text;
begin
  -- Remove old checks that only allowed food_item_id logs.
  for constraint_name in
    select c.conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'food_logs'
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%food_item_id is not null%'
      and pg_get_constraintdef(c.oid) not ilike '%recipe_id%'
  loop
    execute format('alter table public.food_logs drop constraint if exists %I', constraint_name);
  end loop;
end
$$;

alter table public.food_logs
  drop constraint if exists food_logs_food_item_or_recipe_required;

alter table public.food_logs
  add constraint food_logs_food_item_or_recipe_required
  check (food_item_id is not null or recipe_id is not null);

-- Force PostgREST schema cache reload so the new column is visible immediately.
notify pgrst, 'reload schema';
