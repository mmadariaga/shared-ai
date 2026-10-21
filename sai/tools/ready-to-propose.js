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
 *           `strict` that also checks the implementation item rules: `- None`
 *           is a valid `**Implementation Details**` value of a single change,
 *           each `I<n>` appears exactly once across a block's two
 *           implementation sections, and in a sliced set (more than one block)
 *           every slice carries at least one in-scope item and every `I<n>` is
 *           in scope of at least one slice. It computes each block's
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
 * A second sub-command prints a block's diagnostic hash, for investigating a
 * mismatch. It is not transport verification, which is `verify-file` on the
 * exported block file (sai/policies/ready-to-propose-format.md § Stored block
 * transport), and its result never authorizes a dispatch:
 *   node sai/tools/ready-to-propose.js hash < block
 * It prints `{ ok: true, hash }` (the same sha256 the dispatchable verdict
 * reports per block) and exits 0 when stdin carries exactly one block; any other
 * count prints `{ ok: false, blocks, error }` and exits 1.
 *
 * A third sub-command converts an issue description into a draft block for
 * `/sai-explore`'s issue shortcut (sai/commands/explore/steps/issue-intake.md):
 *   node sai/tools/ready-to-propose.js convert [--change-name <name>]
 *        [--declared-clean] < issue (Markdown or HTML)
 * It prints `{ ok, converted, ready_to_propose_form, maturity,
 * proposed_change_name, rejections, block, ... }`. The issue has the Ready to
 * Propose form when its `Maturity` section reads `Ready to propose`; only then
 * is a block built, every field from the issue's own text or `- None`, `E`/`I`
 * items literal, and the draft is validated with the `dispatchable` profile
 * (`validation.flagged` lists the lines awaiting the bounded judgment).
 * Exit codes: 0 = converted, or the issue lacks the form; 1 = conversion
 * rejected (`rejections`); 2 = usage or I/O error.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

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
  { label: 'Depends on', inline: true, optional: true },
  { label: 'Backlog origin', inline: true, optional: true },
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
  let backlogOrigin = null;
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
    if (entry.label === 'Backlog origin' && entry.inline !== '') {
      try {
        const identity = require('./backlog-slice-identity');
        if (identity.normalize(entry.inline, identity.platformFor(entry.inline)) !== entry.inline) throw new Error('noncanonical URL');
        backlogOrigin = entry.inline;
      } catch {
        violations.push(violation(line, 'INVALID_BACKLOG_ORIGIN', 'Backlog origin must be a canonical GitHub, GitLab or Azure DevOps issue URL'));
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

  const dependency = validateDependencies(lines.slice(block.start, bodyEnd).join('\n'), name);
  violations.push(...dependency.violations.map(entry => ({ ...entry, line: entry.line + block.start })));
  return { index, line: headingLine, name, backlog_origin: backlogOrigin, dependencies: dependency.dependencies, violations };
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

/** Individual blocks may refer to slices that were not delivered with them. */
function validateDependencies(text, name) {
  const lines = normalize(text).split('\n');
  const entries = lines.map((line, i) => ({ match: /^(?:\*\*Depends on\*\*|Depends on):(.*)$/.exec(line), line: i + 1 })).filter(entry => entry.match);
  const violations = [];
  if (entries.length > 1) violations.push(violation(entries[1].line, 'DUPLICATE_DEPENDENCY_FIELD', 'Depends on must appear once'));
  const value = entries[0]?.match[1].trim();
  if (entries[0]) {
    for (let i = entries[0].line; i < lines.length; i++) {
      if (LABEL_LINE.test(lines[i]) || lines[i].trim() === SEPARATOR) break;
      if (lines[i].trim()) {
        violations.push(violation(i + 1, 'DEPENDENCY_FORMAT', 'Depends on must be one comma-separated line'));
        break;
      }
    }
  }
  const dependencies = !value || value === 'None' ? [] : value.split(',').map(part => part.trim());
  if (value === '' || dependencies.some(dep => !KEBAB_CASE.test(dep))) violations.push(violation(entries[0]?.line || 1, 'DEPENDENCY_FORMAT', 'Use comma-separated change names or None'));
  if (new Set(dependencies).size !== dependencies.length) violations.push(violation(1, 'DUPLICATE_DEPENDENCY', 'An immediate dependency may appear only once'));
  if (dependencies.includes(name)) violations.push(violation(1, 'SELF_DEPENDENCY', `${name} cannot depend on itself`));
  return { dependencies, violations, ok: violations.length === 0 };
}

/** Stable topological order; no transitive or branch-derived edges are added. */
function validateDependencySet(text) {
  const strict = checkStrict(text);
  const violations = [...strict.violations, ...strict.blocks.flatMap(block => block.violations)];
  const byName = new Map(strict.blocks.map(block => [block.name, block]));
  for (const block of strict.blocks) {
    for (const dependency of block.dependencies) {
      if (!byName.has(dependency)) violations.push(violation(block.line, 'MISSING_DEPENDENCY', `${block.name} depends on absent change ${dependency}`));
    }
  }
  const order = [];
  const pending = strict.blocks.slice();
  while (pending.length) {
    const next = pending.findIndex(block => block.dependencies.every(name => order.includes(name)));
    if (next === -1) {
      if (!violations.some(entry => entry.problem === 'MISSING_DEPENDENCY')) violations.push(violation(1, 'DEPENDENCY_CYCLE', 'The complete set has a dependency cycle'));
      break;
    }
    order.push(pending.splice(next, 1)[0].name);
  }
  return { ok: violations.length === 0, order, blocks: strict.blocks, violations };
}

/** Attach verified publication identities without changing any agreed work text. */
function attachBacklogOrigins(text, correspondence) {
  const association = require('./backlog-slice-identity').checkIdentity(correspondence);
  if (association.role !== 'parent') throw new Error('Complete parent/child publication correspondence is required');
  const validation = validateDependencySet(text);
  if (!validation.ok || validation.blocks.length !== association.slices.length) throw new Error('Publication correspondence must cover the complete stored block set');
  const originals = extractBlockTexts(text);
  const blocks = validation.blocks.map((block, index) => {
    const slice = association.slices.find(slice => slice.change_name === block.name);
    if (!slice || JSON.stringify(slice.depends_on.slice().sort()) !== JSON.stringify(block.dependencies.slice().sort())) throw new Error('Publication correspondence differs from the agreed slice dependencies');
    // A block crystallized from the adopted origin names it; that issue is now the set parent, so the child takes its place.
    const adopted = block.backlog_origin === association.parent;
    if (block.backlog_origin && !adopted && block.backlog_origin !== slice.issue) throw new Error('Existing selected issue origin conflicts with publication; obtain a user decision');
    const updated = adopted ? originals[index].replace(/^\*\*Backlog origin\*\*:.*$/m, () => `**Backlog origin**: ${slice.issue}`)
      : block.backlog_origin ? originals[index] : originals[index].replace(/^\*\*What\*\*:/m, `**Backlog origin**: ${slice.issue}\n**What**:`);
    return { name: block.name, text: updated, hash: hashBlock(updated), backlog_origin: slice.issue };
  });
  return { ok: true, order: validation.order, blocks };
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

/** Add a delivery boundary, not a byte to the block that is hashed. */
function composeVerdicts(blocksText, verdicts) {
  if (splitVerdicts(blocksText).verdictsText !== null) throw new Error('Block input already contains verdicts');
  if (!Array.isArray(verdicts)) throw new Error('Verdicts must be a JSON array');
  const structural = checkStrict(blocksText);
  if (!structural.ok) throw new Error('Complete valid blocks, including final separators, are required');
  const composed = blocksText + (blocksText.endsWith('\n') ? '' : '\n') + VERDICTS_MARKER + '\n' + JSON.stringify(verdicts) + '\n';
  const validation = checkDispatchable(composed);
  if (!validation.dispatchable) throw new Error('Invalid or incomplete hygiene verdicts');
  return composed;
}

/** Verify before returning the file content; never rebuild a block from chat. */
function verifyBlockFile(filename, hash) {
  if (typeof filename !== 'string' || !path.isAbsolute(filename)) throw new Error('--block-file must be an absolute transfer-file path');
  const transfer = require('./transfer');
  // Stored blocks are LF text, heading through separator, with no final newline.
  // Check location/regular-file safety separately from the established block hash.
  const dir = path.dirname(filename);
  transfer.checkTransferDir(dir);
  const stat = fs.lstatSync(filename);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('Block file must be a regular file');
  const text = fs.readFileSync(filename, 'utf8');
  const texts = extractBlockTexts(text);
  if (!/^[0-9a-f]{64}$/.test(hash || '') || texts.length !== 1 || hashBlock(texts[0]) !== hash || hashBlock(text) !== hash) throw new Error('Block file does not match its hash');
  return text;
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

/**
 * Collect the items of a block's `**Implementation Details**` and
 * `**Out of scope Implementation Details**` sections: the in-scope item count
 * (`- None` is no item) and each section's `I<n>` identifiers in order.
 */
function implementationItems(lines, range) {
  const bodyEnd = range.end === -1 ? lines.length : range.end;
  let labelIndex = -1;
  let count = 0;
  const inScopeIds = [];
  const outOfScopeIds = [];
  let section = null;
  for (let i = range.start + 1; i < bodyEnd; i++) {
    const match = LABEL_LINE.exec(lines[i]);
    if (match && STRICT_FIELDS.some((field) => field.label === match[1])) {
      if (match[1] === 'Implementation Details') {
        section = 'in';
        labelIndex = i;
      } else if (match[1] === 'Out of scope Implementation Details') {
        section = 'out';
      } else {
        section = null;
      }
      continue;
    }
    if (section !== null) {
      const item = /^[-*]\s+(.*)$/.exec(lines[i].trim());
      if (item && item[1].trim() !== 'None') {
        const id = /^(I\d+)\b/.exec(item[1].trim());
        if (section === 'in') {
          count++;
        }
        if (id) {
          (section === 'in' ? inScopeIds : outOfScopeIds).push({ id: id[1], line: i + 1 });
        }
      }
    }
  }
  return { labelIndex, count, inScopeIds, outOfScopeIds };
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
 * Dispatchable profile: `strict` plus the implementation item rules (each `I`
 * once per block, every `I` owned by a slice, one in-scope item per slice of a
 * sliced set), block hashes, and the lexical pre-filter; the optional verdicts after
 * VERDICTS_MARKER are resolved against the flagged lines.
 */
function checkDispatchable(text) {
  const { blocksText, verdictsText } = splitVerdicts(text);
  const lines = normalize(blocksText).split('\n');
  const ranges = splitBlocks(lines);
  const strict = checkStrict(blocksText);

  const sliced = strict.blocks.length > 1;
  const ownedIds = new Set();
  const allIds = new Map();
  const blocks = strict.blocks.map((block, i) => {
    const range = ranges[i];
    const last = range.end === -1 ? lines.length - 1 : range.end;
    const violations = block.violations.slice();
    const { labelIndex, count, inScopeIds, outOfScopeIds } = implementationItems(lines, range);
    if (sliced && labelIndex !== -1 && count === 0) {
      violations.push(violation(labelIndex + 1, 'NO_IMPLEMENTATION_ITEM',
        '"**Implementation Details**" must carry at least one in-scope item in a sliced set; "- None" is valid only for a single change or under "**Out of scope Implementation Details**"'));
    }
    const seen = new Set();
    for (const entry of inScopeIds.concat(outOfScopeIds)) {
      if (seen.has(entry.id)) {
        violations.push(violation(entry.line, 'DUPLICATE_IMPLEMENTATION_ITEM',
          `"${entry.id}" must appear exactly once across "**Implementation Details**" and "**Out of scope Implementation Details**" of one block`));
      }
      seen.add(entry.id);
      if (!allIds.has(entry.id)) {
        allIds.set(entry.id, { block: i, line: entry.line });
      }
    }
    for (const entry of inScopeIds) {
      ownedIds.add(entry.id);
    }
    return Object.assign({}, block, {
      violations,
      hash: hashBlock(lines.slice(range.start, last + 1).join('\n')),
      flagged: flagBlock(lines, range, i),
    });
  });
  const flagged = blocks.flatMap((block) => block.flagged);

  const violations = strict.violations.slice();
  if (sliced) {
    for (const [id, where] of allIds) {
      if (!ownedIds.has(id)) {
        violations.push(violation(where.line, 'UNOWNED_IMPLEMENTATION_ITEM',
          `"${id}" is in scope of no slice: every implementation item must appear under "**Implementation Details**" of at least one slice`));
      }
    }
  }
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

/**
 * Issue format constants, checked against sai/policies/issue-format.md by a
 * test. The intake reads them from here; the policy stays their definition.
 */
const ISSUE_MANDATORY_SECTIONS = ['Problem', 'Goal', 'Scope', 'Non-goals', 'Open questions', 'Maturity'];
const ISSUE_OPTIONAL_SECTIONS = ['Edge cases', 'Implementation notes', 'Decisions', 'Research leads'];
const MATURITY_VALUES = ['Idea', 'Scope agreed', 'Edge cases agreed', 'Ready to propose'];
const READY_MATURITY = 'Ready to propose';

/** The `Request Additional Notes` line a `declared-clean` drift outcome adds. */
const DECLARED_CLEAN_NOTE = 'The user declared that the issue has no drift from the current code without validating it.';

const NOT_AGREED_OR_NONE = /^(?:not agreed yet|none|n\/a)\.?$/i;
const UNVERIFIABLE_SCOPE = /\bTBD\b|\bto be decided\b|not agreed yet|\?\s*$/i;
const NAME_STOP_WORDS = new Set(['a', 'an', 'the', 'to', 'of', 'for', 'in', 'on', 'and', 'or', 'every', 'that', 'is', 'are',
  'with', 'it', 'its', 'this', 'from', 'by', 'be', 'as', 'at', 'so', 'one', 'when', 'then', 'into', 'than', 'whether']);

const HTML_ENTITIES = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

/** Turn an HTML issue description into Markdown; comments never survive. */
function htmlToMarkdown(text) {
  let out = text;
  out = out.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, '`$1`');
  out = out.replace(/<(?:strong|b)\b[^>]*>([\s\S]*?)<\/(?:strong|b)>/gi, '**$1**');
  out = out.replace(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi, (_m, inner) => `\n\n## ${inner.replace(/<[^>]+>/g, '').trim()}\n\n`);
  out = out.replace(/<li\b[^>]*>/gi, '\n- ').replace(/<\/li>/gi, '\n');
  out = out.replace(/<br\s*\/?>/gi, '\n').replace(/<\/?(?:p|div|ul|ol|blockquote|tr|table)\b[^>]*>/gi, '\n');
  out = out.replace(/<[^>]+>/g, '');
  out = out.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity) => {
    if (entity[0] === '#') {
      const code = entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    return Object.prototype.hasOwnProperty.call(HTML_ENTITIES, entity.toLowerCase()) ? HTML_ENTITIES[entity.toLowerCase()] : match;
  });
  return out;
}

/**
 * Normalize an issue description to Markdown. HTML comments are removed in both
 * encodings: hidden markers never carry block content.
 */
function issueToMarkdown(text) {
  const withoutComments = normalize(text).replace(/<!--[\s\S]*?-->/g, '');
  const hasMarkdownHeading = /^#{1,6}[ \t]+\S/m.test(withoutComments);
  const hasHtmlStructure = /<(?:h[1-6]|p|div|ul|ol|li|br)\b/i.test(withoutComments);
  return hasHtmlStructure && !hasMarkdownHeading ? htmlToMarkdown(withoutComments) : withoutComments;
}

/** Split Markdown into `{ name -> body lines }` keyed by the lowercase heading text. */
function parseIssueSections(markdown) {
  const sections = new Map();
  let current = null;
  for (const line of markdown.split('\n')) {
    const heading = /^#{1,6}[ \t]+(.+?)[ \t]*#*[ \t]*$/.exec(line);
    if (heading) {
      current = heading[1].replace(/[*_`]/g, '').trim().toLowerCase();
      if (!sections.has(current)) sections.set(current, []);
      continue;
    }
    if (current) sections.get(current).push(line);
  }
  return sections;
}

/** Bullet items of a section body; continuation lines join their item. */
function sectionItems(lines) {
  const items = [];
  for (const raw of lines) {
    const bullet = /^\s*(?:[-*+]|\d+[.)])\s+(.*\S)\s*$/.exec(raw);
    if (bullet) {
      items.push(bullet[1]);
    } else if (raw.trim() !== '' && items.length > 0 && /^\s+\S/.test(raw)) {
      items[items.length - 1] += ` ${raw.trim()}`;
    } else if (raw.trim() !== '') {
      items.push(raw.trim());
    }
  }
  return items;
}

/** One-line text of a section body: non-empty lines joined, bullet markers dropped. */
function sectionText(lines) {
  return lines
    .map((line) => line.trim().replace(/^(?:[-*+]|\d+[.)])\s+/, ''))
    .filter((line) => line !== '')
    .join(' ');
}

function isEmptySource(text) {
  return text === '' || NOT_AGREED_OR_NONE.test(text);
}

function proposeChangeName(goal) {
  const words = goal.toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(' ')
    .filter((word) => word !== '' && !NAME_STOP_WORDS.has(word));
  return words.slice(0, 5).join('-');
}

function bulletsOrNone(items) {
  return items.length === 0 ? ['- None'] : items.map((item) => `- ${item}`);
}

function rejection(code, detail) {
  return { code, detail };
}

/**
 * Deterministic issue-to-block conversion. Every field is the issue's own text
 * or `- None`; the model reviews the draft, it does not author it.
 *
 * @param {string} text Issue description, Markdown or HTML.
 * @param {{changeName?: string, declaredClean?: boolean}} [options]
 */
function convertIssue(text, options = {}) {
  const sections = parseIssueSections(issueToMarkdown(text));
  const maturityLines = sections.get('maturity');
  const maturity = maturityLines
    ? sectionText(maturityLines).replace(/[*_`]/g, '').replace(/\.$/, '').trim()
    : null;
  const form = maturity !== null && maturity.toLowerCase() === READY_MATURITY.toLowerCase();
  const goalText = sectionText(sections.get('goal') || []);
  const proposedName = isEmptySource(goalText) ? null : proposeChangeName(goalText);
  const base = { ready_to_propose_form: form, maturity, proposed_change_name: proposedName };
  if (!form) {
    return Object.assign(base, { ok: true, converted: false, rejections: [], block: null });
  }

  const rejections = [];
  for (const name of ISSUE_MANDATORY_SECTIONS) {
    if (!sections.has(name.toLowerCase())) rejections.push(rejection('MISSING_ISSUE_SECTION', `the issue has no "${name}" section`));
  }
  const openQuestions = sectionItems(sections.get('open questions') || []).filter((item) => !NOT_AGREED_OR_NONE.test(item));
  if (openQuestions.length > 0) {
    rejections.push(rejection('OPEN_QUESTIONS_PRESENT', `the issue still has ${openQuestions.length} entr${openQuestions.length === 1 ? 'y' : 'ies'} in "Open questions"`));
  }
  const problem = sectionText(sections.get('problem') || []);
  for (const [name, value] of [['Problem', problem], ['Goal', goalText]]) {
    if (sections.has(name.toLowerCase()) && isEmptySource(value)) {
      rejections.push(rejection('EMPTY_ISSUE_SECTION', `the "${name}" section has no agreed content`));
    }
  }
  const scope = sectionItems(sections.get('scope') || []);
  if (sections.has('scope') && (scope.length === 0 || scope.every((item) => NOT_AGREED_OR_NONE.test(item)))) {
    rejections.push(rejection('EMPTY_ISSUE_SECTION', 'the "Scope" section has no agreed content'));
  }
  const capabilities = scope.filter((item) => !NOT_AGREED_OR_NONE.test(item));
  for (const item of capabilities) {
    if (UNVERIFIABLE_SCOPE.test(item)) {
      rejections.push(rejection('SCOPE_NOT_VERIFIABLE', `scope item does not read as a verifiable capability: ${item}`));
    }
  }

  const listFor = (sectionName, letter) => {
    const items = sectionItems(sections.get(sectionName) || []).filter((item) => !NOT_AGREED_OR_NONE.test(item));
    const identified = new RegExp(`^(?:\\*\\*)?${letter}\\d+(?:\\*\\*)?(?=[\\s:.)\\-\\u2013]|$)`);
    for (const item of items) {
      if (!identified.test(item)) {
        rejections.push(rejection('UNIDENTIFIED_ITEM', `"${sectionName}" item has no ${letter}# identifier: ${item}`));
      }
    }
    return items;
  };
  const edgeCases = listFor('edge cases', 'E');
  const implementation = listFor('implementation notes', 'I');

  const lines = [
    HEADING,
    '',
    `**Change name**: ${options.changeName || proposedName || ''}`,
    '**Depends on**: None',
  ];
  const notNone = (items) => items.filter((item) => !NOT_AGREED_OR_NONE.test(item));
  lines.push(
    `**What**: ${goalText}`,
    `**Why**: ${problem}`,
    '**Capabilities in scope**:', ...bulletsOrNone(capabilities),
    '**Research Leads**:', ...bulletsOrNone(notNone(sectionItems(sections.get('research leads') || []))),
    '**Decisions & Rationale**:', ...bulletsOrNone(notNone(sectionItems(sections.get('decisions') || []))),
    '**Alternatives Considered**:', '- None',
    '**Trade-offs Accepted**:', '- None',
    '**Model / Re-framings**:', '- None',
    '**Key constraints**:', ...bulletsOrNone(notNone(sectionItems(sections.get('non-goals') || []))),
    '**Terms**:', '- None',
    '**Edge Cases**:', ...bulletsOrNone(edgeCases),
    '**Implementation Details**:', ...bulletsOrNone(implementation),
    '**Out of scope Implementation Details**:', '- None',
  );
  if (options.declaredClean) lines.push('**Request Additional Notes**:', DECLARED_CLEAN_NOTE);
  lines.push('**Overview language**: None', '', SEPARATOR, '');
  const block = lines.join('\n');

  const verdict = checkDispatchable(block);
  for (const entry of verdict.violations.concat(...verdict.blocks.map((b) => b.violations))) {
    rejections.push(rejection(entry.problem, entry.detail));
  }
  const converted = rejections.length === 0;
  return Object.assign(base, {
    ok: converted,
    converted,
    rejections,
    block: converted ? block : null,
    edge_cases: edgeCases,
    implementation_details: implementation,
    validation: {
      ok: verdict.ok,
      profile: 'dispatchable',
      hash: verdict.blocks[0] ? verdict.blocks[0].hash : null,
      flagged: verdict.flagged,
    },
  });
}

function usage() {
  return [
    'Usage: node sai/tools/ready-to-propose.js check --profile loose|strict|dispatchable [--json] [--block-file <path> [--verdicts-file <path>]] < text',
    '       node sai/tools/ready-to-propose.js hash < block',
    '       node sai/tools/ready-to-propose.js verify-file --block-file <path> --block-hash <hash>',
    '       node sai/tools/ready-to-propose.js compose --block-file <path> --verdicts-file <path> | sai-state emit ... --ready-to-propose -',
    '       node sai/tools/ready-to-propose.js dependencies < complete block set',
    '       node sai/tools/ready-to-propose.js attach-origin < JSON {text, correspondence}',
    '       node sai/tools/ready-to-propose.js attach-origin --harness <claude|opencode> < JSON {block_files: [{block_file, hash}], correspondence}',
    '       node sai/tools/ready-to-propose.js convert [--change-name <name>] [--declared-clean] < issue',
    '',
    '  check               Validate the Ready to Propose text read from stdin',
    '  hash                Print the sha256 of the single block read from stdin',
    '  convert             Convert the issue description (Markdown or HTML) read from stdin into a draft block',
    '  --profile <name>    loose (backfill quorum), strict (full block format), or',
    `                      dispatchable (strict + implementation item rules + hygiene pre-filter;`,
    `                      verdicts JSON after a ${VERDICTS_MARKER} line)`,
    '  --json              Accepted for symmetry; the verdict is always JSON',
  ].join('\n');
}

function parseArgs(argv) {
  const opts = { command: null, profile: null, help: false, changeName: null, declaredClean: false };
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
    } else if (arg === '--change-name') {
      if (i + 1 >= argv.length) {
        return { error: `${arg} requires a value` };
      }
      opts.changeName = argv[++i];
    } else if (['--block-file', '--block-hash', '--verdicts-file', '--harness'].includes(arg)) {
      if (i + 1 >= argv.length || argv[i + 1].startsWith('--')) return { error: `${arg} requires a value` };
      opts[arg.slice(2)] = argv[++i];
    } else if (arg === '--declared-clean') {
      opts.declaredClean = true;
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
  if (opts.command === 'verify-file' || opts.command === 'compose') {
    try {
      if (opts.command === 'verify-file') {
        verifyBlockFile(opts['block-file'], opts['block-hash']);
        process.stdout.write(`${JSON.stringify({ ok: true, hash: opts['block-hash'], block_file: opts['block-file'] })}\n`);
      } else {
        if (!opts['block-file'] || !opts['verdicts-file']) throw new Error('compose requires --block-file and --verdicts-file');
        process.stdout.write(composeVerdicts(fs.readFileSync(opts['block-file'], 'utf8'), JSON.parse(fs.readFileSync(opts['verdicts-file'], 'utf8'))));
      }
      return 0;
    } catch (error) {
      process.stderr.write(`${error.message}\n`);
      return 1;
    }
  }
  if (opts.command === 'hash') {
    // Hash transport remains independent of complete-set validation.
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
  if (opts.command === 'convert') {
    let input;
    try { input = readInput(); }
    catch (error) { process.stderr.write(`cannot read stdin: ${error.message}\n`); return 2; }
    const outcome = convertIssue(input, { changeName: opts.changeName, declaredClean: opts.declaredClean });
    process.stdout.write(`${JSON.stringify(outcome, null, 2)}\n`);
    return outcome.ok ? 0 : 1;
  }
  if (opts.command === 'dependencies') {
    let input;
    try { input = readInput(); }
    catch (error) { process.stderr.write(`cannot read stdin: ${error.message}\n`); return 2; }
    const verdict = validateDependencySet(input);
    process.stdout.write(`${JSON.stringify(verdict, null, 2)}\n`);
    return verdict.ok ? 0 : 1;
  }
  if (opts.command === 'attach-origin') {
    try {
      const request = JSON.parse(readInput());
      if (request.block_files) {
        const text = request.block_files.map(reference => verifyBlockFile(reference.block_file, reference.hash)).join('\n\n');
        const result = attachBacklogOrigins(text, request.correspondence);
        const transfer = require('./transfer');
        const { dir } = transfer.open(opts['harness']);
        result.blocks = result.blocks.map(block => {
          const reference = transfer.put(dir, `${block.name}.md`, Buffer.from(block.text, 'utf8'));
          return { name: block.name, hash: block.hash, backlog_origin: block.backlog_origin, block_file: reference.path };
        });
        process.stdout.write(`${JSON.stringify({ ...result, transfer_dir: dir }, null, 2)}\n`);
      } else process.stdout.write(`${JSON.stringify(attachBacklogOrigins(request.text, request.correspondence), null, 2)}\n`);
      return 0;
    } catch (error) {
      process.stdout.write(`${JSON.stringify({ ok: false, error: error.message })}\n`);
      return 1;
    }
  }
  if (opts.command !== 'check') {
    process.stderr.write(`sub-command "check", "hash", "verify-file", "compose", "dependencies", "attach-origin" or "convert" required.\n${usage()}\n`);
    return 2;
  }
  if (!PROFILES.includes(opts.profile)) {
    process.stderr.write(`--profile must be one of: ${PROFILES.join(', ')}.\n${usage()}\n`);
    return 2;
  }

  let input;
  try {
    input = opts['block-file'] ? fs.readFileSync(opts['block-file'], 'utf8') : readInput();
    if (opts['verdicts-file']) input = composeVerdicts(input, JSON.parse(fs.readFileSync(opts['verdicts-file'], 'utf8')));
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
  composeVerdicts,
  verifyBlockFile,
  extractBlockTexts,
  validateDependencies,
  validateDependencySet,
  attachBacklogOrigins,
  ISSUE_MANDATORY_SECTIONS,
  ISSUE_OPTIONAL_SECTIONS,
  MATURITY_VALUES,
  DECLARED_CLEAN_NOTE,
  issueToMarkdown,
  convertIssue,
  detect,
  main,
};

if (require.main === module) {
  process.exitCode = main(process.argv.slice(2));
}
