-- ==============================================================================
-- AirMesh Database Schema & RLS Security Configuration
-- Target Database: Supabase (PostgreSQL 15+)
-- ==============================================================================

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Email Subscribers Table
CREATE TABLE IF NOT EXISTS public.email_subscribers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    is_verified BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    verification_token_hash TEXT,
    verification_expires_at TIMESTAMPTZ,
    verified_at TIMESTAMPTZ,
    last_alert_sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Case-insensitive unique constraint on email
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_subscribers_lower_email 
ON public.email_subscribers (LOWER(email));

-- Fast lookup indexes for verification and queries
CREATE INDEX IF NOT EXISTS idx_email_subscribers_token_hash 
ON public.email_subscribers (verification_token_hash) 
WHERE verification_token_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_email_subscribers_active_verified 
ON public.email_subscribers (is_active, is_verified);


-- 3. Air Alert Preferences Table
CREATE TABLE IF NOT EXISTS public.air_alert_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscriber_id UUID NOT NULL UNIQUE REFERENCES public.email_subscribers(id) ON DELETE CASCADE,
    profile TEXT NOT NULL DEFAULT 'respiratory_sensitive' 
        CHECK (profile IN ('general', 'respiratory_sensitive', 'custom')),
    enabled BOOLEAN NOT NULL DEFAULT true,
    pollutants JSONB NOT NULL DEFAULT '["pm25"]'::jsonb,
    thresholds JSONB NOT NULL DEFAULT '{"pm25": {"value": 15, "unit": "µg/m³"}}'::jsonb,
    frequency TEXT NOT NULL DEFAULT 'important',
    last_notification_date TEXT, -- YYYY-MM-DD format (IST timezone)
    management_token_hash TEXT,
    management_token_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes for cron and management link lookups
CREATE INDEX IF NOT EXISTS idx_preferences_subscriber 
ON public.air_alert_preferences (subscriber_id);

CREATE INDEX IF NOT EXISTS idx_preferences_enabled 
ON public.air_alert_preferences (enabled);

CREATE INDEX IF NOT EXISTS idx_preferences_mgmt_token_hash 
ON public.air_alert_preferences (management_token_hash) 
WHERE management_token_hash IS NOT NULL;


-- 4. Automatic updated_at Trigger Function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_subscribers_updated_at ON public.email_subscribers;
CREATE TRIGGER set_subscribers_updated_at
BEFORE UPDATE ON public.email_subscribers
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_preferences_updated_at ON public.air_alert_preferences;
CREATE TRIGGER set_preferences_updated_at
BEFORE UPDATE ON public.air_alert_preferences
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();


-- ==============================================================================
-- 5. Row Level Security (RLS) Policies
-- All data modifications and reads happen strictly through backend Vercel 
-- serverless functions using the SUPABASE_SERVICE_ROLE_KEY.
-- Anonymous and authenticated client-side browsers have ZERO direct access.
-- ==============================================================================

ALTER TABLE public.email_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.air_alert_preferences ENABLE ROW LEVEL SECURITY;

-- Deny all direct public anon access by default
DROP POLICY IF EXISTS "Deny anon access on email_subscribers" ON public.email_subscribers;
CREATE POLICY "Deny anon access on email_subscribers" 
ON public.email_subscribers 
FOR ALL 
TO anon 
USING (false);

DROP POLICY IF EXISTS "Deny anon access on air_alert_preferences" ON public.air_alert_preferences;
CREATE POLICY "Deny anon access on air_alert_preferences" 
ON public.air_alert_preferences 
FOR ALL 
TO anon 
USING (false);

-- Note: The service_role key automatically bypasses RLS in Supabase, 
-- ensuring the serverless API routes function properly while protecting
-- user emails and hashed tokens from browser scraping or unauthorized queries.
