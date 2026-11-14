# DZShop Telegram Relay

A small authenticated Netlify Function that forwards DZShop notifications to the Telegram Bot API. It is designed for Laravel hosting environments that cannot resolve or reach Telegram/Cloudflare Workers directly.

## Deploy

1. Import this GitHub repository into Netlify.
2. Netlify should detect `netlify.toml`. No build command or publish directory is required.
3. In **Site configuration → Environment variables**, add:
   - `TELEGRAM_BOT_TOKEN`: the newly rotated Telegram bot token. Never commit it to Git.
   - `RELAY_SECRET`: a long random secret (at least 32 random bytes).
4. Trigger a new deploy after setting the variables.

The function URL will be:

`https://YOUR-SITE-NAME.netlify.app/.netlify/functions/telegram`

## Request contract

POST JSON:

```json
{
  "chat_id": "-1001234567890",
  "message": "<b>New DZShop request</b>"
}
```

Header:

`x-relay-secret: YOUR_RELAY_SECRET`

The function uses Telegram HTML parse mode, matching the existing DZShop messages that contain tags such as `<b>`.

## Test

From a terminal, substitute your deployed function URL and secret:

```bash
curl -i -X POST "https://YOUR-SITE-NAME.netlify.app/.netlify/functions/telegram" \
  -H "Content-Type: application/json" \
  -H "x-relay-secret: YOUR_RELAY_SECRET" \
  -d '{"chat_id":"YOUR_TELEGRAM_CHAT_ID","message":"<b>DZShop relay test</b>"}'
```

A successful response contains `"ok":true` and a Telegram message ID.

## InfinityFree Laravel configuration

Keep `TELEGRAM_CHAT_ID` in the Laravel `.env`. Add:

```env
TELEGRAM_RELAY_URL=https://YOUR-SITE-NAME.netlify.app/.netlify/functions/telegram
TELEGRAM_RELAY_SECRET=YOUR_RELAY_SECRET
TELEGRAM_CHAT_ID=-1001234567890
```

The bot token belongs only in Netlify environment variables, not in the InfinityFree application or this repository.

## Security

- The function accepts POST only.
- Every request must include the shared relay secret.
- The bot token is read only from Netlify environment variables.
- Do not expose the relay secret in frontend JavaScript or public pages.
- Rotate the bot token immediately if it has ever been exposed.
