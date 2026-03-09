import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setup() {
  console.log("Setting up events table...");
  
  const sql = `
    CREATE TABLE IF NOT EXISTS events (
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

    -- Create indexes if they don't exist
    CREATE INDEX IF NOT EXISTS idx_events_start_datetime ON events(start_datetime);
    CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
    CREATE INDEX IF NOT EXISTS idx_events_city ON events(city);
    CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);

    -- Enable RLS
    ALTER TABLE events ENABLE ROW LEVEL SECURITY;

    -- Drop existing policies if any to recreate them
    DROP POLICY IF EXISTS "Public can view published events" ON events;
    DROP POLICY IF EXISTS "Public can submit events" ON events;
    DROP POLICY IF EXISTS "Admins can manage events" ON events;

    -- RLS Policies
    CREATE POLICY "Public can view published events" ON events
      FOR SELECT USING (status = 'published');

    CREATE POLICY "Public can submit events" ON events
      FOR INSERT WITH CHECK (status = 'pending');

    CREATE POLICY "Admins can manage events" ON events
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  `;

  // Supabase JS client doesn't have a direct raw SQL execution method for arbitrary DDL 
  // unless we use rpc. Let's try to create a function or just assume the user will run the schema.
  // Wait, I can use the REST API to execute SQL if I have postgres connection string, but I don't.
  // I will just add this to supabase_schema.sql and instruct the user, OR I can try to use supabase.rpc if a generic exec function exists.
  // Actually, I can just use the standard approach: update supabase_schema.sql.
}

setup();
