import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const MAX_AGE_SECONDS = 3600;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

function hex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a[i] ^ b[i];
  return result === 0;
}

async function hmac(key: ArrayBuffer | Uint8Array, message: string): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(message)));
}

async function sha256(value: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}

async function verifyTelegramInitData(initData: string): Promise<Record<string, string>> {
  if (!TELEGRAM_BOT_TOKEN) throw new Error("Telegram bot secret is not configured.");
  if (!initData) throw new Error("Telegram initData is required.");

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  const authDateRaw = params.get("auth_date");
  if (!hash || !authDateRaw) throw new Error("Invalid Telegram initData.");

  const authDate = Number(authDateRaw);
  if (!Number.isFinite(authDate) || Math.abs(Math.floor(Date.now() / 1000) - authDate) > MAX_AGE_SECONDS) {
    throw new Error("Telegram initData has expired.");
  }

  params.delete("hash");
  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secretKey = await hmac(new TextEncoder().encode("WebAppData"), TELEGRAM_BOT_TOKEN);
  const calculated = await hmac(secretKey, dataCheckString);
  const provided = new Uint8Array(hash.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) ?? []);
  if (!constantTimeEqual(calculated, provided)) throw new Error("Telegram initData signature is invalid.");

  return Object.fromEntries(params.entries());
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Authorization required" }, 401);
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      return json({ error: "Supabase function secrets are not configured." }, 500);
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return json({ error: "Invalid authentication session." }, 401);

    const body = await req.json().catch(() => ({}));
    const initData = typeof body?.initData === "string" ? body.initData : "";
    const verified = await verifyTelegramInitData(initData);
    const userJson = verified.user;
    if (!userJson) throw new Error("Telegram user is missing from initData.");
    const telegramUser = JSON.parse(userJson) as {
      id?: number;
      username?: string;
      first_name?: string;
      last_name?: string;
      language_code?: string;
    };
    if (!Number.isSafeInteger(telegramUser.id)) throw new Error("Invalid Telegram user id.");

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: existing, error: lookupError } = await admin
      .from("telegram_identities")
      .select("user_id")
      .eq("telegram_user_id", telegramUser.id)
      .maybeSingle();
    if (lookupError) throw lookupError;
    if (existing && existing.user_id !== user.id) {
      return json({ error: "This Telegram account is already linked to another AERQVON account." }, 409);
    }

    const { data: identity, error: upsertError } = await admin
      .from("telegram_identities")
      .upsert({
        user_id: user.id,
        telegram_user_id: telegramUser.id,
        telegram_username: telegramUser.username ?? null,
        first_name: telegramUser.first_name ?? null,
        last_name: telegramUser.last_name ?? null,
        language_code: telegramUser.language_code ?? null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "telegram_user_id" })
      .select("id,user_id,telegram_user_id,telegram_username,first_name,last_name,language_code,linked_at,updated_at")
      .single();
    if (upsertError) throw upsertError;

    return json({ linked: true, identity });
  } catch (error) {
    console.error("telegram-link error", error);
    return json({ error: error instanceof Error ? error.message : "Telegram linking failed." }, 400);
  }
});
