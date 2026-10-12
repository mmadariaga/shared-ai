'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { PassThrough } = require('node:stream');
const previous = require('../fixtures/implementation-projections-7112f07.json');
const { installClaude, installOpencode } = require('../bin/install-flow');
const { loadInstallManifest, expandRetirementManifest } = require('../bin/install-manifest');
const { enumerateClaude, enumerateOpencode, computePlan, runDeletion } = require('../bin/uninstall-flow');
const { main: doctor } = require('../bin/doctor');
const root = path.join(__dirname, '..');

function writeLegacy(base, harness, divergent = false) {
  return previous[harness].legacy.map(record => {
    const target = path.join(base, record.destination);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    const text = record.text + (divergent ? '\nuser-owned modification\n' : '');
    fs.writeFileSync(target, text);
    return { target, text };
  });
}

test('single-planner retirements pin actual previous projection bytes at the exact old neutral destinations', () => {
  const manifest = loadInstallManifest(root);
  for (const harness of ['claude', 'opencode']) {
    const base = path.join(root, '.tmp', 'category-retirement-inventory', harness);
    const destinationRoot = Object.fromEntries(['root', 'config', 'agents', 'commands', 'sai', 'skills'].map(key => [key, path.join(base, key)]));
    const records = expandRetirementManifest(manifest, { harness, repoRoot: root, destinationRoot });
    for (const legacy of previous[harness].legacy) {
      const retirement = records.filter(record => record.destinationPath === path.join(base, legacy.destination));
      assert.equal(retirement.length, 1);
      assert.deepEqual(retirement[0].managedHashes, [crypto.createHash('sha256').update(legacy.text).digest('hex')]);
    }
  }
});

for (const [harness, install, enumerate] of [
  ['claude', installClaude, enumerateClaude], ['opencode', installOpencode, enumerateOpencode],
]) {
  test(`${harness} upgrades remove exact old agents and bindings, preserve divergent work and retain five live planners`, () => {
    for (const divergent of [false, true]) {
      const base = fs.mkdtempSync(path.join(os.tmpdir(), 'category-retire-install-'));
      const legacy = writeLegacy(base, harness, divergent);
      install(base);
      for (const { target, text } of legacy) {
        assert.equal(fs.existsSync(target), divergent);
        if (divergent) assert.equal(fs.readFileSync(target, 'utf8'), text);
      }
      for (const category of ['ui', 'frontend', 'backend', 'infra', 'other']) {
        assert.ok(fs.existsSync(path.join(base, 'agents', `sai-3-${category}-worker.md`)));
        assert.ok(fs.existsSync(path.join(base, 'sai/orchestration/workers/bindings', `implementation-${category}-worker.md`)));
      }
    }
  });

  test(`${harness} uninstall handles previous managed destinations without deleting divergent files`, () => {
    for (const divergent of [false, true]) {
      const base = fs.mkdtempSync(path.join(os.tmpdir(), 'category-retire-uninstall-'));
      const legacy = writeLegacy(base, harness, divergent);
      const entries = enumerate(base).filter(entry => legacy.some(record => record.target === entry.dest));
      assert.equal(entries.length, 2);
      assert.ok(entries.every(entry => entry.assetType === 'retired-managed-file'));
      const plan = computePlan(entries);
      assert.ok(plan.every(entry => entry.action === (divergent ? 'keep-override' : 'delete')));
      const result = runDeletion(plan);
      assert.equal(result.deleted, divergent ? 0 : 2);
      assert.equal(result.keptOverride, divergent ? 2 : 0);
      for (const { target, text } of legacy) {
        assert.equal(fs.existsSync(target), divergent);
        if (divergent) assert.equal(fs.readFileSync(target, 'utf8'), text);
      }
    }
  });

  test(`${harness} doctor reports recognized and divergent legacy files read-only; reinstall remediates only matching bytes`, async () => {
    const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'category-retire-doctor-'));
    const base = path.join(projectRoot, harness);
    fs.mkdirSync(path.join(projectRoot, 'openspec'), { recursive: true });
    fs.writeFileSync(path.join(projectRoot, 'openspec/config.yaml'), 'schema: sai-workflow\n');
    install(base);
    for (const divergent of [false, true]) {
      const legacy = writeLegacy(base, harness, divergent);
      const out = new PassThrough();
      const chunks = [];
      out.on('data', chunk => chunks.push(chunk));
      await doctor({ argv: ['--json'], projectRoot,
        claudeBase: harness === 'claude' ? base : path.join(projectRoot, 'missing-claude'),
        opencodeBase: harness === 'opencode' ? base : path.join(projectRoot, 'missing-opencode'),
        execOpenspec: () => ({ status: 0, stdout: '1.4.1\n', stderr: '', error: null }), out });
      const report = JSON.parse(Buffer.concat(chunks).toString());
      const warnings = report[harness === 'claude' ? '[Claude Code]' : '[Opencode]']['retired-file'];
      for (const { target, text } of legacy) {
        const warning = warnings.find(record => record.destination === target || record.path === target);
        assert.ok(warning, `doctor names ${target}`);
        assert.equal(warning.recognized, !divergent);
        assert.equal(warning.recommendation, divergent
          ? 'Review and remove this preserved file manually if it is no longer needed'
          : 'Run install/update or uninstall to remove this managed historical copy');
        assert.equal(fs.readFileSync(target, 'utf8'), text, 'doctor never changes legacy content');
      }
      install(base);
      for (const { target, text } of legacy) {
        assert.equal(fs.existsSync(target), divergent);
        if (divergent) assert.equal(fs.readFileSync(target, 'utf8'), text);
      }
    }
  });
}
