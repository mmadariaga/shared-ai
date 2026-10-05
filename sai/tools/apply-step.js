#!/usr/bin/env node

'use strict';

/**
 * apply-step — deterministic post-dispatch verification and Step close for
 * `/sai-4-apply`.
 *
 * The apply coordinator used to run these mechanics in prose, a few dozen
 * turns per Step. It reads git, the filesystem, coordinator-owned immutable
 * temporary records and the change's `implementation.md` / `tasks.md`, never `sai-state`, and returns one
 * JSON object per call. The coordinator keeps the judgment, the state-machine
 * emits, the guard remediation, and message authoring.
 *
 * Sub-commands:
 *   preflight Read-only delivery/execution compatibility checks using the same parser.
 *   baseline  Capture immutable initial file/index state outside the repository.
 *   dispatch-check Refuse initially dirty owned paths; capture a dispatch checkpoint.
 *   inspect   Read-only preservation and owned-change inventory.
 *   restore-unrelated-index Coordinator-only staging restoration after guard reset.
 *   verify   After every RED/GREEN return. Sweeps `.tmp/<change>/`, runs the
 *            Step test command and the Step's Automated commands verbatim,
 *            sweeps again, and compares `git status` with the files allowed for
 *            the dispatch kind and with field 8 (the add-list, on stdin).
 *   close    Run the guard verify, build the visibility report with its
 *            pinned status letter, mark the Step's Automated checkboxes on
 *            disk, then `git add` + `git commit`. The add-list is the stdin
 *            text above the first `---` line; the commit message is the text
 *            below it. `--dry-run` runs only the guard and the report.
 *            `--mark-only` only marks the Step's Automated checkboxes, for a
 *            declined commit: no guard, no report, no message, no git.
 *
 * Usage:
 *   node sai/tools/apply-step.js verify --change <name> --step <N>
 *        --dispatch red|green|green-direct|green-exception
 *        --baseline <ref> [--checkpoint <ref>]
 *        [--parent-was-absent] [--json] [--cwd <dir>]        (add-list on stdin)
 *   node sai/tools/apply-step.js close --change <name> --step <N>
 *        --baseline <ref> --guard-base <sha|n/a> [--dry-run | --mark-only] [--json] [--cwd <dir>]
 *        (add-list, a `---` line, then the message on stdin; nothing for
 *        --mark-only)
 *
 * Output is always one JSON object; `--json` is accepted and changes nothing.
 *
 * Exit codes: 0 = the call ran (read `ok` / `committed` in the JSON);
 *             1 = close refused or failed (guard violation, bad message,
 *                 commit failure); 2 = usage error or IO failure.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const guard = require('./no-commit-guard');
const { checkCommitRules } = require('./lint');

const DISPATCHES = ['red', 'green', 'green-direct', 'green-exception'];
const TAIL_LINES = 20;
const COMMAND_TIMEOUT_MS = 10 * 60 * 1000;

class ToolError extends Error {
  constructor(message, code = 2) {
    super(message);
    this.code = code;
  }
}

function run(command, args, cwd, input = null) {
  const options = { cwd, encoding: 'utf8', windowsHide: true, maxBuffer: 64 * 1024 * 1024 };
  if (input !== null) options.input = input;
  const result = spawnSync(command, args, options);
  if (result.error) {
    return { status: null, stdout: result.stdout || '', stderr: result.error.message };
  }
  return { status: result.status, stdout: result.stdout || '', stderr: result.stderr || '' };
}

function git(args, cwd, input = null) {
  return run('git', args, cwd, input);
}

function norm(p) {
  return String(p).replace(/\\/g, '/').replace(/^\.\//, '');
}

// ---------------------------------------------------------------------------
// Plan parsing
// ---------------------------------------------------------------------------

function readIfExists(file) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch (err) {
    return null;
  }
}

function changeDir(cwd, change) {
  return path.join(cwd, 'openspec', 'changes', change);
}

/** Lines of `#### Step N:` up to the next `#### Step <n>:` heading. */
function stepSection(text, step) {
  const lines = text.split('\n');
  const head = new RegExp(`^#### Step ${step}:`);
  const any = /^#### Step \d+:/;
  const start = lines.findIndex((l) => head.test(l));
  if (start === -1) return null;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (any.test(lines[i])) {
      end = i;
      break;
    }
  }
  return { lines, start, end };
}

function backticked(line) {
  const out = [];
  const re = /`([^`]+)`/g;
  let m;
  while ((m = re.exec(line)) !== null) out.push(m[1].trim());
  return out;
}

function looksLikePath(token) {
  if (/\s/.test(token)) return false;
  return /^[\w@.\-/\\]+$/.test(token) && (/[/\\]/.test(token) || /\.\w+$/.test(token));
}

function pathsOf(line) {
  return backticked(line).filter(looksLikePath).map(norm);
}

function safePath(p) {
  return typeof p === 'string' && p === norm(p) && p.length > 0 &&
    !path.isAbsolute(p) && !p.includes(':') && !p.includes('\0') &&
    !p.split('/').some((part) => part === '..' || part === '.' || part === '.git' || !part) &&
    !/[\r\n*?\[\]]/.test(p);
}

// One basename family, one directory, a positive count; never a recursive glob.
function generatedEntry(text) {
  text = text.replace(/`/g, '');
  const m = text.match(/^A\s+([^\s]+)\s+— generated count=([1-9]\d*)$/);
  if (!m) return null;
  const pattern = norm(m[1]);
  const directory = path.posix.dirname(pattern);
  const family = path.posix.basename(pattern);
  if (!safePath(directory) || !/^[\w.-]+\*[\w.-]+$/.test(family)) return null;
  return { directory, family, count: Number(m[2]) };
}

function parseDeclaration(raw) {
  const text = raw.trim().replace(/^[-*+]\s+/, '').replace(/`/g, '');
  if (/^None\b/.test(text)) return { sentinel: true };
  const generated = generatedEntry(text);
  if (generated) return { token: 'A', path: `${generated.directory}/${generated.family}`, generated };
  if (text.includes('generated count=')) return { error: 'invalid bounded generated-file declaration' };
  const m = text.match(/^([AMDR])\s+(.+)$/);
  if (!m) return { error: 'unrecognized affected-file declaration' };
  const parts = m[2].replace(/\s+—\s+.*$/, '').split(/\s+->\s+/).map((p) => norm(p.trim()));
  if (m[1] === 'R' && parts.length === 2 && parts[0] === parts[1]) return { error: 'rename source and destination are identical' };
  if (parts.some((p) => !safePath(p)) || parts.length !== (m[1] === 'R' ? 2 : 1)) return { error: 'unsafe or unrecognized affected path' };
  return m[1] === 'R' ? { token: 'R', src: parts[0], path: parts[1] } : { token: m[1], path: parts[0] };
}

function declarationsOverlap(a, b) {
  if (a.directory !== b.directory) return false;
  const [ap, as] = a.family.split('*');
  const [bp, bs] = b.family.split('*');
  return (ap.startsWith(bp) || bp.startsWith(ap)) && (as.endsWith(bs) || bs.endsWith(as));
}

/**
 * Extract the Step's contract from implementation.md: test command, RED block
 * paths, retirements, GREEN/instruction paths, Automated
 * items.
 */
function parseStep(planText, step) {
  const section = stepSection(planText, step);
  if (!section) return null;
  const body = section.lines.slice(section.start, section.end);

  const info = {
    stepTestCommand: null,
    hasRedBlock: false,
    redPaths: [],
    testPaths: [],
    retirements: [],
    updates: [],
    instructionPaths: [],
    automated: [],
    automatedRange: null,
  };

  let phase = 'pre';
  let verifyRedCommand = null;
  for (let i = 0; i < body.length; i++) {
    const line = body[i];
    if (/^#####\s+RED phase/.test(line)) {
      phase = 'red';
      info.hasRedBlock = true;
      continue;
    }
    if (/^#####\s+GREEN phase/.test(line)) {
      phase = 'green';
      continue;
    }
    if (/^#####\s+Step \d+ Verification Checklist/.test(line)) {
      phase = 'checklist';
      continue;
    }
    if (/^####\s+Step \d+ STOP/.test(line)) break;

    const cmdLine = line.match(/\*\*Step test command:\*\*\s*`([^`]+)`/);
    if (cmdLine) info.stepTestCommand = cmdLine[1].trim();

    if (phase === 'red') {
      if (/^\s*-\s+\*\*Retirements:\*\*/.test(line)) {
        const found = pathsOf(line);
        info.retirements.push(...found);
        info.redPaths.push(...found);
        info.testPaths.push(...found);
      } else if (/^\s*-\s+\*\*Existing tests to update:\*\*/.test(line)) {
        const found = pathsOf(line);
        info.updates.push(...found);
        info.redPaths.push(...found);
        info.testPaths.push(...found);
      } else if (/^\s*-\s+\[.\]\s+(Create a minimal stub at|Write the test into)/.test(line)) {
        const found = pathsOf(line);
        info.redPaths.push(...found);
        if (/Write the test into/.test(line)) info.testPaths.push(...found);
      } else if (/^\s*-\s+\[.\]\s+Verify RED:/.test(line)) {
        const cmds = backticked(line);
        if (cmds.length > 0) verifyRedCommand = cmds[0];
      }
    }
    if (phase === 'pre' || phase === 'green') {
      if (/^\s*-\s+\[.\]/.test(line)) info.instructionPaths.push(...pathsOf(line));
    }
    if (phase === 'checklist') {
      if (/^\*\*Automated/.test(line)) {
        info.automatedRange = { from: i + 1, to: null };
        continue;
      }
      if (info.automatedRange && info.automatedRange.to === null) {
        if (/^\*\*(Functional|Human)/.test(line) || /^####/.test(line) || /^\*\(/.test(line) || /^\*[^*]/.test(line)) {
          info.automatedRange.to = i;
        } else if (/^\s*-\s+\[[ xX]\]/.test(line)) {
          info.automated.push({ index: i, text: line.replace(/^\s*-\s+\[[ xX]\]\s*/, '') });
        }
      }
    }
  }
  if (info.automatedRange && info.automatedRange.to === null) info.automatedRange.to = body.length;

  if (!info.stepTestCommand && verifyRedCommand) info.stepTestCommand = verifyRedCommand;
  info.retirements = unique(info.retirements);
  info.updates = unique(info.updates);
  info.redPaths = unique(info.redPaths);
  info.testPaths = unique(info.testPaths);
  info.instructionPaths = unique(info.instructionPaths);
  info.sectionStart = section.start;
  return info;
}

function unique(list) {
  return [...new Set(list)];
}

/** tasks.md `## Step N` Files Affected → {declared:[paths], renames:[[src,dst]]} or null. */
function parseFilesAffected(tasksText, step) {
  if (!tasksText) return null;
  const lines = tasksText.split('\n');
  const start = lines.findIndex((l) => new RegExp(`^##\\s+Step ${step}\\b`).test(l));
  if (start === -1) return null;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (/^##\s+Step \d+\b/.test(lines[i])) {
      end = i;
      break;
    }
  }
  const body = lines.slice(start, end);
  const idx = body.findIndex((l) => /^\*\*Files Affected\*\*/.test(l));
  if (idx === -1) return null;
  const declared = [];
  const renames = [];
  const generated = [];
  const errors = [];
  const consume = (raw, line) => {
    const text = raw.replace(/^\s*[-*]\s+/, '').replace(/`/g, '').trim();
    if (!text || /^<!--.*-->$/.test(text)) return;
    const entry = parseDeclaration(text);
    if (entry.sentinel) return;
    if (entry.error) { errors.push({ line, reason: entry.error }); return; }
    if (entry.generated) {
      if (generated.some((g) => declarationsOverlap(g, entry.generated))) errors.push({ line, reason: 'overlapping generated families' });
      generated.push(entry.generated); return;
    }
    if (entry.src) { renames.push([entry.src, entry.path]); declared.push(entry.src, entry.path); }
    else declared.push(entry.path);
  };
  const first = body[idx].replace(/^\*\*Files Affected\*\*:?\s*/, '');
  if (first) consume(first, start + idx + 1);
  for (let i = idx + 1; i < body.length; i++) {
    if (/^\*\*[^*]+\*\*/.test(body[i])) break;
    if (body[i].trim()) consume(body[i], start + i + 1);
  }
  if (declared.length === 0 && generated.length === 0 && errors.length === 0) return null;
  return { declared: unique(declared), renames, generated, errors };
}

function resolveGenerated(cwd, files) {
  if (!files) return null;
  const declared = [...files.declared];
  const errors = [...files.errors];
  const claimed = new Set(declared);
  for (const g of files.generated) {
    const [prefix, suffix] = g.family.split('*');
    let names = [];
    try {
      const dir = path.join(cwd, g.directory);
      const relative = path.relative(fs.realpathSync(cwd), fs.realpathSync(dir));
      if (!fs.lstatSync(dir).isDirectory() || relative.split(path.sep)[0] === '..' || path.isAbsolute(relative)) throw new ToolError('generated directory escapes repository or is a symlink');
      names = fs.readdirSync(dir, { withFileTypes: true });
    }
    catch (err) { if (err.code !== 'ENOENT') throw err; }
    const matches = names.filter((e) => e.isFile() && e.name.startsWith(prefix) && e.name.endsWith(suffix))
      .map((e) => `${g.directory}/${e.name}`).sort();
    if (matches.length !== g.count) errors.push({ reason: `generated ${g.directory}/${g.family}: expected ${g.count}, found ${matches.length}` });
    for (const p of matches) {
      if (claimed.has(p)) errors.push({ reason: `ambiguous generated path: ${p}` });
      claimed.add(p);
      declared.push(p);
    }
  }
  return { ...files, declared: unique(declared), errors };
}

/** Read-only: use exactly the interpretation routines used by verify/close. */
function preflight(opts) {
  const plan = readIfExists(path.join(changeDir(opts.cwd, opts.change), 'implementation.md'));
  if (plan === null) throw new ToolError('implementation.md is missing');
  const tasks = readIfExists(path.join(changeDir(opts.cwd, opts.change), 'tasks.md'));
  const errors = [];
  const lines = plan.split('\n');
  const suiteHeading = lines.findIndex((l) => l.trim() === '## Verification commands');
  const suiteEnd = lines.findIndex((l, i) => i > suiteHeading && /^## /.test(l));
  const suiteSection = suiteHeading >= 0 ? lines.slice(suiteHeading + 1, suiteEnd < 0 ? lines.length : suiteEnd).join('\n') : '';
  const suiteCommand = suiteSection.match(/\*\*Full-suite command:\*\*\s*`([^`]+)`/)?.[1]?.trim();
  if (suiteHeading >= 0 && !suiteCommand) errors.push({ step: null, line: suiteHeading + 1, file: 'implementation.md', reason: 'missing recognized full-suite command' });
  const steps = [];
  const fail = (step, line, reason, file = 'implementation.md') => errors.push({ step, line, file, reason });
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^#### Step (\d+):/);
    if (!m) continue;
    const n = Number(m[1]);
    if (n < 1 || steps.includes(n)) fail(n, i + 1, 'duplicate or invalid Step number');
    steps.push(n);
    const info = parseStep(plan, n);
    const section = stepSection(plan, n);
    const body = lines.slice(section.start, section.end);
    const recognizedPaths = unique([...info.redPaths, ...info.instructionPaths]);
    const redModes = new Map();
    for (let j = 0; j < body.length; j++) if (/Existing tests to update:/.test(body[j])) {
      for (const entry of existingTestEntries(body[j])) {
        if (entry.error) fail(n, section.start + j + 1, entry.error);
        else redModes.set(entry.path, entry.mode);
      }
    }
    if (!info.automatedRange || info.automated.length === 0) fail(n, i + 1, 'missing recognized Automated checklist');
    if (!body.some((l) => new RegExp(`^#### Step ${n} STOP & COMMIT`).test(l))) fail(n, i + 1, 'missing STOP & COMMIT');
    if (info.hasRedBlock && (!info.stepTestCommand || info.testPaths.length === 0 || !body.some((l) => /^##### GREEN phase/.test(l)))) fail(n, i + 1, 'incomplete recognized RED/GREEN contract');
    const expectations = new Map(info.stepTestCommand ? [[info.stepTestCommand, 'pass']] : []);
    for (const item of info.automated) {
      const c = classifyAutomated(item.text);
      if (c.kind === 'run') {
        if (expectations.has(c.command) && expectations.get(c.command) !== c.expect) fail(n, section.start + item.index + 1, 'conflicting expectations for the same command');
        expectations.set(c.command, c.expect);
      }
      if (c.kind === 'unjudged') fail(n, section.start + item.index + 1, `incomplete command check: ${c.reason}`);
      if (c.command && suiteCommand && c.command === suiteCommand) fail(n, section.start + item.index + 1, 'full-suite command is terminal-only');
      if (c.kind === 'covered' && backticked(item.text)[0] !== info.stepTestCommand) fail(n, section.start + item.index + 1, 'RED/GREEN checklist command differs from Step test command');
    }
    for (let j = 0; j < body.length; j++) {
      const l = body[j];
      if (/^\s*-\s+\[[ xX]\]/.test(l) && /(?:Write the test|Create a minimal stub|Copy and paste|Modify|Update|Delete|Remove).*\b(?:at|into|in)\b/.test(l)) {
        const ps = pathsOf(l);
        if (ps.length === 0 || ps.some((p) => !safePath(p))) fail(n, section.start + j + 1, 'required instruction path is not recognized');
        else if (ps.some((p) => !recognizedPaths.includes(p))) fail(n, section.start + j + 1, 'instruction is not interpreted by Apply');
      }
    }
    const files = parseFilesAffected(tasks, n);
    if (files) for (const e of files.errors) fail(n, e.line, e.reason, 'tasks.md');
    if (tasks) {
      const taskLines = tasks.split('\n');
      const at = taskLines.findIndex((l) => new RegExp(`^## Step ${n}\\b`).test(l));
      let end = taskLines.findIndex((l, k) => k > at && /^## /.test(l));
      if (end < 0) end = taskLines.length;
      const broken = taskLines.slice(at, end).findIndex((l) => /^\*\*Existing Tests Broken\*\*/.test(l));
      if (at >= 0 && broken >= 0) {
        const text = taskLines.slice(at + broken, end).join('\n');
        if (!/^\*\*Existing Tests Broken\*\*:\s*None\b/.test(text)) {
          const paths = pathsOf(text);
          if (paths.length === 0) fail(n, at + broken + 1, 'existing-test paths must be backticked exact paths', 'tasks.md');
          for (const p of paths) if (!info.hasRedBlock || !info.updates.includes(p)) fail(n, at + broken + 1, `existing test not assigned to RED: ${p}`, 'tasks.md');
          for (const entry of existingTestEntries(text)) {
            if (entry.error) fail(n, at + broken + 1, entry.error, 'tasks.md');
            else if (redModes.get(entry.path) !== entry.mode) fail(n, at + broken + 1, `incompatible RED failure mode: ${entry.path}`, 'tasks.md');
          }
        }
      }
    }
  }
  if (steps.length === 0) fail(null, 1, 'no recognized Step headings');
  for (let i = 0; i < lines.length; i++) if (/^#{3,5}\s+Step\s/.test(lines[i]) && !/^#### Step \d+(?::| STOP & COMMIT)/.test(lines[i]) && !/^##### Step \d+ Verification Checklist/.test(lines[i])) fail(null, i + 1, 'unrecognized Step heading');
  return { ok: errors.length === 0, steps, errors, semantic_coverage: 'agent-reviewed, not guaranteed by preflight' };
}

function existingTestEntries(text) {
  if (/Existing tests to update:\*\*\s*None\b/.test(text)) return [];
  const tokens = [...text.matchAll(/`([^`]+)`/g)].filter((m) => looksLikePath(m[1]));
  if (!tokens.length) return [{ error: 'existing-test declaration requires exact backticked test paths and compile|runtime modes' }];
  return tokens.map((m, i) => {
    const p = norm(m[1]);
    const tail = text.slice(m.index + m[0].length, tokens[i + 1]?.index ?? text.length);
    const mode = tail.match(/^\s*(?:\(\s*`?(compile|runtime)`?\s*\)|[—:,-]\s*`?(compile|runtime)`?\b)/);
    if (!safePath(p) || !/(?:^|\/)(?:tests?|__tests__|fixtures|test-support)\/|\.(?:test|spec)\./i.test(p)) return { error: `not a recognized test/support path: ${p}` };
    if (!mode) return { error: `missing or invalid compile|runtime mode: ${p}` };
    return { path: p, mode: mode[1] || mode[2] };
  });
}

const digest = (value) => crypto.createHash('sha256').update(value).digest('hex');

function fileState(cwd, p) {
  try {
    const file = path.join(cwd, p);
    const stat = fs.lstatSync(file);
    if (stat.isSymbolicLink()) return `link:${digest(fs.readlinkSync(file))}`;
    if (!stat.isFile()) throw new ToolError(`unsupported file state: ${p}`);
    return `${stat.mode & 0o777}:${digest(fs.readFileSync(file))}`;
  } catch (err) { if (err.code === 'ENOENT') return null; throw err; }
}

function captureState(cwd) {
  const list = git(['ls-files', '-z', '--cached', '--others'], cwd);
  const index = git(['ls-files', '--stage', '-z'], cwd);
  if (list.status !== 0 || index.status !== 0) throw new ToolError('cannot capture Git state');
  const paths = unique(list.stdout.split('\0').filter(Boolean).map(norm));
  const contents = Object.fromEntries(paths.map((p) => [p, fileState(cwd, p)]));
  const staged = {};
  for (const line of index.stdout.split('\0').filter(Boolean)) {
    const at = line.indexOf('\t');
    const p = norm(line.slice(at + 1));
    staged[p] = (staged[p] || '') + line.slice(0, at) + '\n';
  }
  const head = git(['rev-parse', '--verify', 'HEAD'], cwd);
  return { contents, staged, entries: statusEntries(cwd), head: head.status === 0 ? head.stdout.trim() : null };
}

function saveRecord(record) {
  // OS temporary storage is shared by both supported harnesses, outside the sweep.
  const root = fs.realpathSync(os.tmpdir());
  const relative = path.relative(record.cwd, root);
  if (relative.split(path.sep)[0] !== '..' && !path.isAbsolute(relative)) throw new ToolError('temporary record directory must be outside the repository');
  const file = path.join(root, `sai-apply-${crypto.randomUUID()}.json`);
  const text = JSON.stringify(record);
  fs.writeFileSync(file, text, { flag: 'wx', mode: 0o600 });
  return `${file}#${digest(text)}`;
}

function loadRecord(ref, opts, kind) {
  if (!ref) throw new ToolError(`--${kind} is required; initial state must not be recaptured`);
  const at = ref.lastIndexOf('#');
  const file = ref.slice(0, at);
  const relative = path.relative(opts.cwd, file);
  if (at < 1 || !path.isAbsolute(file) || (relative.split(path.sep)[0] !== '..' && !path.isAbsolute(relative))) throw new ToolError(`invalid ${kind} reference`);
  try {
    const text = fs.readFileSync(file, 'utf8');
    const record = JSON.parse(text);
    if (digest(text) !== ref.slice(at + 1) || record.version !== 1 || record.kind !== kind || record.cwd !== opts.cwd || record.change !== opts.change || !record.run_id || !record.state?.contents || !record.state?.staged || !Array.isArray(record.state?.entries)) throw new Error('identity/integrity mismatch');
    if (kind === 'baseline') {
      const claim = path.join(fs.realpathSync(os.tmpdir()), `sai-apply-run-${digest(`${opts.cwd}\0${record.run_id}`)}.claim`);
      if (fs.readFileSync(claim, 'utf8') !== ref) throw new Error('run identity reference is missing or replaced');
    }
    return record;
  } catch (err) { throw new ToolError(`missing or corrupt ${kind}: ${err.message}; continuation blocked`); }
}

function baseline(opts, stdin) {
  if (!/^[\w-]{8,128}$/.test(opts.runId || '')) throw new ToolError('--run-id must be a stable coordinator-supplied identity (8–128 characters)');
  const claim = path.join(fs.realpathSync(os.tmpdir()), `sai-apply-run-${digest(`${opts.cwd}\0${opts.runId}`)}.claim`);
  try { fs.writeFileSync(claim, 'capture reserved; resume requires original reference', { flag: 'wx', mode: 0o600 }); }
  catch (err) { throw new ToolError(`run identity already captured or unavailable; recapture blocked: ${err.code}`); }
  if (fs.existsSync(path.join(opts.cwd, '.tmp', opts.change))) throw new ToolError('pre-existing Step scratch must be preserved; baseline capture blocked');
  const planning = parseAddList(stdin);
  const dir = `openspec/changes/${opts.change}/`;
  const names = ['implementation.md', 'tasks.md', 'interfaces.md', 'proposal.md', 'design.md', 'change-overview.md', '.openspec.yaml'];
  for (const p of planning) if (!safePath(p) || !p.startsWith(dir) || (!names.includes(p.slice(dir.length)) && !/^specs\/[^/]+\/spec\.md$/.test(p.slice(dir.length)))) throw new ToolError(`planning provenance outside authorized planning input scope: ${p}`);
  const record = { version: 1, kind: 'baseline', run_id: opts.runId, cwd: opts.cwd, change: opts.change, planning, state: captureState(opts.cwd) };
  const reference = saveRecord(record);
  fs.writeFileSync(claim, reference);
  return { baseline: reference, run_id: record.run_id, capture_claim: claim };
}

function delta(before, after) {
  return unique([...Object.keys(before.contents), ...Object.keys(after.contents), ...Object.keys(before.staged), ...Object.keys(after.staged)])
    .filter((p) => (before.contents[p] ?? null) !== (after.contents[p] ?? null) || (before.staged[p] ?? null) !== (after.staged[p] ?? null));
}

function dispatchCheck(opts) {
  const base = loadRecord(opts.baseline, opts, 'baseline');
  const current = executionState(opts);
  if (current.preservationErrors.length || current.planningErrors.length) return { ok: false, conflicts: unique([...current.preservationErrors, ...current.planningErrors]), checkpoint: null };
  const info = parseStep(readIfExists(path.join(changeDir(opts.cwd, opts.change), 'implementation.md')) || '', opts.step);
  if (!info) throw new ToolError('Step not found');
  const files = resolveGenerated(opts.cwd, parseFilesAffected(readIfExists(path.join(changeDir(opts.cwd, opts.change), 'tasks.md')), opts.step));
  const allowed = allowedFor(opts.dispatch, info, files);
  if (!allowed.every(safePath)) throw new ToolError('unsafe dispatch scope');
  const dirty = base.state.entries.flatMap((e) => e.from ? [e.path, e.from] : [e.path]);
  const conflicts = dirty.filter((p) => allowed.includes(p));
  // Generated families must also be disjoint from every pre-existing dirty path.
  for (const p of dirty) for (const g of files?.generated || []) {
    const [prefix, suffix] = g.family.split('*');
    if (path.posix.dirname(p) === g.directory && path.posix.basename(p).startsWith(prefix) && p.endsWith(suffix)) conflicts.push(p);
  }
  if (conflicts.length) return { ok: false, conflicts: unique(conflicts), checkpoint: null };
  const record = { version: 1, kind: 'checkpoint', run_id: base.run_id, cwd: opts.cwd, change: opts.change, baseline: opts.baseline, step: String(opts.step), dispatch: opts.dispatch, state: captureState(opts.cwd) };
  return { ok: true, conflicts: [], checkpoint: saveRecord(record) };
}

function restoreUnrelatedIndex(opts) {
  const base = loadRecord(opts.baseline, opts, 'baseline');
  const state = captureState(opts.cwd);
  const protectedPaths = unique(base.state.entries.flatMap((e) => e.from ? [e.path, e.from] : [e.path])).filter((p) => !base.planning.includes(p));
  if (protectedPaths.some((p) => !safePath(p) || (state.contents[p] ?? null) !== (base.state.contents[p] ?? null))) throw new ToolError('unrelated content changed; index restoration blocked, work preserved');
  const entries = [];
  for (const p of protectedPaths) {
    const initial = base.state.staged[p];
    if (initial) for (const line of initial.trim().split('\n')) entries.push(`${line}\t${p}`);
    else entries.push(`0 ${'0'.repeat(40)}\t${p}`);
  }
  if (entries.length) {
    const result = git(['update-index', '--index-info'], opts.cwd, entries.join('\n') + '\n');
    if (result.status !== 0) throw new ToolError(`cannot restore unrelated staging: ${result.stderr}`);
  }
  return { ok: true, restored: protectedPaths };
}

function executionState(opts) {
  const base = loadRecord(opts.baseline, opts, 'baseline');
  const current = captureState(opts.cwd);
  const dirty = unique(base.state.entries.flatMap((e) => e.from ? [e.path, e.from] : [e.path]));
  const changedFromBase = delta(base.state, current);
  const unrelated = dirty.filter((p) => !base.planning.includes(p) && !changedFromBase.includes(p));
  const preservedDirty = dirty.filter((p) => !base.planning.includes(p));
  const preservationErrors = preservedDirty.filter((p) => changedFromBase.includes(p));
  const visible = unique(current.entries.flatMap((e) => e.from ? [e.path, e.from] : [e.path]));
  const frozenInputs = unique([...base.planning, ...['tasks.md', 'interfaces.md', 'proposal.md', 'design.md'].map((name) => `openspec/changes/${opts.change}/${name}`)]);
  const planningErrors = frozenInputs.filter((p) => p !== planRelPath(opts.change) && changedFromBase.includes(p));
  const changed = unique([...visible, ...changedFromBase]).filter((p) => !unrelated.includes(p) && !base.planning.includes(p) && p !== planRelPath(opts.change) && !isScratch(p, opts.change));
  // Earlier authorized commits are clean now and must not become this Step's changes.
  const uncommitted = changed.filter((p) => visible.includes(p));
  const settled = opts.settled ? loadRecord(opts.settled, opts, 'settled') : null;
  if (settled && (settled.baseline !== opts.baseline || settled.run_id !== base.run_id || !Array.isArray(settled.paths))) throw new ToolError('settled record belongs to another run');
  const retainedOwned = settled ? settled.paths.filter((p) => !delta(settled.state, current).includes(p)) : [];
  return { base, current, settled, unrelated, retainedOwned, preservationErrors, planningErrors, changed: uncommitted.filter((p) => !retainedOwned.includes(p)), allChanged: changed };
}

function assertPlanUnchanged(opts, state) {
  let expected = state.settled || state.base;
  if (opts.planCheckpoint) {
    expected = loadRecord(opts.planCheckpoint, opts, 'plan-checkpoint');
    if (expected.baseline !== opts.baseline || expected.run_id !== state.base.run_id) throw new ToolError('coordinator plan checkpoint belongs to another run');
  }
  if (delta(expected.state, state.current).includes(planRelPath(opts.change))) throw new ToolError('implementation.md changed outside the retained coordinator state; verification/marking blocked before commands');
}

function checkpointPlan(opts) {
  const state = executionState(opts);
  const record = { version: 1, kind: 'plan-checkpoint', run_id: state.base.run_id, cwd: opts.cwd, change: opts.change, baseline: opts.baseline, state: state.current };
  return { plan_checkpoint: saveRecord(record) };
}

function settleStep(opts, ownedPaths = null) {
  const state = executionState(opts);
  const owned = ownedPaths === null ? state.changed : state.changed.filter((p) => ownedPaths.includes(p));
  const record = { version: 1, kind: 'settled', run_id: state.base.run_id, cwd: opts.cwd, change: opts.change, baseline: opts.baseline, paths: unique([...state.retainedOwned, ...owned]), state: captureState(opts.cwd) };
  return saveRecord(record);
}

// ---------------------------------------------------------------------------
// Git state
// ---------------------------------------------------------------------------

/** Working-tree changes from `git status`: [{path, code, from?}]. */
function statusEntries(cwd) {
  const res = git(['status', '--porcelain=v1', '-z', '--untracked-files=all'], cwd);
  if (res.status !== 0) throw new ToolError(`git status failed: ${res.stderr.trim()}`);
  const parts = res.stdout.split('\0');
  const entries = [];
  for (let i = 0; i < parts.length; i++) {
    const item = parts[i];
    if (!item) continue;
    const code = item.slice(0, 2);
    const file = norm(item.slice(3));
    if (code[0] === 'R' || code[0] === 'C' || code[1] === 'R') {
      const from = norm(parts[++i] || '');
      entries.push({ path: file, code, from });
    } else {
      entries.push({ path: file, code });
    }
  }
  return entries;
}

function parseAddList(text) {
  const lines = text.split('\n').map((l) => norm(l.trim())).filter((l) => l && !l.startsWith('#'));
  return unique(lines);
}

function sweep(cwd, change, parentWasAbsent) {
  const dir = path.join(cwd, '.tmp', change);
  const removed = [];
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
    removed.push(`.tmp/${change}/`);
    const parent = path.join(cwd, '.tmp');
    if (parentWasAbsent) {
      let empty = false;
      try {
        empty = fs.readdirSync(parent).length === 0;
      } catch (err) {
        empty = false;
      }
      if (empty) {
        fs.rmdirSync(parent);
        removed.push('.tmp/');
      }
    }
  }
  return removed;
}

function sweepLine(removed) {
  return removed.length === 0 ? null : `> Scratch cleanup: removed ${removed.join(', ')}`;
}

function planRelPath(change) {
  return `openspec/changes/${change}/implementation.md`;
}

function isScratch(p, change) {
  return p === `.tmp/${change}` || p.startsWith(`.tmp/${change}/`);
}

// ---------------------------------------------------------------------------
// verify
// ---------------------------------------------------------------------------

const PASS_EXPECTATION = /^(?:exits?\s*(?:code\s*)?0|exit\s*=\s*0|passes|pass|passing|succeeds|success|ok|green|no output)\b/i;
const FAIL_EXPECTATION = /^(?:exits?\s*(?:code\s*)?(?:≠|!=|non-?zero)|fails?|fail(?:s|ing)?\b)/i;

/**
 * Classify one Automated item. Returns
 *   {kind:'run', command, expect:'pass'|'fail'} | {kind:'unjudged', item, reason}
 * `RED verified` / `GREEN verified` items are covered by the Step test command.
 */
function classifyAutomated(text) {
  if (/^(RED|GREEN) verified\b/.test(text)) return { kind: 'covered' };
  const cmds = backticked(text);
  if (cmds.length === 0) return { kind: 'unjudged', item: text, reason: 'no-command' };
  const command = cmds[0];
  const m = text.match(/`[^`]+`\s*(?:[—–-]+|:)\s*(.*)$/);
  const expectation = m ? m[1].trim().replace(/^\*+|\*+$/g, '').trim() : '';
  if (expectation === '' || PASS_EXPECTATION.test(expectation)) return { kind: 'run', command, expect: 'pass' };
  if (FAIL_EXPECTATION.test(expectation)) return { kind: 'run', command, expect: 'fail' };
  return { kind: 'unjudged', item: text, reason: 'free-text-expectation' };
}

function runCommand(command, cwd) {
  const res = spawnSync(command, {
    cwd,
    shell: true,
    encoding: 'utf8',
    windowsHide: true,
    maxBuffer: 64 * 1024 * 1024,
    timeout: COMMAND_TIMEOUT_MS,
  });
  const output = `${res.stdout || ''}${res.stderr || ''}`;
  const tail = output.split('\n').filter((l) => l.length > 0).slice(-TAIL_LINES).join('\n');
  const exit = typeof res.status === 'number' ? res.status : (res.error ? 124 : 1);
  return { command, exit, tail };
}

function allowedFor(dispatch, info, files) {
  const declared = files ? files.declared : [];
  let allowed = [];
  if (dispatch === 'red') {
    allowed = info.redPaths;
  } else if (dispatch === 'green' || dispatch === 'green-direct') {
    const tests = new Set(info.testPaths);
    allowed = unique([...info.instructionPaths, ...declared]).filter((p) => !tests.has(p));
  } else {
    allowed = unique([...info.redPaths, ...info.instructionPaths, ...declared]);
  }
  return allowed;
}

function verify(opts, stdin) {
  loadRecord(opts.baseline, opts, 'baseline');
  if (!opts.checkpoint && opts.baselineOnly !== true) throw new ToolError('--checkpoint is required (or explicit --baseline-only cumulative compatibility verification)');
  const { cwd, change, step, dispatch } = opts;
  const planText = readIfExists(path.join(changeDir(cwd, change), 'implementation.md'));
  if (planText === null) throw new ToolError(`implementation.md not found for change '${change}'`);
  const info = parseStep(planText, step);
  if (!info) throw new ToolError(`Step ${step} not found in implementation.md`);
  let files = parseFilesAffected(readIfExists(path.join(changeDir(cwd, change), 'tasks.md')), step);
  const addList = parseAddList(stdin);
  const before = opts.baseline ? executionState(opts) : null;
  const checkpoint = opts.checkpoint ? loadRecord(opts.checkpoint, opts, 'checkpoint') : null;
  if (checkpoint && (checkpoint.baseline !== opts.baseline || checkpoint.run_id !== before.base.run_id || checkpoint.step !== String(step) || checkpoint.dispatch !== dispatch)) throw new ToolError('checkpoint does not match dispatch');
  if (!checkpoint) assertPlanUnchanged(opts, before);

  const sweepLines = [];
  const first = sweep(cwd, change, opts.parentWasAbsent);
  if (sweepLine(first)) sweepLines.push(sweepLine(first));

  const commands = [];
  const unjudged = [];
  const failures = [];
  const ran = new Set();
  const runOnce = (command, expect, label) => {
    const identity = `${expect}\0${command}`;
    if (ran.has(identity)) return;
    ran.add(identity);
    const result = runCommand(command, cwd);
    result.expect = expect;
    result.label = label;
    commands.push(result);
    const passed = expect === 'pass' ? result.exit === 0 : result.exit !== 0;
    if (!passed) failures.push(result.command);
  };

  if (info.stepTestCommand) {
    runOnce(info.stepTestCommand, dispatch === 'red' ? 'fail' : 'pass', 'step-test-command');
  }

  const retirements = [];
  if (dispatch === 'red') {
    for (const retired of info.retirements) {
      const absent = !fs.existsSync(path.join(cwd, retired));
      retirements.push({ path: retired, absent });
      if (!absent) failures.push(`retired file still present: ${retired}`);
    }
  } else {
    for (const item of info.automated) {
      const verdict = classifyAutomated(item.text);
      if (verdict.kind === 'run') runOnce(verdict.command, verdict.expect, 'automated');
      else if (verdict.kind === 'unjudged') unjudged.push({ item: verdict.item, reason: verdict.reason });
    }
  }

  const second = sweep(cwd, change, opts.parentWasAbsent && first.length === 0);
  if (sweepLine(second)) sweepLines.push(sweepLine(second));
  files = resolveGenerated(cwd, files);

  const entries = statusEntries(cwd).filter((e) => !isScratch(e.path, change));
  const plan = planRelPath(change);
  const state = opts.baseline ? executionState(opts) : null;
  const dispatchDelta = checkpoint ? delta(checkpoint.state, state.current).filter((p) => !isScratch(p, change)) : null;
  const changed = checkpoint ? dispatchDelta.filter((p) => p !== plan)
    : state ? state.changed : unique(entries.flatMap((e) => (e.from ? [e.path, e.from] : [e.path]))).filter((p) => p !== plan);
  const allowed = allowedFor(dispatch, info, files);
  const allowedAvailable = allowed.length > 0;
  const outOfAllowed = allowedAvailable
    ? unique([...changed, ...addList]).filter((p) => !allowed.includes(p) && (changed.includes(p) || addList.includes(p)))
    : unique([...changed, ...addList]);
  if (state) {
    const stepAllowed = allowedFor('green-exception', info, files);
    outOfAllowed.push(...state.changed.filter((p) => !stepAllowed.includes(p) && !outOfAllowed.includes(p)));
  }
  const unreported = changed.filter((p) => !addList.includes(p));
  const onlyInSubagent = addList.filter((p) => !changed.includes(p));

  const preservationErrors = state ? [...state.preservationErrors, ...state.planningErrors] : [];
  if (dispatchDelta?.includes(plan)) preservationErrors.push(plan);
  const generatedErrors = files?.errors || [];
  // Missing generated outputs are expected during RED, but never at GREEN/close.
  const discrepancies = dispatch === 'red' ? generatedErrors.filter((e) => !e.reason.startsWith('generated ')) : generatedErrors;
  const ok = failures.length === 0 && outOfAllowed.length === 0 && unreported.length === 0 && onlyInSubagent.length === 0 && preservationErrors.length === 0 && discrepancies.length === 0;
  return {
    ok,
    dispatch,
    step,
    commands: commands.map((c) => ({ command: c.command, exit: c.exit, tail: c.tail, expect: c.expect, label: c.label })),
    failures,
    unjudged,
    retirements,
    sweep: { lines: sweepLines, removed: unique([...first, ...second]) },
    allowed_available: allowedAvailable,
    out_of_allowed: outOfAllowed,
    unreported,
    only_in_subagent: onlyInSubagent,
    unrelated: state?.unrelated || [],
    preservation_errors: preservationErrors,
    generated_errors: discrepancies,
  };
}

// ---------------------------------------------------------------------------
// close
// ---------------------------------------------------------------------------

function numstat(cwd, file, untracked) {
  if (untracked) {
    let text = '';
    try {
      text = fs.readFileSync(path.join(cwd, file), 'utf8');
    } catch (err) {
      return { ins: 0, del: 0 };
    }
    if (text === '') return { ins: 0, del: 0 };
    const lines = text.split('\n');
    if (lines[lines.length - 1] === '') lines.pop();
    return { ins: lines.length, del: 0 };
  }
  const res = git(['diff', '--numstat', 'HEAD', '--', file], cwd);
  const line = res.stdout.split('\n').find((l) => l.trim());
  if (!line) return { ins: 0, del: 0 };
  const [ins, del] = line.split('\t');
  return { ins: Number(ins) || 0, del: Number(del) || 0 };
}

/**
 * Status letter precedence: MISMATCH (Subagent ↔ git out of sync) >
 * DEVIATION (Plan cross-check Missing/Extra) > WARN (Will NOT be committed
 * non-empty) > OK.
 */
function statusLetter({ mismatch, deviation, warn }) {
  if (mismatch) return 'MISMATCH';
  if (deviation) return 'DEVIATION';
  if (warn) return 'WARN';
  return 'OK';
}

function buildReport(opts, addList) {
  const { cwd, change, step } = opts;
  const plan = planRelPath(change);
  const entries = statusEntries(cwd).filter((e) => !isScratch(e.path, change) && e.path !== plan);
  const byPath = new Map();
  for (const e of entries) byPath.set(e.path, e);
  const renamedFrom = new Map(entries.filter((e) => e.from).map((e) => [e.from, e.path]));
  const state = opts.baseline ? executionState(opts) : null;
  const changed = state ? state.changed : unique(entries.flatMap((e) => (e.from ? [e.path, e.from] : [e.path])));

  // Will be committed
  const willLines = [];
  let totalIns = 0;
  let totalDel = 0;
  const consumedOld = new Set();
  for (const p of addList) {
    if (consumedOld.has(p)) continue;
    const entry = byPath.get(p);
    if (entry && entry.from) {
      const a = numstat(cwd, entry.path, false);
      const b = numstat(cwd, entry.from, false);
      willLines.push(`R  ${entry.path}  (renamed from ${entry.from}, +${a.ins + b.ins} -${a.del + b.del})`);
      totalIns += a.ins + b.ins;
      totalDel += a.del + b.del;
      consumedOld.add(entry.from);
      continue;
    }
    if (renamedFrom.has(p) && addList.includes(renamedFrom.get(p))) continue;
    const untracked = Boolean(entry && entry.code === '??');
    const n = entry ? numstat(cwd, p, untracked) : { ins: 0, del: 0 };
    willLines.push(`${p}  +${n.ins} -${n.del}`);
    totalIns += n.ins;
    totalDel += n.del;
  }
  const countedFiles = willLines.length;

  // Will NOT be committed
  const notCommitted = unique([...changed.filter((p) => !addList.includes(p)), ...(state?.unrelated || []), ...(state?.retainedOwned || []).filter((p) => entries.some((e) => e.path === p)), ...(state?.base.planning || []).filter((p) => p !== plan && entries.some((e) => e.path === p))]);

  // Plan cross-check
  const files = resolveGenerated(cwd, parseFilesAffected(readIfExists(path.join(changeDir(cwd, change), 'tasks.md')), step));
  let crossCheck;
  let missing = [];
  let extra = [];
  if (!files) {
    crossCheck = 'not available';
  } else {
    missing = files.declared.filter((p) => !changed.includes(p));
    extra = changed.filter((p) => !files.declared.includes(p));
    crossCheck = null;
  }

  // Subagent <-> git
  const onlyInSubagent = addList.filter((p) => !changed.includes(p) && !consumedOld.has(p));
  const onlyInGit = changed.filter((p) => !addList.includes(p));
  const mismatch = onlyInSubagent.length > 0 || onlyInGit.length > 0;

  const deviation = files ? missing.length > 0 || extra.length > 0 || files.errors.length > 0 : false;
  const letter = statusLetter({ mismatch, deviation, warn: notCommitted.length > 0 });

  const explain = {
    OK: crossCheck
      ? 'Add-list matches the working tree; plan cross-check not available.'
      : 'Add-list matches the working tree and the plan; nothing is left out of the commit.',
    WARN: 'Working-tree paths outside the add-list will not be committed.',
    MISMATCH: 'The subagent report and git disagree about which paths changed.',
    DEVIATION: 'The changed paths differ from the plan\'s Files Affected for this Step.',
  }[letter];

  const out = [];
  out.push(`${change} — Step ${step} — ${letter}`);
  out.push(explain);
  out.push('');
  out.push('Will be committed:');
  if (willLines.length === 0) out.push('  (none)');
  for (const l of willLines) out.push(`  ${l}`);
  out.push('');
  out.push(`Totals: ${countedFiles} files, +${totalIns} -${totalDel}`);
  if (notCommitted.length > 0) {
    out.push('');
    out.push('Will NOT be committed:');
    for (const p of notCommitted) out.push(`  ${p}`);
  }
  out.push('');
  out.push('Plan cross-check:');
  if (crossCheck) {
    out.push(`  ${crossCheck}`);
  } else if (missing.length === 0 && extra.length === 0 && files.errors.length === 0) {
    out.push('  No deviations');
  } else {
    if (missing.length) out.push(`  Missing: ${missing.join(', ')}`);
    if (extra.length) out.push(`  Extra: ${extra.join(', ')}`);
    for (const e of files.errors) out.push(`  Generated/declaration: ${e.reason}`);
  }
  out.push('');
  out.push('Subagent ↔ git:');
  if (!mismatch) {
    out.push('  In sync');
  } else {
    if (onlyInSubagent.length) out.push(`  only-in-subagent: ${onlyInSubagent.join(', ')}`);
    if (onlyInGit.length) out.push(`  only-in-git: ${onlyInGit.join(', ')}`);
  }

  return {
    letter,
    text: out.join('\n'),
    stageable: addList.filter((p) => changed.includes(p) || renamedFrom.has(p)),
    files: countedFiles,
    insertions: totalIns,
    deletions: totalDel,
    discrepancies: files?.errors || [],
  };
}

/** Mark the Step's Automated checkboxes; returns {before, after, marked}. */
function markAutomated(cwd, change, step) {
  const file = path.join(changeDir(cwd, change), 'implementation.md');
  const before = readIfExists(file);
  if (before === null) throw new ToolError(`implementation.md not found for change '${change}'`);
  const info = parseStep(before, step);
  if (!info) throw new ToolError(`Step ${step} not found in implementation.md`);
  const lines = before.split('\n');
  let marked = 0;
  for (const item of info.automated) {
    const idx = info.sectionStart + item.index;
    if (/^(\s*-\s+)\[ \]/.test(lines[idx])) {
      lines[idx] = lines[idx].replace(/^(\s*-\s+)\[ \]/, '$1[x]');
      marked += 1;
    }
  }
  const after = lines.join('\n');
  if (after !== before) fs.writeFileSync(file, after);
  return { file, before, after, marked };
}

function splitCloseInput(stdin) {
  const lines = stdin.split('\n');
  const at = lines.findIndex((l) => l.trim() === '---');
  const addText = at === -1 ? lines.join('\n') : lines.slice(0, at).join('\n');
  const message = at === -1 ? '' : lines.slice(at + 1).join('\n').replace(/^\n+/, '').replace(/\s+$/, '');
  return { addList: parseAddList(addText), message };
}

function close(opts, stdin) {
  loadRecord(opts.baseline, opts, 'baseline');
  if (!opts.guardBase || (opts.guardBase !== guard.N_A && !guard.SHA_RE.test(opts.guardBase))) throw new ToolError('--guard-base is required; explicit n/a means an inactive guard');
  const initialGuard = guard.verify(opts.guardBase, false, opts.cwd);
  if (initialGuard.verdict === 'violation') return { committed: false, reason: 'guard-violation', guard: initialGuard, marked: 0 };
  assertPlanUnchanged(opts, executionState(opts));
  const { cwd, change, step } = opts;
  const { addList, message } = splitCloseInput(stdin);
  if (opts.markOnly) {
    if (opts.baseline) {
      const state = executionState(opts);
      const info = parseStep(readIfExists(path.join(changeDir(cwd, change), 'implementation.md')) || '', step);
      const files = resolveGenerated(cwd, parseFilesAffected(readIfExists(path.join(changeDir(cwd, change), 'tasks.md')), step));
      const allowed = info ? allowedFor('green-exception', info, files) : [];
      if (state.preservationErrors.length || state.planningErrors.length || files?.errors.length || state.changed.some((p) => !allowed.includes(p))) throw new ToolError('scope discrepancy blocks checkbox marking');
    }
    const marked = markAutomated(cwd, change, step).marked;
    return { committed: false, reason: 'mark-only', marked, error: null, ...(opts.baseline ? { settled: settleStep(opts) } : {}) };
  }
  const result = {
    status_letter: null,
    report_text: null,
    guard: null,
    committed: false,
    sha: null,
    subject: null,
    reason: null,
    marked: 0,
    error: null,
  };

  const verdict = initialGuard;
  result.guard = verdict;
  if (verdict.verdict === 'violation') {
    result.reason = 'guard-violation';
    return result;
  }

  const report = buildReport(opts, addList);
  result.status_letter = report.letter;
  result.report_text = report.text;

  if (opts.dryRun) {
    result.reason = 'dry-run';
    return result;
  }

  if (addList.length === 0) { result.reason = 'empty-add-list'; return result; }
  const violations = message ? checkCommitRules(message) : [{ problem: 'EMPTY_MESSAGE', detail: 'no commit message on stdin' }];
  if (violations.length > 0) {
    result.reason = 'invalid-message'; result.violations = violations; return result;
  }

  if (opts.baseline) {
    const state = executionState(opts);
    const info = parseStep(readIfExists(path.join(changeDir(cwd, change), 'implementation.md')) || '', step);
    const files = resolveGenerated(cwd, parseFilesAffected(readIfExists(path.join(changeDir(cwd, change), 'tasks.md')), step));
    const allowed = info ? allowedFor('green-exception', info, files) : [];
    const dirty = state.base.state.entries.flatMap((e) => e.from ? [e.path, e.from] : [e.path]);
    const unsafe = addList.filter((p) => !safePath(p) || !allowed.includes(p) || dirty.includes(p) || state.base.planning.includes(p));
    if (unsafe.length || state.preservationErrors.length || state.planningErrors.length || report.discrepancies.length || ['MISMATCH', 'DEVIATION'].includes(report.letter)) {
      result.reason = 'scope-blocked';
      result.error = `unsafe paths or discrepancies: ${unique([...unsafe, ...state.preservationErrors, ...state.planningErrors]).join(', ')}`;
      return result;
    }
    const staged = git(['diff', '--cached', '--name-only', '-z'], cwd);
    if (staged.status !== 0) throw new ToolError('cannot inspect staging');
    const unrelatedStaged = staged.stdout.split('\0').filter(Boolean).filter((p) => !addList.includes(p));
    if (unrelatedStaged.some((p) => (state.current.staged[p] ?? null) !== (state.base.state.staged[p] ?? null))) {
      result.reason = 'scope-blocked'; result.error = 'new unrelated staging'; return result;
    }
  }

  result.subject = message.split('\n')[0];

  const marking = markAutomated(cwd, change, step);
  result.marked = marking.marked;

  const revert = () => {
    if (marking.after !== marking.before) fs.writeFileSync(marking.file, marking.before);
    result.marked = 0;
  };

  if (addList.length === 0) {
    result.reason = 'empty-add-list';
    return result;
  }
  if (report.stageable.length === 0) {
    result.reason = 'nothing-to-stage';
    return result;
  }

  const add = git(['add', '--', ...report.stageable], cwd);
  if (add.status !== 0) {
    revert();
    result.reason = 'git-add-failed';
    result.error = tailOf(add.stderr || add.stdout);
    return result;
  }
  const commit = git(['commit', '--only', '-F', '-', '--', ...report.stageable], cwd, `${message}\n`);
  if (commit.status !== 0) {
    revert();
    result.reason = 'commit-failed';
    result.error = tailOf(`${commit.stdout}${commit.stderr}`);
    return result;
  }
  const head = git(['rev-parse', '--short', 'HEAD'], cwd);
  result.committed = true;
  result.sha = head.stdout.trim();
  // The guard SHA is window-scoped, not the immutable file baseline.
  result.guard_window_closed = true;
  if (opts.baseline) result.settled = settleStep(opts, addList);
  return result;
}

function tailOf(text) {
  return String(text).split('\n').filter((l) => l.length > 0).slice(-TAIL_LINES).join('\n');
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function usage() {
  return [
    'Usage:',
    '  node sai/tools/apply-step.js preflight --change <name> [--cwd <dir>] [--json]',
    '  node sai/tools/apply-step.js baseline --change <name> --run-id <stable-id> [--cwd <dir>] (exact planning input paths on stdin)',
    '  node sai/tools/apply-step.js dispatch-check --change <name> --step <N> --dispatch <kind> --baseline <ref>',
    '  node sai/tools/apply-step.js inspect --change <name> --baseline <ref>',
    '  node sai/tools/apply-step.js checkpoint-plan --change <name> --baseline <ref> (coordinator only, after authorized plan bookkeeping)',
    '  node sai/tools/apply-step.js restore-unrelated-index --change <name> --baseline <ref> (coordinator only, after guard remediation)',
    '  node sai/tools/apply-step.js verify --change <name> --step <N> --dispatch red|green|green-direct|green-exception',
    '       --baseline <ref> --checkpoint <ref> [--parent-was-absent] [--json] [--cwd <dir>]   (add-list on stdin; explicit --baseline-only replaces checkpoint for cumulative compatibility)',
    '  node sai/tools/apply-step.js close --change <name> --step <N> --baseline <ref> --guard-base <sha|n/a> [--dry-run | --mark-only]',
    '       [--json] [--cwd <dir>]   (add-list, a `---` line, then the commit message on stdin)',
    '',
    'Output is always one JSON object; --json is accepted and changes nothing.',
    '',
    'Exit codes: 0 = ran; 1 = close refused or failed; 2 = usage or IO error.',
  ].join('\n');
}

function parseArgs(argv) {
  const opts = { command: null, json: false, cwd: null, change: null, step: null, dispatch: null, guardBase: null, dryRun: false, markOnly: false, parentWasAbsent: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--json') opts.json = true;
    else if (arg === '--cwd') opts.cwd = argv[++i];
    else if (arg === '--change') opts.change = argv[++i];
    else if (arg === '--step') opts.step = argv[++i];
    else if (arg === '--dispatch') opts.dispatch = argv[++i];
    else if (arg === '--guard-base') opts.guardBase = argv[++i];
    else if (arg === '--baseline') opts.baseline = argv[++i];
    else if (arg === '--checkpoint') opts.checkpoint = argv[++i];
    else if (arg === '--settled') opts.settled = argv[++i];
    else if (arg === '--run-id') opts.runId = argv[++i];
    else if (arg === '--plan-checkpoint') opts.planCheckpoint = argv[++i];
    else if (arg === '--baseline-only') opts.baselineOnly = true;
    else if (arg === '--dry-run') opts.dryRun = true;
    else if (arg === '--mark-only') opts.markOnly = true;
    else if (arg === '--parent-was-absent') opts.parentWasAbsent = true;
    else if (arg === '--help' || arg === '-h') opts.help = true;
    else if (arg.startsWith('--')) return { error: `unknown flag: ${arg}` };
    else if (opts.command === null) opts.command = arg;
    else return { error: `unexpected argument: ${arg}` };
  }
  return { opts };
}

function readStdin() {
  try {
    return fs.readFileSync(0, 'utf8');
  } catch (err) {
    return '';
  }
}

function main(argv) {
  const parsed = parseArgs(argv);
  if (parsed.error) {
    process.stderr.write(`${parsed.error}\n${usage()}\n`);
    return 2;
  }
  const { opts } = parsed;
  if (opts.help || opts.command === null) {
    process.stdout.write(`${usage()}\n`);
    return opts.help ? 0 : 2;
  }
  try {
    if (!['verify', 'close', 'preflight', 'baseline', 'dispatch-check', 'inspect', 'restore-unrelated-index', 'checkpoint-plan'].includes(opts.command)) throw new ToolError(`unknown sub-command: ${opts.command}`);
    if (!opts.change) throw new ToolError('--change is required');
    if (!safePath(opts.change) || opts.change.includes('/')) throw new ToolError('invalid change name');
    if (!['preflight', 'baseline', 'inspect', 'restore-unrelated-index', 'checkpoint-plan'].includes(opts.command) && (!opts.step || !/^[1-9]\d*$/.test(opts.step))) throw new ToolError('--step must be a positive integer');
    opts.cwd = path.resolve(opts.cwd || process.cwd());
    if (opts.command === 'verify' && !DISPATCHES.includes(opts.dispatch)) {
      throw new ToolError(`--dispatch must be one of ${DISPATCHES.join('|')}`);
    }
    if (opts.markOnly && (opts.command !== 'close' || opts.dryRun)) {
      throw new ToolError('--mark-only applies to close only and excludes --dry-run');
    }
    if (opts.guardBase && opts.guardBase !== guard.N_A && !guard.SHA_RE.test(opts.guardBase)) {
      throw new ToolError('--guard-base must be a git SHA or n/a');
    }
    const stdin = readStdin();
    if (opts.command === 'checkpoint-plan') {
      process.stdout.write(`${JSON.stringify(checkpointPlan(opts), null, 2)}\n`);
      return 0;
    }
    if (opts.command === 'inspect' || opts.command === 'restore-unrelated-index') {
      let payload;
      if (opts.command === 'restore-unrelated-index') payload = restoreUnrelatedIndex(opts);
      else {
        const state = executionState(opts);
        payload = { ok: state.preservationErrors.length === 0 && state.planningErrors.length === 0, changed: state.changed, unrelated: state.unrelated, protected: unique(state.base.state.entries.flatMap((e) => e.from ? [e.path, e.from] : [e.path])), planning: state.base.planning, preservation_errors: [...state.preservationErrors, ...state.planningErrors] };
      }
      process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
      return payload.ok ? 0 : 1;
    }
    if (['preflight', 'baseline', 'dispatch-check'].includes(opts.command)) {
      if (opts.command === 'dispatch-check' && !DISPATCHES.includes(opts.dispatch)) throw new ToolError('invalid dispatch');
      const payload = opts.command === 'preflight' ? preflight(opts) : opts.command === 'baseline' ? baseline(opts, stdin) : dispatchCheck(opts);
      process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
      return payload.ok === false ? 1 : 0;
    }
    loadRecord(opts.baseline, opts, 'baseline');
    if (opts.command === 'verify') {
      const payload = verify(opts, stdin);
      process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
      return 0;
    }
    const payload = close(opts, stdin);
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
    const failedReasons = ['guard-violation', 'invalid-message', 'git-add-failed', 'commit-failed', 'scope-blocked'];
    return failedReasons.includes(payload.reason) ? 1 : 0;
  } catch (err) {
    process.stderr.write(`${err.message}\n`);
    return err instanceof ToolError ? err.code : 2;
  }
}

if (require.main === module) {
  process.exitCode = main(process.argv.slice(2));
}

module.exports = {
  main,
  verify,
  close,
  parseStep,
  parseFilesAffected,
  classifyAutomated,
  statusLetter,
  buildReport,
  usage,
  preflight,
  baseline,
  dispatchCheck,
  generatedEntry,
  resolveGenerated,
  parseDeclaration,
  declarationsOverlap,
};
