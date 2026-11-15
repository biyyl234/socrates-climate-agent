-- Socrates initial schema (report §2.2). All tables enable RLS.
-- Reference data (products, emission_factors) is publicly readable; personal
-- session data is scoped to the owning auth.uid(). Edge functions use the
-- service role and bypass RLS for server-side writes.

-- ============ profiles ============
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============ products (reference / snapshot) ============
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  barcode text unique,
  name text not null,
  brands text[] not null default '{}',
  categories text[] not null default '{}',
  ingredients text[] not null default '{}',
  image_url text,
  quantity text,
  serving_size text,
  source text not null default 'open_food_facts',
  raw jsonb,
  created_at timestamptz not null default now()
);
create index if not exists products_name_idx on public.products using gin (to_tsvector('simple', name));

-- ============ emission_factors (factor library) ============
create table if not exists public.emission_factors (
  id uuid primary key default gen_random_uuid(),
  factor_id text unique not null,
  category text not null,
  subcategory text,
  region text not null default 'CN',
  factor_value numeric not null,
  unit text not null,
  uncertainty_low numeric,
  uncertainty_high numeric,
  stages jsonb not null default '[]'::jsonb,
  methodology text not null default 'attributional/GWP100',
  source_name text not null,
  source_url text not null,
  license text not null,
  quality_grade text not null check (quality_grade in ('A','B','C','D','E')),
  version text not null,
  valid_from date,
  valid_to date,
  created_at timestamptz not null default now()
);
create index if not exists emission_factors_category_idx on public.emission_factors (category, region);

-- ============ footprint_events ============
create table if not exists public.footprint_events (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  profile_id uuid references auth.users (id) on delete cascade,
  category_id text not null,
  functional_unit text not null,
  total_value numeric not null,
  total_low numeric not null,
  total_high numeric not null,
  unit text not null default 'kgCO2e',
  confidence text not null check (confidence in ('high','medium','low')),
  phases jsonb not null default '[]'::jsonb,
  factors jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists footprint_events_session_idx on public.footprint_events (session_id);

-- ============ commitments ============
create table if not exists public.commitments (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  profile_id uuid references auth.users (id) on delete cascade,
  commitment_text text not null,
  category_id text,
  alternative text,
  barrier text,
  plan text,
  self_efficacy int check (self_efficacy between 1 and 5),
  follow_up_days int check (follow_up_days between 1 and 90),
  follow_up_due timestamptz,
  status text not null default 'active' check (status in ('active','cancelled')),
  consent_recorded boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists commitments_session_idx on public.commitments (session_id);

-- ============ reflection_diary ============
create table if not exists public.reflection_diary (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  profile_id uuid references auth.users (id) on delete cascade,
  entry text not null,
  mood text,
  tags text[] not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists reflection_diary_session_idx on public.reflection_diary (session_id);

-- ============ conversation_logs ============
create table if not exists public.conversation_logs (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  profile_id uuid references auth.users (id) on delete cascade,
  role text not null check (role in ('user','assistant','tool','system')),
  content text not null,
  mi_state text,
  tool_calls jsonb,
  created_at timestamptz not null default now()
);
create index if not exists conversation_logs_session_idx on public.conversation_logs (session_id, created_at);

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.emission_factors enable row level security;
alter table public.footprint_events enable row level security;
alter table public.commitments enable row level security;
alter table public.reflection_diary enable row level security;
alter table public.conversation_logs enable row level security;

-- profiles: owner only
create policy "profiles owner select" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles owner insert" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles owner update" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- reference data: public read, no client write (service role only)
create policy "products public read" on public.products
  for select using (true);
create policy "emission_factors public read" on public.emission_factors
  for select using (true);

-- personal session tables: owner only
create policy "footprint owner all" on public.footprint_events
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);
create policy "commitments owner all" on public.commitments
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);
create policy "diary owner all" on public.reflection_diary
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);
create policy "logs owner all" on public.conversation_logs
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);
