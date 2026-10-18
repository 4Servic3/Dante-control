-- ============================================================================
-- ROTINÊ • ESTRUTURA E POLÍTICAS RLS DO SUPABASE
-- Execute no SQL Editor do Supabase caso o RLS esteja bloqueando gravações:
-- https://supabase.com/dashboard/project/lockzzblcakpkirkagtd/sql/new
-- ============================================================================

create table if not exists public.baby_events (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('mamada', 'fralda', 'sono')),
  subtype text,
  start_time timestamptz not null default now(),
  end_time timestamptz,
  duration_seconds integer,
  amount_ml integer,
  created_at timestamptz not null default now()
);

create table if not exists public.baby_active_state (
  id integer primary key default 1,
  feeding_active boolean not null default false,
  feeding_side text,
  feeding_start_time timestamptz,
  sleeping_active boolean not null default false,
  sleeping_start_time timestamptz,
  last_breast_side text,
  updated_at timestamptz not null default now()
);

-- Inicializa a linha única id = 1
insert into public.baby_active_state (id, feeding_active, sleeping_active, updated_at)
values (1, false, false, now())
on conflict (id) do nothing;

-- Libera acesso público de leitura/escrita para o App e Atalhos da Siri
alter table public.baby_events enable row level security;
alter table public.baby_active_state enable row level security;

drop policy if exists "public_all_baby_events" on public.baby_events;
create policy "public_all_baby_events"
  on public.baby_events
  for all
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "public_all_baby_active_state" on public.baby_active_state;
create policy "public_all_baby_active_state"
  on public.baby_active_state
  for all
  to anon, authenticated
  using (true)
  with check (true);

-- Habilita Realtime para sincronização instantânea entre Siri e App
alter publication supabase_realtime add table public.baby_events;
alter publication supabase_realtime add table public.baby_active_state;
