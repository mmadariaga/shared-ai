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
 * Every block that passes `strict` also passes `loose`: each strict label,
 * once `**` is stripped, contains its loose literal.
 *
 * Labels are always English, so the prose language of a block is irrelevant.
 *
 * Usage:
 *   node sai/tools/ready-to-propose.js check --profile loose|strict [--json] < text
 *
 * Input is read from stdin. The verdict is always one JSON object on stdout
 * (`--json` is accepted and changes nothing):
 *   { ok, profile, names, blocks: [{ index, line, name, violations }], violations }
 * `names` lists the extracted change names in block order (strict only);
 * `violations` holds set-level findings (no block, duplicate names, quorum).
 *
 * Exit codes: 0 = valid; 1 = violations found; 2 = usage or I/O error.
 */

const fs = require('fs');

const PROFILES = ['loose', 'strict'];

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
  throw new Error(`unknown profile: ${profile}`);
}

function usage() {
  return [
    'Usage: node sai/tools/ready-to-propose.js check --profile loose|strict [--json] < text',
    '',
    '  check               Validate the Ready to Propose text read from stdin',
    '  --profile <name>    loose (backfill quorum) or strict (full block format)',
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
  if (opts.command !== 'check') {
    process.stderr.write(`sub-command "check" required.\n${usage()}\n`);
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
  return verdict.ok ? 0 : 1;
}

module.exports = {
  LOOSE_LITERALS,
  STRICT_FIELDS,
  PROFILES,
  checkLoose,
  checkStrict,
  detect,
  main,
};

if (require.main === module) {
  process.exitCode = main(process.argv.slice(2));
}
