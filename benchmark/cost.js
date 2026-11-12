'use strict';

// Tokens, tool calls, and cost of one run, from the measurement rows of `measure.js` and the
// corpus price table. Claude Code records no cost, so its cost is an estimate from token counts
// and the dated price table; opencode records a cost per message, which is used as it stands.
// A model whose cost cannot be computed has `cost: null`, shown as "no price" and never as zero.
// The price table shape, `findPrice`, and `priceFromTable` live in `sai/tools/model-prices.js`, shared with the change telemetry.

const { findPrice, priceFromTable } = require('../sai/tools/model-prices');

const TOKEN_FIELDS = ['input', 'output', 'cacheRead', 'cacheWrite5m', 'cacheWrite1h', 'cacheWrite'];

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

module.exports = { summarizeRun };
