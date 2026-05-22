# jp-site (JP Poolparty 2026)

> The official site for **JP Poolparty** — an annual event in Ramsen, Germany. Static, hand-drawn, vanilla-JS, no build step.

🌐 **Production**: <https://poolparty.jupeters.de> · 📅 **Save the date**: Samstag, 27. Juni 2026 · 📍 Kolpingwiese Ramsen

The backend that powers login, registration, and the admin dashboard lives at [`LoggeL/jpCore`](https://github.com/LoggeL/jpCore).

## What it is

A single landing page (`index.html`) for the upcoming event plus an admin dashboard (`admin.html`) and the auth pages (`login.html`, `forgot-password.html`, `reset-password.html`). The visual language is hand-drawn paper — wobbly borders, hard-offset shadows, sticky-note headings, the [Kalam](https://fonts.google.com/specimen/Kalam) and [Patrick Hand](https://fonts.google.com/specimen/Patrick+Hand) typefaces. Each event year picks a primary color; **2026 is bright pink `#ff2d87`**.

The site:

- shows facts about the event (when, where, how to get there, what to bring)
- lets logged-in attendees register, pick what they're bringing, and sign up to volunteer
- has a year-by-year photo gallery (2018 → 2025) with a lightbox
- has an admin panel for managing accounts, registrations, items, volunteers, mails, logs, and a DJ-only song request view
- has a small easter egg or two (don't tell)

## Stack

- **Pure static** — HTML, CSS, vanilla ES module JavaScript. No framework, no bundler, no build step.
- **Hosting**: GitHub Pages from this repo's `master` branch (CNAME → `poolparty.jupeters.de`)
- **Photo gallery**: [fslightbox](https://fslightbox.com) (vendored as `js/fslightbox.min.js`)
- **Backend**: talks to [`LoggeL/jpCore`](https://github.com/LoggeL/jpCore) via the `js/api/*` modules

## Layout

```
.
├── index.html              # landing page (facts, registration, volunteers, gallery, recap)
├── admin.html              # admin dashboard (accounts, registrations, items, volunteers, music)
├── login.html              # auth: login form
├── forgot-password.html    # auth: request a reset link
├── reset-password.html     # auth: consume reset token, set a new password
├── jpLogo.svg              # JP brand logo
├── kolpingLogo.svg         # Kolpingwerk co-host logo
├── css/
│   ├── colors.css          # design system: CSS variables for colors, spacing, fonts, wobbly borders
│   ├── main.css            # all of index.html / login.html / forgot-password.html
│   ├── admin.css           # admin dashboard
│   └── login.css           # login splash (legacy, kept for fallback)
├── js/
│   ├── main.js             # landing page logic (auth UI glue, registration flow, gallery)
│   ├── admin.js            # admin dashboard (PoolpartyAdmin class)
│   ├── fslightbox.min.js   # vendored gallery lightbox
│   └── api/                # the only place that talks to the backend
│       ├── config.js       # BASE_URL (single source of truth)
│       ├── client.js       # apiFetch + ApiError (credentials:'include')
│       ├── session.js      # getCurrentUser(), isAdmin(), logout()
│       ├── auth.js         # login, requestPasswordReset, resetPassword, verifyEmail, changePassword
│       ├── poolparty.js    # getMe, listItems, registration / volunteer CRUD
│       └── admin.js        # admin list / create / delete endpoints
└── img/
    └── 20{18..25}/{thumb,small,medium,large}/img*.jpg   # gallery (resized variants only — originals live offline)
```

## Auth model

The frontend has **zero token handling**. There's no `localStorage`, no JWT parsing, no `Authorization` header. Sessions live entirely in an `HttpOnly` cookie that the backend sets on `POST /api/public/login`, and `js/api/client.js` includes `credentials: 'include'` on every request so the browser sends it back automatically.

The server is the source of truth for "who am I":

```js
import { getCurrentUser, isAdmin, logout } from './js/api/session.js';

const user = await getCurrentUser();   // -> { id, name, email, roles } or null
if (user) document.body.classList.add('signedIn');
if (isAdmin(user)) document.body.classList.add('admin');
```

When you need to call any API endpoint, use the typed wrappers instead of raw `fetch`:

```js
import { createRegistration, listItems } from './js/api/poolparty.js';
const items = await listItems();
await createRegistration({ peopleCount: 2, itemId: 7, music: 'Eurodance' });
```

## Local development

The fastest path is to let the **backend** serve this directory at `/` so cookies are single-origin (no CORS, no `SameSite=None` weirdness):

```bash
# in jpCore:
JPSITE_PATH=../jp-site npm run dev
# now open http://localhost:3000/
```

If you only want to tweak HTML / CSS / static JS without a running backend, any static server works:

```bash
python -m http.server 8765
# open http://localhost:8765/  — auth-gated features will obviously not work
```

To point this static-served frontend at a specific backend, drop a meta tag into the HTML head:

```html
<meta name="api-base" content="https://jpcore.logge.top">
```

`js/api/config.js` reads it on load and uses it as the prefix for every request.

## Design system

CSS variables in [`css/colors.css`](css/colors.css) define the entire palette + spacing + typography + the signature wobbly border-radius values. To roll the site over for a new event year, change `--primary-color`, `--accent`, `--postit`, the SVG accent fill in `jpLogo.svg` and `kolpingLogo.svg`, and the `Poolparty 20XX` strings in `index.html`. Historical recap sections keep their own year-specific colors via inline overrides at the bottom of `main.css`.

## Adding a new gallery year

1. Drop full-resolution photos in a temp folder
2. Run `python img/processImages.py <year>` (in jp-site root) to generate `thumb / small / medium / large` variants — `large` is what the lightbox links to
3. Add `createPhotos(<year>, <count>)` in `js/main.js`
4. Add a recap section in `index.html` (clone an existing one, change the year and any aftermovie embed)
5. Commit the new `img/<year>/{thumb,small,medium,large}/` directories — the `full/` originals are intentionally excluded from the repo

## Contributing / commit style

Existing history uses Conventional Commits with a German body (`feat: ...`, `fix: ...`, `refactor: ...`). English in the title is fine, German in the body when the change is user-visible.

## Credits

Powered by [PaperCSS](https://www.getpapercss.com) inspirations + a lot of in-house tweaking. Hosted on GitHub Pages.
