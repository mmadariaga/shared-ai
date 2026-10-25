'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const tool = path.resolve(__dirname, '../sai/tools/check-delta-headers.js');
const requirement = (name, scenarios) => `### Requirement: ${name}\nSHALL behave.\n` +
  scenarios.map(scenario => `#### Scenario: ${scenario}\n- **WHEN** invoked\n- **THEN** works\n`).join('');
const modified = scenarios => `## MODIFIED Requirements\n${requirement('Existing', scenarios)}`;
const exception = (operation = 'remove', extra = {}) => ({
  capability: 'cap', requirement: 'Existing', original_name: 'Two', operation, ...extra,
});

function fixture(t, draft = modified(['One', 'Two']), main = requirement('Existing', ['One', 'Two'])) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-scenarios-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const write = (relative, content) => {
    const file = path.join(root, relative);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
    return file;
  };
  if (main !== null) write('openspec/specs/cap/spec.md', main);
  const draftFile = write('temporary-drafts/specs/cap/spec.md', draft);
  const run = (exceptions, args = []) => {
    const options = ['example', '--json', '--delta-dir', path.dirname(path.dirname(draftFile))];
    if (exceptions !== undefined) {
      options.push('--scenario-exceptions', write('exceptions.json', JSON.stringify(exceptions)));
    }
    const result = spawnSync(process.execPath, [tool, ...options, ...args], { cwd: root, encoding: 'utf8' });
    return { ...result, report: result.stdout ? JSON.parse(result.stdout) : null };
  };
  return { root, write, run };
}

test('E9: reorder, changed body, and new scenarios preserve identities without repository draft writes', t => {
  const f = fixture(t, modified(['Two', 'New', 'One']).replace('invoked', 'changed'));
  const original = fs.readFileSync(path.join(f.root, 'openspec/specs/cap/spec.md'));
  assert.equal(f.run().status, 0);
  assert.deepEqual(fs.readFileSync(path.join(f.root, 'openspec/specs/cap/spec.md')), original);
  assert.equal(fs.existsSync(path.join(f.root, 'openspec/changes')), false);
});

test('E9: missing scenario is a concrete violation', t => {
  const result = fixture(t, modified(['One'])).run();
  assert.equal(result.status, 1);
  assert.equal(result.report.ok, false);
  assert.equal(result.report.violations[0].problem, 'MODIFIED_SCENARIO_MISSING');
  assert.equal(result.report.violations[0].scenario, 'Two');
});

test('E9: unapproved rename fails', t => {
  assert.equal(fixture(t, modified(['One', 'Renamed'])).run().status, 1);
});

test('E10: exact removal and rename exceptions pass', t => {
  assert.equal(fixture(t, modified(['One'])).run([exception()]).status, 0);
  assert.equal(fixture(t, modified(['One', 'Renamed'])).run([
    exception('rename', { new_name: 'Renamed' }),
  ]).status, 0);
});

test('E10: exception permits only the named difference', t => {
  const result = fixture(t, modified(['New'])).run([exception()]);
  assert.equal(result.status, 1);
  assert.deepEqual(result.report.violations.map(v => v.scenario), ['One']);
});

test('E10: moving a scenario to another requirement does not preserve it', t => {
  const draft = modified(['One']) + requirement('Other', ['Two']);
  const main = requirement('Existing', ['One', 'Two']) + requirement('Other', ['Other scenario']);
  const result = fixture(t, draft, main).run();
  assert.equal(result.status, 1);
  assert.ok(result.report.violations.some(v => v.name === 'Existing' && v.scenario === 'Two'));
});

test('E10: rename target must be in the same requirement', t => {
  const f = fixture(t, modified(['One']) + `## ADDED Requirements\n${requirement('New', ['Renamed'])}`);
  assert.equal(f.run([exception('rename', { new_name: 'Renamed' })]).status, 1);
});

for (const override of [{ capability: 'different' }, { requirement: 'Other' }, { original_name: 'two' }]) {
  test(`E10: exception identity is exact ${JSON.stringify(override)}`, t => {
    assert.equal(fixture(t, modified(['One'])).run([exception('remove', override)]).status, 1);
  });
}

test('E10: another capability cannot conceal a missing scenario', t => {
  const f = fixture(t, modified(['One']));
  f.write('openspec/specs/other/spec.md', requirement('Existing', ['Two']));
  f.write('temporary-drafts/specs/other/spec.md', modified(['Two']));
  assert.equal(f.run().status, 1);
});

test('exceptions are narrow, unique, and applicable', t => {
  const f = fixture(t);
  assert.equal(f.run([exception()]).status, 1, 'unused removal');
  for (const invalid of [true, [{}], [exception('anything')], [exception(), exception()],
    [exception('rename')], [exception('remove', { new_name: 'New' })],
    [exception('rename', { new_name: 'Two' })], [exception('remove', { approved: true })]]) {
    assert.equal(f.run(invalid).status, 2, JSON.stringify(invalid));
  }
});

test('E11: missing and malformed exception files cannot disable comparison', t => {
  const f = fixture(t);
  assert.equal(f.run(undefined, ['--scenario-exceptions', path.join(f.root, 'missing')]).status, 2);
  f.write('invalid.json', '{');
  assert.equal(f.run(undefined, ['--scenario-exceptions', path.join(f.root, 'invalid.json')]).status, 2);
  assert.equal(f.run(undefined, ['--scenario-exceptions']).status, 2);
});

for (const main of [
  requirement('Existing', []),
  requirement('Existing', ['One', 'Two', 'Two']),
  requirement('Existing', ['One', 'Two']) + requirement('Existing', ['One']),
  requirement('Existing', ['One', 'Two']).replace('#### Scenario: Two', '### Scenario: Two'),
  requirement('Existing', ['One', 'Two']) + '\n```\n#### Scenario: Hidden\n',
  Buffer.from('### Requirement: Existing\n#### Scenario: One\n\xff', 'latin1'),
]) {
  test('E11: uninterpretable published requirement is not a preservation pass', t => {
    const result = fixture(t, modified(['One', 'Two']), main).run();
    assert.equal(result.status, 2, result.stdout + result.stderr);
    assert.equal(result.report, null);
  });
}

test('E11: unreadable main spec and non-directory specs root report incomplete comparison', t => {
  const f = fixture(t, modified(['One']), null);
  fs.mkdirSync(path.join(f.root, 'openspec/specs/cap/spec.md'), { recursive: true });
  assert.equal(f.run().status, 2);
  const notDirectory = f.write('not-directory', '');
  assert.equal(f.run(undefined, ['--specs-dir', notDirectory]).status, 2);
});

test('E11: malformed temporary MODIFIED content does not pass', t => {
  for (const draft of [modified([]), modified(['One', 'Two', 'Two']),
    modified(['One', 'Two']) + '\n```\n',
    modified(['One', 'Two']) + requirement('Existing', ['One'])]) {
    assert.equal(fixture(t, draft).run().status, 2);
  }
});

test('fenced examples do not count as preserved scenario identities', t => {
  const draft = modified(['One']) + '```markdown\n#### Scenario: Two\n```\n';
  assert.equal(fixture(t, draft).run().status, 1);
  const main = requirement('Existing', ['One', 'Two']) + '\n~~~md\n### Requirement: Example\n#### Scenario: Example\n~~~\n';
  assert.equal(fixture(t, modified(['One', 'Two']), main).run().status, 0);
});

test('CRLF and trailing scenario-heading whitespace preserve names', t => {
  assert.equal(fixture(t, modified(['One', 'Two']).replaceAll('\n', '  \r\n')).run().status, 0);
});

test('requirement-header E1-E5 regression: absent mains, duplicates, missing, mixed, exact matching', t => {
  assert.equal(fixture(t, `## ADDED Requirements\n${requirement('New', ['New'])}`, null).run().status, 0);
  assert.equal(fixture(t, modified(['One']), null).run().report.violations[0].problem, 'MODIFIED_WITHOUT_MAIN_SPEC');
  assert.equal(fixture(t, `## ADDED Requirements\n${requirement('Existing', ['One'])}`).run().report.violations[0].problem, 'ADDED_DUPLICATE');
  assert.equal(fixture(t, `## REMOVED Requirements\n${requirement('Unknown', ['One'])}`).run().report.violations[0].problem, 'REMOVED_MISSING');
  assert.equal(fixture(t, modified(['One', 'Two']) + `## ADDED Requirements\n${requirement('New', ['New'])}`).run().status, 0);
  assert.equal(fixture(t, modified(['One']).replace('Existing', 'existing')).run().report.violations[0].problem, 'MODIFIED_MISSING');
  assert.equal(fixture(t, modified(['one', 'Two'])).run().status, 1);
});

test('shared contracts enforce separate author, receiver, and archive checks on both harnesses', () => {
  const read = relative => fs.readFileSync(path.join(__dirname, '..', relative), 'utf8');
  const policy = read('sai/policies/scenario-preservation.md');
  assert.match(policy, /Claude Code and opencode/);
  assert.match(policy, /worker declaration,[\s\S]*not approval/);
  assert.match(policy, /Metadata is temporary, never a scenario or repository artifact/);
  for (const file of ['sai/commands/backfill/worker.md', 'sai/commands/backfill/coordinator.md',
    'sai/commands/archive/coordinator.md', 'sai/commands/explore/direct-build-coordinator.md']) {
    assert.match(read(file), /Fetch @sai\/policies\/scenario-preservation\.md/);
  }
  assert.match(read('sai/commands/explore/direct-build-coordinator.md'), /cannot be accepted through review-round cap exhaustion/);
});
