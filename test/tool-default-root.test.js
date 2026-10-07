'use strict';

// The default project root of check-delta-headers.js and check-cited-paths.js
// is the working directory. Every run here starts in a temporary project, so
// the working directory differs from the script location: launched from this
// repository the two roots coincide and a script-relative default would pass.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const TOOLS = path.join(__dirname, '..', 'sai', 'tools');
const DELTA_HEADERS = path.join(TOOLS, 'check-delta-headers.js');
const CITED_PATHS = path.join(TOOLS, 'check-cited-paths.js');
const CHANGE = 'tool-default-root-fixture';

function write(root, relative, content) {
  const file = path.join(root, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

/** A project whose only capability already holds `### Requirement: Existing`. */
function makeProject(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-tool-root-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  write(root, 'openspec/specs/fixture-capability/spec.md', '# Spec\n\n### Requirement: Existing\n');
  write(
    root,
    `openspec/changes/${CHANGE}/specs/fixture-capability/spec.md`,
    '## MODIFIED Requirements\n\n### Requirement: Existing\n',
  );
  write(root, `openspec/changes/${CHANGE}/proposal.md`, '**Local files**: src/only-in-fixture.js\n');
  write(root, 'src/only-in-fixture.js', '');
  return root;
}

function run(tool, args, cwd) {
  return spawnSync(process.execPath, [tool, ...args], { cwd, encoding: 'utf8' });
}

test('check-delta-headers: default root is the working directory', (t) => {
  const project = makeProject(t);
  const res = run(DELTA_HEADERS, [CHANGE, '--json'], project);
  assert.strictEqual(res.status, 0, res.stderr);
  const report = JSON.parse(res.stdout);
  assert.strictEqual(report.ok, true);
  assert.strictEqual(report.capabilities, 1);
  assert.strictEqual(report.checkedRequirements, 1);
});

test('check-delta-headers: default root resolves main specs for --delta-dir', (t) => {
  const project = makeProject(t);
  const staging = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-tool-root-staging-'));
  t.after(() => fs.rmSync(staging, { recursive: true, force: true }));
  write(staging, 'specs/fixture-capability/spec.md', '## ADDED Requirements\n\n### Requirement: Existing\n');
  const res = run(DELTA_HEADERS, [CHANGE, '--json', '--delta-dir', path.join(staging, 'specs')], project);
  assert.strictEqual(res.status, 1, res.stderr);
  assert.strictEqual(JSON.parse(res.stdout).violations[0].problem, 'ADDED_DUPLICATE');
});

test('check-delta-headers: explicit --root wins over the working directory', (t) => {
  const project = makeProject(t);
  const elsewhere = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-tool-root-elsewhere-'));
  t.after(() => fs.rmSync(elsewhere, { recursive: true, force: true }));
  const res = run(DELTA_HEADERS, [CHANGE, '--json', '--root', project], elsewhere);
  assert.strictEqual(res.status, 0, res.stderr);
  assert.strictEqual(JSON.parse(res.stdout).checkedRequirements, 1);
});

test('check-delta-headers: a subdirectory is not searched upward', (t) => {
  const project = makeProject(t);
  const sub = path.join(project, 'src');
  const res = run(DELTA_HEADERS, [CHANGE, '--json'], sub);
  assert.strictEqual(res.status, 2);
  assert.ok(res.stderr.includes(`delta specs directory not found: ${path.join(fs.realpathSync(sub), 'openspec')}`)
    || res.stderr.includes(`delta specs directory not found: ${path.join(sub, 'openspec')}`), res.stderr);
});

test('check-cited-paths: default root is the working directory', (t) => {
  const project = makeProject(t);
  const res = run(CITED_PATHS, ['sai-1', CHANGE, '--json'], project);
  assert.strictEqual(res.status, 0, res.stderr + res.stdout);
  assert.strictEqual(JSON.parse(res.stdout).ok, true);
});

test('check-cited-paths: explicit --root wins over the working directory', (t) => {
  const project = makeProject(t);
  const elsewhere = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-tool-root-elsewhere-'));
  t.after(() => fs.rmSync(elsewhere, { recursive: true, force: true }));
  const res = run(CITED_PATHS, ['sai-1', CHANGE, '--json', '--root', project], elsewhere);
  assert.strictEqual(res.status, 0, res.stderr + res.stdout);
  assert.strictEqual(JSON.parse(res.stdout).ok, true);
});

test('check-cited-paths: a subdirectory is not searched upward', (t) => {
  const project = makeProject(t);
  const res = run(CITED_PATHS, ['sai-1', CHANGE, '--json'], path.join(project, 'src'));
  assert.strictEqual(res.status, 2);
  assert.match(res.stderr, /change directory not found: /);
});

test('help text of both tools names the working directory as the default root', () => {
  for (const tool of [DELTA_HEADERS, CITED_PATHS]) {
    const res = run(tool, ['--help'], os.tmpdir());
    assert.strictEqual(res.status, 0, res.stderr);
    const help = res.stdout.replace(/\s+/g, ' ');
    assert.ok(help.includes('default: the working directory'), help);
    assert.ok(!help.includes('repository containing sai/'), help);
  }
});
