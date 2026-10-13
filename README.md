# Made by Favor

Source for [madebyfavor.com](https://madebyfavor.com) — the Made by Favor
software consultancy site, with a portfolio of our live apps (Langto, Playto,
DevPREP, Verse Recall and Sortile).

- Static site built with [Vite](https://vite.dev); plain HTML, CSS and
  JavaScript with no runtime dependencies.
- No cookies, analytics, third-party fonts or tracking.
- Light, dark and system colour modes plus three accent themes (Ink, Forest,
  Ember), all checked for WCAG AA contrast.
- Deployed to GitHub Pages by GitHub Actions on every push to `main`.

## Develop

Requires Node.js 20.19 or later.

```powershell
npm install
npm run dev          # http://localhost:5173
```

## Build and test

```powershell
npx playwright install chromium   # first time only
npm run og                        # renders public/og.png and apple-touch-icon.png
npm run build                     # outputs dist/
npm test                          # Playwright: layout, links, contrast, themes, keyboard
```

The link test requests every external link (including all five apps), so it
needs network access.

## Structure

| Path | Purpose |
| --- | --- |
| `index.html` | Home: hero, services, process, portfolio, about, contact |
| `privacy.html` | Privacy policy for the site and summary for the apps |
| `404.html` | Not-found page served by GitHub Pages |
| `src/styles.css` | Design tokens, themes and layout |
| `src/main.js` | Colour mode and theme controls |
| `public/` | Favicon, logo, robots.txt, sitemap.xml, CNAME |
| `scripts/make-og.mjs` | Generates the Open Graph image and touch icon |
| `tests/` | Playwright tests |

See [DEPLOYMENT.md](DEPLOYMENT.md) for hosting, DNS and HTTPS.
