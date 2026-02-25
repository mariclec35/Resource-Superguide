-- SQL Migration for Resource Superguide

-- 1. Create resources table
CREATE TABLE resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  city_direction TEXT NOT NULL,
  recovery_stage TEXT[] NOT NULL,   -- values: 'crisis','stabilizing','growth'
  transit_accessibility TEXT NOT NULL,
  -- values: 'On Major Bus Line','Near Light Rail (Green Line / Blue Line)','Multiple Transit Options','Limited Transit Access','Car Recommended'
  walkability TEXT NOT NULL,
  -- values: 'Walkable ≤ 15 minutes','Walkable 16–30 minutes','Unknown'
  access_indicators TEXT[] NOT NULL,
  -- values include: 'Walk-in friendly','Application required','Waitlist likely','Referral required','ID required','Insurance required'
  snap_accepted TEXT NOT NULL,  -- 'Yes','No','N/A'
  cost TEXT NOT NULL,           -- 'Free','Sliding scale','Insurance','Fee','Mixed'
  address TEXT NOT NULL,
  phone TEXT,
  website TEXT,
  hours TEXT,
  description TEXT,
  best_for TEXT,
  status TEXT NOT NULL DEFAULT 'active',   -- 'active','needs_verification','temporarily_closed'
  last_verified_date DATE,
  verification_notes TEXT,
  open_report_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create reports table
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
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for resources
-- Public can read active or needs_verification resources (not temporarily_closed)
CREATE POLICY "Public can view non-closed resources" ON resources
  FOR SELECT USING (status != 'temporarily_closed');

-- Admins can do everything (assuming service_role or specific admin check)
-- For this simple app, we'll allow authenticated users (admins) full access
CREATE POLICY "Admins have full access to resources" ON resources
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. RLS Policies for reports
-- Public can insert reports
CREATE POLICY "Public can submit reports" ON reports
  FOR INSERT WITH CHECK (true);

-- Admins can view and update reports
CREATE POLICY "Admins have full access to reports" ON reports
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6. Indexes for performance
CREATE INDEX idx_resources_status ON resources(status);
CREATE INDEX idx_resources_category ON resources(category);
CREATE INDEX idx_reports_status ON reports(report_status);
CREATE INDEX idx_reports_resource_id ON reports(resource_id);
