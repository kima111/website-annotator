alter table profiles enable row level security;
alter table projects enable row level security;
alter table comments enable row level security;
alter table activity enable row level security;

alter table if exists memberships enable row level security;

create policy "profiles self" on profiles
  for select using ( auth.uid() = id );
create policy "profiles insert self" on profiles
  for insert with check ( auth.uid() = id );

create policy "projects owner" on projects for all using ( owner = auth.uid() ) with check ( owner = auth.uid() );

create policy "comments by user" on comments for all using ( user_id = auth.uid() ) with check ( user_id = auth.uid() );

create policy "activity by user" on activity for all using ( user_id = auth.uid() ) with check ( user_id = auth.uid() );

create policy "memberships self" on memberships
  for select using ( auth.uid() = user_id );
create policy "memberships insert self" on memberships
  for insert with check ( auth.uid() = user_id );
create policy "memberships delete self_owner" on memberships
  for delete using ( auth.uid() = user_id );

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles(id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();