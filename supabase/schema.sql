-- Literature Stock App schema for Supabase/Postgres
-- Run this in Supabase SQL Editor when you are ready to move from local demo mode to shared multi-user mode.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text not null default 'member' check (role in ('admin', 'member')),
  created_at timestamptz not null default now()
);

create table if not exists public.literature_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  code text not null unique,
  category text not null check (category in ('Bibles', 'Books', 'Brochures and Booklets', 'Forms and Supplies', 'Tracts', 'Public Magazines')),
  quantity_in_stock integer not null default 0 check (quantity_in_stock >= 0),
  low_stock_threshold integer not null default 10 check (low_stock_threshold >= 0),
  language text not null default 'Tamil',
  cover_image_url text,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  literature_item_id uuid not null references public.literature_items(id) on delete cascade,
  movement_type text not null check (movement_type in ('restock', 'give_out', 'adjustment')),
  quantity_change integer not null,
  quantity_before integer not null,
  quantity_after integer not null,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.packing_lists (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  status text not null default 'draft' check (status in ('draft', 'packed', 'completed')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.packing_list_items (
  id uuid primary key default gen_random_uuid(),
  packing_list_id uuid not null references public.packing_lists(id) on delete cascade,
  literature_item_id uuid not null references public.literature_items(id) on delete cascade,
  quantity integer not null check (quantity > 0),
  unique (packing_list_id, literature_item_id)
);

alter table public.profiles enable row level security;
alter table public.literature_items enable row level security;
alter table public.stock_movements enable row level security;
alter table public.packing_lists enable row level security;
alter table public.packing_list_items enable row level security;

-- Basic shared-inventory policies: any signed-in user can read/write.
-- Tighten these later if only admins should edit/delete.
create policy "profiles_select_self" on public.profiles for select using (auth.uid() = id);
create policy "profiles_update_self" on public.profiles for update using (auth.uid() = id);

create policy "items_read_authenticated" on public.literature_items for select to authenticated using (true);
create policy "items_insert_authenticated" on public.literature_items for insert to authenticated with check (true);
create policy "items_update_authenticated" on public.literature_items for update to authenticated using (true);
create policy "items_delete_authenticated" on public.literature_items for delete to authenticated using (true);

create policy "movements_read_authenticated" on public.stock_movements for select to authenticated using (true);
create policy "movements_insert_authenticated" on public.stock_movements for insert to authenticated with check (true);

create policy "packing_lists_read_authenticated" on public.packing_lists for select to authenticated using (true);
create policy "packing_lists_insert_authenticated" on public.packing_lists for insert to authenticated with check (true);
create policy "packing_lists_update_authenticated" on public.packing_lists for update to authenticated using (true);
create policy "packing_lists_delete_authenticated" on public.packing_lists for delete to authenticated using (true);

create policy "packing_items_read_authenticated" on public.packing_list_items for select to authenticated using (true);
create policy "packing_items_insert_authenticated" on public.packing_list_items for insert to authenticated with check (true);
create policy "packing_items_update_authenticated" on public.packing_list_items for update to authenticated using (true);
create policy "packing_items_delete_authenticated" on public.packing_list_items for delete to authenticated using (true);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', new.email));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
