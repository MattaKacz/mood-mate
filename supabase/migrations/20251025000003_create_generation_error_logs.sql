-- Migration: Create generation error logs table
-- Description: Creates table for tracking AI generation errors with enhanced monitoring capabilities
-- Author: AI Assistant
-- Date: 2025-10-25

-- Create error severity enum
create type app.error_severity as enum (
    'debug',
    'info',
    'warning',
    'error',
    'critical'
);

-- Create generation_error_logs table
create table generation_error_logs (
    id bigserial primary key,
    user_id uuid not null references auth.users(id) on delete cascade,
    model varchar not null,
    source_text_hash varchar not null,
    source_text_length integer not null check (source_text_length between 1000 and 10000),
    error_code varchar(100) not null,
    error_message text not null,
    request_id uuid not null default gen_random_uuid(), -- For tracking related errors
    correlation_id varchar(100), -- Optional: For linking to external system logs
    severity app.error_severity not null default 'error',
    resolved_at timestamptz,
    resolution_note text,
    created_at timestamptz not null default now()
);

-- Enable RLS
alter table generation_error_logs enable row level security;

-- Create indexes
create index generation_error_logs_user_id_idx on generation_error_logs (user_id);
create index generation_error_logs_created_at_idx on generation_error_logs (created_at desc);
create index generation_error_logs_request_id_idx on generation_error_logs (request_id);

-- Create partial index for unresolved critical errors
create index generation_error_logs_unresolved_critical_idx 
    on generation_error_logs (created_at desc) 
    where severity = 'critical' and resolved_at is null;

-- Create composite index for user errors by date
create index generation_error_logs_user_date_idx 
    on generation_error_logs (user_id, created_at desc);

-- Create function to get recent errors
create or replace function app.get_recent_errors(
    p_user_id uuid,
    p_days integer default 7
)
returns table (
    id bigint,
    error_code varchar(100),
    error_message text,
    severity app.error_severity,
    created_at timestamptz
) as $$
begin
    return query
    select 
        e.id,
        e.error_code,
        e.error_message,
        e.severity,
        e.created_at
    from generation_error_logs e
    where e.user_id = p_user_id
    and e.created_at > now() - (p_days * interval '1 day')
    order by e.created_at desc;
end;
$$ language plpgsql security definer;

-- RLS Policies
create policy "Users can view their own error logs"
    on generation_error_logs for select
    to authenticated
    using (user_id = auth.uid());

create policy "Users can create error logs"
    on generation_error_logs for insert
    to authenticated
    with check (user_id = auth.uid());

-- Only service role can mark errors as resolved
create policy "Service role can update error logs"
    on generation_error_logs for update
    to service_role
    using (true)
    with check (true);

-- Create helper function to get error statistics
create or replace function app.get_error_stats(
    p_user_id uuid,
    p_start_date timestamptz default now() - interval '7 days',
    p_end_date timestamptz default now()
)
returns table (
    total_errors bigint,
    critical_errors bigint,
    resolved_errors bigint,
    avg_resolution_time interval
) as $$
begin
    return query
    select
        count(*)::bigint as total_errors,
        count(*) filter (where severity = 'critical')::bigint as critical_errors,
        count(*) filter (where resolved_at is not null)::bigint as resolved_errors,
        avg(resolved_at - created_at) filter (where resolved_at is not null) as avg_resolution_time
    from generation_error_logs
    where user_id = p_user_id
    and created_at between p_start_date and p_end_date;
end;
$$ language plpgsql security definer;

-- Create view for error monitoring (admin/monitoring purposes)
-- This view aggregates errors by hour and severity for the last 24 hours
create view app.error_monitoring as
select
    date_trunc('hour', created_at) as error_hour,
    severity,
    count(*) as error_count,
    count(*) filter (where resolved_at is not null) as resolved_count,
    coalesce(
        avg(extract(epoch from (resolved_at - created_at))) filter (where resolved_at is not null),
        0
    )::integer as avg_resolution_time_seconds
from generation_error_logs
where created_at > now() - interval '24 hours'
group by date_trunc('hour', created_at), severity
order by 1 desc, 2;

-- Grant access to the view
grant select on app.error_monitoring to authenticated, service_role;
