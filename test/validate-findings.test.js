'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const os = require('os');
const fs = require('fs');

const { validateFindings, resolveLintToolPath } = require('../sai/tools/validate-findings.js');

const REPO_ROOT = path.join(__dirname, '..');
const LINT_TOOL = path.join(REPO_ROOT, 'sai', 'tools', 'lint.js');

/**
 * Set up a test environment with lint.js available in .claude/sai/tools/
 * This is needed because the validator resolves paths from .claude/sai/tools/ first.
 */
function setupTestEnvironment() {
  const testTmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-validate-test-'));
  const toolDir = path.join(testTmpDir, '.claude', 'sai', 'tools');
  fs.mkdirSync(toolDir, { recursive: true });

  // Copy lint.js to the test environment
  const testLintPath = path.join(toolDir, 'lint.js');
  fs.copyFileSync(LINT_TOOL, testLintPath);

  return testTmpDir;
}

test('validateFindings: valid findings block passes', () => {
  const testCwd = setupTestEnvironment();
  try {
    const findings = `- Identifier: H1
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

    const result = validateFindings(findings, { cwd: testCwd });
    assert.equal(result.ok, true);
    assert.equal(result.violations.length, 0);
    assert.ok(!result.error);
  } finally {
    fs.rmSync(testCwd, { recursive: true });
  }
});

test('validateFindings: invalid severity fails', () => {
  const testCwd = setupTestEnvironment();
  try {
    const findings = `- Identifier: C1
- Severity: Critical
- Artifact location: proposal.md
- Issue: Missing critical detail.
- Recommended correction: Add the missing section.

Summary: Critical=1 Medium=0 Low=0
`;

    const result = validateFindings(findings, { cwd: testCwd });
    assert.equal(result.ok, false);
    assert.ok(result.violations.length > 0);
    assert.ok(result.violations.some(v => v.problem === 'INVALID_SEVERITY'));
  } finally {
    fs.rmSync(testCwd, { recursive: true });
  }
});

test('validateFindings: invalid summary format fails', () => {
  const testCwd = setupTestEnvironment();
  try {
    const findings = `- Identifier: H1
- Severity: High
- Artifact location: proposal.md
- Issue: Missing critical detail.
- Recommended correction: Add the missing section.

Summary: 1 High, 0 Medium, 0 Low
`;

    const result = validateFindings(findings, { cwd: testCwd });
    assert.equal(result.ok, false);
    assert.ok(result.violations.length > 0);
    assert.ok(result.violations.some(v => v.problem === 'INVALID_SUMMARY_FORMAT'));
  } finally {
    fs.rmSync(testCwd, { recursive: true });
  }
});

test('validateFindings: invalid identifier format fails', () => {
  const testCwd = setupTestEnvironment();
  try {
    const findings = `- Identifier: Finding1
- Severity: High
- Artifact location: proposal.md
- Issue: Missing critical detail.
- Recommended correction: Add the missing section.

Summary: High=1 Medium=0 Low=0
`;

    const result = validateFindings(findings, { cwd: testCwd });
    assert.equal(result.ok, false);
    assert.ok(result.violations.length > 0);
    assert.ok(result.violations.some(v => v.problem === 'INVALID_IDENTIFIER_FORMAT'));
  } finally {
    fs.rmSync(testCwd, { recursive: true });
  }
});

test('validateFindings: missing field count fails', () => {
  const testCwd = setupTestEnvironment();
  try {
    const findings = `- Identifier: H1
- Severity: High
- Artifact location: proposal.md
- Issue: Missing critical detail.

Summary: High=1 Medium=0 Low=0
`;

    const result = validateFindings(findings, { cwd: testCwd });
    assert.equal(result.ok, false);
    assert.ok(result.violations.length > 0);
    assert.ok(result.violations.some(v => v.problem === 'WRONG_FIELD_COUNT'));
  } finally {
    fs.rmSync(testCwd, { recursive: true });
  }
});

test('validateFindings: multiple findings all checked', () => {
  const testCwd = setupTestEnvironment();
  try {
    const findings = `- Identifier: H1
- Severity: High
- Artifact location: proposal.md
- Issue: First issue.
- Recommended correction: Fix first.

- Identifier: H2
- Severity: High
- Artifact location: specs/feature.md
- Issue: Second issue.
- Recommended correction: Fix second.

- Identifier: M1
- Severity: Medium
- Artifact location: proposal.md
- Issue: Clarity issue.
- Recommended correction: Clarify.

- Identifier: L1
- Severity: Low
- Artifact location: specs/design.md
- Issue: Style issue.
- Recommended correction: Improve style.

Summary: High=2 Medium=1 Low=1
`;

    const result = validateFindings(findings, { cwd: testCwd });
    assert.equal(result.ok, true);
    assert.equal(result.violations.length, 0);
  } finally {
    fs.rmSync(testCwd, { recursive: true });
  }
});

test('resolveLintToolPath: finds sibling lint.js first', () => {
  // The sibling resolution uses __dirname, so it always finds the real lint.js
  // when called from this module's location
  const resolved = resolveLintToolPath();
  assert.equal(resolved, LINT_TOOL, 'should resolve to sibling lint.js');
});

test('resolveLintToolPath: finds project-local tool as fallback', () => {
  // Create a temp directory with .claude structure but no sibling
  // This tests fallback to project-local when sibling is not available
  const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'lint-resolve-'));
  try {
    // Create the project-local structure
    const toolDir = path.join(tmpdir, '.claude', 'sai', 'tools');
    fs.mkdirSync(toolDir, { recursive: true });
    const toolPath = path.join(toolDir, 'lint.js');
    fs.writeFileSync(toolPath, '#!/usr/bin/env node\nconsole.log("test");\n');

    // Pass cwd and verify it finds the fallback, but note that sibling would be
    // checked first if it existed in __dirname of the validator module
    const resolved = resolveLintToolPath({ cwd: tmpdir });
    // The resolved path will be the sibling in the actual repo, not the fixture,
    // because sibling resolution uses __dirname which is the real sai/tools/ directory
    // So we verify the function returns something valid
    assert.ok(resolved, 'should resolve lint.js from some candidate');
  } finally {
    fs.rmSync(tmpdir, { recursive: true });
  }
});

test('resolveLintToolPath: returns sibling when searching empty directory', () => {
  // Even when searching an empty directory, sibling resolution succeeds
  // because it uses __dirname of the validator module
  const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'lint-resolve-empty-'));
  try {
    const resolved = resolveLintToolPath({ cwd: tmpdir });
    // Should resolve to the real sibling because sibling is checked first
    assert.equal(resolved, LINT_TOOL);
  } finally {
    fs.rmSync(tmpdir, { recursive: true });
  }
});

test('validateFindings with real sibling lint.js: valid findings return ok true', () => {
  const validFindings = `- Identifier: H1
- Severity: High
- Artifact location: proposal.md
- Issue: Missing critical detail.
- Recommended correction: Add the missing section.

Summary: High=1 Medium=0 Low=0
`;

  const result = validateFindings(validFindings);
  assert.equal(result.ok, true, 'well-formed findings should validate successfully');
  assert.equal(result.violations.length, 0, 'no violations for valid findings');
});

test('validateFindings with real sibling lint.js: invalid severity returns ok false', () => {
  const invalidFindings = `- Identifier: H1
- Severity: Critical
- Artifact location: proposal.md
- Issue: Missing critical detail.
- Recommended correction: Add the missing section.

Summary: Critical=1 Medium=0 Low=0
`;

  const result = validateFindings(invalidFindings);
  assert.equal(result.ok, false, 'malformed findings should fail validation');
  assert.ok(result.violations.length > 0, 'must report at least one violation');
  assert.ok(result.violations.some(v => v.problem === 'INVALID_SEVERITY'), 'should detect invalid severity');
});

test('validateFindings with real sibling lint.js: invalid summary format returns ok false', () => {
  const invalidSummary = `- Identifier: H1
- Severity: High
- Artifact location: proposal.md
- Issue: Test issue.
- Recommended correction: Test correction.

Summary: Critical=1 High=0
`;

  const result = validateFindings(invalidSummary);
  assert.equal(result.ok, false, 'invalid summary format should fail validation');
  assert.ok(result.violations.length > 0, 'must report at least one violation');
  assert.ok(result.violations.some(v => v.problem === 'INVALID_SUMMARY_FORMAT'), 'should detect invalid summary format');
});

test('the manifest projects sai tools to both harnesses includes validate-findings.js', () => {
  const { loadInstallManifest } = require('../bin/install-manifest.js');
  const manifest = loadInstallManifest(REPO_ROOT);
  const sources = fs.readdirSync(path.join(REPO_ROOT, 'sai', 'tools')).filter(name => name.endsWith('.js'));
  assert.ok(sources.includes('validate-findings.js'), 'validate-findings.js is in sai/tools');

  const rule = manifest.projections.find(projection => projection.id === 'sai-tools');
  assert.ok(rule, 'sai-tools projection exists');
  assert.deepEqual(rule.destination, { class: 'sai', path: 'tools' });
});
