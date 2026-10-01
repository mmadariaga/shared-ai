'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { loadInstallManifest, expandInstallManifest } = require('../bin/install-manifest.js');

const repoRoot = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(repoRoot, 'agents/opencode/explore.md'), 'utf8');

// Check the ordered permission declarations, not OpenCode's shell scanner.
function permissionRules(text) {
  const block = text.match(/^permissions:\r?\n((?:[ \t].*(?:\r?\n|$))+)/m);
  assert.ok(block, 'the explore agent must extend the built-in permissions');
  const rules = [...block[1].matchAll(
    /^  - action: (\S+)\r?\n    resource: "([^"]+)"\r?\n    effect: (allow|deny|ask)\r?$/gm,
  )].map(([, action, resource, effect]) => ({ action, resource, effect }));
  assert.equal(rules.length, (block[1].match(/^  - action:/gm) || []).length,
    'every permission declaration must be checked');
  return rules;
}

test('OpenCode explore grants only the missing read-only research capabilities', () => {
  const rules = permissionRules(source);
  assert.deepEqual(rules.filter(rule => rule.effect === 'allow'), [
    { action: 'shell', resource: 'codegraph explore *', effect: 'allow' },
    { action: 'shell', resource: 'git grep *', effect: 'allow' },
    { action: 'codegraph_codegraph_explore', resource: '*', effect: 'allow' },
    // MCP access needs the Code Mode bridge; nested tools still enforce their own rules.
    { action: 'execute', resource: '*', effect: 'allow' },
    { action: 'skill', resource: 'fetch', effect: 'allow' },
  ]);
  assert.doesNotMatch(source, /^permission:/m, 'do not mix V1 and V2 agent permission formats');
  assert.doesNotMatch(source, /^tools:/m, 'do not replace the inherited read/search tool set');
});

test('OpenCode explore keeps general shell, other skills, writes and delegation denied', () => {
  const rules = permissionRules(source);
  for (const action of ['shell', 'skill', 'edit', 'subagent', 'question']) {
    const denyIndex = rules.findIndex(rule =>
      rule.action === action && rule.resource === '*' && rule.effect === 'deny');
    assert.ok(denyIndex >= 0, `${action} must have a general denial`);
    for (const [index, rule] of rules.entries()) {
      if (rule.action === action && rule.effect === 'allow') {
        assert.ok(index > denyIndex, 'narrow exceptions must follow the general denial');
        assert.notEqual(rule.resource, '*', `${action} must not gain an unrestricted grant`);
      }
    }
  }
});

test('the managed OpenCode explore projection carries the permission fix', () => {
  const root = path.join(repoRoot, '.projection-test');
  const destinationRoot = Object.fromEntries(
    ['commands', 'sai', 'skills', 'agents', 'config', 'root'].map(key => [key, path.join(root, key)]),
  );
  const projection = expandInstallManifest(loadInstallManifest(repoRoot), {
    harness: 'opencode', repoRoot, destinationRoot,
  }).find(item => item.destinationPath === path.join(destinationRoot.agents, 'explore.md'));
  assert.ok(projection, 'the canonical explore agent must remain installable');
  assert.equal(projection.strategy, 'tunable-seed');
  const projected = projection.sourceText !== undefined
    ? projection.sourceText : fs.readFileSync(projection.sourcePath, 'utf8');
  assert.deepEqual(permissionRules(projected), permissionRules(source));
});

test('Claude Code retains equivalent research tool access and both harnesses load the shared policy', () => {
  const claude = fs.readFileSync(path.join(repoRoot, 'agents/claude/budget-explorer.md'), 'utf8');
  const tools = claude.match(/^tools: (.+)$/m)[1].split(',').map(tool => tool.trim());
  for (const tool of ['Read', 'Glob', 'Grep', 'Bash', 'WebFetch', 'WebSearch', 'Skill',
    'mcp__codegraph__codegraph_explore']) {
    assert.ok(tools.includes(tool), `Claude Code must retain ${tool}`);
  }
  for (const text of [source, claude]) {
    assert.match(text, /Fetch @sai\/policies\/explore-agent\.md/);
  }
});
