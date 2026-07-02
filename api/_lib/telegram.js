// api/_lib/telegram.js

const TELEGRAM_API = "https://api.telegram.org/bot";

export async function sendMessage(chatId, text, options = {}) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const url = `${TELEGRAM_API}${token}/sendMessage`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
      ...options,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("sendMessage failed:", res.status, body);
  }
  return res;
}
