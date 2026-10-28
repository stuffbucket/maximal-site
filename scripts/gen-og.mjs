// Generate the social / link-unfurl card: a screenshot of the hero, written to
// public/og.png (used only by the OG/Twitter <meta> tags in
// src/components/SocialCard.astro, so it never appears in the visible page).
//
// The current og.png is a frozen capture of the old site's hero (maximal #184):
// the wordmark on its red candy-paint card over the god-rays backdrop. The
// landing page has the god rays (src/components/GodRays.astro) but not the
// paint, which is kept for reference in src/components/reference/Paint.astro,
// so running this now would replace that card with a different one. It
// refuses unless OG_OVERWRITE=1 is set.
//
// Needs a running site server. Easiest:
//   bun run dev      # in another terminal (serves http://localhost:4321/)
//   bun run og       # this script
// Override the target with OG_URL=... if your dev server is elsewhere.
//
// Uses Playwright's bundled Chromium (installed at the repo root). Renders dark
// (the hero's intended canvas) with reduced motion.
import { fileURLToPath } from "node:url";

if (process.env.OG_OVERWRITE !== "1") {
  console.error(
    "public/og.png is the frozen #184 card; set OG_OVERWRITE=1 to replace it with a capture of the current hero.",
  );
  process.exit(1);
}

const { chromium } = await import("playwright");

const TARGET = process.env.OG_URL ?? "http://localhost:4321/maximal-site/";
const OUT = fileURLToPath(new URL("../public/og.png", import.meta.url));
const W = 1200;
const H = 630; // 1.91:1 — the standard Open Graph / large-summary card ratio

const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: W, height: H },
    deviceScaleFactor: 1, // output exactly 1200x630 to match the og:image meta
    colorScheme: "dark",
    reducedMotion: "reduce",
  });
  await page.goto(TARGET, { waitUntil: "networkidle" });
  await page.waitForSelector(".hero");

  // Compose a clean card for the capture only (the live page is untouched):
  // hide the download buttons and everything below the hero, then pin the
  // kicker + wordmark + tagline centred on the dark canvas.
  await page.addStyleTag({
    content: `
      .hero-cta { visibility: hidden !important; }
      main article section, .dock { display: none !important; }
      .hero {
        position: fixed !important;
        top: 50% !important;
        left: 50% !important;
        transform: translate(-50%, -50%) !important;
        width: 900px !important;
        margin: 0 !important;
        z-index: 5 !important;
      }
    `,
  });

  await page.waitForTimeout(600); // reflow + self-hosted webfonts settle

  await page.screenshot({ path: OUT });
  console.log(`wrote ${OUT} (${W}x${H})`);
} finally {
  await browser.close();
}
