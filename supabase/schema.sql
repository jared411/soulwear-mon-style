-- SOULWEAR MON STYLE: product database and admin access.
-- Run this whole file once in the Supabase SQL Editor (a NEW project, separate from Bremoh).

create extension if not exists "pgcrypto";

-- Admins: only users listed here can manage products
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

create or replace function public.is_admin()
returns boolean language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- Products
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  category text not null default 'hoodies' check (category in ('hoodies','tshirts','jerseys')),
  name text not null,
  description text,
  price numeric(10,2) check (price is null or price >= 0),   -- null = "Price on WhatsApp"
  stock int check (stock is null or stock >= 0),              -- null = "Check availability"
  sizes text[] not null default '{}',
  variants jsonb not null default '[]'::jsonb,                -- [{"colour":"Brown","image":"https://..."}]
  active boolean not null default true,
  sort int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.products enable row level security;
alter table public.admins enable row level security;

-- Visitors see active products; admin sees and manages everything
create policy "public read active products" on public.products
  for select using (active = true or public.is_admin());
create policy "admin insert products" on public.products
  for insert with check (public.is_admin());
create policy "admin update products" on public.products
  for update using (public.is_admin()) with check (public.is_admin());
create policy "admin delete products" on public.products
  for delete using (public.is_admin());

create policy "read own admin row" on public.admins
  for select using (user_id = auth.uid());

-- Photo storage
insert into storage.buckets (id, name, public)
values ('products', 'products', true)
on conflict (id) do nothing;

create policy "public read product photos" on storage.objects
  for select using (bucket_id = 'products');
create policy "admin upload product photos" on storage.objects
  for insert with check (bucket_id = 'products' and public.is_admin());
create policy "admin update product photos" on storage.objects
  for update using (bucket_id = 'products' and public.is_admin());
create policy "admin delete product photos" on storage.objects
  for delete using (bucket_id = 'products' and public.is_admin());

-- Grants (same as Bremoh: the site reads products, the admin manages them)
grant usage on schema public to anon, authenticated;
grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;
grant select on public.admins to authenticated;

-- Starting products (you can edit or delete them in the admin)
insert into public.products (category, name, description, sizes, variants, sort) values
('hoodies', 'SOULWEAR Hoodie',
 'Heavyweight hoodie with the SOULWEAR crest embroidered on the chest and a gold-tipped drawstring.',
 array['S','M','L','XL','XXL'],
 '[{"colour":"Brown","image":"assets/hoodie-brown.jpg"},{"colour":"White","image":"assets/hoodie-white.jpg"},{"colour":"Grey","image":"assets/hoodie-grey.jpg"}]'::jsonb,
 1);

-- After you create your admin login (Authentication > Users), run this with its email:
-- insert into public.admins (user_id) select id from auth.users where email = 'YOUR_EMAIL_HERE';
