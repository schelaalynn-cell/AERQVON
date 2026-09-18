import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const AERQVON_APP_URL = Deno.env.get("AERQVON_APP_URL");

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

async function telegram(method: string, body: Record<string, unknown>) {
  if (!TELEGRAM_BOT_TOKEN) throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Telegram API returned ${response.status}`);
  return response.json();
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return json({ error: "server_not_configured" }, 500);

  try {
    const update = await req.json();
    const message = update?.message;
    const from = message?.from;
    if (!message || !from?.id) return json({ ok: true, ignored: true });

    const telegramUserId = Number(from.id);
    const firstName = typeof from.first_name === "string" ? from.first_name : null;
    const lastName = typeof from.last_name === "string" ? from.last_name : null;
    const username = typeof from.username === "string" ? from.username : null;
    const languageCode = typeof from.language_code === "string" ? from.language_code : null;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: identity } = await supabase
      .from("telegram_identities")
      .select("user_id,telegram_username,first_name,last_name,language_code")
      .eq("telegram_user_id", telegramUserId)
      .maybeSingle();

    let aqvUserId: string | null = null;
    if (identity?.user_id) {
      const { data: aqvProfile } = await supabase
        .from("aqv_user_profiles")
        .select("aqv_user_id")
        .eq("user_id", identity.user_id)
        .maybeSingle();
      aqvUserId = aqvProfile?.aqv_user_id ?? null;
    }

    const command = typeof message.text === "string"
      ? message.text.trim().split(/\s+/)[0].toLowerCase()
      : "";

    if (command === "/start") {
      const text = identity?.user_id
        ? `Welcome back to AERQVON, ${firstName ?? "there"}. Your Telegram account is linked.${aqvUserId ? `\\nAERQVON User ID: ${aqvUserId}` : ""}`
        : `Welcome to AERQVON, ${firstName ?? "there"}. Your Telegram account is not linked yet. Open the AERQVON app to securely link it.`;

      const replyMarkup = AERQVON_APP_URL
        ? {
            inline_keyboard: [
              [
                {
                  text: "Open AERQVON",
                  web_app: { url: AERQVON_APP_URL },
                },
              ],
            ],
          }
        : undefined;

      await telegram("sendMessage", {
        chat_id: message.chat.id,
        text,
        ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
      });
    } else if (command === "/help") {
      await telegram("sendMessage", {
        chat_id: message.chat.id,
        text: "/start — account status\n/help — available commands\n/status — AERQVON account link status\n/price BTC — market price lookup will be added after the market-data backend is connected.",
      });
    } else if (command === "/status") {
      const text = identity?.user_id
        ? `Your Telegram account is linked to an AERQVON account.${aqvUserId ? `\\nAERQVON User ID: ${aqvUserId}` : ""}`
        : "Your Telegram account is not linked to AERQVON.";
      await telegram("sendMessage", { chat_id: message.chat.id, text });
    } else if (command === "/price") {
      await telegram("sendMessage", { chat_id: message.chat.id, text: "Price commands are not connected to a live market-data backend yet." });
    }

    return json({ ok: true });
  } catch (error) {
    console.error("telegram-webhook error", error);
    return json({ error: "internal_error" }, 500);
  }
});
