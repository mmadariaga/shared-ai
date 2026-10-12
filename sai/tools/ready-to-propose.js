#!/usr/bin/env node

'use strict';

/**
 * ready-to-propose — deterministic detector for `Ready to Propose` blocks.
 *
 * One definition of "this text is a valid block", shared by its producers and
 * consumers, with two profiles:
 *
 *   loose   Backfill's crystallized-block quorum
 *           (sai/commands/backfill/instructions.md § Crystallized-block intake):
 *           strip every `**`, then each of the nine plain literals must appear
 *           as a case-sensitive substring with its exact spacing, anywhere, in
 *           any order. No heading, position, or content is required; a literal
 *           inside prose counts (false positives accepted).
 *   strict  The full block format of sai/policies/ready-to-propose-format.md:
 *           every field label in order, kebab-case `**Change name**`, mandatory
 *           sections non-empty (or `- None`), optional
 *           `**Request Additional Notes**` with content, `**Overview language**`
 *           as the last line, each block terminated by a `---` line, and change
 *           names unique across the set. Set-level distribution rules (each `E`
 *           once per set, `I` coverage) are out of scope.
 *
 *   dispatchable
 *           The one contract every implementation route accepts (Plan -
 *           Unattended, Direct Build - Unattended, Manual). A superset of
 *           `strict` that also requires at least one in-scope item under
 *           `**Implementation Details**` (`- None` is valid only under
 *           `**Out of scope Implementation Details**`), computes each block's
 *           sha256 hash, and runs a lexical pre-filter that reports the lines
 *           a bounded judgment must clear against the four block-hygiene
 *           clauses (HYGIENE_CLAUSES, the single source of the clause ids).
 *           The pre-filter cannot tell requested work from subject matter, so
 *           a flagged line is not a violation: it needs one verdict
 *           `{clause, line, evidence, verdict: violation|context}` (the
 *           judgment contract is sai/policies/block-hygiene-judgment.md).
 *           Verdicts are supplied on stdin after a line equal to
 *           VERDICTS_MARKER, as a JSON array. A set is dispatchable when it is
 *           structurally valid and every flagged line carries a `context`
 *           verdict.
 *
 * Every block that passes `strict` also passes `loose`: each strict label,
 * once `**` is stripped, contains its loose literal. Every dispatchable block
 * passes `strict`.
 *
 * Labels are always English, so the prose language of a block is irrelevant.
 *
 * Usage:
 *   node sai/tools/ready-to-propose.js check --profile loose|strict|dispatchable [--json] < text
 *
 * Input is read from stdin. The verdict is always one JSON object on stdout
 * (`--json` is accepted and changes nothing):
 *   { ok, profile, names, blocks: [{ index, line, name, violations }], violations }
 * `names` lists the extracted change names in block order (strict and
 * dispatchable); `violations` holds set-level findings (no block, duplicate
 * names, quorum). The dispatchable verdict adds, per block, `hash` and
 * `flagged`, and at set level `flagged`, `judgment`
 * `{ ok, pending, violations, unknown, invalid, cleared }`, and `dispatchable`.
 * `ok` is the deterministic structural result; `dispatchable` also needs the
 * judgment to be clean.
 *
 * Exit codes: 0 = valid (dispatchable: `dispatchable` is true); 1 = violations
 * found or judgment pending; 2 = usage or I/O error.
 *
 * A second sub-command recomputes a block's hash for the worker that receives a
 * stored block (sai/policies/ready-to-propose-format.md § Stored block
 * transport):
 *   node sai/tools/ready-to-propose.js hash < block
 * It prints `{ ok: true, hash }` (the same sha256 the dispatchable verdict
 * reports per block) and exits 0 when stdin carries exactly one block; any other
 * count prints `{ ok: false, blocks, error }` and exits 1.
 */

const crypto = require('crypto');
const fs = require('fs');

const PROFILES = ['loose', 'strict', 'dispatchable'];

/** The line that separates the block set from the judgment verdicts (JSON array). */
const VERDICTS_MARKER = '<<<VERDICTS>>>';

/**
 * The four block-hygiene clauses of the dispatchable contract: what a block
 * must not request as implementation work. The ids are the single source;
 * sai/policies/block-hygiene-judgment.md lists the same ids and a test asserts
 * the two agree. Each pattern is a lexical pre-filter only: a match flags a
 * line for judgment and never rejects it.
 */
const HYGIENE_CLAUSES = [
  {
    id: 'planning-artifact',
    summary: 'creating the planning artifacts design.md, tasks.md, or implementation.md',
    patterns: [/(?<![\w-])(?:design|tasks|implementation)\.md\b/i],
  },
  {
    id: 'mutating-git',
    summary: 'running a mutating git command',
    patterns: [
      /\bgit\s+(?:add|commit|push|pull|branch|tag|stash|reset|rebase|merge|checkout|switch|cherry-pick|revert|clean|rm|mv|restore|apply|am)\b/i,
    ],
  },
  {
    id: 'subagent-dispatch',
    summary: 'dispatching subagents',
    patterns: [
      /\bsub-?agents?\b/i,
      /\bdispatch(?:es|ed|ing)?\s+(?:(?:a|an|the)\s+)?(?:[\w-]+\s+)?(?:worker|agent)s?\b/i,
      /\bspawn(?:s|ed|ing)?\s+(?:(?:a|an|the)\s+)?(?:[\w-]+\s+)?agents?\b/i,
    ],
  },
  {
    id: 'published-spec-edit',
    summary: 'editing published specs under openspec/specs/** as implementation work',
    patterns: [/\bopenspec\/specs\b/i],
  },
];

const VERDICT_VALUES = ['violation', 'context'];

/** The nine plain literals of backfill's quorum, in their documented order. */
const LOOSE_LITERALS = [
  'Change name',
  'What',
  'Why',
  'Capabilities in scope',
  'Alternatives Considered',
  'Trade-offs Accepted',
  'Key constraints',
  'Edge Cases',
  'Implementation Details',
];

/**
 * Strict field order per sai/policies/ready-to-propose-format.md.
 *   inline:   the value must be on the label line (single-value fields)
 *   optional: the field may be omitted
 */
const STRICT_FIELDS = [
  { label: 'Change name', inline: true },
  { label: 'What', inline: true },
  { label: 'Why', inline: true },
  { label: 'Capabilities in scope' },
  { label: 'Research Leads' },
  { label: 'Decisions & Rationale' },
  { label: 'Alternatives Considered' },
  { label: 'Trade-offs Accepted' },
  { label: 'Model / Re-framings' },
  { label: 'Key constraints' },
  { label: 'Terms' },
  { label: 'Edge Cases' },
  { label: 'Implementation Details' },
  { label: 'Out of scope Implementation Details' },
  { label: 'Request Additional Notes', optional: true, noneForbidden: true },
  { label: 'Overview language', inline: true },
];

const HEADING = '## Ready to Propose';
const SEPARATOR = '---';
const KEBAB_CASE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const LABEL_LINE = /^\*\*(.+?)\*\*:(.*)$/;

function normalize(text) {
  return String(text ?? '').replace(/\r\n?/g, '\n');
}

function violation(line, problem, detail) {
  return { line, problem, detail };
}

/**
 * Loose profile: backfill's nine-literal quorum over the whole input.
 */
function checkLoose(text) {
  const stripped = normalize(text).split('**').join('');
  const missing = LOOSE_LITERALS.filter((literal) => !stripped.includes(literal));
  const violations = missing.map((literal) =>
    violation(1, 'MISSING_LITERAL', `quorum literal "${literal}" is missing`));
  return {
    ok: violations.length === 0,
    profile: 'loose',
    names: [],
    blocks: [],
    violations,
  };
}

/**
 * Split the input into blocks. A block starts at a `## Ready to Propose`
 * heading line and ends at the first `---` line after it.
 */
function splitBlocks(lines) {
  const blocks = [];
  let current = null;
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed === HEADING) {
      if (current) {
        blocks.push(current);
      }
      current = { start: i, end: -1 };
      continue;
    }
    if (current && trimmed === SEPARATOR) {
      current.end = i;
      blocks.push(current);
      current = null;
    }
  }
  if (current) {
    blocks.push(current);
  }
  return blocks;
}

function checkStrictBlock(lines, block, index) {
  const violations = [];
  const headingLine = block.start + 1;
  const terminated = block.end !== -1;
  const bodyEnd = terminated ? block.end : lines.length;

  if (!terminated) {
    violations.push(violation(headingLine, 'MISSING_SEPARATOR',
      'block must be terminated by a "---" line'));
  }

  // Locate known labels in the body.
  const known = new Map(STRICT_FIELDS.map((field) => [field.label, field]));
  const found = [];
  for (let i = block.start + 1; i < bodyEnd; i++) {
    const match = LABEL_LINE.exec(lines[i]);
    if (match && known.has(match[1])) {
      found.push({ label: match[1], lineIndex: i, inline: match[2].trim() });
    }
  }

  const seen = new Set();
  for (const entry of found) {
    if (seen.has(entry.label)) {
      violations.push(violation(entry.lineIndex + 1, 'DUPLICATE_SECTION',
        `section "**${entry.label}**" appears more than once`));
    }
    seen.add(entry.label);
  }

  for (const field of STRICT_FIELDS) {
    if (!field.optional && !seen.has(field.label)) {
      violations.push(violation(headingLine, 'MISSING_SECTION',
        `required section "**${field.label}**" is missing`));
    }
  }

  // Order: first occurrences must follow STRICT_FIELDS order.
  const firsts = [];
  const firstSeen = new Set();
  for (const entry of found) {
    if (!firstSeen.has(entry.label)) {
      firstSeen.add(entry.label);
      firsts.push(entry);
    }
  }
  const rank = new Map(STRICT_FIELDS.map((field, i) => [field.label, i]));
  for (let i = 1; i < firsts.length; i++) {
    if (rank.get(firsts[i].label) < rank.get(firsts[i - 1].label)) {
      violations.push(violation(firsts[i].lineIndex + 1, 'WRONG_SECTION_ORDER',
        `section "**${firsts[i].label}**" is out of order`));
      break;
    }
  }

  // Content per field.
  let name = null;
  for (let k = 0; k < firsts.length; k++) {
    const entry = firsts[k];
    const field = known.get(entry.label);
    const next = k + 1 < firsts.length ? firsts[k + 1].lineIndex : bodyEnd;
    const bodyLines = lines.slice(entry.lineIndex + 1, next)
      .map((line) => line.trim())
      .filter((line) => line !== '');
    const line = entry.lineIndex + 1;

    if (field.inline) {
      if (entry.inline === '') {
        violations.push(violation(line, 'EMPTY_SECTION',
          `section "**${entry.label}**" must carry its value on the label line`));
      }
    } else if (bodyLines.length === 0 && entry.inline === '') {
      violations.push(violation(line, 'EMPTY_SECTION',
        `section "**${entry.label}**" must carry content or "- None"`));
    }

    if (field.noneForbidden && bodyLines.length === 1 && bodyLines[0] === '- None'
        && entry.inline === '') {
      violations.push(violation(line, 'EMPTY_SECTION',
        `section "**${entry.label}**" must carry content or be omitted`));
    }

    if (entry.label === 'Change name' && entry.inline !== '') {
      name = entry.inline;
      if (!KEBAB_CASE.test(name)) {
        violations.push(violation(line, 'INVALID_CHANGE_NAME',
          `change name "${name}" must be kebab-case`));
      }
    }
  }

  // `**Overview language**` must be the last non-blank line before `---`.
  const overview = firsts.find((entry) => entry.label === 'Overview language');
  if (overview) {
    for (let i = overview.lineIndex + 1; i < bodyEnd; i++) {
      if (lines[i].trim() !== '') {
        violations.push(violation(overview.lineIndex + 1, 'OVERVIEW_LANGUAGE_NOT_LAST',
          '"**Overview language**" must be the last line before the "---" separator'));
        break;
      }
    }
  }

  return { index, line: headingLine, name, violations };
}

/**
 * Strict profile: the full format of sai/policies/ready-to-propose-format.md,
 * over one or more blocks, plus change-name uniqueness across the set.
 */
function checkStrict(text) {
  const lines = normalize(text).split('\n');
  const ranges = splitBlocks(lines);
  const violations = [];

  if (ranges.length === 0) {
    violations.push(violation(1, 'MISSING_BLOCK_HEADING',
      `input must contain a "${HEADING}" heading`));
  }

  const blocks = ranges.map((range, i) => checkStrictBlock(lines, range, i));
  const names = blocks.map((block) => block.name).filter((name) => name !== null);

  const counts = new Map();
  for (const name of names) {
    counts.set(name, (counts.get(name) || 0) + 1);
  }
  for (const [name, count] of counts) {
    if (count > 1) {
      violations.push(violation(1, 'DUPLICATE_CHANGE_NAME',
        `change name "${name}" appears in ${count} blocks`));
    }
  }

  const ok = violations.length === 0 && blocks.every((block) => block.violations.length === 0);
  return { ok, profile: 'strict', names, blocks, violations };
}

/** sha256 hex of a block's text (newlines normalized to LF). */
function hashBlock(blockText) {
  return crypto.createHash('sha256').update(normalize(blockText), 'utf8').digest('hex');
}

/**
 * Split stdin into the block set text and the optional verdicts JSON that
 * follows a line equal to VERDICTS_MARKER.
 */
function splitVerdicts(text) {
  const lines = normalize(text).split('\n');
  const at = lines.findIndex((line) => line.trim() === VERDICTS_MARKER);
  if (at === -1) {
    return { blocksText: lines.join('\n'), verdictsText: null };
  }
  return {
    blocksText: lines.slice(0, at).join('\n'),
    verdictsText: lines.slice(at + 1).join('\n'),
  };
}

/** The text of each block, in block order: heading line through its `---` line. */
function extractBlockTexts(text) {
  const lines = normalize(splitVerdicts(text).blocksText).split('\n');
  return splitBlocks(lines).map((range) => {
    const last = range.end === -1 ? lines.length - 1 : range.end;
    return lines.slice(range.start, last + 1).join('\n');
  });
}

/** The lexical pre-filter: every (line, clause) pair the patterns match in one block body. */
function flagBlock(lines, range, index) {
  const bodyEnd = range.end === -1 ? lines.length : range.end;
  const flagged = [];
  for (let i = range.start + 1; i < bodyEnd; i++) {
    for (const clause of HYGIENE_CLAUSES) {
      if (clause.patterns.some((pattern) => pattern.test(lines[i]))) {
        flagged.push({ block: index, line: i + 1, clause: clause.id });
      }
    }
  }
  return flagged;
}

/** Count the in-scope items of a block's `**Implementation Details**` section. */
function implementationItems(lines, range) {
  const bodyEnd = range.end === -1 ? lines.length : range.end;
  let labelIndex = -1;
  let count = 0;
  for (let i = range.start + 1; i < bodyEnd; i++) {
    const match = LABEL_LINE.exec(lines[i]);
    if (match && STRICT_FIELDS.some((field) => field.label === match[1])) {
      if (labelIndex !== -1) {
        break;
      }
      if (match[1] === 'Implementation Details') {
        labelIndex = i;
      }
      continue;
    }
    if (labelIndex !== -1) {
      const item = /^[-*]\s+(.*)$/.exec(lines[i].trim());
      if (item && item[1].trim() !== 'None') {
        count++;
      }
    }
  }
  return { labelIndex, count };
}

/**
 * Resolve the judgment verdicts against the flagged lines. A flagged line is
 * cleared only by a `context` verdict that carries evidence; a `violation`
 * verdict, a missing verdict, a verdict for a line that is not flagged, and a
 * malformed verdict each keep the set from being dispatchable.
 */
function resolveJudgment(flagged, verdicts) {
  const invalid = [];
  const entries = [];
  (Array.isArray(verdicts) ? verdicts : []).forEach((raw, i) => {
    const ok = raw && typeof raw === 'object'
      && Number.isInteger(raw.line) && raw.line > 0
      && typeof raw.clause === 'string'
      && HYGIENE_CLAUSES.some((clause) => clause.id === raw.clause)
      && VERDICT_VALUES.includes(raw.verdict)
      && typeof raw.evidence === 'string' && raw.evidence.trim() !== '';
    if (ok) {
      entries.push({ line: raw.line, clause: raw.clause, evidence: raw.evidence, verdict: raw.verdict });
    } else {
      invalid.push({ position: i + 1, detail: 'verdict needs integer line, known clause, verdict violation|context, and non-empty evidence' });
    }
  });

  const flaggedKeys = new Set(flagged.map((f) => `${f.line}:${f.clause}`));
  const byKey = new Map();
  const unknown = [];
  for (const entry of entries) {
    const key = `${entry.line}:${entry.clause}`;
    if (!flaggedKeys.has(key)) {
      unknown.push({ line: entry.line, clause: entry.clause });
      continue;
    }
    if (!byKey.has(key)) {
      byKey.set(key, []);
    }
    byKey.get(key).push(entry);
  }

  const pending = [];
  const violations = [];
  const cleared = [];
  for (const f of flagged) {
    const found = byKey.get(`${f.line}:${f.clause}`);
    if (!found) {
      pending.push({ block: f.block, line: f.line, clause: f.clause });
      continue;
    }
    const bad = found.find((entry) => entry.verdict === 'violation');
    if (bad) {
      violations.push({ block: f.block, line: f.line, clause: f.clause, evidence: bad.evidence });
    } else {
      cleared.push({ block: f.block, line: f.line, clause: f.clause, evidence: found[0].evidence, verdict: 'context' });
    }
  }

  return {
    ok: invalid.length === 0 && unknown.length === 0 && pending.length === 0 && violations.length === 0,
    pending,
    violations,
    unknown,
    invalid,
    cleared,
  };
}

/**
 * Dispatchable profile: `strict` plus the in-scope implementation item, block
 * hashes, and the lexical pre-filter; the optional verdicts after
 * VERDICTS_MARKER are resolved against the flagged lines.
 */
function checkDispatchable(text) {
  const { blocksText, verdictsText } = splitVerdicts(text);
  const lines = normalize(blocksText).split('\n');
  const ranges = splitBlocks(lines);
  const strict = checkStrict(blocksText);

  const blocks = strict.blocks.map((block, i) => {
    const range = ranges[i];
    const last = range.end === -1 ? lines.length - 1 : range.end;
    const violations = block.violations.slice();
    const { labelIndex, count } = implementationItems(lines, range);
    if (labelIndex !== -1 && count === 0) {
      violations.push(violation(labelIndex + 1, 'NO_IMPLEMENTATION_ITEM',
        '"**Implementation Details**" must carry at least one in-scope item; "- None" is valid only under "**Out of scope Implementation Details**"'));
    }
    return Object.assign({}, block, {
      violations,
      hash: hashBlock(lines.slice(range.start, last + 1).join('\n')),
      flagged: flagBlock(lines, range, i),
    });
  });
  const flagged = blocks.flatMap((block) => block.flagged);

  const violations = strict.violations.slice();
  let verdicts = [];
  if (verdictsText !== null && verdictsText.trim() !== '') {
    try {
      verdicts = JSON.parse(verdictsText);
      if (!Array.isArray(verdicts)) {
        throw new Error('verdicts must be a JSON array');
      }
    } catch (err) {
      verdicts = [];
      violations.push(violation(1, 'VERDICTS_UNPARSEABLE',
        `the verdicts after ${VERDICTS_MARKER} must be a JSON array: ${err.message}`));
    }
  }
  const judgment = resolveJudgment(flagged, verdicts);

  const ok = violations.length === 0 && blocks.every((block) => block.violations.length === 0);
  return {
    ok,
    profile: 'dispatchable',
    names: strict.names,
    blocks,
    violations,
    flagged,
    judgment,
    dispatchable: ok && judgment.ok,
  };
}

/**
 * Run the detector with the named profile.
 */
function detect(text, profile) {
  if (profile === 'loose') {
    return checkLoose(text);
  }
  if (profile === 'strict') {
    return checkStrict(text);
  }
  if (profile === 'dispatchable') {
    return checkDispatchable(text);
  }
  throw new Error(`unknown profile: ${profile}`);
}

function usage() {
  return [
    'Usage: node sai/tools/ready-to-propose.js check --profile loose|strict|dispatchable [--json] < text',
    '       node sai/tools/ready-to-propose.js hash < block',
    '',
    '  check               Validate the Ready to Propose text read from stdin',
    '  hash                Print the sha256 of the single block read from stdin',
    '  --profile <name>    loose (backfill quorum), strict (full block format), or',
    `                      dispatchable (strict + implementation item + hygiene pre-filter;`,
    `                      verdicts JSON after a ${VERDICTS_MARKER} line)`,
    '  --json              Accepted for symmetry; the verdict is always JSON',
  ].join('\n');
}

function parseArgs(argv) {
  const opts = { command: null, profile: null, help: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      opts.help = true;
    } else if (arg === '--json') {
      // Always JSON.
    } else if (arg === '--profile') {
      if (i + 1 >= argv.length) {
        return { error: '--profile requires a value' };
      }
      opts.profile = argv[++i];
    } else if (arg.startsWith('--')) {
      return { error: `unknown flag: ${arg}` };
    } else if (opts.command === null) {
      opts.command = arg;
    } else {
      return { error: `unexpected positional argument: ${arg}` };
    }
  }
  return { opts };
}

function main(argv, readInput = () => fs.readFileSync(0, 'utf8')) {
  const parsed = parseArgs(argv);
  if (parsed.error) {
    process.stderr.write(`${parsed.error}\n${usage()}\n`);
    return 2;
  }
  const { opts } = parsed;
  if (opts.help) {
    process.stdout.write(`${usage()}\n`);
    return 0;
  }
  if (opts.command === 'hash') {
    let input;
    try {
      input = readInput();
    } catch (err) {
      process.stderr.write(`cannot read stdin: ${err.message}\n`);
      return 2;
    }
    const texts = extractBlockTexts(input);
    if (texts.length !== 1) {
      process.stdout.write(`${JSON.stringify({ ok: false, blocks: texts.length, error: 'exactly one block is required' }, null, 2)}\n`);
      return 1;
    }
    process.stdout.write(`${JSON.stringify({ ok: true, hash: hashBlock(texts[0]) }, null, 2)}\n`);
    return 0;
  }
  if (opts.command !== 'check') {
    process.stderr.write(`sub-command "check" or "hash" required.\n${usage()}\n`);
    return 2;
  }
  if (!PROFILES.includes(opts.profile)) {
    process.stderr.write(`--profile must be one of: ${PROFILES.join(', ')}.\n${usage()}\n`);
    return 2;
  }

  let input;
  try {
    input = readInput();
  } catch (err) {
    process.stderr.write(`cannot read stdin: ${err.message}\n`);
    return 2;
  }

  const verdict = detect(input, opts.profile);
  process.stdout.write(`${JSON.stringify(verdict, null, 2)}\n`);
  const accepted = opts.profile === 'dispatchable' ? verdict.dispatchable : verdict.ok;
  return accepted ? 0 : 1;
}

module.exports = {
  LOOSE_LITERALS,
  STRICT_FIELDS,
  HYGIENE_CLAUSES,
  VERDICTS_MARKER,
  PROFILES,
  checkLoose,
  checkStrict,
  checkDispatchable,
  resolveJudgment,
  hashBlock,
  splitVerdicts,
  extractBlockTexts,
  detect,
  main,
};

if (require.main === module) {
  process.exitCode = main(process.argv.slice(2));
}
