import express from "express";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Supabase Admin Client for backend logging
const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
