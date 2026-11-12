'use strict';

// The model price table and the pricing helpers shared by the SAI tools that put a money figure on
// token counts: `change-telemetry.js` (the estimated cost of a Claude Code request and the overcost of
// a cache miss) and the outcome benchmark (`benchmark/cost.js`, whose corpus brings its own table of
// the same shape).
//
// Prices are USD per million tokens, copied from the provider's published price list on the date the
// table states (https://platform.claude.com/docs/en/about-claude/pricing). A model that has no entry
// has no price: its figures are unavailable, never zero. Add an entry when a model is not listed, and
// change `date` together with every value you refresh. Haiku 5.5 is left out on purpose: its published
// price depends on the prompt length (up to or over 100,000 tokens), which a single entry cannot hold.

const PRICES = {
  date: '2026-11-12',
  models: {
    'claude-fable-5-2': { inputPerMTok: 8, outputPerMTok: 40, cacheReadPerMTok: 0.2, cacheWrite5mPerMTok: 10, cacheWrite1hPerMTok: 16 },
    'claude-opus-5-5': { inputPerMTok: 4, outputPerMTok: 20, cacheReadPerMTok: 0.2, cacheWrite5mPerMTok: 5, cacheWrite1hPerMTok: 8 },
    'claude-opus-5': { inputPerMTok: 5, outputPerMTok: 25, cacheReadPerMTok: 0.5, cacheWrite5mPerMTok: 6.25, cacheWrite1hPerMTok: 10 },
    'claude-opus-4-8': { inputPerMTok: 5, outputPerMTok: 25, cacheReadPerMTok: 0.5, cacheWrite5mPerMTok: 6.25, cacheWrite1hPerMTok: 10 },
    'claude-opus-4-7': { inputPerMTok: 5, outputPerMTok: 25, cacheReadPerMTok: 0.5, cacheWrite5mPerMTok: 6.25, cacheWrite1hPerMTok: 10 },
    'claude-opus-4-6': { inputPerMTok: 5, outputPerMTok: 25, cacheReadPerMTok: 0.5, cacheWrite5mPerMTok: 6.25, cacheWrite1hPerMTok: 10 },
    'claude-opus-4-5': { inputPerMTok: 5, outputPerMTok: 25, cacheReadPerMTok: 0.5, cacheWrite5mPerMTok: 6.25, cacheWrite1hPerMTok: 10 },
    'claude-sonnet-5-5': { inputPerMTok: 2, outputPerMTok: 10, cacheReadPerMTok: 0.1, cacheWrite5mPerMTok: 2.5, cacheWrite1hPerMTok: 4 },
    'claude-sonnet-5': { inputPerMTok: 2, outputPerMTok: 10, cacheReadPerMTok: 0.2, cacheWrite5mPerMTok: 2.5, cacheWrite1hPerMTok: 4 },
    'claude-sonnet-4-6': { inputPerMTok: 3, outputPerMTok: 15, cacheReadPerMTok: 0.3, cacheWrite5mPerMTok: 3.75, cacheWrite1hPerMTok: 6 },
    'claude-sonnet-4-5': { inputPerMTok: 3, outputPerMTok: 15, cacheReadPerMTok: 0.3, cacheWrite5mPerMTok: 3.75, cacheWrite1hPerMTok: 6 },
    'claude-haiku-4-5': { inputPerMTok: 1, outputPerMTok: 5, cacheReadPerMTok: 0.1, cacheWrite5mPerMTok: 1.25, cacheWrite1hPerMTok: 2 },
  },
};

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

module.exports = { PRICES, PER_MILLION, findPrice, priceFromTable };
