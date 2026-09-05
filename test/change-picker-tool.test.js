'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { spawnSync } = require('child_process');

const { commandResolve, BULK_VALUE } = require('../sai/tools/change-picker.js');

const REPO_ROOT = path.join(__dirname, '..');
const TOOL = path.join(REPO_ROOT, 'sai', 'tools', 'change-picker.js');
const CHANGE_POLICY = path.join(REPO_ROOT, 'sai', 'policies', 'change-picker.md');
const STATUS_POLICY = path.join(REPO_ROOT, 'sai', 'policies', 'status-picker.md');

const STOP_LITERAL = 'No active changes found. Run `/sai-1-spec` to create one.';
const CONFIRM_QUESTION = "Use change '{name}'?";
const SELECT_QUESTION = 'Which change? Enter a number (1-{N}).';
const BULK_QUESTION = 'See all, or which change? Enter a number (1-{N+1}).';
const BULK_SIGNAL = '> BULK-MODE ACTIVE';

/**
 * A stub `openspec` on PATH: the tool reads the active change list from
 * `openspec list --json` and from nothing else, so the list is the only thing
 * a behavioural test has to control.
 */
function makeStub(names) {
  const root = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), 'sai-picker-'));
  const bin = path.join(root, 'bin');
  fs.mkdirSync(bin);
  const payload = JSON.stringify({ changes: names.map(name => ({ name })) });
  const script = path.join(bin, 'openspec-stub.js');
  fs.writeFileSync(script, `process.stdout.write(${JSON.stringify(payload)});\n`);
  fs.writeFileSync(
    path.join(bin, 'openspec'),
    `#!/bin/sh\nexec "${process.execPath}" "${script}"\n`,
    { mode: 0o755 },
  );
  fs.writeFileSync(path.join(bin, 'openspec.cmd'), `@echo off\r\n"${process.execPath}" "${script}"\r\n`);
  return { root, bin };
}

function cleanup(root) {
  fs.rmSync(root, { recursive: true, force: true });
}

function tool(args, bin) {
  const env = { ...process.env, PATH: `${bin}${path.delimiter}${process.env.PATH}` };
  const result = spawnSync(process.execPath, [TOOL, ...args], { cwd: REPO_ROOT, encoding: 'utf8', env });
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

function withStub(names, fn) {
  const stub = makeStub(names);
  try {
    return fn(stub);
  } finally {
    cleanup(stub.root);
  }
}

test('a supplied name wins outright and the change list is never consulted', () => {
  // No stub on PATH: reaching `openspec list --json` at all would fail here.
  const payload = commandResolve(REPO_ROOT, '  add-widget  ');
  assert.equal(payload.outcome, 'supplied');
  assert.equal(payload.resolved_name, 'add-widget');
  assert.equal(payload.changes, null);
  assert.deepEqual(payload.options, []);
});

test('zero changes refuses with exit 1 so the caller prints its STOP literal', () => {
  withStub([], stub => {
    const result = tool(['resolve', '--json', '--cwd', REPO_ROOT], stub.bin);
    assert.equal(result.status, 1);
    assert.equal(result.payload.refused, true);
    assert.equal(result.payload.reason, 'no-active-changes');
    assert.equal(result.payload.outcome, 'none');
  });
});

test('exactly one change reports the candidate and a yes/no option set', () => {
  withStub(['only-change'], stub => {
    const result = tool(['resolve', '--json', '--cwd', REPO_ROOT], stub.bin);
    assert.equal(result.status, 0);
    assert.equal(result.payload.outcome, 'confirm');
    assert.equal(result.payload.candidate, 'only-change');
    assert.equal(result.payload.resolved_name, null);
    assert.deepEqual(result.payload.options.map(o => o.label), ['yes', 'no']);
  });
});

test('the one-change branch never offers the bulk option, even with --bulk-option', () => {
  withStub(['only-change'], stub => {
    const result = tool(['resolve', '--json', '--bulk-option', '--cwd', REPO_ROOT], stub.bin);
    assert.equal(result.payload.outcome, 'confirm');
    assert.ok(!result.payload.options.some(o => o.value === BULK_VALUE));
  });
});

test('two or more changes report one option per change in list order', () => {
  withStub(['alpha', 'beta', 'gamma'], stub => {
    const result = tool(['resolve', '--json', '--cwd', REPO_ROOT], stub.bin);
    assert.equal(result.status, 0);
    assert.equal(result.payload.outcome, 'select');
    assert.deepEqual(result.payload.options.map(o => o.value), ['alpha', 'beta', 'gamma']);
    assert.equal(result.payload.option_count, 3);
  });
});

test('--bulk-option prepends See all and is the only difference between the two pickers', () => {
  withStub(['alpha', 'beta'], stub => {
    const plain = tool(['resolve', '--json', '--cwd', REPO_ROOT], stub.bin).payload;
    const bulk = tool(['resolve', '--json', '--bulk-option', '--cwd', REPO_ROOT], stub.bin).payload;
    assert.deepEqual(bulk.options[0], { label: 'See all', value: BULK_VALUE });
    assert.deepEqual(bulk.options.slice(1), plain.options);
    assert.equal(bulk.option_count, plain.option_count + 1);
  });
});

test('the tool never carries a question or a STOP literal — the caller owns the wording', () => {
  for (const names of [[], ['one'], ['alpha', 'beta']]) {
    withStub(names, stub => {
      for (const args of [['resolve', '--json', '--cwd', REPO_ROOT], ['resolve', '--json', '--bulk-option', '--cwd', REPO_ROOT]]) {
        const serialized = tool(args, stub.bin).stdout;
        for (const literal of [STOP_LITERAL, CONFIRM_QUESTION, SELECT_QUESTION, BULK_QUESTION, BULK_SIGNAL, 'Which change?']) {
          assert.ok(!serialized.includes(literal), `the tool must resolve, not ask: leaked ${literal}`);
        }
      }
    });
  }
});

test('usage errors exit 2 and yield no outcome', () => {
  withStub(['alpha'], stub => {
    for (const args of [['bogus', '--json'], ['resolve', 'a', 'b', '--json'], ['resolve', '--nope']]) {
      const result = tool(args, stub.bin);
      assert.equal(result.status, 2, `expected exit 2 for ${args.join(' ')}`);
      assert.ok(!result.stdout.includes('"outcome"'), 'a usage error never yields an outcome');
    }
    const missingCwd = tool(['resolve', '--json', '--cwd', path.join(REPO_ROOT, 'no-such-dir')], stub.bin);
    assert.equal(missingCwd.status, 2);
  });
});

test('--help exits 0 and documents the closed exit codes', () => {
  withStub([], stub => {
    const result = tool(['--help'], stub.bin);
    assert.equal(result.status, 0);
    assert.match(result.stdout, /--bulk-option/);
    assert.match(result.stdout, /--json/);
    assert.match(result.stdout, /--cwd/);
    assert.match(result.stdout, /Exit codes: 0 = resolved or option set reported; 1 = refused, no active/);
  });
});

test('both pickers delegate to the one tool and keep their literals byte-identical', () => {
  const change = fs.readFileSync(CHANGE_POLICY, 'utf8');
  const status = fs.readFileSync(STATUS_POLICY, 'utf8');

  for (const policy of [change, status]) {
    assert.ok(policy.includes('sai/tools/change-picker.js'));
    assert.ok(policy.includes(STOP_LITERAL), 'the zero-changes STOP literal must survive verbatim');
    assert.ok(policy.includes(CONFIRM_QUESTION));
    assert.ok(policy.includes("Use change '{name}'? (yes/no)"));
    assert.ok(policy.includes('`outcome: confirm`'));
    assert.ok(policy.includes('`outcome: select`'));
  }

  assert.match(change, /node <tool-path> resolve "<arguments_value>" --json --cwd <project-root>/);
  assert.ok(change.includes(SELECT_QUESTION));
  assert.ok(!change.includes('--bulk-option'), 'only sai-status asks for the bulk-view option');
  assert.ok(change.includes('.claude/sai/tools/change-picker.js'));
  assert.ok(change.includes('~/.config/opencode/sai/tools/change-picker.js'));

  assert.match(status, /node <tool-path> resolve "<arguments_value>" --bulk-option --json --cwd <project-root>/);
  assert.ok(status.includes(BULK_QUESTION));
  assert.ok(status.includes(BULK_SIGNAL));
  assert.ok(status.includes(`\`${BULK_VALUE}\``), 'the bulk option is recognised by the value the tool reports');
});

test('the resolution logic is no longer duplicated as prose in either policy', () => {
  for (const file of [CHANGE_POLICY, STATUS_POLICY]) {
    const policy = fs.readFileSync(file, 'utf8');
    assert.ok(
      !/Run `openspec list --json` and parse the `changes` array/.test(policy),
      `${path.basename(file)} must read the change list through the tool, not re-derive it`,
    );
  }
});
