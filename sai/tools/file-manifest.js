#!/usr/bin/env node

'use strict';

/**
 * file-manifest — deterministic File Manifest net fold.
 *
 * Folds every `## Step N` section's `**Files Affected**` entries of a change's
 * `tasks.md` into the target-state `### File Manifest` subsection of the same
 * change's `design.md`. The fold applies the net-fold transition rules the
 * design step previously applied in prose; it is a move from prose to code,
 * not a semantic change.
 *
 * Sub-commands:
 *   fold    Compute the manifest and write it into design.md's
 *           `### File Manifest` subsection (created when absent). Idempotent.
 *   verify  Compute the manifest and compare it with the persisted one;
 *           read-only. Exit 1 on divergence or a missing subsection.
 *
 * Failure policy: any malformed entry or illegal transition is reported with
 * its tasks.md line number and nothing is written (no partial write).
 *
 * Usage:
 *   node sai/tools/file-manifest.js <fold|verify> <change-name> [--json]
 *     [--cwd <dir>]
 *
 * Exit codes: 0 = folded / unchanged / verified; 1 = diagnostics, divergence,
 * or missing subsection; 2 = usage or I/O error.
 */

const fs = require('fs');
const path = require('path');

const MANIFEST_HEADING = '### File Manifest';
const EMPTY_SENTINEL = 'None — no files affected';
const EMPTY_LINE =
  EMPTY_SENTINEL +
  ' (every touched path is created and deleted within the same change, so nothing remains at target state)';

class ToolError extends Error {
  constructor(message, code = 2) {
    super(message);
    this.code = code;
  }
}

function usage() {
  return [
    'Usage: node sai/tools/file-manifest.js <fold|verify> <change-name> [--json] [--cwd <dir>]',
    '',
    '  fold      Write the net-folded `### File Manifest` into design.md.',
    '  verify    Compare design.md\'s manifest with the fold (read-only).',
    '  --json    Emit a JSON verdict on stdout.',
    '  --cwd     Project root (default: current directory).',
    '',
    'Exit codes: 0 ok, 1 diagnostics/divergence, 2 usage or I/O error.',
  ].join('\n');
}

function parseArgs(argv) {
  const opts = { json: false, cwd: process.cwd(), positional: [] };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') opts.help = true;
    else if (arg === '--json') opts.json = true;
    else if (arg === '--cwd') {
      if (argv[i + 1] === undefined) throw new ToolError('--cwd requires a value');
      opts.cwd = argv[++i];
    } else if (arg.startsWith('--')) throw new ToolError(`unknown option: ${arg}`);
    else opts.positional.push(arg);
  }
  return opts;
}

// ---------------------------------------------------------------------------
// Parsing tasks.md
// ---------------------------------------------------------------------------

/** Parse one entry text; returns {token, path, src?} or throws a message string. */
function parseEntry(text) {
  return require('./apply-step').parseDeclaration(text);
}

/** Extract ordered entries from tasks.md text. Returns {entries, errors}. */
function extractEntries(text) {
  const entries = [];
  const errors = [];
  let sentinels = 0;
  const lines = text.split(/\r?\n/);
  let step = null;
  let inFiles = false;
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = raw.trim();
    const stepMatch = trimmed.match(/^##\s+Step\s+(\d+)\b/);
    if (stepMatch) {
      step = Number(stepMatch[1]);
      inFiles = false;
      continue;
    }
    if (/^##\s+/.test(trimmed)) {
      step = null;
      inFiles = false;
      continue;
    }
    if (step === null) continue;
    const idx = raw.indexOf('**Files Affected**');
    let entryText = null;
    if (idx !== -1) {
      inFiles = true;
      entryText = raw.slice(idx + '**Files Affected**'.length).replace(/^\s*:?\s*/, '');
    } else if (inFiles) {
      if (/^\*\*\S/.test(trimmed)) {
        inFiles = false;
        continue;
      }
      entryText = raw;
    } else {
      continue;
    }
    const t = entryText.trim();
    if (!t || /^<!--.*-->$/.test(t)) continue;
    const parsed = parseEntry(t);
    if (parsed.sentinel) { sentinels += 1; continue; }
    if (parsed.error) {
      errors.push({ line: i + 1, step, message: parsed.error });
      continue;
    }
    entries.push({ ...parsed, step, line: i + 1 });
  }
  return { entries, errors, sentinels };
}

// ---------------------------------------------------------------------------
// Net fold
// ---------------------------------------------------------------------------

function union(...lists) {
  return [...new Set([].concat(...lists))].sort((a, b) => a - b);
}

function stepsOf(state) {
  return state.via ? union(state.via.srcSteps, state.via.dstSteps) : union(state.steps);
}

/**
 * State per path key:
 *   {t:'A'|'M'|'D', steps}                      plain
 *   {t:'A'|'R', via:{src, srcSteps, dstSteps}}  rename destination
 *   {t:'X', existed, steps}                     moved-away marker on a source
 * An absent key is the empty state (never touched or netted to nothing).
 */
function fold(entries) {
  const states = new Map();
  const errors = [];
  const get = (p) => states.get(p) || { t: 'E' };
  const fail = (e, message) => errors.push({ line: e.line, step: e.step, message });
  const findVia = (src) => {
    for (const [key, st] of states) if (st.via && st.via.src === src) return key;
    return null;
  };

  for (const e of entries) {
    const p = e.path;
    const s = e.step;
    const st = get(p);

    if (e.generated) {
      for (const [key, previous] of states) if (previous.generated && require('./apply-step').declarationsOverlap(previous.generated, e.generated)) fail(e, `overlapping generated families: ${key} and ${p}`);
      if (st.t !== 'E') fail(e, `generated family collides with affected path: ${p}`);
      states.set(p, { t: 'A', steps: [s], generated: e.generated });
      continue;
    }

    if (e.token === 'A') {
      if (st.t === 'E') states.set(p, { t: 'A', steps: [s] });
      else if (st.t === 'D') states.set(p, { t: 'M', steps: union(st.steps, [s]) });
      else if (st.t === 'X') {
        const dstKey = findVia(p);
        states.set(p, { t: st.existed ? 'M' : 'A', steps: union(st.steps, [s]) });
        if (dstKey !== null) {
          // The rename dissolves: the destination emits A on its own arc.
          states.set(dstKey, { t: 'A', steps: union(states.get(dstKey).via.dstSteps) });
        }
      } else fail(e, `illegal transition: A on '${p}' which already exists (state ${st.t})`);
    } else if (e.token === 'M') {
      if (st.t === 'E') states.set(p, { t: 'M', steps: [s] });
      else if (st.via) st.via.dstSteps = union(st.via.dstSteps, [s]);
      else if (st.t === 'A' || st.t === 'M') st.steps = union(st.steps, [s]);
      else fail(e, `illegal transition: M on '${p}' which ${st.t === 'D' ? 'was deleted' : 'was moved away'}`);
    } else if (e.token === 'D') {
      if (st.t === 'E') states.set(p, { t: 'D', steps: [s] });
      else if (st.t === 'M') states.set(p, { t: 'D', steps: union(st.steps, [s]) });
      else if (st.t === 'A' && !st.via) states.delete(p);
      else if (st.via && st.t === 'A') {
        states.delete(p);
        states.set(st.via.src, { t: 'E' });
      } else if (st.via) {
        const all = union(st.via.srcSteps, st.via.dstSteps, [s]);
        states.delete(p);
        states.set(st.via.src, { t: 'D', steps: all });
      } else fail(e, `illegal transition: D on '${p}' which ${st.t === 'D' ? 'was already deleted' : 'was moved away'}`);
    } else {
      renameEntry(e);
    }
  }

  function renameEntry(e) {
    const src = e.src;
    const dstKey = e.path;
    const s = e.step;
    const from = get(src);
    const dst = get(dstKey);
    if (from.t === 'D') return fail(e, `illegal transition: R from '${src}' which was deleted`);
    if (from.t === 'X') return fail(e, `illegal transition: R from '${src}' which was moved away`);
    if (dst.t === 'A' || dst.t === 'M' || dst.t === 'R' || dst.t === 'X') {
      return fail(
        e,
        dst.t === 'X'
          ? `unsupported transition: R onto '${dstKey}' which was moved away earlier (not covered by the fold table)`
          : `illegal transition: R onto '${dstKey}' which already exists`
      );
    }
    // Source-side facts.
    let viaSrc;
    let srcSteps;
    let dstSteps;
    let created; // the moved file was created by this change
    let existedAtBaseline;
    if (from.via) {
      viaSrc = from.via.src;
      srcSteps = from.via.srcSteps;
      dstSteps = union(from.via.dstSteps, [s]);
      created = from.t === 'A';
      existedAtBaseline = false;
    } else {
      viaSrc = src;
      srcSteps = from.t === 'E' ? [] : from.steps;
      dstSteps = [s];
      created = from.t === 'A';
      existedAtBaseline = from.t !== 'A';
    }
    if (dst.t === 'D') {
      // The destination existed at the baseline: no merge.
      const all = union(srcSteps, dstSteps);
      states.set(dstKey, { t: 'M', steps: union(dst.steps, [s]) });
      if (from.via) {
        states.set(src, { t: 'X', existed: false, steps: [] });
        if (from.t === 'A') states.set(viaSrc, { t: 'E' });
        else states.set(viaSrc, { t: 'D', steps: all });
      } else if (created) states.delete(src);
      else states.set(src, { t: 'D', steps: all });
      return undefined;
    }
    states.set(dstKey, { t: created ? 'A' : 'R', via: { src: viaSrc, srcSteps, dstSteps } });
    if (from.via) {
      states.set(src, { t: 'X', existed: false, steps: [] });
    } else {
      states.set(src, { t: 'X', existed: existedAtBaseline, steps: srcSteps });
    }
    return undefined;
  }

  const lines = [];
  for (const [key, st] of states) {
    if (st.t === 'E' || st.t === 'X') continue;
    const steps = stepsOf(st)
      .map((n) => `Step ${n}`)
      .join(', ');
    if (st.t === 'R') lines.push({ key, text: `R ${st.via.src} -> ${key} (${steps})` });
    else lines.push({ key, text: `${st.t} ${key}${st.generated ? ` — generated count=${st.generated.count}` : ''} (${steps})` });
  }
  lines.sort((a, b) => Buffer.compare(Buffer.from(a.key, 'utf8'), Buffer.from(b.key, 'utf8')));
  return { lines: lines.map((l) => l.text), errors };
}

// ---------------------------------------------------------------------------
// design.md manifest section
// ---------------------------------------------------------------------------

function findManifest(designLines) {
  const start = designLines.findIndex((l) => l.trim() === MANIFEST_HEADING);
  if (start === -1) return null;
  let end = designLines.length;
  for (let i = start + 1; i < designLines.length; i++) {
    if (/^#{1,3}\s/.test(designLines[i])) {
      end = i;
      break;
    }
  }
  return { start, end };
}

function persistedBody(designLines, loc) {
  return designLines
    .slice(loc.start + 1, loc.end)
    .map((l) => l.trimEnd())
    .filter((l) => l.trim() !== '');
}

function renderBody(lines) {
  return lines.length === 0 ? [EMPTY_LINE] : lines;
}

function insertionPoint(designLines) {
  const snap = designLines.findIndex((l) => l.trim() === '### Architecture Snapshot');
  const target = designLines.findIndex((l) => l.trim() === '## Target State');
  const from = snap !== -1 ? snap : target;
  if (from === -1) return -1;
  for (let i = from + 1; i < designLines.length; i++) {
    if (/^##\s/.test(designLines[i]) && !/^###/.test(designLines[i])) return i;
  }
  return designLines.length;
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

function readFile(file, label) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch (err) {
    throw new ToolError(`cannot read ${label}: ${file}`);
  }
}

function run(mode, changeName, cwd) {
  const dir = path.join(path.resolve(cwd), 'openspec', 'changes', changeName);
  const tasksFile = path.join(dir, 'tasks.md');
  const designFile = path.join(dir, 'design.md');
  const tasks = readFile(tasksFile, 'tasks.md');
  const design = readFile(designFile, 'design.md');

  const { entries, errors: parseErrors, sentinels } = extractEntries(tasks);
  const result = { mode, change: changeName, tasks: tasksFile, design: designFile };
  if (parseErrors.length > 0) return { ...result, ok: false, status: 'error', errors: parseErrors };
  if (entries.length === 0 && sentinels === 0) {
    return {
      ...result,
      ok: false,
      status: 'error',
      errors: [{ line: 0, step: null, message: 'tasks.md has no **Files Affected** entries to fold' }],
    };
  }
  const folded = fold(entries);
  if (folded.errors.length > 0) return { ...result, ok: false, status: 'error', errors: folded.errors };
  const body = renderBody(folded.lines);
  result.lines = body;

  const nl = design.includes('\r\n') ? '\r\n' : '\n';
  const designLines = design.split(/\r?\n/);
  const loc = findManifest(designLines);

  if (mode === 'verify') {
    if (!loc) return { ...result, ok: false, status: 'missing', divergence: 'design.md has no `### File Manifest`' };
    const persisted = persistedBody(designLines, loc);
    const same =
      persisted.length === body.length && persisted.every((l, i) => l === body[i]);
    if (same) return { ...result, ok: true, status: 'match' };
    return { ...result, ok: false, status: 'diverged', expected: body, persisted };
  }

  const block = [MANIFEST_HEADING, '', ...body, ''];
  let next;
  if (loc) {
    const persisted = persistedBody(designLines, loc);
    if (persisted.length === body.length && persisted.every((l, i) => l === body[i])) {
      return { ...result, ok: true, status: 'unchanged' };
    }
    next = [...designLines.slice(0, loc.start), ...block, ...designLines.slice(loc.end)];
  } else {
    const at = insertionPoint(designLines);
    if (at === -1) {
      return {
        ...result,
        ok: false,
        status: 'error',
        errors: [{ line: 0, step: null, message: 'design.md has no `## Target State` section to hold the manifest' }],
      };
    }
    let head = designLines.slice(0, at);
    while (head.length > 0 && head[head.length - 1].trim() === '') head.pop();
    next = [...head, '', ...block, ...designLines.slice(at)];
  }
  fs.writeFileSync(designFile, next.join(nl));
  return { ...result, ok: true, status: 'written' };
}

function render(result) {
  const out = [];
  if (result.status === 'error') {
    out.push(`file-manifest ${result.mode}: FAILED — no changes written`);
    for (const e of result.errors) {
      out.push(`  tasks.md${e.line ? `:${e.line}` : ''}${e.step ? ` (Step ${e.step})` : ''}: ${e.message}`);
    }
  } else if (result.status === 'missing') {
    out.push(`file-manifest verify: ${result.divergence}`);
  } else if (result.status === 'diverged') {
    out.push('file-manifest verify: design.md `### File Manifest` diverges from the fold');
    out.push('  expected:');
    for (const l of result.expected) out.push(`    ${l}`);
    out.push('  persisted:');
    for (const l of result.persisted) out.push(`    ${l}`);
  } else {
    out.push(`file-manifest ${result.mode}: ${result.status} (${result.lines.length} line${result.lines.length === 1 ? '' : 's'})`);
  }
  return out.join('\n');
}

function main(argv) {
  let opts;
  try {
    opts = parseArgs(argv);
    if (opts.help) {
      process.stdout.write(usage() + '\n');
      return 0;
    }
    const [mode, changeName, ...extra] = opts.positional;
    if (!mode || !['fold', 'verify'].includes(mode)) throw new ToolError('sub-command required: fold or verify');
    if (!changeName) throw new ToolError('change name required');
    if (extra.length > 0) throw new ToolError(`unexpected argument: ${extra[0]}`);
    const result = run(mode, changeName, opts.cwd);
    process.stdout.write((opts.json ? JSON.stringify(result, null, 2) : render(result)) + '\n');
    return result.ok ? 0 : 1;
  } catch (err) {
    if (err instanceof ToolError) {
      process.stderr.write(`file-manifest: ${err.message}\n${err.code === 2 ? usage() + '\n' : ''}`);
      return err.code;
    }
    throw err;
  }
}

if (require.main === module) process.exit(main(process.argv.slice(2)));

module.exports = { extractEntries, fold, run, main, EMPTY_LINE };
