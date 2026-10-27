// Renders the Open Graph image (1200x630) and the Apple touch icon (180x180)
// into public/ using Playwright's Chromium. Run before `vite build`.
import { chromium } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const out = (name) => fileURLToPath(new URL(`../public/${name}`, import.meta.url));
const logo = await readFile(out("logo.svg"), "utf8");

const ogHtml = `<!doctype html><html><head><meta charset="utf-8"><style>
  * { box-sizing: border-box; margin: 0; }
  body { width: 1200px; height: 630px; display: flex; flex-direction: column; justify-content: space-between;
    padding: 72px 80px; background: #f7f6f2; color: #17171c;
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif; }
  .brand { display: flex; align-items: center; gap: 22px; font-size: 34px; font-weight: 700; }
  .brand svg { width: 76px; height: 76px; }
  h1 { font-family: "Iowan Old Style", "Palatino Linotype", Georgia, serif; font-weight: 600;
    font-size: 76px; line-height: 1.04; letter-spacing: -1.5px; max-width: 980px; }
  h1 em { color: #3a36b8; }
  .foot { display: flex; justify-content: space-between; align-items: center; font-size: 26px; color: #4b4a52; }
  .tiles { display: flex; gap: 12px; }
  .tiles span { width: 54px; height: 54px; border-radius: 12px; display: grid; place-items: center;
    font-family: Georgia, serif; font-weight: 700; font-size: 28px; }
</style></head><body>
  <div class="brand">${logo}<span>Made by Favor</span></div>
  <h1>Web software that is <em>fast</em>, <em>accessible</em> and built to last.</h1>
  <div class="foot">
    <span>Software consultancy · madebyfavor.com</span>
    <div class="tiles">
      <span style="background:#dbeafe;color:#1e3a8a">L</span>
      <span style="background:#fde68a;color:#713f12">P</span>
      <span style="background:#d1fae5;color:#064e3b">D</span>
      <span style="background:#ede9fe;color:#4c1d95">V</span>
      <span style="background:#fce7f3;color:#831843">S</span>
      <span style="background:#dcfce7;color:#14532d">I</span>
    </div>
  </div>
</body></html>`;

const iconHtml = `<!doctype html><html><head><style>
  * { margin: 0; } body { width: 180px; height: 180px; background: #f4f1ea; }
  svg { width: 180px; height: 180px; display: block; }
</style></head><body>${logo.replace('rx="28"', 'rx="0"')}</body></html>`;

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await page.setContent(ogHtml);
  await page.screenshot({ path: out("og.png") });

  await page.setViewportSize({ width: 180, height: 180 });
  await page.setContent(iconHtml);
  await page.screenshot({ path: out("apple-touch-icon.png") });
} finally {
  await browser.close();
}

console.log("Generated public/og.png and public/apple-touch-icon.png");
