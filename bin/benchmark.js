#!/usr/bin/env node

'use strict';

// Outcome benchmark runner. Runs from a shared-ai checkout only: sai/install-manifest.json
// projects it to no harness. See docs/benchmark.md.
//
//   node bin/benchmark.js validate <corpus>
//   node bin/benchmark.js run <corpus> --out <folder> [--rounds <n>]
//   node bin/benchmark.js report --out <folder>

const path = require('node:path');
const { BenchmarkError, HARNESSES, loadCorpus } = require('../benchmark/corpus');
const { DockerBackend } = require('../benchmark/docker-backend');
const { writeReports } = require('../benchmark/report');
const { assertOutputOutside, checkoutCommit, runBenchmark } = require('../benchmark/runner');
const { loadInstallManifest } = require('./install-manifest.js');
const { enumerateProjectionTargets } = require('./model-customization.js');

const REPOSITORY_ROOT = path.join(__dirname, '..');
const USAGE = `Usage:
  node bin/benchmark.js validate <corpus>
  node bin/benchmark.js run <corpus> --out <folder> [--rounds <n>]
  node bin/benchmark.js report --out <folder>`;

function parseArguments(argv) {
  const positional = [];
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--out' || argument === '--rounds') {
      if (argv[index + 1] === undefined) throw new BenchmarkError(`${argument} needs a value\n${USAGE}`);
      options[argument.slice(2)] = argv[index + 1];
      index += 1;
    } else if (argument.startsWith('--')) {
      throw new BenchmarkError(`Unknown option ${argument}\n${USAGE}`);
    } else {
      positional.push(argument);
    }
  }
  return { positional, options };
}

function workerRoles() {
  return Object.fromEntries(HARNESSES.map((harness) => [harness, enumerateProjectionTargets(REPOSITORY_ROOT, loadInstallManifest, harness).worker]));
}

function parseRounds(value) {
  if (value === undefined) return undefined;
  if (!/^[1-9]\d*$/.test(value)) throw new BenchmarkError('--rounds must be a positive integer');
  return Number(value);
}

function requireOut(options) {
  if (!options.out) throw new BenchmarkError(`--out <folder> is required\n${USAGE}`);
  return path.resolve(options.out);
}

function regenerateCommand(outDir) {
  return `node bin/benchmark.js report --out ${outDir}`;
}

async function main(argv, { backendFor = (checkoutDir) => new DockerBackend({ checkoutDir }), log = console.log } = {}) {
  const [command, ...rest] = argv;
  const { positional, options } = parseArguments(rest);

  if (command === 'validate') {
    if (positional.length !== 1) throw new BenchmarkError(USAGE);
    const corpus = loadCorpus(positional[0], { workers: workerRoles(), rounds: parseRounds(options.rounds) });
    log(`Corpus ${corpus.id} is valid: ${corpus.briefs.length} briefs, ${corpus.configurations.length} configurations, ${corpus.rounds} rounds.`);
    return;
  }
  if (command === 'run') {
    if (positional.length !== 1) throw new BenchmarkError(USAGE);
    const corpus = loadCorpus(positional[0], { workers: workerRoles(), rounds: parseRounds(options.rounds) });
    const outDir = assertOutputOutside(requireOut(options), [
      { label: 'shared-ai checkout', dir: REPOSITORY_ROOT },
      { label: 'corpus', dir: corpus.dir },
    ]);
    const backend = backendFor(REPOSITORY_ROOT);
    if (backend.prepare) await backend.prepare();
    const commit = checkoutCommit(REPOSITORY_ROOT);
    await runBenchmark({ corpus, outDir, backend, provenance: { runnerCommit: commit, saiCommit: commit }, log });
    const reports = writeReports(outDir, { regenerate: regenerateCommand(outDir) });
    log(`Reports written to ${outDir}: ${reports.join(', ')}`);
    return;
  }
  if (command === 'report') {
    if (positional.length !== 0) throw new BenchmarkError(USAGE);
    const outDir = requireOut(options);
    const reports = writeReports(outDir, { regenerate: regenerateCommand(outDir) });
    log(`Reports written to ${outDir}: ${reports.join(', ')}`);
    return;
  }
  throw new BenchmarkError(USAGE);
}

if (require.main === module) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error instanceof BenchmarkError ? error.message : error);
    process.exit(error instanceof BenchmarkError ? 2 : 1);
  });
}

module.exports = { main };
