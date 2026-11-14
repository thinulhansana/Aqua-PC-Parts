// Cloudflare Pages Function: /api/catalog
// Provides live cloud persistence for Aqua PC Parts Admin Panel using Cloudflare KV (AQUA_CATALOG_KV)

const CATALOG_KEY = "catalog_live_v1";
const PASSCODE_KEY = "admin_passcode_v1";
const DEFAULT_PASSCODE = "aqua2026";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Admin-Passcode",
  "Cache-Control": "no-store, no-cache, must-revalidate",
  "Content-Type": "application/json; charset=utf-8",
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: CORS_HEADERS,
  });
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function onRequestGet(context) {
  const { env } = context;
  try {
    if (!env || !env.AQUA_CATALOG_KV) {
      return jsonResponse({
        ok: true,
        kvAvailable: false,
        hasCloudData: false,
        catalog: null,
      });
    }

    const raw = await env.AQUA_CATALOG_KV.get(CATALOG_KEY);
    if (!raw) {
      return jsonResponse({
        ok: true,
        kvAvailable: true,
        hasCloudData: false,
        catalog: null,
      });
    }

    const parsed = JSON.parse(raw);
    return jsonResponse({
      ok: true,
      kvAvailable: true,
      hasCloudData: true,
      updatedAt: parsed.updatedAt || null,
      catalog: parsed.catalog || parsed,
    });
  } catch (err) {
    return jsonResponse(
      { ok: false, error: err && err.message ? err.message : "Failed to read live catalog" },
      500
    );
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const body = await request.json();
    const action = (body && body.action) || "save";
    const providedPass =
      request.headers.get("X-Admin-Passcode") ||
      (body && body.passcode) ||
      "";

    let expectedPass = DEFAULT_PASSCODE;
    if (env && env.AQUA_CATALOG_KV) {
      const customPass = await env.AQUA_CATALOG_KV.get(PASSCODE_KEY);
      if (customPass) expectedPass = customPass;
    }

    if (providedPass !== expectedPass) {
      return jsonResponse({ ok: false, error: "Invalid admin passcode." }, 401);
    }

    if (action === "verify") {
      return jsonResponse({
        ok: true,
        kvAvailable: Boolean(env && env.AQUA_CATALOG_KV),
        message: "Passcode verified.",
      });
    }

    if (!env || !env.AQUA_CATALOG_KV) {
      return jsonResponse(
        { ok: false, error: "Cloudflare KV binding AQUA_CATALOG_KV is not configured." },
        503
      );
    }

    if (action === "change-passcode") {
      const nextPass = String((body && body.newPasscode) || "").trim();
      if (nextPass.length < 4) {
        return jsonResponse(
          { ok: false, error: "New passcode must be at least 4 characters." },
          400
        );
      }
      await env.AQUA_CATALOG_KV.put(PASSCODE_KEY, nextPass);
      return jsonResponse({ ok: true, message: "Admin passcode updated in cloud." });
    }

    if (action === "reset") {
      await env.AQUA_CATALOG_KV.delete(CATALOG_KEY);
      return jsonResponse({
        ok: true,
        updatedAt: new Date().toISOString(),
        message: "Cloud catalog reset to factory default.",
      });
    }

    if (!body || !body.catalog || typeof body.catalog !== "object") {
      return jsonResponse({ ok: false, error: "Missing catalog payload." }, 400);
    }

    const updatedAt = new Date().toISOString();
    const record = {
      updatedAt,
      catalog: body.catalog,
    };

    await env.AQUA_CATALOG_KV.put(CATALOG_KEY, JSON.stringify(record));
    return jsonResponse({
      ok: true,
      updatedAt,
      message: "Catalog published live to Cloudflare KV.",
    });
  } catch (err) {
    return jsonResponse(
      { ok: false, error: err && err.message ? err.message : "Failed to save catalog" },
      500
    );
  }
}

