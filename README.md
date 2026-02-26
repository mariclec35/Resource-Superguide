<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Resource Project</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <style>
    :root{
      --bg:#0d1117;
      --panel:#161b22;
      --text:#c9d1d9;
      --muted:#8b949e;
      --border:#30363d;
      --border2:#21262d;
      --title:#f0f6fc;
      --link:#58a6ff;
      --codebg:#0b0f14;
      --badgebg:#21262d;
    }

    body{
      margin:0;
      padding:40px 20px;
      font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;
      background:var(--bg);
      color:var(--text);
      line-height:1.6;
    }

    .container{
      max-width:900px;
      margin:0 auto;
    }

    h1{
      font-size:2.2em;
      color:var(--title);
      border-bottom:1px solid var(--border);
      padding-bottom:15px;
      margin:0 0 18px 0;
    }

    h2{
      margin-top:40px;
      margin-bottom:10px;
      color:var(--title);
      border-bottom:1px solid var(--border2);
      padding-bottom:6px;
    }

    h3{
      margin-top:18px;
      margin-bottom:8px;
      color:var(--muted);
      font-weight:600;
      font-size:1em;
      letter-spacing:0.2px;
      text-transform:uppercase;
    }

    p{ margin:0 0 14px 0; }

    ul{
      padding-left:20px;
      margin:10px 0 14px 0;
    }

    li{ margin-bottom:6px; }

    .card{
      background:var(--panel);
      border:1px solid var(--border);
      border-radius:6px;
      padding:18px;
      margin-top:14px;
    }

    .badges{
      display:flex;
      flex-wrap:wrap;
      gap:8px;
      margin:10px 0 18px 0;
    }

    .badge{
      display:inline-flex;
      align-items:center;
      gap:8px;
      padding:6px 10px;
      border-radius:999px;
      background:var(--badgebg);
      border:1px solid var(--border);
      color:var(--text);
      font-size:0.85em;
      line-height:1;
      white-space:nowrap;
    }

    .dot{
      width:8px;
      height:8px;
      border-radius:50%;
      background:var(--muted);
      display:inline-block;
    }

    a{ color:var(--link); text-decoration:none; }
    a:hover{ text-decoration:underline; }

    /* GitHub-like code blocks */
    pre{
      background:var(--codebg);
      border:1px solid var(--border);
      border-radius:6px;
      padding:14px 14px;
      overflow:auto;
      margin:12px 0 14px 0;
    }

    code{
      font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace;
      font-size:0.92em;
      color:var(--text);
    }

    .inline-code{
      background:var(--codebg);
      border:1px solid var(--border);
      border-radius:6px;
      padding:2px 6px;
    }

    .footer{
      margin-top:50px;
      padding-top:20px;
      border-top:1px solid var(--border);
      color:var(--muted);
      font-size:0.92em;
    }

    strong{ color:var(--title); }
  </style>
</head>

<body>
  <div class="container">
    <h1>Resource Project</h1>

    <div class="badges">
      <span class="badge"><span class="dot"></span> Status: In Development</span>
      <span class="badge"><span class="dot"></span> Frontend: React + Vite</span>
      <span class="badge"><span class="dot"></span> Backend: Supabase (Postgres)</span>
      <span class="badge"><span class="dot"></span> Hosting: Vercel</span>
    </div>

    <p>
      A structured, curated recovery resource management system designed to improve clarity, accessibility,
      and organization within outpatient treatment programs and recovery communities.
    </p>

    <h2>Overview</h2>
    <div class="card">
      <p>
        Resource Project is a centralized resource guide built to standardize how recovery resources are organized,
        maintained, and accessed.
      </p>

      <ul>
        <li>Curated database of vetted recovery resources</li>
        <li>Frontend interface for resource browsing</li>
        <li>Backend administrative management</li>
        <li>Structured categorization and filtering</li>
        <li>Scalable architecture for future expansion</li>
      </ul>

      <p>This project is currently focused on building a strong, reliable Core Resource Guide.</p>
    </div>

    <h2>Problem It Addresses</h2>
    <div class="card">
      <p>Many outpatient programs rely on:</p>
      <ul>
        <li>Static PDF lists</li>
        <li>Inconsistent formatting</li>
        <li>Poor categorization</li>
        <li>Manual updates</li>
        <li>Limited administrative control</li>
      </ul>

      <p>This can lead to confusion, inefficiency, and difficulty keeping information accurate.</p>

      <p>Resource Project introduces:</p>
      <ul>
        <li>Structured data management</li>
        <li>Standardized categories</li>
        <li>Administrative oversight</li>
        <li>Controlled update workflows</li>
        <li>Clear system organization</li>
      </ul>
    </div>

    <h2>Current Scope – Phase 1</h2>
    <div class="card">
      <ul>
        <li>Resource database (Supabase)</li>
        <li>Category and subcategory structure</li>
        <li>Search and filtering capabilities</li>
        <li>Frontend browsing interface</li>
        <li>Administrative management tools</li>
      </ul>

      <p>The focus is on building a clean, dependable foundation before adding additional system layers.</p>
    </div>

    <h2>Architecture</h2>
    <div class="card">
      <h3>Frontend</h3>
      <ul>
        <li>React</li>
        <li>Vite</li>
        <li>Hosted via Vercel</li>
      </ul>

      <h3>Backend</h3>
      <ul>
        <li>Supabase (PostgreSQL)</li>
        <li>Relational schema</li>
        <li>Role-based security policies</li>
      </ul>

      <h3>Core Data Entities</h3>
      <ul>
        <li>Resources</li>
        <li>Categories</li>
        <li>Subcategories</li>
        <li>Status (active / inactive)</li>
        <li>Administrative metadata</li>
      </ul>

      <h3>High-Level Flow</h3>
      <pre><code>Client UI (React/Vite)  →  API Layer (Supabase)  →  Postgres (Resources/Categories)
        ↑                         ↓
 Admin UI / Management  ←  Auth + RLS Policies</code></pre>

      <p>
        Example environment variables (typical):
      </p>
      <pre><code>VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key</code></pre>

      <p>
        Notes: values are injected at build time by Vite. Keep secrets out of the client.
      </p>
    </div>

    <h2>Design Principles</h2>
    <div class="card">
      <ul>
        <li>Clear categorization</li>
        <li>Maintainability</li>
        <li>Data integrity</li>
        <li>Long-term scalability</li>
      </ul>

      <p>
        The objective is to build a system that improves operational clarity and reduces ambiguity
        in how recovery resources are managed.
      </p>
    </div>

    <h2>Current Status</h2>
    <div class="card">
      <ul>
        <li>Core database schema implemented</li>
        <li>Initial resource entries seeded</li>
        <li>UI iteration in progress</li>
        <li>Category refinement ongoing</li>
      </ul>

      <p>
        This repository will continue evolving as the system matures.
      </p>
    </div>

    <div class="footer">
      <strong>Author:</strong> Chris Maricle<br>
      GitHub: <span class="inline-code">mariclec35</span><br>
      St. Paul, MN<br><br>
      Focused on building structured systems that improve operational clarity in both technical and recovery environments.
    </div>
  </div>
</body>
</html>