# Valentyna Ksendz Art

Website for artist Valentyna Ksendz: original paintings, limited-edition prints, worldwide shipping.

Static site, no build step: everything is in `index.html`. Hosted on GitHub Pages for now; Cloudflare Pages with the custom domain later.

Draft status: paintings, prices, texts and photos are placeholders. Items marked GUESS/TBC on the page need the artist's confirmation.

## Admin panel («Кабинет Валентины»)

`/admin/` is a simple Russian-language panel where Valentyna adds paintings, uploads photos and sees stats. It runs on Cloudflare Pages:

| Piece | Where |
|---|---|
| Painting data | Cloudflare D1 database `valentyna-art` (`migrations/`) |
| Photos | Cloudflare R2 bucket `valentyna-art-photos`; the browser uploads the original plus a 2400 px and an 800 px WebP copy |
| API | Pages Functions in `functions/` (shared code in `lib/`) |
| Login | Cloudflare Access (Zero Trust Free), one-time code by email, protecting `/admin*` and `/api/admin*`; every admin request also re-checks the Access token and the `ADMIN_EMAILS` secret |

Public endpoints: `GET /api/paintings` (everything except drafts, in the same shape as `WORKS` in `index.html`) and `GET /img/p/...` (web copies of photos). Originals are only downloadable from the admin API.

Setup on Cloudflare (once):
1. Create the D1 database `valentyna-art`, put its id in `wrangler.toml`. Tables are created automatically on first request (`lib/schema.js`).
2. Create the R2 bucket `valentyna-art-photos`.
3. Create a Pages project from this repo (build command empty, output directory `.`).
4. Zero Trust: add the One-time PIN login method, then a self-hosted Access application for `<domain>/admin` and `<domain>/api/admin` allowing only the owner emails. Put the team domain and the application AUD tag in `wrangler.toml`, and the emails in the `ADMIN_EMAILS` secret of the Pages project.

Local development:

```sh
npx wrangler d1 migrations apply valentyna-art --local
npx wrangler pages dev --binding DEV_NO_AUTH=1   # login is skipped only on localhost
```

### Products and SKUs

Greeting cards live in the `products` table (D1), one row per card, linked to a painting
(`painting_id`). Prices are stored in pence (`price_p`); `stock` is how many were printed and
`sold` how many are gone. SKUs: originals `VK-O-0001`, prints `VK-O-0001-PP` / `-PC`,
cards `VK-C-0001` (number = database id). `GET /api/paintings` returns each painting's
`sku` and its on-sale `cards`, so a checkout can be added later on top of these SKUs.

## Online shop (Stripe Connect)

Valentyna sells from **her own** Stripe account; Valentin's Stripe account is the **platform**
(Connect, Standard accounts). Each sale is a *direct charge* on her account: the money, Stripe's
card fee, refunds and disputes are hers, and Stripe automatically sends Valentin a platform fee
of **3% of the product price** (painting/print/card + frame, never shipping). If an order is
refunded, the webhook gives back the same share of the 3%.

| Piece | File |
|---|---|
| Prices for shipping per zone, frame prices, 3% fee | `lib/shop.js` (values marked TBC are placeholders) |
| Checkout (creates a Stripe Checkout session on her account) | `functions/api/checkout.js` |
| Shop on/off for the site | `functions/api/shop.js` |
| Webhook: order saved, stock down, refunds | `functions/api/stripe/webhook.js` |
| Admin «Продажи»: connect button, orders | `/admin/#/sales`, `functions/api/admin/stripe/*`, `functions/api/admin/orders.js` |
| Tables `orders`, `settings` | `migrations/0004_orders.sql` (created automatically too) |

Stock: an original becomes *sold*, a print adds one to `print_*_sold` (never beyond the edition),
a card adds one to `sold`. If two people pay for the same original at once, the second order is
flagged in the admin as needing a refund.

The site keeps saying "checkout coming soon" until **all** of these are set.

### Setup (test mode first)

1. **Valentin's Stripe (platform):** Dashboard → Connect → get started → platform, Standard
   accounts. In *Connect → Settings → Onboarding options → OAuth*, turn on OAuth and add the
   redirect URI `https://<site>/api/admin/stripe/callback`. Copy the test **client ID** (`ca_...`).
2. **Webhook:** Developers → Webhooks → Add endpoint `https://<site>/api/stripe/webhook`,
   *Listen to events on connected accounts*, events `checkout.session.completed`,
   `checkout.session.async_payment_succeeded`, `charge.refunded`. Copy the signing secret (`whsec_...`).
3. **Cloudflare Pages → Settings → Variables and secrets** (as encrypted secrets, never in this repo):
   - `STRIPE_SECRET_KEY` = `sk_test_...` (platform secret key)
   - `STRIPE_CLIENT_ID` = `ca_...`
   - `STRIPE_WEBHOOK_SECRET` = `whsec_...`
   - `SHOP_OPEN` = `1` (the on/off switch for the Buy buttons)
   - optional `STRIPE_ADAPTIVE_PRICING` = `1` to show buyers their own currency on the payment page
   Redeploy after changing them.
4. **Valentyna:** admin → «Продажи» → «Подключить Stripe», sign in or create her account
   (UK, individual/sole trader). Back in the admin it shows her account as connected.
5. **Test:** buy a painting with card `4242 4242 4242 4242`, any future date, any CVC. Check:
   the order appears in «Продажи», the painting shows as sold, Valentin's dashboard shows a 3%
   *collected fee*, Valentyna gets Stripe's sale email. Refund it in her dashboard: the order
   turns «Возврат» and the fee is refunded. Declined card: `4000 0000 0000 0002`.
6. **Live:** repeat steps 1–3 with live keys (both accounts verified), reconnect Valentyna,
   one real £1-ish test purchase, refund it.

Before going live, replace the TBC shipping and frame prices in `lib/shop.js`.
