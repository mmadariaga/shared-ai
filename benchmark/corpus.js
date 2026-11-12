'use strict';

const fs = require('node:fs');
const path = require('node:path');

const HARNESSES = Object.freeze(['claude', 'opencode']);
const ROUTES = Object.freeze({
  plan: Object.freeze({ command: '/sai-3-implement', closingLiteral: 'Implement done.' }),
  'direct-build': Object.freeze({ command: '/sai-direct-build', closingLiteral: 'Direct build done.' }),
});
const MODEL_SETTING_KEYS = Object.freeze({ claude: ['model', 'effort'], opencode: ['model', 'variant'] });
const OPTIONAL_PRICE_KEYS = Object.freeze(['cacheReadPerMTok', 'cacheWrite5mPerMTok', 'cacheWrite1hPerMTok']);
const DEFAULT_ROUNDS = 10;
const ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/;
const ENV_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

class BenchmarkError extends Error {
  constructor(problems) {
    const list = Array.isArray(problems) ? problems : [problems];
    super(list.join('\n'));
    this.name = 'BenchmarkError';
    this.problems = list;
  }
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isPositiveInteger(value) {
  return Number.isInteger(value) && value > 0;
}

function isDirectory(target) {
  return fs.existsSync(target) && fs.statSync(target).isDirectory();
}

function readJson(file, problems, label) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    problems.push(`${label} is missing or is not valid JSON: ${error.message}`);
    return null;
  }
}

function validateConfiguration(entry, index, workers, problems) {
  const label = `configuration ${index + 1}${isObject(entry) && entry.id ? ` (${entry.id})` : ''}`;
  if (!isObject(entry)) {
    problems.push(`${label} must be an object`);
    return;
  }
  if (typeof entry.id !== 'string' || !ID_PATTERN.test(entry.id)) {
    problems.push(`${label}: id must be lowercase letters, digits, and dashes`);
  }
  if (!HARNESSES.includes(entry.harness)) {
    problems.push(`${label}: harness must be one of ${HARNESSES.join(', ')}`);
  }
  if (!Object.hasOwn(ROUTES, entry.route)) {
    problems.push(`${label}: route must be one of ${Object.keys(ROUTES).join(', ')}`);
  }
  if (!Array.isArray(entry.env) || entry.env.some((name) => typeof name !== 'string' || !ENV_PATTERN.test(name))) {
    problems.push(`${label}: env must list the names of the credential environment variables`);
  }
  if (!isObject(entry.models) || Object.keys(entry.models).length === 0) {
    problems.push(`${label}: models must name the model of at least one worker role`);
    return;
  }
  const allowed = MODEL_SETTING_KEYS[entry.harness] || [];
  for (const [role, settings] of Object.entries(entry.models)) {
    if (!workers.includes(role)) problems.push(`${label}: ${role} is not a worker role of ${entry.harness}`);
    if (!isObject(settings) || typeof settings.model !== 'string' || settings.model === '') {
      problems.push(`${label}: ${role} needs a model`);
      continue;
    }
    for (const key of Object.keys(settings)) {
      if (!allowed.includes(key)) problems.push(`${label}: ${role} setting ${key} does not exist on ${entry.harness} (allowed: ${allowed.join(', ')})`);
    }
  }
}

function validatePrices(prices, problems) {
  if (!isObject(prices) || typeof prices.date !== 'string' || !DATE_PATTERN.test(prices.date) || !isObject(prices.models)) {
    problems.push('prices must hold a date (YYYY-MM-DD) and a models table');
    return;
  }
  for (const [model, price] of Object.entries(prices.models)) {
    if (!isObject(price) || !(price.inputPerMTok >= 0) || !(price.outputPerMTok >= 0)) {
      problems.push(`prices: ${model} needs inputPerMTok and outputPerMTok`);
      continue;
    }
    for (const key of OPTIONAL_PRICE_KEYS) {
      if (price[key] !== undefined && !(typeof price[key] === 'number' && price[key] >= 0)) problems.push(`prices: ${model}: ${key} must be a number of at least 0`);
    }
  }
}

function loadBriefs(corpusDir, problems) {
  const briefsDir = path.join(corpusDir, 'briefs');
  if (!isDirectory(briefsDir)) {
    problems.push('briefs/ folder is missing');
    return [];
  }
  const names = fs.readdirSync(briefsDir, { withFileTypes: true }).filter((item) => item.isDirectory()).map((item) => item.name).sort();
  if (names.length === 0) problems.push('briefs/ holds no brief folder');
  const briefs = [];
  for (const id of names) {
    const dir = path.join(briefsDir, id);
    const blockFile = path.join(dir, 'block.md');
    const changeName = fs.existsSync(blockFile)
      ? /^\*\*Change name\*\*:\s*(\S+)\s*$/m.exec(fs.readFileSync(blockFile, 'utf8'))?.[1]
      : undefined;
    if (!fs.existsSync(blockFile)) problems.push(`brief ${id}: block.md is missing`);
    else if (!changeName) problems.push(`brief ${id}: block.md has no Change name line`);
    if (!isDirectory(path.join(dir, 'plan')) || fs.readdirSync(path.join(dir, 'plan')).length === 0) {
      problems.push(`brief ${id}: plan/ must hold the fixed plan`);
    }
    const suiteFile = path.join(dir, 'acceptance', 'suite.json');
    let suiteCommand = null;
    if (!fs.existsSync(suiteFile)) {
      problems.push(`brief ${id}: acceptance/suite.json is missing`);
    } else {
      const suite = readJson(suiteFile, problems, `brief ${id}: acceptance/suite.json`);
      const valid = suite && Array.isArray(suite.command) && suite.command.length > 0 && suite.command.every((part) => typeof part === 'string');
      if (suite && !valid) problems.push(`brief ${id}: acceptance/suite.json needs a command (a non-empty list of strings)`);
      if (valid) suiteCommand = suite.command;
    }
    briefs.push({ id, dir, changeName, suiteCommand });
  }
  return briefs;
}

/**
 * Load and validate a corpus before any run starts. Every problem is collected
 * and reported together, so one stop names everything to fix.
 */
function loadCorpus(corpusDir, { workers, rounds } = {}) {
  const problems = [];
  const root = path.resolve(corpusDir);
  const config = fs.existsSync(path.join(root, 'benchmark.json'))
    ? readJson(path.join(root, 'benchmark.json'), problems, 'benchmark.json')
    : (problems.push(`benchmark.json is missing in ${root}`), null);
  if (!isDirectory(path.join(root, 'project'))) problems.push('project/ folder is missing');
  const briefs = loadBriefs(root, problems);
  if (!isObject(config)) throw new BenchmarkError(problems);

  if (typeof config.corpus !== 'string' || config.corpus === '') problems.push('corpus must be a non-empty identifier');
  if (!isPositiveInteger(config.timeLimitSeconds)) problems.push('timeLimitSeconds is mandatory and must be a positive integer');
  const resolvedRounds = rounds ?? config.rounds ?? DEFAULT_ROUNDS;
  if (!isPositiveInteger(resolvedRounds)) problems.push('rounds must be a positive integer');
  const configurations = Array.isArray(config.configurations) ? config.configurations : [];
  if (configurations.length === 0) problems.push('configurations must list at least one configuration');
  const knownWorkers = workers || {};
  configurations.forEach((entry, index) => validateConfiguration(entry, index, knownWorkers[entry && entry.harness] || [], problems));
  const ids = configurations.filter(isObject).map((entry) => entry.id);
  for (const id of new Set(ids.filter((value, index) => ids.indexOf(value) !== index))) problems.push(`configuration id ${id} is used twice`);
  validatePrices(config.prices, problems);
  if (problems.length > 0) throw new BenchmarkError(problems);

  return {
    dir: root,
    id: config.corpus,
    rounds: resolvedRounds,
    timeLimitSeconds: config.timeLimitSeconds,
    configurations,
    prices: config.prices,
    briefs,
  };
}

module.exports = { BenchmarkError, DEFAULT_ROUNDS, HARNESSES, ROUTES, MODEL_SETTING_KEYS, loadCorpus };
