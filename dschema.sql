b/create table if not exists niche_sessions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  client_name text,
  lang text,
  transcript jsonb,
  report jsonb
);
alter table niche_sessions enable row level security;
-- no policies: only the server (service key) writes
