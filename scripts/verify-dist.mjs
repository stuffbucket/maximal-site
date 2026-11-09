// Post-build guard: assert the built dist/ will render correctly once it is
// published — so a regression FAILS THE BUILD instead of silently shipping a
// broken page. Run after `astro build`, before any artifact upload.
//
// The same build serves two places (see astro.config.mjs):
//   - this repo's preview at stuffbucket.github.io/maximal-site (the defaults);
//   - mxml.sh at the root (SITE_URL=https://mxml.sh SITE_BASE=/), assembled by
//     stuffbucket/maximal's Pages deploy, which adds CNAME, /updates and /apt.
// Root-relative URLs outside the base render locally but 404 once deployed,
// so reject them, and reject anything left pointing at the other base.
//
// Exits non-zero with a precise message on any violation.
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIST = resolve(HERE, "..", "dist");
const SITE = process.env.SITE_URL || "https://stuffbucket.github.io";
const BASE = (process.env.SITE_BASE ?? "/maximal-site").replace(/\/$/, "");
const SITE_URL = `${SITE}${BASE}/`;
const CANONICAL_ORIGIN = "https://mxml.sh";
const isCanonicalBuild = SITE_URL === `${CANONICAL_ORIGIN}/`;

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

// The custom domain belongs to stuffbucket/maximal's deploy, which adds CNAME.
if (existsSync(join(DIST, "CNAME"))) {
  errors.push("dist/CNAME exists, but the custom domain is added by stuffbucket/maximal's deploy.");
}

// Every root-relative HTML asset or route must stay inside the base, and no
// HTML or CSS may still name the preview's /maximal-site/ path in a root build.
const html = walk(DIST, (n) => n.endsWith(".html"));
const css = existsSync(join(DIST, "_astro"))
  ? walk(join(DIST, "_astro"), (n) => n.endsWith(".css"))
  : [];
const rootUrlRe = /(?:src|href)="(\/(?!\/)[^"]*)"/g;
for (const file of html) {
  const rel = file.slice(DIST.length + 1);
  const body = readFileSync(file, "utf8");
  if (BASE) {
    const badUrls = [...body.matchAll(rootUrlRe)]
      .map((match) => match[1])
      .filter((url) => url !== BASE && !url.startsWith(`${BASE}/`));
    if (badUrls.length > 0) {
      errors.push(
        `${rel}: root-relative URL(s) escape ${BASE}: ${[...new Set(badUrls)].join(", ")}`,
      );
    }
  }

  if (!body.includes(`<link rel="canonical" href="${CANONICAL_ORIGIN}/`)) {
    errors.push(`${rel}: no canonical link to ${CANONICAL_ORIGIN}.`);
  }
  const noindex = body.includes('<meta name="robots" content="noindex"');
  if (isCanonicalBuild && noindex) {
    errors.push(`${rel}: the ${CANONICAL_ORIGIN} build must not be noindex.`);
  } else if (!isCanonicalBuild && !noindex) {
    errors.push(`${rel}: the preview build must be noindex so it doesn't compete with ${CANONICAL_ORIGIN}.`);
  }
}
if (!BASE) {
  for (const file of [...html, ...css]) {
    if (readFileSync(file, "utf8").includes("/maximal-site/")) {
      errors.push(`${file.slice(DIST.length + 1)}: still references /maximal-site/ in a root build.`);
    }
  }
}

const guidePages = html.filter((file) => file.startsWith(join(DIST, "guide")));
if (guidePages.length < 2) {
  errors.push("dist/guide contains no routed guide pages.");
}

// The core styling/entry assets actually exist (a build that emitted zero
// CSS would "render" but be blank — belt-and-braces).
if (css.length === 0) {
  errors.push("dist/_astro contains no .css — the styled build didn't emit.");
}
if (!existsSync(join(DIST, "favicon.svg"))) {
  errors.push("dist/favicon.svg is missing.");
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
  `verify-dist: OK — ${SITE_URL}: no CNAME, ${html.length} HTML file(s) stay within ${BASE || "/"}, ${css.length} CSS asset(s) present.`,
);
