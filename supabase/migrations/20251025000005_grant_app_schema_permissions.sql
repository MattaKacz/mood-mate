-- Migration: Grant permissions to app schema
-- Description: Grants necessary permissions to authenticated and anon roles for app schema and its objects
-- Author: AI Assistant
-- Date: 2025-10-25

-- Grant usage on app schema to authenticated and anonymous users
grant usage on schema app to authenticated;
grant usage on schema app to anon;
grant usage on schema app to postgres;

-- Grant execute permissions on app schema functions to authenticated users
grant execute on all functions in schema app to authenticated;
grant execute on all functions in schema app to anon;

-- Grant usage on custom types in app schema
grant usage on type app.mood_tag to authenticated;
grant usage on type app.mood_tag to anon;
grant usage on type app.mood_tag to postgres;

-- Ensure future functions in app schema are also granted execute
alter default privileges in schema app grant execute on functions to authenticated;
alter default privileges in schema app grant execute on functions to anon;

