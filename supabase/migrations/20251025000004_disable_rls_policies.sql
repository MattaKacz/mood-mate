-- Migration: Disable RLS policies
-- Description: Drops all RLS policies and disables Row Level Security on users_profile, mood_entries, and generation_error_logs tables
-- Author: AI Assistant
-- Date: 2025-10-25

-- Drop all RLS policies from users_profile table (4 policies)
drop policy if exists "Users can view their own profile" on users_profile;
drop policy if exists "Users can create their own profile" on users_profile;
drop policy if exists "Users can update their own profile" on users_profile;
drop policy if exists "Users can delete their own profile" on users_profile;

-- Drop all RLS policies from mood_entries table (2 policies)
drop policy if exists "Users can view their own mood entries" on mood_entries;
drop policy if exists "Users can create their own mood entries" on mood_entries;

-- Drop all RLS policies from generation_error_logs table (3 policies)
drop policy if exists "Users can view their own error logs" on generation_error_logs;
drop policy if exists "Users can create error logs" on generation_error_logs;
drop policy if exists "Service role can update error logs" on generation_error_logs;

-- Disable Row Level Security on all three tables
alter table users_profile disable row level security;
alter table mood_entries disable row level security;
alter table generation_error_logs disable row level security;

