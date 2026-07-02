// api/webhook.js
//
// Telegram webhook entrypoint. Set as: 
//   https://<your-project>.vercel.app/api/webhook
//
// Required env vars (set in Vercel dashboard -> Settings -> Environment Variables):
//   TELEGRAM_BOT_TOKEN   - from @BotFather
//   FAQ_CSV_URL          - published CSV link for the FAQ tab
//   DEADLINES_CSV_URL    - published CSV link for the Deadlines tab
//   CONTACTS_CSV_URL     - published CSV link for the Contacts tab
//   LOG_ENDPOINT_URL     - Apps Script Web App URL that appends unmatched queries to a Log tab
//   COMMITTEE_CHAT_ID    - (optional) Telegram chat/group ID to forward unmatched queries to

import { fetchSheetAsObjects } from "./_lib/sheets.js";
import { sendMessage } from "./_lib/telegram.js";

const WELCOME = `👋 <b>Welcome to the KPJU School of Pharmacy CPD Bot</b>

I can help with common CPD questions. Try:
/deadlines — upcoming programme deadlines
/forms — where to find CPD forms
/contact — committee contacts
/status — quick programme status info

Or just type your question in plain text (e.g. "how many CPD points do I need") and I'll try to match it.`;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(200).send("KPJU CPD Bot webhook is alive.");
    return;
  }

  try {
    const update = req.body;
    const message = update.message;

    if (!message || !message.text) {
      res.status(200).json({ ok: true });
      return;
    }

    const chatId = message.chat.id;
    const text = message.text.trim();
    const lower = text.toLowerCase();

    if (lower === "/start" || lower === "/help") {
      await sendMessage(chatId, WELCOME);
    } else if (lower === "/deadlines") {
      await handleDeadlines(chatId);
    } else if (lower === "/contact") {
      await handleContacts(chatId);
    } else if (lower === "/forms") {
      await handleForms(chatId);
    } else if (lower === "/status") {
      await sendMessage(
        chatId,
        "📊 Programme status tracking is coming soon here. For now, check the C49 marksheet tracker directly."
      );
    } else {
      await handleFreeText(chatId, text, message.from);
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Webhook error:", err);
    // Always 200 back to Telegram so it doesn't retry-storm you
    res.status(200).json({ ok: true });
  }
}

async function handleFreeText(chatId, text, from) {
  const lower = text.toLowerCase();
  const faqRows = await fetchSheetAsObjects(process.env.FAQ_CSV_URL);

  let bestMatch = null;
  let bestScore = 0;

  for (const row of faqRows) {
    const keywords = (row.Keywords || row.keywords || "")
      .split(",")
      .map((k) => k.trim().toLowerCase())
      .filter(Boolean);

    const score = keywords.filter((k) => k && lower.includes(k)).length;
    if (score > bestScore) {
      bestScore = score;
      bestMatch = row;
    }
  }

  if (bestMatch && bestScore > 0) {
    const answer = bestMatch.Answer || bestMatch.answer || "";
    await sendMessage(chatId, answer);
    return;
  }

  // No match — log it and let the person know
  await sendMessage(
    chatId,
    "I couldn't find a direct answer to that. I've forwarded your question to the CPD committee — they'll follow up."
  );

  await logUnmatchedQuery(text, from);

  if (process.env.COMMITTEE_CHAT_ID) {
    const name = [from?.first_name, from?.last_name].filter(Boolean).join(" ");
    await sendMessage(
      process.env.COMMITTEE_CHAT_ID,
      `❓ Unmatched query from ${name || "a user"}:\n"${text}"`
    );
  }
}

async function handleDeadlines(chatId) {
  try {
    const rows = await fetchSheetAsObjects(process.env.DEADLINES_CSV_URL);
    if (rows.length === 0) {
      await sendMessage(chatId, "No deadlines are listed right now.");
      return;
    }
    const lines = rows.map(
      (r) => `• <b>${r.Programme || r.programme}</b> — ${r.Deadline || r.deadline}${r.Notes ? `\n  ${r.Notes}` : ""}`
    );
    await sendMessage(chatId, `📅 <b>Upcoming CPD Deadlines</b>\n\n${lines.join("\n")}`);
  } catch (err) {
    console.error("handleDeadlines error:", err);
    await sendMessage(chatId, "Couldn't load deadlines right now — try again shortly.");
  }
}

async function handleContacts(chatId) {
  try {
    const rows = await fetchSheetAsObjects(process.env.CONTACTS_CSV_URL);
    if (rows.length === 0) {
      await sendMessage(chatId, "No contacts are listed right now.");
      return;
    }
    const lines = rows.map(
      (r) => `• <b>${r.Role || r.role}</b>: ${r.Name || r.name} — ${r.Contact || r.contact}`
    );
    await sendMessage(chatId, `📇 <b>CPD Committee Contacts</b>\n\n${lines.join("\n")}`);
  } catch (err) {
    console.error("handleContacts error:", err);
    await sendMessage(chatId, "Couldn't load contacts right now — try again shortly.");
  }
}

async function handleForms(chatId) {
  await sendMessage(
    chatId,
    "📋 CPD forms and templates: ask the committee for the current shared drive link, or check pinned messages in the committee group.\n\n(Tip: add a Forms row to the FAQ sheet with a direct link so this answer updates automatically.)"
  );
}

async function logUnmatchedQuery(text, from) {
  const logUrl = process.env.LOG_ENDPOINT_URL;
  if (!logUrl) return;

  try {
    await fetch(logUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        userId: from?.id,
        name: [from?.first_name, from?.last_name].filter(Boolean).join(" "),
        username: from?.username || "",
        timestamp: new Date().toISOString(),
      }),
    });
  } catch (err) {
    console.error("logUnmatchedQuery failed:", err);
  }
}
