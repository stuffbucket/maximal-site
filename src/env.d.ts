/// <reference types="astro/client" />

// The site has no @types/node dependency, but astro.config.mjs (type-checked
// through // @ts-check) reads SITE_URL and SITE_BASE from `process.env`.
// Declare the narrow surface we use so `tsc` is clean without pulling in all
// of @types/node.
declare const process: {
  env: Record<string, string | undefined>;
};
