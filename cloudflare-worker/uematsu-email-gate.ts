/**
 * Security design: this Worker keeps the reCAPTCHA secret and contact email
 * outside the GitHub Pages bundle. Only a verified, short-lived grant may read
 * the email from POST /api/email.
 */
interface Env {
  RECAPTCHA_SITE_KEY: string;
  RECAPTCHA_SECRET: string;
  CONTACT_EMAIL: string;
}

const ALLOWED_ORIGIN = "https://takashiuematsu165-glitch.github.io";
const ALLOWED_HOSTNAME = "takashiuematsu165-glitch.github.io";
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
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
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
  } catch {
    return false;
  }
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

async function verifyRecaptcha(token: string, env: Env) {
  const form = new URLSearchParams({ secret: env.RECAPTCHA_SECRET, response: token });
  const response = await fetch("https://www.google.com/recaptcha/api/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
  });
  if (!response.ok) return false;
  const result = await response.json() as { success?: boolean; hostname?: string };
  return result.success === true && result.hostname === ALLOWED_HOSTNAME;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(request) });
    if (origin && origin !== ALLOWED_ORIGIN) return json(request, { error: "origin_not_allowed" }, 403);

    if (request.method === "GET" && url.pathname === "/api/config") {
      return json(request, { siteKey: env.RECAPTCHA_SITE_KEY });
    }

    if (request.method === "POST" && url.pathname === "/api/verify") {
      let token = "";
      try {
        token = String((await request.json() as { token?: string }).token || "");
      } catch {
        return json(request, { error: "invalid_request" }, 400);
      }
      if (!token) return json(request, { error: "missing_token" }, 400);
      const verified = await verifyRecaptcha(token, env);
      return verified ? json(request, { grant: await issueGrant(env) }) : json(request, { error: "verification_failed" }, 403);
    }

    if (request.method === "POST" && url.pathname === "/api/email") {
      if (!await hasValidGrant(request, env)) return json(request, { error: "invalid_grant" }, 401);
      return json(request, { email: env.CONTACT_EMAIL });
    }

    return json(request, { error: "not_found" }, 404);
  },
};
