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
import { existsSync, mkdirSync, readFileSync } from "node:fs";
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

const REFRESHED_MODELS = {
  count: COPILOT_CATALOG.count,
  loaded_at: "2026-10-27T18:00:00.000Z",
  models: COPILOT_CATALOG.models.map((m) => ({
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

const SHOTS = [
  // 1. Landing: Dashboard view inside the unified window
  {
    name: "app-dashboard.png",
    outDir: OUT_LANDING,
    viewport: { width: 1000, height: 720 },
    scenario: "signed-in",
    urlPath: "/ui/settings/",
    tabHash: "dashboard",
    customRoutes: async (page) => {
      // The harness answers /token-usage with its own fixture (camelCase
      // `byModel`, `recent_minutes`); replace the parts the landing page's
      // live sparkline overlay (ShowTell.astro, `.spark-zoom`) must agree
      // with: the same two models and the same 15-minute rate series.
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
    },
    afterLoad: async (page) => {
      // Wait for embedded dashboard iframe to finish rendering
      const frameEl = await page.waitForSelector("[data-dashboard-frame]");
      const frame = await frameEl.contentFrame();
      if (frame) {
        await frame.waitForSelector("#content-area h2", { timeout: 10_000 });
        await frame.addStyleTag({ content: "#__harness { display: none !important; }" });
      }
      // "1 day": the replay's totals are today-so-far figures.
      const dayBtn = await page.$('[data-dashboard-period="day"]');
      if (dayBtn) await dayBtn.click();
      await page.waitForTimeout(400);
      if (frame) {
        // Log where the landmarks the landing overlay must clear sit, as a
        // fraction of the capture, so `.spark-zoom` can be positioned without
        // opening the PNG.
        const box = await frameEl.boundingBox();
        const vp = page.viewportSize();
        const marks = await frame.evaluate(() => {
          const pick = (sel) => {
            const el = document.querySelector(sel);
            if (!el) return null;
            const r = el.getBoundingClientRect();
            return { text: el.textContent.trim().replace(/\s+/g, " ").slice(0, 40), left: r.left, top: r.top, right: r.right, bottom: r.bottom };
          };
          return {
            quotaUsed: pick(".meter-state--headline"),
            rate: pick(".rate"),
            rateValue: pick(".rate__value"),
            byModel: [...document.querySelectorAll("#token-usage tbody tr td:first-child")]
              .map((td) => td.textContent.trim())
              .slice(0, 8),
          };
        });
        const pct = (x, total) => `${((x / total) * 100).toFixed(1)}%`;
        for (const [key, r] of Object.entries(marks)) {
          if (!r || Array.isArray(r)) continue;
          console.log(
            `  · ${key} "${r.text}": left ${pct(box.x + r.left, vp.width)}, right ${pct(box.x + r.right, vp.width)}, top ${pct(box.y + r.top, vp.height)}, bottom ${pct(box.y + r.bottom, vp.height)}`,
          );
        }
        console.log(`  · by model: ${marks.byModel.join(", ")}`);
      }
    },
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

  // 3. Landing: Step 3 — Integrations -> Apps (Claude Code, Claude Desktop, Codex)
  {
    name: "apps.png",
    outDir: OUT_LANDING,
    viewport: { width: 1000, height: 760 },
    scenario: "signed-in",
    urlPath: "/ui/settings/",
    tabHash: "integrations",
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

  // 4. Guide: Account connected + multi-account switcher ("Switch to")
  {
    name: "account-connected.png",
    outDir: OUT_GUIDE,
    viewport: { width: 960, height: 640 },
    scenario: "signed-in",
    urlPath: "/ui/settings/",
    tabHash: "account",
  },

  // 5. Guide: Integrations -> MCP servers (Work IQ enabled & expanded)
  {
    name: "mcp-servers.png",
    outDir: OUT_GUIDE,
    viewport: { width: 960, height: 640 },
    scenario: "signed-in",
    urlPath: "/ui/settings/",
    tabHash: "mcp",
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

  // 6. Guide: Integrations -> MCP catalog ("Available to add" Work IQ)
  {
    name: "mcp-available-to-add.png",
    outDir: OUT_GUIDE,
    viewport: { width: 960, height: 560 },
    scenario: "mcp-found",
    urlPath: "/ui/settings/",
    tabHash: "mcp",
  },

  // 7. Guide: Integrations -> Requests (pending MCP server elicitation cards)
  {
    name: "mcp-requests.png",
    outDir: OUT_GUIDE,
    viewport: { width: 960, height: 600 },
    scenario: "requests-waiting",
    urlPath: "/ui/settings/",
    tabHash: "requests",
  },

  // 8. Guide: Integrations -> Requests answer dialog open
  {
    name: "mcp-request-dialog.png",
    outDir: OUT_GUIDE,
    viewport: { width: 960, height: 680 },
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

  // 9. Guide: Models & keys tab (Models catalog, Endpoint, API keys connections)
  {
    name: "models-and-keys.png",
    outDir: OUT_GUIDE,
    viewport: { width: 960, height: 760 },
    scenario: "signed-in",
    urlPath: "/ui/settings/",
    tabHash: "models-keys",
    customRoutes: async (page) => {
      await page.route("**/settings/api/models", (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(REFRESHED_MODELS),
        }),
      );
    },
  },

  // 10. Guide: Appearance tab (Always show in Dock / taskbar toggle)
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
        if (shot.afterLoad) {
          await shot.afterLoad(page);
        }
        const outPath = resolve(shot.outDir, shot.name);
        await page.screenshot({ path: outPath });
        console.log(
          `✓ wrote ${outPath.replace(SITE_ROOT + "/", "")} (${shot.viewport.width * 2}×${shot.viewport.height * 2} @2x)`,
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
