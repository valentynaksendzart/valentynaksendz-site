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
