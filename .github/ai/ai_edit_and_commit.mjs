import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const API_KEY = process.env.OPENAI_API_KEY;
const INSTRUCTION = process.env.INSTRUCTION;
const MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";

if (!API_KEY) throw new Error("Missing OPENAI_API_KEY");
if (!INSTRUCTION) throw new Error("Missing INSTRUCTION");

const ALLOWED_TOP_LEVEL = new Set([
  "src",
  "api",
]);

const ALLOWED_FILES = new Set([
  "README.md",
  "server.ts",
  "supabase_schema.sql",
  "package.json",
  "vite.config.ts",
  "vercel.json",
  "tsconfig.json",
  "index.html",
]);

const BLOCKED_FILES = new Set([
  "package-lock.json",
  ".env",
  ".env.example",
]);

const EXCLUDED_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  ".vercel",
]);

function isTextFile(p) {
  return /\.(md|txt|json|js|jsx|ts|tsx|html|css|scss|yml|yaml|sql)$/i.test(p);
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(process.cwd(), full);

    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name)) continue;

      const top = rel.split(path.sep)[0];
      if (rel === entry.name && !ALLOWED_TOP_LEVEL.has(entry.name)) continue;

      walk(full, out);
    } else {
      if (BLOCKED_FILES.has(rel)) continue;

      const top = rel.split(path.sep)[0];
      if (!ALLOWED_TOP_LEVEL.has(top) && !ALLOWED_FILES.has(rel)) continue;
      if (!isTextFile(rel)) continue;

      out.push(rel);
    }
  }
  return out;
}

const files = walk(process.cwd()).slice(0, 300);

const repoText = files.map((rel) => {
  const content = fs.readFileSync(rel, "utf8");
  const clipped = content.length > 10000 ? content.slice(0, 10000) + "\n/* ...clipped... */" : content;
  return `--- FILE: ${rel} ---\n${clipped}\n`;
}).join("\n");

const prompt = `\nYou are editing a TypeScript Vite + Supabase project.\n\nTask:\n${INSTRUCTION}\n\nRules:\n- Make minimal, correct changes.\n- Do NOT modify environment files.\n- Do NOT modify package-lock.json.\n- Preserve project structure.\n- Output ONLY a JSON array of edit operations.\n\nEdit operation formats:\n1) {"type":"write","path":"relative/path","content":"FULL FILE CONTENT"}\n2) {"type":"delete","path":"relative/path"}\n`.trim();

const res = await fetch("https://api.openai.com/v1/chat/completions", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: `You are editing a TypeScript Vite + Supabase project.\n\nRules:\n- Make minimal, correct changes.\n- Do NOT modify environment files.\n- Do NOT modify package-lock.json.\n- Preserve project structure.\n- Output ONLY a JSON array of edit operations.\n\nEdit operation formats:\n1) {"type":"write","path":"relative/path","content":"FULL FILE CONTENT"}\n2) {"type":"delete","path":"relative/path"}`,
      },
      {
        role: "user",
        content: `Task:\n${INSTRUCTION}\n\nRepository snapshot:\n${repoText}`,
      },
    ],
    temperature: 0,
  }),
});

if (!res.ok) {
  const text = await res.text();
  throw new Error(`OpenAI API error: ${res.status}\n${text}`);
}

const data = await res.json();

const outputText = data.choices?.[0]?.message?.content || "";

let ops;
try {
  ops = JSON.parse(outputText);
} catch {
  throw new Error("Model did not return valid JSON edit operations.\n\n" + outputText.slice(0, 2000));
}

let changed = false;

for (const op of ops) {
  if (op.type === "write") {
    const fullPath = path.join(process.cwd(), op.path);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, op.content, "utf8");
    changed = true;
  } else if (op.type === "delete") {
    const fullPath = path.join(process.cwd(), op.path);
    if (fs.existsSync(fullPath)) {
      fs.rmSync(fullPath, { force: true });
      changed = true;
    }
  }
}

if (!changed) {
  console.log("No changes produced by AI.");
  process.exit(0);
}

execSync('git config user.name "resource-project-bot"', { stdio: "inherit" });
execSync('git config user.email "bot@users.noreply.github.com"', { stdio: "inherit" });
execSync("git add -A", { stdio: "inherit" });
execSync(`git commit -m "AI: ${INSTRUCTION.slice(0, 60)}"`, { stdio: "inherit" });