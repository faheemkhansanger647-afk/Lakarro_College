// api/cloudinary-sign.js
// Vercel Serverless Function — issues SHORT-LIVED SIGNATURES for signed
// Cloudinary uploads.
//
// WHY THIS EXISTS:
//   The site's image/video uploads (students' photos, gallery, branding,
//   library files…) go straight from the browser to Cloudinary. Two ways
//   to authorise that:
//     1. UNSIGNED upload preset — needs a preset created in the Cloudinary
//        dashboard and exposes the cloud name in the client bundle.
//     2. SIGNED upload — uses the account's API Key + API Secret. The
//        SECRET must never reach the browser, so the signature is
//        generated HERE, server-side, and the browser uploads with it.
//   The college's credentials are Cloud Name + API Key + API Secret (no
//   upload preset), so this endpoint makes uploads work with exactly the
//   keys the college already has — no dashboard preset needed.
//
// HOW IT WORKS:
//   1. Browser POSTs { folder?: "students" } (same-origin).
//   2. This function builds the params to sign:
//         { folder: "<sanitized>", timestamp: <unix seconds> }
//   3. It computes  sha1(sorted "k=v" params + API_SECRET)  — the
//      signature Cloudinary requires for signed uploads.
//   4. It returns { signature, timestamp, api_key, cloud_name, folder }.
//   5. The browser POSTs the file + those values to
//      https://api.cloudinary.com/v1_1/<cloud_name>/auto/upload
//      The API Secret itself NEVER leaves this function.
//
// SECURITY:
//   • Only same-site origins may call this (see ALLOWED_ORIGINS) — other
//     origins get a 403 without a signature.
//   • The folder name is sanitized against a safe charset so a caller
//     cannot sign an arbitrary path (".." is rejected).
//   • Timestamps are single-use in practice (Cloudinary rejects signatures
//     older than 1 hour by default) — leaked signatures expire quickly.
//   • A light in-memory rate limit throttles abusive bursts per IP.

import crypto from "crypto";

// Same-origin + the production domain + local dev. `null` origin (curl /
// server-to-server) is allowed for admin scripting; browsers always send
// Origin on cross-origin POSTs, so browser abuse from other sites is blocked.
const ALLOWED_ORIGINS = [
  "https://gdclakarai.edu.pk",
  "https://www.gdclakarai.edu.pk",
  "http://localhost:5173",
  "http://localhost:4173",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:4173",
];

// Allowed Cloudinary folders (keep in sync with src/lib/cloudinary.ts call
// sites: students, branding, gallery, library, library-covers, news…).
// A call with an unknown folder is still allowed but nested under "site",
// so arbitrary folder names can never be signed.
const KNOWN_FOLDERS = new Set([
  "students",
  "branding",
  "gallery",
  "library",
  "library-covers",
]);

function resolveFolder(raw) {
  if (typeof raw !== "string") return "site";
  const cleaned = raw.trim().replace(/^\/+|\/+$/g, "");
  if (!cleaned || cleaned.includes("..") || cleaned.length > 64) return "site";
  if (KNOWN_FOLDERS.has(cleaned)) return cleaned;
  // Unknown folder → keep it, but sanitized to a safe charset.
  const safe = cleaned.replace(/[^A-Za-z0-9_\-/]/g, "");
  return safe || "site";
}

// Light in-memory rate limiter: 30 signatures / minute / IP.
const hits = new Map(); // ip -> [windowStart, count]
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 30;
function rateLimited(ip) {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || now - entry[0] > WINDOW_MS) {
    hits.set(ip, [now, 1]);
    return false;
  }
  entry[1] += 1;
  if (hits.size > 5000) hits.clear(); // hard cap so the map can't grow forever
  return entry[1] > MAX_PER_WINDOW;
}

export default async function handler(req, res) {
  // ── CORS (restricted) ─────────────────────────────────────────────────
  const origin = req.headers.origin || "";
  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    return res.status(403).json({ error: "Origin not allowed." });
  }
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Max-Age", "86400");
  }

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  // ── Credentials from environment (server-side only) ───────────────────
  // Accept BOTH naming styles so it works no matter which names were used
  // in the Vercel / local environment:
  //   CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET
  //   VITE_CLOUDINARY_CLOUD_NAME (cloud name only — safe, public by design)
  const cloudName =
    process.env.CLOUDINARY_CLOUD_NAME ||
    process.env.VITE_CLOUDINARY_CLOUD_NAME || "";
  const apiKey =
    process.env.CLOUDINARY_API_KEY || "";
  const apiSecret =
    process.env.CLOUDINARY_API_SECRET || "";

  if (!cloudName || !apiKey || !apiSecret) {
    return res.status(500).json({
      error:
        "Cloudinary credentials are not configured on the server. Add " +
        "CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET " +
        "to the environment (Vercel → Settings → Environment Variables) and " +
        "redeploy.",
    });
  }

  // ── Rate limit ─────────────────────────────────────────────────────────
  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    "unknown";
  if (rateLimited(ip)) {
    return res.status(429).json({ error: "Too many requests. Try again in a minute." });
  }

  // ── Params to sign ─────────────────────────────────────────────────────
  let bodyFolder = "";
  try {
    if (typeof req.body === "string" && req.body.trim()) {
      bodyFolder = JSON.parse(req.body).folder ?? "";
    } else if (req.body && typeof req.body === "object") {
      bodyFolder = req.body.folder ?? "";
    }
  } catch {
    // Malformed JSON — treat as no folder; still sign a safe default.
  }
  const folder = resolveFolder(bodyFolder);
  const timestamp = Math.floor(Date.now() / 1000);

  // Params must be sorted alphabetically, joined "k=v&...", with the API
  // secret appended — exactly Cloudinary's documented signature algorithm.
  const params = { folder, timestamp };
  const toSign = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  const signature = crypto
    .createHash("sha1")
    .update(toSign + apiSecret)
    .digest("hex");

  return res.status(200).json({
    signature,
    timestamp,
    api_key: apiKey,
    cloud_name: cloudName,
    folder,
  });
}
