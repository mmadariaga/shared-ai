'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { spawnSync } = require('child_process');

const REPO_ROOT = path.join(__dirname, '..');
const TOOL = path.join(REPO_ROOT, 'sai', 'tools', 'worker-report-validator.js');

const VALIDATED_AT_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/;

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
  // contains assert: validated_at present and well-formed; ignore exact value (non-deterministic)
  assert.ok('validated_at' in result.payload, 'valid verdict should carry validated_at');
  assert.match(result.payload.validated_at, VALIDATED_AT_PATTERN);
}

function assertInvalidNoSidecar(result) {
  assert.equal(result.status, 1);
  assert.equal(result.payload.ok, false);
  assert.ok(result.payload.errors.length > 0);
  assert.ok(!('validated_at' in result.payload), 'invalid verdict should carry no timestamp');
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

function lookupPayload() {
  return {
    status: 'needs_input', summary: 'Bounded convention lookup requested',
    changed_files: [], resolved_change_name: 'example-change',
    lookup_request: { type: 'bounded-project-lookup', items: [
      { id: 'lookup-1', area: 'error handling', reason: 'Step 1 convention', step: 1 },
    ] },
    questions: [{ id: 'lookup-1', question: 'Request lookup of error handling in the project for Step 1 convention (Step 1)',
      options: [{ label: 'Yes', value: 'yes' }, { label: 'No', value: 'no' }] }],
  };
}

test('typed bounded lookup validates only a matched limited yes/no batch', () => {
  const payload = lookupPayload();
  assertValidSidecar(tool(JSON.stringify(payload), ['validate', '--kind', 'terminal', '--json']), 'terminal');
  for (const change of [
    p => { p.lookup_request.type = 'other'; },
    p => { p.lookup_request.extra = 'entire repository'; },
    p => { p.lookup_request.items[0].path = '/etc'; },
    p => { p.lookup_request.items[0].area = '../other'; },
    p => { p.lookup_request.items[0].step = 0; },
    p => { p.lookup_request.items = Array(6).fill(p.lookup_request.items[0]); },
    p => { p.questions[0].id = 'unmatched'; },
    p => { p.questions[0].options[0].value = 'approve-all'; },
    p => { p.status = 'completed'; },
    p => { delete p.resolved_change_name; },
  ]) {
    const invalid = lookupPayload();
    change(invalid);
    assertInvalidNoSidecar(tool(JSON.stringify(invalid), ['validate', '--kind', 'terminal', '--json']));
  }
});

test('an ordinary question mentioning lookup remains an ordinary input, not a typed grant', () => {
  const payload = { status: 'needs_input', summary: 'Question', changed_files: [],
    question: 'May I look up conventions?', options: [{ label: 'Yes', value: 'yes' }] };
  assertValidSidecar(tool(JSON.stringify(payload), ['validate', '--kind', 'terminal', '--json']), 'terminal');
  assert.equal('lookup_request' in payload, false);
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

test('valid terminal payload carries validated_at sidecar without rewriting payload', () => {
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

test('invalid terminal payload carries no timestamp', () => {
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
  assert.ok(result.payload.errors.some((e) => e.includes('invalid JSON')));
  assert.ok(!('validated_at' in result.payload));
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
  assert.ok(result.payload.errors.some((e) => e.includes('invalid JSON')));
});

test('text output format for valid payload carries validated_at suffix', () => {
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
  assert.match(result.stdout, /validated_at \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}/);
});

test('text output format for invalid payload carries no timestamp', () => {
  const payload = {
    status: 'invalid',
    summary: 'Task completed',
    changed_files: [],
  };
  const result = tool(JSON.stringify(payload), ['validate', '--kind', 'terminal']);
  assert.equal(result.status, 1);
  assert.ok(result.stdout.includes('invalid'));
  assert.ok(!result.stdout.includes('validated_at'));
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
    assert.match(result.payload.validated_at, VALIDATED_AT_PATTERN);
  }
});

test('validated_at sidecar applies to all four kinds', () => {
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
