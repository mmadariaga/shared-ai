'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const flow = require('../bin/install-flow');
const uninstall = require('../bin/uninstall-flow');
const { AUDIT_RENAMES, migratePreset } = require('../bin/audit-name-migration');
const { recognizedRetirement } = require('../bin/retirement-identity');

for (const harness of ['claude', 'opencode']) {
  const install = base => harness === 'claude' ? flow.installClaude(base) : flow.installOpencode(base);
  const enumerate = base => harness === 'claude' ? uninstall.enumerateClaude(base) : uninstall.enumerateOpencode(base);
  function fixture(t) {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-audit-renumber-'));
    t.after(() => fs.rmSync(base, { recursive: true, force: true }));
    return base;
  }
  test(`${harness}: fresh installation exposes only the continuous audit identities`, t => {
    const base = fixture(t);
    install(base);
    for (const [oldName, newName] of Object.entries(AUDIT_RENAMES)) {
      for (const [folder, suffix] of [['commands', ''], ['agents', '-worker']]) {
        assert.ok(fs.existsSync(path.join(base, folder, `${newName}${suffix}.md`)));
        assert.ok(!fs.existsSync(path.join(base, folder, `${oldName}${suffix}.md`)));
      }
    }
    const review = fs.readFileSync(path.join(base, 'sai/commands/review/steps/close-review-outcome.md'), 'utf8');
    assert.match(review, /sai-5-security/);
    assert.match(review, /sai-6-performance/);
    assert.doesNotMatch(review, /sai-6-security|sai-7-performance|sai-8-accessibility/);
  });
  for (const destinationExists of [false, true]) {
    test(`${harness}: upgrade preserves role settings (destination exists: ${destinationExists})`, t => {
      const base = fixture(t);
      install(base);
      const preset = {};
      let index = 0;
      for (const [oldName, newName] of Object.entries(AUDIT_RENAMES)) {
        index++;
        for (const [folder, suffix] of [['commands', ''], ['agents', '-worker']]) {
          const destination = path.join(base, folder, `${newName}${suffix}.md`);
          const source = fs.readFileSync(destination, 'utf8').replaceAll(newName, oldName);
          const tunable = harness === 'claude' ? 'effort: high' : folder === 'agents' ? 'variant: custom' : '';
          const customized = source.replace(/^model:.*$/m, `model: role-${index}${harness === 'opencode' && folder === 'commands' ? '#custom' : ''}${tunable ? '\n' + tunable : ''}`);
          fs.writeFileSync(path.join(base, folder, `${oldName}${suffix}.md`), customized);
          if (!destinationExists) fs.unlinkSync(destination);
          else fs.writeFileSync(destination, source.replaceAll(oldName, newName).replace(/^model:.*$/m, 'model: destination-owned'));
        }
        preset[`command:${oldName}`] = { model: `preset-${index}` };
        preset[`worker:${oldName}-worker`] = { model: `worker-${index}` };
        if (destinationExists) preset[`command:${newName}`] = { model: 'preset-destination' };
      }
      const presetFile = path.join(base, 'sai/presets/personal.json');
      fs.writeFileSync(presetFile, JSON.stringify(preset));
      install(base);
      // A subsequent reinstall must keep the migrated destination settings too.
      install(base);
      const migrated = JSON.parse(fs.readFileSync(presetFile, 'utf8'));
      index = 0;
      for (const [oldName, newName] of Object.entries(AUDIT_RENAMES)) {
        index++;
        for (const [folder, suffix] of [['commands', ''], ['agents', '-worker']]) {
          assert.ok(!fs.existsSync(path.join(base, folder, `${oldName}${suffix}.md`)));
          const installed = fs.readFileSync(path.join(base, folder, `${newName}${suffix}.md`), 'utf8');
          assert.match(installed, new RegExp(`model: ${destinationExists ? 'destination-owned' : `role-${index}`}`));
          if (!destinationExists && harness === 'opencode') assert.match(installed, folder === 'agents' ? /variant: custom/ : /#custom/);
          if (!destinationExists && harness === 'claude') assert.match(installed, /effort: high/);
        }
        assert.equal(migrated[`command:${newName}`].model, destinationExists ? 'preset-destination' : `preset-${index}`);
        assert.equal(migrated[`worker:${newName}-worker`].model, `worker-${index}`);
        assert.ok(!Object.hasOwn(migrated, `command:${oldName}`));
      }
    });
  }
  test(`${harness}: customized legacy bodies remain pending in install, diagnostics inventory and uninstall`, t => {
    const base = fixture(t);
    install(base);
    for (const [oldName, newName] of Object.entries(AUDIT_RENAMES)) {
      for (const [folder, suffix] of [['commands', ''], ['agents', '-worker']]) {
        const source = fs.readFileSync(path.join(base, folder, `${newName}${suffix}.md`), 'utf8').replaceAll(newName, oldName) + '\nUser-owned instructions.\n';
        const legacy = path.join(base, folder, `${oldName}${suffix}.md`);
        fs.writeFileSync(legacy, source);
      }
    }
    const notices = [];
    const warn = console.warn;
    console.warn = message => notices.push(message);
    try { install(base); } finally { console.warn = warn; }
    assert.equal(notices.filter(line => /Pending resolution: customized retired file/.test(line)).length, 6);
    const pending = enumerate(base).filter(row => row.assetType === 'retired-managed-file' && row.managedBodyHashes && fs.existsSync(row.dest));
    assert.equal(pending.length, 6);
    const diagnostics = require('../bin/doctor').retiredFileRecords(harness, pending);
    assert.equal(diagnostics.length, 6);
    assert.ok(diagnostics.every(record => !record.recognized && record.recommendation.startsWith('Pending resolution:')));
    for (const entry of pending) {
      assert.equal(recognizedRetirement(fs.readFileSync(entry.dest), entry), false);
      assert.equal(uninstall.computePlan([entry])[0].action, 'keep-override');
      console.warn = message => notices.push(message);
      try { assert.equal(uninstall.deleteEntry(entry), 'kept-override'); } finally { console.warn = warn; }
      assert.ok(fs.existsSync(entry.dest));
    }
  });
  test(`${harness}: migration persists settings before cleanup and uninstall recognizes tunable-only legacy files`, t => {
    const base = fixture(t);
    install(base);
    const destination = path.join(base, 'commands/sai-5-security.md');
    const legacy = path.join(base, 'commands/sai-6-security.md');
    const previous = fs.readFileSync(destination, 'utf8').replaceAll('sai-5-security', 'sai-6-security').replace(/^model:.*$/m, 'model: custom-before-cleanup');
    fs.writeFileSync(legacy, previous);
    fs.unlinkSync(destination);
    require('../bin/audit-name-migration').prepare(base);
    assert.match(fs.readFileSync(destination, 'utf8'), /model: custom-before-cleanup/);
    const entry = enumerate(base).find(row => row.dest === legacy && row.assetType === 'retired-managed-file');
    assert.ok(entry);
    assert.equal(uninstall.computePlan([entry])[0].action, 'delete');
    assert.equal(require('../bin/doctor').retiredFileRecords(harness, [entry])[0].recognized, true);
    assert.equal(uninstall.deleteEntry(entry), 'deleted');
    assert.match(fs.readFileSync(destination, 'utf8'), /model: custom-before-cleanup/);
  });
}

test('preset migration preserves explicit destinations, unrelated entries and malformed input', () => {
  assert.equal(migratePreset(null), null);
  const input = { 'command:sai-6-security': { model: 'security' }, 'command:sai-6-performance': { model: 'performance' }, unrelated: { model: 'keep' } };
  const migrated = migratePreset(input);
  assert.equal(migrated['command:sai-5-security'].model, 'security');
  assert.equal(migrated['command:sai-6-performance'].model, 'performance');
  assert.deepEqual(migrated.unrelated, input.unrelated);
});

test('live instructions, usage docs and installed inventories cannot route former security number 6 to performance', () => {
  const root = path.resolve(__dirname, '..');
  const oldNames = /sai-(?:6-security|7-performance|8-accessibility)\b/;
  function inspect(relative) {
    const full = path.join(root, relative);
    if (fs.statSync(full).isDirectory()) {
      for (const entry of fs.readdirSync(full)) inspect(`${relative}/${entry}`);
    } else if (/\.(?:md|json|js)$/.test(relative)) {
      assert.doesNotMatch(fs.readFileSync(full, 'utf8'), oldNames, relative);
    }
  }
  for (const relative of ['commands', 'sai/commands', 'sai/policies', 'sai/presets', 'sai-state/machines', 'docs/commands', 'README.md', 'docs/sequential-pipeline.md', 'docs/models.md', 'docs/review-triage.md']) inspect(relative);
});
