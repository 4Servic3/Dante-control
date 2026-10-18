-- ============================================================================
-- ROTINÊ • SCHEMA SUPABASE PARA SINCRONIZAÇÃO EM NUVEM (MÃE / PAI / SIRI)
-- Cole e execute este script no SQL Editor do seu projeto Supabase:
-- https://supabase.com/dashboard/project/lockzzblcakpkirkagtd/sql/new
-- ============================================================================

-- 1. Tabela de Estado Global da Rotina (Cronômetros ativos + JSON consolidado)
create table if not exists public.routine_state (
  id text primary key default 'default_baby',
  baby_name text not null default 'Noah',
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

-- 2. Tabela Individual de Eventos (Mamadas, Fraldas e Sono) para consultas SQL
create table if not exists public.routine_events (
  id text primary key,
  type text not null check (type in ('mamada', 'fralda', 'sono')),
  date_key text not null,
  timestamp timestamptz not null,
  time_formatted text not null,
  feeding_type text,
  breast text,
  volume_ml integer,
  diaper_type text,
  has_pee boolean,
  has_poop boolean,
  start_time timestamptz,
  end_time timestamptz,
  duration_minutes integer,
  duration_seconds integer,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_routine_events_date_key on public.routine_events (date_key desc);
create index if not exists idx_routine_events_timestamp on public.routine_events (timestamp desc);

-- 3. Habilitar Row Level Security (RLS) com acesso para o app
alter table public.routine_state enable row level security;
alter table public.routine_events enable row level security;

drop policy if exists "Permitir leitura e escrita em routine_state" on public.routine_state;
create policy "Permitir leitura e escrita em routine_state"
  on public.routine_state
  for all
  using (true)
  with check (true);

drop policy if exists "Permitir leitura e escrita em routine_events" on public.routine_events;
create policy "Permitir leitura e escrita em routine_events"
  on public.routine_events
  for all
  using (true)
  with check (true);
