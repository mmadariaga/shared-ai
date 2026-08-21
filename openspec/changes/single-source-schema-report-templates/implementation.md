# single-source-schema-report-templates

## Goal

Make OpenSpec schema report and implementation templates descriptive authority-pointer scaffolds, replace parity testing with authority-pointer verification, supersede ADR 0106 with ADR 0162, redirect the five INDEX references, and update root glossary terminology to Schema Template Authority.

## Prerequisites

- Detect the current git branch with `git rev-parse --abbrev-ref HEAD` (or equivalent). If the command returns empty (detached HEAD), use the literal text `detached HEAD` for option 2.
- Resolve the repository **default branch** dynamically — do NOT assume `main`. Apply this chain in order:
  1. Remote head — `git symbolic-ref --quiet refs/remotes/origin/HEAD`; on success take the trailing path segment (`refs/remotes/origin/main` → `main`).
  2. Else whichever of `main` / `master` exists locally (`git show-ref --verify --quiet refs/heads/<name>`).
  3. If both `main` and `master` exist locally and no remote head resolved, prefer `main`.
  4. If neither exists or there is no `origin`, treat the current branch as the resolved default branch (no distinct default exists, so the base prompt below is skipped).
- Present exactly three options in the user's input language (English fallback), in this fixed order. Canonical English labels — translate to match the user's input language, preserving meaning and order:
  1. `Suggest branch "single-source-schema-report-templates"` — the change-name-derived branch (default).
  2. `Stay on current branch "{current-branch}"` — the detected current branch, or `detached HEAD`.
  3. `Enter branch name manually` — free text for a custom branch name.
- No option is prohibited. The user bears full responsibility for the choice.
- **Branch-base prompt (new branches only).** When the selected branch does NOT already exist — option 1, or an option-3 name not present in the repository — present a 2-option closed choice for its base branch, before creating it, through the harness option-picker (`AskUserQuestion` on Claude Code per the closed-choice-prompt rule in `remember.md`; plain-text fallback where no picker exists). Present them in this order; labels localize to the user's input language (English fallback), surrounding text stays English:
  1. `Base on default branch "{default-branch}"` — the dynamically resolved default; this is the pre-selected default option.
  2. `Base on current branch "{current-branch}"` — the current branch, or the literal `detached HEAD` when in detached HEAD.
  Record the chosen base. **Skip this prompt entirely** (surface no base choice) when any of these holds: option 2 (stay on current branch) was chosen; the selected target branch already exists; or the current branch already equals the resolved default branch — in that last case create the new branch from the default branch without prompting.
- If the selected branch does not exist, create it from the chosen base branch — the resolved default branch or the current branch as determined by the base prompt (or the default branch directly when the prompt was skipped because the current branch already equals the default) — before implementing. Never hardcode `main` as the base.

### Planning notes (not apply actions)

- Design/tasks named ADR **0158**; that number is already taken by `docs/adr/0158-delete-worker-owned-planning-artifact-review-loop.md`. This plan uses **ADR 0162** (`docs/adr/0162-schema-report-templates-point-to-write-time-authority.md`).
- User planning decision: **update GLOSSARY.md in Step 2** (design D6 verified-not-modified was incorrect — root glossary still defines Report Template Parity only).
- `/sai-3-implement` Step 3 already authored ADR 0162 and the five INDEX redirects + supersede-move. Step 2 verifies those files and updates the glossary.

### Step-by-Step Instructions

#### Step 1: Co-land descriptive scaffolds, schema instruction pointers, and authority test

*(Testable step — RED → GREEN. Structural tests co-land with the sources they pin per ADR 0149 / design D2.)*

##### RED phase

- **Rule:** RED may only contain the failing test + minimal stubs/imports. Do NOT paste the full implementation here. If a stub is needed to compile, make it return the wrong value so the test still fails with an assertion error.

- [x] Delete or rename away any leftover so the new path is free: if `test/report-template-authority.test.js` already exists from a partial run, remove it first. Leave `test/report-template-parity.test.js` in place for now (GREEN removes/renames it).

- [x] Write the failing authority suite into `test/report-template-authority.test.js` with the complete GREEN body below. Against the current full scaffolds and detailed `schema.yaml` instructions, assertions about final authority pointers, exact two-sentence instructions, absence of body field labels, and implementation Goal/Prerequisites shape **must fail with assertion failures** (not import/syntax errors).

Scenarios (concrete expected values are single-sourced in `interfaces.md` Step 1):

- Every schema template ends with exactly one final `<!-- Write-time authority: … -->` comment; the five pointer paths match the exact mappings and each file exists.
- Report pointers name `severity vocabulary`, `evidence rules`, `finding shape`, and `tally line`; implementation names exactly `planning`, `conditional RED/GREEN`, `verification`, `STOP & COMMIT`, and `commit-authorization checklist`.
- Each report scaffold retains title, placeholders, header metadata labels, and full `##` heading order matching the fenced (or full-file) authority payload; one single-line HTML purpose comment under each top-level `##`.
- No body field label below header metadata; no severity vocabulary / normative finding-evidence rules in the body; descriptive `Summary:` tally comment immediately precedes the final authority pointer and does not restate levels.
- Five artifact-level `instruction` values equal the exact two-sentence pointer strings; `generates`, `requires`, `description`, `apply.requires`, `apply.tracks`, and top-level `apply.instruction` are byte-identical to immutable pre-change baselines checked into the test.
- Implementation scaffold uses `# {FEATURE_NAME}`, has Goal/Prerequisites/Step-by-Step, representative conditional RED/GREEN, cites `sai/commands/apply/invocation.md` with both commit gates, and never mentions `sai/commands/apply/instructions.md`.
- After GREEN rename, `test/report-template-parity.test.js` is absent.

- [x] Verify RED: run `node --test test/report-template-authority.test.js` — expected: **assertion failure** (exit ≠ 0 AND failure attributable to missing authority pointers / still-detailed scaffolds, NOT a setup/import/compilation error).
- [x] **GATE — DO NOT PROCEED to GREEN until RED is verified.** If the test passes, or the failure is not an assertion failure, STOP and report to the user. Do not paste the GREEN code below.

##### GREEN phase (only after RED is verified)

- [x] Overwrite `openspec/schemas/sai-workflow/templates/review.md` with:

```markdown
# Code Review — <!-- Feature Name -->

**Change:** `openspec/changes/<change-name>/`  
**Branch reviewed:** `<current-branch>`  
**Parent branch:** `<parent-branch>`  
**Commits in scope:** <!-- N (first-sha..last-sha) -->  
**Files changed:** <!-- N -->  
**Date:** <!-- YYYY-MM-DD -->

## Summary

<!-- Overall assessment, verdict, and findings-count placeholders for OpenSpec discovery. -->

## Domain Alignment Check

<!-- Goal coverage, decisions respected, and scope-creep triage for the change. -->

## Security Surface Triage

<!-- Whether a security surface was touched and whether /sai-6-security is recommended. -->

## Performance Surface Triage

<!-- Whether a performance surface was touched and whether /sai-7-performance is recommended. -->

## Accessibility Surface Triage

<!-- Whether a UI/accessibility surface was touched and whether /sai-8-accessibility is recommended. -->

## Findings

<!-- Severity-grouped findings; write-time field shape lives in the command-owned contract. -->

## Mutation Analysis (Pass 11)

<!-- Mutation strategy, aggregates, and surviving-mutant handling. -->

## Coverage Notes

<!-- Files reviewed, skipped, and tests inspected. -->

## Next Steps

<!-- Ordered recommended actions after the review. -->

<!-- Summary: use the command-owned tally line from the write-time authority; do not restate severity levels here. -->
<!-- Write-time authority: severity vocabulary, evidence rules, finding shape, and tally line are defined in sai/commands/review/review-report.template.md -->
```

- [x] Overwrite `openspec/schemas/sai-workflow/templates/security.md` with:

```markdown
# Security Report — <!-- Feature Name -->

**Change:** `openspec/changes/<change-name>/`  
**Scan type:** <!-- SAST | SCA | SAST+SCA -->  
**Scope:** <!-- diff vs `<parent-branch>` | full repo | `<path>` -->  
**Branch:** `<current-branch>`  
**Languages detected:** <!-- list -->  
**Modules in scope:** <!-- list -->  
**Date:** <!-- YYYY-MM-DD -->

## Not Applicable

<!-- Required even when N/A: justify absence of security surface or leave blank and fill findings. -->

## Executive Summary

<!-- Severity counts, risk posture, and verdict. -->

## Module Summary

<!-- Per-module file counts and highest severity. -->

## SAST Findings

<!-- Static analysis findings; field shape lives in the command-owned contract. -->

## SCA Findings

<!-- Dependency vulnerability findings when manifests changed. -->

## Supply Chain Hygiene

<!-- Lockfiles, pin hygiene, typosquatting, abandoned deps when manifests changed. -->

## License Risk

<!-- License risk table when manifests changed. -->

## Policy Compliance

<!-- Policy control mapping when applicable. -->

## Acknowledged Trade-offs (from change artifacts)

<!-- Explicit security decisions accepted in proposal/design. -->

## Prioritized Remediation Plan

<!-- Block-release / next-sprint / backlog remediation lists. -->

## Metrics

<!-- Scan metrics (files scanned, density, effort). -->

<!-- Summary: use the command-owned tally line from the write-time authority; do not restate severity levels here. -->
<!-- Write-time authority: severity vocabulary, evidence rules, finding shape, and tally line are defined in sai/commands/security/security-report.template.md -->
```

- [x] Overwrite `openspec/schemas/sai-workflow/templates/performance.md` with:

```markdown
# Performance Report — <!-- Feature Name -->

**Change:** `openspec/changes/<change-name>/`  
**Scope:** <!-- diff vs `<parent-branch>` | full repo | `<path>` -->  
**Tiers audited:** <!-- backend / frontend / db / queue — list only those in scope -->  
**Branch:** `<current-branch>`  
**Baseline reference:** <!-- prior benchmark / SLO / observability dashboard / "absolute thresholds — no baseline" -->  
**Date:** <!-- YYYY-MM-DD -->

## Not Applicable

<!-- Required even when N/A: justify absence of performance surface or leave blank and fill findings. -->

## Executive Summary

<!-- Per-tier severity counts, verdict, and risk posture. -->

## Hot Paths in Scope

<!-- Endpoints, routes, consumers, and queries under audit. -->

## Findings

<!-- Performance findings; field shape lives in the command-owned contract. -->

## Acknowledged Trade-offs (from change artifacts)

<!-- Explicit performance decisions accepted in change artifacts. -->

## Observability Gaps

<!-- Hot paths lacking timing, metrics, or trace spans. -->

## Prioritized Remediation Plan

<!-- Block-release / next-sprint / backlog remediation lists. -->

## Validation Plan

<!-- Re-measure checklist before merge. -->

<!-- Summary: use the command-owned tally line from the write-time authority; do not restate severity levels here. -->
<!-- Write-time authority: severity vocabulary, evidence rules, finding shape, and tally line are defined in sai/commands/performance/performance-report.template.md -->
```

- [x] Overwrite `openspec/schemas/sai-workflow/templates/accessibility.md` with:

```markdown
# Accessibility Report — <!-- Feature Name -->

**Change:** `openspec/changes/<change-name>/`  
**Standard:** WCAG 2.2 Level AA  
**Scope:** <!-- diff vs `<parent-branch>` | full repo | `<path>` -->  
**Mode:** <!-- Static | Static + Runtime -->  
**Branch:** `<current-branch>`  
**Frameworks detected:** <!-- React / Astro / Tailwind / vanilla — list -->  
**Components in scope:** <!-- list -->  
**Date:** <!-- YYYY-MM-DD -->

## Not Applicable

<!-- Required even when N/A: justify absence of UI surface or leave blank and fill findings. -->

## Executive Summary

<!-- Severity counts, verdict, and inclusive-design posture. -->

## Findings

<!-- Accessibility findings; field shape lives in the command-owned contract. -->

## Acknowledged Trade-offs (from change artifacts)

<!-- Explicit accessibility decisions accepted in change artifacts. -->

## Coverage Notes

<!-- Files reviewed, static phases, runtime tools, empty categories. -->

## Prioritized Remediation Plan

<!-- Block-release / next-sprint / backlog remediation lists. -->

## Re-Test Checklist

<!-- Keyboard, screen reader, axe/Lighthouse, zoom, motion, forced-colors checks. -->

<!-- Summary: use the command-owned tally line from the write-time authority; do not restate severity levels here. -->
<!-- Write-time authority: severity vocabulary, evidence rules, finding shape, and tally line are defined in sai/commands/accessibility/accessibility-report.template.md -->
```

- [x] Overwrite `openspec/schemas/sai-workflow/templates/implementation.md` with:

```markdown
# {FEATURE_NAME}

## Goal

<!-- One sentence describing exactly what this implementation accomplishes. -->

## Prerequisites

<!-- Branch detection, default-branch resolution, three-option branch choice, and optional branch-base prompt. -->

### Step-by-Step Instructions

#### Step 1: {Action}

*(Testable step — use RED → GREEN)*

##### RED phase

<!-- Failing test + minimal stubs/imports only. No full implementation. -->

##### GREEN phase (only after RED is verified)

<!-- Minimal implementation that makes the RED test pass. -->

##### Step 1 Verification Checklist

<!-- Automated checks always; Human checks only when behavior is observable in the browser. -->

#### Step 1 STOP & COMMIT

<!-- Per-Step STOP & COMMIT gate owned by sai/commands/apply/invocation.md (session commit authorization + file visibility + proposed message). Terminal documentation commit-authorization gate is the same owner after the last step. Never cite sai/commands/apply/instructions.md. -->

#### Step 2: {Action — non-testable / not-yet-rendered variant}

*(Non-testable step — standard format; RED/GREEN not required when the change is not yet testable or not yet rendered)*

<!-- Concrete instructions and code blocks without universal RED/GREEN. Human checks deferred to the integration step when applicable. -->

#### Step 2 STOP & COMMIT

<!-- Same per-Step STOP & COMMIT gate via sai/commands/apply/invocation.md. -->

#### Step 3: {Action — service-side / non-UI variant}

*(Service-side / non-UI step — no human check anywhere; distinct from deferred browser checks)*

<!-- Config, migration, scaffolding, or service-side logic with automated verification only. -->

#### Step 3 STOP & COMMIT

<!-- Same per-Step STOP & COMMIT gate via sai/commands/apply/invocation.md. After the final step, the terminal documentation commit-authorization gate also applies (sai/commands/apply/invocation.md). -->

<!-- Write-time authority: planning, conditional RED/GREEN, verification, STOP & COMMIT, and commit-authorization checklist are defined in sai/commands/implement/implementation-plan.template.md -->
```

- [x] In `openspec/schemas/sai-workflow/schema.yaml`, replace **only** the five artifact-level `instruction` blocks for `implementation`, `review`, `security`, `performance`, and `accessibility` with the exact two-sentence strings below. Leave `generates`, `requires`, `description`, `template`, `apply.requires`, `apply.tracks`, and top-level `apply.instruction` byte-identical.

Implementation `instruction` value (YAML block scalar body — two lines ending with single newline as other blocks):

```text
Fetch and follow sai/commands/implement/implementation-plan.template.md exactly. This instruction is an informative reference only; it does not restate the implementation plan contract.
```

Review:

```text
Fetch and follow sai/commands/review/review-report.template.md exactly. This instruction is an informative reference only; it does not restate the review report contract.
```

Security:

```text
Fetch and follow sai/commands/security/security-report.template.md exactly. This instruction is an informative reference only; it does not restate the security report contract.
```

Performance:

```text
Fetch and follow sai/commands/performance/performance-report.template.md exactly. This instruction is an informative reference only; it does not restate the performance report contract.
```

Accessibility:

```text
Fetch and follow sai/commands/accessibility/accessibility-report.template.md exactly. This instruction is an informative reference only; it does not restate the accessibility report contract.
```

Concrete YAML shape for each (example for review — mirror for the other four ids):

```yaml
    instruction: |
      Fetch and follow sai/commands/review/review-report.template.md exactly. This instruction is an informative reference only; it does not restate the review report contract.
```

- [x] Write the complete authority test (same content as RED) and remove the retired parity file. Prefer git move semantics when possible:

  - Ensure `test/report-template-authority.test.js` contains exactly:

```javascript
// test/report-template-authority.test.js
//
// Schema template authority: schema scaffolds under
// openspec/schemas/sai-workflow/templates/ are descriptive pointers to
// command-owned write-time contracts under sai/commands/**. This suite pins:
//   - final Write-time authority HTML comments + exact path mappings
//   - delegated-area wording per pointer family
//   - exact two-sentence artifact instruction strings
//   - byte-identical graph keys + top-level apply.instruction (immutable baselines)
//   - top-level ## heading sequence correspondence via retired fence extraction
//   - no body **Field:** labels below header metadata
//   - implementation Goal/Prerequisites + conditional RED/GREEN shape
//
// PINNED   - the lists above. Content equality of guidance bodies is NOT pinned.
// ALLOWED  - placeholder syntax, comment depth, and non-heading prose inside scaffolds.

'use strict';

const test = require('node:test').test;
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');

function readUtf8(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function exists(relativePath) {
  return fs.existsSync(path.join(repoRoot, relativePath));
}

/** Mirrors retired parity findFenceRange — matching-indent ```markdown open/close. */
function findFenceRange(content) {
  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const opener = lines[i].match(/^(\s*)```markdown\s*$/);
    if (!opener) continue;
    for (let j = i + 1; j < lines.length; j++) {
      const closer = lines[j].match(/^(\s*)```\s*$/);
      if (closer && closer[1] === opener[1]) {
        return { start: i, end: j };
      }
    }
    return null;
  }
  return null;
}

/** Full-file fallback when no matching fence pair exists (implementation authority). */
function extractBody(content) {
  const range = findFenceRange(content);
  if (!range) return content;
  const lines = content.split(/\r?\n/);
  return lines.slice(range.start + 1, range.end).join('\n');
}

function extractTopHeadings(content) {
  const headings = [];
  for (const line of extractBody(content).split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.startsWith('## ')) headings.push(trimmed.slice(3).trim());
  }
  return headings;
}

/** Header metadata = contiguous text before the first line beginning with "## ". */
function splitHeaderAndBody(scaffoldContent) {
  const lines = scaffoldContent.split(/\r?\n/);
  let firstHeading = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('## ')) {
      firstHeading = i;
      break;
    }
  }
  if (firstHeading < 0) {
    return { header: scaffoldContent, body: '', bodyLines: [] };
  }
  return {
    header: lines.slice(0, firstHeading).join('\n'),
    body: lines.slice(firstHeading).join('\n'),
    bodyLines: lines.slice(firstHeading),
  };
}

// Spec body-field-label shape: optional list marker + ** + non-newline chars + **:
// (colon outside bold). Also reject colon-inside bold labels (**Field:**) used in legacy scaffolds.
const BODY_FIELD_LABEL = /^(?:-\s+)?\*\*[^\n]+?\*\*:/;
const BODY_FIELD_LABEL_COLON_INSIDE = /^(?:-\s+)?\*\*[^\n*]+?:\*\*/;

const REPORT_PAIRS = [
  {
    id: 'review',
    scaffold: 'openspec/schemas/sai-workflow/templates/review.md',
    authority: 'sai/commands/review/review-report.template.md',
    contractNoun: 'review report',
  },
  {
    id: 'security',
    scaffold: 'openspec/schemas/sai-workflow/templates/security.md',
    authority: 'sai/commands/security/security-report.template.md',
    contractNoun: 'security report',
  },
  {
    id: 'performance',
    scaffold: 'openspec/schemas/sai-workflow/templates/performance.md',
    authority: 'sai/commands/performance/performance-report.template.md',
    contractNoun: 'performance report',
  },
  {
    id: 'accessibility',
    scaffold: 'openspec/schemas/sai-workflow/templates/accessibility.md',
    authority: 'sai/commands/accessibility/accessibility-report.template.md',
    contractNoun: 'accessibility report',
  },
];

const IMPLEMENTATION = {
  id: 'implementation',
  scaffold: 'openspec/schemas/sai-workflow/templates/implementation.md',
  authority: 'sai/commands/implement/implementation-plan.template.md',
  contractNoun: 'implementation plan',
};

const REPORT_DELEGATED = [
  'severity vocabulary',
  'evidence rules',
  'finding shape',
  'tally line',
];

const IMPLEMENTATION_DELEGATED = [
  'planning',
  'conditional RED/GREEN',
  'verification',
  'STOP & COMMIT',
  'commit-authorization checklist',
];

function expectedInstruction(authorityPath, contractNoun) {
  return (
    `Fetch and follow ${authorityPath} exactly. ` +
    `This instruction is an informative reference only; it does not restate the ${contractNoun} contract.\n`
  );
}

function finalAuthorityComments(content) {
  const re = /<!--\s*Write-time authority:\s*([\s\S]*?)-->/gi;
  const matches = [];
  let m;
  while ((m = re.exec(content)) !== null) {
    matches.push({ full: m[0], body: m[1].replace(/\s+/g, ' ').trim() });
  }
  return matches;
}

function parseSchemaArtifacts(yamlText) {
  // Minimal extraction for the five artifact ids + top-level apply.instruction.
  // Does not require a YAML library; structure is stable and indentation-fixed.
  const artifacts = {};
  const lines = yamlText.split(/\r?\n/);
  let i = 0;
  let inArtifacts = false;
  let current = null;
  let currentKey = null;
  let collectingInstruction = false;
  let instructionLines = [];
  let applyInstruction = null;
  let inApply = false;
  let collectingApplyInstruction = false;
  let applyInstructionLines = [];

  function flushInstruction() {
    if (current && collectingInstruction) {
      current.instruction = instructionLines.join('\n') + (instructionLines.length ? '\n' : '');
      collectingInstruction = false;
      instructionLines = [];
    }
  }

  function flushApplyInstruction() {
    if (collectingApplyInstruction) {
      applyInstruction = applyInstructionLines.join('\n') + (applyInstructionLines.length ? '\n' : '');
      collectingApplyInstruction = false;
      applyInstructionLines = [];
    }
  }

  while (i < lines.length) {
    const line = lines[i];
    if (line === 'artifacts:') {
      inArtifacts = true;
      inApply = false;
      i += 1;
      continue;
    }
    if (line === 'apply:') {
      flushInstruction();
      flushApplyInstruction();
      inArtifacts = false;
      inApply = true;
      current = null;
      i += 1;
      continue;
    }

    if (inArtifacts) {
      const idMatch = line.match(/^  - id: (\S+)\s*$/);
      if (idMatch) {
        flushInstruction();
        current = {
          id: idMatch[1],
          generates: null,
          description: null,
          requires: null,
          instruction: null,
        };
        artifacts[idMatch[1]] = current;
        i += 1;
        continue;
      }
      if (!current) {
        i += 1;
        continue;
      }
      const gen = line.match(/^    generates: (.+)$/);
      if (gen) {
        current.generates = gen[1].trim();
        i += 1;
        continue;
      }
      const desc = line.match(/^    description: (.+)$/);
      if (desc) {
        current.description = desc[1].trim();
        i += 1;
        continue;
      }
      if (line === '    requires:') {
        const reqs = [];
        i += 1;
        while (i < lines.length && /^      - /.test(lines[i])) {
          reqs.push(lines[i].replace(/^      - /, '').trim());
          i += 1;
        }
        current.requires = reqs;
        continue;
      }
      if (line === '    instruction: |') {
        collectingInstruction = true;
        instructionLines = [];
        i += 1;
        while (i < lines.length && /^      /.test(lines[i])) {
          instructionLines.push(lines[i].slice(6));
          i += 1;
        }
        flushInstruction();
        continue;
      }
      i += 1;
      continue;
    }

    if (inApply) {
      const req = line.match(/^  requires: (.+)$/);
      if (req) {
        // store on a pseudo key
        artifacts.__apply = artifacts.__apply || {};
        artifacts.__apply.requires = req[1].trim();
        i += 1;
        continue;
      }
      const tracks = line.match(/^  tracks: (.+)$/);
      if (tracks) {
        artifacts.__apply = artifacts.__apply || {};
        artifacts.__apply.tracks = tracks[1].trim();
        i += 1;
        continue;
      }
      if (line === '  instruction: |') {
        collectingApplyInstruction = true;
        applyInstructionLines = [];
        i += 1;
        while (i < lines.length && /^    /.test(lines[i])) {
          applyInstructionLines.push(lines[i].slice(4));
          i += 1;
        }
        flushApplyInstruction();
        continue;
      }
      i += 1;
      continue;
    }

    i += 1;
  }
  flushInstruction();
  flushApplyInstruction();
  return { artifacts, applyInstruction, applyMeta: artifacts.__apply || {} };
}

// Immutable pre-change baselines (checked-in constants — not derived from post-edit file alone).
const GRAPH_BASELINES = {
  implementation: {
    generates: 'implementation.md',
    description:
      'Granular implementation plan — code-level steps with RED→GREEN and STOP & COMMIT markers, with Discarded findings sub-blocks inside audit steps derived from review.md / security.md / performance.md / accessibility.md',
    requires: ['tasks'],
  },
  review: {
    generates: 'review.md',
    description: 'Code review report — correctness, maintainability, testing, surface triage',
    requires: ['implementation'],
  },
  security: {
    generates: 'security.md',
    description: 'Security audit — SAST + SCA, CWE/CVE mapping, OWASP compliance',
    requires: ['implementation'],
  },
  performance: {
    generates: 'performance.md',
    description: 'Performance audit — backend / frontend / db / queue tiers, evidence-based',
    requires: ['implementation'],
  },
  accessibility: {
    generates: 'accessibility.md',
    description: 'Accessibility audit — WCAG 2.2 AA static review, optional runtime axe/Lighthouse',
    requires: ['implementation'],
  },
};

const APPLY_BASELINE = {
  requires: '[tasks, implementation]',
  tracks: 'implementation.md',
  instruction:
    'Read context files, work through pending tasks, mark complete as you go.\n' +
    'Pause if you hit blockers or need clarification.\n',
};

const SEVERITY_TOKENS = [
  'Critical',
  'High',
  'Medium',
  'Low',
  'Informational',
  'Question',
  'Questions',
  'Blocker',
  'Major',
  'Minor',
];

test('retired parity module path is absent', () => {
  assert.equal(
    exists('test/report-template-parity.test.js'),
    false,
    'test/report-template-parity.test.js must be removed after the authority rename'
  );
});

test('authority pointers are resolvable and scoped', () => {
  const all = [...REPORT_PAIRS, IMPLEMENTATION];
  for (const pair of all) {
    const content = readUtf8(pair.scaffold);
    const comments = finalAuthorityComments(content);
    assert.equal(
      comments.length,
      1,
      `${pair.id} scaffold must have exactly one Write-time authority comment (found ${comments.length})`
    );
    const body = comments[0].body;
    assert.match(
      body,
      /\bsai\//,
      `${pair.id} authority comment must name a path under sai/`
    );
    assert.ok(
      body.includes(pair.authority),
      `${pair.id} authority comment must include exact path ${pair.authority}`
    );
    assert.ok(exists(pair.authority), `authority target missing: ${pair.authority}`);
  }
});

test('report delegated-area wording', () => {
  for (const pair of REPORT_PAIRS) {
    const body = finalAuthorityComments(readUtf8(pair.scaffold))[0].body;
    for (const area of REPORT_DELEGATED) {
      assert.ok(body.includes(area), `${pair.id} pointer missing delegated area: ${area}`);
    }
  }
});

test('implementation delegated-area wording', () => {
  const body = finalAuthorityComments(readUtf8(IMPLEMENTATION.scaffold))[0].body;
  for (const area of IMPLEMENTATION_DELEGATED) {
    assert.ok(body.includes(area), `implementation pointer missing delegated area: ${area}`);
  }
});

test('report heading sequence matches authority payload', () => {
  for (const pair of REPORT_PAIRS) {
    const scaffoldH = extractTopHeadings(readUtf8(pair.scaffold));
    const authorityH = extractTopHeadings(readUtf8(pair.authority));
    assert.deepEqual(
      scaffoldH,
      authorityH,
      `${pair.id} ## heading drift: scaffold=${JSON.stringify(scaffoldH)} authority=${JSON.stringify(authorityH)}`
    );
  }
});

test('report scaffold preserves header metadata labels and one purpose comment per section', () => {
  for (const pair of REPORT_PAIRS) {
    const raw = readUtf8(pair.scaffold);
    const { header, bodyLines } = splitHeaderAndBody(raw);
    assert.match(
      header,
      /\*\*[^\n*]+?:\*\*/,
      `${pair.id} must retain header metadata labels (**Label:** form)`
    );
    assert.ok(!header.includes('Source:'), `${pair.id} must not invent Source metadata`);
    // One single-line HTML purpose comment immediately under each ## heading (before next ## or EOF)
    const headingIndexes = [];
    for (let i = 0; i < bodyLines.length; i++) {
      if (bodyLines[i].startsWith('## ')) headingIndexes.push(i);
    }
    assert.ok(headingIndexes.length > 0, `${pair.id} must have top-level ## headings`);
    for (const hi of headingIndexes) {
      let j = hi + 1;
      while (j < bodyLines.length && bodyLines[j].trim() === '') j += 1;
      assert.ok(
        j < bodyLines.length && /^<!-- .+ -->$/.test(bodyLines[j].trim()),
        `${pair.id} section "${bodyLines[hi]}" must have one single-line HTML purpose comment`
      );
    }
  }
});

test('report scaffold does not become a second contract', () => {
  for (const pair of REPORT_PAIRS) {
    const raw = readUtf8(pair.scaffold);
    const { body, bodyLines } = splitHeaderAndBody(raw);
    for (const line of bodyLines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('<!--')) continue;
      assert.equal(
        BODY_FIELD_LABEL.test(trimmed) || BODY_FIELD_LABEL_COLON_INSIDE.test(trimmed),
        false,
        `${pair.id} body must not contain field label: ${trimmed}`
      );
    }
    for (const token of SEVERITY_TOKENS) {
      // Allow tokens only inside HTML comments (purpose / summary / authority).
      const withoutComments = body.replace(/<!--[\s\S]*?-->/g, '');
      assert.equal(
        withoutComments.includes(token),
        false,
        `${pair.id} body must not restate severity token "${token}" outside comments`
      );
    }
    // Summary tally comment immediately precedes final authority pointer.
    const authorityIdx = raw.lastIndexOf('<!-- Write-time authority:');
    assert.ok(authorityIdx > 0, `${pair.id} missing authority comment`);
    const before = raw.slice(0, authorityIdx);
    const summaryIdx = before.lastIndexOf('<!-- Summary:');
    assert.ok(summaryIdx >= 0, `${pair.id} missing descriptive Summary: tally comment before authority pointer`);
    const between = raw.slice(summaryIdx, authorityIdx);
    // Only whitespace/newlines between end of summary comment and authority comment start
    const afterSummary = before.slice(summaryIdx);
    assert.match(
      afterSummary,
      /<!-- Summary:[\s\S]*?-->\s*$/,
      `${pair.id} Summary comment must immediately precede the authority pointer`
    );
    assert.ok(
      /do not restate/i.test(raw.slice(summaryIdx, authorityIdx + 20)) ||
        /use the command-owned tally/i.test(raw.slice(summaryIdx, authorityIdx)),
      `${pair.id} Summary comment must delegate without restating levels`
    );
  }
});

test('implementation scaffold mirrors real plan shape', () => {
  const raw = readUtf8(IMPLEMENTATION.scaffold);
  assert.match(raw, /^# \{FEATURE_NAME\}\s*$/m, 'implementation title must be # {FEATURE_NAME}');
  assert.ok(!/\bSource\b/.test(raw.split('\n').slice(0, 12).join('\n')), 'no invented Source metadata');
  assert.ok(!/Tasks ref/i.test(raw), 'no Tasks ref metadata');
  assert.ok(!/Design ref/i.test(raw), 'no Design ref metadata');
  assert.ok(!/sai\/commands\/apply\/instructions\.md/.test(raw), 'must not cite dissolved apply instructions path');
  assert.ok(
    raw.includes('sai/commands/apply/invocation.md'),
    'STOP & COMMIT description must cite sai/commands/apply/invocation.md'
  );
  assert.ok(
    /per-Step STOP & COMMIT/i.test(raw) && /terminal documentation commit/i.test(raw),
    'must name both the per-Step STOP & COMMIT gate and the terminal documentation commit gate'
  );

  const headings = extractTopHeadings(raw);
  assert.deepEqual(
    headings.slice(0, 2),
    ['Goal', 'Prerequisites'],
    `implementation must expose Goal then Prerequisites; got ${JSON.stringify(headings)}`
  );

  assert.match(raw, /### Step-by-Step Instructions/);
  assert.match(raw, /#### Step 1: \{Action\}/);
  assert.match(raw, /##### RED phase/);
  assert.match(raw, /##### GREEN phase/);
  assert.match(raw, /##### Step 1 Verification Checklist/);
  assert.match(raw, /#### Step 1 STOP & COMMIT/);
  // Non-testable / deferred variants so RED/GREEN is not universal
  assert.match(raw, /non-testable|not-yet-rendered|Service-side|non-UI/i);
});

test('schema instruction authority pointers and graph-key baselines', () => {
  const yamlText = readUtf8('openspec/schemas/sai-workflow/schema.yaml');
  const { artifacts, applyInstruction, applyMeta } = parseSchemaArtifacts(yamlText);

  const pairs = [...REPORT_PAIRS, IMPLEMENTATION];
  for (const pair of pairs) {
    const art = artifacts[pair.id];
    assert.ok(art, `missing artifact id ${pair.id} in schema.yaml`);
    const expected = expectedInstruction(pair.authority, pair.contractNoun);
    assert.equal(
      art.instruction,
      expected,
      `${pair.id} instruction mismatch.\nexpected:${JSON.stringify(expected)}\nactual:${JSON.stringify(art.instruction)}`
    );
    const base = GRAPH_BASELINES[pair.id];
    assert.equal(art.generates, base.generates, `${pair.id} generates drifted`);
    assert.equal(art.description, base.description, `${pair.id} description drifted`);
    assert.deepEqual(art.requires, base.requires, `${pair.id} requires drifted`);
  }

  assert.equal(applyMeta.requires, APPLY_BASELINE.requires, 'apply.requires drifted');
  assert.equal(applyMeta.tracks, APPLY_BASELINE.tracks, 'apply.tracks drifted');
  assert.equal(
    applyInstruction,
    APPLY_BASELINE.instruction,
    `apply.instruction drifted.\nexpected:${JSON.stringify(APPLY_BASELINE.instruction)}\nactual:${JSON.stringify(applyInstruction)}`
  );
});
```

  - [x] Delete `test/report-template-parity.test.js` (or `git mv` then overwrite destination — final tree must have only `test/report-template-authority.test.js`).

- [x] Verify GREEN: run `node --test test/report-template-authority.test.js` — expected: PASS
- [x] Verify full suite: run `npm test` — expected: PASS (no remaining import of retired parity path)

##### Step 1 Verification Checklist

**Automated (agent runs before stopping):**
- [x] RED verified — `node --test test/report-template-authority.test.js` fails as expected against pre-GREEN tree
- [x] GREEN verified — `node --test test/report-template-authority.test.js` passes
- [x] `npm test` — expected: PASS
- [x] `Test-Path test/report-template-parity.test.js` — expected: False
- [x] Each of the five schema templates ends with exactly one `<!-- Write-time authority:` comment whose path exists under `sai/`
- [x] No `**…:**` field labels appear below the first `## ` heading in any of the four report scaffolds
- [x] Implementation scaffold has no `Source` / `Tasks ref` / `Design ref` and does not mention `sai/commands/apply/instructions.md`

*(No Human checks — service-side step with no observable browser behavior. Unlike deferred UI checks these are not deferred; there is no human check for this step anywhere. Never substitute a `- [ ] No human check required` checkbox.)*

#### Step 1 STOP & COMMIT

**sai-4-apply:** Run all Automated checks above and confirm they pass before stopping.

**STOP & COMMIT:** Stage and commit after Automated checks pass. No browser verification required at this step.

Suggested commit message:

```
feat(schema): descriptive authority-pointer scaffolds for report templates

Replace full schema report/implementation scaffolds with descriptive
skeletons and Write-time authority pointers. Swap parity test for
authority-pointer verification; point five schema instructions at
command-owned contracts.
```

#### Step 2: ADR 0162 verification, index redirects, and glossary terminology

*(Service-side / docs-only step — standard format, no RED/GREEN.)*

**Note:** `/sai-3-implement` Step 3 already created `docs/adr/0162-schema-report-templates-point-to-write-time-authority.md` and updated `docs/adr/0000-INDEX.md` (five live redirects, correction-table row, historical supersede entry). This step verifies those artifacts and performs the user-approved glossary update. ADR number is **0162** (not 0158 — that number is already assigned).

- [x] Verify `docs/adr/0162-schema-report-templates-point-to-write-time-authority.md` exists and contains:
  - H1 `# ADR 0162: Schema report templates point to write-time authority`
  - Structured line `<!-- adr-index: supersedes 0106 -->`
  - Explicit Supersedes prose for ADR 0106 (`0106-keep-both-report-template-families-pinned-parity.md`)
  - Statement that `0106-run-path-baseline-predicate.md` is untouched
  - If missing or incomplete, restore from the content authored during planning (re-read design.md D1–D5 and rewrite the ADR file to match).

- [x] Verify `docs/adr/0000-INDEX.md`:
  - Exactly five live entry lines link to `./0162-schema-report-templates-point-to-write-time-authority.md` under `/sai-5-review`, `/sai-6-security`, `/sai-7-performance`, `/sai-8-accessibility`, and the cross-cutting list that formerly held the report-parity 0106 entry.
  - No live (non-historical, non-correction-table) entry still points at `./0106-keep-both-report-template-families-pinned-parity.md` as a current decision.
  - Correction table includes `| [0162](...) | supersedes | [0106](./0106-keep-both-report-template-families-pinned-parity.md) |`
  - Historical section includes the 0106 report-parity entry with `*Superseded by [0162](...)*`
  - `docs/adr/0106-keep-both-report-template-families-pinned-parity.md` and `docs/adr/0106-run-path-baseline-predicate.md` file bodies are unmodified (`git diff` clean for those two paths).

- [x] Update root `GLOSSARY.md` terminology (user planning decision: update-glossary):

  1. In `## Language`, replace the **Report Template Parity** entry with:

```markdown
**Schema Template Authority**: "The requirement that OpenSpec schema scaffolds under `openspec/schemas/sai-workflow/templates/` remain descriptive discovery surfaces that point at command-owned write-time contracts under `sai/commands/**` via a final Write-time authority HTML comment, rather than duplicating field bodies or severity rules."
*Avoid*: Report Template Parity, template equality, template unification, template consistency, pinned skeleton parity
```

  2. In `## Relationships`, replace the bullet that begins `A **Report Template Parity** pin covers` with:

```markdown
- **Schema Template Authority** covers the four report artifacts plus implementation — each schema scaffold points at its matching command-owned write-time contract under `sai/commands/**` without content-parity equality.
```

  3. In `## Flagged ambiguities`, replace the **Schema template vs instruction output template** resolution so it names **Schema Template Authority** instead of **Report Template Parity**, for example:

```markdown
- **Schema template vs instruction output template** — both families are "the template" for the same report artifact: `openspec/schemas/sai-workflow/templates/{artifact}.md` is the CLI scaffold served by `openspec instructions`, while `sai/commands/{phase}/{artifact}-report.template.md` is the write-time contract fetched by the phase instruction. **Resolution:** schema scaffolds are descriptive under **Schema Template Authority** and point at the command-owned contract via a Write-time authority comment — they are not a second write-time contract and are not pinned to content parity.
```

  4. Confirm no remaining preferred-term use of bare **Report Template Parity** outside `*Avoid*` lists (historical mentions inside Avoid are required).

- [x] Confirm no path under `sai/`, no `bin/setup.js`, and no existing rendered `openspec/changes/**` or archive artifact was modified by this step (aside from this change's own `implementation.md`).

##### Step 2 Verification Checklist

**Automated (agent runs before stopping):**
- [x] `Test-Path docs/adr/0162-schema-report-templates-point-to-write-time-authority.md` — expected: True
- [x] ADR 0162 body contains `supersedes 0106` (structured comment or prose) and does not modify run-path baseline ADR
- [x] `Select-String -Path docs/adr/0000-INDEX.md -Pattern '0162-schema-report-templates-point-to-write-time-authority'` — expected: at least 5 live entry hits plus correction/historical
- [x] `Select-String -Path GLOSSARY.md -Pattern 'Schema Template Authority'` — expected: term defined in Language plus relationship/ambiguity updates
- [x] `Select-String -Path GLOSSARY.md -Pattern '\*\*Report Template Parity\*\*:'` — expected: no matches (term retired as preferred definition)
- [x] Optional no-regression: `npm test` — expected: PASS
- [x] `git diff -- docs/adr/0106-keep-both-report-template-families-pinned-parity.md docs/adr/0106-run-path-baseline-predicate.md` — expected: empty

*(No Human checks — service-side step with no observable browser behavior. Unlike deferred UI checks these are not deferred; there is no human check for this step anywhere. Never substitute a `- [ ] No human check required` checkbox.)*

#### Step 2 STOP & COMMIT

**sai-4-apply:** Run all Automated checks above and confirm they pass before stopping.

**STOP & COMMIT:** Stage and commit after Automated checks pass. No browser verification required at this step. Include ADR 0162, INDEX, and GLOSSARY.md in this commit if they are not already committed.

Suggested commit message:

```
docs(adr): supersede report-template parity with schema authority (0162)

Add ADR 0162, redirect five INDEX references from ADR 0106 report-parity,
and replace GLOSSARY Report Template Parity with Schema Template Authority.
```
