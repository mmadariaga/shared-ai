'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { BenchmarkError } = require('./corpus');
const { classifyRun } = require('./classify');

const INFO_FILE = 'benchmark-info.json';
const RUNS_DIR = 'runs';

function isInside(candidate, parent) {
  const relative = path.relative(parent, candidate);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

/** The runner writes nowhere near the checkout or the corpus it reads. */
function assertOutputOutside(outDir, forbidden) {
  const resolved = path.resolve(outDir);
  for (const { label, dir } of forbidden) {
    if (isInside(resolved, path.resolve(dir))) {
      throw new BenchmarkError(`the output folder ${resolved} is inside the ${label} (${path.resolve(dir)}); choose a folder outside it`);
    }
  }
  return resolved;
}

/** Commit of a checkout, with a `+dirty` mark when its working tree has changes. */
function checkoutCommit(dir) {
  const git = (...args) => execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  try {
    const commit = git('rev-parse', 'HEAD');
    return git('status', '--porcelain') === '' ? commit : `${commit}+dirty`;
  } catch {
    return 'unknown';
  }
}

function writeJsonAtomic(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`);
  fs.renameSync(temporary, file);
}

function runId(round, configurationId) {
  return `round-${String(round).padStart(2, '0')}-${configurationId}`;
}

/** Round r gives every configuration the same brief; the briefs rotate between rounds. */
function planRuns(corpus) {
  const runs = [];
  for (let round = 1; round <= corpus.rounds; round += 1) {
    const brief = corpus.briefs[(round - 1) % corpus.briefs.length];
    for (const configuration of corpus.configurations) {
      runs.push({ id: runId(round, configuration.id), round, brief, configuration });
    }
  }
  return runs;
}

function writeInfo(outDir, corpus, provenance) {
  writeJsonAtomic(path.join(outDir, INFO_FILE), {
    reportFormat: 1,
    runnerCommit: provenance.runnerCommit,
    saiCommit: provenance.saiCommit,
    corpus: corpus.id,
    priceTableDate: corpus.prices.date,
    rounds: corpus.rounds,
    timeLimitSeconds: corpus.timeLimitSeconds,
    configurations: corpus.configurations.map(({ id, harness, route, models }) => ({ id, harness, route, models })),
    expectedRuns: planRuns(corpus).map(({ id, round, brief, configuration }) => ({ id, round, brief: brief.id, configuration: configuration.id })),
  });
}

/**
 * Run every planned run through the backend and save each result as soon as it
 * ends. A run whose result file already exists is kept, so a rerun into the same
 * output folder continues an interrupted benchmark.
 */
async function runBenchmark({ corpus, outDir, backend, provenance, log = () => {} }) {
  writeInfo(outDir, corpus, provenance);
  const results = [];
  for (const run of planRuns(corpus)) {
    const file = path.join(outDir, RUNS_DIR, `${run.id}.json`);
    if (fs.existsSync(file)) {
      log(`${run.id}: kept (already saved)`);
      continue;
    }
    const { configuration, brief } = run;
    let raw;
    try {
      raw = await backend.run({ corpus, configuration, brief, route: configuration.route, timeLimitMs: corpus.timeLimitSeconds * 1000 });
    } catch (error) {
      raw = { infraError: error.message, wallMs: 0 };
    }
    const result = {
      run: run.id,
      round: run.round,
      brief: brief.id,
      configuration: configuration.id,
      harness: configuration.harness,
      route: configuration.route,
      wallMs: raw.wallMs ?? 0,
      ...classifyRun(raw, configuration),
    };
    writeJsonAtomic(file, result);
    results.push(result);
    log(`${run.id}: ${result.outcome} (${result.detail})`);
  }
  return results;
}

module.exports = { INFO_FILE, RUNS_DIR, assertOutputOutside, checkoutCommit, planRuns, runBenchmark, writeJsonAtomic };
