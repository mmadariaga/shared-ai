'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const manifest = require('../sai/install-manifest.json');
const { resolveProfile, translate, validateRegistry, projectSource } = require('../bin/capabilities');
const { expandInstallManifest, matrixRenderFor } = require('../bin/install-manifest');
const { verifyAccess, missingNotices } = require('../sai/tools/tool-access');
const { tunableSeedInstaller, stripTunableLines } = require('../bin/install-flow');
const repoRoot = path.join(__dirname, '..');
const registry = manifest.capabilities;

function projected(harness) {
  const base = '/tmp/opencode/sai-capability-projection';
  const destinationRoot = Object.fromEntries(['commands', 'agents', 'sai', 'skills', 'config', 'root'].map(key => [key, path.join(base, harness, key)]));
  return expandInstallManifest(manifest, { harness, repoRoot, destinationRoot });
}

test('all workers, generic agents and commands have canonical assignments', () => {
  validateRegistry(registry);
  for (const entry of manifest['worker-matrix'].entries) {
    assert.ok(registry.assignments.agents[entry.workerName]);
    assert.equal(entry.claudeAgent.tools, undefined);
    assert.equal(entry.opencodeAgent.permissionBlock, undefined);
  }
  for (const harness of ['claude', 'opencode']) {
    for (const file of fs.readdirSync(path.join(repoRoot, 'agents', harness)).filter(file => file !== 'worker-template.md')) {
      assert.ok(registry.assignments.agents[path.basename(file, '.md')]);
    }
    const commands = fs.readdirSync(path.join(repoRoot, 'commands', harness)).map(file => path.basename(file, '.md')).sort();
    assert.deepEqual(Object.keys(registry.assignments.commands).sort(), commands);
    for (const projection of projected(harness)) {
      if (projection.sourceText !== undefined) {
        assert.doesNotMatch(projection.sourceText, /\{\{capability/);
        assert.ok(projection.sourcePath.includes(`${path.sep}.tmp${path.sep}`), 'materialization must never overwrite canonical source');
      }
    }
  }
});

test('write includes creation and modification, while archive mutates only through shell', () => {
  for (const profile of ['worker-write', 'worker-backfill']) {
    const claude = translate(registry, profile, 'claude');
    assert.ok(claude.nativeTools.includes('Edit'));
    assert.ok(claude.nativeTools.includes('Write'));
    assert.ok(translate(registry, profile, 'opencode').permissions.some(rule => rule.action === 'edit' && rule.effect === 'allow'));
    assert.deepEqual(translate(registry, profile, 'opencode').toolRequirements.find(item => item.capability === 'write').anyOf, [['patch'], ['edit', 'write']]);
    assert.ok(claude.nativeTools.includes('PowerShell'));
  }
  for (const harness of ['claude', 'opencode']) {
    const archive = translate(registry, registry.assignments.agents['sai-archive-worker'], harness);
    assert.equal(archive.profile.write, undefined);
    assert.deepEqual(archive.profile.shell, ['*']);
  }
});

test('contract-specific web, auxiliary and delegation access is translated separately', () => {
  assert.equal(resolveProfile(registry, 'worker-implementation').webfetch, true);
  assert.equal(resolveProfile(registry, 'worker-design').webfetch, undefined);
  for (const harness of ['claude', 'opencode']) {
    for (const worker of ['sai-4-red-worker', 'sai-4-green-worker', 'sai-direct-build-worker', 'sai-review-fix-worker']) {
      assert.equal(translate(registry, registry.assignments.agents[worker], harness).profile.delegate, undefined);
    }
  }
  const research = translate(registry, 'research', 'opencode');
  assert.deepEqual(research.permissions[0], { action: '*', resource: '*', effect: 'deny' });
  for (const action of ['execute', 'codegraph_codegraph_explore', 'read', 'glob', 'grep', 'webfetch', 'websearch']) {
    assert.ok(research.permissions.some(rule => rule.action === action && rule.effect === 'allow'));
  }
  assert.ok(!research.permissions.some(rule => ['edit', 'subagent', 'new_tool'].includes(rule.action) && rule.effect === 'allow'));
  assert.ok(research.permissions.some(rule => rule.action === 'external_directory' && rule.resource.endsWith('/opencode/tool-output/*') && rule.effect === 'allow'));
});

test('commands have independent requirements without inventing opencode command permissions', () => {
  for (const harness of ['claude', 'opencode']) {
    const projections = projected(harness);
    assert.equal(projections.filter(item => item.id.startsWith(`${harness}-capability-profile-`)).length, Object.keys(registry.profiles).length);
    const requirements = JSON.parse(projections.find(item => item.id === `${harness}-capability-requirements`).sourceText);
    for (const [name, profile] of Object.entries(registry.assignments.commands)) {
      assert.equal(requirements.commands[name].profileName, profile);
      const wrapper = projections.find(item => path.basename(item.destinationPath) === `${name}.md`).sourceText;
      if (harness === 'claude') assert.match(wrapper, /^allowed-tools: .+/m);
      else assert.doesNotMatch(wrapper, /^(permission|permissions|allowed-tools|agent):/m);
    }
    assert.equal(projections.filter(item => /sai-command-/.test(path.basename(item.destinationPath))).length, 0);
  }
});

test('invalid capabilities and unresolved assignments fail closed', () => {
  assert.throws(() => resolveProfile({ profiles: { x: { extends: 'x' } } }, 'x'), /cycle/);
  assert.throws(() => resolveProfile({ profiles: { x: { unknown: true } } }, 'x'), /Unknown capability/);
  assert.throws(() => translate(registry, 'not-a-profile', 'opencode'), /Unknown capability/);
  assert.throws(() => projectSource('', registry, 'commands', 'not-a-command', 'opencode'), /Missing capability assignment/);
  assert.throws(() => translate(registry, 'boot', 'unsupported'), /Unsupported/);
});

test('evidence distinguishes environment absence, permission blocks and unverified access', () => {
  const required = ['read', 'edit', 'execute', 'shell'].map(action => ({ action, resource: '*' }));
  const report = verifyAccess(required, [
    { action: 'read', resource: '*', available: true, effect: 'allow' },
    { action: 'edit', resource: '*', available: true, effect: 'deny' },
    { action: 'execute', resource: '*', available: false, effect: 'allow' },
  ]);
  assert.equal(report.verdict, 'incomplete');
  assert.deepEqual(report.operations.map(item => item.status), ['allowed', 'permission-blocked', 'unavailable', 'unverified']);
  assert.equal(verifyAccess(required, required.map(item => ({ ...item, available: true, effect: 'allow' }))).verdict, 'pass');
});

test('only applicable granted environmental absences produce notices with remediation', () => {
  const missing = { classification: 'unavailable', tool: 'CodeGraph', reason: 'MCP server unavailable', granted: true, applicable: true, remediation: 'Enable the CodeGraph MCP server.' };
  const discards = [missing, ...['excluded', 'inapplicable', 'instruction-error'].map(classification => ({ ...missing, classification })),
    { ...missing, granted: false }, { ...missing, applicable: false }, { ...missing, remediation: '' }, { level: '1a', reason: 'not available' }];
  assert.deepEqual(missingNotices(discards), ['> Research tool unavailable: CodeGraph — MCP server unavailable. Enable the CodeGraph MCP server.']);
  assert.equal(discards.length, 8, 'internal diagnostics are not discarded');
  const result = spawnSync(process.execPath, [path.join(repoRoot, 'sai/tools/tool-access.js'), 'notices'], { input: JSON.stringify({ ladder_discards: discards }), encoding: 'utf8' });
  assert.equal(result.status, 0);
  assert.deepEqual(JSON.parse(result.stdout).notices, missingNotices(discards));
});

test('worker rendering keeps model/effort/variant seeds and native syntax', () => {
  for (const harness of ['claude', 'opencode']) {
    for (const agent of matrixRenderFor(manifest, harness, repoRoot).filter(item => item.kind === 'agent')) {
      const metadata = agent.entry[harness === 'claude' ? 'claudeAgent' : 'opencodeAgent'];
      assert.match(agent.text, new RegExp(`^model: ${metadata.model.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'm'));
      if (harness === 'claude') assert.match(agent.text, /^effort: /m);
      else { assert.match(agent.text, /^permissions:/m); assert.doesNotMatch(agent.text, /^permission:/m); }
    }
  }
});

test('changing required grants preserves scalar and structured user-owned tunables', () => {
  const root = fs.mkdtempSync('/tmp/opencode/sai-tunable-capabilities-');
  const sourcePath = path.join(root, 'source.md');
  const destinationPath = path.join(root, 'destination.md');
  for (const harness of ['claude', 'opencode']) {
    const extra = harness === 'claude' ? 'effort: high' : 'variant: xhigh';
    const tuning = harness === 'claude' ? `model: "user-model"\n${extra}`
      : `model:\n  providerID: user-provider\n  id: user-model\n${extra}`;
    const old = `---\ndescription: old\n${tuning}\n---\n\nOld body.\n`;
    const source = `---\ndescription: new\nmodel: default-model\n${harness === 'claude' ? 'tools: Read, Write' : 'permissions:\n  - action: edit\n    resource: "*"\n    effect: allow'}\n---\n\nNew body.\n`;
    fs.writeFileSync(sourcePath, source);
    fs.writeFileSync(destinationPath, old.replaceAll('\n', '\r\n'));
    assert.equal(tunableSeedInstaller({ harness, sourcePath, destinationPath }), 'overwritten');
    const actual = fs.readFileSync(destinationPath, 'utf8');
    assert.ok(actual.includes(tuning));
    assert.ok(actual.includes('New body.') && !actual.includes('Old body.'));
    const keys = ['model', harness === 'claude' ? 'effort' : 'variant'];
    assert.deepEqual(stripTunableLines(Buffer.from(actual), keys), stripTunableLines(Buffer.from(source), keys));
    assert.equal(tunableSeedInstaller({ harness, sourcePath, destinationPath }), 'reused');
    assert.equal(fs.readFileSync(destinationPath, 'utf8'), actual);
    assert.ok(!fs.readdirSync(root).some(name => name.includes('owner')));
  }
});
