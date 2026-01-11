-- Migration: Create mood entries table
-- Description: Creates table for storing user mood entries with tags
-- Author: AI Assistant
-- Date: 2025-10-25

-- Create available tags type
create type app.mood_tag as enum (
    'work', 'stress', 'sleep', 'energy', 'family', 
    'health', 'motivation', 'rest', 'relationships', 
    'social', 'study', 'diet'
);

-- Create mood_entries table
create table mood_entries (
    id bigserial primary key,
    user_id uuid not null references auth.users(id) on delete cascade,
    score smallint not null check (score between 1 and 5),
    note varchar(280), -- Max length as per PRD
    tags app.mood_tag[] not null default '{}' check (array_length(tags, 1) <= 2), -- Max 2 tags as per PRD
    ai_response text, -- Store AI response for analytics
    ai_helpful boolean, -- Track if AI response was marked as helpful
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Enable RLS on mood_entries
alter table mood_entries enable row level security;

-- Create indexes
create index mood_entries_user_id_idx on mood_entries (user_id);
create index mood_entries_created_at_idx on mood_entries (created_at);
create index mood_entries_user_id_created_at_idx on mood_entries (user_id, created_at desc);

-- Create updated_at trigger
create trigger trg_mood_entries_touch_updated_at
    before update on mood_entries
    for each row
    execute function app.trg_touch_updated_at();

-- RLS Policies for mood_entries table
-- Policy for authenticated users to select their own entries
create policy "Users can view their own mood entries"
    on mood_entries for select
    to authenticated
    using (user_id = auth.uid());

-- Policy for authenticated users to insert their own entries
create policy "Users can create their own mood entries"
    on mood_entries for insert
    to authenticated
    with check (user_id = auth.uid());

-- Note: As per PRD, editing/deleting individual entries is not supported in PoC
-- These policies will be added in MVP when editing functionality is implemented

-- Create helper function for calculating streak
create or replace function app.get_user_streak(p_user_id uuid)
returns integer as $$
declare
    last_entry_date date;
    current_streak integer := 0;
begin
    -- Get the date of the last entry
    select date(created_at)
    into last_entry_date
    from mood_entries
    where user_id = p_user_id
    order by created_at desc
    limit 1;

    -- If no entries, return 0
    if last_entry_date is null then
        return 0;
    end if;

    -- If last entry is not from today or yesterday, streak is broken
    if last_entry_date < current_date - interval '1 day' then
        return 0;
    end if;

    -- Count consecutive days backwards
    while exists (
        select 1
        from mood_entries
        where user_id = p_user_id
        and date(created_at) = last_entry_date
    ) loop
        current_streak := current_streak + 1;
        last_entry_date := last_entry_date - interval '1 day';
    end loop;

    return current_streak;
end;
$$ language plpgsql security definer;

-- Create helper function for calculating weekly trend
create or replace function app.get_weekly_trend(p_user_id uuid)
returns text as $$
declare
    recent_avg float;
    earlier_avg float;
begin
    -- Calculate average for last 3 days
    select coalesce(avg(score), 0)
    into recent_avg
    from mood_entries
    where user_id = p_user_id
    and created_at >= current_date - interval '3 days'
    and created_at < current_date;

    -- Calculate average for previous 4 days
    select coalesce(avg(score), 0)
    into earlier_avg
    from mood_entries
    where user_id = p_user_id
    and created_at >= current_date - interval '7 days'
    and created_at < current_date - interval '3 days';

    -- Return trend description
    if recent_avg = 0 or earlier_avg = 0 then
        return 'insufficient_data';
    elsif recent_avg > earlier_avg then
        return 'improvement';
    elsif recent_avg < earlier_avg then
        return 'decline';
    else
        return 'stable';
    end if;
end;
$$ language plpgsql security definer;
