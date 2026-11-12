'use strict';

// Tokens, tool calls, and cost of one run, from the measurement rows of `measure.js` and the
// corpus price table. Claude Code records no cost, so its cost is an estimate from token counts
// and the dated price table; opencode records a cost per message, which is used as it stands.
// A model whose cost cannot be computed has `cost: null`, shown as "no price" and never as zero.

const TOKEN_FIELDS = ['input', 'output', 'cacheRead', 'cacheWrite5m', 'cacheWrite1h', 'cacheWrite'];
// Each token type and the price key that pays for it. Cache writes not split by lifetime pay the 5-minute price.
const PRICE_KEYS = [
  ['input', 'inputPerMTok'],
  ['output', 'outputPerMTok'],
  ['cacheRead', 'cacheReadPerMTok'],
  ['cacheWrite5m', 'cacheWrite5mPerMTok'],
  ['cacheWrite1h', 'cacheWrite1hPerMTok'],
  ['cacheWrite', 'cacheWrite5mPerMTok'],
];
const PER_MILLION = 1_000_000;

const words = (text) => String(text).toLowerCase().split(/[^a-z0-9.]+/).filter(Boolean);

function containsRun(haystack, needle) {
  if (needle.length === 0 || needle.length > haystack.length) return false;
  return haystack.some((_, start) => needle.every((word, offset) => haystack[start + offset] === word));
}

/**
 * The price entry of a recorded model: the key that equals the model, else the longest key whose
 * words appear in the model's words as one run (`haiku` and `claude-haiku-4-5` both match
 * `claude-haiku-4-5-20251001`). Two keys of the same length that both match are ambiguous: no price.
 */
function findPrice(table, model) {
  if (typeof model !== 'string' || model === '') return null;
  if (Object.hasOwn(table.models, model)) return table.models[model];
  const wanted = words(model);
  const matches = Object.keys(table.models).filter((key) => containsRun(wanted, words(key)));
  const longest = Math.max(0, ...matches.map((key) => words(key).length));
  const best = matches.filter((key) => words(key).length === longest);
  return best.length === 1 ? table.models[best[0]] : null;
}

/** The cost of a row from a price entry; null when a token type the row used has no price. */
function priceFromTable(row, entry) {
  if (!entry) return null;
  let total = 0;
  for (const [field, key] of PRICE_KEYS) {
    if (!row[field]) continue;
    if (typeof entry[key] !== 'number') return null;
    total += (row[field] / PER_MILLION) * entry[key];
  }
  return total;
}

function costOfRow(row, entry, harness) {
  if (harness === 'opencode' && row.recordedCost !== null) return row.recordedCost;
  return priceFromTable(row, entry);
}

const sum = (rows, field) => rows.reduce((total, row) => total + row[field], 0);

/**
 * The usage section of a run result. `measured` is the list of measurement rows, or
 * `{ error }` when the harness data could not be read, which leaves every figure absent
 * (the run keeps its classification).
 */
function summarizeRun(measured, harness, prices) {
  if (!Array.isArray(measured)) {
    return { usage: null, usageNote: measured && measured.error ? measured.error : 'no usage was measured' };
  }
  if (measured.length === 0) return { usage: null, usageNote: 'the harness data holds no model request' };
  const models = measured.map((row) => ({
    model: row.model,
    requests: row.requests,
    requestsWithoutUsage: row.requestsWithoutUsage,
    ...Object.fromEntries(TOKEN_FIELDS.map((field) => [field, row[field]])),
    toolCalls: row.toolCalls,
    cost: costOfRow(row, findPrice(prices, row.model), harness),
  }));
  const priced = models.every((model) => model.cost !== null);
  return {
    usage: {
      requests: sum(models, 'requests'),
      requestsWithoutUsage: sum(models, 'requestsWithoutUsage'),
      input: sum(models, 'input'),
      output: sum(models, 'output'),
      cacheRead: sum(models, 'cacheRead'),
      cacheWrite: sum(models, 'cacheWrite5m') + sum(models, 'cacheWrite1h') + sum(models, 'cacheWrite'),
      toolCalls: sum(models, 'toolCalls'),
      cost: priced ? models.reduce((total, model) => total + model.cost, 0) : null,
      unpricedModels: models.filter((model) => model.cost === null).map((model) => model.model ?? 'unknown'),
      models,
    },
  };
}

module.exports = { findPrice, priceFromTable, summarizeRun };
