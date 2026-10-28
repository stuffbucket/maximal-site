// Build-time reader for the curated GitHub Copilot model catalog committed at
// `public/models/copilot.json` (generated via `pnpm run models:sync` from
// `stuffbucket/model-catalog` / `anomalyco/models.dev`).
//
// Like `src/lib/downloads.ts`, this module reads the committed JSON directly on
// disk so `astro build` never performs a live network lookup.

import rawCatalog from "../../public/models/copilot.json";

export interface CopilotCatalogModel {
  id: string;
  name: string;
  vendor: string;
  family: string | null;
  description: string | null;
  releaseDate: string | null;
  lastUpdated: string | null;
  knowledgeCutoff: string | null;
  canonicalModelId: string | null;
  modalities: {
    input: string[];
    output: string[];
  };
  limits: {
    contextTokens: number | null;
    inputTokens: number | null;
    outputTokens: number | null;
  };
  capabilities: {
    vision: boolean;
    toolCalls: boolean;
    reasoning: boolean;
    structuredOutput: boolean;
    attachments: boolean;
  };
}

export interface CopilotCatalogDocument {
  schemaVersion: 1;
  provider: {
    id: string;
    name: string;
    sourceRepository: string;
    upstreamRepository: string;
  };
  count: number;
  models: CopilotCatalogModel[];
}

export interface EditorialVendorGroup {
  icon: "claude" | "openai" | "gemini";
  glyph: string;
  headline: string;
  note: string;
  tiers: string;
  flagship: CopilotCatalogModel;
  models: CopilotCatalogModel[];
}

export function getCopilotCatalog(): CopilotCatalogDocument {
  return rawCatalog as CopilotCatalogDocument;
}

export function formatTokensCompact(n: number | null): string {
  if (!n || n <= 0) return "";
  if (n >= 1_000_000) return `${Math.round(n / 100_000) / 10}M context`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K context`;
  return `${n} tokens`;
}

/**
 * Group the current generation of Copilot models by vendor for editorial display,
 * pairing each family with a sculptural display glyph derived from its current
 * flagship generation (e.g., "5" for Claude Fable 5.1 / Opus 5.5 / Sonnet 5.5,
 * "6" for GPT-6.1 Sol / Terra, "4" for Gemini 4 Argon / Grok 4.7).
 */
export function getEditorialModelGroups(): EditorialVendorGroup[] {
  const { models } = getCopilotCatalog();
  const byId = new Map(models.map((m) => [m.id, m]));

  const pick = (ids: string[]): CopilotCatalogModel[] =>
    ids.map((id) => byId.get(id)).filter((m): m is CopilotCatalogModel => Boolean(m));

  const anthropicModels = pick([
    "claude-opus-5.5",
    "claude-sonnet-5.5",
    "claude-sonnet-5",
    "claude-haiku-5.5",
  ]);

  const openaiModels = pick([
    "gpt-6.1-sol",
    "gpt-6.1-terra",
    "gpt-6-astra",
    "gpt-6-luna",
    "gpt-5.6-luna",
  ]);

  const frontierOthers = pick([
    "gemini-4-argon",
    "gemini-3.8-flash",
    "grok-4.7",
    "kimi-k3",
  ]);

  return [
    {
      icon: "claude",
      glyph: "5",
      headline: "Claude 5.5",
      note: "Anthropic’s Opus, Sonnet, and Haiku models for long-horizon coding, reasoning, and writing.",
      tiers: "Opus 5.5 · Sonnet 5.5 · Haiku 5.5",
      flagship: anthropicModels[0] ?? models[0],
      models: anthropicModels,
    },
    {
      icon: "openai",
      glyph: "6",
      headline: "GPT-6.1",
      note: "OpenAI’s frontier models for reasoning, coding, and visual analysis.",
      tiers: "GPT-6.1 Sol / Terra · 6 Astra / Luna · 5.6",
      flagship: openaiModels[0] ?? models[0],
      models: openaiModels,
    },
    {
      icon: "gemini",
      glyph: "4",
      headline: "Gemini 4 and Grok 4.7",
      note: "Large-context reasoning and fast synthesis models from Google, xAI, and Moonshot AI.",
      tiers: "Gemini 4 Argon · 3.8 Flash · Grok 4.7 · Kimi K3",
      flagship: frontierOthers[0] ?? models[0],
      models: frontierOthers,
    },
  ];
}
