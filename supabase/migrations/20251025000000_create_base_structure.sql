-- Migration: Create base database structure
-- Description: Sets up custom schema and shared triggers
-- Author: AI Assistant
-- Date: 2025-10-25

-- Create custom schema for application objects
create schema if not exists app;

-- Create shared updated_at trigger function
create or replace function app.trg_touch_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;
