#!/usr/bin/env node

'use strict';

/**
 * check-delta-headers — requirement headers and MODIFIED scenario preservation.
 *
 * Decides every delta requirement header by verbatim existence, never by
 * inference: a requirement belongs under `## ADDED Requirements` if and only
 * if its exact `### Requirement:` heading is absent from the matching main
 * spec `openspec/specs/<capability>/spec.md`; it belongs under `## MODIFIED`
 * or `## REMOVED Requirements` only when that exact heading is present.
 * File-direct check with the same semantics as
 * `openspec show <change> --deltas-only --json` plus a verbatim header set
 * diff against the main specs, so it also works pre-write on staged draft
 * content that the CLI cannot see yet.
 *
 * Edge cases (fix-backfill-delta-headers):
 * - E1: capability without a main spec — every requirement must be ADDED.
 * - E2: ADDED heading already present verbatim in the main spec — fail.
 * - E3: REMOVED heading with no verbatim match in the main spec — fail
 *   (MODIFIED with no match fails the same way).
 * - E4: mixed files are validated per requirement, not per file — ADDED for
 *   new headings and MODIFIED for existing ones may coexist.
 * - E5: the match is verbatim — case, internal spacing, and punctuation are
 *   significant. Only the single conventional space separating the
 *   `### Requirement:` marker from the name and trailing line whitespace are
 *   not significant.
 * - RENAMED sections are out of scope and skipped; requirements outside the
 *   ADDED/MODIFIED/REMOVED sections are left to schema validation.
 *
 * Usage:
 *   node sai/tools/check-delta-headers.js <change-name> [--json]
 *     [--root <dir>] [--delta-dir <dir>] [--specs-dir <dir>]
 *
 * Exit codes: 0 = headers and scenario preservation pass; 1 = violations
 * found (report on stdout); 2 = usage, I/O, or incomplete comparison.
 */

const fs = require('fs');
const path = require('path');
const usageKit = require('./usage');
const {
  SECTION_RE,
  ANY_H2_RE,
  structuralLines,
  extractRequirementName,
  collectScenarioRequirements,
  readSpec,
} = require('./spec-scenarios.js');

/**
 * Collect {name, section, line} for every requirement under an
 * ADDED/MODIFIED/REMOVED section of a delta spec.
 */
function collectDeltaRequirements(content) {
  const out = [];
  const lines = structuralLines(content);
  let section = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].replace(/\r$/, '');
    const sectionMatch = line.match(SECTION_RE);
    if (sectionMatch) {
      section = sectionMatch[1];
      continue;
    }
    if (ANY_H2_RE.test(line)) {
      section = null;
      continue;
    }
    if (section === 'ADDED' || section === 'MODIFIED' || section === 'REMOVED') {
      const name = extractRequirementName(line);
      if (name !== null) out.push({ name, section, line: i + 1 });
    }
  }
  return out;
}

/** Collect the verbatim set of every `### Requirement:` heading in a file. */
function collectMainHeaders(content) {
  const out = new Set();
  for (const raw of structuralLines(content)) {
    const name = extractRequirementName(raw.replace(/\r$/, ''));
    if (name !== null) out.add(name);
  }
  return out;
}

const USAGE = {
  general: {
    usage: ['node sai/tools/check-delta-headers.js <change-name> [--json] [--root <dir>] [--delta-dir <dir>] [--specs-dir <dir>]'],
    examples: [
      'node sai/tools/check-delta-headers.js my-change --json',
      'node sai/tools/check-delta-headers.js my-change --delta-dir /tmp/drafts/specs --specs-dir openspec/specs',
    ],
    notes: [
      '--root is the project root (default: the working directory). --delta-dir is the delta specs root holding <capability>/spec.md files',
      '(default: <root>/openspec/changes/<name>/specs; use an OS-temp staging copy for pre-write draft checks); --specs-dir is the main specs root (default: <root>/openspec/specs).',
    ],
    flags: { '--json': false, '--root': true, '--delta-dir': true, '--specs-dir': true },
    positionals: { min: 1, max: 1, names: ['change-name'] },
  },
};

function usage() {
  return usageKit.render(USAGE);
}

function parseArgs(argv) {
  const opts = { name: null, json: false, root: null, deltaDir: null, specsDir: null, help: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--json') opts.json = true;
    else if (arg === '--help' || arg === '-h') opts.help = true;
    else if (arg === '--root') opts.root = argv[++i];
    else if (arg === '--delta-dir') opts.deltaDir = argv[++i];
    else if (arg === '--specs-dir') opts.specsDir = argv[++i];
    else if (arg.startsWith('--')) {
      return { error: `unknown flag: ${arg}` };
    } else if (opts.name === null) opts.name = arg;
    else return { error: `unexpected positional argument: ${arg}` };
  }
  for (const flag of ['--root', '--delta-dir', '--specs-dir']) {
    const index = argv.indexOf(flag);
    if (index !== -1 && (!argv[index + 1] || argv[index + 1].startsWith('--'))) {
      return { error: `value required for ${flag}` };
    }
  }
  return { opts };
}

function main(argv) {
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
  if (!opts.name) {
    process.stderr.write(`change name required.\n${usage()}\n`);
    return 2;
  }

  const root = opts.root ? path.resolve(opts.root) : process.cwd();
  const deltaDir = opts.deltaDir
    ? path.resolve(opts.deltaDir)
    : path.join(root, 'openspec', 'changes', opts.name, 'specs');
  const specsDir = opts.specsDir
    ? path.resolve(opts.specsDir)
    : path.join(root, 'openspec', 'specs');

  let entries;
  try {
    entries = fs.readdirSync(deltaDir, { withFileTypes: true });
  } catch (err) {
    process.stderr.write(`delta specs directory not found: ${deltaDir}\n`);
    return 2;
  }

  let specsDirPresent = true;
  try {
    fs.readdirSync(specsDir);
  } catch (err) {
    if (err.code !== 'ENOENT') {
      process.stderr.write(`cannot read main specs directory: ${specsDir}: ${err.message}\n`);
      return 2;
    }
    specsDirPresent = false;
    process.stderr.write(`warning: main specs directory not found: ${specsDir} — treating every capability as new (E1).\n`);
  }

  const violations = [];
  let checkedRequirements = 0;
  let capabilities = 0;

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const deltaFile = path.join(deltaDir, entry.name, 'spec.md');
    if (!fs.existsSync(deltaFile)) continue;
    capabilities += 1;

    let requirements;
    let deltaRequirements;
    try {
      const deltaContent = readSpec(deltaFile);
      requirements = collectDeltaRequirements(deltaContent);
      deltaRequirements = collectScenarioRequirements(deltaContent);
    } catch (err) {
      process.stderr.write(`cannot read or interpret delta spec: ${deltaFile}: ${err.message}\n`);
      return 2;
    }
    checkedRequirements += requirements.length;

    const mainFile = path.join(specsDir, entry.name, 'spec.md');
    let mainHeaders = null;
    let mainRequirements = null;
    if (specsDirPresent) {
      try {
        const content = readSpec(mainFile);
        mainHeaders = collectMainHeaders(content);
        mainRequirements = collectScenarioRequirements(content);
      } catch (err) {
        if (err.code === 'ENOENT') { mainHeaders = null; }
        else {
          process.stderr.write(`cannot read main spec: ${mainFile}\n`);
          return 2;
        }
      }
    }

    for (const req of requirements) {
      const present = mainHeaders !== null && mainHeaders.has(req.name);
      let problem = null;
      let detail = null;
      if (mainHeaders === null) {
        if (req.section === 'MODIFIED') {
          problem = 'MODIFIED_WITHOUT_MAIN_SPEC';
          detail = 'capability has no main spec, so every requirement must go under ADDED (E1)';
        } else if (req.section === 'REMOVED') {
          problem = 'REMOVED_WITHOUT_MAIN_SPEC';
          detail = 'capability has no main spec, so every requirement must go under ADDED (E1)';
        }
      } else if (req.section === 'ADDED' && present) {
        problem = 'ADDED_DUPLICATE';
        detail = 'heading already exists verbatim in the main spec, so it cannot be ADDED (E2)';
      } else if (req.section === 'MODIFIED' && !present) {
        problem = 'MODIFIED_MISSING';
        detail = 'heading has no verbatim match in the main spec, so it cannot be MODIFIED';
      } else if (req.section === 'REMOVED' && !present) {
        problem = 'REMOVED_MISSING';
        detail = 'heading has no verbatim match in the main spec, so it cannot be REMOVED (E3)';
      }
      if (problem) {
        violations.push({
          capability: entry.name,
          file: path.relative(root, deltaFile),
          line: req.line,
          section: req.section,
          name: req.name,
          mainSpec: mainHeaders === null ? null : path.relative(root, mainFile),
          problem,
          detail,
        });
      } else if (req.section === 'MODIFIED') {
        const original = mainRequirements.get(req.name);
        const draft = deltaRequirements.get(req.name);
        if (!original || !draft || original.invalid || draft.invalid ||
            original.scenarios.size === 0 || draft.scenarios.size === 0) {
          process.stderr.write(`scenario comparison could not complete: ${entry.name} / ${req.name}: ambiguous or malformed requirement/scenario headings, or no scenarios\n`);
          return 2;
        }
        for (const originalName of original.scenarios) {
          if (draft.scenarios.has(originalName)) continue;
          violations.push({ capability: entry.name, file: path.relative(root, deltaFile),
            line: req.line, section: req.section, name: req.name,
            mainSpec: path.relative(root, mainFile), problem: 'MODIFIED_SCENARIO_MISSING',
            scenario: originalName,
            detail: `existing scenario '${originalName}' must be preserved in MODIFIED; intentional removal or renaming needs an explicitly named distinct replacement requirement` });
        }
      }
    }
  }

  const ok = violations.length === 0;
  if (opts.json) {
    process.stdout.write(`${JSON.stringify({
      ok,
      change: opts.name,
      capabilities,
      checkedRequirements,
      violations,
    }, null, 2)}\n`);
  } else if (ok) {
    process.stdout.write(
      `delta-header check passed for change '${opts.name}': ${checkedRequirements} requirement(s) across ${capabilities} capabilit(ies), no misclassified headers or scenario losses.\n`,
    );
  } else {
    for (const v of violations) {
      const mainRef = v.mainSpec == null ? 'no main spec' : `main: ${v.mainSpec}`;
      process.stdout.write(
        `[${v.capability}] ${v.file}${v.line ? `:${v.line}` : ''} ${v.section} '### Requirement: ${v.name}' [${v.problem}] — ${v.detail} (${mainRef}).\n`,
      );
    }
    process.stdout.write(
      `delta-header check FAILED for change '${opts.name}': ${violations.length} header/scenario violation(s).\n`,
    );
  }
  return ok ? 0 : 1;
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));

module.exports = { main, USAGE };
