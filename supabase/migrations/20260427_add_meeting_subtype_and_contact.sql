ALTER TABLE IF EXISTS meetings
  ADD COLUMN IF NOT EXISTS subtype TEXT;

ALTER TABLE IF EXISTS meetings
  ADD COLUMN IF NOT EXISTS contact_info JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_meetings_subtype ON meetings(subtype);
