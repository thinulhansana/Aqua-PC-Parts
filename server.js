import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = "0.0.0.0";

// MOCKED — in-memory KV store replacing Cloudflare AQUA_CATALOG_KV
const kvStore = new Map();
const CATALOG_KEY = "catalog_live_v1";
const PASSCODE_KEY = "admin_passcode_v1";
const DEFAULT_PASSCODE = process.env.ADMIN_PASSCODE || "aqua2026";

app.use(express.json({ limit: "10mb" }));

// CORS & cache headers for /api/catalog (matches original functions/api/catalog.js)
app.use("/api/catalog", (req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Admin-Passcode");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  next();
});

app.get("/api/catalog", (_req, res) => {
  try {
    const raw = kvStore.get(CATALOG_KEY);
    if (!raw) {
      return res.json({
        ok: true,
        kvAvailable: true,
        hasCloudData: false,
        catalog: null,
      });
    }

    const parsed = JSON.parse(raw);
    return res.json({
      ok: true,
      kvAvailable: true,
      hasCloudData: true,
      updatedAt: parsed.updatedAt || null,
      catalog: parsed.catalog || parsed,
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: err && err.message ? err.message : "Failed to read live catalog",
    });
  }
});

app.post("/api/catalog", (req, res) => {
  try {
    const body = req.body || {};
    const action = body.action || "save";
    const providedPass = String(
      req.header("X-Admin-Passcode") || body.passcode || ""
    );

    const expectedPass = kvStore.get(PASSCODE_KEY) || DEFAULT_PASSCODE;

    if (providedPass !== expectedPass) {
      return res.status(401).json({ ok: false, error: "Invalid admin passcode." });
    }

    if (action === "verify") {
      return res.json({
        ok: true,
        kvAvailable: true,
        message: "Passcode verified.",
      });
    }

    if (action === "change-passcode") {
      const nextPass = String(body.newPasscode || "").trim();
      if (nextPass.length < 4) {
        return res.status(400).json({
          ok: false,
          error: "New passcode must be at least 4 characters.",
        });
      }
      kvStore.set(PASSCODE_KEY, nextPass);
      return res.json({ ok: true, message: "Admin passcode updated." });
    }

    if (action === "reset") {
      kvStore.delete(CATALOG_KEY);
      return res.json({
        ok: true,
        updatedAt: new Date().toISOString(),
        message: "Catalog reset to factory default.",
      });
    }

    if (!body.catalog || typeof body.catalog !== "object") {
      return res.status(400).json({ ok: false, error: "Missing catalog payload." });
    }

    const updatedAt = new Date().toISOString();
    const record = {
      updatedAt,
      catalog: body.catalog,
    };

    kvStore.set(CATALOG_KEY, JSON.stringify(record));
    return res.json({
      ok: true,
      updatedAt,
      message: "Catalog saved in server memory.",
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: err && err.message ? err.message : "Failed to save catalog",
    });
  }
});

// Prevent exposing server/config files as static assets
const BLOCKED_PATHS = new Set([
  "/server.js",
  "/package.json",
  "/package-lock.json",
  "/metadata.json",
  "/wrangler.toml",
  "/wrangler.jsonc",
  "/.env",
  "/.env.example",
  "/.cfignore",
  "/firebase-applet-config.json",
  "/firebase-blueprint.json",
  "/firestore.rules",
  "/security_spec.md",
  "/eslint.config.mjs",
]);

app.use((req, res, next) => {
  const normalized = path.posix.normalize(req.path);
  if (
    BLOCKED_PATHS.has(normalized) ||
    normalized.startsWith("/functions/") ||
    normalized === "/functions" ||
    normalized.startsWith("/src/") ||
    normalized === "/src" ||
    normalized.startsWith("/node_modules/")
  ) {
    return res.status(404).send("Not found");
  }
  next();
});

app.get("/sw.js", (_req, res) => {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Service-Worker-Allowed", "/");
  res.sendFile(path.join(__dirname, "sw.js"));
});

app.get("/manifest.json", (_req, res) => {
  res.setHeader("Content-Type", "application/manifest+json; charset=utf-8");
  res.sendFile(path.join(__dirname, "manifest.json"));
});

app.use(express.static(__dirname, { extensions: ["html"] }));

app.listen(PORT, HOST, () => {
  console.log(`Aqua PC Parts server running at http://${HOST}:${PORT}`);
});
