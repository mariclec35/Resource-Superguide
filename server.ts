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
