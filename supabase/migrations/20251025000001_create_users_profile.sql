-- Migration: Create users profile table
-- Description: Creates table for storing user preferences and settings
-- Author: AI Assistant
-- Date: 2025-10-25

-- Create users_profile table
create table users_profile (
    id uuid primary key references auth.users(id) on delete cascade,
    ritual_time time not null default '21:30:00', -- Default ritual time as per PRD
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Enable RLS on users_profile
alter table users_profile enable row level security;

-- Create updated_at trigger
create trigger trg_users_profile_touch_updated_at
    before update on users_profile
    for each row
    execute function app.trg_touch_updated_at();

-- RLS Policies for users_profile table
-- Policy for authenticated users to select their own profile
create policy "Users can view their own profile"
    on users_profile for select
    to authenticated
    using (id = auth.uid());

-- Policy for authenticated users to insert their own profile
create policy "Users can create their own profile"
    on users_profile for insert
    to authenticated
    with check (id = auth.uid());

-- Policy for authenticated users to update their own profile
create policy "Users can update their own profile"
    on users_profile for update
    to authenticated
    using (id = auth.uid())
    with check (id = auth.uid());

-- Policy for authenticated users to delete their own profile
create policy "Users can delete their own profile"
    on users_profile for delete
    to authenticated
    using (id = auth.uid());
