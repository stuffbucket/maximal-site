// Build-time release resolution for the landing page (Hero/GetStarted via
// lib/downloads.ts).
//
// SOURCE OF TRUTH — the static manifest at `public/updates/manifest.json`.
// stuffbucket/maximal's release.yml writes it (scripts/write-updates-manifest.ts)
// and serves it at https://mxml.sh/updates/manifest.json. The mxml.sh build
// (.github/workflows/build-mxml.yml) copies maximal's current file over this
// one before building; the committed copy here only feeds the preview build.
// The build makes no GitHub API call, so it is deterministic and offline.
// The manifest is imported directly (Vite inlines it at build time).
//
// The site layers runtime hydration (#221) OVER this: hydrate-downloads.ts
// re-fetches /updates/manifest.json in the browser so a release advertises
// itself without a rebuild. This build-time read is the server-rendered,
// fail-closed fallback (no-JS, crawlers, a failed manifest fetch) — it always
// bakes a real version + direct download links, never an empty/broken page.

import type { DownloadSlot, ManifestDownload, UpdateManifest } from "./updates-manifest";
import { MANIFEST_SCHEMA_VERSION } from "./updates-manifest";
// The committed static manifest is the build-time source of truth. Import it
// directly so Vite inlines it at build time (a file-relative fs read via
// import.meta.url does NOT survive Astro/Vite bundling — it resolved to the
// wrong path and silently fell back to "no release").
import rawManifest from "../../public/updates/manifest.json";

export interface ReleaseAsset {
  /** Asset filename, e.g. "maximal-v0.4.39-windows-x64-setup.exe". */
  name: string;
  /** Direct browser download URL for the asset. */
  url: string;
}

export interface ReleaseInfo {
  /** The advertised release tag, e.g. "v0.4.39", or null when the manifest
   *  carries no such channel. */
  tag: string | null;
  hasRelease: boolean;
  /** Release assets, derived from the manifest channel's `downloads` map. */
  assets: ReleaseAsset[];
}

const NO_RELEASE: ReleaseInfo = { tag: null, hasRelease: false, assets: [] };

let cachedManifest: UpdateManifest | null | undefined;

/** Validate the imported static manifest once. Returns null when it isn't a
 *  schema-2 document (⇒ callers resolve "no release", and the site keeps its
 *  release-independent baked fallback). */
function loadManifest(): UpdateManifest | null {
  if (cachedManifest !== undefined) return cachedManifest;
  cachedManifest = validateManifest(rawManifest);
  return cachedManifest;
}

function validateManifest(doc: unknown): UpdateManifest | null {
  if (typeof doc !== "object" || doc === null) return null;
  const manifest = doc as { schema?: unknown; channels?: unknown };
  if (manifest.schema !== MANIFEST_SCHEMA_VERSION) return null;
  if (typeof manifest.channels !== "object" || manifest.channels === null) {
    return null;
  }
  return doc as UpdateManifest;
}

/** Flatten a channel's keyed `downloads` map into the flat asset list the site
 *  build (downloads.ts) and the manifest route already consume. */
function channelAssets(
  downloads: Partial<Record<DownloadSlot, ManifestDownload>> | undefined,
): ReleaseAsset[] {
  if (!downloads) return [];
  const out: ReleaseAsset[] = [];
  for (const entry of Object.values(downloads)) {
    if (entry) out.push({ name: entry.name, url: entry.url });
  }
  return out;
}

function resolveChannel(channelName: string): ReleaseInfo {
  const manifest = loadManifest();
  if (!manifest) return NO_RELEASE;
  const channel = manifest.channels[channelName];
  if (!channel || typeof channel.tag !== "string" || !channel.tag) {
    return NO_RELEASE;
  }
  return {
    tag: channel.tag,
    hasRelease: true,
    assets: channelAssets(channel.downloads),
  };
}

/**
 * Resolve the stable release to advertise from the committed static manifest.
 * "Pinning" is now purely a manifest-data concern: the tag this returns is
 * whatever `channels.stable` in public/updates/manifest.json names.
 */
export function resolveLatestRelease(): ReleaseInfo {
  return resolveChannel("stable");
}

/** Resolve the beta/prerelease channel from the committed manifest (absent ⇒
 *  no prerelease advertised, same as the old empty-list result). */
export function resolveLatestPrerelease(): ReleaseInfo {
  return resolveChannel("beta");
}
