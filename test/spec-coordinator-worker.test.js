'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..');

function artifact(relativePath) {
  const fullPath = path.join(repoRoot, relativePath);
  assert.ok(fs.existsSync(fullPath), `${relativePath} should exist`);
  return fs.readFileSync(fullPath, 'utf8');
}

test('documentation records the routed spec architecture and proposal-only scope', () => {
  const readme = artifact('README.md');
  const guide = artifact('docs/sequential-pipeline.md');
  const agents = artifact('AGENTS.md');
  for (const harness of ['Claude Code', 'opencode']) {
    assert.match(agents, new RegExp(harness.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
  }
  assert.match(agents, /Claude Code.*rout|rout.*Claude Code/i);
  assert.match(agents, /opencode.*rout|rout.*opencode/i);
  assert.match(agents, /spec.*core|core.*spec/i);
  assert.match(agents, /spec.*worker|worker.*spec/i);
  assert.match(agents, /proposal.*spec|spec.*proposal/i);
  assert.match(readme, /docs\/sequential-pipeline\.md/);
  assert.match(guide, /AGENTS\.md/);
  assert.match(guide, /\/sai-1-spec/);
});

test('AGENTS documents the routed architecture, ownership, and artifact scope', () => {
  const agents = artifact('AGENTS.md');
  for (const harness of ['Claude Code', 'opencode']) {
    assert.match(agents, new RegExp(harness.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
  }
  assert.match(agents, /Claude Code.*rout|rout.*Claude Code/i);
  assert.match(agents, /opencode.*rout|rout.*opencode/i);
  assert.match(agents, /spec.*core|core.*spec/i);
  assert.match(agents, /spec.*worker|worker.*spec/i);
  assert.match(agents, /proposal.*spec|spec.*proposal/i);
});

test('Duplication collapse: spec step files contain no normative block in two files at once', () => {
  const stepPaths = [
    'sai/commands/spec/steps/common.md',
    'sai/commands/spec/steps/research.md',
    'sai/commands/spec/steps/proposal.md',
    'sai/commands/spec/steps/specs.md',
    'sai/commands/spec/steps/validation.md',
  ];

  const blockPatterns = [
    { name: 'Role', pattern: /^## Role$/m },
    { name: 'Cost Discipline', pattern: /^## Cost discipline$/m },
    { name: 'Verification', pattern: /^## Verification$/m },
    { name: 'Research Guide', pattern: /^## Research guide$/m },
    { name: 'Handoff input', pattern: /^## Handoff input$/m },
    { name: 'Completion', pattern: /^## Completion$/m },
    { name: 'Rule #1', pattern: /## Rule #1 — Proposal-to-spec self-consistency gate/ },
    { name: 'Rule #2', pattern: /## Rule #2 — Source-grounding of spec-pinned literals/ },
  ];

  for (const { name, pattern } of blockPatterns) {
    let fileCount = 0;
    let files = [];
    for (const stepPath of stepPaths) {
      const source = artifact(stepPath);
      if (pattern.test(source)) {
        fileCount++;
        files.push(stepPath);
      }
    }
    assert.strictEqual(fileCount, 1, `${name} should appear in exactly one step file, found in: ${files.join(', ')}`);
  }
});

test('Proposal Complexity is retired from the spec path', () => {
  const validation = artifact('sai/commands/spec/steps/validation.md');
  const proposalStep = artifact('sai/commands/spec/steps/proposal.md');
  const template = artifact('openspec/schemas/sai-workflow/templates/proposal.md');
  const schema = artifact('openspec/schemas/sai-workflow/schema.yaml');

  assert.doesNotMatch(validation, /Complexity Derivation Rubric/);
  assert.doesNotMatch(proposalStep, /\*\*Complexity\*\*/);
  assert.doesNotMatch(template, /\*\*Complexity\*\*/);
  assert.match(template, /^## Why$/m);
  assert.doesNotMatch(schema, /\*\*Complexity\*\*: <token>/);
});

