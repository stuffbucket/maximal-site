#!/usr/bin/env node
/**
 * Generate the full set of PII-safe UI screenshots for maximal-site from
 * stuffbucket/maximal's built-in UI harness (`scripts/ui-harness.ts`).
 *
 * Designed to run either:
 *   1. Locally against a sibling or cloned `maximal` repo (or inside Docker via
 *      `scripts/screenshots-docker.sh`); or
 *   2. In GitHub Actions via `.github/workflows/screenshots.yml` (`workflow_dispatch`).
 *
 * Every screenshot uses synthetic fixture data (octocat, monalisa, hubot,
 * /Users/you/... and /Users/alex/...) and hides the `#__harness` floating
 * switcher pill before capturing.
 */

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const playwrightPkg = (() => {
  for (const name of ["playwright", "playwright-core"]) {
    try {
      return require(name);
    } catch {
      // try next
    }
  }
  for (const base of ["/app/node_modules", "/tmp/pw-runner/node_modules", "/tmp/clean-home/node_modules"]) {
    for (const name of ["playwright", "playwright-core"]) {
      try {
        return require(resolve(base, name));
      } catch {
        // try next
      }
    }
  }
  throw new Error("Could not resolve 'playwright' or 'playwright-core'.");
})();
const { chromium } = playwrightPkg;

const HERE = dirname(fileURLToPath(import.meta.url));
const SITE_ROOT = resolve(HERE, "..");
const MAXIMAL_DIR = resolve(
  process.env.MAXIMAL_DIR ?? resolve(SITE_ROOT, "../maximal"),
);
const HARNESS_PORT = Number(process.env.HARNESS_PORT ?? 4789);
const BASE_URL = `http://127.0.0.1:${HARNESS_PORT}`;

const OUT_LANDING = resolve(SITE_ROOT, "public/screenshots");
const OUT_GUIDE = resolve(SITE_ROOT, "public/screenshots/guide");

mkdirSync(OUT_LANDING, { recursive: true });
mkdirSync(OUT_GUIDE, { recursive: true });

if (!existsSync(resolve(MAXIMAL_DIR, "scripts/ui-harness.ts"))) {
  console.error(
    `✗ Could not find stuffbucket/maximal at ${MAXIMAL_DIR}.\n` +
      `  Set MAXIMAL_DIR=/path/to/maximal or clone it next to maximal-site.`,
  );
  process.exit(1);
}

/**
 * Wait for the harness HTTP server to answer on /__harness/scenarios.
 */
async function waitForHarness(timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE_URL}/__harness/scenarios`);
      if (res.ok) return;
    } catch {
      // still starting
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`Timed out waiting for UI harness on ${BASE_URL}`);
}

/**
 * Switch the harness's active scenario and override any PII-sensitive or
 * version-stale fields in the DOM before capture.
 */
async function setScenario(id) {
  const res = await fetch(`${BASE_URL}/__harness/scenario`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id }),
  });
  if (!res.ok) {
    throw new Error(`Failed to switch scenario to ${id}: HTTP ${res.status}`);
  }
}

/**
 * Common page preparation: hide the `#__harness` control pill, block external
 * avatar requests with a clean inline SVG octocat avatar so captures work
 * offline/in isolated containers without external network dependency, and wait
 * for fonts.
 */
const OCTOCAT_AVATAR_BODY = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <rect width="128" height="128" rx="64" fill="#1f2933"/>
  <circle cx="64" cy="50" r="22" fill="#7fc1d2"/>
  <path d="M26 112c6-22 22-34 38-34s32 12 38 34" fill="#7fc1d2"/>
</svg>`;

async function openSurface(page, { scenario, urlPath, tabHash, theme = "dark", customRoutes }) {
  await setScenario(scenario);

  // Stub external GitHub avatar fetches with a deterministic local SVG so the
  // container needs no internet access and never leaks external state.
  await page.route(/github\.com\/.*\.png/, (route) =>
    route.fulfill({
      status: 200,
      contentType: "image/svg+xml",
      body: OCTOCAT_AVATAR_BODY,
    }),
  );

  if (customRoutes) {
    await customRoutes(page);
  }

  // Pre-seed localStorage so the unified window opens the requested tab without
  // the first-run unauthenticated override hijacking non-Account tabs.
  const targetUrl = `${BASE_URL}${urlPath}${tabHash ? `#${tabHash}` : ""}`;
  // Note: /settings/api/events is a persistent SSE stream, so waitUntil: "load"
  // (not "networkidle") is required.
  await page.goto(targetUrl, { waitUntil: "load" });

  await page.evaluate(
    ({ desiredTheme }) => {
      document.documentElement.dataset.theme = desiredTheme;
    },
    { desiredTheme: theme },
  );

  await page.addStyleTag({
    content: `
      #__harness { display: none !important; }
    `,
  });

  if (tabHash) {
    await page.evaluate((hash) => {
      window.location.hash = `#${hash}`;
    }, tabHash);
  }

  await page.evaluate(() => document.fonts?.ready);
  await page.waitForTimeout(500);
}

/**
 * Settings captures are COLUMN_WIDTH wide: the window's 640px content column
 * (`--content-max`) plus the pane's 32px padding each side, so the image
 * carries no empty pane to the right of the content.
 */
const COLUMN_WIDTH = 704;
const PANE_PADDING = 32;

/**
 * Show only one section of the current tab. The window's own hash scroll
 * runs before the data loads, so a lower section (MCP servers below Apps)
 * can be captured as the one above it; hiding the rest avoids that.
 */
async function isolateSection(page, id) {
  await page.addStyleTag({
    content: `[data-section]:not([data-section="${id}"]) { display: none !important; }`,
  });
  await page.evaluate(() => document.getElementById("pane")?.scrollTo(0, 0));
  await page.waitForTimeout(150);
}

/** Crop the capture just below the visible section's content. */
async function contentClip(page) {
  const { bottom, titles } = await page.evaluate(() => {
    const visible = [...document.querySelectorAll("[data-section]")].filter(
      (el) => el.getClientRects().length > 0,
    );
    return {
      bottom: Math.max(...visible.map((el) => el.getBoundingClientRect().bottom)),
      titles: visible.map((el) => el.querySelector("h1, h2, h3")?.textContent.trim()),
    };
  });
  console.log(`  · cropped to: ${titles.join(", ")}`);
  const vp = page.viewportSize();
  return {
    x: 0,
    y: 0,
    width: vp.width,
    height: Math.min(vp.height, Math.ceil(bottom + PANE_PADDING)),
  };
}

/**
 * Screenshot specifications:
 * - Landing screenshots (`public/screenshots/*.png`)
 * - Guide screenshots (`public/screenshots/guide/*.png`)
 */
const APPS_ALL_THREE_ENABLED = {
  apps: [
    {
      id: "claude-code",
      name: "Claude Code",
      kind: "config",
      enabled: true,
      status: "ready",
      installs: [{ path: "/Users/you/.local/bin/claude", version: "2.1.195", source: "local-bin" }],
      install: null,
      conflict: null,
    },
    {
      id: "claude-desktop",
      name: "Claude Desktop",
      kind: "config",
      enabled: true,
      status: "ready",
      installs: [{ path: "/Applications/Claude.app", version: "1.2.0", source: "unknown" }],
      install: null,
      conflict: null,
    },
    {
      id: "codex",
      name: "Codex",
      kind: "config",
      enabled: true,
      status: "ready",
      installs: [
        {
          kind: "cli",
          path: "/Users/you/.local/bin/codex",
          version: null,
          source: "local-bin",
        },
        {
          kind: "desktop",
          path: "/Applications/Codex.app",
          version: null,
          source: "unknown",
        },
      ],
      install: null,
      conflict: null,
    },
    {
      id: "copilot-cli",
      name: "Copilot CLI",
      kind: "coming-soon",
      enabled: false,
      status: "coming-soon",
      installs: [],
      install: null,
      conflict: null,
    },
  ],
};

const MCP_WORKIQ_SHARED = {
  broker: { state: "running", problem: null },
  available: [],
  endpoints: [
    {
      id: "workiq",
      label: "Work IQ",
      enabled: true,
      clients: ["claude-code", "claude-desktop"],
      offered: [
        { id: "claude-code", name: "Claude Code", available: true, configured: true },
        { id: "claude-desktop", name: "Claude Desktop", available: true, configured: true },
      ],
    },
  ],
};

const COPILOT_CATALOG = JSON.parse(
  readFileSync(resolve(SITE_ROOT, "public/models/copilot.json"), "utf8"),
);

/** The Models section's fixture. `loaded_at` is set when the route answers,
 *  so the list reads "Updated just now" whenever the capture runs. */
const REFRESHED_MODELS = {
  count: COPILOT_CATALOG.count,
  models: [...COPILOT_CATALOG.models]
    .sort((a, b) => a.name.localeCompare(b.name, "en", { numeric: true }))
    .map((m) => ({
      id: m.id,
      name: m.name,
      vendor: m.vendor,
      family: m.family ?? m.id,
      type: "chat",
      preview: false,
      context_window_tokens: m.limits?.contextTokens ?? null,
      max_output_tokens: m.limits?.outputTokens ?? null,
      capabilities: {
        vision: Boolean(m.capabilities?.vision),
        tool_calls: Boolean(m.capabilities?.toolCalls),
        streaming: true,
        reasoning: Boolean(m.capabilities?.reasoning),
      },
    })),
};

const routeModels = (page) =>
  page.route("**/settings/api/models", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ...REFRESHED_MODELS, loaded_at: new Date().toISOString() }),
    }),
  );

/**
 * Dashboard fixture shared with the landing page's live overlay
 * (`src/components/markdoc/ShowTell.astro`). Both read the anonymized replay
 * of real maximal usage in `src/data/usage-replay.json`
 * (`scripts/extract-usage-replay.mjs`), so the screenshot shows exactly the
 * state the overlay starts from: "today so far", the 14 minutes before the
 * replay plus an empty current minute.
 */
const USAGE_REPLAY = JSON.parse(
  readFileSync(resolve(SITE_ROOT, "src/data/usage-replay.json"), "utf8"),
);
const DASHBOARD_RECENT_MINUTES = [...USAGE_REPLAY.history, 0];
const DASHBOARD_BY_MODEL = USAGE_REPLAY.baseByModel;

/** Dashboard fixture routes: today-so-far totals and the 15-minute rate
 *  series from the usage replay, so both dashboard captures and the landing
 *  page's live overlay agree. */
async function routeDashboard(page) {
  // The harness answers /token-usage with its own fixture (camelCase
  // `byModel`, `recent_minutes`); replace the parts the landing page's live
  // overlay (ShowTell.astro, `.spark-zoom`) must agree with.
  await page.route(/\/token-usage(\?.*)?$/, async (route) => {
    const res = await route.fetch();
    const data = await res.json();
    const endMs = Date.UTC(2026, 9, 27, 13, 10, 0);
    const startMs = Date.UTC(2026, 9, 27, 0, 0, 0);
    data.range = { start_ms: startMs, end_ms: endMs };
    data.byModel = DASHBOARD_BY_MODEL;
    data.totals = DASHBOARD_BY_MODEL.reduce(
      (acc, row) => {
        for (const key of Object.keys(acc)) acc[key] += row[key];
        return acc;
      },
      {
        request_count: 0,
        input_tokens: 0,
        output_tokens: 0,
        cache_read_input_tokens: 0,
        cache_creation_input_tokens: 0,
        total_tokens: 0,
        total_nano_aiu: 0,
      },
    );
    const currentMinute = Math.floor(Date.now() / 60_000) * 60_000;
    data.recent_minutes = DASHBOARD_RECENT_MINUTES.map((total_tokens, i) => ({
      start_ms:
        currentMinute - (DASHBOARD_RECENT_MINUTES.length - 1 - i) * 60_000,
      total_tokens,
    }));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(data),
    });
  });
  await page.route(/\/token-usage\/events(\?.*)?$/, async (route) => {
    const res = await route.fetch();
    const data = await res.json();
    const models = DASHBOARD_BY_MODEL.map((row) => row.model);
    if (Array.isArray(data.items)) {
      data.items = data.items.map((ev, idx) => ({
        ...ev,
        model: models[idx % models.length],
      }));
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(data),
    });
  });
}

/** Open the Dashboard tab on "1 day" (the replay's totals are today-so-far
 *  figures) and return its frame once rendered. */
async function openDashboard(page) {
  const frameEl = await page.waitForSelector("[data-dashboard-frame]");
  const frame = await frameEl.contentFrame();
  await frame.waitForSelector("#content-area h2", { timeout: 10_000 });
  await frame.addStyleTag({ content: "#__harness { display: none !important; }" });
  const dayBtn = await page.$('[data-dashboard-period="day"]');
  if (dayBtn) await dayBtn.click();
  await page.waitForTimeout(400);
  return { frameEl, frame };
}

/**
 * Prepare the landing page's copy of the dashboard, which the page brings to
 * life (ShowTell.astro): its moving parts are recorded in
 * src/data/dashboard-shot.json and left out of the image, so only the page's
 * live copies show.
 */
async function prepareLiveDashboard(page) {
  const { frameEl, frame } = await openDashboard(page);
  const box = await frameEl.boundingBox();
  const vp = page.viewportSize();
  // The landing page's callout carries the token rate (figure and
  // sparkline), so the dashboard's own is left out, before anything is
  // measured.
  await frame.addStyleTag({ content: ".rate { display: none !important; }" });

  // The landing page draws the dashboard's moving parts live, over the
  // capture: every total but cost. Record where each sits (as fractions of
  // the capture) and how it is set, then blank it out of the image so only
  // the live copy shows.
  const live = await frame.evaluate(() => {
    const rect = (el) => {
      const r = el.getBoundingClientRect();
      return { x: r.left, y: r.top, w: r.width, h: r.height };
    };
    const text = (el, key) => {
      const cs = getComputedStyle(el);
      return {
        key,
        rect: rect(el),
        fontFamily: cs.fontFamily,
        fontSize: parseFloat(cs.fontSize),
        fontWeight: cs.fontWeight,
        color: cs.color,
        textAlign: cs.textAlign,
      };
    };
    const parts = [...document.querySelectorAll(".totals__parts > div")];
    const partKeys = ["input", "output", "cacheRead", "cacheWrite", "requests"];
    // The unlimited quotas' shared card (Chat, Completions) has nothing
    // to show; the landing page's live rate callout takes its place.
    const unlimitedCard = [...document.querySelectorAll("#usage-quotas h3")]
      .find((h) => h.nextElementSibling?.textContent.trim() === "Unlimited")
      ?.closest("#usage-quotas .border");
    unlimitedCard?.setAttribute("data-shot-slot", "");
    return {
      slot: unlimitedCard ? rect(unlimitedCard) : null,
      texts: [
        text(document.querySelector(".totals__hero-value"), "total"),
        ...partKeys.map((key, i) => text(parts[i].querySelector("dd"), key)),
      ],
    };
  });
  const toFraction = (r) => ({
    x: +((box.x + r.x) / vp.width).toFixed(5),
    y: +((box.y + r.y) / vp.height).toFixed(5),
    w: +(r.w / vp.width).toFixed(5),
    h: +(r.h / vp.height).toFixed(5),
  });
  if (!live.slot) throw new Error("dashboard: unlimited quota card not found");
  const shotGeometry = {
    viewport: vp,
    slot: toFraction(live.slot),
    texts: live.texts.map((t) => ({ ...t, rect: toFraction(t.rect) })),
  };
  writeFileSync(
    resolve(SITE_ROOT, "src/data/dashboard-shot.json"),
    `${JSON.stringify(shotGeometry, null, 2)}\n`,
  );
  await frame.addStyleTag({
    content: `
      [data-shot-slot] { visibility: hidden !important; }
      .totals__hero-value,
      .totals__parts > div:nth-child(-n+5) dd { color: transparent !important; }
    `,
  });
  await page.waitForTimeout(100);
  console.log("  · wrote src/data/dashboard-shot.json (live layer geometry)");
}

const SHOTS = [
  // 1. Guide: the Dashboard tab, complete
  {
    name: "app-dashboard.png",
    outDir: OUT_LANDING,
    viewport: { width: 1000, height: 720 },
    scenario: "signed-in",
    urlPath: "/ui/settings/",
    tabHash: "dashboard",
    customRoutes: routeDashboard,
    afterLoad: openDashboard,
  },

  // 1b. Landing: the same view, its live parts left for the page to draw
  {
    name: "app-dashboard-live.png",
    outDir: OUT_LANDING,
    viewport: { width: 1000, height: 720 },
    scenario: "signed-in",
    urlPath: "/ui/settings/",
    tabHash: "dashboard",
    customRoutes: routeDashboard,
    afterLoad: prepareLiveDashboard,
  },

  // 2. Landing: Step 2 — Account sign-in (unauthenticated + gh reuse roster)
  {
    name: "account-signin.png",
    outDir: OUT_LANDING,
    viewport: { width: 1000, height: 640 },
    scenario: "signed-out",
    urlPath: "/ui/settings/",
    tabHash: "account",
  },

  // 3. Landing: Integrations -> Apps (Claude Code, Claude Desktop, Codex)
  {
    name: "apps.png",
    outDir: OUT_LANDING,
    viewport: { width: COLUMN_WIDTH, height: 1200 },
    scenario: "signed-in",
    urlPath: "/ui/settings/",
    tabHash: "integrations",
    section: "apps",
    fit: true,
    customRoutes: async (page) => {
      await page.route("**/settings/api/apps", (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(APPS_ALL_THREE_ENABLED),
        }),
      );
      await page.route("**/settings/api/mcp", (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(MCP_WORKIQ_SHARED),
        }),
      );
    },
  },

  // 4. Landing: Models & keys -> Models, the whole catalog
  {
    name: "models.png",
    outDir: OUT_LANDING,
    viewport: { width: COLUMN_WIDTH, height: 4000 },
    scenario: "signed-in",
    urlPath: "/ui/settings/",
    tabHash: "models-keys",
    section: "models",
    fit: true,
    customRoutes: routeModels,
  },

  // 5. Guide: Account connected + multi-account switcher ("Switch to")
  {
    name: "account-connected.png",
    outDir: OUT_GUIDE,
    viewport: { width: 960, height: 640 },
    scenario: "signed-in",
    urlPath: "/ui/settings/",
    tabHash: "account",
  },

  // 6. Guide: Integrations -> MCP servers (Work IQ enabled & expanded). Same
  //    size as the request dialog, its partner on the landing page.
  {
    name: "mcp-servers.png",
    outDir: OUT_GUIDE,
    viewport: { width: COLUMN_WIDTH, height: 680 },
    scenario: "signed-in",
    urlPath: "/ui/settings/",
    tabHash: "mcp",
    section: "mcp",
    customRoutes: async (page) => {
      await page.route("**/settings/api/apps", (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(APPS_ALL_THREE_ENABLED),
        }),
      );
      await page.route("**/settings/api/mcp", (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(MCP_WORKIQ_SHARED),
        }),
      );
    },
  },

  // 7. Guide: Integrations -> MCP catalog ("Available to add" Work IQ)
  {
    name: "mcp-available-to-add.png",
    outDir: OUT_GUIDE,
    viewport: { width: 960, height: 560 },
    scenario: "mcp-found",
    urlPath: "/ui/settings/",
    tabHash: "mcp",
  },

  // 8. Guide: Integrations -> Requests (pending MCP server elicitation cards)
  {
    name: "mcp-requests.png",
    outDir: OUT_GUIDE,
    viewport: { width: 960, height: 600 },
    scenario: "requests-waiting",
    urlPath: "/ui/settings/",
    tabHash: "requests",
  },

  // 9. Guide: Integrations -> Requests answer dialog open
  {
    name: "mcp-request-dialog.png",
    outDir: OUT_GUIDE,
    viewport: { width: COLUMN_WIDTH, height: 680 },
    scenario: "requests-waiting",
    urlPath: "/ui/settings/",
    tabHash: "requests",
    afterLoad: async (page) => {
      const answerBtn = await page.$(".request-card button");
      if (answerBtn) {
        await answerBtn.click();
        await page.waitForSelector("dialog.request-dialog[open]");
        await page.waitForTimeout(250);
      }
    },
  },

  // 10. Guide: Models & keys tab (Models catalog, Endpoint, API keys connections)
  {
    name: "models-and-keys.png",
    outDir: OUT_GUIDE,
    viewport: { width: 960, height: 760 },
    scenario: "signed-in",
    urlPath: "/ui/settings/",
    tabHash: "models-keys",
    customRoutes: routeModels,
  },

  // 11. Guide: Appearance tab (Always show in Dock / taskbar toggle)
  {
    name: "appearance.png",
    outDir: OUT_GUIDE,
    viewport: { width: 960, height: 480 },
    scenario: "signed-in",
    urlPath: "/ui/settings/",
    tabHash: "appearance",
  },
];

async function main() {
  console.log(`→ Starting Maximal UI harness from ${MAXIMAL_DIR} on port ${HARNESS_PORT}...`);
  const harness = spawn(
    "bun",
    ["scripts/ui-harness.ts", "--port", String(HARNESS_PORT)],
    {
      cwd: MAXIMAL_DIR,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  harness.stderr.on("data", (chunk) => {
    process.stderr.write(chunk);
  });

  try {
    await waitForHarness();
    const browser = await chromium.launch();
    // SHOTS_ONLY=app-dashboard.png,apps.png captures a subset.
    const only = (process.env.SHOTS_ONLY ?? "").split(",").filter(Boolean);
    const shots = only.length ? SHOTS.filter((s) => only.includes(s.name)) : SHOTS;
    try {
      for (const shot of shots) {
        const context = await browser.newContext({
          viewport: shot.viewport,
          deviceScaleFactor: 2,
          colorScheme: "dark",
          reducedMotion: "reduce",
        });
        const page = await context.newPage();
        await openSurface(page, shot);
        if (shot.section) {
          await isolateSection(page, shot.section);
        }
        if (shot.afterLoad) {
          await shot.afterLoad(page);
        }
        const outPath = resolve(shot.outDir, shot.name);
        const clip = shot.fit ? await contentClip(page) : undefined;
        await page.screenshot({ path: outPath, clip });
        const size = clip ?? shot.viewport;
        console.log(
          `✓ wrote ${outPath.replace(SITE_ROOT + "/", "")} (${size.width * 2}×${size.height * 2} @2x)`,
        );
        await context.close();
      }
    } finally {
      await browser.close();
    }
  } finally {
    harness.kill("SIGTERM");
  }
}

await main();
