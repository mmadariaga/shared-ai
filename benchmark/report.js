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

function configurationReport(info, configuration, results, regenerate) {
  const expected = info.expectedRuns.filter((run) => run.configuration === configuration.id);
  const done = results.filter((result) => result.configuration === configuration.id);
  const counts = Object.fromEntries(['accepted', 'rejected', 'escalated', 'timeout', 'error'].map((outcome) => [outcome, done.filter((result) => result.outcome === outcome).length]));
  const judged = done.length - counts.error;
  const timed = done.filter((result) => result.outcome !== 'error');
  const wallTotal = timed.reduce((sum, result) => sum + result.wallMs, 0);
  const withQuestions = done.filter((result) => result.cancelledQuestions > 0).length;
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
    '',
    '## Infrastructure errors (excluded)',
    '',
  ];
  const errors = done.filter((result) => result.outcome === 'error');
  lines.push(errors.length === 0 ? 'None.' : `${errors.length} runs.`, '');
  for (const result of errors) lines.push(`- ${result.run}: ${result.detail}`);
  if (errors.length > 0) lines.push('');

  lines.push('## Runs', '', row(['Run', 'Round', 'Brief', 'Outcome', 'Hidden suite', 'Wall time (s)', 'Cancelled questions', 'Detail']), row(['---', '---', '---', '---', '---', '---', '---', '---']));
  for (const result of done) {
    const suite = result.suite ? `${result.suite.passed}/${result.suite.total}` : 'not run';
    lines.push(row([result.run, result.round, result.brief, result.outcome, suite, seconds(result.wallMs), result.cancelledQuestions, result.detail.replace(/\|/g, '\\|')]));
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
