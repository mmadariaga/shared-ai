'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { makeTempDir, removeInside } = require('../sai/tools/temp-root');
const transfer = require('../sai/tools/transfer');
const { collect, validate } = require('../sai/tools/validate-backfill-drafts');
const tool = path.resolve(__dirname, '../sai/tools/validate-backfill-drafts.js');
const requirement = (name, scenarios) => `### Requirement: ${name}\nThe system SHALL perform the requested behavior reliably.\n` + scenarios.map(name => `#### Scenario: ${name}\n- **WHEN** invoked\n- **THEN** the behavior works\n`).join('');
const original = requirement('Existing', ['One', 'Two']);
const main = body => `# Example Specification\n\n## Purpose\nDescribe the required behavior of the example capability.\n\n## Requirements\n${body}`;
function fixture(t, delta = `## MODIFIED Requirements\n${original}`) {
  const cwd = makeTempDir('opencode', 'draft-test-');
  const { dir } = transfer.open('opencode');
  const write = (relative, bytes) => {
    const file = path.join(cwd, relative);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, bytes);
    return file;
  };
  write('openspec/config.yaml', 'schema: sai-workflow\n');
  fs.cpSync(path.resolve(__dirname, '../openspec/schemas/sai-workflow'), path.join(cwd, 'openspec/schemas/sai-workflow'), { recursive: true });
  write('openspec/specs/cap/spec.md', main(original));
  const input = { change_name: 'example-change', transfer_dir: dir, draft_references: [] };
  const put = (relative, body) => {
    const ref = { ...transfer.put(dir, relative, Buffer.from(body)), destination: `openspec/changes/example-change/${relative}` };
    const index = input.draft_references.findIndex(item => item.destination === ref.destination);
    if (index < 0) input.draft_references.push(ref); else input.draft_references[index] = ref;
    return ref;
  };
  put('.openspec.yaml', 'schema: sai-workflow\ncreated: 2026-10-25\nbackfilled: true\n');
  put('proposal.md', '## Why\nSupport the requested example behavior.\n\n## What Changes\n- Update example behavior.\n\n## Capabilities\n### New Capabilities\n- None\n### Modified Capabilities\n- cap: Example behavior.\n\n## Impact\nExample behavior only.\n');
  put('specs/cap/spec.md', delta);
  const results = [];
  const run = () => { const result = validate(input, { cwd, harness: 'opencode' }); results.push(result); return result; };
  t.after(() => {
    for (const result of results) if (result.project_dir) removeInside('opencode', result.project_dir);
    transfer.close(dir);
    removeInside('opencode', cwd);
  });
  return { cwd, dir, input, write, put, run };
}
const cli = spawnSync('openspec', ['--version'], { encoding: 'utf8', shell: process.platform === 'win32' });
const real = { skip: cli.error || cli.status !== 0 ? 'OpenSpec CLI unavailable' : false };

for (const scenarios of [['One'], ['One', 'Renamed']]) {
  test(`real CLI rejects MODIFIED scenario loss: ${scenarios}`, real, t => {
    const f = fixture(t, `## MODIFIED Requirements\n${requirement('Existing', scenarios)}`);
    const before = fs.readFileSync(path.join(f.cwd, 'openspec/specs/cap/spec.md'));
    const result = f.run();
    assert.equal(result.ok, false, JSON.stringify(result));
    assert.equal(result.diagnostic.exit_code, 1);
    assert.equal(fs.existsSync(path.join(f.cwd, 'openspec/changes')), false);
    assert.deepEqual(fs.readFileSync(path.join(f.cwd, 'openspec/specs/cap/spec.md')), before);
  });
}
test('real CLI accepts reordered, changed, and additional scenarios', real, t => {
  const f = fixture(t, `## MODIFIED Requirements\n${requirement('Existing', ['Two', 'New', 'One']).replace('invoked', 'updated')}`);
  assert.equal(f.run().ok, true);
});
for (const name of ['Existing', 'Replacement']) {
  for (const scenarios of [['One'], ['One', 'Renamed']]) {
    test(`real CLI validates and archives replacement ${name}: ${scenarios}`, real, t => {
      const f = fixture(t, `## REMOVED Requirements\n### Requirement: Existing\n**Reason**: Replace behavior.\n**Migration**: Use the replacement.\n\n## ADDED Requirements\n${requirement(name, scenarios)}`);
      const result = f.run();
      assert.equal(result.ok, name === 'Replacement', JSON.stringify(result));
      // Archive is exercised only in the isolated validation project, never in the source.
      const archive = spawnSync('openspec', ['archive', 'example-change', '--yes', '--json'], { cwd: result.project_dir, encoding: 'utf8', shell: process.platform === 'win32' });
      assert.equal(archive.status === 0, name === 'Replacement', archive.stdout + archive.stderr);
      assert.equal(fs.existsSync(path.join(f.cwd, 'openspec/changes')), false);
    });
  }
}
test('all specifications retain relative paths, even capabilities omitted from drafts', real, t => {
  const f = fixture(t);
  f.write('openspec/specs/nested/untouched/spec.md', main(requirement('Untouched', ['Works'])));
  const result = f.run();
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.deepEqual(fs.readFileSync(path.join(result.project_dir, 'openspec/specs/nested/untouched/spec.md')), fs.readFileSync(path.join(f.cwd, 'openspec/specs/nested/untouched/spec.md')));
  assert.ok(fs.existsSync(path.join(result.project_dir, 'openspec/schemas/sai-workflow/schema.yaml')));
});
test('copied main specification prevents an omitted-baseline false preservation pass', real, t => {
  const f = fixture(t, `## MODIFIED Requirements\n${requirement('Existing', ['One'])}`);
  const result = f.run();
  assert.equal(result.ok, false);
  assert.deepEqual(fs.readFileSync(path.join(result.project_dir, 'openspec/specs/cap/spec.md')), fs.readFileSync(path.join(f.cwd, 'openspec/specs/cap/spec.md')));
});
test('unreadable, symbolic, or incomplete inputs fail without a repository write', t => {
  const f = fixture(t);
  fs.renameSync(path.join(f.cwd, 'openspec/specs/cap/spec.md'), path.join(f.cwd, 'saved-spec.md'));
  fs.mkdirSync(path.join(f.cwd, 'openspec/specs/cap/spec.md/child'), { recursive: true });
  assert.equal(f.run().ok, false);
  assert.equal(fs.existsSync(path.join(f.cwd, 'openspec/changes')), false);
  f.input.draft_references.pop();
  assert.throws(() => collect(f.input, f.cwd), /Incomplete draft set/);
});
test('existing symbolic specification is rejected, not treated as absent', { skip: process.platform === 'win32' }, t => {
  const f = fixture(t);
  fs.renameSync(path.join(f.cwd, 'openspec/specs/cap/spec.md'), path.join(f.cwd, 'saved-spec.md'));
  fs.symlinkSync(path.join(f.cwd, 'saved-spec.md'), path.join(f.cwd, 'openspec/specs/cap/spec.md'));
  // collect directly: validate probes the CLI first, so its error would depend on the CLI being installed.
  assert.throws(() => collect(f.input, f.cwd), /Symbolic input/);
  assert.equal(f.run().ok, false);
  assert.equal(fs.existsSync(path.join(f.cwd, 'openspec/changes')), false);
});
test('freshness binds drafts, references, specifications, configuration, and schemas', real, t => {
  const f = fixture(t);
  const result = f.run();
  assert.equal(result.ok, true, JSON.stringify(result));
  const check = () => spawnSync(process.execPath, [tool, 'check', '--cwd', f.cwd, '--fingerprint', result.fingerprint], { input: JSON.stringify(f.input), encoding: 'utf8' });
  assert.equal(check().status, 0);
  for (const relative of ['openspec/specs/cap/spec.md', 'openspec/config.yaml', 'openspec/schemas/sai-workflow/schema.yaml']) {
    const file = path.join(f.cwd, relative), before = fs.readFileSync(file);
    fs.appendFileSync(file, '\n# changed\n');
    assert.equal(check().status, 1, relative);
    fs.writeFileSync(file, before);
  }
  f.put('specs/cap/spec.md', `## MODIFIED Requirements\n${requirement('Existing', ['One', 'Two', 'New'])}`);
  assert.equal(check().status, 1);
  assert.equal(f.run().ok, true);
  assert.equal(fs.existsSync(path.join(f.cwd, 'openspec/changes')), false);
});
test('missing CLI retains diagnostics and leaves repository drafts absent', t => {
  const f = fixture(t);
  const result = spawnSync(process.execPath, [tool, 'validate', '--harness', 'opencode', '--cwd', f.cwd], { input: JSON.stringify(f.input), encoding: 'utf8', env: { ...process.env, PATH: f.dir } });
  const report = JSON.parse(result.stdout);
  t.after(() => { if (report.project_dir) removeInside('opencode', report.project_dir); });
  assert.equal(report.ok, false);
  assert.equal(report.reason, 'openspec-cli-unavailable');
  assert.equal(report.project_dir, undefined);
  // A missing binary is a spawn error on POSIX; on Windows the shell reports it on stderr with a nonzero exit.
  assert.ok(report.diagnostic.error || (report.diagnostic.exit_code !== 0 && report.diagnostic.stderr));
  assert.equal(fs.existsSync(path.join(f.cwd, 'openspec/changes')), false);
});
test('missing CLI reason wins over invalid drafts', t => {
  const f = fixture(t);
  f.input.draft_references.pop();
  const result = spawnSync(process.execPath, [tool, 'validate', '--harness', 'opencode', '--cwd', f.cwd], { input: JSON.stringify(f.input), encoding: 'utf8', env: { ...process.env, PATH: f.dir } });
  const report = JSON.parse(result.stdout);
  assert.equal(report.ok, false);
  assert.equal(report.reason, 'openspec-cli-unavailable');
});
test('a rejected or incomplete draft set carries no CLI-unavailable reason', real, t => {
  const f = fixture(t, `## MODIFIED Requirements
${requirement('Existing', ['One'])}`);
  const result = f.run();
  assert.equal(result.ok, false);
  assert.equal(result.reason, undefined);
});
test('zero-exit incomplete CLI output cannot authorize writing', { skip: process.platform === 'win32' }, t => {
  const f = fixture(t);
  const executable = path.join(f.dir, 'openspec');
  fs.writeFileSync(executable, '#!/bin/sh\nprintf "{}"\n', { mode: 0o700 });
  const result = spawnSync(process.execPath, [tool, 'validate', '--harness', 'opencode', '--cwd', f.cwd], { input: JSON.stringify(f.input), encoding: 'utf8', env: { ...process.env, PATH: f.dir } });
  const report = JSON.parse(result.stdout);
  t.after(() => { if (report.project_dir) removeInside('opencode', report.project_dir); });
  assert.equal(report.ok, false);
  assert.equal(report.diagnostic.exit_code, 0);
  assert.equal(fs.existsSync(path.join(f.cwd, 'openspec/changes')), false);
});
test('both receivers escalate a missing CLI as force majeure and remove validation projects at accepted closure', () => {
  const policy = fs.readFileSync(path.resolve(__dirname, '../sai/policies/backfill-draft-validation.md'), 'utf8');
  assert.match(policy, /openspec-cli-unavailable/);
  assert.match(policy, /force majeure/);
  for (const file of ['sai/commands/backfill/coordinator.md', 'sai/commands/explore/direct-build-coordinator.md']) {
    const text = fs.readFileSync(path.resolve(__dirname, '..', file), 'utf8');
    assert.match(text, /openspec-cli-unavailable/, file);
    assert.match(text, /temp-root.js remove/, file);
  }
  assert.match(fs.readFileSync(path.resolve(__dirname, '../sai/commands/backfill/coordinator.md'), 'utf8'), /rejection by the OpenSpec CLI validation/);
});
test('both receivers require CLI validation and accepted-input freshness', () => {
  for (const file of ['sai/commands/backfill/coordinator.md', 'sai/commands/explore/direct-build-coordinator.md']) {
    const text = fs.readFileSync(path.resolve(__dirname, '..', file), 'utf8');
    assert.match(text, /Fetch @sai\/policies\/backfill-draft-validation.md/);
    assert.match(text, /freshness check|accepted-fingerprint `check`/);
  }
  assert.match(fs.readFileSync(path.resolve(__dirname, '../sai/commands/backfill/worker.md'), 'utf8'), /failed freshness check writes nothing/);
});
