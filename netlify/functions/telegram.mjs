const json = (statusCode, body) => ({
  statusCode,
  headers: { "content-type": "application/json; charset=utf-8" },
  body: JSON.stringify(body),
});

export default async (req) => {
  if (req.method !== "POST") {
    return json(405, { ok: false, error: "Method not allowed" });
  }

  const expectedSecret = process.env.RELAY_SECRET;
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!expectedSecret || !botToken) {
    console.error("Missing RELAY_SECRET or TELEGRAM_BOT_TOKEN environment variable.");
    return json(500, { ok: false, error: "Relay is not configured" });
  }

  const suppliedSecret = req.headers.get("x-relay-secret") || "";
  if (suppliedSecret.length !== expectedSecret.length || suppliedSecret !== expectedSecret) {
    return json(401, { ok: false, error: "Unauthorized" });
  }

  let payload;
  try {
    payload = await req.json();
  } catch {
    return json(400, { ok: false, error: "Invalid JSON body" });
  }

  const chatId = String(payload?.chat_id ?? "").trim();
  const message = String(payload?.message ?? "");

  if (!chatId || !message.trim()) {
    return json(400, { ok: false, error: "chat_id and message are required" });
  }

  if (message.length > 4096) {
    return json(400, { ok: false, error: "Telegram messages cannot exceed 4096 characters" });
  }

  try {
    const telegramResponse = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
        signal: AbortSignal.timeout(15000),
      }
    );

    const telegramResult = await telegramResponse.json().catch(() => ({}));

    if (!telegramResponse.ok || telegramResult.ok !== true) {
      console.error("Telegram API rejected message:", {
        status: telegramResponse.status,
        error_code: telegramResult.error_code,
        description: telegramResult.description,
      });
      return json(502, {
        ok: false,
        error: "Telegram rejected the message",
        telegram_status: telegramResponse.status,
        description: telegramResult.description || "Unknown Telegram API error",
      });
    }

    return json(200, {
      ok: true,
      message_id: telegramResult.result?.message_id ?? null,
    });
  } catch (error) {
    console.error("Telegram request failed:", error?.message || error);
    return json(502, { ok: false, error: "Could not reach Telegram API" });
  }
};
