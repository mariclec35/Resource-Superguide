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
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

// Seed requested admin user immediately
(async () => {
  try {
    const adminAccounts = [
      { email: "rosesroses1212@gmail.com", password: "Lovechris*1212" },
      { email: "mariclec35@gmail.com", password: "Lovechris*1212" } // Added user's email as admin
    ];
    const logFile = "seed_results.log";
    
    fs.appendFileSync(logFile, `${new Date().toISOString()} - Seeding check started\n`);
    
    console.log("Calling listUsers...");
    const { data, error: listError } = await supabase.auth.admin.listUsers();
    console.log("listUsers returned", { hasData: !!data, hasError: !!listError });
    
    if (listError) {
      const msg = `Failed to list users during seeding: ${JSON.stringify(listError)}`;
      console.error(msg);
      fs.appendFileSync(logFile, `${new Date().toISOString()} - ${msg}\n`);
    } else {
      const users = data.users;
      fs.appendFileSync(logFile, `${new Date().toISOString()} - Found ${users.length} existing users\n`);
      for (const account of adminAccounts) {
        const existingUser = users.find(u => u.email === account.email);
        if (!existingUser) {
          console.log(`Creating admin user ${account.email}...`);
          fs.appendFileSync(logFile, `${new Date().toISOString()} - Creating user ${account.email}\n`);
          const { error: createError } = await supabase.auth.admin.createUser({
            email: account.email,
            password: account.password,
            email_confirm: true
          });
          
          if (createError) {
            const msg = `Failed to create admin user ${account.email}: ${JSON.stringify(createError)}`;
            console.error(msg);
            fs.appendFileSync(logFile, `${new Date().toISOString()} - ${msg}\n`);
          } else {
            const msg = `Successfully created admin user ${account.email}`;
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

// API: AI Search Extraction
app.post("/api/search/extract", async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: "Prompt is required" });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: `Extract structured needs from the user's community resource request.
Return a JSON object with:
- need_types: string[] (housing, shelter, food, treatment, recovery support, employment, transportation, legal, healthcare, mental health, youth services, family services, domestic violence support, financial assistance)
- urgency: string (immediate, this_week, ongoing)
- location: string | null
- preferences: string[]
- barriers: string[]
- eligibility_clues: string[]
- keywords: string[]
- ai_summary: string (A short interpretation of the user's needs)`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            need_types: { type: Type.ARRAY, items: { type: Type.STRING } },
            urgency: { type: Type.STRING },
            location: { type: Type.STRING, nullable: true },
            preferences: { type: Type.ARRAY, items: { type: Type.STRING } },
            barriers: { type: Type.ARRAY, items: { type: Type.STRING } },
            eligibility_clues: { type: Type.ARRAY, items: { type: Type.STRING } },
            keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
            ai_summary: { type: Type.STRING }
          },
          required: ["need_types", "urgency", "preferences", "barriers", "eligibility_clues", "keywords", "ai_summary"]
        }
      }
    });

    const extraction = JSON.parse(response.text || "{}");
    res.json(extraction);
  } catch (err: any) {
    console.error("Extraction error:", err);
    res.status(500).json({ error: "Failed to extract search intent" });
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
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile("dist/index.html", { root: "." });
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
