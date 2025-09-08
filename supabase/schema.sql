create table if not exists profiles (
  id uuid primary key default auth.uid(),
  email text,
  created_at timestamptz default now()
);

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  owner uuid references profiles(id) on delete cascade,
  name text not null,
  created_at timestamptz default now()
);

create table if not exists comments (
  id uuid primary key,
  user_id uuid references profiles(id) on delete cascade,
  project_id uuid references projects(id),
  url text not null,
  selector text not null,
  x int not null,
  y int not null,
  bbox jsonb,
  comment text,
  status text check (status in ('open','resolved')) default 'open',
  image text,
  created_at timestamptz default now()
);

create table if not exists activity (
  id bigserial primary key,
  user_id uuid references profiles(id) on delete cascade,
  type text not null,
  url text,
  meta jsonb,
  created_at timestamptz default now()
);