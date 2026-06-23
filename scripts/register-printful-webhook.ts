/**
 * Register (or inspect) the Printful shipment webhook — Printful v1 API.
 *
 * Printful has no UI for webhooks; the only way to configure them is via the
 * API. In the v1 API a store has a SINGLE webhook configuration: one URL plus a
 * list of subscribed event types. This script makes that configuration point at
 * our production endpoint and subscribe to `package_shipped`, which is exactly
 * the event our handler at src/app/api/webhooks/printful/route.ts processes.
 *
 * What it does:
 *   1. Loads PRINTFUL_API_TOKEN (and optional PRINTFUL_STORE_ID /
 *      PRINTFUL_WEBHOOK_SECRET) from the environment, falling back to .env.local.
 *   2. Resolves the store_id: uses PRINTFUL_STORE_ID if set, otherwise calls
 *      GET /stores and uses the single store (erroring if the token sees several
 *      and none was specified, so we never register against the wrong store).
 *   3. GETs the current webhook config (GET /webhooks) and prints it, so you see
 *      ground truth before anything is changed and can avoid double registration.
 *   4. If the config already points at WEBHOOK_URL and includes `package_shipped`,
 *      it exits WITHOUT modifying anything.
 *   5. Otherwise it POSTs the config (POST /webhooks), merging `package_shipped`
 *      into any event types already present so existing subscriptions are kept,
 *      and prints Printful's response verbatim (success or error).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * HOW TO RUN (do this yourself, with the real env vars — it is NOT run for you):
 *
 *     npx tsx scripts/register-printful-webhook.ts
 *
 * Required env (in .env.local or the shell environment):
 *     PRINTFUL_API_TOKEN     — Printful API token (Bearer).
 * Optional env:
 *     PRINTFUL_STORE_ID      — target store id; auto-resolved via /stores if omitted.
 *     PRINTFUL_WEBHOOK_SECRET — if set, sent to our handler as the X-Webhook-Secret
 *                               header value via the webhook `params` (so our
 *                               endpoint's shared-secret check passes).
 *     SITE_URL / NEXT_PUBLIC_SITE_URL — overrides the production base URL.
 *     CONFIRM_OVERWRITE=1    — required to replace a webhook already pointing at a
 *                               DIFFERENT url (otherwise the script aborts safely).
 *
 * To only INSPECT the current config without writing anything, run:
 *     CHECK_ONLY=1 npx tsx scripts/register-printful-webhook.ts
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const V1_BASE = "https://api.printful.com";
const SHIPMENT_EVENT = "package_shipped"; // v1 "Package shipped" event code
const DEFAULT_SITE_URL = "https://loopawear.com";
const WEBHOOK_PATH = "/api/webhooks/printful";

// ── Env loading ──────────────────────────────────────────────────────────────
// Minimal .env.local parser so the script has no runtime dependency on dotenv.
function loadEnvLocal(): void {
  try {
    const raw = readFileSync(join(process.cwd(), ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      if (process.env[key] !== undefined) continue; // real env wins
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  } catch {
    // No .env.local — rely on the real environment.
  }
}

function authHeaders(token: string, storeId?: string): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  // Account-level tokens must scope requests to a store via this header.
  if (storeId) headers["X-PF-Store-Id"] = storeId;
  return headers;
}

async function readBody(res: Response): Promise<unknown> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function pretty(value: unknown): string {
  return typeof value === "string" ? value : JSON.stringify(value, null, 2);
}

function indent(text: string): string {
  return text
    .split("\n")
    .map((l) => `    ${l}`)
    .join("\n");
}

function resolveWebhookUrl(): string {
  const base =
    process.env.SITE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    DEFAULT_SITE_URL;
  return `${base.replace(/\/+$/, "")}${WEBHOOK_PATH}`;
}

// ── Store resolution ─────────────────────────────────────────────────────────
// If PRINTFUL_STORE_ID isn't provided, look it up via GET /stores. We only
// auto-pick when the token sees exactly one store, to avoid guessing.
async function resolveStoreId(token: string): Promise<string> {
  const explicit = process.env.PRINTFUL_STORE_ID;
  if (explicit) return explicit;

  console.log(`→ GET ${V1_BASE}/stores  (resolving store_id)`);
  const res = await fetch(`${V1_BASE}/stores`, { headers: authHeaders(token) });
  const body = await readBody(res);
  console.log(`  status: ${res.status} ${res.statusText}`);

  if (!res.ok) {
    console.error(`  body:\n${indent(pretty(body))}`);
    throw new Error(
      "Could not list stores. Set PRINTFUL_STORE_ID explicitly and re-run."
    );
  }

  const stores =
    body && typeof body === "object" && Array.isArray((body as { result?: unknown }).result)
      ? ((body as { result: Array<{ id?: number | string; name?: string }> }).result)
      : [];

  if (stores.length === 0) {
    throw new Error(
      "No stores returned for this token. Set PRINTFUL_STORE_ID explicitly."
    );
  }
  if (stores.length > 1) {
    console.error("  Multiple stores found:");
    for (const s of stores) console.error(`    - id=${s.id}  name=${s.name ?? ""}`);
    throw new Error(
      "Multiple stores visible to this token. Set PRINTFUL_STORE_ID to pick one."
    );
  }

  const id = String(stores[0].id);
  console.log(`  resolved store_id=${id} (name="${stores[0].name ?? ""}")\n`);
  return id;
}

// Pull { url, types[] } out of the v1 GET /webhooks response (nested under
// `result`), defensively.
function extractConfig(body: unknown): { url: string | null; types: string[] } {
  const result =
    body && typeof body === "object" && "result" in body
      ? (body as { result: unknown }).result
      : body;

  if (!result || typeof result !== "object") return { url: null, types: [] };

  const obj = result as Record<string, unknown>;
  const url = typeof obj.url === "string" ? obj.url : null;
  const types = Array.isArray(obj.types)
    ? obj.types.filter((t): t is string => typeof t === "string")
    : [];
  return { url, types };
}

async function main(): Promise<void> {
  loadEnvLocal();

  const token = process.env.PRINTFUL_API_TOKEN;
  if (!token) {
    console.error(
      "✗ PRINTFUL_API_TOKEN is not set (not in environment or .env.local)."
    );
    process.exit(1);
  }

  const webhookUrl = resolveWebhookUrl();
  const webhookSecret = process.env.PRINTFUL_WEBHOOK_SECRET;
  const checkOnly = process.env.CHECK_ONLY === "1";

  const storeId = await resolveStoreId(token);
  const headers = authHeaders(token, storeId);

  // ── 1. Inspect current webhook configuration ──────────────────────────────
  console.log(`→ GET ${V1_BASE}/webhooks  (store_id=${storeId})`);
  const getRes = await fetch(`${V1_BASE}/webhooks`, { headers });
  const getBody = await readBody(getRes);
  console.log(`  status: ${getRes.status} ${getRes.statusText}`);
  console.log(`  body:\n${indent(pretty(getBody))}\n`);

  const existing = extractConfig(getBody);
  console.log(
    `Currently registered: url=${existing.url ?? "(none)"} types=[${existing.types.join(", ")}]`
  );

  if (checkOnly) {
    console.log("\nCHECK_ONLY=1 set — inspection complete, no changes made.");
    return;
  }

  const alreadyConfigured =
    existing.url === webhookUrl && existing.types.includes(SHIPMENT_EVENT);
  if (alreadyConfigured) {
    console.log(
      `\n✓ Already configured: ${webhookUrl} subscribes to "${SHIPMENT_EVENT}". No changes made.`
    );
    return;
  }

  if (existing.url && existing.url !== webhookUrl) {
    console.log(
      `\n! A webhook is already configured for a DIFFERENT url: ${existing.url}`
    );
    console.log(
      "  Printful v1 allows only ONE webhook url per store, so registering will"
    );
    console.log("  OVERWRITE that url. Re-run with CONFIRM_OVERWRITE=1 to proceed.");
    if (process.env.CONFIRM_OVERWRITE !== "1") {
      process.exit(2);
    }
  }

  // ── 2. Register the shipment webhook ──────────────────────────────────────
  // Merge our event into any types already present so we don't drop existing
  // subscriptions when (re)pointing at our URL.
  const types = Array.from(new Set([...existing.types, SHIPMENT_EVENT]));

  const payload: {
    url: string;
    types: string[];
    params?: { headers?: Record<string, string> };
  } = { url: webhookUrl, types };

  // Our handler authenticates via a shared secret in the X-Webhook-Secret
  // header. Printful lets you attach custom headers via webhook `params`.
  if (webhookSecret) {
    payload.params = { headers: { "X-Webhook-Secret": webhookSecret } };
  } else {
    console.log(
      "! PRINTFUL_WEBHOOK_SECRET not set — registering without the X-Webhook-Secret"
    );
    console.log(
      "  header. Our handler will reject events with 401 until the secret is sent."
    );
  }

  console.log(`\n→ POST ${V1_BASE}/webhooks  (store_id=${storeId})`);
  console.log(`  payload:\n${indent(pretty(payload))}`);

  const postRes = await fetch(`${V1_BASE}/webhooks`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  const postBody = await readBody(postRes);
  console.log(`  status: ${postRes.status} ${postRes.statusText}`);
  console.log(`  body:\n${indent(pretty(postBody))}\n`);

  if (postRes.ok) {
    console.log(
      `✓ Registered "${SHIPMENT_EVENT}" → ${webhookUrl}. Re-run with CHECK_ONLY=1 to verify.`
    );
  } else {
    console.error(
      `✗ Printful rejected the registration (HTTP ${postRes.status}). See body above.`
    );
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("✗ Unexpected error:", err);
  process.exit(1);
});
