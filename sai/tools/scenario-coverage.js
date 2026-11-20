#!/usr/bin/env node

'use strict';

/**
 * scenario-coverage — which spec scenarios have no test that names them.
 *
 * A scenario is linked to its test by its normalized title appearing
 * literally in a file the change touched, so the check needs no parser per
 * test framework. The tool answers only whether such a file exists; whether
 * the test proves the scenario stays with the inferential review.
 *
 * Terms.
 * - scenario title: the text after `#### Scenario:` in a spec.
 * - normalized match: the title, lowercased, with every punctuation run turned
 *   into one space and whitespace runs collapsed to one space, appears on word
 *   boundaries in the normalized content of a file: `valid input` matches
 *   `valid-input` and never `invalid input`.
 * - change base: the merge-base of HEAD with the parent branch, the
 *   `--parent-branch` value when given, else the first of the default branch
 *   of origin/HEAD (without its `origin/` prefix), `master`, and `main` that
 *   `git rev-parse --verify` accepts, the order `/sai-4-review` follows.
 * - files changed by the change: `git diff --name-only <change base>`, plus
 *   staged changes and untracked files that are not ignored. Every changed
 *   text file counts, test or not, because which files are tests differs per
 *   project. Files under `openspec/`, deleted files, and non-text files are
 *   left out.
 *
 * Usage:
 *   node sai/tools/scenario-coverage.js step --input-file <path> [--parent-branch <branch>] [--cwd <project-root>]
 *   node sai/tools/scenario-coverage.js change <change-name> [--parent-branch <branch>] [--cwd <project-root>]
 *
 * `step` takes a JSON list of the scenario titles of one step brief. `change`
 * checks every scenario the change adds or modifies: ADDED scenarios, and
 * MODIFIED or RENAMED scenarios whose title or body differs from the same
 * scenario in `openspec/specs/<capability>/spec.md`. A capability with no
 * main spec counts as new, and a REMOVED requirement is never checked.
 *
 * Output: one JSON object with `verdict` (`clean`, `missing`, or `n/a`),
 * `missing`, `ambiguous`, `parent_branch`, and `change_base`. Scenarios that
 * share one normalized title are `ambiguous` and are matched by no test; the
 * verdict is `missing` whenever `missing` or `ambiguous` holds an entry. A
 * change whose `.openspec.yaml` sets `skip_specs: true`, and a step with no
 * titles, get `n/a` and no entries.
 *
 * Exit codes: 0 = clean or n/a; 1 = missing; 2 = usage or I/O error (a
 * message on stderr, never a finding).
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { InputFileError, extractInputFile, readInputFile } = require('./input-reader.js');
const { collectScenarios, readSpec } = require('./spec-scenarios.js');

class UsageError extends Error {}

const SKIP_SPECS_RE = /^skip_specs:[ \t]*true[ \t]*$/m;
const DELTA_SECTIONS = new Set(['ADDED', 'MODIFIED', 'RENAMED']);

function usage() {
  return [
    'Usage: node sai/tools/scenario-coverage.js step --input-file <path> [--parent-branch <branch>] [--cwd <project-root>]',
    '       node sai/tools/scenario-coverage.js change <change-name> [--parent-branch <branch>] [--cwd <project-root>]',
    '',
    '  step             <path> holds a JSON list of scenario titles (the step brief).',
    '  change           checks every scenario the change adds or modifies.',
    '  --parent-branch  Branch the change base is taken against (default: origin/HEAD, master, main).',
    '  --cwd            Project root (default: the working directory).',
  ].join('\n');
}

function normalizeTitle(text) {
  return text.toLowerCase().replace(/[^\p{L}\p{N}\s]+/gu, ' ').replace(/\s+/g, ' ').trim();
}

function git(args, cwd) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (result.error) throw new UsageError(`cannot run git: ${result.error.message}`);
  return result;
}

function verifies(branch, cwd) {
  return git(['rev-parse', '--verify', '--quiet', `${branch}^{commit}`], cwd).status === 0;
}

function resolveChangeBase(cwd, parentBranch) {
  let parent;
  if (parentBranch) {
    if (!verifies(parentBranch, cwd)) throw new UsageError(`--parent-branch ${parentBranch} does not resolve to a commit`);
    parent = parentBranch;
  } else {
    const origin = git(['symbolic-ref', '--short', 'refs/remotes/origin/HEAD'], cwd);
    const defaultBranch = origin.status === 0 ? origin.stdout.trim().replace(/^origin\//, '') : '';
    const candidates = [defaultBranch, 'master', 'main'].filter(Boolean);
    parent = candidates.find((candidate) => verifies(candidate, cwd));
    if (!parent) throw new UsageError(`no parent branch verifies; tried ${candidates.join(', ')}`);
  }
  const base = git(['merge-base', 'HEAD', parent], cwd);
  if (base.status !== 0) throw new UsageError(`git merge-base HEAD ${parent} failed: ${base.stderr.trim()}`);
  return { parent_branch: parent, change_base: base.stdout.trim() };
}

function nameList(args, cwd) {
  const result = git(args, cwd);
  if (result.status !== 0) throw new UsageError(`git ${args.join(' ')} failed: ${result.stderr.trim()}`);
  return result.stdout.split('\0').filter(Boolean);
}

/** Normalized content of every text file the change touched, outside `openspec/`. */
function changedFileContents(cwd, changeBase) {
  const names = new Set([
    ...nameList(['diff', '--name-only', '--relative', '-z', changeBase], cwd),
    ...nameList(['diff', '--cached', '--name-only', '--relative', '-z'], cwd),
    ...nameList(['ls-files', '--others', '--exclude-standard', '-z'], cwd),
  ]);
  const contents = [];
  for (const name of [...names].sort()) {
    if (name === 'openspec' || name.startsWith('openspec/')) continue;
    let bytes;
    try {
      bytes = fs.readFileSync(path.join(cwd, name));
    } catch (error) {
      continue; // deleted, or a directory such as a submodule
    }
    if (bytes.includes(0)) continue; // not text
    contents.push(` ${normalizeTitle(bytes.toString('utf8'))} `);
  }
  return contents;
}

/** Classify scenarios `{title, ...}`: ambiguous groups first, then covered and missing. */
function classify(scenarios, contents) {
  const groups = new Map();
  for (const scenario of scenarios) {
    const key = normalizeTitle(scenario.title);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(scenario);
  }
  const missing = [];
  const ambiguous = [];
  for (const [key, group] of groups) {
    if (group.length > 1) ambiguous.push({ title: key, scenarios: group });
    else if (key === '' || !contents.some((content) => content.includes(` ${key} `))) missing.push(group[0]);
  }
  return { missing, ambiguous };
}

function report(verdict, extra) {
  return { verdict, missing: [], ambiguous: [], parent_branch: null, change_base: null, ...extra };
}

function finish(scenarios, cwd, parentBranch) {
  const base = resolveChangeBase(cwd, parentBranch);
  const { missing, ambiguous } = classify(scenarios, changedFileContents(cwd, base.change_base));
  return { ...base, missing, ambiguous, verdict: missing.length || ambiguous.length ? 'missing' : 'clean' };
}

function runStep(inputFile, cwd, parentBranch) {
  if (!inputFile) throw new UsageError('step requires --input-file <path>');
  let titles;
  try {
    titles = JSON.parse(readInputFile(inputFile));
  } catch (error) {
    if (error instanceof InputFileError) throw new UsageError(error.message);
    throw new UsageError(`${inputFile}: not valid JSON: ${error.message}`);
  }
  if (!Array.isArray(titles) || titles.some((title) => typeof title !== 'string' || !title.trim())) {
    throw new UsageError(`${inputFile}: expected a JSON list of non-empty scenario titles`);
  }
  if (titles.length === 0) return report('n/a');
  return finish(titles.map((title) => ({ title })), cwd, parentBranch);
}

function readIfPresent(file) {
  try {
    return readSpec(file);
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw new UsageError(`cannot read ${file}: ${error.message}`);
  }
}

/** Scenarios of the change that are new or differ from the main spec. */
function changedScenarios(root, name) {
  const changeDir = path.join(root, 'openspec', 'changes', name);
  const yaml = readIfPresent(path.join(changeDir, '.openspec.yaml'));
  if (yaml !== null && SKIP_SPECS_RE.test(yaml)) return null;
  const deltaDir = path.join(changeDir, 'specs');
  let capabilities;
  try {
    capabilities = fs.readdirSync(deltaDir, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  } catch (error) {
    throw new UsageError(`delta specs directory not found: ${deltaDir}`);
  }
  const scenarios = [];
  for (const capability of capabilities) {
    const deltaFile = path.join(deltaDir, capability, 'spec.md');
    const deltaContent = readIfPresent(deltaFile);
    if (deltaContent === null) continue;
    const mainContent = readIfPresent(path.join(root, 'openspec', 'specs', capability, 'spec.md'));
    try {
      const main = mainContent === null ? [] : collectScenarios(mainContent, { delta: false });
      for (const scenario of collectScenarios(deltaContent, { delta: true })) {
        if (!DELTA_SECTIONS.has(scenario.section)) continue;
        if (scenario.section !== 'ADDED') {
          const same = main.find((entry) => entry.requirement === scenario.requirement && entry.title === scenario.title)
            || main.find((entry) => entry.title === scenario.title);
          if (same && same.body === scenario.body) continue;
        }
        scenarios.push({ title: scenario.title, capability, section: scenario.section, requirement: scenario.requirement });
      }
    } catch (error) {
      throw new UsageError(`cannot interpret ${capability}/spec.md: ${error.message}`);
    }
  }
  return scenarios;
}

function runChange(name, cwd, parentBranch) {
  if (!name) throw new UsageError('change requires a change name');
  const scenarios = changedScenarios(cwd, name);
  if (scenarios === null) return report('n/a', { reason: 'skip_specs' });
  if (scenarios.length === 0) return report('n/a', { reason: 'no new or changed scenarios' });
  return finish(scenarios, cwd, parentBranch);
}

function parse(argv) {
  const { argv: rest, inputFile } = extractInputFile(argv);
  const positional = [];
  let cwd = process.cwd();
  let parentBranch = null;
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === '--cwd') {
      if (!rest[i + 1] || rest[i + 1].startsWith('--')) throw new UsageError('value required for --cwd');
      cwd = path.resolve(rest[++i]);
    } else if (rest[i] === '--parent-branch') {
      if (!rest[i + 1] || rest[i + 1].startsWith('--')) throw new UsageError('value required for --parent-branch');
      parentBranch = rest[++i];
    } else if (rest[i].startsWith('--')) {
      throw new UsageError(`unknown flag: ${rest[i]}`);
    } else {
      positional.push(rest[i]);
    }
  }
  return { command: positional[0], args: positional.slice(1), inputFile, cwd, parentBranch };
}

function main(argv) {
  if (argv.includes('--help') || argv.includes('-h')) {
    process.stdout.write(`${usage()}\n`);
    return 0;
  }
  try {
    const { command, args, inputFile, cwd, parentBranch } = parse(argv);
    let result;
    if (command === 'step') {
      if (args.length) throw new UsageError(`unexpected positional argument: ${args[0]}`);
      result = runStep(inputFile, cwd, parentBranch);
    } else if (command === 'change') {
      if (inputFile) throw new UsageError('change takes no --input-file');
      if (args.length > 1) throw new UsageError(`unexpected positional argument: ${args[1]}`);
      result = runChange(args[0], cwd, parentBranch);
    } else {
      throw new UsageError(command ? `unknown sub-command: ${command}` : 'sub-command required');
    }
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return result.verdict === 'missing' ? 1 : 0;
  } catch (error) {
    if (!(error instanceof UsageError || error instanceof InputFileError)) throw error;
    process.stderr.write(`${error.message}\n${usage()}\n`);
    return 2;
  }
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));

module.exports = { normalizeTitle, main };
