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
 *   node sai/tools/change-document.js sections [--input-file <path>]  (issue description on stdin without a file)
 *
 * Every verdict is one JSON object on stdout. Exit codes: 0 = valid
 * (`check`: `dispatchable` is true), 1 = violations, a failed verification, or
 * judgment pending, 2 = usage or I/O error.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const inputReader = require('./input-reader');
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

/** Read an issue description (Markdown or HTML) of any Maturity: its Maturity value and its section reading. */
function readIssue(text) {
  const parsed = parseIssueSections(issueToMarkdown(text), { lenient: true });
  const map = sectionMap(parsed);
  const maturityLines = map.get('maturity');
  const maturity = maturityLines ? sectionText(maturityLines).replace(/[*_`]/g, '').replace(/\.$/, '').trim() : null;
  return Object.assign({
    ready_to_propose_form: maturity !== null && maturity.toLowerCase() === READY_MATURITY.toLowerCase(),
    maturity,
  }, analyzeIssueSections(map));
}

function usage() {
  return [
    'Usage: node sai/tools/change-document.js check --document-file <path> [--verdicts-file <path>] [--slice]',
    '       node sai/tools/change-document.js check-set --document-file <path> --document-file <path> ...',
    '       node sai/tools/change-document.js hash --document-file <path>',
    '       node sai/tools/change-document.js verify-file --document-file <path> --document-hash <sha256>',
    '       node sai/tools/change-document.js compare --stored-file <path> --document-file <path>',
    '       node sai/tools/change-document.js sections [--input-file <path>]  (issue description; stdin also accepted)',
    '',
    '  check        Validate one change document and report whether it is dispatchable; the verdicts file holds the JSON array of hygiene verdicts',
    '  check-set    Validate a slice set: each document, unique names, implementation items, dependencies',
    '  hash         Print the sha256 of the whole document file (line endings normalized to LF)',
    '  verify-file  Verify an exported document file against its hash; a file without a "# <title>" first line or with more than one document fails',
    '  compare      Report whether the amended document differs from the stored one in content or in metadata only',
    '  sections     Read the sections of an issue description for the issue intake',
    '  --slice      Treat the document as a member of a slice set (it owes one in-scope I#)',
  ].join('\n');
}

const VALUE_FLAGS = ['--document-file', '--document-hash', '--verdicts-file', '--stored-file', '--input-file'];

function parseArgs(argv) {
  const opts = { command: null, help: false, slice: false, documents: [] };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      opts.help = true;
    } else if (arg === '--json') {
      // Always JSON.
    } else if (arg === '--slice') {
      opts.slice = true;
    } else if (VALUE_FLAGS.includes(arg)) {
      if (i + 1 >= argv.length || argv[i + 1].startsWith('--')) return { error: `${arg} requires a value` };
      const value = argv[++i];
      if (arg === '--document-file') opts.documents.push(value);
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
      emit(Object.assign({ ok: true }, readIssue(input)));
      return 0;
    }
  } catch (error) {
    if (error.usage || error instanceof inputReader.InputFileError || error.code === 'ENOENT') {
      process.stderr.write(`${error.message}\n`);
      return 2;
    }
    if (['verify-file', 'compare'].includes(opts.command)) {
      emit({ ok: false, error: error.message });
      return 1;
    }
    process.stderr.write(`${error.message}\n`);
    return 2;
  }
  process.stderr.write(`sub-command "check", "check-set", "hash", "verify-file", "compare" or "sections" required.\n${usage()}\n`);
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
  documentShape,
  verifyDocumentFile,
  compareDocuments,
  analyzeIssueSections,
  readIssue,
  issueToMarkdown,
  isHtmlDescription,
  parseExploreOrigin,
  main,
};

if (require.main === module) {
  process.exitCode = main(process.argv.slice(2));
}
