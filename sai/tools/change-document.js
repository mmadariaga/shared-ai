#!/usr/bin/env node

'use strict';

/**
 * change-document — the deterministic tool of the change document.
 *
 * A change document is the issue format of sai/policies/issue-format.md of one
 * crystallized change, stored as one file: the first line is `# <title>`, the
 * description follows, and the last section is `## Change`, the metadata of the
 * change as visible `Key: value` lines. This tool owns the format: it parses a
 * document into its sections (fenced code is skipped, so a heading or a `---`
 * line inside a fence is content), validates whether the document is
 * dispatchable and names each failed check, hashes it (sha256 over the whole
 * file, line endings normalized to LF), verifies a stored file against its hash,
 * compares an amendment with the stored text, reads the sections of an issue
 * description for `/sai-explore`'s issue intake, and runs the lexical hygiene
 * pre-filter with the judgment verdicts over the whole document.
 *
 * Dispatchable: the document passes every check below and every line the
 * pre-filter flags carries a `context` verdict.
 *   - first line `# <title>` with a title, and no second level-1 heading;
 *   - only the known `##` sections, each once, in the agreed order;
 *   - the mandatory sections present and agreed (Problem, Goal, Scope,
 *     Non-goals), no optional section present but empty;
 *   - `Open questions` reads `None.` and `Maturity` reads `Ready to propose`;
 *   - the `E#`/`I#` items carry an identifier, and an `I#` appears once;
 *   - `## Change` present, with `Change name` (kebab-case) and only the known
 *     keys, each with a valid form.
 * In a slice set each document also carries at least one `I#` in
 * `Implementation notes`, every `I#` of an out-of-scope list is in scope of one
 * document, and the names and dependencies of the set are consistent.
 *
 * Usage:
 *   node sai/tools/change-document.js check --document-file <path> [--verdicts-file <path>] [--slice]
 *   node sai/tools/change-document.js check-set --document-file <path> --document-file <path> ...
 *   node sai/tools/change-document.js hash --document-file <path>
 *   node sai/tools/change-document.js verify-file --document-file <path> --document-hash <sha256>
 *   node sai/tools/change-document.js compare --stored-file <path> --document-file <path>
 *   node sai/tools/change-document.js sections [--origin <issue-url>] [--input-file <path>]  (issue description on stdin without a file)
 *   node sai/tools/change-document.js compose --input-file <issue> --output-file <path> [--backlog-origin <issue-url>] [--change-name <name>] [--explore-origin "<harness> <session>" ...] [--specs <value>] [--declared-clean]
 *   node sai/tools/change-document.js split --document-file <path> [--document-hash <sha256>]
 *   node sai/tools/change-document.js set-origin --document-file <path> --origin <issue-url> [--harness <claude|opencode>]
 *   node sai/tools/change-document.js attach-origin [--harness <claude|opencode>] --input-file <path>
 *
 * Publication: the title line of a document is the issue title and the rest is the
 * issue description (`split`, `splitDocument`); `readSet` reads a published set and
 * `attach-origin` gives each document its child issue URL as `Backlog origin:`.
 *
 * Every verdict is one JSON object on stdout. Exit codes: 0 = valid
 * (`check`: `dispatchable` is true), 1 = violations, a failed verification, or
 * judgment pending, 2 = usage or I/O error.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const inputReader = require('./input-reader');
const usageKit = require('./usage');
const { exploreOriginHarness } = require('./openspec-yaml');

const VERDICT_VALUES = ['violation', 'context'];

/**
 * The four hygiene clauses of the dispatchable contract: what a document must
 * not request as implementation work. The ids are the single source;
 * sai/policies/block-hygiene-judgment.md lists the same ids. Each pattern is a
 * lexical pre-filter only: a match flags a line for judgment and never rejects
 * it.
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

/**
 * The sections of a change document in their agreed order. `mandatory` sections
 * are always present; `ids` names the identifier letter of a list section;
 * `Change` is optional in an issue and required for a dispatchable document.
 */
const SECTIONS = [
  { name: 'Problem', mandatory: true },
  { name: 'Goal', mandatory: true },
  { name: 'Scope', mandatory: true },
  { name: 'Non-goals', mandatory: true, noneAllowed: true },
  { name: 'Capabilities' },
  { name: 'Terms' },
  { name: 'Edge cases', ids: 'E' },
  { name: 'Implementation notes', ids: 'I' },
  { name: 'Out-of-scope implementation notes', ids: 'I' },
  { name: 'Decisions' },
  { name: 'Alternatives considered' },
  { name: 'Trade-offs accepted' },
  { name: 'Research leads' },
  { name: 'Additional notes' },
  { name: 'Open questions', mandatory: true },
  { name: 'Maturity', mandatory: true },
  { name: 'Change' },
];

const MANDATORY_SECTIONS = SECTIONS.filter((section) => section.mandatory).map((section) => section.name);
const OPTIONAL_SECTIONS = SECTIONS.filter((section) => !section.mandatory && section.name !== 'Change').map((section) => section.name);
const MATURITY_VALUES = ['Idea', 'Scope agreed', 'Edge cases agreed', 'Ready to propose'];
const READY_MATURITY = 'Ready to propose';

/** The keys of the `## Change` section, in their documented order. */
const CHANGE_KEYS = ['Change name', 'Depends on', 'Backlog origin', 'Explore origin', 'Specs'];

/** The `Change` keys an amendment may change without changing the agreement. */
const AMEND_METADATA_KEYS = ['Backlog origin', 'Explore origin'];

const KEBAB_CASE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SPECS_NONE = /^none\s*—(.*)$/;
const NOT_AGREED = /^not agreed yet\.?$/i;
const NONE = /^(?:none|n\/a)\.?$/i;
const NOT_AGREED_OR_NONE = /^(?:not agreed yet|none|n\/a)\.?$/i;
const EXPLORE_ORIGIN_FORM = '"<harness> <sessionID>[, <harness> <sessionID>…]" (harness: opencode or claude; an entry without one inherits the previous entry\'s)';

function normalize(text) {
  return String(text ?? '').replace(/\r\n?/g, '\n');
}

function violation(line, problem, detail) {
  return { line, problem, detail };
}

/**
 * Whether the text is a `Ready to Propose` block, the retired crystallized
 * format: a `## Ready to Propose` heading line, or the block's bold
 * `**Change name**:` field label. A block is rejected, never converted.
 */
const RETIRED_FORMAT_DETAIL = 'the "Ready to Propose" block is a retired format; a change is crystallized as a change document (first line "# <title>"), and a block is rejected, never converted';

function isRetiredBlockFormat(text) {
  const normalized = normalize(text);
  return /^\s*##[ \t]+Ready to Propose\b/m.test(normalized) || /^\s*\*\*Change name\*\*[ \t]*:/m.test(normalized);
}

/** sha256 hex of a document's text (newlines normalized to LF); it covers the whole file. */
function hashDocument(text) {
  return crypto.createHash('sha256').update(normalize(text), 'utf8').digest('hex');
}

/**
 * The explore-origin value: `<harness> <id>[, [<harness> ]<id>…]`, harness `opencode`
 * (`ses_…`) or `claude` (a UUID). The first entry names its harness; a later entry
 * without one inherits the previous entry's. Returns the bare ids in order, or null.
 */
function parseExploreOrigin(value) {
  const ids = [];
  let harness = null;
  for (const entry of value.split(', ')) {
    const parts = entry.split(' ');
    if (parts.length > 2 || parts.some((part) => part === '')) return null;
    if (parts.length === 2) {
      if (!['opencode', 'claude'].includes(parts[0])) return null;
      harness = parts[0];
    }
    const id = parts[parts.length - 1];
    if (harness === null || exploreOriginHarness(id) !== harness) return null;
    ids.push(id);
  }
  return ids;
}

/** The canonical issue URL of a backlog origin, or null when the value is not one. */
function canonicalBacklogOrigin(value) {
  try {
    const identity = require('./backlog-slice-identity');
    return identity.normalize(value, identity.platformFor(value)) === value ? value : null;
  } catch {
    return null;
  }
}

const HEADING = /^ {0,3}(#{1,6})[ \t]+(.*?)(?:[ \t]+#+)?[ \t]*$/;
const FENCE_OPEN = /^ {0,3}(`{3,}|~{3,})(.*)$/;

function cleanHeading(text) {
  return text.replace(/[*_`]/g, '').trim();
}

/**
 * Parse Markdown into its sections. Fenced code blocks are content: a heading
 * or a `---` line inside a fence starts and separates nothing.
 *
 * Document mode (the default): line 1 is the `# <title>` line, every later
 * level-1 heading is a second document (`extraTitles`), a `##` heading starts a
 * section, and deeper headings are content of their section. Lenient mode (the
 * issue intake of historical descriptions) makes every heading start a section.
 *
 * Each section is `{ key, heading, line, bodyStart, body, fenced }`: `key` is
 * the lowercase cleaned heading, `body` its raw lines and `fenced` which of them
 * are inside a fenced block. A heading that repeats keeps every occurrence in
 * `sections`; `first(key)` of the result is the first one.
 */
function parseIssueSections(text, { lenient = false } = {}) {
  const lines = normalize(text).split('\n');
  const doc = { lines, title: null, titleLine: null, titleProblem: null, extraTitles: [], sections: [] };
  let start = 0;
  if (!lenient) {
    const titleMatch = /^#(?:[ \t]+(.*))?$/.exec(lines[0] ?? '');
    if (titleMatch) {
      doc.titleLine = 1;
      doc.title = (titleMatch[1] || '').replace(/[ \t]+#+[ \t]*$/, '').trim();
      doc.titleProblem = doc.title === '' ? 'EMPTY_TITLE' : null;
      start = 1;
    } else {
      doc.titleProblem = 'MISSING_TITLE';
    }
  }
  let fence = null;
  let current = null;
  const push = (line, fenced) => {
    if (current) {
      current.body.push(line);
      current.fenced.push(fenced);
    }
  };
  for (let i = start; i < lines.length; i++) {
    const line = lines[i];
    if (fence) {
      push(line, true);
      const close = new RegExp(`^ {0,3}${fence.char === '`' ? '`' : '~'}{${fence.length},}[ \\t]*$`).test(line);
      if (close) fence = null;
      continue;
    }
    const open = FENCE_OPEN.exec(line);
    if (open && !(open[1][0] === '`' && open[2].includes('`'))) {
      fence = { char: open[1][0], length: open[1].length };
      push(line, true);
      continue;
    }
    const heading = HEADING.exec(line);
    if (heading) {
      const level = heading[1].length;
      if (!lenient && level === 1) {
        doc.extraTitles.push(i + 1);
        current = null;
        continue;
      }
      if (lenient || level === 2) {
        const text = cleanHeading(heading[2]);
        current = { key: text.toLowerCase(), heading: text, level, line: i + 1, bodyStart: i + 2, body: [], fenced: [] };
        doc.sections.push(current);
        continue;
      }
    }
    push(line, false);
  }
  doc.first = (key) => doc.sections.find((section) => section.key === key) || null;
  return doc;
}

/** `{ lowercase heading -> body lines }` of the first occurrence of each section: the reading of the issue intake. */
function sectionMap(parsed) {
  const map = new Map();
  for (const section of parsed.sections) {
    if (!map.has(section.key)) map.set(section.key, section.body);
  }
  return map;
}

/**
 * The lines of a section with HTML comments removed (outside fences): `{ text, line, fenced }`
 * per line, the line number counted in the whole document. Blank results are kept so the line numbers stay.
 */
function visibleLines(section) {
  const out = [];
  let inComment = false;
  section.body.forEach((raw, index) => {
    const line = section.bodyStart + index;
    if (section.fenced[index]) {
      out.push({ text: raw, line, fenced: true });
      return;
    }
    let rest = raw;
    let text = '';
    while (rest !== '') {
      if (inComment) {
        const end = rest.indexOf('-->');
        if (end === -1) { rest = ''; break; }
        inComment = false;
        rest = rest.slice(end + 3);
      } else {
        const begin = rest.indexOf('<!--');
        if (begin === -1) { text += rest; rest = ''; break; }
        text += rest.slice(0, begin);
        inComment = true;
        rest = rest.slice(begin + 4);
      }
    }
    out.push({ text, line, fenced: false });
  });
  return out;
}

/** One-line text of a section: non-empty visible lines joined, list markers dropped. */
function visibleText(section) {
  return visibleLines(section)
    .map((entry) => entry.text.trim().replace(/^(?:[-*+]|\d+[.)])\s+/, ''))
    .filter((text) => text !== '')
    .join(' ');
}

/** The list items of a section: a column-0 bullet or paragraph line starts an item, an indented line continues it. */
function listItems(section) {
  const items = [];
  for (const entry of visibleLines(section)) {
    if (entry.fenced || entry.text.trim() === '') continue;
    const bullet = /^(?:[-*+]|\d+[.)])[ \t]+(.*\S)[ \t]*$/.exec(entry.text);
    if (bullet) items.push({ text: bullet[1], line: entry.line });
    else if (/^\s/.test(entry.text) && items.length > 0) items[items.length - 1].text += ` ${entry.text.trim()}`;
    else items.push({ text: entry.text.trim(), line: entry.line });
  }
  return items;
}

function itemId(text, letter) {
  const match = new RegExp(`^(?:\\*\\*)?(${letter}\\d+)(?:\\*\\*)?(?=[\\s:.)\\-\\u2013]|$)`).exec(text);
  return match ? match[1] : null;
}

/** The lexical pre-filter: every (line, clause) pair the patterns match in the document. */
function flagDocument(lines) {
  const flagged = [];
  lines.forEach((text, index) => {
    for (const clause of HYGIENE_CLAUSES) {
      if (clause.patterns.some((pattern) => pattern.test(text))) flagged.push({ line: index + 1, clause: clause.id });
    }
  });
  return flagged;
}

/**
 * Resolve the judgment verdicts against the flagged lines. A flagged line is
 * cleared only by a `context` verdict that carries evidence; a `violation`
 * verdict, a missing verdict, a verdict for a line that is not flagged, and a
 * malformed verdict each keep the document from being dispatchable.
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
    if (ok) entries.push({ line: raw.line, clause: raw.clause, evidence: raw.evidence, verdict: raw.verdict });
    else invalid.push({ position: i + 1, detail: 'verdict needs integer line, known clause, verdict violation|context, and non-empty evidence' });
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
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push(entry);
  }

  const pending = [];
  const violations = [];
  const cleared = [];
  for (const f of flagged) {
    const found = byKey.get(`${f.line}:${f.clause}`);
    if (!found) {
      pending.push({ line: f.line, clause: f.clause });
      continue;
    }
    const bad = found.find((entry) => entry.verdict === 'violation');
    if (bad) violations.push({ line: f.line, clause: f.clause, evidence: bad.evidence });
    else cleared.push({ line: f.line, clause: f.clause, evidence: found[0].evidence, verdict: 'context' });
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

/** The `## Change` section: its `Key: value` lines, the violations of their forms, and the parsed change. */
function readChangeSection(section, violations) {
  const change = { name: null, depends_on: [], backlog_origin: null, explore_origin: [], specs_none: false, specs_reason: null, skip_specs: false };
  if (!section) {
    violations.push(violation(1, 'MISSING_CHANGE_SECTION', 'the document has no "## Change" section'));
    violations.push(violation(1, 'MISSING_CHANGE_NAME', 'the "## Change" section must carry a "Change name:" line'));
    return change;
  }
  const seen = new Map();
  for (const entry of visibleLines(section)) {
    if (entry.fenced || entry.text.trim() === '') continue;
    const match = /^\s*(?:[-*+][ \t]+)?([A-Za-z][A-Za-z ]*?)[ \t]*:[ \t]*(.*?)[ \t]*$/.exec(entry.text);
    if (!match) {
      violations.push(violation(entry.line, 'INVALID_CHANGE_LINE', `"## Change" lines read "Key: value": ${entry.text.trim()}`));
      continue;
    }
    const [, key, value] = match;
    if (!CHANGE_KEYS.includes(key)) {
      violations.push(violation(entry.line, 'UNKNOWN_CHANGE_KEY', `unknown key "${key}" in "## Change" (known keys: ${CHANGE_KEYS.join(', ')})`));
      continue;
    }
    if (seen.has(key)) {
      violations.push(violation(entry.line, 'DUPLICATE_CHANGE_KEY', `key "${key}" appears more than once in "## Change"`));
      continue;
    }
    seen.set(key, { value, line: entry.line });
  }

  const name = seen.get('Change name');
  if (!name) {
    violations.push(violation(section.line, 'MISSING_CHANGE_NAME', 'the "## Change" section must carry a "Change name:" line'));
  } else if (!KEBAB_CASE.test(name.value)) {
    violations.push(violation(name.line, 'INVALID_CHANGE_NAME', `change name "${name.value}" must be kebab-case`));
  } else {
    change.name = name.value;
  }

  const depends = seen.get('Depends on');
  if (depends) {
    const dependencies = depends.value === '' || /^none$/i.test(depends.value) ? [] : depends.value.split(',').map((part) => part.trim());
    if (depends.value === '' || dependencies.some((dep) => !KEBAB_CASE.test(dep))) {
      violations.push(violation(depends.line, 'DEPENDENCY_FORMAT', 'Depends on reads comma-separated change names or None'));
    } else {
      if (new Set(dependencies).size !== dependencies.length) violations.push(violation(depends.line, 'DUPLICATE_DEPENDENCY', 'an immediate dependency may appear only once'));
      if (change.name && dependencies.includes(change.name)) violations.push(violation(depends.line, 'SELF_DEPENDENCY', `${change.name} cannot depend on itself`));
      change.depends_on = dependencies;
    }
  }

  const specs = seen.get('Specs');
  if (specs) {
    const declaration = SPECS_NONE.exec(specs.value);
    if (!declaration) {
      violations.push(violation(specs.line, 'INVALID_SPECS_FIELD', 'Specs reads "none — <reason>"'));
    } else if (declaration[1].trim() === '') {
      violations.push(violation(specs.line, 'EMPTY_SPECS_REASON', 'Specs: none needs a reason after the dash'));
    } else {
      change.specs_none = true;
      change.specs_reason = declaration[1].trim();
      change.skip_specs = true;
    }
  }

  const backlog = seen.get('Backlog origin');
  if (backlog) {
    const url = backlog.value === '' ? null : canonicalBacklogOrigin(backlog.value);
    if (url) change.backlog_origin = url;
    else violations.push(violation(backlog.line, 'INVALID_BACKLOG_ORIGIN', 'Backlog origin must be a canonical GitHub, GitLab or Azure DevOps issue URL'));
  }

  const explore = seen.get('Explore origin');
  if (explore) {
    const sessions = explore.value === '' ? null : parseExploreOrigin(explore.value);
    if (sessions) change.explore_origin = sessions;
    else violations.push(violation(explore.line, 'INVALID_EXPLORE_ORIGIN', `Explore origin must read ${EXPLORE_ORIGIN_FORM}`));
  }
  return change;
}

/**
 * The structural checks of one document (no judgment). `sliced` marks a member
 * of a slice set, which owes at least one in-scope `I#`.
 */
function checkStructure(text, { sliced = false } = {}) {
  const doc = parseIssueSections(text);
  const violations = [];

  if (isRetiredBlockFormat(text)) violations.push(violation(1, 'RETIRED_FORMAT', RETIRED_FORMAT_DETAIL));
  if (doc.titleProblem === 'MISSING_TITLE') violations.push(violation(1, 'MISSING_TITLE', 'the first line must be "# <title>"'));
  if (doc.titleProblem === 'EMPTY_TITLE') violations.push(violation(1, 'EMPTY_TITLE', 'the title after "# " must not be empty'));
  for (const line of doc.extraTitles) {
    violations.push(violation(line, 'MULTIPLE_DOCUMENTS', 'a second "# " heading starts a second document; one file holds one document'));
  }

  const rank = new Map(SECTIONS.map((section, i) => [section.name.toLowerCase(), i]));
  const present = new Map();
  let highest = -1;
  for (const section of doc.sections) {
    if (!rank.has(section.key)) {
      violations.push(violation(section.line, 'UNKNOWN_SECTION', `unknown section "## ${section.heading}"`));
      continue;
    }
    if (present.has(section.key)) {
      violations.push(violation(section.line, 'DUPLICATE_SECTION', `section "## ${section.heading}" appears more than once`));
      continue;
    }
    present.set(section.key, section);
    const position = rank.get(section.key);
    if (position < highest) {
      violations.push(violation(section.line, 'WRONG_SECTION_ORDER', `section "## ${section.heading}" is out of the agreed order`));
    } else {
      highest = position;
    }
  }

  for (const definition of SECTIONS) {
    const section = present.get(definition.name.toLowerCase());
    if (!section) {
      if (definition.mandatory) violations.push(violation(1, 'MISSING_SECTION', `required section "## ${definition.name}" is missing`));
      continue;
    }
    if (definition.name === 'Change') continue;
    const sectionText = visibleText(section);
    if (sectionText === '') {
      violations.push(violation(section.line, 'EMPTY_SECTION', `section "## ${section.heading}" is empty${definition.mandatory ? '' : '; omit an empty optional section'}`));
      continue;
    }
    if (definition.mandatory && definition.name !== 'Open questions' && definition.name !== 'Maturity' && NOT_AGREED.test(sectionText)) {
      violations.push(violation(section.line, 'NOT_AGREED', `section "## ${section.heading}" reads "Not agreed yet."`));
    } else if (!definition.mandatory && NONE.test(sectionText)) {
      violations.push(violation(section.line, 'EMPTY_SECTION', `section "## ${section.heading}" says none; omit an empty optional section`));
    } else if (definition.mandatory && !definition.noneAllowed && definition.name !== 'Open questions' && definition.name !== 'Maturity' && NONE.test(sectionText)) {
      violations.push(violation(section.line, 'EMPTY_SECTION', `section "## ${section.heading}" has no agreed content`));
    }
  }

  const maturity = present.get('maturity');
  if (maturity) {
    const value = visibleText(maturity).replace(/[*_`]/g, '').replace(/\.$/, '').trim();
    if (value.toLowerCase() !== READY_MATURITY.toLowerCase()) {
      violations.push(violation(maturity.line, 'MATURITY_NOT_READY', `Maturity must read "${READY_MATURITY}", not "${value}"`));
    }
  }
  const questions = present.get('open questions');
  if (questions) {
    const value = visibleText(questions);
    if (value !== '' && !/^none\.?$/i.test(value)) {
      violations.push(violation(questions.line, 'OPEN_QUESTIONS_PRESENT', 'Open questions must read "None."'));
    }
  }

  const ids = { E: [], I: [], O: [] };
  for (const definition of SECTIONS.filter((entry) => entry.ids)) {
    const section = present.get(definition.name.toLowerCase());
    if (!section) continue;
    for (const item of listItems(section)) {
      if (NONE.test(item.text)) continue;
      const id = itemId(item.text, definition.ids);
      if (!id) {
        violations.push(violation(item.line, 'UNIDENTIFIED_ITEM', `"${definition.name}" item has no ${definition.ids}# identifier: ${item.text}`));
        continue;
      }
      ids[definition.name === 'Out-of-scope implementation notes' ? 'O' : definition.ids].push({ id, line: item.line });
    }
  }
  const seenIds = new Set();
  for (const entry of ids.I.concat(ids.O)) {
    if (seenIds.has(entry.id)) {
      violations.push(violation(entry.line, 'DUPLICATE_IMPLEMENTATION_ITEM', `"${entry.id}" must appear exactly once across "Implementation notes" and "Out-of-scope implementation notes"`));
    }
    seenIds.add(entry.id);
  }
  if (sliced && ids.I.length === 0) {
    const section = present.get('implementation notes');
    violations.push(violation(section ? section.line : 1, 'NO_IMPLEMENTATION_ITEM', 'a document of a slice set carries at least one "I#" in "Implementation notes"'));
  }

  const change = readChangeSection(present.get('change'), violations);
  return {
    doc,
    change,
    violations,
    sections: [...present.values()].map((section) => section.heading),
    edge_cases: ids.E.map((entry) => entry.id),
    implementation_notes: ids.I.map((entry) => entry.id),
    out_of_scope_notes: ids.O.map((entry) => entry.id),
  };
}

/**
 * Check one document: the structural result, the hygiene pre-filter over every
 * line, and the judgment of the optional verdicts. `ok` is the deterministic
 * structural result; `dispatchable` also needs the judgment to be clean.
 */
function checkDocument(text, { verdicts = [], sliced = false } = {}) {
  const structure = checkStructure(text, { sliced });
  const flagged = flagDocument(structure.doc.lines);
  const judgment = resolveJudgment(flagged, verdicts);
  const ok = structure.violations.length === 0;
  return {
    ok,
    profile: 'document',
    title: structure.doc.title,
    name: structure.change.name,
    hash: hashDocument(text),
    change: structure.change,
    sections: structure.sections,
    edge_cases: structure.edge_cases,
    implementation_notes: structure.implementation_notes,
    out_of_scope_notes: structure.out_of_scope_notes,
    violations: structure.violations,
    flagged,
    judgment,
    dispatchable: ok && judgment.ok,
  };
}

/**
 * Check a slice set: each document structurally (as a member of a set when
 * there is more than one), unique change names, every out-of-scope `I#` in scope
 * of one document, and the dependencies (present, acyclic, stable order).
 */
function checkSet(texts) {
  const sliced = texts.length > 1;
  const checks = texts.map((text) => checkDocument(text, { sliced }));
  const violations = [];
  if (texts.length === 0) violations.push(violation(1, 'NO_DOCUMENT', 'the set holds no document'));

  const names = checks.map((check) => check.name).filter((name) => name !== null);
  const counts = new Map();
  for (const name of names) counts.set(name, (counts.get(name) || 0) + 1);
  for (const [name, count] of counts) {
    if (count > 1) violations.push(violation(1, 'DUPLICATE_CHANGE_NAME', `change name "${name}" appears in ${count} documents`));
  }

  if (sliced) {
    const owned = new Set(checks.flatMap((check) => check.implementation_notes));
    checks.forEach((check, index) => {
      for (const id of check.out_of_scope_notes) {
        if (!owned.has(id)) violations.push(violation(1, 'UNOWNED_IMPLEMENTATION_ITEM', `"${id}" of document ${index + 1} is in scope of no document: every implementation item appears under "Implementation notes" of at least one document`));
      }
    });
  }

  const byName = new Map(checks.filter((check) => check.name).map((check) => [check.name, check]));
  for (const check of checks) {
    for (const dependency of check.change.depends_on) {
      if (!byName.has(dependency)) violations.push(violation(1, 'MISSING_DEPENDENCY', `${check.name} depends on absent change ${dependency}`));
    }
  }
  const order = [];
  const pending = checks.filter((check) => check.name).slice();
  while (pending.length) {
    const next = pending.findIndex((check) => check.change.depends_on.every((name) => order.includes(name)));
    if (next === -1) {
      if (!violations.some((entry) => entry.problem === 'MISSING_DEPENDENCY')) violations.push(violation(1, 'DEPENDENCY_CYCLE', 'the complete set has a dependency cycle'));
      break;
    }
    order.push(pending.splice(next, 1)[0].name);
  }

  const documents = checks.map((check, index) => ({ index, name: check.name, hash: check.hash, ok: check.ok, violations: check.violations, flagged: check.flagged }));
  return {
    ok: violations.length === 0 && checks.every((check) => check.ok),
    profile: 'set',
    names,
    order,
    documents,
    violations,
  };
}

/** The shape failure of a document file, or null: no title line, an empty title, or more than one document. */
function documentShape(text) {
  if (isRetiredBlockFormat(text)) return RETIRED_FORMAT_DETAIL;
  const doc = parseIssueSections(text);
  if (doc.titleProblem === 'MISSING_TITLE') return 'the first line must be "# <title>"';
  if (doc.titleProblem === 'EMPTY_TITLE') return 'the title after "# " must not be empty';
  if (doc.extraTitles.length > 0) return `the file holds more than one document (a second "# " heading at line ${doc.extraTitles[0]})`;
  return null;
}

/** Verify before returning the file content; never rebuild a document from chat. */
function verifyDocumentFile(filename, hash) {
  if (typeof filename !== 'string' || !path.isAbsolute(filename)) throw new Error('--document-file must be an absolute transfer-file path');
  const transfer = require('./transfer');
  transfer.checkTransferDir(path.dirname(filename));
  const stat = fs.lstatSync(filename);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('Document file must be a regular file');
  const text = fs.readFileSync(filename, 'utf8');
  const shape = documentShape(text);
  if (shape) throw new Error(`Document file is not one change document: ${shape}`);
  if (!/^[0-9a-f]{64}$/.test(hash || '') || hashDocument(text) !== hash) throw new Error('Document file does not match its hash');
  return text;
}

/** The text of each comparable field of a document, by label. */
function documentFields(text) {
  const doc = parseIssueSections(text);
  const fields = new Map();
  fields.set('Title', doc.title === null ? '' : doc.title);
  for (const section of doc.sections) {
    const definition = SECTIONS.find((entry) => entry.name.toLowerCase() === section.key);
    const label = definition ? definition.name : `## ${section.heading}`;
    if (label === 'Change') {
      for (const entry of visibleLines(section)) {
        const match = /^\s*(?:[-*+][ \t]+)?([A-Za-z][A-Za-z ]*?)[ \t]*:[ \t]*(.*?)[ \t]*$/.exec(entry.text);
        if (match && !entry.fenced) fields.set(`Change: ${match[1]}`, match[2]);
      }
      continue;
    }
    fields.set(label, section.body.map((line) => line.replace(/\s+$/, '')).join('\n').trim());
  }
  return fields;
}

/**
 * Field-by-field comparison of a stored document and its amended text:
 * `metadata` when only the `Backlog origin:` or `Explore origin:` lines of
 * `## Change` changed (an identical document included), `content` otherwise.
 */
function compareDocuments(storedText, amendedText) {
  const stored = documentFields(storedText);
  const amended = documentFields(amendedText);
  const labels = [...new Set([...stored.keys(), ...amended.keys()])];
  const changed = labels.filter((label) => stored.get(label) !== amended.get(label));
  const metadata = AMEND_METADATA_KEYS.map((key) => `Change: ${key}`);
  const content = changed.some((label) => !metadata.includes(label));
  return { amend_kind: content ? 'content' : 'metadata', changed_fields: changed };
}

/**
 * The publication form of a document: the title line is the issue title and the
 * rest, from the first non-blank line after it, is the issue description. Nothing
 * is rewritten; a document without a title line is not publishable.
 */
function splitDocument(text) {
  const shape = documentShape(text);
  if (shape) throw new Error(`Not one change document: ${shape}`);
  const lines = normalize(text).split('\n');
  const doc = parseIssueSections(text);
  let first = 1;
  while (first < lines.length && lines[first].trim() === '') first += 1;
  return { title: doc.title, description: lines.slice(first).join('\n').replace(/\s+$/, '') };
}

/**
 * Read a document set for publication: the structural checks of the set, the
 * dependency order, and the facts each publisher needs per document (name, title,
 * description, immediate dependencies, backlog origin, text, hash). `ok` is false
 * when the set or any document fails its structural checks.
 */
function readSet(texts) {
  const set = checkSet(texts);
  const documents = [];
  const violations = set.violations.slice();
  texts.forEach((text, index) => {
    const checked = checkDocument(text, { sliced: texts.length > 1 });
    for (const entry of checked.violations) violations.push({ ...entry, document: index + 1 });
    let parts = { title: checked.title, description: '' };
    try { parts = splitDocument(text); } catch { /* the structural violation already names it */ }
    documents.push({
      name: checked.name,
      title: parts.title,
      description: parts.description,
      dependencies: checked.change.depends_on,
      backlog_origin: checked.change.backlog_origin,
      text,
      hash: checked.hash,
    });
  });
  return { ok: set.ok && violations.length === 0, order: set.order, documents, violations };
}

/** The section lines and their line indexes of a document, for the line-level edits below. */
function changeSectionLines(text) {
  const lines = normalize(text).split('\n');
  const section = parseIssueSections(text).first('change');
  if (!section) throw new Error('The document has no "## Change" section');
  const start = section.bodyStart - 1;
  return { lines, section, start, end: start + section.body.length };
}

/**
 * Set one `Key: value` line of the `## Change` section: replace the line of that key,
 * or insert it before the first later key of the documented order, or at the end of
 * the section. Every other line stays as it was.
 */
function setChangeLine(text, key, value) {
  const { lines, section, start, end } = changeSectionLines(text);
  const own = new RegExp(`^(\\s*(?:[-*+][ \\t]+)?)${key}[ \\t]*:`);
  const rank = CHANGE_KEYS.indexOf(key);
  let insertAt = -1;
  let lastContent = start - 1;
  let prefix = null;
  for (let i = start; i < end; i++) {
    if (section.fenced[i - start] || lines[i].trim() === '') continue;
    lastContent = i;
    const match = own.exec(lines[i]);
    if (match) {
      lines[i] = `${match[1]}${key}: ${value}`;
      return lines.join('\n');
    }
    const other = /^(\s*(?:[-*+][ \t]+)?)([A-Za-z][A-Za-z ]*?)[ \t]*:/.exec(lines[i]);
    if (other && prefix === null) prefix = other[1];
    if (insertAt === -1 && other && CHANGE_KEYS.indexOf(other[2]) > rank) insertAt = i;
  }
  // A new line takes the list marker the other lines of the section use.
  lines.splice(insertAt === -1 ? lastContent + 1 : insertAt, 0, `${prefix || ''}${key}: ${value}`);
  return lines.join('\n');
}

/**
 * The origin a document takes from an imported issue: the imported URL fills a
 * missing `Backlog origin:`; a different existing value is kept and warned about.
 */
function resolveImportedOrigin(documentOrigin, imported) {
  if (!imported) return { value: documentOrigin || null, source: documentOrigin ? 'document' : null, warning: null };
  if (!canonicalBacklogOrigin(imported)) throw Object.assign(new Error('--origin must be a canonical GitHub, GitLab or Azure DevOps issue URL'), { usage: true });
  if (!documentOrigin) return { value: imported, source: 'imported', warning: null };
  if (documentOrigin === imported) return { value: documentOrigin, source: 'imported', warning: null };
  return {
    value: documentOrigin,
    source: 'document',
    warning: `The change document names ${documentOrigin} as its Backlog origin and the imported issue is ${imported}; the existing value is kept.`,
  };
}

/** Add the imported URL to a stored document as `Backlog origin:`, keeping a different existing value. */
function applyImportedOrigin(text, imported) {
  const { change } = checkStructure(text);
  const origin = resolveImportedOrigin(change.backlog_origin, imported);
  if (origin.source !== 'imported' || change.backlog_origin === origin.value) return { text, action: origin.warning ? 'kept' : 'unchanged', origin };
  return { text: setChangeLine(text, 'Backlog origin', origin.value), action: 'inserted', origin };
}

/**
 * Attach the verified child identities of a published set to its documents: each
 * document receives its own issue URL as `Backlog origin:`. A document that names the
 * set's parent (an adopted originating issue) takes its child URL in its place; any
 * other conflicting origin or an incomplete correspondence is refused.
 */
function attachBacklogOrigins(texts, correspondence) {
  const association = require('./backlog-slice-identity').checkIdentity(correspondence);
  if (association.role !== 'parent') throw new Error('Complete parent/child publication correspondence is required');
  const set = readSet(texts);
  if (!set.ok || set.documents.length !== association.slices.length) throw new Error('Publication correspondence must cover the complete stored document set');
  const documents = set.documents.map((document) => {
    const slice = association.slices.find((entry) => entry.change_name === document.name);
    if (!slice || JSON.stringify(slice.depends_on.slice().sort()) !== JSON.stringify(document.dependencies.slice().sort())) throw new Error('Publication correspondence differs from the agreed slice dependencies');
    const adopted = document.backlog_origin === association.parent;
    if (document.backlog_origin && !adopted && document.backlog_origin !== slice.issue) throw new Error('Existing selected issue origin conflicts with publication; obtain a user decision');
    const text = document.backlog_origin === slice.issue ? document.text : setChangeLine(document.text, 'Backlog origin', slice.issue);
    return { name: document.name, text, hash: hashDocument(text), backlog_origin: slice.issue };
  });
  return { ok: true, order: set.order, documents };
}

/* ------------------------------------------------------------------------ *
 * The section reading of the issue intake (/sai-explore): per-stage state,
 * open questions, and the `explore-idea@1` seed, read from any issue.
 * ------------------------------------------------------------------------ */

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
 * Structural HTML tags decide, but only outside backtick code spans and fenced code blocks, where tags are literal
 * text. An opening Markdown heading means Markdown, and so does any doubt.
 */
function looksLikeHtml(withoutComments) {
  const hasMarkdownHeading = /^#{1,6}[ \t]+\S/m.test(withoutComments);
  const hasHtmlStructure = /<(?:h[1-6]|p|div|ul|ol|li|br)\b/i.test(require('./azure-markdown').setAsideCode(withoutComments, false));
  return hasHtmlStructure && !hasMarkdownHeading;
}

/** Normalize an issue description to Markdown. HTML comments are removed in both encodings: hidden markers never carry content. */
function issueToMarkdown(text) {
  const withoutComments = normalize(text).replace(/<!--[\s\S]*?-->/g, '');
  return looksLikeHtml(withoutComments) ? htmlToMarkdown(withoutComments) : withoutComments;
}

/** Whether an issue description is HTML rather than Markdown; text without structural HTML outside code is Markdown. */
function isHtmlDescription(text) {
  return looksLikeHtml(normalize(text).replace(/<!--[\s\S]*?-->/g, ''));
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

/** The `/sai-explore` stage that owns each issue-derived section, in stage order. */
const SEED_STAGES = ['explore-change', 'review-edge-cases', 'implementation-details'];

const EXPLICIT_NONE = /^(?:none|n\/a)\.?$/i;

/**
 * The identifiers of a list's items, in order: the item's own `E#`/`I#` when it
 * carries one, otherwise the next unused number. The store keeps identifiers
 * only, so the seed carries these and never the item text.
 */
function itemIdentifiers(items, letter) {
  const own = new RegExp('^(?:\\*\\*)?(' + letter + '\\d+)(?:\\*\\*)?(?=[\\s:.)\\-\\u2013]|$)');
  const taken = new Set(items.map((item) => (own.exec(item) || [])[1]).filter(Boolean));
  let counter = 0;
  return items.map((item) => {
    const match = own.exec(item);
    if (match) return match[1];
    do { counter += 1; } while (taken.has(`${letter}${counter}`));
    taken.add(`${letter}${counter}`);
    return `${letter}${counter}`;
  });
}

/** Which stage section an `Open questions` entry affects; an entry that maps to no single section affects `explore-change`. */
function questionAffects(text) {
  const hits = new Set();
  if (/\bE\d+\b/.test(text) || /\bedge[- ]cases?\b/i.test(text)) hits.add('review-edge-cases');
  if (/\bI\d+\b/.test(text) || /\bimplementation\b/i.test(text)) hits.add('implementation-details');
  if (hits.size === 1) return { affects: [...hits][0], single: true };
  return { affects: 'explore-change', single: false };
}

/**
 * Per-section reading of an issue of any Maturity: `present` (agreed content),
 * `explicitly-empty` (the section says none), or `absent` (missing, blank, or
 * not agreed yet), plus the section each open question affects and the
 * `explore-idea@1` seed event built from them: a section is seeded `agreed`
 * only when the issue holds it explicitly and no open question affects it.
 * `sections` is the map of lowercase heading -> body lines (`sectionMap`).
 */
function analyzeIssueSections(sections) {
  const agreedText = (name) => {
    const text = sectionText(sections.get(name) || []);
    return isEmptySource(text) ? '' : text;
  };
  const changePresent = ['problem', 'goal'].every((name) => agreedText(name) !== '')
    && sectionItems(sections.get('scope') || []).some((item) => !NOT_AGREED_OR_NONE.test(item));
  const listStatus = (name) => {
    const raw = sectionItems(sections.get(name) || []);
    const items = raw.filter((item) => !NOT_AGREED_OR_NONE.test(item));
    if (items.length > 0) return { status: 'present', items };
    if (raw.some((item) => EXPLICIT_NONE.test(item))) return { status: 'explicitly-empty', items: [] };
    return { status: 'absent', items: [] };
  };
  const edge = listStatus('edge cases');
  const implementation = listStatus('implementation notes');
  const openQuestions = sectionItems(sections.get('open questions') || [])
    .filter((item) => !NOT_AGREED_OR_NONE.test(item))
    .map((text) => Object.assign({ text }, questionAffects(text)));
  const affected = new Set(openQuestions.map((entry) => entry.affects));

  const reading = {
    'explore-change': { status: changePresent ? 'present' : 'absent' },
    'review-edge-cases': { status: edge.status, items: edge.items },
    'implementation-details': { status: implementation.status, items: implementation.items },
  };
  const seedSections = {};
  for (const stage of SEED_STAGES) {
    const read = reading[stage];
    const agreed = read.status !== 'absent' && !affected.has(stage);
    const entry = { state: agreed ? 'agreed' : 'open', source: 'issue' };
    if (read.status !== 'absent' && stage !== 'explore-change') entry.list = itemIdentifiers(read.items, stage === 'review-edge-cases' ? 'E' : 'I');
    seedSections[stage] = entry;
  }
  return { sections: reading, open_questions: openQuestions, seed: { sections: seedSections } };
}

/** The note a `declared-clean` drift outcome adds to the document's `Additional notes`. */
const DECLARED_CLEAN_NOTE = 'The user declared that the issue has no drift from the current code without validating it.';

const NAME_STOP_WORDS = new Set(['a', 'an', 'the', 'to', 'of', 'for', 'in', 'on', 'and', 'or', 'every', 'that', 'is', 'are',
  'with', 'it', 'its', 'this', 'from', 'by', 'be', 'as', 'at', 'so', 'one', 'when', 'then', 'into', 'than', 'whether']);

/** A kebab-case change name proposal from the Goal text: its first five significant words. */
function proposeChangeName(goal) {
  const words = goal.toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(' ')
    .filter((word) => word !== '' && !NAME_STOP_WORDS.has(word));
  return words.slice(0, 5).join('-');
}

/** The `Key: value` lines of an issue's `## Change` section, as the text each key holds (a re-imported published change document). */
function readChangeLines(lines) {
  const found = {};
  for (const raw of lines || []) {
    const match = /^\s*(?:[-*+][ \t]+)?([A-Za-z][A-Za-z ]*?)[ \t]*:[ \t]*(.*?)[ \t]*$/.exec(raw);
    if (match && CHANGE_KEYS.includes(match[1]) && !(match[1] in found)) found[match[1]] = match[2];
  }
  const list = (value) => (value === undefined || /^none\.?$/i.test(value) || value === '' ? [] : value.split(',').map((part) => part.trim()).filter(Boolean));
  return {
    name: found['Change name'] && KEBAB_CASE.test(found['Change name']) ? found['Change name'] : null,
    depends_on: list(found['Depends on']),
    backlog_origin: found['Backlog origin'] ? canonicalBacklogOrigin(found['Backlog origin']) : null,
    explore_origin: found['Explore origin'] || null,
    specs: found.Specs || null,
  };
}

/**
 * Read an issue description (Markdown or HTML) of any Maturity: its Maturity value and its section reading.
 * A re-imported published change document also reports its `## Change` lines (`change`) and the
 * `Backlog origin` the change takes: the imported URL fills a missing one, a different existing one is kept
 * with a warning.
 */
function readIssue(text, { origin = null } = {}) {
  const parsed = parseIssueSections(issueToMarkdown(text), { lenient: true });
  const map = sectionMap(parsed);
  const maturityLines = map.get('maturity');
  const maturity = maturityLines ? sectionText(maturityLines).replace(/[*_`]/g, '').replace(/\.$/, '').trim() : null;
  const goalText = sectionText(map.get('goal') || []);
  const change = readChangeLines(map.get('change'));
  return Object.assign({
    ready_to_propose_form: maturity !== null && maturity.toLowerCase() === READY_MATURITY.toLowerCase(),
    maturity,
    proposed_change_name: change.name || (isEmptySource(goalText) ? null : proposeChangeName(goalText)),
    declared_clean_note: DECLARED_CLEAN_NOTE,
    change,
    backlog_origin: resolveImportedOrigin(change.backlog_origin, origin),
  }, analyzeIssueSections(map));
}

/** The issue text without its `## Change` section: the literal text `compose` completes. */
function withoutChangeSection(text) {
  const doc = parseIssueSections(text, { lenient: true });
  const section = doc.first('change');
  if (!section) return normalize(text);
  const lines = doc.lines.slice();
  const start = section.line - 1;
  const end = section.bodyStart - 1 + section.body.length;
  lines.splice(start, end - start);
  return lines.join('\n').replace(/\s+$/, '');
}

/**
 * The text with `note` as one paragraph at the end of `## Additional notes`:
 * appended to the existing section, or written with a new section before the
 * next agreed section (in the section order of the issue format).
 */
function withAdditionalNote(text, note) {
  const doc = parseIssueSections(text, { lenient: true });
  const lines = doc.lines.slice();
  const section = doc.first('additional notes');
  if (section) {
    if (section.body.some((line) => line.trim() === note)) return lines.join('\n');
    let end = section.bodyStart - 1 + section.body.length;
    while (end > section.bodyStart - 1 && lines[end - 1].trim() === '') end -= 1;
    lines.splice(end, 0, '', note);
    return lines.join('\n');
  }
  const rank = new Map(SECTIONS.map((entry, index) => [entry.name.toLowerCase(), index]));
  const own = rank.get('additional notes');
  const anchor = doc.sections.find((entry) => rank.has(entry.key) && rank.get(entry.key) > own);
  const insertAt = anchor ? anchor.line - 1 : lines.length;
  const separator = insertAt > 0 && lines[insertAt - 1].trim() !== '' ? [''] : [];
  lines.splice(insertAt, 0, ...separator, '## Additional notes', '', note, '');
  return lines.join('\n');
}

/**
 * Compose the change document of a mature issue: the literal issue text with
 * the `## Change` lines the intake settled on. It reads no repository and no
 * clock; the caller supplies every value. `--explore-origin` entries keep the
 * order given; without `--backlog-origin` (an issue that was pasted or read
 * from a file, with no issue URL) the document carries no `Backlog origin:`
 * line; `--declared-clean` adds the intake's declared-clean note to
 * `## Additional notes`. A `Depends on:` line the issue already carries is
 * preserved, because no compose flag names it.
 */
function composeChangeDocument(text, { backlogOrigin = null, exploreOrigins = [], specs = null, changeName = null, declaredClean = false } = {}) {
  const usage = (message) => Object.assign(new Error(message), { usage: true });
  if (backlogOrigin !== null && backlogOrigin !== undefined && (typeof backlogOrigin !== 'string' || !canonicalBacklogOrigin(backlogOrigin))) {
    throw usage('--backlog-origin must be a canonical GitHub, GitLab or Azure DevOps issue URL');
  }
  const source = isHtmlDescription(text) ? issueToMarkdown(text) : normalize(text);
  const existing = readIssue(source).change;
  const name = changeName || existing.name;
  if (!name || !KEBAB_CASE.test(name)) throw usage('--change-name must be kebab-case (or the issue must carry a valid Change name)');
  let exploreOrigin = null;
  if (exploreOrigins.length > 0) {
    exploreOrigin = exploreOrigins.join(', ');
    if (!parseExploreOrigin(exploreOrigin)) throw usage('--explore-origin reads "<harness> <session>", harness opencode or claude');
  }
  if (specs !== null) {
    const declaration = SPECS_NONE.exec(specs);
    if (!declaration || declaration[1].trim() === '') throw usage('--specs reads "none — <reason>"');
  }
  const depends = existing.depends_on.length > 0 ? existing.depends_on.join(', ') : 'None';
  const changeLines = ['## Change', '', `- Change name: ${name}`, `- Depends on: ${depends}`];
  if (backlogOrigin) changeLines.push(`- Backlog origin: ${backlogOrigin}`);
  if (exploreOrigin) changeLines.push(`- Explore origin: ${exploreOrigin}`);
  if (specs !== null) changeLines.push(`- Specs: ${specs}`);
  let output = withoutChangeSection(source);
  if (declaredClean) output = withAdditionalNote(output, DECLARED_CLEAN_NOTE);
  return `${output.replace(/\s+$/, '')}\n\n${changeLines.join('\n')}\n`;
}

const HARNESSES = ['claude', 'opencode'];
const CD = 'node sai/tools/change-document.js';

const USAGE = {
  subcommands: {
    check: {
      usage: [`${CD} check --document-file <path> [--verdicts-file <path>] [--slice]`],
      notes: ['Validates one change document and reports whether it is dispatchable. The verdicts file holds the JSON array of hygiene verdicts; --slice treats the document as a member of a slice set.'],
      examples: [`${CD} check --document-file document.md`, `${CD} check --document-file document.md --verdicts-file verdicts.json --slice`],
      flags: { '--document-file': true, '--verdicts-file': true, '--slice': false, '--json': false },
      required: ['--document-file'],
    },
    'check-set': {
      usage: [`${CD} check-set --document-file <path> [--document-file <path> ...]`],
      notes: ['Validates a slice set: each document, unique names, implementation items, dependencies.'],
      examples: [`${CD} check-set --document-file slice-1.md --document-file slice-2.md`],
      flags: { '--document-file': { repeat: true }, '--json': false },
      required: ['--document-file'],
    },
    hash: {
      usage: [`${CD} hash --document-file <path>`],
      notes: ['Prints the sha256 of the whole document file, line endings normalized to LF.'],
      examples: [`${CD} hash --document-file document.md`],
      flags: { '--document-file': true, '--json': false },
      required: ['--document-file'],
    },
    'verify-file': {
      usage: [`${CD} verify-file --document-file <path> --document-hash <sha256>`],
      notes: ['Verifies an exported document file against its hash; a file without a "# <title>" first line or with more than one document fails.'],
      examples: [`${CD} verify-file --document-file document.md --document-hash 0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef`],
      flags: { '--document-file': true, '--document-hash': true, '--json': false },
      required: ['--document-file', '--document-hash'],
    },
    compare: {
      usage: [`${CD} compare --stored-file <path> --document-file <path>`],
      notes: ['Reports whether the amended document differs from the stored one in content or in metadata only.'],
      examples: [`${CD} compare --stored-file stored.md --document-file amended.md`],
      flags: { '--stored-file': true, '--document-file': true, '--json': false },
      required: ['--stored-file', '--document-file'],
    },
    sections: {
      usage: [`${CD} sections [--origin <issue-url>] [--input-file <path>]`],
      notes: ['Reads the sections of an issue description (from the input file, or stdin) for the issue intake; --origin is the imported issue URL a missing Backlog origin takes.'],
      examples: [`${CD} sections --origin https://github.com/owner/repo/issues/12 --input-file issue.md`],
      flags: { '--origin': true, '--input-file': true, '--json': false },
    },
    compose: {
      usage: [`${CD} compose --input-file <issue> --output-file <path> [--backlog-origin <issue-url>] [--change-name <name>] [--explore-origin "<harness> <session>" ...] [--specs <value>] [--declared-clean]`],
      notes: ['Writes the literal issue text with the settled Change lines as one change document, and prints its path and hash. It reads no repository; --explore-origin is repeatable and keeps the order given.'],
      examples: [
        `${CD} compose --input-file issue.md --backlog-origin https://github.com/owner/repo/issues/12 --change-name greeting-banner --output-file document.md`,
        `${CD} compose --input-file issue.md --backlog-origin https://github.com/owner/repo/issues/12 --change-name greeting-banner --explore-origin "claude 88a1341a-aab7-4efe-82d8-58de66098f65" --specs "none — documentation only" --declared-clean --output-file document.md`,
      ],
      flags: { '--input-file': true, '--backlog-origin': true, '--output-file': true, '--change-name': true, '--explore-origin': true, '--specs': true, '--declared-clean': false, '--json': false },
      required: ['--input-file', '--output-file'],
    },
    split: {
      usage: [`${CD} split --document-file <path> [--document-hash <sha256>]`],
      notes: ['Prints the title line and the description of a verified document: the issue title and description of its publication.'],
      examples: [`${CD} split --document-file document.md --document-hash 0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef`],
      flags: { '--document-file': true, '--document-hash': true, '--json': false },
      required: ['--document-file'],
    },
    'set-origin': {
      usage: [`${CD} set-origin --document-file <path> --origin <issue-url> [--harness <claude|opencode>]`],
      notes: ['Writes a copy of a stored document whose Backlog origin is the imported URL; a different existing value is kept and reported.'],
      examples: [`${CD} set-origin --document-file document.md --origin https://github.com/owner/repo/issues/12 --harness claude`],
      flags: { '--document-file': true, '--origin': true, '--harness': HARNESSES, '--json': false },
      required: ['--document-file', '--origin'],
    },
    'attach-origin': {
      usage: [`${CD} attach-origin --input-file <path> [--harness <claude|opencode>]`],
      notes: ['The input file holds the JSON {document_files: [{document_file, hash}], correspondence}. Each document of a published set takes its child issue URL as Backlog origin, and the amended documents go to a private directory.'],
      examples: [`${CD} attach-origin --input-file attach.json --harness opencode`],
      flags: { '--input-file': true, '--harness': HARNESSES, '--json': false },
      required: ['--input-file'],
    },
  },
};

function usage() {
  return usageKit.render(USAGE);
}

const VALUE_FLAGS = ['--document-file', '--document-hash', '--verdicts-file', '--stored-file', '--input-file', '--origin', '--harness',
  '--backlog-origin', '--explore-origin', '--specs', '--change-name', '--output-file'];

function parseArgs(argv) {
  const opts = { command: null, help: false, slice: false, declaredClean: false, exploreOrigins: [], documents: [] };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      opts.help = true;
    } else if (arg === '--json') {
      // Always JSON.
    } else if (arg === '--slice') {
      opts.slice = true;
    } else if (arg === '--declared-clean') {
      opts.declaredClean = true;
    } else if (VALUE_FLAGS.includes(arg)) {
      if (i + 1 >= argv.length || argv[i + 1].startsWith('--')) return { error: `${arg} requires a value` };
      const value = argv[++i];
      if (arg === '--document-file') opts.documents.push(value);
      else if (arg === '--explore-origin') opts.exploreOrigins.push(value);
      else opts[arg.slice(2)] = value;
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

function readDocument(file) {
  return fs.readFileSync(file, 'utf8');
}

function main(argv, readStdin = () => fs.readFileSync(0, 'utf8')) {
  const guarded = usageKit.handle(USAGE, argv);
  if (guarded !== null) return guarded;
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
  const single = () => {
    if (opts.documents.length !== 1) throw Object.assign(new Error(`${opts.command} requires exactly one --document-file`), { usage: true });
    return opts.documents[0];
  };
  const emit = (value) => process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);

  try {
    if (opts.command === 'verify-file') {
      verifyDocumentFile(single(), opts['document-hash']);
      process.stdout.write(`${JSON.stringify({ ok: true, hash: opts['document-hash'], document_file: opts.documents[0] })}\n`);
      return 0;
    }
    if (opts.command === 'hash') {
      const text = readDocument(single());
      const shape = documentShape(text);
      if (shape) {
        emit({ ok: false, error: shape });
        return 1;
      }
      emit({ ok: true, hash: hashDocument(text) });
      return 0;
    }
    if (opts.command === 'check') {
      const text = readDocument(single());
      let verdicts = [];
      if (opts['verdicts-file']) {
        try {
          verdicts = JSON.parse(fs.readFileSync(opts['verdicts-file'], 'utf8'));
          if (!Array.isArray(verdicts)) throw new Error('verdicts must be a JSON array');
        } catch (error) {
          const result = checkDocument(text, { sliced: opts.slice });
          result.violations.push(violation(1, 'VERDICTS_UNPARSEABLE', `the verdicts file must be a JSON array: ${error.message}`));
          result.ok = false;
          result.dispatchable = false;
          emit(result);
          return 1;
        }
      }
      const result = checkDocument(text, { verdicts, sliced: opts.slice });
      emit(result);
      return result.dispatchable ? 0 : 1;
    }
    if (opts.command === 'check-set') {
      const result = checkSet(opts.documents.map(readDocument));
      emit(result);
      return result.ok ? 0 : 1;
    }
    if (opts.command === 'compare') {
      if (!opts['stored-file'] || opts.documents.length !== 1) throw Object.assign(new Error('compare requires --stored-file and --document-file'), { usage: true });
      emit(Object.assign({ ok: true }, compareDocuments(readDocument(opts['stored-file']), readDocument(opts.documents[0]))));
      return 0;
    }
    if (opts.command === 'sections') {
      const input = opts['input-file'] ? inputReader.readInputFile(opts['input-file']) : readStdin();
      emit(Object.assign({ ok: true }, readIssue(input, { origin: opts.origin || null })));
      return 0;
    }
    if (opts.command === 'compose') {
      const input = inputReader.readInputFile(opts['input-file']);
      const output = composeChangeDocument(input, {
        backlogOrigin: opts['backlog-origin'] || null,
        exploreOrigins: opts.exploreOrigins,
        specs: opts.specs === undefined ? null : opts.specs,
        changeName: opts['change-name'] || null,
        declaredClean: opts.declaredClean,
      });
      fs.writeFileSync(opts['output-file'], output, 'utf8');
      emit({ document_file: opts['output-file'], hash: hashDocument(output) });
      return 0;
    }
    if (opts.command === 'split') {
      const file = single();
      const text = opts['document-hash'] ? verifyDocumentFile(file, opts['document-hash']) : readDocument(file);
      emit(Object.assign({ ok: true }, splitDocument(text)));
      return 0;
    }
    if (opts.command === 'set-origin') {
      if (!opts.origin) throw Object.assign(new Error('set-origin requires --origin'), { usage: true });
      const result = applyImportedOrigin(readDocument(single()), opts.origin);
      const transfer = require('./transfer');
      const { dir } = transfer.open(opts.harness);
      const reference = transfer.put(dir, 'document.md', Buffer.from(result.text, 'utf8'));
      emit({ ok: true, action: result.action, origin: result.origin, hash: hashDocument(result.text), document_file: reference.path, transfer_dir: dir });
      return 0;
    }
    if (opts.command === 'attach-origin') {
      if (!opts['input-file']) throw Object.assign(new Error('attach-origin requires --input-file'), { usage: true });
      const request = JSON.parse(inputReader.readInputFile(opts['input-file']));
      if (!Array.isArray(request.document_files)) throw new Error('attach-origin needs document_files: [{document_file, hash}]');
      const result = attachBacklogOrigins(request.document_files.map((reference) => verifyDocumentFile(reference.document_file, reference.hash)), request.correspondence);
      const transfer = require('./transfer');
      const { dir } = transfer.open(opts.harness);
      const documents = result.documents.map((document) => {
        const reference = transfer.put(dir, `${document.name}.md`, Buffer.from(document.text, 'utf8'));
        return { name: document.name, hash: document.hash, backlog_origin: document.backlog_origin, document_file: reference.path };
      });
      emit({ ok: true, order: result.order, documents, transfer_dir: dir });
      return 0;
    }
  } catch (error) {
    if (error.usage || error instanceof inputReader.InputFileError || error.code === 'ENOENT') {
      process.stderr.write(`${error.message}\n`);
      return 2;
    }
    if (['verify-file', 'compare', 'attach-origin', 'set-origin'].includes(opts.command)) {
      emit({ ok: false, error: error.message });
      return 1;
    }
    process.stderr.write(`${error.message}\n`);
    return 2;
  }
  process.stderr.write(`sub-command "check", "check-set", "hash", "verify-file", "compare", "sections", "compose", "split", "set-origin" or "attach-origin" required.\n${usage()}\n`);
  return 2;
}

module.exports = {
  SECTIONS,
  MANDATORY_SECTIONS,
  OPTIONAL_SECTIONS,
  MATURITY_VALUES,
  CHANGE_KEYS,
  HYGIENE_CLAUSES,
  AMEND_METADATA_KEYS,
  parseIssueSections,
  sectionMap,
  checkDocument,
  checkSet,
  resolveJudgment,
  flagDocument,
  hashDocument,
  isRetiredBlockFormat,
  documentShape,
  verifyDocumentFile,
  compareDocuments,
  splitDocument,
  readSet,
  setChangeLine,
  applyImportedOrigin,
  resolveImportedOrigin,
  attachBacklogOrigins,
  analyzeIssueSections,
  readIssue,
  issueToMarkdown,
  isHtmlDescription,
  composeChangeDocument,
  parseExploreOrigin,
  main,
  USAGE,
};

if (require.main === module) {
  process.exitCode = main(process.argv.slice(2));
}
