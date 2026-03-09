import express from "express";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import fs from "fs";

fs.writeFileSync("server_start.log", `${new Date().toISOString()} - Server process started\n`);

dotenv.config();

const app = express();
const PORT = 3000;

// Supabase Admin Client for backend logging
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!supabaseUrl || !supabaseServiceKey) {
  fs.appendFileSync("server_start.log", `${new Date().toISOString()} - Missing Supabase configuration\n`);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const ai = new GoogleGenAI({ apiKey: process.env.VITE_CUSTOM_GEMINI_KEY || process.env.GEMINI_API_KEY || "" });

// Seed requested admin user immediately
(async () => {
  try {
    console.log("Setting up events table if it doesn't exist...");
    const { error: tableError } = await supabase.rpc('exec_sql', {
      sql: `
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
          recurrence_pattern TEXT,
          cost_type TEXT DEFAULT 'free',
          cost_details TEXT,
          status TEXT NOT NULL DEFAULT 'pending_review',
          source_type TEXT DEFAULT 'user_submission',
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

        CREATE TABLE IF NOT EXISTS event_audit_log (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          event_id UUID REFERENCES events(id) ON DELETE CASCADE,
          action TEXT NOT NULL,
          previous_status TEXT,
          new_status TEXT,
          changed_by TEXT,
          notes TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `
    });
    if (tableError) {
      console.log("Could not create events table via RPC (might need manual creation or RPC doesn't exist):", tableError.message);
      // We will just assume the table exists or will be created by the user.
    }

    const adminAccounts = [
      { email: "rosesroses1212@gmail.com", password: "Lovechris*1212" },
      { email: "mariclec35@gmail.com", password: "Lovechris*1212" }
    ];
    const logFile = "seed_results.log";
    
    fs.appendFileSync(logFile, `${new Date().toISOString()} - Seeding check started\n`);
    
    const { data, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      const msg = `Failed to list users during seeding: ${listError.message}`;
      console.error(msg);
      fs.appendFileSync(logFile, `${new Date().toISOString()} - ${msg}\n`);
    } else {
      const users = data.users;
      const existingEmails = users.map(u => u.email?.toLowerCase().trim());
      fs.appendFileSync(logFile, `${new Date().toISOString()} - Found ${users.length} existing users: ${existingEmails.join(', ')}\n`);
      
      for (const account of adminAccounts) {
        const targetEmail = account.email.toLowerCase().trim();
        const existingUser = users.find(u => u.email?.toLowerCase().trim() === targetEmail);
        
        if (!existingUser) {
          console.log(`Creating admin user: ${targetEmail}`);
          fs.appendFileSync(logFile, `${new Date().toISOString()} - Attempting to create user ${targetEmail}\n`);
          
          const { data: createData, error: createError } = await supabase.auth.admin.createUser({
            email: targetEmail,
            password: account.password,
            email_confirm: true
          });
          
          if (createError) {
            // If it fails with 500, it might be a Supabase internal state issue.
            // We'll log it more cleanly.
            const msg = `Failed to create admin user ${targetEmail}: ${createError.message} (${createError.status})`;
            console.error(msg);
            fs.appendFileSync(logFile, `${new Date().toISOString()} - ${msg}\n`);
            
            // If it failed but maybe the user actually exists (Supabase glitch), 
            // we'll try to find it again in the next run or just skip for now.
          } else {
            const msg = `Successfully created admin user: ${targetEmail}`;
            console.log(msg);
            fs.appendFileSync(logFile, `${new Date().toISOString()} - ${msg}\n`);
          }
        } else {
          // If user exists, ensure password is set to the expected one for recovery
          console.log(`Updating admin user ${account.email} password...`);
          fs.appendFileSync(logFile, `${new Date().toISOString()} - Updating user ${account.email}\n`);
          const { error: updateError } = await supabase.auth.admin.updateUserById(existingUser.id, {
            password: account.password,
            email_confirm: true
          });
          
          if (updateError) {
            const msg = `Failed to update admin user ${account.email}: ${JSON.stringify(updateError)}`;
            console.error(msg);
            fs.appendFileSync(logFile, `${new Date().toISOString()} - ${msg}\n`);
          } else {
            const msg = `Successfully updated admin user ${account.email}`;
            console.log(msg);
            fs.appendFileSync(logFile, `${new Date().toISOString()} - ${msg}\n`);
          }
        }
      }
    }
  } catch (err: any) {
    const msg = `Unexpected error during seeding: ${err.message}`;
    console.error(msg);
    fs.appendFileSync("seed_results.log", `${new Date().toISOString()} - ${msg}\n`);
  }
})();

app.use(express.json());

// API: Log Error
app.post("/api/log-error", async (req, res) => {
  const { 
    source, 
    severity, 
    message, 
    stack, 
    route, 
    endpoint, 
    user_id, 
    session_id, 
    metadata 
  } = req.body;

  // Basic validation
  if (!message || !source || !severity) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const { error } = await supabase.from("error_events").insert({
      source,
      severity,
      message,
      stack,
      route,
      endpoint,
      user_id,
      session_id,
      metadata,
    });

    if (error) throw error;
    res.status(200).json({ status: "ok" });
  } catch (err: any) {
    console.error("Failed to log error to Supabase:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// API: List Admin Users
app.get("/api/admin/users", async (req, res) => {
  try {
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    if (error) throw error;
    
    // Return only necessary info
    const sanitizedUsers = users.map(u => ({
      id: u.id,
      email: u.email,
      last_sign_in_at: u.last_sign_in_at,
      created_at: u.created_at
    }));
    
    res.status(200).json(sanitizedUsers);
  } catch (err: any) {
    console.error("Failed to list users:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// API: Create Admin User
app.post("/api/admin/users", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    console.log(`Attempting to create admin user: ${email}`);
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });
    
    if (error) {
      console.error("Supabase createUser error:", error);
      const authError = error as any;
      return res.status(error.status || 500).json({ 
        error: error.message || "Internal server error",
        details: authError.details || undefined
      });
    }
    
    console.log(`Successfully created admin user: ${data.user.id}`);
    res.status(201).json(data.user);
  } catch (err: any) {
    console.error("Failed to create user:", err);
    res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// API: Delete Admin User
app.delete("/api/admin/users/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const { error } = await supabase.auth.admin.deleteUser(id);
    if (error) throw error;
    res.status(200).json({ status: "ok" });
  } catch (err: any) {
    console.error("Failed to delete user:", err);
    res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// API: Reset Password (Send Email)
app.post("/api/admin/users/:id/reset-password", async (req, res) => {
  const { id } = req.params;
  try {
    // Get user email first
    const { data: { user }, error: getError } = await supabase.auth.admin.getUserById(id);
    if (getError || !user || !user.email) throw getError || new Error("User not found");

    const { error } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: user.email,
    });
    if (error) throw error;
    res.status(200).json({ status: "ok", message: "Reset link generated (check server logs or email if configured)" });
  } catch (err: any) {
    console.error("Failed to reset password:", err);
    res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// API: Reset Categories
app.post("/api/admin/categories/reset", async (req, res) => {
  try {
    // 1. Delete all existing categories
    const { error: deleteError } = await supabase.from("categories").delete().neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all
    if (deleteError) throw deleteError;

    const newCategories = [
      { name: "The Basics", sub: ["Clothes", "Food Resources", "Free Meals", "Showers", "Drop-in Centers", "Overnight Shelter", "Transitional & Supportive Housing", "Housing Assistance", "Furniture", "Advocacy & Case Management", "Pet Resources"] },
      { name: "Public Assistance", sub: ["Minnesota Family Investment Program (MFIP)", "Emergency Assistance / Emergency GA (EA/EGA)", "Energy Assistance", "Supplemental Nutrition Assistance Program", "General Assistance (GA)", "Medical Assistance & MinnesotaCare", "Minnesota Supplemental Aid (MSA)", "Social Security"] },
      { name: "Health Care", sub: ["Community Clinics", "Health Care for the Homeless", "HIV / STI / Pregnancy Testing", "Dental Care", "Mental Health Services", "Veterans", "Youth", "Substance Use Disorder Counseling & Treatment"] },
      { name: "Education & Employment", sub: ["Educational Programs", "Job Training & Placement", "Day and Temporary Labor"] },
      { name: "Special Help & Advocacy", sub: ["Youth Programs", "Services for Immigrants", "Help for Veterans", "Victims of Abuse and Crime", "Legal Assistance", "Police Misconduct", "Programs for Ex-Offenders"] }
    ];

    for (let i = 0; i < newCategories.length; i++) {
      const primary = newCategories[i];
      const { data: primaryData, error: primaryError } = await supabase
        .from("categories")
        .insert({ name: primary.name, sequence: (i + 1) * 10 })
        .select()
        .single();

      if (primaryError) throw primaryError;

      const subInserts = primary.sub.map((name, index) => ({
        name,
        parent_id: primaryData.id,
        sequence: (index + 1)
      }));

      const { error: subError } = await supabase.from("categories").insert(subInserts);
      if (subError) throw subError;
    }

    res.status(200).json({ status: "ok", message: "Categories reset successfully" });
  } catch (err: any) {
    console.error("Failed to reset categories:", err);
    res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// API: Maintenance - Clear Categories and Set Resources to Pending
app.post("/api/admin/maintenance/clear-and-pending", async (req, res) => {
  try {
    console.log("Starting maintenance: Clear categories and set resources to pending");
    
    // 1. Delete all categories
    const { error: catError } = await supabase
      .from("categories")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    
    if (catError) throw catError;

    // 2. Update all resources to needs_verification
    const { error: resError } = await supabase
      .from("resources")
      .update({ status: "needs_verification" })
      .neq("id", "00000000-0000-0000-0000-000000000000");
    
    if (resError) throw resError;

    console.log("Maintenance completed successfully");
    res.status(200).json({ 
      status: "ok", 
      message: "Successfully removed all categories and marked all resources for verification." 
    });
  } catch (err: any) {
    console.error("Maintenance reset error:", err);
    res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// API: Search Analytics
app.post("/api/search/analytics", async (req, res) => {
  const { 
    raw_prompt, 
    extracted_needs_json, 
    inferred_location, 
    inferred_urgency, 
    inferred_need_types, 
    results_count, 
    matched_resource_ids, 
    search_success,
    session_id
  } = req.body;

  try {
    const { error } = await supabase.from("search_analytics").insert({
      raw_prompt,
      extracted_needs_json,
      inferred_location,
      inferred_urgency,
      inferred_need_types,
      results_count,
      matched_resource_ids,
      search_success,
      session_id
    });

    if (error) throw error;
    res.status(200).json({ status: "ok" });
  } catch (err: any) {
    console.error("Analytics logging error:", err);
    res.status(500).json({ error: "Failed to log analytics" });
  }
});

// API: Get Homepage Settings
app.get("/api/homepage-settings", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("resources")
      .select("description")
      .eq("name", "HOMEPAGE_SETTINGS")
      .eq("category", "SYSTEM")
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      throw error;
    }

    if (!data) {
      // Return default settings
      return res.status(200).json({
        primaryHeader: "Find the support you need.",
        secondaryHeader: "Whether you know exactly what you're looking for or just need to describe your situation, we're here to help.",
        quickActions: [
          { name: "Shelter Tonight", prompt: "I need emergency shelter tonight.", icon: "Moon" },
          { name: "Find a Meeting", prompt: "I want to find a recovery meeting near me.", icon: "Users" },
          { name: "Food This Week", prompt: "I need help getting food this week.", icon: "Utensils" },
          { name: "Job Help", prompt: "I am looking for employment assistance.", icon: "Briefcase" },
          { name: "Transportation Help", prompt: "I need help with transportation or bus passes.", icon: "Car" },
          { name: "Help for Families", prompt: "I need support services for my family and children.", icon: "Heart" }
        ]
      });
    }

    res.status(200).json(JSON.parse(data.description));
  } catch (err: any) {
    console.error("Failed to get homepage settings:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// API: Update Homepage Settings
app.post("/api/homepage-settings", async (req, res) => {
  const settings = req.body;
  try {
    // Check if it exists
    const { data: existing } = await supabase
      .from("resources")
      .select("id")
      .eq("name", "HOMEPAGE_SETTINGS")
      .eq("category", "SYSTEM")
      .single();

    if (existing) {
      const { error } = await supabase
        .from("resources")
        .update({ description: JSON.stringify(settings) })
        .eq("id", existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("resources")
        .insert({
          name: "HOMEPAGE_SETTINGS",
          category: "SYSTEM",
          description: JSON.stringify(settings),
          status: "active"
        });
      if (error) throw error;
    }

    res.status(200).json({ status: "ok" });
  } catch (err: any) {
    console.error("Failed to update homepage settings:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// --- EVENTS API ---

// Public: Get all published events
app.get("/api/events", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("status", "published")
      .order("start_datetime", { ascending: true });

    if (error) throw error;
    res.status(200).json(data);
  } catch (err: any) {
    console.error("Failed to fetch events:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Public: Get single published event
app.get("/api/events/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("id", id)
      .eq("status", "published")
      .single();

    if (error) throw error;
    res.status(200).json(data);
  } catch (err: any) {
    console.error("Failed to fetch event:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Public: Submit an event (goes to pending_review)
app.post("/api/events", async (req, res) => {
  const eventData = req.body;
  
  // Generate a basic slug from the title
  const baseSlug = eventData.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
  const slug = `${baseSlug}-${Date.now().toString(36)}`;

  try {
    const { data, error } = await supabase
      .from("events")
      .insert({ ...eventData, slug, status: "pending_review" })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err: any) {
    console.error("Failed to submit event:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Admin: Get all events (any status)
app.get("/api/admin/events", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.status(200).json(data);
  } catch (err: any) {
    console.error("Failed to fetch admin events:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Admin: Create event
app.post("/api/admin/events", async (req, res) => {
  const eventData = req.body;
  
  // Generate a basic slug from the title if not provided
  if (!eventData.slug) {
    const baseSlug = eventData.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
    eventData.slug = `${baseSlug}-${Date.now().toString(36)}`;
  }

  try {
    const { data, error } = await supabase
      .from("events")
      .insert(eventData)
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err: any) {
    console.error("Failed to create event:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Admin: Update event
app.put("/api/admin/events/:id", async (req, res) => {
  const { id } = req.params;
  const eventData = req.body;
  try {
    const { data, error } = await supabase
      .from("events")
      .update({ ...eventData, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    res.status(200).json(data);
  } catch (err: any) {
    console.error("Failed to update event:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Admin: Delete event
app.delete("/api/admin/events/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const { error } = await supabase
      .from("events")
      .delete()
      .eq("id", id);

    if (error) throw error;
    res.status(200).json({ status: "ok" });
  } catch (err: any) {
    console.error("Failed to delete event:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Middleware for automatic API error logging
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("API Error:", err);
  
  // Log to Supabase asynchronously
  supabase.from("error_events").insert({
    source: "api",
    severity: "error",
    message: err.message || "Unknown API Error",
    stack: err.stack,
    endpoint: req.originalUrl,
    metadata: {
      method: req.method,
      body: req.body,
      query: req.query,
      headers: req.headers,
    }
  }).then(({ error }) => {
    if (error) console.error("Failed to log API error to Supabase:", error);
  });

  res.status(500).json({ error: "Internal server error" });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist", { index: false }));
    let htmlTemplate = "";
    try {
      htmlTemplate = fs.readFileSync("dist/index.html", "utf-8");
    } catch (e) {
      console.error("Could not read dist/index.html", e);
    }
    app.get("*", (req, res) => {
      try {
        const envScript = `<script>window.ENV = ${JSON.stringify({
          VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "",
          VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "",
          GEMINI_API_KEY: process.env.GEMINI_API_KEY || process.env.VITE_CUSTOM_GEMINI_KEY || ""
        })};</script>`;
        const html = htmlTemplate.replace("</head>", `${envScript}</head>`);
        res.send(html);
      } catch (err) {
        console.error("Error serving index.html:", err);
        res.status(500).send("Internal Server Error");
      }
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
