'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { spawnSync } = require('child_process');

const REPO_ROOT = path.join(__dirname, '..');
const TOOL = path.join(REPO_ROOT, 'sai', 'tools', 'lint.js');

function tool(args, cwd) {
  const result = spawnSync(process.execPath, [TOOL, ...args, '--cwd', cwd], {
    cwd,
    encoding: 'utf8',
  });
  let payload = null;
  if (result.stdout.trim()) {
    try {
      payload = JSON.parse(result.stdout);
    } catch (err) {
      // Not JSON output
    }
  }
  return { status: result.status, stdout: result.stdout, stderr: result.stderr, payload };
}

// ============================================================================
// Basic tool tests
// ============================================================================

test('lint.js usage text is present', () => {
  const result = spawnSync(process.execPath, [TOOL, '--help'], { encoding: 'utf8' });
  assert.match(result.stdout, /Usage: node sai\/tools\/lint\.js/);
  assert.equal(result.status, 0);
});

test('lint.js rejects missing check name', () => {
  const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'lint-'));
  try {
    const result = tool([], tmpdir);
    assert.equal(result.status, 2);
    assert.match(result.stderr, /check name required/i);
  } finally {
    fs.rmSync(tmpdir, { recursive: true });
  }
});

test('lint.js rejects missing file argument', () => {
  const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'lint-'));
  try {
    const result = tool(['commit-rules'], tmpdir);
    assert.equal(result.status, 2);
    assert.match(result.stderr, /file or text argument required/i);
  } finally {
    fs.rmSync(tmpdir, { recursive: true });
  }
});

test('lint.js returns error code 2 for missing file', () => {
  const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'lint-'));
  try {
    const result = tool(['commit-rules', 'nonexistent.txt'], tmpdir);
    assert.equal(result.status, 2);
    assert.match(result.stderr, /cannot read file/i);
  } finally {
    fs.rmSync(tmpdir, { recursive: true });
  }
});

test('lint.js unknown check returns error', () => {
  const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'lint-'));
  try {
    const testFile = path.join(tmpdir, 'file.txt');
    fs.writeFileSync(testFile, 'content\n');
    const result = tool(['unknown-check', 'file.txt'], tmpdir);
    assert.equal(result.status, 2);
    assert.match(result.stderr, /unknown check/i);
  } finally {
    fs.rmSync(tmpdir, { recursive: true });
  }
});

test('lint.js --json flag outputs JSON', () => {
  const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'lint-'));
  try {
    const testFile = path.join(tmpdir, 'commit.txt');
    fs.writeFileSync(testFile, 'feat: valid subject\n');
    const result = spawnSync(process.execPath, [TOOL, 'commit-rules', 'commit.txt', '--json', '--cwd', tmpdir], {
      cwd: tmpdir,
      encoding: 'utf8',
    });
    assert.equal(result.status, 0);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.ok, true);
    assert.equal(payload.check, 'commit-rules');
    assert.equal(payload.violations.length, 0);
  } finally {
    fs.rmSync(tmpdir, { recursive: true });
  }
});

// ============================================================================
// commit-rules checks
// ============================================================================

test('lint.js commit-rules: valid subject passes', () => {
  const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'lint-'));
  try {
    const testFile = path.join(tmpdir, 'commit.txt');
    fs.writeFileSync(testFile, 'feat: add new capability\n');
    const result = tool(['commit-rules', 'commit.txt'], tmpdir);
    assert.equal(result.status, 0);
    assert.match(result.stdout, /check passed/);
  } finally {
    fs.rmSync(tmpdir, { recursive: true });
  }
});

test('lint.js commit-rules: subject too long fails', () => {
  const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'lint-'));
  try {
    const testFile = path.join(tmpdir, 'commit.txt');
    const longSubject = 'feat: ' + 'x'.repeat(100);
    fs.writeFileSync(testFile, `${longSubject}\n`);
    const result = tool(['commit-rules', 'commit.txt'], tmpdir);
    assert.equal(result.status, 1);
    assert.match(result.stdout, /SUBJECT_TOO_LONG/);
  } finally {
    fs.rmSync(tmpdir, { recursive: true });
  }
});

test('lint.js commit-rules: invalid format fails', () => {
  const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'lint-'));
  try {
    const testFile = path.join(tmpdir, 'commit.txt');
    fs.writeFileSync(testFile, 'add new capability\n');
    const result = tool(['commit-rules', 'commit.txt'], tmpdir);
    assert.equal(result.status, 1);
    assert.match(result.stdout, /INVALID_FORMAT/);
  } finally {
    fs.rmSync(tmpdir, { recursive: true });
  }
});

test('lint.js commit-rules: trailing period fails', () => {
  const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'lint-'));
  try {
    const testFile = path.join(tmpdir, 'commit.txt');
    fs.writeFileSync(testFile, 'feat: add new capability.\n');
    const result = tool(['commit-rules', 'commit.txt'], tmpdir);
    assert.equal(result.status, 1);
    assert.match(result.stdout, /TRAILING_PERIOD/);
  } finally {
    fs.rmSync(tmpdir, { recursive: true });
  }
});

test('lint.js commit-rules: scope format is valid', () => {
  const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'lint-'));
  try {
    const testFile = path.join(tmpdir, 'commit.txt');
    fs.writeFileSync(testFile, 'feat(pickers): add status picker\n');
    const result = tool(['commit-rules', 'commit.txt'], tmpdir);
    assert.equal(result.status, 0);
    assert.match(result.stdout, /check passed/);
  } finally {
    fs.rmSync(tmpdir, { recursive: true });
  }
});

test('lint.js commit-rules: missing blank line between subject and body fails', () => {
  const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'lint-'));
  try {
    const testFile = path.join(tmpdir, 'commit.txt');
    fs.writeFileSync(testFile, 'feat: add new capability\nThis is the body\n');
    const result = tool(['commit-rules', 'commit.txt'], tmpdir);
    assert.equal(result.status, 1);
    assert.match(result.stdout, /MISSING_BLANK_LINE/);
  } finally {
    fs.rmSync(tmpdir, { recursive: true });
  }
});

test('lint.js commit-rules: body line too long fails', () => {
  const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'lint-'));
  try {
    const testFile = path.join(tmpdir, 'commit.txt');
    const longBody = 'feat: add capability\n\n' + 'x'.repeat(100);
    fs.writeFileSync(testFile, longBody);
    const result = tool(['commit-rules', 'commit.txt'], tmpdir);
    assert.equal(result.status, 1);
    assert.match(result.stdout, /BODY_LINE_TOO_LONG/);
  } finally {
    fs.rmSync(tmpdir, { recursive: true });
  }
});

test('lint.js commit-rules: valid multiline commit passes', () => {
  const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'lint-'));
  try {
    const testFile = path.join(tmpdir, 'commit.txt');
    const commit = 'feat: add new capability\n\nThis is a description.\nIt can span multiple lines.\n';
    fs.writeFileSync(testFile, commit);
    const result = tool(['commit-rules', 'commit.txt'], tmpdir);
    assert.equal(result.status, 0);
    assert.match(result.stdout, /check passed/);
  } finally {
    fs.rmSync(tmpdir, { recursive: true });
  }
});

// ============================================================================
// glossary-format checks
// ============================================================================

test('lint.js glossary-format: valid glossary passes', () => {
  const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'lint-'));
  try {
    const testFile = path.join(tmpdir, 'GLOSSARY.md');
    const glossary = `# Project Glossary

A short description of the project.

## Language

**Term**: "A concise definition."
*Avoid*: wrong_term, bad_term

**Other**: "Another definition."
*Avoid*: other_wrong

## Relationships

- **Term** has many **Other** (one-to-many relationship)
`;
    fs.writeFileSync(testFile, glossary);
    const result = tool(['glossary-format', 'GLOSSARY.md'], tmpdir);
    assert.equal(result.status, 0);
    assert.match(result.stdout, /check passed/);
  } finally {
    fs.rmSync(tmpdir, { recursive: true });
  }
});

test('lint.js glossary-format: missing H1 fails', () => {
  const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'lint-'));
  try {
    const testFile = path.join(tmpdir, 'GLOSSARY.md');
    const glossary = `## Language

**Term**: "definition"
*Avoid*: wrong_term
`;
    fs.writeFileSync(testFile, glossary);
    const result = tool(['glossary-format', 'GLOSSARY.md'], tmpdir);
    assert.equal(result.status, 1);
    assert.match(result.stdout, /MISSING_H1/);
  } finally {
    fs.rmSync(tmpdir, { recursive: true });
  }
});

// ============================================================================
// ready-to-propose checks
// ============================================================================

test('lint.js ready-to-propose: valid block passes', () => {
  const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'lint-'));
  try {
    const testFile = path.join(tmpdir, 'proposal.md');
    const block = `## Ready to Propose

**Change name**: example-change
**What**: This is what we're doing.
**Why**: This is why we're doing it.
**Capabilities in scope**:
- capability-one: description

**Research Leads**:
- path/to/file.js - relevant note

**Decisions & Rationale**:
- Decision one with rationale.

**Alternatives Considered**:
- Alternative one.

**Trade-offs Accepted**:
- Trade-off one.

**Model / Re-framings**:
- Model one.

**Key constraints**:
- Constraint one.

**Edge Cases**:
- E1: edge case one.

**Implementation Details**:
- I1: implementation detail one.

**Overview language**: None

---
`;
    fs.writeFileSync(testFile, block);
    const result = tool(['ready-to-propose', 'proposal.md'], tmpdir);
    assert.equal(result.status, 0);
    assert.match(result.stdout, /check passed/);
  } finally {
    fs.rmSync(tmpdir, { recursive: true });
  }
});

test('lint.js ready-to-propose: missing block heading fails', () => {
  const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'lint-'));
  try {
    const testFile = path.join(tmpdir, 'proposal.md');
    fs.writeFileSync(testFile, '# Some other heading\n\nContent here.\n');
    const result = tool(['ready-to-propose', 'proposal.md'], tmpdir);
    assert.equal(result.status, 1);
    assert.match(result.stdout, /MISSING_BLOCK_HEADING/);
  } finally {
    fs.rmSync(tmpdir, { recursive: true });
  }
});

// ============================================================================
// artifact-review checks
// ============================================================================

test('lint.js artifact-review: valid review passes', () => {
  const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'lint-'));
  try {
    const testFile = path.join(tmpdir, 'review.md');
    const review = `- Identifier: H1
- Severity: High
- Artifact location: proposal.md
- Issue: Missing critical detail.
- Recommended correction: Add the missing section.

- Identifier: M1
- Severity: Medium
- Artifact location: specs/feature.md
- Issue: Clarity issue.
- Recommended correction: Rephrase for clarity.

Summary: High=1 Medium=1 Low=0
`;
    fs.writeFileSync(testFile, review);
    const result = tool(['artifact-review', 'review.md'], tmpdir);
    assert.equal(result.status, 0);
    assert.match(result.stdout, /check passed/);
  } finally {
    fs.rmSync(tmpdir, { recursive: true });
  }
});

test('lint.js artifact-review: invalid severity fails', () => {
  const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'lint-'));
  try {
    const testFile = path.join(tmpdir, 'review.md');
    const review = `- Identifier: C1
- Severity: Critical
- Artifact location: proposal.md
- Issue: Missing critical detail.
- Recommended correction: Add the missing section.

Summary: Critical=1 Medium=0 Low=0
`;
    fs.writeFileSync(testFile, review);
    const result = tool(['artifact-review', 'review.md'], tmpdir);
    assert.equal(result.status, 1);
    assert.match(result.stdout, /INVALID_SEVERITY/);
  } finally {
    fs.rmSync(tmpdir, { recursive: true });
  }
});

test('lint.js artifact-review: invalid summary format fails', () => {
  const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'lint-'));
  try {
    const testFile = path.join(tmpdir, 'review.md');
    const review = `- Identifier: H1
- Severity: High
- Artifact location: proposal.md
- Issue: Missing critical detail.
- Recommended correction: Add the missing section.

Summary: 1 High, 0 Medium, 0 Low
`;
    fs.writeFileSync(testFile, review);
    const result = tool(['artifact-review', 'review.md'], tmpdir);
    assert.equal(result.status, 1);
    assert.match(result.stdout, /INVALID_SUMMARY_FORMAT/);
  } finally {
    fs.rmSync(tmpdir, { recursive: true });
  }
});

test('lint.js artifact-review: invalid identifier format fails', () => {
  const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'lint-'));
  try {
    const testFile = path.join(tmpdir, 'review.md');
    const review = `- Identifier: Finding1
- Severity: High
- Artifact location: proposal.md
- Issue: Missing critical detail.
- Recommended correction: Add the missing section.

Summary: High=1 Medium=0 Low=0
`;
    fs.writeFileSync(testFile, review);
    const result = tool(['artifact-review', 'review.md'], tmpdir);
    assert.equal(result.status, 1);
    assert.match(result.stdout, /INVALID_IDENTIFIER_FORMAT/);
  } finally {
    fs.rmSync(tmpdir, { recursive: true });
  }
});

// ============================================================================
// sai-learnings-format checks
// ============================================================================

test('lint.js sai-learnings-format: valid learnings passes', () => {
  const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'lint-'));
  try {
    const testFile = path.join(tmpdir, 'SAI_LEARNINGS.md');
    const learnings = `# SAI Learnings — My Project

This file documents repository-level build and test facts.

## Stack

- **Node version**: Must use Node 18.x
  *Observed:* example-change — tried Node 16.x, tests failed; Node 18.x passes

## Conventions

- **test command**: Run with \`npm test\` in project root
  *Observed:* example-change — discovered via CI logs

## Avoid

- **Python 2**: Repository requires Python 3.8+
  *Observed:* example-change — build script fails with Python 2

## Test Command

npm test
*Observed:* example-change
`;
    fs.writeFileSync(testFile, learnings);
    const result = tool(['sai-learnings-format', 'SAI_LEARNINGS.md'], tmpdir);
    assert.equal(result.status, 0);
    assert.match(result.stdout, /check passed/);
  } finally {
    fs.rmSync(tmpdir, { recursive: true });
  }
});

test('lint.js sai-learnings-format: missing H1 fails', () => {
  const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'lint-'));
  try {
    const testFile = path.join(tmpdir, 'SAI_LEARNINGS.md');
    const learnings = `## Stack

- **key**: fact
  *Observed:* change
`;
    fs.writeFileSync(testFile, learnings);
    const result = tool(['sai-learnings-format', 'SAI_LEARNINGS.md'], tmpdir);
    assert.equal(result.status, 1);
    assert.match(result.stdout, /MISSING_H1/);
  } finally {
    fs.rmSync(tmpdir, { recursive: true });
  }
});

test('lint.js sai-learnings-format: missing required section fails', () => {
  const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'lint-'));
  try {
    const testFile = path.join(tmpdir, 'SAI_LEARNINGS.md');
    const learnings = `# SAI Learnings — My Project

Description.

## Stack

## Conventions

## Test Command
`;
    fs.writeFileSync(testFile, learnings);
    const result = tool(['sai-learnings-format', 'SAI_LEARNINGS.md'], tmpdir);
    assert.equal(result.status, 1);
    assert.match(result.stdout, /MISSING_SECTION/);
  } finally {
    fs.rmSync(tmpdir, { recursive: true });
  }
});

test('lint.js sai-learnings-format: wrong section order fails', () => {
  const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'lint-'));
  try {
    const testFile = path.join(tmpdir, 'SAI_LEARNINGS.md');
    const learnings = `# SAI Learnings — My Project

Description.

## Conventions

## Stack

## Avoid

## Test Command
`;
    fs.writeFileSync(testFile, learnings);
    const result = tool(['sai-learnings-format', 'SAI_LEARNINGS.md'], tmpdir);
    assert.equal(result.status, 1);
    assert.match(result.stdout, /WRONG_SECTION_ORDER/);
  } finally {
    fs.rmSync(tmpdir, { recursive: true });
  }
});

// ============================================================================
// step-contract checks
// ============================================================================

test('lint.js step-contract: valid step contract passes', () => {
  const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'lint-'));
  try {
    const testFile = path.join(tmpdir, 'interfaces.md');
    const contract = `## Step 1: Setup environment

**Interfaces**: function setupEnv(): void

**Test assertions**: setupEnv() sets NODE_ENV=test

## Step 2: Initialize database

**Interfaces**: class Database { constructor(config); connect(): Promise }

**Test assertions**: Database(config).connect() resolves when connection succeeds
`;
    fs.writeFileSync(testFile, contract);
    const result = tool(['step-contract', 'interfaces.md'], tmpdir);
    assert.equal(result.status, 0);
    assert.match(result.stdout, /check passed/);
  } finally {
    fs.rmSync(tmpdir, { recursive: true });
  }
});

test('lint.js step-contract: sentinel format passes', () => {
  const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'lint-'));
  try {
    const testFile = path.join(tmpdir, 'interfaces.md');
    fs.writeFileSync(testFile, 'None — no step contracts');
    const result = tool(['step-contract', 'interfaces.md'], tmpdir);
    assert.equal(result.status, 0);
    assert.match(result.stdout, /check passed/);
  } finally {
    fs.rmSync(tmpdir, { recursive: true });
  }
});

test('lint.js step-contract: missing Interfaces field fails', () => {
  const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'lint-'));
  try {
    const testFile = path.join(tmpdir, 'interfaces.md');
    const contract = `## Step 1: Setup

**Test assertions**: test passes
`;
    fs.writeFileSync(testFile, contract);
    const result = tool(['step-contract', 'interfaces.md'], tmpdir);
    assert.equal(result.status, 1);
    assert.match(result.stdout, /MISSING_INTERFACES_FIELD/);
  } finally {
    fs.rmSync(tmpdir, { recursive: true });
  }
});

test('lint.js step-contract: missing Test assertions field fails', () => {
  const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'lint-'));
  try {
    const testFile = path.join(tmpdir, 'interfaces.md');
    const contract = `## Step 1: Setup

**Interfaces**: function setup(): void
`;
    fs.writeFileSync(testFile, contract);
    const result = tool(['step-contract', 'interfaces.md'], tmpdir);
    assert.equal(result.status, 1);
    assert.match(result.stdout, /MISSING_TEST_ASSERTIONS_FIELD/);
  } finally {
    fs.rmSync(tmpdir, { recursive: true });
  }
});

// ============================================================================
// worker-emission-ownership checks
// ============================================================================

test('lint.js worker-emission-ownership: all real worker cards pass the check', () => {
  // Verify the invariant is mechanically enforced by checking all real worker cards
  const commandsDir = path.join(REPO_ROOT, 'sai', 'commands');
  const workerCards = [];

  // Recursively find all *worker*.md files
  function findWorkerCards(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        findWorkerCards(fullPath);
      } else if (entry.isFile() && entry.name.includes('worker') && entry.name.endsWith('.md')) {
        workerCards.push(fullPath);
      }
    }
  }

  findWorkerCards(commandsDir);

  // Every worker card must pass the check (zero violations)
  assert.ok(workerCards.length > 0, 'found at least one worker card');

  for (const cardPath of workerCards) {
    const content = fs.readFileSync(cardPath, 'utf8');
    const { checkWorkerEmissionOwnership } = require('../sai/tools/lint.js');
    const violations = checkWorkerEmissionOwnership(content);
    assert.equal(violations.length, 0, `worker card ${path.relative(REPO_ROOT, cardPath)} must pass the check but has ${violations.length} violation(s): ${violations.map(v => `${v.line}:${v.problem}`).join(', ')}`);
  }
});

test('lint.js worker-emission-ownership: real prose from worker cards passes', () => {
  const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'lint-'));
  try {
    const testFile = path.join(tmpdir, 'worker.md');
    // Real examples from the codebase that MUST pass
    const workerContent = `# Worker

## Progress Reporting

Emit progress events marking only the dispatch-local plan's steps.

## Feedback

MUST NOT emit, re-present, or duplicate the feedback-text prompt.

The progress-event-per-batch contract means each batch of work
produces exactly one progress event.
`;
    fs.writeFileSync(testFile, workerContent);
    const result = tool(['worker-emission-ownership', 'worker.md'], tmpdir);
    assert.equal(result.status, 0, 'real worker prose must pass');
    assert.match(result.stdout, /check passed/);
  } finally {
    fs.rmSync(tmpdir, { recursive: true });
  }
});

test('lint.js worker-emission-ownership: sai-state emit command fails', () => {
  const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'lint-'));
  try {
    const testFile = path.join(tmpdir, 'worker.md');
    const workerContent = `# Worker

Run: sai-state emit <id> explore-slice@1 '{"intent":"plan"}'
`;
    fs.writeFileSync(testFile, workerContent);
    const result = tool(['worker-emission-ownership', 'worker.md'], tmpdir);
    assert.equal(result.status, 1);
    assert.match(result.stdout, /WORKER_REFERENCES_STAGE_MACHINE_SURFACE/);
  } finally {
    fs.rmSync(tmpdir, { recursive: true });
  }
});

test('lint.js worker-emission-ownership: sai-state spawn command fails', () => {
  const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'lint-'));
  try {
    const testFile = path.join(tmpdir, 'worker.md');
    const workerContent = `# Worker

The coordinator calls sai-state spawn --key <session-key>.
`;
    fs.writeFileSync(testFile, workerContent);
    const result = tool(['worker-emission-ownership', 'worker.md'], tmpdir);
    assert.equal(result.status, 1);
    assert.match(result.stdout, /WORKER_REFERENCES_STAGE_MACHINE_SURFACE/);
  } finally {
    fs.rmSync(tmpdir, { recursive: true });
  }
});

test('lint.js worker-emission-ownership: stage machine ID fails', () => {
  const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'lint-'));
  try {
    const testFile = path.join(tmpdir, 'worker.md');
    const workerContent = `# Worker

Consult explore-idea@1 before continuing.
`;
    fs.writeFileSync(testFile, workerContent);
    const result = tool(['worker-emission-ownership', 'worker.md'], tmpdir);
    assert.equal(result.status, 1);
    assert.match(result.stdout, /WORKER_REFERENCES_STAGE_MACHINE_SURFACE/);
  } finally {
    fs.rmSync(tmpdir, { recursive: true });
  }
});

test('lint.js worker-emission-ownership: legacy /emit command fails', () => {
  const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'lint-'));
  try {
    const testFile = path.join(tmpdir, 'worker.md');
    const workerContent = `# Worker

POST /emit with the updated state.
`;
    fs.writeFileSync(testFile, workerContent);
    const result = tool(['worker-emission-ownership', 'worker.md'], tmpdir);
    assert.equal(result.status, 1);
    assert.match(result.stdout, /WORKER_REFERENCES_STAGE_MACHINE_SURFACE/);
  } finally {
    fs.rmSync(tmpdir, { recursive: true });
  }
});

test('lint.js worker-emission-ownership: bin/sai-state.js reference fails', () => {
  const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'lint-'));
  try {
    const testFile = path.join(tmpdir, 'worker.md');
    const workerContent = `# Worker

The worker must not invoke bin/sai-state.js directly.
`;
    fs.writeFileSync(testFile, workerContent);
    const result = tool(['worker-emission-ownership', 'worker.md'], tmpdir);
    assert.equal(result.status, 1);
    assert.match(result.stdout, /WORKER_REFERENCES_STAGE_MACHINE_SURFACE/);
  } finally {
    fs.rmSync(tmpdir, { recursive: true });
  }
});

// ============================================================================
// Manifest test
// ============================================================================

test('the manifest projects sai tools to both harnesses includes lint.js', () => {
  const { loadInstallManifest } = require('../bin/install-manifest.js');
  const manifest = loadInstallManifest(REPO_ROOT);
  const sources = fs.readdirSync(path.join(REPO_ROOT, 'sai', 'tools')).filter(name => name.endsWith('.js'));
  assert.ok(sources.includes('lint.js'), 'lint.js is in sai/tools');

  const rule = manifest.projections.find(projection => projection.id === 'sai-tools');
  assert.ok(rule, 'sai-tools projection exists');
  assert.deepEqual(rule.destination, { class: 'sai', path: 'tools' });
});
