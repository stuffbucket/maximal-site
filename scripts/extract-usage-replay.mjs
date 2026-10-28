#!/usr/bin/env node
/**
 * Extract an anonymized usage replay from the local maximal token-usage
 * database into `src/data/usage-replay.json`.
 *
 * The landing page's live dashboard overlay (ShowTell.astro) and the dashboard
 * screenshot (scripts/gen-screenshots.mjs) both replay this file, so their
 * numbers move the way a real dashboard's do.
 *
 * The output is a set of parallel vectors, one entry per request: the time
 * since the previous request, a model index, and the four token counts. No
 * trace, session, user, project or endpoint fields leave the database, and
 * cost appears only as a per-model total for the dashboard screenshot.
 *
 *   node scripts/extract-usage-replay.mjs 2026-10-27T13:10:00Z [minutes=10]
 *
 * Reads COPILOT_API_SQLITE_DB_PATH, or ~/.local/share/maximal/copilot-api.sqlite.
 * The database is opened read-only.
 */

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, "..", "src", "data", "usage-replay.json");
const DB =
  process.env.COPILOT_API_SQLITE_DB_PATH ??
  resolve(homedir(), ".local/share/maximal/copilot-api.sqlite");

const MINUTE_MS = 60_000;
const HISTORY_MINUTES = 14; // + the current minute = the dashboard's 15
const BASE_SCALE = 6; // "today so far" ≈ an hour of this window's activity

const startArg = process.argv[2];
const minutes = Number(process.argv[3] ?? 10);
const startMs = Date.parse(startArg ?? "");
if (!Number.isFinite(startMs) || startMs % MINUTE_MS !== 0 || !(minutes > 0)) {
  console.error(
    "usage: node scripts/extract-usage-replay.mjs <ISO start on a whole minute> [minutes]",
  );
  process.exit(1);
}
const endMs = startMs + minutes * MINUTE_MS;

function query(sql) {
  const out = execFileSync(
    "sqlite3",
    ["-readonly", "-json", `file:${DB}?mode=ro`, sql],
    { encoding: "utf8" },
  );
  return out.trim() ? JSON.parse(out) : [];
}

const historyStart = startMs - HISTORY_MINUTES * MINUTE_MS;
const buckets = query(`
  SELECT (created_at_ms / ${MINUTE_MS}) * ${MINUTE_MS} AS minute_ms,
         SUM(total_tokens) AS total_tokens
  FROM token_usage_events
  WHERE created_at_ms >= ${historyStart} AND created_at_ms < ${startMs}
  GROUP BY minute_ms`);
const history = Array.from({ length: HISTORY_MINUTES }, (_, i) => {
  const minute = historyStart + i * MINUTE_MS;
  return Number(buckets.find((b) => b.minute_ms === minute)?.total_tokens ?? 0);
});

const rows = query(`
  SELECT created_at_ms, model, input_tokens, output_tokens,
         cache_read_input_tokens, cache_creation_input_tokens, total_nano_aiu
  FROM token_usage_events
  WHERE created_at_ms >= ${startMs} AND created_at_ms < ${endMs}
  ORDER BY created_at_ms, id`);

const models = [...new Set(rows.map((r) => r.model))];
const offsets = rows.map((r) => r.created_at_ms - startMs);
const requests = {
  /** ms since the previous request (the first is ms since the start). */
  dtMs: offsets.map((t, i) => t - (i ? offsets[i - 1] : 0)),
  /** Index into `models`. */
  model: rows.map((r) => models.indexOf(r.model)),
  input: rows.map((r) => r.input_tokens),
  output: rows.map((r) => r.output_tokens),
  cacheRead: rows.map((r) => r.cache_read_input_tokens),
  cacheWrite: rows.map((r) => r.cache_creation_input_tokens),
};

/** "Today so far" when the replay starts: the window's per-model totals
 *  scaled up, so the dashboard opens mid-session rather than at zero. */
const baseByModel = models
  .map((model, m) => {
    const idx = requests.model.flatMap((v, i) => (v === m ? [i] : []));
    const sum = (vec) => idx.reduce((acc, i) => acc + vec[i], 0) * BASE_SCALE;
    const row = {
      model,
      request_count: idx.length * BASE_SCALE,
      input_tokens: sum(requests.input),
      output_tokens: sum(requests.output),
      cache_read_input_tokens: sum(requests.cacheRead),
      cache_creation_input_tokens: sum(requests.cacheWrite),
      total_nano_aiu:
        idx.reduce((acc, i) => acc + rows[i].total_nano_aiu, 0) * BASE_SCALE,
    };
    row.total_tokens =
      row.input_tokens +
      row.output_tokens +
      row.cache_read_input_tokens +
      row.cache_creation_input_tokens;
    return row;
  })
  .sort((a, b) => b.total_tokens - a.total_tokens);

const replay = {
  description:
    "Anonymized replay of real maximal token usage: per-request timing and token counts as parallel vectors.",
  durationMs: endMs - startMs,
  /** Tokens per minute for the 14 whole minutes before the replay starts. */
  history,
  models,
  requests,
  baseByModel,
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, `${JSON.stringify(replay)}\n`);
console.log(
  `✓ ${rows.length} requests over ${minutes} min, ${models.length} models → ${OUT.replace(resolve(HERE, "..") + "/", "")}`,
);
