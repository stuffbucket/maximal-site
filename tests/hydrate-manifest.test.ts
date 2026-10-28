import { describe, expect, test } from "bun:test";

import { isReleaseAssetUrl, readStableDownloads } from "../src/lib/hydrate-manifest";

const asset = (name: string) =>
  `https://github.com/stuffbucket/maximal/releases/download/v0.4.48/${name}`;

/** The shape mxml.sh/updates/manifest.json serves (schema 2). */
function manifest(downloads: Record<string, { name: string; url: string }>) {
  return {
    schema: 2,
    generated: "2026-10-28T07:47:19.353Z",
    channels: {
      stable: { version: "0.4.48", tag: "v0.4.48", downloads },
    },
  };
}

describe("isReleaseAssetUrl", () => {
  test("accepts a stuffbucket/maximal release asset", () => {
    expect(isReleaseAssetUrl(asset("maximal-v0.4.48-darwin-arm64.dmg"))).toBe(true);
  });

  test.each([
    ["another host", "https://example.com/maximal.dmg"],
    ["another repository", "https://github.com/someone/maximal/releases/download/v1/x.dmg"],
    ["plain http", "http://github.com/stuffbucket/maximal/releases/download/v1/x.dmg"],
    ["credentials", "https://user:pass@github.com/stuffbucket/maximal/releases/download/v1/x.dmg"],
    ["a look-alike host", "https://github.com.evil.example/stuffbucket/maximal/releases/download/v1/x.dmg"],
    ["a path that climbs out", "https://github.com/stuffbucket/maximal/releases/download/../../../evil"],
    ["the bare prefix", "https://github.com/stuffbucket/maximal/releases/download/"],
    ["a javascript: URL", "javascript:alert(1)"],
    ["not a URL", "maximal.dmg"],
  ])("rejects %s", (_, url) => {
    expect(isReleaseAssetUrl(url)).toBe(false);
  });
});

describe("readStableDownloads", () => {
  test("reads the stable channel's macOS and Windows downloads", () => {
    const data = readStableDownloads(
      manifest({
        "macos-arm64-dmg": { name: "maximal.dmg", url: asset("maximal-v0.4.48-darwin-arm64.dmg") },
        "windows-x64-setup": { name: "setup.exe", url: asset("maximal-v0.4.48-windows-x64-setup.exe") },
      }),
    );
    expect(data).toEqual({
      versionLabel: "v0.4.48",
      macDmg: asset("maximal-v0.4.48-darwin-arm64.dmg"),
      winSetup: asset("maximal-v0.4.48-windows-x64-setup.exe"),
      hasWindows: true,
    });
  });

  test("rejects the whole manifest when any link isn't a release asset", () => {
    const data = readStableDownloads(
      manifest({
        "macos-arm64-dmg": { name: "maximal.dmg", url: "https://example.com/maximal.dmg" },
        "windows-x64-setup": { name: "setup.exe", url: asset("maximal-v0.4.48-windows-x64-setup.exe") },
      }),
    );
    expect(data).toBeNull();
  });

  test("returns null for another schema", () => {
    expect(readStableDownloads({ schema: 1, channels: {} })).toBeNull();
  });
});
