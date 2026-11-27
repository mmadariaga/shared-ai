#!/usr/bin/env node

'use strict';

/**
 * issue-precheck — the deterministic, informative check of the references an
 * issue cites against the working tree.
 *
 * `/sai-explore`'s issue intake runs it before the work/drift round of a mature
 * issue. It reuses the section parser of `change-document.js`: every backticked
 * reference of a section body is classified as a path, a `path:line`, or a
 * symbol.
 *
 *   - a path must exist under `--cwd`;
 *   - a `path:line` (or `path:start-end`) must exist and its last line must
 *     fall inside the file;
 *   - a symbol is checked for existence only, as an exact word
 *     (`git grep -w -F -l` in `--cwd`).
 *
 * The precheck informs and never decides: `missing` lists what was not found,
 * and the exit code stays 0 whether or not anything is missing (E7). A symbol
 * the change proposes does not exist yet, so a blocking check would stop on a
 * valid issue. Commands, options, URLs, placeholders, globs, and plain prose
 * words are not references and are not checked; a dotted or underscored or
 * mixed-case identifier is. A path that leads outside `--cwd` (absolute, or
 * climbing with `..`) is not read: the issue text is untrusted, so such a path
 * is reported missing from the project. When `git` cannot search the tree, the
 * symbols it could not examine are counted in `unchecked`, never in `checked`
 * or `missing`, so an absent symbol check is never read as "every reference
 * was found".
 *
 * Usage:
 *   node sai/tools/issue-precheck.js check --input-file <path> --cwd <project-root>
 *
 * It prints one JSON object `{checked, unchecked, missing}`: `checked` is the
 * number of distinct references examined, `unchecked` the number of distinct
 * symbols git could not search, and each `missing` entry is
 * `{kind, ref, section}`, once per reference and section, with `kind` `path`,
 * `path-line`, or `symbol` and `section` the heading the reference appears in.
 * Exit codes: 0 = the check ran, whatever it found; 2 = usage or I/O error.
 */

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const inputReader = require('./input-reader');
const usageKit = require('./usage');
const { issueToMarkdown, parseIssueSections } = require('./change-document');

const BACKTICK = /`([^`\n]+)`/g;
const PATH_LINE = /^(.+?):(\d+)(?:-(\d+)|:\d+)?$/;
const FILE_EXTENSION = /\.(?:[cm]?js|[cm]?ts|tsx|jsx|json|jsonc|ya?ml|md|mdx|txt|sh|ps1|css|s[ac]ss|less|html?|vue|svelte|astro|py|rb|go|rs|java|kt|php|cs|swift|sql|xml|toml|ini|lock|env)$/i;
const SLASH_COMMAND = /^\/[a-z][a-z0-9-]*$/i;
const SESSION_ID = /^ses_[A-Za-z0-9]+$/;
const SYMBOL = /^[A-Za-z_$][A-Za-z0-9_$]*(?:\.[A-Za-z_$][A-Za-z0-9_$]*)*$/;

/** The backticked references of an issue, each with the section heading it appears in. */
function extractReferences(text) {
  const parsed = parseIssueSections(issueToMarkdown(text), { lenient: true });
  const references = [];
  for (const section of parsed.sections) {
    section.body.forEach((raw, index) => {
      if (section.fenced[index]) return;
      for (const match of raw.matchAll(BACKTICK)) references.push({ token: match[1].trim(), section: section.heading });
    });
  }
  return references;
}

/** The kind and shape of one backticked token, or null when it is not a reference. */
function classifyReference(token) {
  if (token === '' || /\s/.test(token)) return null;
  if (/^(?:https?|ftp):\/\//i.test(token)) return null;
  if (/[<>*{}]/.test(token)) return null;
  if (token.startsWith('-')) return null;
  if (SESSION_ID.test(token)) return null;
  const line = PATH_LINE.exec(token);
  const base = line ? line[1] : token;
  if (base.includes('/') || FILE_EXTENSION.test(base)) {
    if (SLASH_COMMAND.test(base)) return null;
    return { kind: line ? 'path-line' : 'path', ref: token, file: base, line: line ? Number(line[2]) : null, endLine: line && line[3] ? Number(line[3]) : null };
  }
  if (!SYMBOL.test(token)) return null;
  const distinctive = token.includes('_') || token.includes('.') || /[a-z][A-Z]/.test(token) || /^[A-Z]{2,}/.test(token);
  return distinctive ? { kind: 'symbol', ref: token } : null;
}

/** Whether `target` is `root` or lies below it, compared lexically. */
function isInside(root, target) {
  const relative = path.relative(root, target);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

/**
 * The tracked files of `cwd`, read once per run: `null` when git cannot list
 * them (no git, or not a repository).
 */
function trackedFiles(context) {
  if (context.tracked === undefined) {
    const listed = spawnSync('git', ['-C', context.cwd, 'ls-files', '-z'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    context.tracked = listed.error || listed.status !== 0 ? null : listed.stdout.split('\0').filter((entry) => entry !== '');
  }
  return context.tracked;
}

/**
 * The file a reference names under `cwd`: its path as written, or, for a bare
 * filename, the first tracked file with exactly that name. A path that leads
 * outside `cwd` resolves to nothing and is never read.
 */
function resolveReferencePath(context, file) {
  const root = path.resolve(context.cwd);
  const direct = path.resolve(root, file);
  if (!isInside(root, direct)) return null;
  if (fs.existsSync(direct)) return direct;
  if (file.includes('/')) return null;
  const tracked = trackedFiles(context);
  if (tracked === null) return null;
  const match = tracked.find((entry) => path.posix.basename(entry) === file);
  return match === undefined ? null : path.join(root, match);
}

/** Whether the path (or the file of its line reference) is missing under `cwd`. */
function pathIsMissing(context, entry) {
  const target = resolveReferencePath(context, entry.file);
  if (target === null) return true;
  if (entry.kind === 'path') return false;
  let stat;
  try {
    stat = fs.statSync(target);
  } catch {
    return true;
  }
  if (!stat.isFile()) return true;
  let lineCount;
  try {
    lineCount = fs.readFileSync(target, 'utf8').replace(/\n$/, '').split('\n').length;
  } catch {
    return true;
  }
  return entry.line < 1 || (entry.endLine ?? entry.line) > lineCount;
}

/**
 * Whether the symbol is findable: true, false, or null when git cannot search
 * the tree. A dotted name is searched as a fixed string, because the word
 * boundary of `-w` does not apply to it.
 */
function symbolExists(cwd, symbol) {
  const flags = symbol.includes('.') ? ['grep', '-q', '-F'] : ['grep', '-q', '-w', '-F'];
  const result = spawnSync('git', ['-C', cwd, ...flags, '--', symbol], { encoding: 'utf8' });
  if (result.error || (result.status !== 0 && result.status !== 1)) return null;
  return result.status === 0;
}

/**
 * The informative precheck of one issue: `{checked, unchecked, missing}`.
 * Each distinct reference is examined once; a reference that is missing is
 * listed once per section it appears in.
 */
function checkIssue(text, { cwd }) {
  const context = { cwd };
  const verdicts = new Map();
  const listed = new Set();
  const missing = [];
  let checked = 0;
  let unchecked = 0;
  let symbolsCheckable = true;
  for (const reference of extractReferences(text)) {
    const entry = classifyReference(reference.token);
    if (!entry) continue;
    const key = `${entry.kind}\0${entry.ref}`;
    if (!verdicts.has(key)) {
      let verdict;
      if (entry.kind === 'symbol') {
        const found = symbolsCheckable ? symbolExists(cwd, entry.ref) : null;
        if (found === null) symbolsCheckable = false;
        verdict = found === null ? 'unchecked' : (found ? 'found' : 'missing');
      } else {
        verdict = pathIsMissing(context, entry) ? 'missing' : 'found';
      }
      verdicts.set(key, verdict);
      if (verdict === 'unchecked') unchecked += 1;
      else checked += 1;
    }
    if (verdicts.get(key) !== 'missing') continue;
    const where = `${key}\0${reference.section}`;
    if (listed.has(where)) continue;
    listed.add(where);
    missing.push({ kind: entry.kind, ref: entry.ref, section: reference.section });
  }
  return { checked, unchecked, missing };
}

const IP = 'node sai/tools/issue-precheck.js';

const USAGE = {
  subcommands: {
    check: {
      usage: [`${IP} check --input-file <path> --cwd <project-root>`],
      notes: [
        'Checks every backticked path, path:line, and symbol of an issue against the working tree.',
        'It informs and never decides: it exits 0 whether or not references are missing, and 2 only on a usage or I/O error.',
        'It prints {checked, unchecked, missing}: unchecked counts the symbols git could not search; a path outside --cwd is reported missing and never read.',
      ],
      examples: [`${IP} check --input-file issue.md --cwd .`],
      flags: { '--input-file': true, '--cwd': true, '--json': false },
      required: ['--input-file', '--cwd'],
    },
  },
};

function usage() {
  return usageKit.render(USAGE);
}

function main(argv) {
  const guarded = usageKit.handle(USAGE, argv);
  if (guarded !== null) return guarded;
  let inputFile = null;
  let cwd = null;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--json') continue;
    if (arg === '--input-file' || arg === '--cwd') {
      const value = argv[++i];
      if (value === undefined || value.startsWith('--')) {
        process.stderr.write(`${arg} requires a value\n${usage()}\n`);
        return 2;
      }
      if (arg === '--input-file') inputFile = value;
      else cwd = value;
      continue;
    }
  }
  if (inputFile === null || cwd === null) {
    process.stderr.write(`check requires --input-file and --cwd\n${usage()}\n`);
    return 2;
  }
  try {
    if (!fs.statSync(cwd).isDirectory()) throw new Error(`--cwd is not a directory: ${cwd}`);
    const result = checkIssue(inputReader.readInputFile(inputFile), { cwd });
    process.stdout.write(`${JSON.stringify(result)}\n`);
    return 0;
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    return 2;
  }
}

module.exports = { checkIssue, extractReferences, classifyReference, main, USAGE };

if (require.main === module) {
  process.exitCode = main(process.argv.slice(2));
}
