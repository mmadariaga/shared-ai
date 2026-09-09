'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { spawnSync } = require('child_process');

const { commandCheck, checkSkills, SCHEMA_LINE, REQUIRED_SKILLS } = require('../sai/tools/prereqs.js');

const REPO_ROOT = path.join(__dirname, '..');
const TOOL = path.join(REPO_ROOT, 'sai', 'tools', 'prereqs.js');
const POLICY = path.join(REPO_ROOT, 'sai', 'policies', 'prereqs-check.md');

const LITERALS = [
  'openspec CLI not found. Install it first: https://github.com/Fission-AI/OpenSpec',
  'OpenSpec not initialized in this project. Run: openspec init',
  'openspec/config.yaml does not declare `schema: sai-workflow`. The sai commands require this schema. Add `schema: sai-workflow` to the top of openspec/config.yaml.',
];

function tool(args, cwd) {
  const result = spawnSync(process.execPath, [TOOL, ...args], { cwd, encoding: 'utf8' });
  let payload = null;
  if (result.stdout.trim() && args.includes('--json')) {
    try {
      payload = JSON.parse(result.stdout);
    } catch (err) {
      assert.fail(`tool stdout was not JSON: ${result.stdout}`);
    }
  }
  return { status: result.status, payload, stdout: result.stdout, stderr: result.stderr };
}

function makeProject() {
  return fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), 'sai-prereqs-'));
}

function cleanup(root) {
  fs.rmSync(root, { recursive: true, force: true });
}

test('a missing openspec/ directory halts on the dir check', () => {
  const root = makeProject();
  try {
    const payload = commandCheck(root);
    // The CLI check may pass or fail depending on the machine; either way the
    // verdict is halt and the first failing check is the one reported.
    assert.equal(payload.verdict, 'halt');
    assert.equal(payload.ok, false);
    assert.ok(['cli', 'dir'].includes(payload.failed_check));
    if (payload.failed_check === 'dir') {
      assert.equal(payload.reason, 'openspec-dir-missing');
      assert.match(payload.message, /does not exist/);
    }
  } finally {
    cleanup(root);
  }
});

test('an openspec/config.yaml without the schema line halts on the schema check', () => {
  const root = makeProject();
  try {
    fs.mkdirSync(path.join(root, 'openspec'));
    fs.writeFileSync(path.join(root, 'openspec', 'config.yaml'), 'schema: something-else\n');
    const payload = commandCheck(root);
    assert.equal(payload.verdict, 'halt');
    if (payload.failed_check === 'schema') {
      assert.equal(payload.reason, 'schema-not-declared');
    }
  } finally {
    cleanup(root);
  }
});

test('the schema pattern accepts the declared line and rejects near misses', () => {
  assert.ok(SCHEMA_LINE.test('version: 1\nschema: sai-workflow\n'));
  assert.ok(SCHEMA_LINE.test('schema:   sai-workflow  \nother: x\n'));
  assert.ok(!SCHEMA_LINE.test('schema: sai-workflow-extended\n'));
  assert.ok(!SCHEMA_LINE.test('# schema: sai-workflow\n'));
  assert.ok(!SCHEMA_LINE.test('nested:\n  schema: sai-workflow\n'));
});

test('the tool never reports a remediation literal — the caller owns the phrasing', () => {
  const root = makeProject();
  try {
    const payload = commandCheck(root);
    const serialized = JSON.stringify(payload);
    for (const literal of LITERALS) {
      assert.ok(!serialized.includes(literal), 'the tool must report which check failed, not how to phrase it');
    }
  } finally {
    cleanup(root);
  }
});

test('a failed check exits 1 with a JSON halt payload', () => {
  const root = makeProject();
  try {
    const result = tool(['check', '--json', '--require-openspec-skills', 'claude', '--cwd', root], REPO_ROOT);
    assert.equal(result.status, 1);
    assert.equal(result.payload.verdict, 'halt');
    assert.equal(result.payload.action, 'check');
    assert.ok(typeof result.payload.message === 'string' && result.payload.message.length > 0);
  } finally {
    cleanup(root);
  }
});

test('the harness selector is mandatory: missing or invalid value is a usage error, never a halt', () => {
  for (const args of [
    ['check', '--json'],
    ['check', '--json', '--cwd', REPO_ROOT],
    ['check', '--require-openspec-skills', 'vscode', '--json', '--cwd', REPO_ROOT],
    ['check', '--require-openspec-skills', '--json', '--cwd', REPO_ROOT],
  ]) {
    const result = tool(args, REPO_ROOT);
    assert.equal(result.status, 2, `expected exit 2 for ${args.join(' ')}`);
    assert.ok(!result.stdout.includes('"verdict"'), 'a usage error never yields a verdict');
  }
});

test('the skills check aggregates every missing skill into one failed result', () => {
  const root = makeProject();
  try {
    const first = checkSkills(root, 'claude');
    assert.equal(first.id, 'skills');
    assert.equal(first.passed, false);
    assert.equal(first.reason, 'openspec-skill-missing');
    assert.deepEqual(first.missing_skills, [...REQUIRED_SKILLS]);
    assert.match(first.message, /\.claude[\\/]+skills/);
    assert.ok(REQUIRED_SKILLS.every((name) => first.message.includes(name)));

    // A directory without SKILL.md counts as missing (E1).
    fs.mkdirSync(path.join(root, '.claude', 'skills', 'openspec-explore'), { recursive: true });
    assert.deepEqual(checkSkills(root, 'claude').missing_skills, [...REQUIRED_SKILLS]);

    fs.writeFileSync(path.join(root, '.claude', 'skills', 'openspec-explore', 'SKILL.md'), 'x\n');
    const partial = checkSkills(root, 'claude');
    assert.deepEqual(partial.missing_skills, ['openspec-propose', 'openspec-archive-change']);

    // Copies in the other harness's root do not satisfy the check (E3).
    fs.mkdirSync(path.join(root, '.opencode', 'skills', 'openspec-propose'), { recursive: true });
    fs.writeFileSync(path.join(root, '.opencode', 'skills', 'openspec-propose', 'SKILL.md'), 'x\n');
    assert.deepEqual(checkSkills(root, 'claude').missing_skills, ['openspec-propose', 'openspec-archive-change']);

    // The opencode root resolves to .opencode/skills.
    assert.equal(checkSkills(root, 'opencode').root, path.join(root, '.opencode', 'skills'));

    // All present passes with an empty missing list.
    for (const name of ['openspec-propose', 'openspec-archive-change']) {
      fs.mkdirSync(path.join(root, '.claude', 'skills', name), { recursive: true });
      fs.writeFileSync(path.join(root, '.claude', 'skills', name, 'SKILL.md'), 'x\n');
    }
    const pass = checkSkills(root, 'claude');
    assert.equal(pass.passed, true);
    assert.deepEqual(pass.missing_skills, []);
  } finally {
    cleanup(root);
  }
});

function makeOpenSpecProject(root) {
  fs.mkdirSync(path.join(root, 'openspec'), { recursive: true });
  fs.writeFileSync(path.join(root, 'openspec', 'config.yaml'), 'schema: sai-workflow\n');
}

test('a project whose first three checks pass halts on the skills check with the aggregated payload', () => {
  const root = makeProject();
  try {
    makeOpenSpecProject(root);
    const result = tool(['check', '--json', '--require-openspec-skills', 'claude', '--cwd', root], REPO_ROOT);
    if (result.payload && result.payload.failed_check === 'cli') return; // openspec binary not installed on this machine
    assert.equal(result.status, 1);
    assert.equal(result.payload.failed_check, 'skills');
    assert.equal(result.payload.reason, 'openspec-skill-missing');
    assert.ok(Array.isArray(result.payload.missing_skills) && result.payload.missing_skills.length === 3);
    assert.match(result.payload.message, /\.claude[\\/]+skills/);
  } finally {
    cleanup(root);
  }
});

test('a project with all three skills installed passes with the harness flag', () => {
  const root = makeProject();
  try {
    makeOpenSpecProject(root);
    for (const name of REQUIRED_SKILLS) {
      fs.mkdirSync(path.join(root, '.claude', 'skills', name), { recursive: true });
      fs.writeFileSync(path.join(root, '.claude', 'skills', name, 'SKILL.md'), 'x\n');
    }
    const result = tool(['check', '--json', '--require-openspec-skills', 'claude', '--cwd', root], REPO_ROOT);
    if (result.payload && result.payload.failed_check === 'cli') return; // openspec binary not installed on this machine
    assert.equal(result.status, 0);
    assert.equal(result.payload.verdict, 'pass');
    assert.ok(result.payload.checks.some((check) => check.id === 'skills' && check.passed));
  } finally {
    cleanup(root);
  }
});

test('usage errors exit 2 and print nothing on stdout that looks like a verdict', () => {
  for (const args of [['bogus', '--json'], ['check', 'extra', '--json'], ['check', '--nope']]) {
    const result = tool(args, REPO_ROOT);
    assert.equal(result.status, 2, `expected exit 2 for ${args.join(' ')}`);
    assert.ok(!result.stdout.includes('"verdict"'), 'a usage error never yields a verdict');
  }
  const missingCwd = tool(['check', '--json', '--cwd', path.join(REPO_ROOT, 'no-such-dir')], REPO_ROOT);
  assert.equal(missingCwd.status, 2);
});

test('--help exits 0 and documents the closed exit codes', () => {
  const result = tool(['--help'], REPO_ROOT);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Exit codes: 0 = pass; 1 = halt, a check failed; 2 = usage or IO error\./);
  assert.match(result.stdout, /--json/);
  assert.match(result.stdout, /--cwd/);
});

test('the check policy delegates to the tool and keeps the literals byte-identical', () => {
  const policy = fs.readFileSync(POLICY, 'utf8');
  for (const literal of LITERALS) {
    assert.ok(policy.includes(literal), `the policy lost the verbatim literal: ${literal}`);
  }
  assert.match(policy, /node <tool-path> check --json --cwd <project-root> --require-openspec-skills claude/);
  assert.match(policy, /node <tool-path> check --json --cwd <project-root> --require-openspec-skills opencode/);
  assert.ok(policy.includes('.claude/sai/tools/prereqs.js'));
  assert.ok(policy.includes('~/.config/opencode/sai/tools/prereqs.js'));
  for (const failed of ['cli', 'dir', 'schema', 'skills']) {
    assert.ok(policy.includes(`\`${failed}\``), `the policy must map the ${failed} check to its literal`);
  }
  assert.match(policy, /openspec-skill-missing/);
  assert.match(policy, /missing_skills/);
  assert.match(policy, /openspec init to install them for this harness/);
});

test('the explore delegation runs the tool instead of interpreting the checks', () => {
  const body = fs.readFileSync(path.join(REPO_ROOT, 'sai', 'commands', 'explore', 'body.md'), 'utf8');
  assert.ok(body.includes('sai/tools/prereqs.js'));
  assert.ok(body.includes('failed_check'));
  assert.match(body, /never as `verdict: pass`/);
});
