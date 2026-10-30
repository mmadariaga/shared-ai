'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { translate, normalizeInstallRoot } = require('../bin/capabilities');
const { loadInstallManifest, expandInstallManifest, matrixRenderFor } = require('../bin/install-manifest');
const flow = require('../bin/install-flow');
const uninstall = require('../bin/uninstall-flow');
const doctor = require('../bin/doctor');

const repoRoot = path.join(__dirname, '..');
const manifest = loadInstallManifest(repoRoot);
const registry = manifest.capabilities;

function tempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function claudeAllowed(profile, installRoot) {
  return translate(registry, profile, 'claude', installRoot).allowedTools.split(', ');
}

function opencodeShellRules(profile, installRoot) {
  return translate(registry, profile, 'opencode', installRoot).permissions
    .filter(rule => rule.action === 'shell' && rule.effect === 'allow').map(rule => rule.resource);
}

test('Claude Code allowed-tools carry the home form and the absolute form for Bash and PowerShell', () => {
  const allowed = claudeAllowed('status-command', 'C:\\Users\\u\\.claude');
  for (const tool of ['Bash', 'PowerShell']) {
    assert.ok(allowed.includes(`${tool}(node ~/.claude/sai/tools/status.js:*)`), `${tool} keeps the ~ form`);
    assert.ok(allowed.includes(`${tool}(node .claude/sai/tools/status.js:*)`), `${tool} keeps the project-local form`);
    assert.ok(allowed.includes(`${tool}(node "C:/Users/u/.claude/sai/tools/status.js":*)`), `${tool} gains the absolute form`);
  }
});

test('opencode shell rules carry the home form and the absolute form of the resolved config base', () => {
  const rules = opencodeShellRules('status-command', 'D:\\xdg config\\opencode');
  assert.ok(rules.includes('node ~/.config/opencode/sai/tools/status.js *'));
  assert.ok(rules.includes('node .opencode/sai/tools/status.js *'));
  assert.ok(rules.includes('node "D:/xdg config/opencode/sai/tools/status.js" *'), 'a root with spaces stays inside the quotes');
});

test('a wildcard path keeps only the opening quote and the harness token still expands', () => {
  const explore = opencodeShellRules('explore-command', '/home/u/.config/opencode');
  assert.ok(explore.includes('node ~/.config/opencode/sai/*'));
  assert.ok(explore.includes('node "/home/u/.config/opencode/sai/*'));
  const backlog = opencodeShellRules('to-backlog-command', '/home/u/.config/opencode');
  assert.ok(backlog.includes('node ~/.config/opencode/skills/to-backlog/scripts/prepare-temp.js opencode'));
  assert.ok(backlog.includes('node "/home/u/.config/opencode/skills/to-backlog/scripts/prepare-temp.js" opencode'));
});

test('skills-rooted patterns gain the absolute form as well', () => {
  const allowed = claudeAllowed('cache-warmer-command', '/Users/u/.claude');
  assert.ok(allowed.includes('Bash(node ~/.claude/skills/sai-cache-warmer/wait.js:*)'));
  assert.ok(allowed.includes('Bash(node "/Users/u/.claude/skills/sai-cache-warmer/wait.js":*)'));
});

test('without an install root only the home and project-local forms are generated', () => {
  assert.ok(opencodeShellRules('status-command').every(rule => !rule.includes('"')));
  assert.ok(claudeAllowed('status-command').every(entry => !entry.includes('"')));
});

test('the install root is written with forward slashes and no trailing separator', () => {
  assert.equal(normalizeInstallRoot('C:\\Users\\u\\.claude\\'), 'C:/Users/u/.claude');
  assert.equal(normalizeInstallRoot('/home/u/.claude'), '/home/u/.claude');
  assert.equal(normalizeInstallRoot(''), undefined);
  assert.equal(normalizeInstallRoot(undefined), undefined);
});

test('expanded permission projections hold the install root while instruction projections stay byte copies', () => {
  const base = tempDir('sai-abs-root-expand-');
  try {
    const roots = { commands: path.join(base, 'commands'), sai: path.join(base, 'sai'), skills: path.join(base, 'skills'), agents: path.join(base, 'agents'), config: base, root: base };
    const posixBase = normalizeInstallRoot(base);
    const projections = expandInstallManifest(manifest, { harness: 'claude', repoRoot, destinationRoot: roots });
    const status = projections.find(projection => projection.destinationPath === path.join(base, 'commands', 'sai-status.md'));
    assert.ok(status.sourceText.includes(`node "${posixBase}/sai/tools/status.js":*`));
    assert.ok(status.sourceText.includes('node ~/.claude/sai/tools/status.js:*'));
    const profile = projections.find(projection => projection.destinationPath === path.join(base, 'sai', 'capabilities', 'status-command.json'));
    assert.ok(profile.sourceText.includes(posixBase));
    const policy = projections.find(projection => projection.destinationPath === path.join(base, 'sai', 'policies', 'tool-resolution.md'));
    assert.equal(policy.sourceText, undefined, 'instruction files are copied from their source untouched');
    assert.ok(fs.readFileSync(policy.sourcePath, 'utf8').includes('~/.claude/sai/tools/<name>'));
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
});

test('worker agent rendering accepts the install root and keeps its wildcard shell rule', () => {
  const agents = matrixRenderFor(manifest, 'opencode', repoRoot, 'C:\\Users\\u\\.config\\opencode').filter(item => item.kind === 'agent');
  assert.ok(agents.length > 0);
  for (const item of agents) assert.match(item.text, /resource: "\*"/);
});

test('installed commands and workers are in sync for doctor and removable by uninstall; a foreign home is drift', () => {
  const base = tempDir('sai-abs-root-install-');
  try {
    flow.installClaude(base);
    const entries = uninstall.enumerateClaude(base);
    assert.deepEqual(doctor.diffAgainstBundled(entries), []);
    const plan = uninstall.computePlan(entries).filter(entry => ['customizable-command', 'claude-managed-agent'].includes(entry.assetType));
    assert.ok(plan.length > 0);
    assert.ok(plan.every(entry => entry.action === 'delete'), 'unmodified generated files are removed');

    const command = path.join(base, 'commands', 'sai-status.md');
    const posixBase = normalizeInstallRoot(base);
    const original = fs.readFileSync(command, 'utf8');
    assert.ok(original.includes(`"${posixBase}/sai/tools/status.js"`));
    fs.writeFileSync(command, original.replaceAll(posixBase, 'C:/Users/someone-else/.claude'));
    assert.ok(doctor.diffAgainstBundled(uninstall.enumerateClaude(base)).some(line => line.includes('sai-status.md') && line.includes('(differs)')));
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
});

test('the customization suffix survives a reinstall that rewrites the root', () => {
  const base = tempDir('sai-abs-root-suffix-');
  try {
    flow.installClaude(base);
    const command = path.join(base, 'commands', 'sai-status.md');
    const marker = '<!-- User customizations below this line -->';
    const text = fs.readFileSync(command, 'utf8');
    assert.ok(text.includes(marker));
    fs.writeFileSync(command, `${text.replace(/\s*$/, '')}\nMy own note about ~/.claude and C:/Users/x/.claude\n`);
    flow.installClaude(base);
    assert.ok(fs.readFileSync(command, 'utf8').endsWith('My own note about ~/.claude and C:/Users/x/.claude\n'));
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
});

test('a project-local refresh names the global install root, not the project root', () => {
  const globalBase = tempDir('sai-abs-root-global-');
  const project = tempDir('sai-abs-root-project-');
  try {
    const projections = flow.projectOverrideProjections('claude', project, repoRoot, globalBase);
    const status = projections.find(projection => path.basename(projection.destinationPath) === 'sai-status.md');
    assert.equal(status.destinationPath, path.join(project, '.claude', 'commands', 'sai-status.md'));
    assert.ok(status.sourceText.includes(`"${normalizeInstallRoot(globalBase)}/sai/tools/status.js"`));
    assert.ok(!status.sourceText.includes(normalizeInstallRoot(project)));
  } finally {
    fs.rmSync(globalBase, { recursive: true, force: true });
    fs.rmSync(project, { recursive: true, force: true });
  }
});

test('the instructions tell the agent to run the global candidate as the absolute path its check returned', () => {
  const read = file => fs.readFileSync(path.join(repoRoot, file), 'utf8');
  for (const file of ['sai/policies/tool-resolution.md', 'sai/policies/prereqs-check.md']) {
    const text = read(file);
    assert.match(text, /absolute path/, file);
    assert.match(text, /node "<absolute path>"/, file);
  }
  assert.match(read('sai/policies/tool-resolution.md'), /never a path you composed/);
  assert.match(read('sai/policies/cache-warming.md'), /absolute path its existence check returned/);
  assert.match(read('sai/policies/tool-resolution.md'), /`~\/\.claude\/sai\/tools\/<name>`/, 'the ~ candidate lists stay');
});
