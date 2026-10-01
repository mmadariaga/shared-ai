#!/usr/bin/env node

'use strict';

/**
 * apply-step — deterministic post-dispatch verification and Step close for
 * `/sai-4-apply`.
 *
 * The apply coordinator used to run these mechanics in prose, a few dozen
 * turns per Step. This tool is stateless: it reads git, the filesystem, and the
 * change's `implementation.md` / `tasks.md`, never `sai-state`, and returns one
 * JSON object per call. The coordinator keeps the judgment, the state-machine
 * emits, the guard remediation, and message authoring.
 *
 * Sub-commands:
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
 *        [--parent-was-absent] [--json] [--cwd <dir>]        (add-list on stdin)
 *   node sai/tools/apply-step.js close --change <name> --step <N>
 *        [--guard-base <sha|n/a>] [--dry-run | --mark-only] [--json] [--cwd <dir>]
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
  const consume = (raw) => {
    const text = raw.replace(/^\s*[-*]\s+/, '').replace(/`/g, '').trim();
    const m = text.match(/^([AMDR])\s+(.+)$/);
    if (!m) return;
    if (m[1] === 'R') {
      const parts = m[2].split('->').map((s) => norm(s.trim()));
      if (parts.length === 2) {
        renames.push(parts);
        declared.push(parts[0], parts[1]);
      }
    } else {
      declared.push(norm(m[2].trim()));
    }
  };
  const first = body[idx].replace(/^\*\*Files Affected\*\*:?\s*/, '');
  if (first) consume(first);
  for (let i = idx + 1; i < body.length; i++) {
    if (/^\*\*[^*]+\*\*/.test(body[i])) break;
    if (body[i].trim()) consume(body[i]);
  }
  if (declared.length === 0) return null;
  return { declared: unique(declared), renames };
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
  return p === '.tmp' || p.startsWith('.tmp/');
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
  const { cwd, change, step, dispatch } = opts;
  const planText = readIfExists(path.join(changeDir(cwd, change), 'implementation.md'));
  if (planText === null) throw new ToolError(`implementation.md not found for change '${change}'`);
  const info = parseStep(planText, step);
  if (!info) throw new ToolError(`Step ${step} not found in implementation.md`);
  const files = parseFilesAffected(readIfExists(path.join(changeDir(cwd, change), 'tasks.md')), step);
  const addList = parseAddList(stdin);

  const sweepLines = [];
  const first = sweep(cwd, change, opts.parentWasAbsent);
  if (sweepLine(first)) sweepLines.push(sweepLine(first));

  const commands = [];
  const unjudged = [];
  const failures = [];
  const ran = new Set();
  const runOnce = (command, expect, label) => {
    if (ran.has(command)) return;
    ran.add(command);
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

  const entries = statusEntries(cwd).filter((e) => !isScratch(e.path, change));
  const plan = planRelPath(change);
  const changed = unique(entries.flatMap((e) => (e.from ? [e.path, e.from] : [e.path]))).filter((p) => p !== plan);
  const allowed = allowedFor(dispatch, info, files);
  const allowedAvailable = allowed.length > 0;
  const outOfAllowed = allowedAvailable
    ? unique([...changed, ...addList]).filter((p) => !allowed.includes(p) && (changed.includes(p) || addList.includes(p)))
    : [];
  const unreported = changed.filter((p) => !addList.includes(p));
  const onlyInSubagent = addList.filter((p) => !changed.includes(p));

  const ok = failures.length === 0 && outOfAllowed.length === 0 && unreported.length === 0 && onlyInSubagent.length === 0;
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
  const changed = unique(entries.flatMap((e) => (e.from ? [e.path, e.from] : [e.path])));

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
  const notCommitted = changed.filter((p) => !addList.includes(p));

  // Plan cross-check
  const files = parseFilesAffected(readIfExists(path.join(changeDir(cwd, change), 'tasks.md')), step);
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

  const deviation = files ? missing.length > 0 || extra.length > 0 : false;
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
  } else if (missing.length === 0 && extra.length === 0) {
    out.push('  No deviations');
  } else {
    if (missing.length) out.push(`  Missing: ${missing.join(', ')}`);
    if (extra.length) out.push(`  Extra: ${extra.join(', ')}`);
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
  const { cwd, change, step } = opts;
  const { addList, message } = splitCloseInput(stdin);
  if (opts.markOnly) {
    return { committed: false, reason: 'mark-only', marked: markAutomated(cwd, change, step).marked, error: null };
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

  const verdict = guard.verify(opts.guardBase || guard.N_A, false, cwd);
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

  const violations = message ? checkCommitRules(message) : [{ problem: 'EMPTY_MESSAGE', detail: 'no commit message on stdin' }];
  if (violations.length > 0) {
    result.reason = 'invalid-message';
    result.violations = violations;
    return result;
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
  const commit = git(['commit', '-F', '-', '--', ...report.stageable], cwd, `${message}\n`);
  if (commit.status !== 0) {
    revert();
    result.reason = 'commit-failed';
    result.error = tailOf(`${commit.stdout}${commit.stderr}`);
    return result;
  }
  const head = git(['rev-parse', '--short', 'HEAD'], cwd);
  result.committed = true;
  result.sha = head.stdout.trim();
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
    '  node sai/tools/apply-step.js verify --change <name> --step <N> --dispatch red|green|green-direct|green-exception',
    '       [--parent-was-absent] [--json] [--cwd <dir>]   (add-list on stdin)',
    '  node sai/tools/apply-step.js close --change <name> --step <N> [--guard-base <sha|n/a>] [--dry-run | --mark-only]',
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
    if (opts.command !== 'verify' && opts.command !== 'close') throw new ToolError(`unknown sub-command: ${opts.command}`);
    if (!opts.change) throw new ToolError('--change is required');
    if (!opts.step || !/^\d+$/.test(opts.step)) throw new ToolError('--step must be a positive integer');
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
    if (opts.command === 'verify') {
      const payload = verify(opts, stdin);
      process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
      return 0;
    }
    const payload = close(opts, stdin);
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
    const failedReasons = ['guard-violation', 'invalid-message', 'git-add-failed', 'commit-failed'];
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
};
