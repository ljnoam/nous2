-- Drop table to ensure clean slate (since we are changing columns)
drop table if exists public.expenses;

-- Create expenses table
create table public.expenses (
  id uuid not null default gen_random_uuid(),
  created_at timestamp with time zone not null default now(),
  amount numeric not null,
  description text not null,
  type text not null default 'shared', -- 'shared' or 'reimbursement'
  paid_by uuid not null references auth.users(id) on delete cascade,
  couple_id uuid not null references public.couples(id) on delete cascade,
  is_settled boolean not null default false,
  
  constraint expenses_pkey primary key (id)
);

-- Enable RLS
alter table public.expenses enable row level security;

-- Policies
create policy "Users can view expenses of their couple"
on public.expenses for select
to authenticated
using (
  couple_id in (
    select couple_id from public.couple_members where user_id = auth.uid()
  )
);

create policy "Users can insert expenses for their couple"
on public.expenses for insert
to authenticated
with check (
  couple_id in (
    select couple_id from public.couple_members where user_id = auth.uid()
  )
);

create policy "Users can update expenses of their couple"
on public.expenses for update
to authenticated
using (
  couple_id in (
    select couple_id from public.couple_members where user_id = auth.uid()
  )
)
with check (
  couple_id in (
    select couple_id from public.couple_members where user_id = auth.uid()
  )
);

create policy "Users can delete expenses of their couple"
on public.expenses for delete
to authenticated
using (
  couple_id in (
    select couple_id from public.couple_members where user_id = auth.uid()
  )
);
