# Новый сайт для художника / New artist site

Этот репозиторий — шаблон: тот же сайт (галерея, 3D, «на стене», открытки, кабинет) можно запустить для другого художника за ~1 час.
This repo is a template: the same site (gallery, 3D, on-a-wall, cards, admin) can be launched for another artist in about an hour.

Всё работает на бесплатных тарифах Cloudflare (R2 требует карту). Сборки нет, только файлы.
Everything runs on Cloudflare free tiers (R2 needs a card on file). No build step, just files.

---

## 1. Копия репозитория / Copy the repo

**RU.** Создайте отдельный GitHub-аккаунт или организацию для клиента (как у Валентины). Нажмите *Use this template* или сделайте копию: `git clone` → новый пустой репозиторий → `git push`. Не делайте fork: форки публичных репо видны всем.

**EN.** Create a separate GitHub account or org for the client. Copy the repo (clone and push to a new empty repo); avoid forks.

## 2. Настройки клиента / Client settings

| Файл / File | Что менять / What to change |
|---|---|
| `site.config.js` | имя, Instagram, цвета, темы/коллекции, рамки, тираж принтов, страны доставки, валюты / name, Instagram, colours, themes, frames, print edition size, shipping countries, currencies |
| `lib/site.js` | `SKU_PREFIX` (инициалы, напр. `AB`), тот же, что `skuPrefix` в `site.config.js` / initials, same as `skuPrefix` |
| `index.html` `<head>` | `<title>`, `<meta name="description">`, `theme-color`, ссылка на Google Fonts / title, description, theme-color, Google Fonts link |
| `index.html` `:root` | шрифты `--font-display`, `--font-body` (цвета берутся из конфига) / fonts (colours come from the config) |
| `index.html` тексты / texts | главная (hero), «Обо мне», доставка/возврат, FAQ: найдите по имени художника (`Valentyna`) и замените / home hero, About, shipping/returns, FAQ: search for the artist's name and replace |
| `index.html` `WORKS` | образцы картин; показываются только без API, можно оставить / sample paintings, only shown without the API, can stay |
| `admin/index.html` | «Кабинет Валентины» и приветствие → имя клиента / admin title and greeting → client's name |
| `wrangler.toml` | имя проекта, D1, R2, Access (шаги ниже) / project name, D1, R2, Access (steps below) |
| `README.md` | описание / description |

Проверка: откройте `index.html` в браузере, ошибок в консоли быть не должно.
Check: open `index.html` in a browser; the console should show no errors.

## 3. Cloudflare

Отдельный аккаунт Cloudflare на почту клиента (или проектную Gmail). Карта клиента для R2.
Separate Cloudflare account on the client's (or a project) email. Client's card for R2.

1. **D1** → *Workers & Pages → D1 → Create*: имя `<client>-art`. Скопируйте *Database ID* в `wrangler.toml` (`database_name`, `database_id`). Таблицы создаются сами при первом запросе (`lib/schema.js`). / Name `<client>-art`, copy its ID into `wrangler.toml`. Tables are created automatically.
2. **R2** → *R2 → Create bucket*: `<client>-art-photos`, впишите в `wrangler.toml` (`bucket_name`). / Put the bucket name in `wrangler.toml`.
3. **Pages** → *Workers & Pages → Create → Pages → Connect to Git*: репозиторий клиента, ветка `main`, build command пусто, output directory `.`. Сайт появится на `<project>.pages.dev`. / Connect the client repo, branch `main`, empty build command, output `.`.
4. **Привязки / Bindings**: если Pages не подхватил `wrangler.toml`, в *Settings → Bindings* добавьте D1 `DB` и R2 `PHOTOS`. / If not picked up from `wrangler.toml`, add D1 binding `DB` and R2 binding `PHOTOS`.
5. **Вход в кабинет / Admin login (Zero Trust, Free)**:
   - *Zero Trust → Settings → Authentication*: добавьте **One-time PIN**. / Add One-time PIN.
   - *Access → Applications → Add → Self-hosted*: домены `<domain>/admin` и `<domain>/api/admin`, политика *Allow* с email владельцев. / Two paths, Allow policy with owner emails.
   - Team domain (`xxx.cloudflareaccess.com`) → `ACCESS_TEAM_DOMAIN`, *Application Audience (AUD) tag* → `ACCESS_AUD` в `wrangler.toml`.
   - *Pages → Settings → Variables and secrets*: секрет **`ADMIN_EMAILS`** = те же email через запятую (Production и Preview). Почты должны совпадать с политикой Access. / Secret with the same emails, comma-separated, must match the Access policy.
6. Закоммитьте `wrangler.toml`, дождитесь деплоя, откройте `/admin/`, войдите по коду из почты. / Commit, wait for deploy, open `/admin/`, log in with the emailed code.
7. **Домен / Custom domain**: *Pages → Custom domains* (домен оплачивает клиент) и добавьте его же в Access-приложение. / Client pays for the domain; add it to the Access app too.

Заметка: preview-адреса (`xxx.<project>.pages.dev`) не закрыты Access, поэтому кабинет там отвечает 401. Проверяйте на production.
Note: preview URLs are not behind Access, so admin answers 401 there. Test on production.

## 4. Stripe Connect (платежи / payments)

Модель: аккаунт Валентина — **платформа** (Stripe Connect, Standard, direct charges), у каждого художника свой Stripe, подключённый к платформе; комиссия платформы — `application_fee` (сейчас 3% от товара, без доставки).
Model: Valentin's Stripe is the **platform** (Connect Standard, direct charges); each artist has their own Stripe account connected to it; the platform fee is the `application_fee` (3% of the product, excluding shipping).

1. В Stripe платформы: *Connect → Accounts → Create* (Standard) → отправьте художнику ссылку на onboarding. / In the platform Stripe: create a Standard connected account and send the onboarding link.
2. Художник проходит onboarding (sole trader, банк, документы). Сохраните `acct_...` клиента. / The artist completes onboarding; keep their `acct_...` id.
3. Когда появится checkout: секреты Pages `STRIPE_SECRET_KEY` (ключ платформы) и `STRIPE_ACCOUNT_ID` (`acct_...` клиента), процент — в настройках. Ключи только в секретах, никогда в репозитории. / When checkout is built: Pages secrets `STRIPE_SECRET_KEY` (platform key) and `STRIPE_ACCOUNT_ID` (client's `acct_...`). Keys only in secrets, never in the repo.
4. Сначала test mode, потом live. / Test mode first, then live.

## 5. Перед запуском / Launch checklist

- [ ] `site.config.js` и `lib/site.js` заполнены / filled in
- [ ] Тексты в `index.html` и `admin/index.html` про нового художника / texts updated
- [ ] D1, R2, Pages, Access, `ADMIN_EMAILS` настроены; вход в `/admin/` работает / admin login works
- [ ] Художник добавил первую картину с фото и размером, она видна на сайте / first painting shows on the site
- [ ] Домен, Stripe (test → live) / domain, Stripe
- [ ] Договор подписан, ссылка «Website by» в подвале / contract signed, "Website by" footer link
