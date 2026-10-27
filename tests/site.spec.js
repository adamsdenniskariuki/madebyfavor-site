import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const PAGES = ["/", "/privacy.html"];
const VIEWPORTS = [
  { width: 360, height: 780 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
];
const THEMES = ["ink", "forest", "ember"];
const MODES = ["light", "dark"];
const APP_URLS = [
  "https://langto.madebyfavor.com/",
  "https://playto.madebyfavor.com/",
  "https://devprep.madebyfavor.com/",
  "https://verserecall.madebyfavor.com/",
  "https://sortile.madebyfavor.com/",
  "https://investo.madebyfavor.com/",
];

const setPrefs = (page, { mode, theme }) =>
  page.addInitScript(
    ([m, t]) => {
      if (m) localStorage.setItem("mbf-mode", m);
      if (t) localStorage.setItem("mbf-theme", t);
    },
    [mode, theme],
  );

test.describe("layout", () => {
  for (const viewport of VIEWPORTS) {
    for (const path of PAGES) {
      test(`${path} has no horizontal overflow at ${viewport.width}px`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await page.goto(path);
        await expect(page.locator("h1")).toBeVisible();
        await expect(page.locator(".site-header .brand")).toBeVisible();
        await expect(page.locator("#mode-toggle")).toBeVisible();
        await expect(page.locator(".site-footer")).toBeVisible();
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - window.innerWidth,
        );
        expect(overflow).toBeLessThanOrEqual(0);
      });
    }

    test(`home sections render at ${viewport.width}px`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto("/");
      for (const id of ["services", "process", "work", "about", "contact"]) {
        const section = page.locator(`#${id}`);
        await section.scrollIntoViewIfNeeded();
        await expect(section).toBeVisible();
      }
      await expect(page.locator(".case")).toHaveCount(APP_URLS.length);
      await expect(page.locator(".in-dev li")).toHaveCount(2);
      await expect(page.locator(".site-nav")).toBeVisible();
      // Nav links must fit or scroll inside the nav, never widen the page.
      const navOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(navOverflow).toBeLessThanOrEqual(0);
    });
  }
});

test.describe("links", () => {
  test("portfolio links to every live app and the count matches", async ({ page }) => {
    await page.goto("/");
    const hrefs = await page.locator("#work .case a.button").evaluateAll((els) =>
      els.map((a) => a.href),
    );
    expect(hrefs.sort()).toEqual([...APP_URLS].sort());
    await expect(page.locator(".hero-points")).toContainText("Six live apps");
    await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /six live apps/);
    const jsonLd = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent());
    const list = jsonLd["@graph"].find((n) => n["@type"] === "ItemList");
    expect(list.itemListElement.map((i) => i.item.url).sort()).toEqual([...APP_URLS].sort());
  });

  test("every external link returns 200", async ({ page, request }) => {
    test.setTimeout(120_000);
    const urls = new Set();
    for (const path of PAGES) {
      await page.goto(path);
      const hrefs = await page
        .locator('a[href^="https://"]')
        .evaluateAll((els) => els.map((a) => a.href));
      hrefs.forEach((h) => urls.add(h.split("#")[0]));
    }
    for (const app of APP_URLS) expect(urls).toContain(app);

    const failures = [];
    for (const url of urls) {
      let status = 0;
      for (let attempt = 0; attempt < 3 && status !== 200; attempt++) {
        try {
          const res = await request.get(url, { maxRedirects: 5, timeout: 30_000 });
          status = res.status();
        } catch (error) {
          status = -1;
        }
      }
      if (status !== 200) failures.push(`${url} -> ${status}`);
    }
    expect(failures, failures.join("\n")).toEqual([]);
  });

  test("site files are served", async ({ request }) => {
    for (const path of [
      "/",
      "/privacy.html",
      "/robots.txt",
      "/sitemap.xml",
      "/favicon.svg",
      "/logo.svg",
      "/logo-dark.svg",
      "/og.png",
      "/apple-touch-icon.png",
      "/CNAME",
    ]) {
      const res = await request.get(path);
      expect(res.status(), path).toBe(200);
    }
    const cname = await (await request.get("/CNAME")).text();
    expect(cname.trim()).toBe("madebyfavor.com");
  });

  test("in-page anchors and email links are valid", async ({ page }) => {
    for (const path of PAGES) {
      await page.goto(path);
      const anchors = await page.locator('a[href^="#"]').evaluateAll((els) =>
        els.map((a) => a.getAttribute("href")),
      );
      for (const hash of anchors) {
        await expect(page.locator(hash), `${path} ${hash}`).toHaveCount(1);
      }
      const mailtos = await page.locator('a[href^="mailto:"]').evaluateAll((els) =>
        els.map((a) => a.getAttribute("href")),
      );
      expect(mailtos.length).toBeGreaterThan(0);
      for (const href of mailtos) {
        expect(href).toMatch(/^mailto:support@madebyfavor\.com(\?|$)/);
      }
    }
  });
});

test.describe("seo", () => {
  test("home page has metadata and structured data", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Made by Favor/);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /consultancy/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://madebyfavor.com/");
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", "https://madebyfavor.com/og.png");
    const jsonLd = await page.locator('script[type="application/ld+json"]').textContent();
    const data = JSON.parse(jsonLd);
    expect(data["@graph"].some((n) => n["@type"] === "ProfessionalService")).toBe(true);
    await expect(page.locator("h1")).toHaveCount(1);
  });

  test("no third-party requests", async ({ page }) => {
    const external = [];
    page.on("request", (req) => {
      const url = new URL(req.url());
      if (url.hostname !== "localhost") external.push(req.url());
    });
    for (const path of PAGES) await page.goto(path, { waitUntil: "networkidle" });
    expect(external).toEqual([]);
  });
});

test.describe("contrast (WCAG AA)", () => {
  test.use({ reducedMotion: "reduce" });

  for (const theme of THEMES) {
    for (const mode of MODES) {
      for (const path of PAGES) {
        test(`${path} text meets 4.5:1 in ${theme}/${mode}`, async ({ page }) => {
          await setPrefs(page, { mode, theme });
          await page.goto(path);
          await expect(page.locator("html")).toHaveAttribute("data-scheme", mode);
          await expect(page.locator("html")).toHaveAttribute("data-theme", theme);

          const failures = await page.evaluate(() => {
            const parse = (value) => {
              const m = value.match(/rgba?\(([^)]+)\)/);
              if (!m) return null;
              const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
              return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
            };
            const over = (top, bottom) => ({
              r: top.r * top.a + bottom.r * (1 - top.a),
              g: top.g * top.a + bottom.g * (1 - top.a),
              b: top.b * top.a + bottom.b * (1 - top.a),
              a: 1,
            });
            const lum = ({ r, g, b }) => {
              const ch = (v) => {
                v /= 255;
                return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
              };
              return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b);
            };
            const ratio = (a, b) => {
              const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
              return (hi + 0.05) / (lo + 0.05);
            };
            const backgroundOf = (el) => {
              const layers = [];
              for (let n = el; n; n = n.parentElement) {
                const bg = parse(getComputedStyle(n).backgroundColor);
                if (bg && bg.a > 0) layers.push(bg);
              }
              return layers.reverse().reduce((acc, layer) => over(layer, acc), {
                r: 255, g: 255, b: 255, a: 1,
              });
            };

            const out = [];
            const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
            const seen = new Set();
            while (walker.nextNode()) {
              const el = walker.currentNode.parentElement;
              if (!el || seen.has(el) || !walker.currentNode.textContent.trim()) continue;
              seen.add(el);
              if (el.closest('[aria-hidden="true"], script, style, .visually-hidden, .skip-link')) continue;
              if (!el.checkVisibility()) continue;
              const style = getComputedStyle(el);
              const bg = backgroundOf(el);
              const fg = over(parse(style.color), bg);
              const r = ratio(fg, bg);
              if (r < 4.5) {
                out.push(`${el.tagName.toLowerCase()}.${el.className} "${el.textContent.trim().slice(0, 40)}" ${r.toFixed(2)}:1`);
              }
            }
            return out;
          });
          expect(failures, failures.join("\n")).toEqual([]);
        });
      }
    }
  }
});

test.describe("display preferences", () => {
  test("follows the system colour scheme by default", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");
    const html = page.locator("html");
    await expect(html).toHaveAttribute("data-mode", "system");
    await expect(html).toHaveAttribute("data-scheme", "dark");
    await page.emulateMedia({ colorScheme: "light" });
    await expect(html).toHaveAttribute("data-scheme", "light");
  });

  test("mode toggle cycles system → light → dark and persists", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/");
    const html = page.locator("html");
    const toggle = page.locator("#mode-toggle");

    await expect(toggle).toHaveAccessibleName(/Colour mode: System/);
    await toggle.click();
    await expect(html).toHaveAttribute("data-mode", "light");
    await expect(html).toHaveAttribute("data-scheme", "light");
    await toggle.click();
    await expect(html).toHaveAttribute("data-mode", "dark");
    await expect(html).toHaveAttribute("data-scheme", "dark");
    await expect(toggle).toHaveAccessibleName(/Colour mode: Dark/);

    await page.reload();
    await expect(html).toHaveAttribute("data-scheme", "dark");
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(bg).toBe("rgb(15, 16, 21)");

    await toggle.click();
    await expect(html).toHaveAttribute("data-mode", "system");
    await expect(html).toHaveAttribute("data-scheme", "light");
  });

  test("theme picker changes accent and persists", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/");
    const html = page.locator("html");
    const accent = () =>
      page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--accent").trim());

    expect(await accent()).toBe("#3a36b8");
    await page.getByRole("radio", { name: "Forest" }).check();
    await expect(html).toHaveAttribute("data-theme", "forest");
    expect(await accent()).toBe("#1d6b3f");
    await page.getByRole("radio", { name: "Ember" }).check();
    expect(await accent()).toBe("#b03a12");

    await page.goto("/privacy.html");
    await expect(html).toHaveAttribute("data-theme", "ember");
    await expect(page.getByRole("radio", { name: "Ember" })).toBeChecked();
  });
});

test.describe("keyboard and motion", () => {
  test("skip link is the first focus stop and controls work by keyboard", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/");
    await page.keyboard.press("Tab");
    const skip = page.locator(".skip-link");
    await expect(skip).toBeFocused();
    await expect(skip).toBeInViewport();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#main$/);

    await page.locator("#mode-toggle").focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("html")).toHaveAttribute("data-mode", "light");

    await page.getByRole("radio", { name: "Ink" }).focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "forest");
  });

  test("respects reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const motion = await page.evaluate(() => ({
      scroll: getComputedStyle(document.documentElement).scrollBehavior,
      animation: getComputedStyle(document.querySelector(".mosaic .tile")).animationName,
      drop: getComputedStyle(document.querySelector(".brand-tile .logo-drop")).animationName,
    }));
    expect(motion).toEqual({ scroll: "auto", animation: "none", drop: "none" });

    await page.emulateMedia({ reducedMotion: "no-preference" });
    const scroll = await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior);
    expect(scroll).toBe("smooth");
  });
});

test.describe("logo", () => {
  const fills = (page) =>
    page.evaluate(() =>
      ["tile", "a", "b", "c", "d"].map((k) =>
        getComputedStyle(document.querySelector(`.site-header .brand-mark .logo-${k}`)).fill,
      ),
    );
  const LIGHT = ["rgb(244, 241, 234)", "rgb(58, 54, 184)", "rgb(108, 99, 255)", "rgb(255, 122, 89)", "rgb(255, 201, 77)"];
  const DARK = ["rgb(30, 27, 58)", "rgb(196, 194, 255)", "rgb(143, 136, 255)", "rgb(255, 148, 116)", "rgb(255, 213, 107)"];

  for (const theme of THEMES) {
    test(`header logo follows the colour mode, not the ${theme} theme`, async ({ page }) => {
      await setPrefs(page, { mode: "light", theme });
      await page.goto("/");
      expect(await fills(page)).toEqual(LIGHT);
      await page.locator("#mode-toggle").click();
      await expect(page.locator("html")).toHaveAttribute("data-scheme", "dark");
      const dark = await fills(page);
      expect(dark).toEqual(DARK);

      // Each dark block stands out from the tile (non-text contrast >= 3:1).
      const ratios = await page.evaluate((colours) => {
        const lum = (c) => {
          const [r, g, b] = c.match(/\d+/g).map(Number).map((v) => {
            v /= 255;
            return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
          });
          return 0.2126 * r + 0.7152 * g + 0.0722 * b;
        };
        const tile = lum(colours[0]);
        return colours.slice(1).map((c) => (lum(c) + 0.05) / (tile + 0.05));
      }, dark);
      for (const r of ratios) expect(r).toBeGreaterThanOrEqual(3);
    });
  }

  test("logo files match the brand palette", async ({ request }) => {
    const light = await (await request.get("/logo.svg")).text();
    expect(light).toContain('fill="#f4f1ea"');
    expect(light).toContain('fill="#ffc94d"');
    const dark = await (await request.get("/logo-dark.svg")).text();
    expect(dark).toContain('fill="#1e1b3a"');
    const favicon = await (await request.get("/favicon.svg")).text();
    expect(favicon).toContain("prefers-color-scheme: dark");
    expect(favicon).toContain('viewBox="0 0 32 32"');
  });

  test("yellow block drops in on first load only", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");
    const drop = () =>
      page.evaluate(() => getComputedStyle(document.querySelector(".brand-tile .logo-drop")).animationName);
    expect(await drop()).toBe("drop");
    await page.reload();
    expect(await drop()).toBe("none");
  });
});

test.describe("axe (WCAG 2.2 A/AA) at 360px", () => {
  for (const mode of MODES) {
    for (const path of PAGES) {
      test(`${path} has no axe violations in ${mode} mode`, async ({ page }) => {
        await page.setViewportSize({ width: 360, height: 780 });
        await page.emulateMedia({ reducedMotion: "reduce" });
        await setPrefs(page, { mode });
        await page.goto(path);
        await expect(page.locator("html")).toHaveAttribute("data-scheme", mode);
        const { violations } = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
          .analyze();
        const summary = violations.map(
          (v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(" ")).join(", ")})`,
        );
        expect(summary, summary.join("\n")).toEqual([]);
      });
    }
  }
});