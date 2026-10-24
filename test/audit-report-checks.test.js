'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { checkAuditReport } = require('../sai/tools/lint.js');
const { collectFromAuditReport } = require('../sai/tools/check-cited-paths.js');

const REPO_ROOT = path.join(__dirname, '..');
const LINT = path.join(REPO_ROOT, 'sai', 'tools', 'lint.js');
const CITED = path.join(REPO_ROOT, 'sai', 'tools', 'check-cited-paths.js');

const problems = (content, audit) => checkAuditReport(content, audit).map(v => v.problem);

const SECURITY = `# Security Report — Demo

**Scope:** diff vs \`main\` · **Scan type:** SAST · **SCA:** did not run — no manifest changed · **Date:** 2026-10-24

## SAST Findings

### C1 [Critical] CWE-89 — SQL injection

- **File:** \`src/a.js:12\`
- **Evidence:**
  \`\`\`js
  ### H9 [High] a heading inside evidence is not a finding
  \`\`\`

### H1 [High] CWE-79 — XSS

- **File:** \`src/b.js:3-9\`

---

Summary: Critical=1 High=1 Medium=0 Low=0
`;

const PERFORMANCE = `# Performance Report — Demo

**Scope:** diff vs \`main\` · **Tiers:** db · **Baseline:** absolute thresholds — no baseline · **Diagnostics:** not requested · **Date:** 2026-10-24

## Findings

### M1 [Medium] db: N+1 query

- **Location:** \`src/repo.js:40\`

### I1 [Informational] db: index hint

- **Location:** \`GET /users\`

---

Summary: Critical=0 High=0 Medium=1 Low=0 Informational=1
`;

const ACCESSIBILITY = `# Accessibility Report — Demo

**Change:** \`openspec/changes/demo/\`
**Standard:** WCAG 2.2 Level AA
**Scope:** diff vs \`main\`

## Executive Summary

| Severity | Count |
|----------|-------|
| Critical | 0 |
| High | 1 |
| Medium | 0 |
| Low | 0 |
| Informational | 0 |
| **Total** | 1 |

## Findings

### H1 [High] WCAG 2.4.7: focus not visible

- **Location:** \`src/ui/Button.tsx:8\`

## Coverage Notes

- **Runtime tools used:** none — static-only mode

## Pending Manual Checks

- [ ] Keyboard walk of checkout

## Re-Test Checklist

- [ ] axe re-run

Summary: Critical=0 High=1 Medium=0 Low=0 Informational=0
`;

test('audit-report accepts a well-formed report of each audit', () => {
  assert.deepEqual(problems(SECURITY, 'security'), []);
  assert.deepEqual(problems(PERFORMANCE, 'performance'), []);
  assert.deepEqual(problems(ACCESSIBILITY, 'accessibility'), []);
});

test('audit-report enforces the Summary form of the audit own level subset (ADR 0107b)', () => {
  assert.deepEqual(problems(SECURITY.replace(/Low=0\n$/, 'Low=0 Informational=0\n'), 'security'), ['INVALID_SUMMARY_FORMAT']);
  assert.deepEqual(problems(PERFORMANCE.replace(' Informational=1', ''), 'performance'), ['INVALID_SUMMARY_FORMAT']);
  assert.deepEqual(problems(ACCESSIBILITY.replace(' Informational=0\n', '\n'), 'accessibility'), ['INVALID_SUMMARY_FORMAT']);
  assert.ok(problems(SECURITY.replace(/\nSummary:.*\n$/, '\n'), 'security').includes('MISSING_SUMMARY'));
});

test('audit-report keeps Informational out of the security subset and Question out of every audit', () => {
  const informational = SECURITY.replace('### H1 [High] CWE-79', '### I1 [Informational] CWE-79');
  assert.ok(problems(informational, 'security').includes('INVALID_IDENTIFIER_FORMAT'));
  const question = PERFORMANCE.replace('### M1 [Medium]', '### Q1 [Question]');
  assert.ok(problems(question, 'performance').includes('INVALID_IDENTIFIER_FORMAT'));
});

test('audit-report checks the tally against the findings and the identifier numbering', () => {
  assert.ok(problems(SECURITY.replace('Critical=1 High=1', 'Critical=2 High=1'), 'security').includes('SUMMARY_TALLY_MISMATCH'));
  assert.ok(problems(SECURITY.replace('### H1 [High]', '### H2 [High]'), 'security').includes('IDENTIFIER_SEQUENCE'));
  assert.ok(problems(SECURITY.replace('### H1 [High]', '### H1 [Critical]'), 'security').includes('SEVERITY_IDENTIFIER_MISMATCH'));
  assert.ok(problems(SECURITY.replace('### H1 [High] CWE-79', '### Missing identifier'), 'security').includes('FINDING_WITHOUT_IDENTIFIER'));
});

test('audit-report ignores headings inside fenced evidence', () => {
  const found = checkAuditReport(SECURITY, 'security');
  assert.deepEqual(found, []);
});

test('audit-report checks the accessibility severity table and fixed sections', () => {
  assert.ok(problems(ACCESSIBILITY.replace('| High | 1 |', '| High | 2 |'), 'accessibility').includes('SEVERITY_TABLE_MISMATCH'));
  assert.ok(problems(ACCESSIBILITY.replace('| **Total** | 1 |', '| **Total** | 3 |'), 'accessibility').includes('SEVERITY_TABLE_MISMATCH'));
  assert.ok(problems(ACCESSIBILITY.replace('| Low | 0 |\n', ''), 'accessibility').includes('MISSING_SEVERITY_TABLE_ROW'));
  assert.ok(problems(ACCESSIBILITY.replace('## Pending Manual Checks', '## Something Else'), 'accessibility').includes('MISSING_SECTION'));
});

test('audit-report accepts the Not Applicable form and rejects findings or a tally beside it', () => {
  const na = `# Performance Report — Demo

**Scope:** diff vs \`main\` · **Tiers:** none

## Not Applicable

**Justification:** The diff is empty.
`;
  assert.deepEqual(problems(na, 'performance'), []);
  assert.ok(problems(`${na}\nSummary: Critical=0 High=0 Medium=0 Low=0 Informational=0\n`, 'performance').includes('NOT_APPLICABLE_WITH_TALLY'));
  assert.ok(problems(na.replace('**Justification:** The diff is empty.\n', ''), 'performance').includes('MISSING_JUSTIFICATION'));
  assert.ok(problems(`${na}\n## Findings\n\n### M1 [Medium] db: x\n`, 'performance').includes('NOT_APPLICABLE_WITH_FINDINGS'));
});

test('audit-report requires the title and the provenance line', () => {
  assert.ok(problems(SECURITY.replace('# Security Report — Demo', '# Report'), 'security').includes('MISSING_TITLE'));
  assert.ok(problems(SECURITY.replace('**Scope:**', '**Where:**'), 'security').includes('MISSING_PROVENANCE'));
  assert.ok(problems(PERFORMANCE, 'security').includes('MISSING_TITLE'), 'a report is checked against its own audit');
});

test('lint.js audit-report is a CLI check that needs a known --audit', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-lint-'));
  try {
    fs.writeFileSync(path.join(dir, 'security.md'), SECURITY);
    const run = args => spawnSync(process.execPath, [LINT, ...args, '--cwd', dir], { cwd: dir, encoding: 'utf8' });
    assert.equal(run(['audit-report', 'security.md', '--audit', 'security']).status, 0);
    assert.equal(run(['audit-report', 'security.md', '--audit', 'performance']).status, 1);
    assert.equal(run(['audit-report', 'security.md']).status, 2);
    assert.equal(run(['audit-report', 'security.md', '--audit', 'review']).status, 2);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('check-cited-paths collects only backticked path/with/slash.ext spans of the File and Location fields', () => {
  const report = `${SECURITY}
- **Location:** \`api/users\` and \`/api/users\` and \`GET /x\` and \`Button.tsx\` and \`src/ui/Card.tsx:4:2\`
- **Remediation:** \`src/not-a-citation.js\`
`;
  assert.deepEqual(collectFromAuditReport(report).map(c => c.cited), ['src/a.js', 'src/b.js', 'src/ui/Card.tsx']);
});

test('check-cited-paths audit-report fails on a missing path and passes when every cited path exists', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-cited-'));
  try {
    const changeDir = path.join(root, 'openspec', 'changes', 'demo');
    fs.mkdirSync(changeDir, { recursive: true });
    fs.mkdirSync(path.join(root, 'src'));
    fs.writeFileSync(path.join(root, 'src', 'a.js'), '');
    fs.writeFileSync(path.join(changeDir, 'security.md'), SECURITY);
    const run = args => spawnSync(process.execPath, [CITED, 'audit-report', 'demo', ...args, '--root', root], { cwd: root, encoding: 'utf8' });
    const missing = run(['--audit', 'security']);
    assert.equal(missing.status, 1);
    assert.match(missing.stdout, /src\/b\.js/);
    fs.writeFileSync(path.join(root, 'src', 'b.js'), '');
    assert.equal(run(['--audit', 'security']).status, 0);
    assert.equal(run([]).status, 2, 'the audit is required');
    assert.equal(run(['--audit', 'performance']).status, 2, 'a missing report is a tool error');
    assert.equal(run(['--audit', 'security', '--findings']).status, 2);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
