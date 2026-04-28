-- SQL Migration for MN Recovery Hub TSML meeting sync

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS meetings (
  meeting_id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL,
  source_server TEXT NOT NULL,
  parent_org_slug TEXT REFERENCES resources(org_slug) ON UPDATE CASCADE ON DELETE SET NULL,
  subtype TEXT,
  meeting_name TEXT NOT NULL,
  day INTEGER NOT NULL CHECK (day BETWEEN 0 AND 6),
  time TIME NOT NULL,
  location_name TEXT,
  address TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  coordinates GEOGRAPHY(POINT, 4326),
  contact_info JSONB NOT NULL DEFAULT '{}'::jsonb,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_sync TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meetings_source_server ON meetings(source_server);
CREATE INDEX IF NOT EXISTS idx_meetings_source_id ON meetings(source_id);
CREATE INDEX IF NOT EXISTS idx_meetings_parent_org_slug ON meetings(parent_org_slug);
CREATE INDEX IF NOT EXISTS idx_meetings_subtype ON meetings(subtype);
CREATE INDEX IF NOT EXISTS idx_meetings_day_time ON meetings(day, time);
CREATE INDEX IF NOT EXISTS idx_meetings_details_gin ON meetings USING GIN (details);
CREATE INDEX IF NOT EXISTS idx_meetings_coordinates_gist ON meetings USING GIST (coordinates);

ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view meetings" ON meetings;
CREATE POLICY "Public can view meetings" ON meetings
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can manage meetings" ON meetings;
CREATE POLICY "Admins can manage meetings" ON meetings
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION set_meeting_coordinates()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.coordinates := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  ELSE
    NEW.coordinates := NULL;
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_meeting_coordinates_trigger ON meetings;
CREATE TRIGGER set_meeting_coordinates_trigger
  BEFORE INSERT OR UPDATE ON meetings
  FOR EACH ROW
  EXECUTE FUNCTION set_meeting_coordinates();
