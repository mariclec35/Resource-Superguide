-- SQL Migration for Twin Cities Recovery Hub

-- 1. Create resources table
CREATE TABLE resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  website TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active',   -- 'active','needs_verification','temporarily_closed'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create categories table
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  sequence INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create reports table
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID REFERENCES resources(id) ON DELETE CASCADE,
  issue_type TEXT NOT NULL,
  comment TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  optional_contact TEXT,
  report_status TEXT NOT NULL DEFAULT 'open',  -- 'open','in_review','resolved','duplicate'
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  admin_user TEXT
);

-- 3. Enable RLS
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for resources
-- Public can read resources
CREATE POLICY "Public can view resources" ON resources
  FOR SELECT USING (true);

-- Authenticated users (admins) can do everything
CREATE POLICY "Admins can manage resources" ON resources
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6. RLS Policies for categories
-- Public can read categories
CREATE POLICY "Public can view categories" ON categories
  FOR SELECT USING (true);

-- Authenticated users (admins) can do everything
CREATE POLICY "Admins can manage categories" ON categories
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 7. RLS Policies for reports
-- Public can insert reports
CREATE POLICY "Public can submit reports" ON reports
  FOR INSERT WITH CHECK (true);

-- Authenticated users (admins) can view and update reports
CREATE POLICY "Admins can manage reports" ON reports
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6. Indexes for performance
CREATE INDEX idx_resources_status ON resources(status);
CREATE INDEX idx_resources_category ON resources(category);
CREATE INDEX idx_reports_status ON reports(report_status);
CREATE INDEX idx_reports_resource_id ON reports(resource_id);

-- 7. Seed initial categories
INSERT INTO categories (name) VALUES 
  ('Housing'), ('Food Shelf'), ('Mental Health'), ('Chemical Dependency'), 
  ('Employment'), ('Legal'), ('Medical'), ('Crisis'), ('Other')
ON CONFLICT (name) DO NOTHING;

-- 8. Create error_events table for structured logging
CREATE TYPE error_source AS ENUM ('client', 'api', 'job');
CREATE TYPE error_severity AS ENUM ('info', 'warning', 'error', 'critical');

CREATE TABLE error_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  source error_source NOT NULL,
  severity error_severity NOT NULL,
  message TEXT NOT NULL,
  stack TEXT,
  route TEXT,
  endpoint TEXT,
  user_id UUID,
  session_id TEXT,
  metadata JSONB,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID
);

-- Enable RLS
ALTER TABLE error_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Public can only insert (for client-side logging)
CREATE POLICY "Public can log errors" ON error_events
  FOR INSERT WITH CHECK (true);

-- Admins can view and update
CREATE POLICY "Admins have full access to error logs" ON error_events
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Indexes for performance
CREATE INDEX idx_error_events_created_at ON error_events(created_at DESC);
CREATE INDEX idx_error_events_severity ON error_events(severity);
CREATE INDEX idx_error_events_source ON error_events(source);
CREATE INDEX idx_error_events_resolved ON error_events(resolved);

-- 9. Create events table
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  organizer_name TEXT NOT NULL,
  organizer_type TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  website TEXT,
  location_name TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  start_datetime TIMESTAMPTZ NOT NULL,
  end_datetime TIMESTAMPTZ,
  recurring BOOLEAN DEFAULT false,
  recurrence_pattern TEXT,
  cost TEXT,
  registration_link TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- draft, pending, approved, published, cancelled, archived
  verification_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for events
-- Public can view published events
CREATE POLICY "Public can view published events" ON events
  FOR SELECT USING (status = 'published');

-- Public can submit events
CREATE POLICY "Public can submit events" ON events
  FOR INSERT WITH CHECK (status = 'pending');

-- Admins can manage events
CREATE POLICY "Admins can manage events" ON events
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Indexes for performance
CREATE INDEX idx_events_start_datetime ON events(start_datetime);
CREATE INDEX idx_events_category ON events(category);
CREATE INDEX idx_events_city ON events(city);
CREATE INDEX idx_events_status ON events(status);
