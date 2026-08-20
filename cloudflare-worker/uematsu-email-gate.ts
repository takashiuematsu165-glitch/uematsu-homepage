/**
 * TypeScript reference for the Cloudflare Dashboard JavaScript implementation.
 * Keep all Env values as Cloudflare Secrets, never in the GitHub Pages bundle.
 */
interface Env {
  RECAPTCHA_SITE_KEY: string;
  RECAPTCHA_SECRET: string;
  CONTACT_EMAIL: string;
  GOOGLE_CLOUD_PROJECT_ID: string;
  GOOGLE_CLOUD_API_KEY: string;
}

const ALLOWED_ORIGIN = "https://takashiuematsu165-glitch.github.io";
const ALLOWED_HOSTNAME = "takashiuematsu165-glitch.github.io";
const RECAPTCHA_ACTION = "email_reveal";
const MINIMUM_RISK_SCORE = 0.5;
const GRANT_LIFETIME_SECONDS = 300;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

function base64UrlEncode(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - normalized.length % 4) % 4), "=");
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}

async function signingKey(secret: string) {
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

async function issueGrant(env: Env) {
  const payload = base64UrlEncode(encoder.encode(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + GRANT_LIFETIME_SECONDS })));
  const signature = await crypto.subtle.sign("HMAC", await signingKey(env.RECAPTCHA_SECRET), encoder.encode(payload));
  return `${payload}.${base64UrlEncode(new Uint8Array(signature))}`;
}

async function hasValidGrant(request: Request, env: Env) {
  const grant = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!grant) return false;
  const [payload, signature] = grant.split(".");
  if (!payload || !signature) return false;
  try {
    const validSignature = await crypto.subtle.verify("HMAC", await signingKey(env.RECAPTCHA_SECRET), base64UrlDecode(signature), encoder.encode(payload));
    if (!validSignature) return false;
    const parsed = JSON.parse(decoder.decode(base64UrlDecode(payload))) as { exp?: number };
    return typeof parsed.exp === "number" && parsed.exp > Math.floor(Date.now() / 1000);
  } catch { return false; }
}

function corsHeaders(request: Request) {
  const origin = request.headers.get("Origin");
  return origin === ALLOWED_ORIGIN
    ? { "Access-Control-Allow-Origin": ALLOWED_ORIGIN, "Access-Control-Allow-Headers": "Authorization, Content-Type", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", Vary: "Origin" }
    : { Vary: "Origin" };
}

function json(request: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...corsHeaders(request) } });
}

async function verifyRecaptchaEnterpriseV3(token: string, request: Request, env: Env) {
  const endpoint = `https://recaptchaenterprise.googleapis.com/v1/projects/${encodeURIComponent(env.GOOGLE_CLOUD_PROJECT_ID)}/assessments?key=${encodeURIComponent(env.GOOGLE_CLOUD_API_KEY)}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event: { token, siteKey: env.RECAPTCHA_SITE_KEY, expectedAction: RECAPTCHA_ACTION, userAgent: request.headers.get("User-Agent") || "", userIpAddress: request.headers.get("CF-Connecting-IP") || "" } }),
  });
  if (!response.ok) return false;
  const assessment = await response.json() as { tokenProperties?: { valid?: boolean; hostname?: string; action?: string }; riskAnalysis?: { score?: number } };
  const properties = assessment.tokenProperties || {};
  return properties.valid === true && properties.hostname === ALLOWED_HOSTNAME && properties.action === RECAPTCHA_ACTION && Number(assessment.riskAnalysis?.score || 0) >= MINIMUM_RISK_SCORE;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(request) });
    if (origin && origin !== ALLOWED_ORIGIN) return json(request, { error: "origin_not_allowed" }, 403);
    if (request.method === "GET" && url.pathname === "/api/config") return json(request, { siteKey: env.RECAPTCHA_SITE_KEY, action: RECAPTCHA_ACTION });
    if (request.method === "POST" && url.pathname === "/api/verify") {
      let token = "";
      try { token = String((await request.json() as { token?: string }).token || ""); } catch { return json(request, { error: "invalid_request" }, 400); }
      if (!token) return json(request, { error: "missing_token" }, 400);
      return await verifyRecaptchaEnterpriseV3(token, request, env) ? json(request, { grant: await issueGrant(env) }) : json(request, { error: "verification_failed" }, 403);
    }
    if (request.method === "POST" && url.pathname === "/api/email") return await hasValidGrant(request, env) ? json(request, { email: env.CONTACT_EMAIL }) : json(request, { error: "invalid_grant" }, 401);
    return json(request, { error: "not_found" }, 404);
  },
};
