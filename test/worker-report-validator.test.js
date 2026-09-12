'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { spawnSync } = require('child_process');

const REPO_ROOT = path.join(__dirname, '..');
const TOOL = path.join(REPO_ROOT, 'sai', 'tools', 'worker-report-validator.js');

function tool(stdinData, args, cwd = REPO_ROOT) {
  const result = spawnSync(process.execPath, [TOOL, ...args], {
    cwd,
    input: stdinData,
    encoding: 'utf8',
  });
  let payload = null;
  if (result.stdout.trim() && args.includes('--json')) {
    try {
      payload = JSON.parse(result.stdout);
    } catch (err) {
      assert.fail(`tool stdout was not valid JSON: ${result.stdout}`);
    }
  }
  return { status: result.status, payload, stdout: result.stdout, stderr: result.stderr };
}

test('validate terminal payload - completed (valid)', () => {
  const payload = {
    status: 'completed',
    emitted_on: '2026-09-12T14:30:15+02:00',
    summary: 'Task completed successfully',
    changed_files: ['file1.js', 'file2.js'],
    resolved_change_name: 'test-change',
  };
  const result = tool(JSON.stringify(payload), ['validate', '--kind', 'terminal', '--json']);
  assert.equal(result.status, 0);
  assert.equal(result.payload.ok, true);
  assert.equal(result.payload.errors.length, 0);
});

test('validate terminal payload - needs_input (valid)', () => {
  const payload = {
    status: 'needs_input',
    emitted_on: '2026-09-12T14:30:15+02:00',
    summary: 'Awaiting user input',
    changed_files: [],
    question: 'What is your choice?',
    options: [
      { label: 'Option A', value: 'a' },
      { label: 'Option B', value: 'b' },
    ],
  };
  const result = tool(JSON.stringify(payload), ['validate', '--kind', 'terminal', '--json']);
  assert.equal(result.status, 0);
  assert.equal(result.payload.ok, true);
  assert.equal(result.payload.errors.length, 0);
});

test('validate terminal payload - failed with failure_class (valid)', () => {
  const payload = {
    status: 'failed',
    emitted_on: '2026-09-12T14:30:15+02:00',
    summary: 'Task failed',
    changed_files: [],
    resolved_change_name: 'test-change',
    failure_class: 'validation-failed',
    unrecoverable: false,
  };
  const result = tool(JSON.stringify(payload), ['validate', '--kind', 'terminal', '--json']);
  assert.equal(result.status, 0);
  assert.equal(result.payload.ok, true);
});

test('validate terminal payload - missing status field', () => {
  const payload = {
    emitted_on: '2026-09-12T14:30:15+02:00',
    summary: 'Task completed',
    changed_files: [],
  };
  const result = tool(JSON.stringify(payload), ['validate', '--kind', 'terminal', '--json']);
  assert.equal(result.status, 1);
  assert.equal(result.payload.ok, false);
  assert.ok(result.payload.errors.some((e) => e.includes('status is missing')));
});

test('validate terminal payload - invalid status value', () => {
  const payload = {
    status: 'invalid-status',
    emitted_on: '2026-09-12T14:30:15+02:00',
    summary: 'Task completed',
    changed_files: [],
  };
  const result = tool(JSON.stringify(payload), ['validate', '--kind', 'terminal', '--json']);
  assert.equal(result.status, 1);
  assert.equal(result.payload.ok, false);
  assert.ok(result.payload.errors.some((e) => e.includes('status must be one of')));
});

test('validate terminal payload - emitted_on with Z designator (invalid)', () => {
  const payload = {
    status: 'completed',
    emitted_on: '2026-09-12T14:30:15Z',
    summary: 'Task completed',
    changed_files: [],
  };
  const result = tool(JSON.stringify(payload), ['validate', '--kind', 'terminal', '--json']);
  assert.equal(result.status, 1);
  assert.equal(result.payload.ok, false);
  assert.ok(result.payload.errors.some((e) => e.includes('Z designator not allowed')));
});

test('validate terminal payload - emitted_on missing offset (invalid)', () => {
  const payload = {
    status: 'completed',
    emitted_on: '2026-09-12T14:30:15',
    summary: 'Task completed',
    changed_files: [],
  };
  const result = tool(JSON.stringify(payload), ['validate', '--kind', 'terminal', '--json']);
  assert.equal(result.status, 1);
  assert.equal(result.payload.ok, false);
  assert.ok(result.payload.errors.some((e) => e.includes('emitted_on must be ISO-8601')));
});

test('validate terminal payload - missing emitted_on field', () => {
  const payload = {
    status: 'completed',
    summary: 'Task completed',
    changed_files: [],
  };
  const result = tool(JSON.stringify(payload), ['validate', '--kind', 'terminal', '--json']);
  assert.equal(result.status, 1);
  assert.equal(result.payload.ok, false);
});

test('validate terminal payload - missing summary field', () => {
  const payload = {
    status: 'completed',
    emitted_on: '2026-09-12T14:30:15+02:00',
    changed_files: [],
  };
  const result = tool(JSON.stringify(payload), ['validate', '--kind', 'terminal', '--json']);
  assert.equal(result.status, 1);
  assert.equal(result.payload.ok, false);
  assert.ok(result.payload.errors.some((e) => e.includes('summary is missing')));
});

test('validate terminal payload - missing changed_files field', () => {
  const payload = {
    status: 'completed',
    emitted_on: '2026-09-12T14:30:15+02:00',
    summary: 'Task completed',
  };
  const result = tool(JSON.stringify(payload), ['validate', '--kind', 'terminal', '--json']);
  assert.equal(result.status, 1);
  assert.equal(result.payload.ok, false);
  assert.ok(result.payload.errors.some((e) => e.includes('changed_files is missing')));
});

test('validate terminal payload - needs_input missing question', () => {
  const payload = {
    status: 'needs_input',
    emitted_on: '2026-09-12T14:30:15+02:00',
    summary: 'Awaiting input',
    changed_files: [],
    options: [{ label: 'A', value: 'a' }],
  };
  const result = tool(JSON.stringify(payload), ['validate', '--kind', 'terminal', '--json']);
  assert.equal(result.status, 1);
  assert.equal(result.payload.ok, false);
  assert.ok(result.payload.errors.some((e) => e.includes('question is missing')));
});

test('validate terminal payload - needs_input missing options', () => {
  const payload = {
    status: 'needs_input',
    emitted_on: '2026-09-12T14:30:15+02:00',
    summary: 'Awaiting input',
    changed_files: [],
    question: 'Choose one',
  };
  const result = tool(JSON.stringify(payload), ['validate', '--kind', 'terminal', '--json']);
  assert.equal(result.status, 1);
  assert.equal(result.payload.ok, false);
  assert.ok(result.payload.errors.some((e) => e.includes('options is missing')));
});

test('validate terminal payload - failed post-resolution missing failure_class', () => {
  const payload = {
    status: 'failed',
    emitted_on: '2026-09-12T14:30:15+02:00',
    summary: 'Task failed',
    changed_files: [],
    resolved_change_name: 'test-change',
    unrecoverable: false,
  };
  const result = tool(JSON.stringify(payload), ['validate', '--kind', 'terminal', '--json']);
  assert.equal(result.status, 1);
  assert.equal(result.payload.ok, false);
  assert.ok(result.payload.errors.some((e) => e.includes('failure_class is missing')));
});

test('validate terminal payload - invalid failure_class', () => {
  const payload = {
    status: 'failed',
    emitted_on: '2026-09-12T14:30:15+02:00',
    summary: 'Task failed',
    changed_files: [],
    resolved_change_name: 'test-change',
    failure_class: 'unknown-failure',
    unrecoverable: false,
  };
  const result = tool(JSON.stringify(payload), ['validate', '--kind', 'terminal', '--json']);
  assert.equal(result.status, 1);
  assert.equal(result.payload.ok, false);
  assert.ok(result.payload.errors.some((e) => e.includes('failure_class must be one of')));
});

test('validate notice payload (valid)', () => {
  const payload = {
    event: 'notice',
    emitted_on: '2026-09-12T14:30:15+02:00',
    message: 'This is a notice',
    changed_files: ['file1.js'],
  };
  const result = tool(JSON.stringify(payload), ['validate', '--kind', 'notice', '--json']);
  assert.equal(result.status, 0);
  assert.equal(result.payload.ok, true);
});

test('validate notice payload - missing event field', () => {
  const payload = {
    emitted_on: '2026-09-12T14:30:15+02:00',
    message: 'This is a notice',
    changed_files: [],
  };
  const result = tool(JSON.stringify(payload), ['validate', '--kind', 'notice', '--json']);
  assert.equal(result.status, 1);
  assert.equal(result.payload.ok, false);
  assert.ok(result.payload.errors.some((e) => e.includes('event is missing')));
});

test('validate notice payload - wrong event value', () => {
  const payload = {
    event: 'progress',
    emitted_on: '2026-09-12T14:30:15+02:00',
    message: 'This is a notice',
    changed_files: [],
  };
  const result = tool(JSON.stringify(payload), ['validate', '--kind', 'notice', '--json']);
  assert.equal(result.status, 1);
  assert.equal(result.payload.ok, false);
  assert.ok(result.payload.errors.some((e) => e.includes('event must be "notice"')));
});

test('validate progress payload (valid)', () => {
  const payload = {
    event: 'progress',
    emitted_on: '2026-09-12T14:30:15+02:00',
    step_ids: ['step1', 'step2'],
    changed_files: ['file1.js'],
  };
  const result = tool(JSON.stringify(payload), ['validate', '--kind', 'progress', '--json']);
  assert.equal(result.status, 0);
  assert.equal(result.payload.ok, true);
});

test('validate progress payload - missing step_ids', () => {
  const payload = {
    event: 'progress',
    emitted_on: '2026-09-12T14:30:15+02:00',
    changed_files: [],
  };
  const result = tool(JSON.stringify(payload), ['validate', '--kind', 'progress', '--json']);
  assert.equal(result.status, 1);
  assert.equal(result.payload.ok, false);
  assert.ok(result.payload.errors.some((e) => e.includes('step_ids is missing')));
});

test('validate conflict_detected payload (valid)', () => {
  const payload = {
    event: 'conflict_detected',
    emitted_on: '2026-09-12T14:30:15+02:00',
    summary: 'Conflict detected',
    changed_files: ['file1.js'],
    affected_files: ['file1.js'],
    continuation_state: 'language-selection',
  };
  const result = tool(JSON.stringify(payload), ['validate', '--kind', 'conflict_detected', '--json']);
  assert.equal(result.status, 0);
  assert.equal(result.payload.ok, true);
});

test('validate conflict_detected payload - invalid continuation_state', () => {
  const payload = {
    event: 'conflict_detected',
    emitted_on: '2026-09-12T14:30:15+02:00',
    summary: 'Conflict detected',
    changed_files: [],
    affected_files: [],
    continuation_state: 'invalid-state',
  };
  const result = tool(JSON.stringify(payload), ['validate', '--kind', 'conflict_detected', '--json']);
  assert.equal(result.status, 1);
  assert.equal(result.payload.ok, false);
  assert.ok(result.payload.errors.some((e) => e.includes('continuation_state must be one of')));
});

test('validate with missing --kind flag', () => {
  const payload = {
    status: 'completed',
    emitted_on: '2026-09-12T14:30:15+02:00',
    summary: 'Task completed',
    changed_files: [],
  };
  const result = tool(JSON.stringify(payload), ['validate', '--json']);
  assert.equal(result.status, 2);
  assert.ok(result.stderr.includes('validate requires --kind'));
});

test('validate with invalid --kind value', () => {
  const payload = {
    status: 'completed',
    emitted_on: '2026-09-12T14:30:15+02:00',
    summary: 'Task completed',
    changed_files: [],
  };
  const result = tool(JSON.stringify(payload), ['validate', '--kind', 'invalid-kind', '--json']);
  assert.equal(result.status, 2);
  assert.ok(result.stderr.includes('invalid --kind value'));
});

test('validate with malformed JSON input', () => {
  const result = tool('{ invalid json }', ['validate', '--kind', 'terminal', '--json']);
  assert.equal(result.status, 1);
  assert.equal(result.payload.ok, false);
  assert.ok(result.payload.errors.some((e) => e.includes('invalid JSON')));
});

test('validate with non-object JSON input', () => {
  const result = tool('"just a string"', ['validate', '--kind', 'terminal', '--json']);
  assert.equal(result.status, 1);
  assert.equal(result.payload.ok, false);
  assert.ok(result.payload.errors.some((e) => e.includes('must be a JSON object')));
});

test('validate with help flag', () => {
  const result = tool('', ['--help']);
  assert.equal(result.status, 0);
  assert.ok(result.stdout.includes('Usage:'));
  assert.ok(result.stdout.includes('validate'));
});

test('validate with unknown flag', () => {
  const result = tool('{}', ['validate', '--unknown-flag']);
  assert.equal(result.status, 2);
  assert.ok(result.stderr.includes('unknown flag'));
});

test('validate terminal - changed_files not an array', () => {
  const payload = {
    status: 'completed',
    emitted_on: '2026-09-12T14:30:15+02:00',
    summary: 'Task completed',
    changed_files: 'not-an-array',
  };
  const result = tool(JSON.stringify(payload), ['validate', '--kind', 'terminal', '--json']);
  assert.equal(result.status, 1);
  assert.equal(result.payload.ok, false);
  assert.ok(result.payload.errors.some((e) => e.includes('changed_files must be an array')));
});

test('validate terminal - changed_files with non-string element', () => {
  const payload = {
    status: 'completed',
    emitted_on: '2026-09-12T14:30:15+02:00',
    summary: 'Task completed',
    changed_files: ['file1.js', 123],
  };
  const result = tool(JSON.stringify(payload), ['validate', '--kind', 'terminal', '--json']);
  assert.equal(result.status, 1);
  assert.equal(result.payload.ok, false);
  assert.ok(result.payload.errors.some((e) => e.includes('must be an array of strings')));
});

test('validate terminal - summary is not a string', () => {
  const payload = {
    status: 'completed',
    emitted_on: '2026-09-12T14:30:15+02:00',
    summary: 123,
    changed_files: [],
  };
  const result = tool(JSON.stringify(payload), ['validate', '--kind', 'terminal', '--json']);
  assert.equal(result.status, 1);
  assert.equal(result.payload.ok, false);
  assert.ok(result.payload.errors.some((e) => e.includes('summary must be a string')));
});

test('validate with empty stdin', () => {
  const result = tool('', ['validate', '--kind', 'terminal', '--json']);
  assert.equal(result.status, 1);
  assert.equal(result.payload.ok, false);
  assert.ok(result.payload.errors.some((e) => e.includes('invalid JSON')));
});

test('text output format for valid payload', () => {
  const payload = {
    status: 'completed',
    emitted_on: '2026-09-12T14:30:15+02:00',
    summary: 'Task completed',
    changed_files: [],
  };
  const result = tool(JSON.stringify(payload), ['validate', '--kind', 'terminal']);
  assert.equal(result.status, 0);
  assert.ok(result.stdout.includes('valid'));
  assert.ok(result.stdout.includes('terminal'));
});

test('text output format for invalid payload', () => {
  const payload = {
    status: 'invalid',
    emitted_on: '2026-09-12T14:30:15+02:00',
    summary: 'Task completed',
    changed_files: [],
  };
  const result = tool(JSON.stringify(payload), ['validate', '--kind', 'terminal']);
  assert.equal(result.status, 1);
  assert.ok(result.stdout.includes('invalid'));
});

test('validate cancelled status', () => {
  const payload = {
    status: 'cancelled',
    emitted_on: '2026-09-12T14:30:15+02:00',
    summary: 'Task cancelled',
    changed_files: [],
  };
  const result = tool(JSON.stringify(payload), ['validate', '--kind', 'terminal', '--json']);
  assert.equal(result.status, 0);
  assert.equal(result.payload.ok, true);
});

test('validate progress payload with empty step_ids', () => {
  const payload = {
    event: 'progress',
    emitted_on: '2026-09-12T14:30:15+02:00',
    step_ids: [],
    changed_files: [],
  };
  const result = tool(JSON.stringify(payload), ['validate', '--kind', 'progress', '--json']);
  assert.equal(result.status, 0);
  assert.equal(result.payload.ok, true);
});

test('validate all valid failure classes', () => {
  const failureClasses = [
    'blocking-contradiction',
    'validation-failed',
    'generation-error',
    'dispatch-failed',
    'envelope-contract-violation',
    'unclassified-worker-fault',
  ];

  for (const failureClass of failureClasses) {
    const payload = {
      status: 'failed',
      emitted_on: '2026-09-12T14:30:15+02:00',
      summary: 'Task failed',
      changed_files: [],
      resolved_change_name: 'test-change',
      failure_class: failureClass,
      unrecoverable: false,
    };
    const result = tool(JSON.stringify(payload), ['validate', '--kind', 'terminal', '--json']);
    assert.equal(result.status, 0, `failed to validate failure_class: ${failureClass}`);
    assert.equal(result.payload.ok, true);
  }
});

test('validate emitted_on with different valid offsets', () => {
  const validOffsets = [
    '2026-09-12T14:30:15+00:00',
    '2026-09-12T14:30:15-05:00',
    '2026-09-12T14:30:15+13:00',
    '2026-09-12T14:30:15-12:00',
  ];

  for (const offset of validOffsets) {
    const payload = {
      status: 'completed',
      emitted_on: offset,
      summary: 'Task completed',
      changed_files: [],
    };
    const result = tool(JSON.stringify(payload), ['validate', '--kind', 'terminal', '--json']);
    assert.equal(result.status, 0, `failed to validate offset: ${offset}`);
    assert.equal(result.payload.ok, true);
  }
});

test('validate conflict_detected with strategy-analysis state', () => {
  const payload = {
    event: 'conflict_detected',
    emitted_on: '2026-09-12T14:30:15+02:00',
    summary: 'Conflict detected',
    changed_files: [],
    affected_files: ['file1.js', 'file2.js'],
    continuation_state: 'strategy-analysis',
  };
  const result = tool(JSON.stringify(payload), ['validate', '--kind', 'conflict_detected', '--json']);
  assert.equal(result.status, 0);
  assert.equal(result.payload.ok, true);
});
