-- SQL Migration for Twin Cities Recovery Hub Events System

-- 1. Create events table
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  short_description TEXT,
  category TEXT NOT NULL,
  organizer_name TEXT NOT NULL,
  organizer_type TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  website TEXT,
  registration_link TEXT,
  location_name TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  is_virtual BOOLEAN DEFAULT false,
  virtual_event_url TEXT,
  start_datetime TIMESTAMPTZ NOT NULL,
  end_datetime TIMESTAMPTZ,
  timezone TEXT DEFAULT 'UTC',
  recurring BOOLEAN DEFAULT false,
  recurrence_pattern TEXT, -- JSON or text pattern for future use
  cost_type TEXT DEFAULT 'free', -- 'free', 'paid', 'donation', 'sliding_scale'
  cost_details TEXT,
  status TEXT NOT NULL DEFAULT 'pending_review', -- draft, pending_review, approved, published, rejected, cancelled, archived
  source_type TEXT DEFAULT 'user_submission', -- 'user_submission', 'admin_created', 'imported'
  source_name TEXT,
  source_url TEXT,
  submitted_by_name TEXT,
  submitted_by_email TEXT,
  verification_notes TEXT,
  ai_summary TEXT,
  ai_category_suggestion TEXT,
  duplicate_check_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ
);

-- 2. Create event_audit_log table
-- Rationale: A separate audit log table is cleaner than cluttering the events table with an array of history.
-- It allows tracking who changed what and when, which is crucial for moderation.
CREATE TABLE IF NOT EXISTS event_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'created', 'status_changed', 'edited', 'verified'
  previous_status TEXT,
  new_status TEXT,
  changed_by TEXT, -- user ID or email of the admin/user
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Constraints
-- Ensure end_datetime is after start_datetime
ALTER TABLE events ADD CONSTRAINT check_event_dates CHECK (end_datetime IS NULL OR end_datetime > start_datetime);

-- Ensure virtual events have a URL if they are virtual only (optional, but good practice)
-- ALTER TABLE events ADD CONSTRAINT check_virtual_url CHECK (is_virtual = false OR virtual_event_url IS NOT NULL);

-- Status validation
ALTER TABLE events ADD CONSTRAINT check_event_status CHECK (status IN ('draft', 'pending_review', 'approved', 'published', 'rejected', 'cancelled', 'archived'));

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_events_start_datetime ON events(start_datetime);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
CREATE INDEX IF NOT EXISTS idx_events_city ON events(city);
CREATE INDEX IF NOT EXISTS idx_events_slug ON events(slug);
CREATE INDEX IF NOT EXISTS idx_events_published_at ON events(published_at);

-- Compound indexes for common queries
CREATE INDEX IF NOT EXISTS idx_events_status_start_datetime ON events(status, start_datetime);
CREATE INDEX IF NOT EXISTS idx_events_category_start_datetime ON events(category, start_datetime);
CREATE INDEX IF NOT EXISTS idx_events_city_start_datetime ON events(city, start_datetime);

-- 5. Enable RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_audit_log ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for events
-- Public can view published events
DROP POLICY IF EXISTS "Public can view published events" ON events;
CREATE POLICY "Public can view published events" ON events
  FOR SELECT USING (status = 'published');

-- Public can submit events (they go into pending_review)
DROP POLICY IF EXISTS "Public can submit events" ON events;
CREATE POLICY "Public can submit events" ON events
  FOR INSERT WITH CHECK (status = 'pending_review');

-- Admins can manage events
DROP POLICY IF EXISTS "Admins can manage events" ON events;
CREATE POLICY "Admins can manage events" ON events
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 7. RLS Policies for event_audit_log
-- Only admins can view and insert audit logs
DROP POLICY IF EXISTS "Admins can manage audit logs" ON event_audit_log;
CREATE POLICY "Admins can manage audit logs" ON event_audit_log
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 8. Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_events_updated_at ON events;
CREATE TRIGGER update_events_updated_at
    BEFORE UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
