'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { BenchmarkError } = require('./corpus');
const { INFO_FILE, RUNS_DIR } = require('./runner');

const REPORT_FORMAT = 1;

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function loadResults(outDir) {
  const infoFile = path.join(outDir, INFO_FILE);
  if (!fs.existsSync(infoFile)) throw new BenchmarkError(`${infoFile} is missing: ${outDir} holds no benchmark output`);
  const runsDir = path.join(outDir, RUNS_DIR);
  const results = fs.existsSync(runsDir)
    ? fs.readdirSync(runsDir).filter((name) => name.endsWith('.json')).sort().map((name) => readJson(path.join(runsDir, name)))
    : [];
  return { info: readJson(infoFile), results };
}

function seconds(ms) {
  return (ms / 1000).toFixed(1);
}

function row(cells) {
  return `| ${cells.join(' | ')} |`;
}

function thousands(value) {
  return String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

const figure = (value) => (value === null || value === undefined ? '-' : thousands(value));
const money = (value) => `$${value.toFixed(4)}`;
const COST_NOTE = {
  claude: 'estimated from token counts and the price table',
  opencode: 'as the harness recorded it; the price table prices a model that recorded none',
};

const sumOf = (items, pick) => items.reduce((total, item) => total + pick(item), 0);
const tokensOf = (usage) => usage.input + usage.output + usage.cacheRead + usage.cacheWrite;

function usageCells(result) {
  const { usage } = result;
  return usage
    ? [figure(usage.input), figure(usage.output), figure(usage.cacheRead), figure(usage.cacheWrite), figure(usage.toolCalls)]
    : ['-', '-', '-', '-', '-'];
}

/** The cost of a run, or "no price" when one of its models has none; "-" when the run has no usage. */
function costCell(result) {
  if (!result.usage) return '-';
  return result.usage.cost === null ? 'no price' : money(result.usage.cost);
}

/** Usage lines of the Result section: tokens, tool calls, and cost, in total and per run. */
function usageLines(configuration, info, usageRuns, timedCount) {
  if (usageRuns.length === 0) {
    return [`- Tokens, tool calls, and cost: not measured${timedCount > 0 ? ` (${timedCount} runs without usage data)` : ''}`];
  }
  const usages = usageRuns.map((result) => result.usage);
  const total = (pick) => sumOf(usages, pick);
  const perRun = (amount) => thousands(amount / usageRuns.length);
  const lines = [
    `- Tokens: ${figure(total((usage) => usage.input))} input, ${figure(total((usage) => usage.output))} output, ${figure(total((usage) => usage.cacheRead))} cache read, ${figure(total((usage) => usage.cacheWrite))} cache write in total; ${perRun(total(tokensOf))} per run`,
    `- Tool calls: ${figure(total((usage) => usage.toolCalls))} in total, ${perRun(total((usage) => usage.toolCalls))} per run`,
  ];
  const priced = usages.filter((usage) => usage.cost !== null);
  if (priced.length === 0) {
    lines.push('- Cost: no price');
  } else {
    const cost = sumOf(priced, (usage) => usage.cost);
    const left = usages.length - priced.length;
    const partial = left > 0 ? `; ${left} runs have a model with no price and are left out` : '';
    lines.push(`- Cost: ${money(cost)} in total, ${money(cost / priced.length)} per priced run (${COST_NOTE[configuration.harness]}; price table of ${info.priceTableDate}${partial})`);
  }
  const withoutUsage = total((usage) => usage.requestsWithoutUsage);
  if (withoutUsage > 0) lines.push(`- Requests without recorded usage: ${figure(withoutUsage)} (missing from the figures above)`);
  const unmeasured = timedCount - usageRuns.length;
  if (unmeasured > 0) lines.push(`- Runs without usage data: ${unmeasured} (excluded from the figures above)`);
  return lines;
}

/** One row per model over the measured runs; a model with no price in any run shows "no price". */
function modelRows(usageRuns) {
  const byModel = new Map();
  for (const { usage } of usageRuns) {
    for (const model of usage.models) {
      const name = model.model ?? 'unknown';
      if (!byModel.has(name)) byModel.set(name, { name, requests: 0, input: 0, output: 0, cacheRead: 0, cacheWrite: 0, toolCalls: 0, cost: 0 });
      const entry = byModel.get(name);
      entry.requests += model.requests;
      entry.input += model.input;
      entry.output += model.output;
      entry.cacheRead += model.cacheRead;
      entry.cacheWrite += model.cacheWrite5m + model.cacheWrite1h + model.cacheWrite;
      entry.toolCalls += model.toolCalls;
      entry.cost = entry.cost === null || model.cost === null ? null : entry.cost + model.cost;
    }
  }
  return [...byModel.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function configurationReport(info, configuration, results, regenerate) {
  const expected = info.expectedRuns.filter((run) => run.configuration === configuration.id);
  const done = results.filter((result) => result.configuration === configuration.id);
  const counts = Object.fromEntries(['accepted', 'rejected', 'escalated', 'timeout', 'error'].map((outcome) => [outcome, done.filter((result) => result.outcome === outcome).length]));
  const judged = done.length - counts.error;
  const timed = done.filter((result) => result.outcome !== 'error');
  const wallTotal = timed.reduce((sum, result) => sum + result.wallMs, 0);
  const withQuestions = done.filter((result) => result.cancelledQuestions > 0).length;
  const usageRuns = timed.filter((result) => result.usage);
  const missing = expected.length - done.length;
  const models = Object.entries(configuration.models).map(([role, settings]) => `${role}: ${Object.values(settings).join(' ')}`).join('; ');

  const lines = [
    `# Outcome benchmark: ${configuration.id}`,
    '',
    `Report format ${REPORT_FORMAT}. Regenerate with \`${regenerate}\`.`,
    '',
    '## Provenance',
    '',
    `- Runner commit: ${info.runnerCommit}`,
    `- SAI installation commit: ${info.saiCommit}`,
    `- Corpus: ${info.corpus}`,
    `- Price table date: ${info.priceTableDate}`,
    `- Rounds: ${info.rounds}`,
    `- Time limit per run: ${info.timeLimitSeconds} s`,
    '',
    '## Configuration',
    '',
    `- Harness: ${configuration.harness}`,
    `- Route: ${configuration.route}`,
    `- Models: ${models}`,
    '',
    '## Result',
    '',
    `- Runs: ${done.length} of ${expected.length} completed${missing > 0 ? `; ${missing} missing` : ''}`,
    `- Accepted: ${counts.accepted} of ${judged} judged runs (runs with an infrastructure error are excluded from both numbers)`,
    `- Rejected: ${counts.rejected}`,
    `- Escalated: ${counts.escalated}`,
    `- Timeout: ${counts.timeout}`,
    `- Wall time: ${seconds(wallTotal)} s in total, ${timed.length > 0 ? seconds(wallTotal / timed.length) : '0.0'} s per run (runs with an infrastructure error excluded)`,
    `- Runs with cancelled questions: ${withQuestions}`,
    ...usageLines(configuration, info, usageRuns, timed.length),
    '',
    '## Infrastructure errors (excluded)',
    '',
  ];
  const errors = done.filter((result) => result.outcome === 'error');
  lines.push(errors.length === 0 ? 'None.' : `${errors.length} runs.`, '');
  for (const result of errors) lines.push(`- ${result.run}: ${result.detail}`);
  if (errors.length > 0) lines.push('');

  const modelUsage = modelRows(usageRuns);
  if (modelUsage.length > 0) {
    lines.push('## Usage by model', '', row(['Model', 'Requests', 'Input', 'Output', 'Cache read', 'Cache write', 'Tool calls', 'Cost']), row(['---', '---', '---', '---', '---', '---', '---', '---']));
    for (const model of modelUsage) {
      lines.push(row([model.name, figure(model.requests), figure(model.input), figure(model.output), figure(model.cacheRead), figure(model.cacheWrite), figure(model.toolCalls), model.cost === null ? 'no price' : money(model.cost)]));
    }
    lines.push('');
  }

  lines.push('## Runs', '', row(['Run', 'Round', 'Brief', 'Outcome', 'Hidden suite', 'Wall time (s)', 'Cancelled questions', 'Input', 'Output', 'Cache read', 'Cache write', 'Tool calls', 'Cost', 'Detail']), row(['---', '---', '---', '---', '---', '---', '---', '---', '---', '---', '---', '---', '---', '---']));
  for (const result of done) {
    const suite = result.suite ? `${result.suite.passed}/${result.suite.total}` : 'not run';
    lines.push(row([result.run, result.round, result.brief, result.outcome, suite, seconds(result.wallMs), result.cancelledQuestions, ...usageCells(result), costCell(result), result.detail.replace(/\|/g, '\\|')]));
  }
  lines.push('');
  return lines.join('\n');
}

/** One Markdown report per configuration, built only from the saved output folder. */
function buildReports(outDir, { regenerate }) {
  const { info, results } = loadResults(outDir);
  return Object.fromEntries(info.configurations.map((configuration) => [`report-${configuration.id}.md`, configurationReport(info, configuration, results, regenerate)]));
}

function writeReports(outDir, options) {
  const reports = buildReports(outDir, options);
  for (const [name, text] of Object.entries(reports)) fs.writeFileSync(path.join(outDir, name), text);
  return Object.keys(reports);
}

module.exports = { REPORT_FORMAT, buildReports, writeReports };
