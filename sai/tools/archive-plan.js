#!/usr/bin/env node

'use strict';

/**
 * archive-plan — the deterministic, read-only archive plan of one change.
 *
 * The plan is a computation, so a tool makes it and no model turn does. Both
 * `/sai-archive` and the Direct Build archive step read the same plan before
 * any archive mutation. The plan holds the CORE gate verdict, the AUDIT line,
 * the delta-sync summary, the capabilities the change retires (with the
 * preconditions of that declaration), the date-prefixed archive destination
 * and its collision verdict, the main specs the archive touches, the paths the
 * archive commit owns (and the ones it omits), and the closing line of the
 * archive commit.
 *
 * It reads the repository and spawns only `git` and the sibling
 * `check-delta-headers.js`. `openspec archive <name> --yes --json` stays the
 * sole sync and move primitive; this tool predicts what that command and git
 * produce, it never replaces either. A validation the tool does not predict
 * (a requirement without SHALL, for example) fails in the CLI and is reported
 * as the CLI reports it.
 *
 * Usage:
 *   node sai/tools/archive-plan.js plan <change-name> [--json] [--cwd <root>]
 *     [--implementer-paths-file <path>] [--implementer-path <path>]...
 *     [--drafts-dir <dir>]
 *
 *   --implementer-paths-file  one repository-relative path per line: the paths
 *                             the implementer changed (Direct Build), deletions
 *                             included.
 *   --implementer-path        the same paths as repeatable arguments, for a
 *                             caller that holds no file to point at.
 *   --drafts-dir              the transfer directory that holds the draft
 *                             `.openspec.yaml` and `proposal.md` of a no-specs
 *                             change that no backfill worker wrote yet; they
 *                             stand in for the change files that do not exist.
 *
 * stdout is one JSON object. Exit codes: 0 = a plan (`ok: true`); 1 = the plan
 * is refused (`ok: false`, `refused: true`, with `reason` and a `summary` to
 * print verbatim, and nothing was written); 2 = usage or tooling error
 * (`ok: false`, `error`).
 */

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { structuralLines, extractRequirementName } = require('./spec-scenarios.js');

class ToolError extends Error {}

const NAME_RE = /^[a-z0-9][a-z0-9-]*$/;
const DATE_PREFIX_RE = /^\d{4}-\d{2}-\d{2}-/;
// The ten sai-workflow artifacts: CORE blocks the archive, AUDIT only informs (`change-overview` joins it below,
// except for a backfilled change), and `interfaces` is exempt: never collected and never named in a diagnostic.
const CORE_ARTIFACTS = ['proposal', 'specs', 'design', 'tasks'];
const AUDIT_FILES = ['review', 'security', 'performance', 'accessibility'];

/** A refusal: the plan stops, nothing was written, and `summary` is printed verbatim. */
class Refusal extends Error {
  constructor(reason, summary, details = {}) {
    super(summary);
    this.reason = reason;
    this.details = details;
  }
}

// ---------------------------------------------------------------------------
// .openspec.yaml: a minimal reader for the flat and two-level shapes SAI writes.
// ---------------------------------------------------------------------------

function parseScalar(raw, line) {
  const text = raw.trim();
  if (/^["']/.test(text)) {
    const quote = text[0];
    let value = '';
    let i = 1;
    for (; i < text.length; i++) {
      const char = text[i];
      if (quote === '"' && char === '\\' && i + 1 < text.length) { value += text[++i]; continue; }
      if (quote === "'" && char === "'" && text[i + 1] === "'") { value += "'"; i++; continue; }
      if (char === quote) break;
      value += char;
    }
    if (i >= text.length) throw new ToolError(`line ${line}: unterminated quoted value`);
    const rest = text.slice(i + 1).trim();
    if (rest && !rest.startsWith('#')) throw new ToolError(`line ${line}: unexpected text after a quoted value`);
    return value;
  }
  const plain = text.replace(/\s+#.*$/, '');
  if (!plain) return null;
  if (/^[&*!|>{}%@`]/.test(plain) || /^-(\s|$)/.test(plain) || /:(\s|$)/.test(plain)) {
    throw new ToolError(`line ${line}: unsupported value shape`);
  }
  if (plain.startsWith('[')) {
    if (!plain.endsWith(']')) throw new ToolError(`line ${line}: unsupported flow list`);
    const inner = plain.slice(1, -1).trim();
    if (!inner) return [];
    return inner.split(',').map((part) => {
      const item = part.trim();
      if (!item || /^[[\]{}&*!|>]/.test(item)) throw new ToolError(`line ${line}: unsupported flow list item`);
      return item.replace(/^["']|["']$/g, '');
    });
  }
  if (/^(true|True|TRUE)$/.test(plain)) return true;
  if (/^(false|False|FALSE)$/.test(plain)) return false;
  if (/^(null|Null|NULL|~)$/.test(plain)) return null;
  if (/^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/.test(plain)) return Number(plain);
  return plain;
}

/**
 * Parse `.openspec.yaml` text into nested plain objects. Recognized: comments,
 * `key: scalar`, `key: [flow, list]`, and `key:` followed by a deeper indented
 * mapping. Anything else (tabs, block lists, block scalars, anchors, document
 * markers, duplicate keys) is refused: the tool never guesses.
 */
function parseMetadata(text) {
  const root = Object.create(null);
  const stack = [{ indent: 0, map: root }];
  let pending = null; // { key, indent, map } awaiting its mapping body
  const lines = text.replace(/^﻿/, '').split('\n');
  for (let index = 0; index < lines.length; index++) {
    const number = index + 1;
    const rawLine = lines[index].replace(/\r$/, '');
    if (!rawLine.trim() || /^\s*#/.test(rawLine)) continue;
    if (/^ *\t/.test(rawLine)) throw new ToolError(`line ${number}: a tab in the indentation`);
    const indent = rawLine.match(/^ */)[0].length;
    const body = rawLine.slice(indent);
    const match = body.match(/^([A-Za-z0-9_.-]+):(?:[ ](.*)|)$/);
    if (!match) throw new ToolError(`line ${number}: not a plain "key: value" line`);
    const [, key, rest = ''] = match;
    if (pending && indent > pending.indent) {
      const child = Object.create(null);
      pending.map[pending.key] = child;
      stack.push({ indent, map: child });
    }
    pending = null;
    while (stack.length > 1 && indent < stack[stack.length - 1].indent) stack.pop();
    const frame = stack[stack.length - 1];
    if (indent !== frame.indent) throw new ToolError(`line ${number}: inconsistent indentation`);
    if (key in frame.map) throw new ToolError(`line ${number}: duplicate key "${key}"`);
    if (rest.trim() === '' || /^\s*#/.test(rest)) {
      frame.map[key] = null;
      pending = { key, indent, map: frame.map };
    } else {
      frame.map[key] = parseScalar(rest, number);
    }
  }
  return root;
}

/** The value at a nested path, or its dotted spelling at the top level, or undefined. */
function metaGet(meta, keys) {
  if (!meta) return undefined;
  let current = meta;
  for (const key of keys) {
    if (current === null || typeof current !== 'object' || Array.isArray(current) || !(key in current)) {
      current = undefined;
      break;
    }
    current = current[key];
  }
  if (current !== undefined) return current;
  const dotted = keys.join('.');
  return dotted in meta ? meta[dotted] : undefined;
}

// ---------------------------------------------------------------------------
// git
// ---------------------------------------------------------------------------

function git(args, cwd) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (result.error) throw new ToolError(`git could not run: ${result.error.message}`);
  return result;
}

/** tracked: `git ls-files --error-unmatch` exit 0; untracked: exit 1; anything else is an error. */
function isTracked(cwd, target) {
  const result = git(['ls-files', '--error-unmatch', '--', target], cwd);
  if (result.status === 0) return true;
  if (result.status === 1) return false;
  throw new ToolError(`git ls-files failed for ${target}: ${(result.stderr || '').trim() || `exit ${result.status}`}`);
}

/** ignored: `git check-ignore --quiet` exit 0; not ignored: exit 1; anything else is an error. */
function isIgnored(cwd, target) {
  const result = git(['check-ignore', '--quiet', '--', target], cwd);
  if (result.status === 0) return true;
  if (result.status === 1) return false;
  throw new ToolError(`git check-ignore failed for ${target}: ${(result.stderr || '').trim() || `exit ${result.status}`}`);
}

function stagedDeletions(cwd) {
  const result = git(['diff', '--cached', '--name-status', '-z', '--no-renames'], cwd);
  if (result.status !== 0) {
    throw new ToolError(`git diff --cached failed: ${(result.stderr || '').trim() || `exit ${result.status}`}`);
  }
  const fields = result.stdout.split('\0');
  const deleted = new Set();
  for (let i = 0; i + 1 < fields.length; i += 2) if (fields[i] === 'D') deleted.add(fields[i + 1]);
  return deleted;
}

// ---------------------------------------------------------------------------
// file system helpers
// ---------------------------------------------------------------------------

function exists(target) {
  try { fs.lstatSync(target); return true; } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw new ToolError(`cannot read ${target}: ${error.message}`);
  }
}

/** Every file below `dir`, as sorted posix paths relative to it. Symbolic links count as files. */
function walkFiles(dir) {
  const out = [];
  const walk = (current, prefix) => {
    let entries;
    try { entries = fs.readdirSync(current, { withFileTypes: true }); } catch (error) {
      if (error.code === 'ENOENT') return;
      throw new ToolError(`cannot read ${current}: ${error.message}`);
    }
    for (const entry of entries) {
      const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(path.join(current, entry.name), relative);
      else out.push(relative);
    }
  };
  walk(dir, '');
  return out.sort();
}

/** Capability ids (`area/capability` for a nested layout) that hold a `spec.md`, as the CLI discovers them. */
function discoverCapabilities(specsDir) {
  const ids = [];
  const walk = (dir, segments) => {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (error) {
      if (error.code === 'ENOENT') return;
      throw new ToolError(`cannot read ${dir}: ${error.message}`);
    }
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      if (entry.isDirectory()) walk(path.join(dir, entry.name), [...segments, entry.name]);
      else if (entry.name === 'spec.md' && segments.length > 0 && (entry.isFile() || entry.isSymbolicLink())) {
        ids.push(segments.join('/'));
      }
    }
  };
  walk(specsDir, []);
  return ids.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function readText(file) {
  return new TextDecoder('utf-8', { fatal: true }).decode(fs.readFileSync(file));
}

function readLines(file) {
  return readText(file).split('\n').map((line) => line.replace(/\r$/, '').trim()).filter(Boolean);
}

// ---------------------------------------------------------------------------
// delta specs and main specs
// ---------------------------------------------------------------------------

const REQUIREMENT_RE = /^###\s*Requirement:\s*(.+)\s*$/i;

/** The requirement names of a delta spec, per section, as the OpenSpec CLI reads them. */
function parseDelta(content) {
  const delta = { added: [], modified: [], removed: [], renamed: [] };
  let section = null;
  let from = null;
  for (const raw of structuralLines(content)) {
    const line = raw.replace(/\r$/, '');
    const heading = line.match(/^##\s+(.+?)\s*$/);
    if (heading) {
      const known = heading[1].match(/^(ADDED|MODIFIED|REMOVED|RENAMED)\s+Requirements$/i);
      section = known ? known[1].toLowerCase() : null;
      from = null;
      continue;
    }
    if (!section) continue;
    if (section === 'added' || section === 'modified') {
      const match = line.match(REQUIREMENT_RE);
      if (match) delta[section].push(match[1].trim());
    } else if (section === 'removed') {
      const match = line.match(REQUIREMENT_RE) || line.match(/^\s*[-*+]\s*`?###\s*Requirement:\s*(.+?)`?\s*$/);
      if (match) delta.removed.push(match[1].trim());
    } else {
      const fromMatch = line.match(/^\s*[-*+]?\s*FROM:\s*`?###\s*Requirement:\s*(.+?)`?\s*$/);
      const toMatch = line.match(/^\s*[-*+]?\s*TO:\s*`?###\s*Requirement:\s*(.+?)`?\s*$/);
      if (fromMatch) from = fromMatch[1].trim();
      else if (toMatch && from) { delta.renamed.push({ from, to: toMatch[1].trim() }); from = null; }
    }
  }
  return delta;
}

/** The requirement names and the `##` headings of a published main spec. */
function parseMainSpec(content) {
  const requirements = [];
  const headings = [];
  for (const raw of structuralLines(content)) {
    const line = raw.replace(/\r$/, '');
    const name = extractRequirementName(line);
    if (name !== null) requirements.push(name.trim());
    const heading = line.match(/^ {0,3}##\s+(.+?)\s*$/);
    if (heading) headings.push(heading[1].trim());
  }
  return { requirements, headings };
}

/** Whether applying the delta to the main requirements leaves none, with something removed. */
function emptiesCapability(mainRequirements, delta) {
  const current = new Set(mainRequirements);
  for (const { from, to } of delta.renamed) if (current.delete(from)) current.add(to);
  let removed = 0;
  for (const name of delta.removed) if (current.delete(name)) removed += 1;
  for (const name of delta.added) current.add(name);
  return removed > 0 && current.size === 0;
}

// ---------------------------------------------------------------------------
// the origin closing line
// ---------------------------------------------------------------------------

/** The `Closes owner/repo#N` line of a canonical issue URL, from its shape alone, or a reason it has none. */
function closingLineOf(origin) {
  let identity;
  try { identity = require('./backlog-slice-identity.js'); } catch (error) {
    return { line: null, status: 'unverifiable', warning: `the origin reader is unavailable: ${error.message}` };
  }
  let platform;
  let canonical;
  try {
    platform = identity.platformFor(origin);
    canonical = identity.normalize(origin, platform);
  } catch (error) {
    return { line: null, status: 'unverifiable', warning: `backlog_origin ${origin} is not a canonical issue URL` };
  }
  if (canonical !== origin) {
    return { line: null, status: 'unverifiable', warning: `backlog_origin ${origin} is not the canonical form ${canonical}` };
  }
  if (platform === 'azuredevops') return { line: null, status: 'unsupported-provider', warning: null };
  const match = platform === 'github'
    ? canonical.match(/^https:\/\/github\.com\/([^/]+\/[^/]+)\/issues\/(\d+)$/)
    : canonical.match(/^https?:\/\/[^/]+\/(.+?)\/-\/(?:issues|work_items)\/(\d+)$/);
  if (!match) return { line: null, status: 'unverifiable', warning: `backlog_origin ${origin} has no issue shape` };
  return { line: `Closes ${match[1]}#${match[2]}`, status: 'known', warning: null };
}

// ---------------------------------------------------------------------------
// the plan
// ---------------------------------------------------------------------------

function normalizePath(value) {
  const cleaned = value.replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/+$/, '');
  if (!cleaned || path.posix.isAbsolute(cleaned) || cleaned.split('/').includes('..')) {
    throw new ToolError(`implementer path outside the repository: ${value}`);
  }
  return cleaned;
}

function runHeaderCheck(root, change) {
  const result = spawnSync(process.execPath, [path.join(__dirname, 'check-delta-headers.js'), change, '--json', '--root', root], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error) throw new ToolError(`check-delta-headers.js could not run: ${result.error.message}`);
  if (result.status === 2) {
    throw new Refusal(
      'comparison-incomplete',
      `[sai-archive] delta comparison could not complete: ${(result.stderr || '').trim().split('\n')[0] || 'unreadable delta or main spec'}. Archive blocked; nothing was written.`,
    );
  }
  try { return JSON.parse(result.stdout); } catch (error) {
    throw new ToolError(`check-delta-headers.js printed no JSON: ${error.message}`);
  }
}

function computePlan(root, change, options) {
  if (!NAME_RE.test(change) || change === 'archive') throw new ToolError(`invalid change name: ${change}`);
  const changeRel = `openspec/changes/${change}`;
  const changeDir = path.join(root, changeRel);
  const draftsDir = options.draftsDir ? path.resolve(options.draftsDir) : null;
  if (draftsDir && !fs.existsSync(draftsDir)) throw new ToolError(`drafts directory not found: ${draftsDir}`);
  if (!draftsDir && !exists(changeDir)) {
    throw new Refusal('change-not-found', `[sai-archive] change '${change}' not found in openspec/changes/. Archive blocked; nothing was written.`);
  }

  // A draft stands in for the change file of the same name; everything else reads from the change directory.
  const source = (name) => {
    if (draftsDir && exists(path.join(draftsDir, name))) return path.join(draftsDir, name);
    return path.join(changeDir, name);
  };

  // Metadata (E10: a file the tool cannot read is refused, never guessed).
  const metaFile = source('.openspec.yaml');
  let meta = null;
  if (exists(metaFile)) {
    try { meta = parseMetadata(fs.readFileSync(metaFile, 'utf8')); } catch (error) {
      const reason = error instanceof ToolError ? error.message : `unreadable: ${error.message}`;
      throw new Refusal(
        'metadata-unreadable',
        `[sai-archive] ${changeRel}/.openspec.yaml cannot be read (${reason}). Archive blocked; nothing was written. Way forward: fix the file to plain "key: value" lines.`,
        { file: `${changeRel}/.openspec.yaml`, cause: reason },
      );
    }
  }
  const backfilled = metaGet(meta, ['backfilled']) === true;
  const skipSpecs = metaGet(meta, ['skip_specs']) === true;
  const schema = typeof metaGet(meta, ['schema']) === 'string' ? metaGet(meta, ['schema']) : null;

  // CORE gate.
  const specsDir = path.join(changeDir, 'specs');
  const hasSpecFile = walkFiles(specsDir).some((file) => file.endsWith('.md') && !file.split('/').some((part) => part.startsWith('.')));
  const present = {
    proposal: exists(source('proposal.md')),
    specs: hasSpecFile,
    design: exists(path.join(changeDir, 'design.md')),
    tasks: exists(path.join(changeDir, 'tasks.md')),
  };
  const coreChecked = CORE_ARTIFACTS.filter((id) => !(backfilled && (id === 'design' || id === 'tasks')) && !(id === 'specs' && skipSpecs));
  const coreMissing = coreChecked.filter((id) => !present[id]);
  if (coreMissing.length) {
    throw new Refusal('core-missing', `Missing CORE artifact(s): ${coreMissing.join(', ')}. Archive blocked.`, { missing: coreMissing });
  }

  // AUDIT (informational).
  const auditMissing = AUDIT_FILES.filter((id) => !exists(path.join(changeDir, `${id}.md`)));
  if (!backfilled) {
    const state = metaGet(meta, ['overview', 'state']);
    const overviewState = typeof state === 'string' && state ? state : 'unmaterialized';
    if (!(exists(path.join(changeDir, 'change-overview.md')) && overviewState === 'current')) auditMissing.push('change-overview');
  }
  const auditLine = auditMissing.length ? `[sai-archive] informational: missing AUDIT artifact(s): ${auditMissing.join(', ')}` : null;

  // Delta specs, the delta-sync summary, and the retirement.
  const warnings = [];
  const capabilities = discoverCapabilities(specsDir);
  const mainSpecRel = (id) => `openspec/specs/${id}/spec.md`;
  const sync = [];
  const retired = [];
  const blocked = [];
  for (const id of capabilities) {
    const mainFile = path.join(root, mainSpecRel(id));
    const hasMain = exists(mainFile);
    let status = hasMain ? 'update' : 'add';
    if (hasMain) {
      let main;
      let delta;
      try {
        main = parseMainSpec(readText(mainFile));
        delta = parseDelta(readText(path.join(specsDir, ...id.split('/'), 'spec.md')));
      } catch (error) {
        throw new Refusal('comparison-incomplete', `[sai-archive] the spec of '${id}' cannot be interpreted: ${error.message}. Archive blocked; nothing was written.`);
      }
      if (emptiesCapability(main.requirements, delta)) {
        status = 'retire';
        retired.push(id);
        const extra = main.headings.filter((heading) => !/^(purpose|requirements)$/i.test(heading));
        if (extra.length) blocked.push({ capability: id, headings: extra });
      }
    }
    sync.push({ capability: id, status, main_spec: mainSpecRel(id) });
  }

  let declaration = 'none';
  if (retired.length) {
    const metaPath = `${changeRel}/.openspec.yaml`;
    const marker = metaGet(meta, ['retire_capabilities']);
    const refuse = (reason, text) => {
      throw new Refusal(reason, `[sai-archive] retirement refused: ${text} Nothing was written and no archive ran.`, { retired_capabilities: retired });
    };
    if (!meta) refuse('retire-metadata', `${metaPath} is missing, and archive never creates it. Way forward: add the file with its \`schema:\` key, then rerun archive.`);
    if (typeof schema !== 'string' || !schema) refuse('retire-metadata', `${metaPath} has no \`schema:\` key, and archive never authors it. Way forward: restore the key, then rerun archive.`);
    if (marker === false) {
      refuse('retire-veto', `${metaPath} sets \`retire_capabilities: false\`, which vetoes the retirement of ${retired.join(', ')}. Way forward: remove the \`retire_capabilities: false\` entry, or reshape the delta so it does not empty the capability.`);
    }
    if (marker !== undefined && marker !== true) {
      refuse('retire-unhonoured', `${metaPath} key \`retire_capabilities\` holds ${JSON.stringify(marker)}, which is not a boolean, and archive never guesses which boolean it meant. Way forward: set it to \`true\` to declare, to \`false\` to veto, or remove it.`);
    }
    if (blocked.length) {
      const named = blocked.map((item) => `${item.capability} (${item.headings.map((heading) => `"## ${heading}"`).join(', ')})`).join('; ');
      refuse('retire-unaccounted-content', `the published spec of ${named} has a \`##\` section other than \`## Purpose\` and \`## Requirements\`, and the CLI cannot attribute it. Way forward: move that content out of the spec, then rerun archive.`);
    }
    declaration = marker === true ? 'present' : 'write';
  }

  // E5: a MODIFIED requirement that drops an existing scenario is refused before the CLI.
  if (capabilities.length) {
    const check = runHeaderCheck(root, change);
    const dropped = check.violations.filter((item) => item.problem === 'MODIFIED_SCENARIO_MISSING');
    if (dropped.length) {
      const named = dropped.map((item) => `${item.capability} / ${item.name} / ${item.scenario}`).join('; ');
      throw new Refusal(
        'scenario-dropped',
        `[sai-archive] a MODIFIED requirement drops an existing scenario (${named}). Archive blocked; nothing was written. Way forward: keep every existing scenario in MODIFIED, or use REMOVED for the old requirement and ADDED for a distinct replacement.`,
        { violations: dropped },
      );
    }
    for (const item of check.violations) {
      warnings.push(`[sai-archive] warning: delta header ${item.capability} ${item.section} '${item.name}' [${item.problem}]; the CLI archive may refuse it`);
    }
  }

  // Destination and collision (E2).
  const archiveName = DATE_PREFIX_RE.test(change) ? change : `${localDate()}-${change}`;
  const archiveDestination = `openspec/changes/archive/${archiveName}`;
  if (exists(path.join(root, archiveDestination))) {
    throw new Refusal(
      'collision',
      `[sai-archive] ${archiveDestination}/ already exists. Archive blocked; nothing was written.`,
      { archive_destination: archiveDestination },
    );
  }

  // Origin and closing line.
  const origin = metaGet(meta, ['backlog_origin']);
  let closing = { line: null, status: 'absent', warning: null };
  if (typeof origin === 'string' && origin) closing = closingLineOf(origin);
  else if (origin !== undefined && origin !== null) closing = { line: null, status: 'unverifiable', warning: 'backlog_origin is not a URL' };
  if (closing.warning) warnings.push(`[sai-archive] warning: ${closing.warning}; ${change} gets no closing line`);

  // Owned paths, classified against git as the archive and the commit will find them.
  const owned = [];
  const covering = [archiveDestination, changeRel];
  const ignoredPaths = [];
  const absentPaths = [];
  const deletions = [];
  const add = (list, value) => { if (!list.includes(value)) list.push(value); };
  const alreadyStaged = stagedDeletions(root);

  // The change's own files move to the archive: the archived copies are new paths, the old tracked ones are deletions.
  const changeFiles = new Set(walkFiles(changeDir));
  if (draftsDir) for (const name of ['.openspec.yaml', 'proposal.md']) if (exists(path.join(draftsDir, name))) changeFiles.add(name);
  const archivedFiles = [...changeFiles].sort().map((file) => `${archiveDestination}/${file}`);
  const classifyArchived = (target) => {
    if (isIgnored(root, target)) add(ignoredPaths, target);
    else add(owned, target);
  };
  const ls = git(['ls-files', '-z', '--', changeRel], root);
  if (ls.status !== 0) throw new ToolError(`git ls-files failed: ${(ls.stderr || '').trim() || `exit ${ls.status}`}`);
  const trackedOld = ls.stdout.split('\0').filter(Boolean).sort();
  for (const target of archivedFiles) classifyArchived(target);
  for (const target of trackedOld) add(owned, target);

  // Main specs the archive writes, creates, or deletes.
  const affectedMainSpecs = capabilities.map(mainSpecRel);
  for (const item of sync) {
    const target = item.main_spec;
    const tracked = isTracked(root, target);
    if (item.status === 'retire') {
      if (tracked) add(owned, target);
      else add(absentPaths, target);
    } else if (tracked) add(owned, target);
    else if (isIgnored(root, target)) add(ignoredPaths, target);
    else add(owned, target);
  }

  // The implementer path set (Direct Build).
  const implementerPaths = [
    ...(options.implementerPathsFile ? readLines(options.implementerPathsFile) : []),
    ...options.implementerPaths,
  ].map(normalizePath);
  for (const target of [...new Set(implementerPaths)]) {
    add(covering, target);
    const insideChange = target === changeRel || target.startsWith(`${changeRel}/`);
    // A deletion already staged leaves the index, so `git add` of the path fails: it stays staged and is not added again.
    if (alreadyStaged.has(target)) { add(deletions, target); continue; }
    const tracked = isTracked(root, target);
    if (insideChange) {
      if (tracked) add(owned, target);
      continue;
    }
    if (tracked) {
      add(owned, target);
    } else if (!exists(path.join(root, target))) {
      add(absentPaths, target);
    } else if (isIgnored(root, target)) {
      add(ignoredPaths, target);
    } else {
      add(owned, target);
    }
  }
  for (const target of affectedMainSpecs) add(covering, target);

  // What the commit message needs from the tool.
  const retirementLines = retired.map((id) => `Retired capability: ${id}`);
  const report = [
    `[sai-archive] change: ${change}`,
    `[sai-archive] schema: ${schema || 'unknown'}`,
    `[sai-archive] backfilled=${backfilled}`,
  ];
  if (auditLine) report.push(auditLine);
  report.push(`[sai-archive] collision: none (${archiveDestination}/ is free)`);
  if (skipSpecs) report.push('[sai-archive] delta-sync: skip_specs is declared, so no delta syncs');
  else if (!sync.length) report.push('[sai-archive] delta-sync: no delta spec to sync');
  for (const item of sync) {
    const tag = item.status === 'add' ? '[ADD]' : item.status === 'retire' ? '[RETIRE]' : '[UPDATE]';
    report.push(`${tag} ${item.capability}`);
  }
  if (retired.length) report.push(`[sai-archive] retiring capabilit${retired.length === 1 ? 'y' : 'ies'}: ${retired.join(', ')}`);
  for (const target of ignoredPaths) report.push(`[sai-archive] warning: omitted ignored untracked path: ${target}`);
  report.push(...warnings);

  // The covering list of the slice-path-scope check: the moved directories and every other path the commit owns or omits.
  const inside = (target) => [archiveDestination, changeRel].some((dir) => target === dir || target.startsWith(`${dir}/`));
  const coveringPaths = [...new Set([...covering, ...owned, ...deletions, ...ignoredPaths, ...absentPaths].filter((target) => target === archiveDestination || target === changeRel || !inside(target)))];

  const stable = {
    change,
    archive_destination: archiveDestination,
    retired_capabilities: retired,
    retirement_declaration: declaration,
    affected_main_specs: affectedMainSpecs,
    owned_staging_paths: owned,
    already_staged_deletions: deletions,
    omitted_ignored_paths: ignoredPaths,
    omitted_absent_paths: absentPaths,
    closing_line: closing.line,
    commit_body_lines: retirementLines,
  };
  const fingerprint = crypto.createHash('sha256').update(JSON.stringify(stable)).digest('hex');

  return {
    ok: true,
    refused: false,
    change,
    schema,
    backfilled,
    skip_specs: skipSpecs,
    core: { verdict: 'pass', checked: coreChecked, skipped: CORE_ARTIFACTS.filter((id) => !coreChecked.includes(id)) },
    audit: { missing: auditMissing, line: auditLine },
    delta_sync: sync,
    retired_capabilities: retired,
    retirement: { declaration, write: declaration === 'write', file: `${changeRel}/.openspec.yaml` },
    archive_destination: archiveDestination,
    collision: { exists: false, path: archiveDestination },
    affected_main_specs: affectedMainSpecs,
    owned_staging_paths: owned,
    already_staged_deletions: deletions,
    omitted_ignored_paths: ignoredPaths,
    omitted_absent_paths: absentPaths,
    covering_paths: coveringPaths,
    origin: { backlog_origin: typeof origin === 'string' ? origin : null, status: closing.status },
    closing_line: closing.line,
    commit_body_lines: retirementLines,
    commit_count: 1,
    warnings,
    report_lines: report,
    plan_fingerprint: fingerprint,
  };
}

// ---------------------------------------------------------------------------
// command line
// ---------------------------------------------------------------------------

function usage() {
  return [
    'Usage: node sai/tools/archive-plan.js plan <change-name> [--json] [--cwd <root>]',
    '         [--implementer-paths-file <path>] [--implementer-path <path>]... [--drafts-dir <dir>]',
    '',
    '  plan                       Print the read-only archive plan of the change as JSON.',
    '  --cwd <root>               Project root (default: the working directory).',
    '  --implementer-paths-file   One repository-relative path per line (Direct Build).',
    '  --implementer-path         One such path as an argument; repeatable.',
    '  --drafts-dir               Transfer directory with the draft .openspec.yaml and proposal.md.',
    '',
    'Exit codes: 0 plan; 1 plan refused (reason and summary on stdout); 2 usage or tooling error.',
  ].join('\n');
}

function parseArgs(argv) {
  const options = { command: null, change: null, cwd: process.cwd(), implementerPathsFile: null, implementerPaths: [], draftsDir: null, help: false };
  const valued = { '--cwd': 'cwd', '--implementer-paths-file': 'implementerPathsFile', '--drafts-dir': 'draftsDir' };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') options.help = true;
    else if (arg === '--json') continue;
    else if (arg === '--implementer-path') {
      const value = argv[++i];
      if (!value || value.startsWith('--')) throw new ToolError(`value required for ${arg}`);
      options.implementerPaths.push(value);
    } else if (valued[arg]) {
      const value = argv[++i];
      if (!value || value.startsWith('--')) throw new ToolError(`value required for ${arg}`);
      options[valued[arg]] = value;
    } else if (arg.startsWith('--')) throw new ToolError(`unknown flag: ${arg}`);
    else if (!options.command) options.command = arg;
    else if (!options.change) options.change = arg;
    else throw new ToolError(`unexpected positional argument: ${arg}`);
  }
  return options;
}

function main(argv, stdout = process.stdout) {
  const print = (payload) => stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  try {
    const options = parseArgs(argv);
    if (options.help) { stdout.write(`${usage()}\n`); return 0; }
    if (options.command !== 'plan') throw new ToolError('expected the command: plan <change-name>');
    if (!options.change) throw new ToolError('change name required');
    const root = path.resolve(options.cwd);
    try {
      print(computePlan(root, options.change, options));
      return 0;
    } catch (error) {
      if (!(error instanceof Refusal)) throw error;
      print({ ok: false, refused: true, change: options.change, reason: error.reason, summary: error.message, ...error.details });
      return 1;
    }
  } catch (error) {
    print({ ok: false, error: error.message });
    return 2;
  }
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));

module.exports = { computePlan, parseMetadata, parseDelta, emptiesCapability, closingLineOf, main };
