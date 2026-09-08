// Post-build guard: assert the built dist/ will render correctly once the
// GitHub Pages deploy action publishes it — so a regression FAILS THE DEPLOY
// instead of silently shipping a broken page. Run after `astro build`, before
// the artifact upload (wired into .github/workflows/deploy-pages.yml).
//
// GitHub Pages serves this repository below /maximal-site/. Root-relative URLs
// outside that base render locally but 404 after deployment, so reject them.
//
// Exits non-zero with a precise message on any violation.
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIST = resolve(HERE, "..", "dist");
const SITE_URL = "https://stuffbucket.github.io/maximal-site/";
const BASE = "/maximal-site";

const errors = [];

/** All files under a dir whose name matches `test`, recursively. */
function walk(dir, test, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, test, out);
    else if (test(name)) out.push(p);
  }
  return out;
}

// A GitHub Pages project URL is not a custom domain and must not emit CNAME.
const cnamePath = join(DIST, "CNAME");
if (existsSync(cnamePath)) {
  errors.push("dist/CNAME exists, but project Pages must use the github.io URL.");
}

// Every root-relative HTML asset or route must stay inside the project base.
const html = walk(DIST, (n) => n.endsWith(".html"));
const rootUrlRe = /(?:src|href)="(\/(?!\/)[^"]*)"/g;
for (const file of html) {
  const body = readFileSync(file, "utf8");
  const badUrls = [...body.matchAll(rootUrlRe)]
    .map((match) => match[1])
    .filter((url) => url !== BASE && !url.startsWith(`${BASE}/`));
  if (badUrls.length > 0) {
    const rel = file.slice(DIST.length + 1);
    errors.push(
      `${rel}: root-relative URL(s) escape ${BASE}: ${[...new Set(badUrls)].join(", ")}`,
    );
  }
}

const guidePages = html.filter((file) => file.startsWith(join(DIST, "guide")));
if (guidePages.length < 2) {
  errors.push("dist/guide contains no routed guide pages.");
}

// 3. The core styling/entry assets actually exist (a build that emitted zero
//    CSS would "render" but be blank — belt-and-braces).
const astroDir = join(DIST, "_astro");
const css = existsSync(astroDir)
  ? walk(astroDir, (n) => n.endsWith(".css"))
  : [];
if (css.length === 0) {
  errors.push("dist/_astro contains no .css — the styled build didn't emit.");
}
if (!existsSync(join(DIST, "favicon.svg"))) {
  errors.push("dist/favicon.svg is missing.");
}

// The historical /maximal/ path inside the project redirects to its root.
const redirectPath = join(DIST, "maximal", "index.html");
if (!existsSync(redirectPath)) {
  errors.push(
    "dist/maximal/index.html is missing — the legacy /maximal/ path (old app DOWNLOAD_URL) would 404. It lives at public/maximal/index.html.",
  );
} else {
  const body = readFileSync(redirectPath, "utf8");
  if (!body.includes(`url=${BASE}/`) || !body.includes(`location.replace("${BASE}/"`)) {
    errors.push(
      `dist/maximal/index.html does not redirect to ${BASE}/.`,
    );
  }
}

if (errors.length > 0) {
  console.error("verify-dist: FAILED\n");
  for (const e of errors) console.error(`  ✗ ${e}`);
  console.error(
    `\n${errors.length} problem(s). The built site would not render correctly at ${SITE_URL}.`,
  );
  process.exit(1);
}

console.log(
  `verify-dist: OK — no CNAME, ${html.length} HTML file(s) stay within ${BASE}, ${css.length} CSS asset(s) present.`,
);
