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

// Generated opencode agent bodies carry the platform-resolved SAI temp root; the
// pinned hashes were taken on Linux, so projection runs as Linux.
function asLinux(action) {
  const original = Object.getOwnPropertyDescriptor(process, 'platform');
  Object.defineProperty(process, 'platform', { value: 'linux' });
  try { return action(); } finally { Object.defineProperty(process, 'platform', original); }
}

// The pre-renumbering command wrappers are pinned verbatim: the retired-file
// hashes recognize those bytes, and the current wrappers no longer match them.
const legacyCommand = (harness, newName) => fs.readFileSync(path.join(__dirname, 'fixtures', 'audit-legacy-commands', harness, `${newName}.md`), 'utf8');

for (const harness of ['claude', 'opencode']) {
  const install = base => asLinux(() => harness === 'claude' ? flow.installClaude(base) : flow.installOpencode(base));
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
    test(`${harness}: upgrade keeps only current-name role settings (destination exists: ${destinationExists})`, t => {
      const base = fixture(t);
      install(base);
      const preset = {};
      const factory = new Map();
      let index = 0;
      for (const [oldName, newName] of Object.entries(AUDIT_RENAMES)) {
        index++;
        for (const [folder, suffix] of [['commands', ''], ['agents', '-worker']]) {
          const destination = path.join(base, folder, `${newName}${suffix}.md`);
          factory.set(destination, fs.readFileSync(destination, 'utf8'));
          // A pre-renumbering definition also used the legacy opencode helper
          // grants. Keep this a historical fixture, not a hypothetical hybrid.
          const source = (folder === 'commands' ? legacyCommand(harness, newName)
            : fs.readFileSync(destination, 'utf8').replace('\n<!-- User customizations below this line -->\n', '')).replaceAll(newName, oldName)
            .replaceAll('resource: "budget-explorer"', 'resource: "explore"')
            .replaceAll('resource: "budget-subagent"', 'resource: "budget"');
          const tunable = harness === 'claude' ? 'effort: high' : folder === 'agents' ? 'variant: custom' : '';
          const customized = source.replace(/^(?:effort|variant):.*\r?\n/gm, '')
            .replace(/^model:.*$/m, `model: role-${index}${harness === 'opencode' && folder === 'commands' ? '#custom' : ''}${tunable ? '\n' + tunable : ''}`);
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
          if (destinationExists) assert.match(installed, /model: destination-owned/);
          else assert.equal(installed, factory.get(path.join(base, folder, `${newName}${suffix}.md`)), 'a replacement gets shipped defaults, not obsolete tunables');
        }
        assert.equal(migrated[`command:${newName}`].model, destinationExists ? 'preset-destination' : `preset-${index}`);
        assert.equal(migrated[`worker:${newName}-worker`].model, `worker-${index}`);
        assert.ok(!Object.hasOwn(migrated, `command:${oldName}`));
      }
    });
  }
  test(`${harness}: installer deletes customized retired definitions while standalone uninstall remains guarded`, t => {
    const base = fixture(t);
    install(base);
    for (const [oldName, newName] of Object.entries(AUDIT_RENAMES)) {
      for (const [folder, suffix] of [['commands', ''], ['agents', '-worker']]) {
        const source = fs.readFileSync(path.join(base, folder, `${newName}${suffix}.md`), 'utf8').replaceAll(newName, oldName) + '\nUser-owned instructions.\n';
        const legacy = path.join(base, folder, `${oldName}${suffix}.md`);
        fs.writeFileSync(legacy, source);
      }
    }
    const before = enumerate(base).filter(row => row.assetType === 'retired-managed-file' && row.managedBodyHashes && fs.existsSync(row.dest));
    assert.equal(before.length, 6);
    for (const entry of before) {
      assert.equal(recognizedRetirement(fs.readFileSync(entry.dest), entry), false);
      assert.equal(uninstall.computePlan([entry])[0].action, 'keep-override');
    }
    const notices = [];
    const warn = console.warn;
    console.warn = message => notices.push(message);
    try { install(base); } finally { console.warn = warn; }
    assert.equal(notices.filter(line => /Pending resolution: customized retired file/.test(line)).length, 0);
    const pending = enumerate(base).filter(row => row.assetType === 'retired-managed-file' && row.managedBodyHashes && fs.existsSync(row.dest));
    assert.equal(pending.length, 0);
    const diagnostics = require('../bin/doctor').retiredFileRecords(harness, pending);
    assert.equal(diagnostics.length, 0);
    assert.ok(before.every(entry => !fs.existsSync(entry.dest)));
  });
  test(`${harness}: preparation does not transfer retired tunables and uninstall still recognizes historical files`, t => {
    const base = fixture(t);
    install(base);
    const destination = path.join(base, 'commands/sai-5-security.md');
    const legacy = path.join(base, 'commands/sai-6-security.md');
    const previous = legacyCommand(harness, 'sai-5-security').replaceAll('sai-5-security', 'sai-6-security').replace(/^model:.*$/m, 'model: custom-before-cleanup');
    fs.writeFileSync(legacy, previous);
    fs.unlinkSync(destination);
    require('../bin/audit-name-migration').prepare(base);
    assert.equal(fs.existsSync(destination), false, 'preparation does not clone a retired definition');
    const entry = enumerate(base).find(row => row.dest === legacy && row.assetType === 'retired-managed-file');
    assert.ok(entry);
    assert.equal(uninstall.computePlan([entry])[0].action, 'delete');
    assert.equal(require('../bin/doctor').retiredFileRecords(harness, [entry])[0].recognized, true);
    assert.equal(uninstall.deleteEntry(entry), 'deleted');
    install(base);
    assert.doesNotMatch(fs.readFileSync(destination, 'utf8'), /model: custom-before-cleanup/);
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
