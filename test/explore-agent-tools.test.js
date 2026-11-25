'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { loadInstallManifest, expandInstallManifest } = require('../bin/install-manifest.js');

const repoRoot = path.join(__dirname, '..');
const { readProjected } = require('./helpers/capability-source');
const { translate } = require('../bin/capabilities');
const registry = require('../sai/install-manifest.json').capabilities;
const source = readProjected('agents/opencode/budget-explorer.md');

// Check the ordered permission declarations, not OpenCode's shell scanner.
function permissionRules(text) {
  const block = text.match(/^permissions:\r?\n((?:[ \t].*(?:\r?\n|$))+)/m);
  assert.ok(block, 'the explore agent must extend the built-in permissions');
  const rules = [...block[1].matchAll(
    /^  - action: (\S+)\r?\n    resource: ("(?:[^"\\]|\\.)+")\r?\n    effect: (allow|deny|ask)\r?$/gm,
  )].map(([, action, resource, effect]) => ({ action: JSON.parse(action), resource: JSON.parse(resource), effect }));
  assert.equal(rules.length, (block[1].match(/^  - action:/gm) || []).length,
    'every permission declaration must be checked');
  return rules;
}

test('OpenCode explore grants only the missing read-only research capabilities', () => {
  const rules = permissionRules(source);
  assert.deepEqual(rules, translate(registry, 'research', 'opencode').permissions);
  for (const action of ['read', 'glob', 'grep', 'webfetch', 'websearch', 'execute', 'codegraph_codegraph_explore']) {
    assert.ok(rules.some(rule => rule.action === action && rule.effect === 'allow'));
  }
  assert.doesNotMatch(source, /^permission:/m, 'do not mix V1 and V2 agent permission formats');
  assert.doesNotMatch(source, /^tools:/m, 'do not replace the inherited read/search tool set');
});

test('OpenCode explore allows every skill and keeps general shell, writes and delegation denied', () => {
  const rules = permissionRules(source);
  const skillRules = rules.filter(rule => rule.action === 'skill');
  assert.deepEqual(skillRules, [{ action: 'skill', resource: '*', effect: 'allow' }], 'every skill is allowed and none is denied by name');
  assert.ok(rules.findIndex(rule => rule.action === 'skill') > rules.findIndex(rule => rule.action === '*' && rule.resource === '*' && rule.effect === 'deny'),
    'the skill grant follows the general denial');
  for (const action of ['shell', 'edit', 'subagent', 'question']) {
    const denyIndex = rules.findIndex(rule =>
      (rule.action === action || rule.action === '*') && rule.resource === '*' && rule.effect === 'deny');
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
  }).find(item => item.destinationPath === path.join(destinationRoot.agents, 'budget-explorer.md'));
  assert.ok(projection, 'the canonical explore agent must remain installable');
  assert.equal(projection.strategy, 'tunable-seed');
  const projected = projection.sourceText !== undefined
    ? projection.sourceText : fs.readFileSync(projection.sourcePath, 'utf8');
  assert.deepEqual(permissionRules(projected), permissionRules(readProjected('agents/opencode/budget-explorer.md', destinationRoot.root)));
});

test('Claude Code retains equivalent research tool access and both harnesses load the shared policy', () => {
  const claude = readProjected('agents/claude/budget-explorer.md');
  const tools = claude.match(/^tools: (.+)$/m)[1].split(',').map(tool => tool.trim());
  for (const tool of ['Read', 'Glob', 'Grep', 'Bash', 'WebFetch', 'WebSearch', 'Skill',
    'mcp__codegraph__codegraph_explore']) {
    assert.ok(tools.includes(tool), `Claude Code must retain ${tool}`);
  }
  for (const text of [source, claude]) {
    assert.match(text, /Fetch `@sai\/policies\/explore-agent\.md`/);
  }
});

test('the shared explorer policy states the single-command shell rule and its output-limiting options', () => {
  const policy = fs.readFileSync(path.join(repoRoot, 'sai/policies/explore-agent.md'), 'utf8').replace(/\s+/g, ' ');
  assert.match(policy, /Run one allowed command per shell call, from the project root/);
  assert.match(policy, /no pipe, chaining, redirection, or command substitution/);
  for (const option of ['git grep -l', 'git grep -c', 'git grep --max-count <n>', 'a narrower pathspec']) {
    assert.ok(policy.includes(option), `the policy names ${option}`);
  }
  assert.match(policy, /never with a trailing `\| head`/);
  assert.match(policy, /record `shell operation refused: <description>` in `ladder_discards`/);
});

test('the explorer saves every report through the budget-agent transport, and may run only transfer.js put to do so', () => {
  const policy = fs.readFileSync(path.join(repoRoot, 'sai/policies/explore-agent.md'), 'utf8');
  const saved = policy.slice(policy.indexOf('## Saved report'), policy.indexOf('A dispatch that carries no goal'));
  assert.match(saved, /Fetch `@sai\/policies\/worker-report-transport\.md` and follow its § Budget agents, agent side/);
  assert.match(saved, /first line is `--report-dir <path>`/);
  assert.match(saved, /reply is its `\{path, sha256\}` and the `warming` line only/);
  assert.match(saved, /A task without the `--report-dir` line gets no research/);
  assert.doesNotMatch(policy, /answered in text/);
  assert.match(policy, /and the `transfer\.js put` call of § Saved report/);
  const transport = fs.readFileSync(path.join(repoRoot, 'sai/policies/worker-report-transport.md'), 'utf8');
  assert.match(transport, /put --dir <report-dir> --path <unique-name>\.md --exclusive --input-file <draft>/);
  assert.match(transport, /A name that already exists makes `put` fail and changes nothing: save under another name/);
  for (const harness of ['claude', 'opencode']) {
    const skill = fs.readFileSync(path.join(repoRoot, `skills/${harness}/budget-explorer/SKILL.md`), 'utf8');
    assert.match(skill, /Every spawn prompt opens with the line `--report-dir <dir>`/, harness);
    assert.match(skill, /there is no text reply/, harness);
  }
  assert.doesNotMatch(policy, /\b(?:claude|opencode)\b/i, 'the explorer policy stays harness-neutral');
});
