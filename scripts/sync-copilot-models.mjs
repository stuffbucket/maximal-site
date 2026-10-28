#!/usr/bin/env node
/**
 * Sync the curated GitHub Copilot model catalog into `public/models/copilot.json`.
 *
 * Source of truth:
 *   1. `stuffbucket/model-catalog` release asset (`maximal-model-catalog-v1.json`)
 *      when a release pin or latest release asset is published;
 *   2. Upstream `anomalyco/models.dev` (`https://models.dev/api.json`), the
 *      canonical upstream feed curated by `stuffbucket/model-catalog`.
 *
 * The generated JSON is committed to `public/models/copilot.json` so Astro
 * builds and client pages have the full, sanitized Copilot model list at build
 * time with zero live network lookup required.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = resolve(HERE, "..", "public", "models", "copilot.json");

const VENDOR_BY_PREFIX = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  google: "Google",
  xai: "xAI",
  "x-ai": "xAI",
  moonshotai: "Moonshot AI",
  microsoft: "Microsoft",
};

function inferVendor(id, canonicalId, family) {
  if (typeof canonicalId === "string" && canonicalId.includes("/")) {
    const prefix = canonicalId.split("/")[0].toLowerCase();
    if (VENDOR_BY_PREFIX[prefix]) return VENDOR_BY_PREFIX[prefix];
  }
  const slug = `${id} ${family ?? ""}`.toLowerCase();
  if (slug.includes("claude")) return "Anthropic";
  if (slug.includes("gpt")) return "OpenAI";
  if (slug.includes("gemini")) return "Google";
  if (slug.includes("grok")) return "xAI";
  if (slug.includes("kimi")) return "Moonshot AI";
  if (slug.includes("mai")) return "Microsoft";
  return "GitHub Copilot";
}

function sanitizeText(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().replace(/[\u0000-\u001F\u007F]/g, "");
  return trimmed.length > 0 ? trimmed : null;
}

async function fetchModelsDevCopilot() {
  const res = await fetch("https://models.dev/api.json");
  if (!res.ok) {
    throw new Error(`Failed to fetch models.dev catalog: HTTP ${res.status}`);
  }
  const data = await res.json();
  const copilot = data?.["github-copilot"];
  if (!copilot || typeof copilot.models !== "object") {
    throw new Error("github-copilot provider missing from catalog response");
  }

  const models = Object.values(copilot.models)
    .map((m) => {
      const id = sanitizeText(m.id);
      const name = sanitizeText(m.name);
      if (!id || !name) return null;
      // Exclude Fable entries that are not part of the real Copilot set
      if (id.startsWith("claude-fable")) return null;
      const canonicalModelId = sanitizeText(m.canonical_model_id);
      const family = sanitizeText(m.family);
      const vendor = inferVendor(id, canonicalModelId, family);
      return {
        id,
        name,
        vendor,
        family,
        description: sanitizeText(m.description),
        releaseDate: sanitizeText(m.release_date),
        lastUpdated: sanitizeText(m.last_updated),
        knowledgeCutoff: sanitizeText(m.knowledge),
        canonicalModelId,
        modalities: {
          input: Array.isArray(m.modalities?.input) ? m.modalities.input : ["text"],
          output: Array.isArray(m.modalities?.output) ? m.modalities.output : ["text"],
        },
        limits: {
          contextTokens:
            typeof m.limit?.context === "number" ? m.limit.context : null,
          inputTokens:
            typeof m.limit?.input === "number" ? m.limit.input : null,
          outputTokens:
            typeof m.limit?.output === "number" ? m.limit.output : null,
        },
        capabilities: {
          vision: Array.isArray(m.modalities?.input)
            ? m.modalities.input.includes("image") || m.modalities.input.includes("pdf")
            : false,
          toolCalls: Boolean(m.tool_call),
          reasoning: Boolean(m.reasoning),
          structuredOutput: Boolean(m.structured_output),
          attachments: Boolean(m.attachment),
        },
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      const dateCmp = (b.releaseDate ?? "").localeCompare(a.releaseDate ?? "");
      if (dateCmp !== 0) return dateCmp;
      return a.id.localeCompare(b.id);
    });

  return {
    schemaVersion: 1,
    provider: {
      id: "github-copilot",
      name: "GitHub Copilot",
      sourceRepository: "stuffbucket/model-catalog",
      upstreamRepository: "anomalyco/models.dev",
    },
    count: models.length,
    models,
  };
}

const catalog = await fetchModelsDevCopilot();
mkdirSync(dirname(OUT_PATH), { recursive: true });
writeFileSync(OUT_PATH, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
console.log(
  `✓ synced ${catalog.count} GitHub Copilot models → public/models/copilot.json`,
);
