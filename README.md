# KPJU School of Pharmacy — CPD Telegram Bot

## 1. Google Sheet setup

Create one Sheet with these tabs:

**FAQ**
| Keywords | Answer |
|---|---|
| cpd points, how many points, points needed | You need X CPD points per year. See the CPD policy doc for the full breakdown. |

- `Keywords` = comma-separated trigger words/phrases (lowercase, no need to be exact — substring match)
- `Answer` = the reply text (HTML tags like `<b>bold</b>` are supported)

**Deadlines**
| Programme | Deadline | Notes |
|---|---|---|
| PPI Marksheet Submission | 15 Aug 2026 | Submit via preceptor form |

**Contacts**
| Role | Name | Contact |
|---|---|---|
| CPD Coordinator | ... | ... |

**Log** (leave empty with just a header row — this gets written to automatically)
| Timestamp | Name | Username | UserID | Query |
|---|---|---|---|---|

### Publish FAQ / Deadlines / Contacts as CSV
For each of those three tabs: **File → Share → Publish to web** → select the specific sheet/tab → format **CSV** → Publish. Copy each resulting URL — you'll need them as env vars.

Leave **Log** unpublished; it's written to via Apps Script, not read as CSV.

## 2. Apps Script logger (write endpoint)

1. In the Sheet: **Extensions → Apps Script**
2. Replace the default code with `apps-script/Code.gs` from this repo
3. Set `SHEET_ID` to your sheet's ID (from its URL)
4. **Deploy → New deployment → Web app** — Execute as **Me**, Access **Anyone**
5. Copy the `/exec` URL — this is your `LOG_ENDPOINT_URL`

## 3. Telegram bot registration

1. Message [@BotFather](https://t.me/BotFather) → `/newbot` → follow prompts → save the **token**
2. `/setcommands` → paste:
   ```
   start - Welcome message
   deadlines - Upcoming CPD deadlines
   forms - Where to find CPD forms
   contact - Committee contacts
   status - Programme status info
   ```

## 4. Deploy to Vercel

1. Push this repo to GitHub
2. In Vercel: **Add New → Project** → import the repo
3. Under **Settings → Environment Variables**, add:
   - `TELEGRAM_BOT_TOKEN`
   - `FAQ_CSV_URL`
   - `DEADLINES_CSV_URL`
   - `CONTACTS_CSV_URL`
   - `LOG_ENDPOINT_URL`
   - `COMMITTEE_CHAT_ID` (optional — a group chat ID to forward unmatched questions to; see step 6)
4. Deploy. Note your project URL, e.g. `https://kpju-cpd-bot.vercel.app`

## 5. Connect the webhook

Visit this URL once in any browser (replace placeholders):

```
https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook?url=https://kpju-cpd-bot.vercel.app/api/webhook
```

You should see `{"ok":true,"result":true,...}`.

## 6. (Optional) Get a committee group chat ID

1. Create a Telegram group, add your bot to it
2. Send any message in the group
3. Visit `https://api.telegram.org/bot<TOKEN>/getUpdates` in a browser
4. Find `"chat":{"id":-100xxxxxxxxx,...}` — that negative number is your `COMMITTEE_CHAT_ID`
5. Add it to Vercel env vars and redeploy

## 7. Test

Message your bot `/start`. Try `/deadlines`, `/contact`, and a free-text question that matches a Keywords row.

## Day-to-day maintenance

Everything staff-facing lives in the Sheet. Adding a new FAQ answer, deadline, or contact is just adding a row — no redeploy needed. Only touch the code if you're changing bot *behavior*.
