-- Enable UUID extension
create extension if not exists "uuid-ossp";

create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique,
  discogs_token text,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.profiles enable row level security;
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

-- Inventory table with added Discogs statistics columns
create table public.inventory (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  barcode text,
  release_id text,
  artist text not null,
  title text not null,
  label text,
  cat_no text,
  year integer,
  country text,
  genre text,
  style text,
  format text,
  disc_size text,
  rpm text,
  tracklist text,
  cover_url text,
  discogs_url text,
  notes text,
  have_count integer,
  want_count integer,
  avg_rating numeric,
  ratings_count integer,
  last_sold text,
  price_low numeric,
  price_median numeric,
  price_high numeric,
  status text default 'Synced',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.inventory enable row level security;
create policy "Users can CRUD own inventory" on inventory for all using (auth.uid() = user_id);

create index inventory_user_id_idx on public.inventory(user_id);
create index inventory_barcode_idx on public.inventory(barcode);
create index inventory_release_id_idx on public.inventory(release_id);
