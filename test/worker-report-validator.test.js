'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { spawnSync } = require('child_process');

const REPO_ROOT = path.join(__dirname, '..');
const TOOL = path.join(REPO_ROOT, 'sai', 'tools', 'worker-report-validator.js');

const RECEIVED_AT_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/;

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

function assertValidSidecar(result, kind) {
  assert.equal(result.status, 0);
  assert.equal(result.payload.ok, true);
  assert.equal(result.payload.errors.length, 0);
  assert.equal(result.payload.kind, kind);
  // contains assert: received_at is the first key and well-formed; ignore exact value (non-deterministic)
  assert.equal(Object.keys(result.payload)[0], 'received_at');
  assert.match(result.payload.received_at, RECEIVED_AT_PATTERN);
  assert.ok(!('validated_at' in result.payload));
}

function assertInvalidNoSidecar(result) {
  assert.equal(result.status, 1);
  assert.equal(result.payload.ok, false);
  assert.ok(result.payload.errors.length > 0);
  assert.equal(Object.keys(result.payload)[0], 'received_at', 'invalid response carries received_at first');
  assert.match(result.payload.received_at, RECEIVED_AT_PATTERN);
  assert.ok(!('validated_at' in result.payload));
}

test('validate terminal payload - completed (valid)', () => {
  const payload = {
    status: 'completed',
    summary: 'Task completed successfully',
    changed_files: ['file1.js', 'file2.js'],
    resolved_change_name: 'test-change',
  };
  const result = tool(JSON.stringify(payload), ['validate', '--kind', 'terminal', '--json']);
  assertValidSidecar(result, 'terminal');
});

test('validate terminal payload - needs_input (valid)', () => {
  const payload = {
    status: 'needs_input',
    summary: 'Awaiting user input',
    changed_files: [],
    question: 'What is your choice?',
    options: [
      { label: 'Option A', value: 'a' },
      { label: 'Option B', value: 'b' },
    ],
  };
  const result = tool(JSON.stringify(payload), ['validate', '--kind', 'terminal', '--json']);
  assertValidSidecar(result, 'terminal');
});

test('an unresolved-gap question validates as an ordinary input', () => {
  const payload = { status: 'needs_input', summary: 'Question', changed_files: [],
    resolved_change_name: 'example-change',
    question: 'Step 2 needs the error-handling convention; the explorer found none. Which one applies?',
    options: [{ label: 'Result type', value: 'result' }, { label: 'Exceptions', value: 'exceptions' }] };
  assertValidSidecar(tool(JSON.stringify(payload), ['validate', '--kind', 'terminal', '--json']), 'terminal');
});

test('validate terminal payload - failed with failure_class (valid)', () => {
  const payload = {
    status: 'failed',
    summary: 'Task failed',
    changed_files: [],
    resolved_change_name: 'test-change',
    failure_class: 'validation-failed',
    unrecoverable: false,
  };
  const result = tool(JSON.stringify(payload), ['validate', '--kind', 'terminal', '--json']);
  assertValidSidecar(result, 'terminal');
});

test('validate terminal payload - missing status field', () => {
  const payload = {
    summary: 'Task completed',
    changed_files: [],
  };
  const result = tool(JSON.stringify(payload), ['validate', '--kind', 'terminal', '--json']);
  assertInvalidNoSidecar(result);
  assert.ok(result.payload.errors.some((e) => e.includes('status is missing')));
});

test('validate terminal payload - invalid status value', () => {
  const payload = {
    status: 'invalid-status',
    summary: 'Task completed',
    changed_files: [],
  };
  const result = tool(JSON.stringify(payload), ['validate', '--kind', 'terminal', '--json']);
  assertInvalidNoSidecar(result);
  assert.ok(result.payload.errors.some((e) => e.includes('status must be one of')));
});

test('valid terminal payload response carries received_at without rewriting payload', () => {
  const payload = {
    status: 'completed',
    summary: 'Task completed',
    changed_files: [],
  };
  const result = tool(JSON.stringify(payload), ['validate', '--kind', 'terminal', '--json']);
  assertValidSidecar(result, 'terminal');
  // decision stays deterministic: ok true, no errors; presentation carries time
  assert.deepEqual(result.payload.errors, []);
});

test('invalid terminal payload response still carries received_at', () => {
  const payload = {
    status: 'completed',
    summary: 'Task completed',
    // changed_files missing -> invalid
  };
  const result = tool(JSON.stringify(payload), ['validate', '--kind', 'terminal', '--json']);
  assertInvalidNoSidecar(result);
});

test('unknown fields are ignored and stay valid', () => {
  const payload = {
    status: 'completed',
    summary: 'Task completed',
    changed_files: [],
    legacy_time: '2026-09-12T14:30:15+02:00',
  };
  const result = tool(JSON.stringify(payload), ['validate', '--kind', 'terminal', '--json']);
  assertValidSidecar(result, 'terminal');
});

test('unknown fields with Z-like values are ignored and stay valid', () => {
  const payload = {
    status: 'completed',
    summary: 'Task completed',
    changed_files: [],
    legacy_time: '2026-09-12T14:30:15Z',
  };
  const result = tool(JSON.stringify(payload), ['validate', '--kind', 'terminal', '--json']);
  assertValidSidecar(result, 'terminal');
});

test('validate terminal payload - missing summary field', () => {
  const payload = {
    status: 'completed',
    changed_files: [],
  };
  const result = tool(JSON.stringify(payload), ['validate', '--kind', 'terminal', '--json']);
  assertInvalidNoSidecar(result);
  assert.ok(result.payload.errors.some((e) => e.includes('summary is missing')));
});

test('validate terminal payload - missing changed_files field', () => {
  const payload = {
    status: 'completed',
    summary: 'Task completed',
  };
  const result = tool(JSON.stringify(payload), ['validate', '--kind', 'terminal', '--json']);
  assertInvalidNoSidecar(result);
  assert.ok(result.payload.errors.some((e) => e.includes('changed_files is missing')));
});

test('validate terminal payload - needs_input missing question', () => {
  const payload = {
    status: 'needs_input',
    summary: 'Awaiting input',
    changed_files: [],
    options: [{ label: 'A', value: 'a' }],
  };
  const result = tool(JSON.stringify(payload), ['validate', '--kind', 'terminal', '--json']);
  assertInvalidNoSidecar(result);
  assert.ok(result.payload.errors.some((e) => e.includes('question is missing')));
});

test('validate terminal payload - needs_input missing options', () => {
  const payload = {
    status: 'needs_input',
    summary: 'Awaiting input',
    changed_files: [],
    question: 'Choose one',
  };
  const result = tool(JSON.stringify(payload), ['validate', '--kind', 'terminal', '--json']);
  assertInvalidNoSidecar(result);
  assert.ok(result.payload.errors.some((e) => e.includes('options is missing')));
});

test('validate terminal payload - failed post-resolution missing failure_class', () => {
  const payload = {
    status: 'failed',
    summary: 'Task failed',
    changed_files: [],
    resolved_change_name: 'test-change',
    unrecoverable: false,
  };
  const result = tool(JSON.stringify(payload), ['validate', '--kind', 'terminal', '--json']);
  assertInvalidNoSidecar(result);
  assert.ok(result.payload.errors.some((e) => e.includes('failure_class is missing')));
});

test('validate terminal payload - invalid failure_class', () => {
  const payload = {
    status: 'failed',
    summary: 'Task failed',
    changed_files: [],
    resolved_change_name: 'test-change',
    failure_class: 'unknown-failure',
    unrecoverable: false,
  };
  const result = tool(JSON.stringify(payload), ['validate', '--kind', 'terminal', '--json']);
  assertInvalidNoSidecar(result);
  assert.ok(result.payload.errors.some((e) => e.includes('failure_class must be one of')));
});

test('validate notice payload (valid)', () => {
  const payload = {
    event: 'notice',
    message: 'This is a notice',
    changed_files: ['file1.js'],
  };
  const result = tool(JSON.stringify(payload), ['validate', '--kind', 'notice', '--json']);
  assertValidSidecar(result, 'notice');
});

test('validate notice payload - missing event field', () => {
  const payload = {
    message: 'This is a notice',
    changed_files: [],
  };
  const result = tool(JSON.stringify(payload), ['validate', '--kind', 'notice', '--json']);
  assertInvalidNoSidecar(result);
  assert.ok(result.payload.errors.some((e) => e.includes('event is missing')));
});

test('validate notice payload - wrong event value', () => {
  const payload = {
    event: 'progress',
    message: 'This is a notice',
    changed_files: [],
  };
  const result = tool(JSON.stringify(payload), ['validate', '--kind', 'notice', '--json']);
  assertInvalidNoSidecar(result);
  assert.ok(result.payload.errors.some((e) => e.includes('event must be "notice"')));
});

test('validate progress payload (valid)', () => {
  const payload = {
    event: 'progress',
    step_ids: ['step1', 'step2'],
    changed_files: ['file1.js'],
  };
  const result = tool(JSON.stringify(payload), ['validate', '--kind', 'progress', '--json']);
  assertValidSidecar(result, 'progress');
});

test('validate progress payload - missing step_ids', () => {
  const payload = {
    event: 'progress',
    changed_files: [],
  };
  const result = tool(JSON.stringify(payload), ['validate', '--kind', 'progress', '--json']);
  assertInvalidNoSidecar(result);
  assert.ok(result.payload.errors.some((e) => e.includes('step_ids is missing')));
});

test('validate conflict_detected payload (valid)', () => {
  const payload = {
    event: 'conflict_detected',
    summary: 'Conflict detected',
    changed_files: ['file1.js'],
    affected_files: ['file1.js'],
    continuation_state: 'language-selection',
  };
  const result = tool(JSON.stringify(payload), ['validate', '--kind', 'conflict_detected', '--json']);
  assertValidSidecar(result, 'conflict_detected');
});

test('validate conflict_detected payload - invalid continuation_state', () => {
  const payload = {
    event: 'conflict_detected',
    summary: 'Conflict detected',
    changed_files: [],
    affected_files: [],
    continuation_state: 'invalid-state',
  };
  const result = tool(JSON.stringify(payload), ['validate', '--kind', 'conflict_detected', '--json']);
  assertInvalidNoSidecar(result);
  assert.ok(result.payload.errors.some((e) => e.includes('continuation_state must be one of')));
});

test('validate with missing --kind flag', () => {
  const payload = {
    status: 'completed',
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
  assert.ok(result.payload.errors.some((e) => e.includes('invalid payload on stdin')));
  assert.ok(!('validated_at' in result.payload));
  assert.equal(Object.keys(result.payload)[0], 'received_at');
});

test('validate with non-object JSON input', () => {
  const result = tool('"just a string"', ['validate', '--kind', 'terminal', '--json']);
  assert.equal(result.status, 1);
  assert.equal(result.payload.ok, false);
  assert.ok(result.payload.errors.some((e) => e.includes('must be a mapping')));
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
    summary: 'Task completed',
    changed_files: 'not-an-array',
  };
  const result = tool(JSON.stringify(payload), ['validate', '--kind', 'terminal', '--json']);
  assertInvalidNoSidecar(result);
  assert.ok(result.payload.errors.some((e) => e.includes('changed_files must be an array')));
});

test('validate terminal - changed_files with non-string element', () => {
  const payload = {
    status: 'completed',
    summary: 'Task completed',
    changed_files: ['file1.js', 123],
  };
  const result = tool(JSON.stringify(payload), ['validate', '--kind', 'terminal', '--json']);
  assertInvalidNoSidecar(result);
  assert.ok(result.payload.errors.some((e) => e.includes('must be an array of strings')));
});

test('validate terminal - summary is not a string', () => {
  const payload = {
    status: 'completed',
    summary: 123,
    changed_files: [],
  };
  const result = tool(JSON.stringify(payload), ['validate', '--kind', 'terminal', '--json']);
  assertInvalidNoSidecar(result);
  assert.ok(result.payload.errors.some((e) => e.includes('summary must be a string')));
});

test('validate with empty stdin', () => {
  const result = tool('', ['validate', '--kind', 'terminal', '--json']);
  assert.equal(result.status, 1);
  assert.equal(result.payload.ok, false);
  assert.ok(result.payload.errors.some((e) => e.includes('empty payload')));
});

test('text output format for valid payload carries received_at suffix', () => {
  const payload = {
    status: 'completed',
    summary: 'Task completed',
    changed_files: [],
  };
  const result = tool(JSON.stringify(payload), ['validate', '--kind', 'terminal']);
  assert.equal(result.status, 0);
  assert.ok(result.stdout.includes('valid'));
  assert.ok(result.stdout.includes('terminal'));
  // contains assert for non-deterministic sidecar
  assert.match(result.stdout, /received_at \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}/);
});

test('text output format for invalid payload is unchanged and carries no timestamp', () => {
  const payload = {
    status: 'invalid',
    summary: 'Task completed',
    changed_files: [],
  };
  const result = tool(JSON.stringify(payload), ['validate', '--kind', 'terminal']);
  assert.equal(result.status, 1);
  assert.ok(result.stdout.includes('invalid'));
  assert.ok(!result.stdout.includes('received_at'));
});

test('validate cancelled status', () => {
  const payload = {
    status: 'cancelled',
    summary: 'Task cancelled',
    changed_files: [],
  };
  const result = tool(JSON.stringify(payload), ['validate', '--kind', 'terminal', '--json']);
  assertValidSidecar(result, 'terminal');
});

test('validate progress payload with empty step_ids', () => {
  const payload = {
    event: 'progress',
    step_ids: [],
    changed_files: [],
  };
  const result = tool(JSON.stringify(payload), ['validate', '--kind', 'progress', '--json']);
  assertValidSidecar(result, 'progress');
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
      summary: 'Task failed',
      changed_files: [],
      resolved_change_name: 'test-change',
      failure_class: failureClass,
      unrecoverable: false,
    };
    const result = tool(JSON.stringify(payload), ['validate', '--kind', 'terminal', '--json']);
    assert.equal(result.status, 0, `failed to validate failure_class: ${failureClass}`);
    assert.equal(result.payload.ok, true);
    assert.match(result.payload.received_at, RECEIVED_AT_PATTERN);
  }
});

test('received_at applies to all four kinds', () => {
  const cases = [
    [{ status: 'completed', summary: 'ok', changed_files: [] }, 'terminal'],
    [{ event: 'notice', message: 'hi', changed_files: [] }, 'notice'],
    [{ event: 'progress', step_ids: ['a'], changed_files: [] }, 'progress'],
    [
      {
        event: 'conflict_detected',
        summary: 'c',
        changed_files: [],
        affected_files: [],
        continuation_state: 'language-selection',
      },
      'conflict_detected',
    ],
  ];
  for (const [payload, kind] of cases) {
    const result = tool(JSON.stringify(payload), ['validate', '--kind', kind, '--json']);
    assertValidSidecar(result, kind);
  }
});

test('validate conflict_detected with strategy-analysis state', () => {
  const payload = {
    event: 'conflict_detected',
    summary: 'Conflict detected',
    changed_files: [],
    affected_files: ['file1.js', 'file2.js'],
    continuation_state: 'strategy-analysis',
  };
  const result = tool(JSON.stringify(payload), ['validate', '--kind', 'conflict_detected', '--json']);
  assertValidSidecar(result, 'conflict_detected');
});

test('validate terminal payload - needs_input batch v1 (valid)', () => {
  const payload = {
    status: 'needs_input',
    summary: 'Pre-merge batch',
    changed_files: [],
    questions: [
      { id: 'dirty', question: 'Working tree has uncommitted changes. Continue anyway?', options: [{ label: 'yes', value: 'yes' }, { label: 'no', value: 'no' }] },
      { id: 'method', question: 'Which integration method do you want to use?', options: [{ label: 'Merge', value: 'merge' }, { label: 'Rebase', value: 'rebase' }] },
      { id: 'branch', question: 'Which branch do you want to merge?', options: [{ label: 'feature — last commit 2026-09-18 10:00', value: 'feature' }] },
    ],
  };
  const result = tool(JSON.stringify(payload), ['validate', '--kind', 'terminal', '--json']);
  assertValidSidecar(result, 'terminal');
});

test('validate terminal payload - needs_input batch rejects duplicate ids', () => {
  const payload = {
    status: 'needs_input',
    summary: 'Bad batch',
    changed_files: [],
    questions: [
      { id: 'scope', question: 'Select resolution scope', options: [{ label: 'Full scope (Recommended)', value: 'full' }] },
      { id: 'scope', question: 'Select resolution scope', options: [{ label: 'Full scope (Recommended)', value: 'full' }] },
    ],
  };
  const result = tool(JSON.stringify(payload), ['validate', '--kind', 'terminal', '--json']);
  assertInvalidNoSidecar(result);
  assert.ok(result.payload.errors.some((e) => e.includes('duplicated')));
});

test('validate terminal payload - needs_input batch rejects empty options (closed only)', () => {
  const payload = {
    status: 'needs_input',
    summary: 'Bad batch',
    changed_files: [],
    questions: [
      { id: 'scope', question: 'Select resolution scope', options: [] },
    ],
  };
  const result = tool(JSON.stringify(payload), ['validate', '--kind', 'terminal', '--json']);
  assertInvalidNoSidecar(result);
  assert.ok(result.payload.errors.some((e) => e.includes('non-empty array')));
});

test('validate terminal payload - needs_input batch rejects empty questions array', () => {
  const payload = {
    status: 'needs_input',
    summary: 'Bad batch',
    changed_files: [],
    questions: [],
  };
  const result = tool(JSON.stringify(payload), ['validate', '--kind', 'terminal', '--json']);
  assertInvalidNoSidecar(result);
  assert.ok(result.payload.errors.some((e) => e.includes('non-empty array')));
});

test('validate accepts the YAML payload shapes workers return', () => {
  const cases = [
    ['terminal', 'status: completed\nsummary: "Done: all \\"good\\""\nchanged_files:\n  - a.md\n  - b/c.md\nresolved_change_name: x\n'],
    ['terminal', 'status: completed\nsummary: |\n  line one\n  line two\nchanged_files: []\nresolved_change_name: x\n'],
    ['terminal', 'status: needs_input\nsummary: ask\nchanged_files: []\nquestion: Which?\noptions:\n  - label: A\n    value: a\n  - label: B\n    value: b\n'],
    ['terminal', "status: needs_input\nsummary: ask\nchanged_files: []\nquestion: 'It''s?'\noptions: [{label: A, value: a}]\n"],
    ['notice', 'event: notice\nmessage: hello # comment\nchanged_files: []\n'],
    ['progress', 'event: progress\nstep_ids:\n  - prereqs-and-change\n  - scope\nchanged_files:\n  - x.md\n'],
    ['progress', 'event: progress\nstep_ids: []\nchanged_files: []\n'],
  ];
  for (const [kind, text] of cases) {
    assertValidSidecar(tool(text, ['validate', '--kind', kind, '--json']), kind);
  }
});

test('validate rejects malformed YAML with a clear error and still accepts JSON', () => {
  const bad = tool('status: completed\nsummary: ok\n  changed_files: [\n', ['validate', '--kind', 'terminal', '--json']);
  assert.equal(bad.status, 1);
  assert.equal(bad.payload.ok, false);
  assert.match(bad.payload.errors[0], /^invalid YAML on stdin: line \d+:/);
  const json = tool(JSON.stringify({ event: 'progress', step_ids: ['a'], changed_files: [] }), ['validate', '--kind', 'progress', '--json']);
  assertValidSidecar(json, 'progress');
});
