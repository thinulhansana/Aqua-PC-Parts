import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = "0.0.0.0";

// In-memory KV store for /api/catalog live overrides
const kvStore = new Map();
const CATALOG_KEY = "catalog_live_v1";
const PASSCODE_KEY = "admin_passcode_v1";
const DEFAULT_PASSCODE = process.env.ADMIN_PASSCODE || "aqua2026";

// Free-tier Gemini models allowed without paid billing key
const ALLOWED_CHAT_MODELS = new Set([
  "gemini-4-hydrogen",
  "gemini-3.1-flash-lite",
]);

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || "";
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

function extractInteractionText(interaction) {
  if (!interaction) return "";
  if (typeof interaction.text === "string" && interaction.text.trim()) {
    return interaction.text.trim();
  }
  const outputs = Array.isArray(interaction.outputs) ? interaction.outputs : [];
  for (let i = outputs.length - 1; i >= 0; i--) {
    const out = outputs[i];
    if (out && out.type === "text" && typeof out.text === "string" && out.text.trim()) {
      return out.text.trim();
    }
    if (out && Array.isArray(out.content)) {
      const txt = out.content
        .filter((c) => c && c.type === "text" && typeof c.text === "string")
        .map((c) => c.text)
        .join("\n")
        .trim();
      if (txt) return txt;
    }
  }
  const steps = Array.isArray(interaction.steps) ? interaction.steps : [];
  for (let i = steps.length - 1; i >= 0; i--) {
    const step = steps[i];
    if (step && step.type === "model_output" && Array.isArray(step.content)) {
      const txt = step.content
        .filter((c) => c && c.type === "text" && typeof c.text === "string")
        .map((c) => c.text)
        .join("\n")
        .trim();
      if (txt) return txt;
    }
  }
  return "";
}

app.use(express.json({ limit: "15mb" }));

// CORS & cache headers for /api/catalog
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

// ───────── Google Maps Platform Public Browser Config ─────────
app.get("/api/maps/config", (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const apiKey =
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.VITE_GOOGLE_MAPS_API_KEY ||
    process.env.MAPS_API_KEY ||
    "";
  res.json({
    ok: true,
    configured: Boolean(apiKey),
    apiKey,
    mapId: "DEMO_MAP_ID",
    region: "LK",
    language: "en",
  });
});

// ───────── Auth & reCAPTCHA Enterprise Public Config ─────────
app.get("/api/auth-config", (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const recaptchaSiteKey = String(
    process.env.RECAPTCHA_ENTERPRISE_SITE_KEY ||
      process.env.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY ||
      process.env.RECAPTCHA_SITE_KEY ||
      ""
  ).trim();
  res.json({
    ok: true,
    recaptchaEnabled: Boolean(recaptchaSiteKey),
    recaptchaSiteKey,
  });
});


// ───────── Server-Side Gemini Multi-Turn Chatbot (Rose AI) ─────────
app.post("/api/gemini/chat", async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  try {
    const body = req.body || {};
    const message = String(body.message || "").trim().slice(0, 2000);
    if (!message) {
      return res.status(400).json({ ok: false, error: "Message is required." });
    }

    const requestedModel = String(body.model || "gemini-4-hydrogen").trim();
    const model = ALLOWED_CHAT_MODELS.has(requestedModel)
      ? requestedModel
      : "gemini-4-hydrogen";

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        ok: false,
        code: "GEMINI_UNCONFIGURED",
        error: "Gemini API key is not configured on the server.",
      });
    }

    const catalogContext = Array.isArray(body.catalogContext)
      ? body.catalogContext.slice(0, 12)
      : [];
    const catalogLines = catalogContext
      .map((item) => {
        const name = String(item.name || "").slice(0, 120);
        const sku = String(item.sku || "").slice(0, 40);
        const price =
          typeof item.price === "number" && Number.isFinite(item.price)
            ? `Rs. ${Math.round(item.price).toLocaleString("en-LK")}`
            : "Call for Price";
        const cond = item.cond === "new" ? "Brand New Sealed" : "Grade-A Used (06-Month Warranty)";
        const stock = item.inStock ? "In Stock" : "Out of Stock / Check Desk";
        return `- ${name} [SKU: ${sku}] | ${price} | ${cond} | ${stock}`;
      })
      .join("\n");

    const systemInstruction = [
      "You are Rose AI, the expert PC hardware engineer and sales advisor at Aqua PC Parts (Aqua PC Solutions) in Embilipitiya, Sri Lanka.",
      "Store facts: Hotline & WhatsApp +94 78 819 4535. Workshop hours Mon-Fri 8:00 AM-7:00 PM, Sat 10:00 AM-5:00 PM. All Grade-A used GPUs, CPUs, and motherboards undergo 24-hour FurMark/stress testing and carry a 06-Month Written Testing Warranty. Brand new peripherals carry official store/agent warranty. Island-wide ESD-safe courier delivery across Sri Lanka.",
      "Response rules: Be concise, practical, accurate about PC compatibility (CPU sockets, DDR4 vs DDR5, PSU wattage, bottlenecks), quote prices in LKR (Rs.), mention relevant SKU codes when available in the live catalog snippet below, and never invent fake stock or prices not shown in the snippet.",
      catalogLines
        ? `\nRelevant Live Catalog Matches:\n${catalogLines}`
        : "\nNo direct catalog matches were passed for this message; advise generally and suggest searching by part name/SKU or confirming stock via WhatsApp +94 78 819 4535.",
    ].join("\n");

    const rawHistory = Array.isArray(body.history) ? body.history.slice(-10) : [];
    const prevInteractionId =
      typeof body.previousInteractionId === "string" && body.previousInteractionId.trim()
        ? body.previousInteractionId.trim()
        : undefined;

    let replyText = "";
    let interactionId = null;

    // Prefer Interactions API for stateful multi-turn; gracefully fall back to generateContent
    try {
      const interactionPayload = {
        model,
        system_instruction: systemInstruction,
        input: message,
      };
      if (prevInteractionId) {
        interactionPayload.previous_interaction_id = prevInteractionId;
      } else if (rawHistory.length > 0) {
        const transcript = rawHistory
          .map((turn) => {
            const roleLabel = turn.role === "model" ? "Rose AI" : "Customer";
            return `${roleLabel}: ${String(turn.text || "").slice(0, 1000)}`;
          })
          .join("\n");
        interactionPayload.input = `Previous conversation:\n${transcript}\n\nCustomer: ${message}`;
      }

      const interaction = await ai.interactions.create(interactionPayload);
      replyText = extractInteractionText(interaction);
      interactionId = interaction && interaction.id ? interaction.id : null;
    } catch (_interactionErr) {
      const contents = [];
      for (const turn of rawHistory) {
        const text = String(turn.text || "").trim().slice(0, 1500);
        if (!text) continue;
        contents.push({
          role: turn.role === "model" ? "model" : "user",
          parts: [{ text }],
        });
      }
      contents.push({ role: "user", parts: [{ text: message }] });

      const response = await ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction,
        },
      });
      replyText = (response && response.text ? response.text : "").trim();
    }

    if (!replyText) {
      return res.status(502).json({
        ok: false,
        error: "Model returned an empty response.",
      });
    }

    return res.json({
      ok: true,
      model,
      reply: replyText,
      interactionId,
    });
  } catch (err) {
    console.error("[/api/gemini/chat] error:", err && err.message ? err.message : err);
    return res.status(500).json({
      ok: false,
      error: "Rose AI could not reach Gemini right now. Please try again shortly.",
    });
  }
});

// ───────── Server-Side Gemini Motion Director (Image-to-Video & Text-to-Video) ─────────
app.post("/api/gemini/video-director", async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  try {
    const body = req.body || {};
    const mode = body.mode === "image" ? "image" : "text";
    const prompt = String(body.prompt || "").trim().slice(0, 1200);
    const aspectRatio = body.aspectRatio === "9:16" ? "9:16" : "16:9";
    const style = String(body.style || "cyber-studio").slice(0, 60);

    if (!prompt && mode === "text") {
      return res.status(400).json({ ok: false, error: "Please enter a video prompt." });
    }

    const ai = getGeminiClient();
    const fallbackPlan = {
      title: prompt ? prompt.slice(0, 48) : "Aqua PC Hardware Showcase",
      tagline: "EMBILIPITIYA HARDWARE LAB · BENCH VERIFIED",
      accentHex: "#00f2fe",
      secondaryHex: "#ff6b00",
      backdropHex: "#071124",
      scenes: [
        {
          heading: mode === "image" ? "HARDWARE REVEAL" : "CUSTOM RIG SHOWCASE",
          caption: prompt || "Precision bench-tested PC hardware engineered in Sri Lanka.",
          badge: "24H LAB VERIFIED",
          motion: "zoom-in",
          sweepDir: "ltr",
        },
        {
          heading: "THERMAL & PERFORMANCE",
          caption: "High-airflow cooling, clean power delivery, and verified stability under load.",
          badge: "06-MONTH WARRANTY",
          motion: "pan-right",
          sweepDir: "rtl",
        },
        {
          heading: "AQUA PC PARTS",
          caption: "Order in LKR · Embilipitiya Showroom & Island-Wide ESD-Safe Courier.",
          badge: "+94 78 819 4535",
          motion: "zoom-out",
          sweepDir: "radial",
        },
      ],
    };

    if (!ai) {
      return res.json({
        ok: true,
        model: "local-fallback",
        aspectRatio,
        plan: fallbackPlan,
      });
    }

    const parts = [];
    if (mode === "image" && typeof body.imageBase64 === "string" && body.imageBase64.length > 20) {
      const allowedMimes = new Set(["image/jpeg", "image/png", "image/webp"]);
      const mimeType = allowedMimes.has(body.mimeType) ? body.mimeType : "image/jpeg";
      const cleanBase64 = body.imageBase64.replace(/^data:[^;]+;base64,/, "");
      parts.push({
        inlineData: {
          mimeType,
          data: cleanBase64,
        },
      });
    }

    const directorPrompt = [
      `You are a cinematic motion-graphics video director for Aqua PC Parts (Sri Lanka's PC hardware store).`,
      `Mode: ${mode === "image" ? "Animate uploaded hardware photo into a 9-second showcase video" : "Generate a 9-second text-to-video hardware promo reel"}.`,
      `Aspect Ratio: ${aspectRatio}. Visual Style: ${style}.`,
      `User Prompt: ${prompt || "Showcase this PC hardware with smooth studio camera motion and glowing tech callouts."}`,
      `Return ONLY valid JSON matching this exact schema (no markdown fences):`,
      `{"title":"short title <= 42 chars","tagline":"uppercase subtitle <= 48 chars","accentHex":"#00f2fe","secondaryHex":"#ff6b00","backdropHex":"#071124","scenes":[{"heading":"<= 26 chars","caption":"<= 95 chars","badge":"<= 22 chars","motion":"zoom-in|pan-right|pan-left|zoom-out","sweepDir":"ltr|rtl|radial"}]}`,
      `Provide exactly 3 scenes. Keep hex colors valid 6-digit hex strings with high contrast on dark studio backdrops.`,
    ].join("\n");

    parts.push({ text: directorPrompt });

    const response = await ai.models.generateContent({
      model: "gemini-4-hydrogen",
      contents: [{ role: "user", parts }],
      config: {
        responseMimeType: "application/json",
      },
    });

    const rawText = (response && response.text ? response.text : "").trim();
    let plan = fallbackPlan;
    try {
      const cleaned = rawText.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
      const parsed = JSON.parse(cleaned);
      if (parsed && Array.isArray(parsed.scenes) && parsed.scenes.length >= 3) {
        const hexOk = (v, fb) => (typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v) ? v : fb);
        plan = {
          title: String(parsed.title || fallbackPlan.title).slice(0, 60),
          tagline: String(parsed.tagline || fallbackPlan.tagline).slice(0, 70),
          accentHex: hexOk(parsed.accentHex, fallbackPlan.accentHex),
          secondaryHex: hexOk(parsed.secondaryHex, fallbackPlan.secondaryHex),
          backdropHex: hexOk(parsed.backdropHex, fallbackPlan.backdropHex),
          scenes: parsed.scenes.slice(0, 3).map((s, idx) => ({
            heading: String(s.heading || fallbackPlan.scenes[idx].heading).slice(0, 36),
            caption: String(s.caption || fallbackPlan.scenes[idx].caption).slice(0, 120),
            badge: String(s.badge || fallbackPlan.scenes[idx].badge).slice(0, 28),
            motion: ["zoom-in", "pan-right", "pan-left", "zoom-out"].includes(s.motion)
              ? s.motion
              : fallbackPlan.scenes[idx].motion,
            sweepDir: ["ltr", "rtl", "radial"].includes(s.sweepDir)
              ? s.sweepDir
              : fallbackPlan.scenes[idx].sweepDir,
          })),
        };
      }
    } catch (_parseErr) {
      plan = fallbackPlan;
    }

    return res.json({
      ok: true,
      model: "gemini-4-hydrogen",
      aspectRatio,
      plan,
    });
  } catch (err) {
    console.error("[/api/gemini/video-director] error:", err && err.message ? err.message : err);
    return res.status(500).json({
      ok: false,
      error: "Could not direct video storyboard right now. Please try again.",
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
    normalized.startsWith("/.gmp_cache/") ||
    normalized === "/.gmp_cache" ||
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
