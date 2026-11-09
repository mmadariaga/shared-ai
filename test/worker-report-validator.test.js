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
  const result = tool(JSON.stringify(payload), ['validate', '--kind', 'terminal', '--command', 'direct-build', '--json']);
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
  const result = tool(JSON.stringify(payload), ['validate', '--kind', 'terminal', '--command', 'direct-build', '--json']);
  assertValidSidecar(result, 'terminal');
});

test('an unresolved-gap question validates as an ordinary input', () => {
  const payload = { status: 'needs_input', summary: 'Question', changed_files: [],
    resolved_change_name: 'example-change',
    question: 'Step 2 needs the error-handling convention; the explorer found none. Which one applies?',
    options: [{ label: 'Result type', value: 'result' }, { label: 'Exceptions', value: 'exceptions' }] };
  assertValidSidecar(tool(JSON.stringify(payload), ['validate', '--kind', 'terminal', '--command', 'direct-build', '--json']), 'terminal');
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
  const result = tool(JSON.stringify(payload), ['validate', '--kind', 'terminal', '--command', 'direct-build', '--json']);
  assertValidSidecar(result, 'terminal');
});

test('validate terminal payload - missing status field', () => {
  const payload = {
    summary: 'Task completed',
    changed_files: [],
  };
  const result = tool(JSON.stringify(payload), ['validate', '--kind', 'terminal', '--command', 'direct-build', '--json']);
  assertInvalidNoSidecar(result);
  assert.ok(result.payload.errors.some((e) => e.includes('status is missing')));
});

test('validate terminal payload - invalid status value', () => {
  const payload = {
    status: 'invalid-status',
    summary: 'Task completed',
    changed_files: [],
  };
  const result = tool(JSON.stringify(payload), ['validate', '--kind', 'terminal', '--command', 'direct-build', '--json']);
  assertInvalidNoSidecar(result);
  assert.ok(result.payload.errors.some((e) => e.includes('status must be one of')));
});

test('valid terminal payload response carries received_at without rewriting payload', () => {
  const payload = {
    status: 'completed',
    summary: 'Task completed',
    changed_files: [],
  };
  const result = tool(JSON.stringify(payload), ['validate', '--kind', 'terminal', '--command', 'direct-build', '--json']);
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
  const result = tool(JSON.stringify(payload), ['validate', '--kind', 'terminal', '--command', 'direct-build', '--json']);
  assertInvalidNoSidecar(result);
});

test('an unknown key is rejected, whatever its value', () => {
  for (const legacy of ['2026-09-12T14:30:15+02:00', '2026-09-12T14:30:15Z']) {
    const payload = { status: 'completed', summary: 'Task completed', changed_files: [], legacy_time: legacy };
    const result = tool(JSON.stringify(payload), ['validate', '--kind', 'terminal', '--command', 'direct-build', '--json']);
    assertInvalidNoSidecar(result);
    assert.ok(result.payload.errors.some((e) => e.includes('legacy_time is not a field of a direct-build report')));
  }
});

test('validate terminal payload - missing summary field', () => {
  const payload = {
    status: 'completed',
    changed_files: [],
  };
  const result = tool(JSON.stringify(payload), ['validate', '--kind', 'terminal', '--command', 'direct-build', '--json']);
  assertInvalidNoSidecar(result);
  assert.ok(result.payload.errors.some((e) => e.includes('summary is missing')));
});

test('validate terminal payload - missing changed_files field', () => {
  const payload = {
    status: 'completed',
    summary: 'Task completed',
  };
  const result = tool(JSON.stringify(payload), ['validate', '--kind', 'terminal', '--command', 'direct-build', '--json']);
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
  const result = tool(JSON.stringify(payload), ['validate', '--kind', 'terminal', '--command', 'direct-build', '--json']);
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
  const result = tool(JSON.stringify(payload), ['validate', '--kind', 'terminal', '--command', 'direct-build', '--json']);
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
  const result = tool(JSON.stringify(payload), ['validate', '--kind', 'terminal', '--command', 'direct-build', '--json']);
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
  const result = tool(JSON.stringify(payload), ['validate', '--kind', 'terminal', '--command', 'direct-build', '--json']);
  assertInvalidNoSidecar(result);
  assert.ok(result.payload.errors.some((e) => e.includes('failure_class must be one of')));
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
  const result = tool('{ invalid json }', ['validate', '--kind', 'terminal', '--command', 'direct-build', '--json']);
  assert.equal(result.status, 1);
  assert.equal(result.payload.ok, false);
  assert.ok(result.payload.errors.some((e) => e.includes('invalid payload on stdin')));
  assert.ok(!('validated_at' in result.payload));
  assert.equal(Object.keys(result.payload)[0], 'received_at');
});

test('validate with non-object JSON input', () => {
  const result = tool('"just a string"', ['validate', '--kind', 'terminal', '--command', 'direct-build', '--json']);
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
  const result = tool(JSON.stringify(payload), ['validate', '--kind', 'terminal', '--command', 'direct-build', '--json']);
  assertInvalidNoSidecar(result);
  assert.ok(result.payload.errors.some((e) => e.includes('changed_files must be an array')));
});

test('validate terminal - changed_files with non-string element', () => {
  const payload = {
    status: 'completed',
    summary: 'Task completed',
    changed_files: ['file1.js', 123],
  };
  const result = tool(JSON.stringify(payload), ['validate', '--kind', 'terminal', '--command', 'direct-build', '--json']);
  assertInvalidNoSidecar(result);
  assert.ok(result.payload.errors.some((e) => e.includes('must be an array of strings')));
});

test('validate terminal - summary is not a string', () => {
  const payload = {
    status: 'completed',
    summary: 123,
    changed_files: [],
  };
  const result = tool(JSON.stringify(payload), ['validate', '--kind', 'terminal', '--command', 'direct-build', '--json']);
  assertInvalidNoSidecar(result);
  assert.ok(result.payload.errors.some((e) => e.includes('summary must be a string')));
});

test('validate with empty stdin', () => {
  const result = tool('', ['validate', '--kind', 'terminal', '--command', 'direct-build', '--json']);
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
  const result = tool(JSON.stringify(payload), ['validate', '--kind', 'terminal', '--command', 'direct-build']);
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
  const result = tool(JSON.stringify(payload), ['validate', '--kind', 'terminal', '--command', 'direct-build']);
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
  const result = tool(JSON.stringify(payload), ['validate', '--kind', 'terminal', '--command', 'direct-build', '--json']);
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
    const result = tool(JSON.stringify(payload), ['validate', '--kind', 'terminal', '--command', 'direct-build', '--json']);
    assert.equal(result.status, 0, `failed to validate failure_class: ${failureClass}`);
    assert.equal(result.payload.ok, true);
    assert.match(result.payload.received_at, RECEIVED_AT_PATTERN);
  }
});

test('received_at applies to both kinds', () => {
  const cases = [
    [{ status: 'completed', summary: 'ok', changed_files: [] }, 'terminal'],
    [{ event: 'progress', step_ids: ['a'], changed_files: [] }, 'progress'],
  ];
  for (const [payload, kind] of cases) {
    const result = tool(JSON.stringify(payload), ['validate', '--kind', kind, ...(kind === 'terminal' ? ['--command', 'direct-build'] : []), '--json']);
    assertValidSidecar(result, kind);
  }
});

test('the retired notice and conflict_detected kinds are usage errors', () => {
  for (const kind of ['notice', 'conflict_detected']) {
    const result = tool(JSON.stringify({ event: kind }), ['validate', '--kind', kind, ...(kind === 'terminal' ? ['--command', 'direct-build'] : []), '--json']);
    assert.equal(result.status, 2, kind);
    assert.match(result.stderr, new RegExp(`invalid --kind value: ${kind}`));
  }
  const validator = require('../sai/tools/worker-report-validator.js');
  assert.deepEqual(validator.VALID_KINDS, ['terminal', 'progress']);
  for (const retired of ['validateNotice', 'validateConflictDetected', 'VALID_EVENTS', 'VALID_CONTINUATION_STATES']) {
    assert.equal(validator[retired], undefined, `${retired} is retired`);
  }
});

test('the retired status vocabularies are rejected by the terminal kind', () => {
  for (const status of ['done', 'blocked', 'step-done', 'question', 'no-changes']) {
    const result = tool(JSON.stringify({ status, summary: 's', changed_files: [] }), ['validate', '--kind', 'terminal', '--command', 'direct-build', '--json']);
    assertInvalidNoSidecar(result);
    assert.ok(result.payload.errors.some((e) => e.includes('status must be one of')), status);
  }
});

const REVIEW_FIELDS = { review_path: 'openspec/changes/x/review.md', counts: { critical: 0, high: 1, medium: 0, low: 0, questions: 0 }, recommended_audits: 'Security: No' };

test('--command selects the outcome values a completed report may carry', () => {
  const completed = (extra = {}) => JSON.stringify({ status: 'completed', summary: 'ok', changed_files: [], ...extra });
  assertValidSidecar(tool(completed({ outcome: 'no-changes' }), ['validate', '--kind', 'terminal', '--command', 'review', '--json']), 'terminal');
  assertValidSidecar(tool(completed(REVIEW_FIELDS), ['validate', '--kind', 'terminal', '--command', 'review', '--json']), 'terminal');
  const other = tool(completed({ ...REVIEW_FIELDS, outcome: 'something-else' }), ['validate', '--kind', 'terminal', '--command', 'review', '--json']);
  assertInvalidNoSidecar(other);
  assert.ok(other.payload.errors.some((e) => e.includes('outcome must be one of [no-changes] for review')));
  const notAdmitted = tool(completed({ outcome: 'no-changes' }), ['validate', '--kind', 'terminal', '--command', 'implement', '--json']);
  assertInvalidNoSidecar(notAdmitted);
  assert.ok(notAdmitted.payload.errors.some((e) => e.includes('outcome is not admitted by implement')));
  const noCommand = tool(completed({ outcome: 'no-changes' }), ['validate', '--kind', 'terminal', '--json']);
  assert.equal(noCommand.status, 2);
  assert.match(noCommand.stderr, /validate --kind terminal requires --command/);
  const notCompleted = tool(JSON.stringify({ status: 'failed', summary: 'x', changed_files: [], outcome: 'no-changes' }),
    ['validate', '--kind', 'terminal', '--command', 'review', '--json']);
  assertInvalidNoSidecar(notCompleted);
  assert.ok(notCompleted.payload.errors.some((e) => e.includes('only on a completed report')));
});

test('the outcome table is the validator\'s own and an unknown command is a usage error', () => {
  const { COMMAND_OUTCOMES } = require('../sai/tools/worker-report-validator.js');
  assert.deepEqual(COMMAND_OUTCOMES.review, ['no-changes']);
  for (const command of ['implement', 'direct-build', 'spec', 'design', 'merge']) assert.deepEqual(COMMAND_OUTCOMES[command], [], command);
  const result = tool(JSON.stringify({ status: 'completed', summary: 'ok', changed_files: [] }),
    ['validate', '--kind', 'terminal', '--command', 'nonsense', '--json']);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /invalid --command value: nonsense/);
});

test('validate accepts the YAML payload shapes workers return', () => {
  const cases = [
    ['terminal', 'status: completed\nsummary: "Done: all \\"good\\""\nchanged_files:\n  - a.md\n  - b/c.md\nresolved_change_name: x\n'],
    ['terminal', 'status: completed\nsummary: |\n  line one\n  line two\nchanged_files: []\nresolved_change_name: x\n'],
    ['terminal', 'status: needs_input\nsummary: ask\nchanged_files: []\nquestion: Which?\noptions:\n  - label: A\n    value: a\n  - label: B\n    value: b\n'],
    ['terminal', "status: needs_input\nsummary: ask\nchanged_files: []\nquestion: 'It''s?'\noptions: [{label: A, value: a}]\n"],
    ['progress', 'event: progress\nstep_ids:\n  - prereqs-and-change\n  - scope\nchanged_files:\n  - x.md\n'],
    ['progress', 'event: progress\nstep_ids: []\nchanged_files: []\n'],
  ];
  for (const [kind, text] of cases) {
    assertValidSidecar(tool(text, ['validate', '--kind', kind, ...(kind === 'terminal' ? ['--command', 'direct-build'] : []), '--json']), kind);
  }
});

test('validate rejects malformed YAML with a clear error and still accepts JSON', () => {
  const bad = tool('status: completed\nsummary: ok\n  changed_files: [\n', ['validate', '--kind', 'terminal', '--command', 'direct-build', '--json']);
  assert.equal(bad.status, 1);
  assert.equal(bad.payload.ok, false);
  assert.match(bad.payload.errors[0], /^invalid YAML on stdin: line \d+:/);
  const json = tool(JSON.stringify({ event: 'progress', step_ids: ['a'], changed_files: [] }), ['validate', '--kind', 'progress', '--json']);
  assertValidSidecar(json, 'progress');
});

const validator = require('../sai/tools/worker-report-validator.js');
const fs = require('fs');

const verdict = (payload, command, kind = 'terminal') => validator.validateText(JSON.stringify(payload), kind, command ? { command } : {});
const base = (extra = {}) => ({ status: 'completed', summary: 'ok', changed_files: [], ...extra });

// One accepted completed report per command, shaped as its worker card spells it.
const CONTRACT_REPORTS = {
  implement: base({ test_command: 'node --test test/x.test.js', notes: '' }),
  spec: base({ step_ids: ['spec-intake'], warnings: [{ spec_assertion: 'a', other_side: 'b', disagreement: 'c' }], notes: '' }),
  design: base({ step_ids: [], warnings: [], notes: 'n' }),
  review: base(REVIEW_FIELDS),
  security: base({ report_path: 'openspec/changes/x/security.md', counts: { critical: 0, high: 0, medium: 1, low: 0 } }),
  performance: base({ report_path: 'p.md', counts: { critical: 0, high: 0, medium: 0, low: 0, informational: 2 } }),
  accessibility: base({ report_path: 'a.md', counts: { critical: 0, high: 0, medium: 0, low: 0, informational: 0 } }),
  commit: base(),
  archive: base({ resolved_change_name: 'x' }),
  backfill: base({ resolved_change_name: 'x', draft_references: [{ path: '/tmp/a', sha256: 'f'.repeat(64), destination: 'openspec/changes/x/proposal.md' }], corrected_specs: [{ destination: 'd', content: 'c' }] }),
  merge: base({ strategy: 's', decisions: [{ conflict_id: 'code:a#1', decision: 'ours' }], escalations: [], analysis: 'a', corrections: [], applicability: 'no-collision', renames: [], reference_updates: [] }),
  'direct-build': base({ resolved_change_name: 'x' }),
};

test('the role-field table covers every command that has an outcome entry, and each contract report is accepted', () => {
  assert.deepEqual(Object.keys(validator.COMMAND_FIELDS).sort(), Object.keys(validator.COMMAND_OUTCOMES).sort());
  assert.deepEqual(Object.keys(CONTRACT_REPORTS).sort(), Object.keys(validator.COMMAND_FIELDS).sort());
  for (const [command, report] of Object.entries(CONTRACT_REPORTS)) {
    assert.deepEqual(verdict(report, command).errors, [], command);
  }
});

test('E1: a role field of the wrong type is rejected, and a missing required one too', () => {
  const wrongType = verdict(base({ ...REVIEW_FIELDS, review_path: 42, counts: 'nope' }), 'review');
  assert.equal(wrongType.ok, false);
  assert.ok(wrongType.errors.includes('review_path must be a string, got number'));
  assert.ok(wrongType.errors.includes('counts must be an object, got string'));
  assert.ok(verdict(base({ ...REVIEW_FIELDS, counts: { critical: 0, high: 0, medium: 0, low: 0 } }), 'review').errors.some((e) => e.startsWith('counts must have exactly the keys')));
  assert.ok(verdict(base({ ...REVIEW_FIELDS, counts: { critical: -1, high: 0, medium: 0, low: 0, questions: 0 } }), 'review').errors.includes('counts.critical must be a non-negative integer'));
  assert.ok(verdict(base({ ...CONTRACT_REPORTS.security, counts: { critical: 0, high: 0, medium: 0, low: 0, informational: 0 } }), 'security').errors.some((e) => e.startsWith('counts must have exactly the keys')));
  assert.ok(verdict(base({ test_command: 'x' }), 'implement').errors.includes('notes is missing'));
  assert.ok(verdict(base(), 'archive').errors.includes('resolved_change_name is missing'));
  assert.ok(verdict({ status: 'needs_input', summary: 's', changed_files: [], question: 'q', options: [] }, 'archive').errors.includes('resolved_change_name is missing'));
  assert.ok(verdict(base({ ...CONTRACT_REPORTS.spec, warnings: [{ spec_assertion: 'a' }] }), 'spec').errors.some((e) => e.startsWith('warnings[0] must have exactly the keys')));
  assert.ok(verdict(base({ ...CONTRACT_REPORTS.merge, applicability: 'maybe' }), 'merge').errors.some((e) => e.startsWith('applicability must be one of')));
});

test('a review report that carries an outcome owes no role field, and a failed or needs_input one owes none either', () => {
  assert.deepEqual(verdict(base({ outcome: 'no-changes' }), 'review').errors, []);
  assert.deepEqual(verdict({ status: 'failed', summary: 'x', changed_files: [] }, 'review').errors, []);
  assert.deepEqual(verdict({ status: 'needs_input', summary: 'x', changed_files: [], question: 'q', options: [] }, 'implement').errors, []);
});

test('E2: an unknown key and a cross-kind key are rejected, for every command', () => {
  for (const [command, report] of Object.entries(CONTRACT_REPORTS)) {
    const unknown = verdict({ ...report, surprise: 1 }, command);
    assert.deepEqual(unknown.errors, [`surprise is not a field of a ${command} report`], command);
    const crossKind = verdict({ ...report, event: 'progress' }, command);
    assert.ok(crossKind.errors.includes('event belongs to a progress report, not a terminal one'), command);
  }
  const progress = { event: 'progress', step_ids: ['a'], changed_files: [] };
  assert.deepEqual(verdict(progress, null, 'progress').errors, []);
  assert.deepEqual(verdict({ ...progress, status: 'completed' }, null, 'progress').errors, ['status belongs to a terminal report, not a progress one']);
  assert.deepEqual(verdict({ ...progress, extra: true }, null, 'progress').errors, ['extra is not a field of a progress report']);
  // A role field of another command is an unknown key here.
  assert.ok(verdict({ ...CONTRACT_REPORTS.commit, notes: 'x' }, 'commit').errors.includes('notes is not a field of a commit report'));
  // question and options belong to needs_input only.
  assert.ok(verdict({ ...CONTRACT_REPORTS.commit, question: 'q' }, 'commit').errors.includes('question is allowed only on a needs_input report'));
});

test('the failure fields exist only on the failed reports of archive, backfill, and direct-build', () => {
  const failed = (extra) => ({ status: 'failed', summary: 'x', changed_files: [], ...extra });
  for (const command of ['archive', 'backfill', 'direct-build']) {
    assert.deepEqual(verdict(failed({ resolved_change_name: 'x', failure_class: 'validation-failed', unrecoverable: true }), command).errors, [], command);
    assert.deepEqual(verdict(failed({}), command).errors, [], `${command} before resolution`);
    assert.ok(verdict(failed({ failure_class: 'validation-failed', unrecoverable: false }), command).ok, `${command} may carry them unresolved`);
    assert.ok(verdict(base({ resolved_change_name: 'x', failure_class: 'validation-failed' }), command).errors.includes('failure_class is allowed only on a failed report'), command);
  }
  for (const command of ['commit', 'review', 'merge', 'implement']) {
    assert.ok(verdict(failed({ failure_class: 'validation-failed' }), command).errors.includes(`failure_class is not a field of a ${command} report`), command);
  }
});

test('E3: a terminal validation without --command is a usage error; a progress one needs none', () => {
  const noCommand = tool(JSON.stringify(base()), ['validate', '--kind', 'terminal', '--json']);
  assert.equal(noCommand.status, 2);
  assert.match(noCommand.stderr, /validate --kind terminal requires --command/);
  assertValidSidecar(tool(JSON.stringify({ event: 'progress', step_ids: [], changed_files: [] }), ['validate', '--kind', 'progress', '--json']), 'progress');
  // The library refuses a terminal verdict without a command as well.
  assert.ok(verdict(base(), null).errors.some((e) => e.includes('--command')));
});

test('E6: the batch questions form of needs_input is rejected, while counts.questions stays valid', () => {
  const batch = verdict({ status: 'needs_input', summary: 's', changed_files: [], question: 'q', options: [],
    questions: [{ id: 'a', question: 'q', options: [{ label: 'a', value: 'a' }] }] }, 'merge');
  assert.deepEqual(batch.errors, ['questions is not a field of a merge report']);
  const onlyBatch = verdict({ status: 'needs_input', summary: 's', changed_files: [],
    questions: [{ id: 'a', question: 'q', options: [] }] }, 'merge');
  assert.ok(onlyBatch.errors.includes('question is missing'));
  assert.deepEqual(verdict(base(REVIEW_FIELDS), 'review').errors, []);
  assert.equal(fs.readFileSync(TOOL, 'utf8').includes('batch v1'), false, 'the batch form is gone from the validator');
});

test('the role-field table matches the role fields listed in the transport policy', () => {
  const policy = fs.readFileSync(path.join(REPO_ROOT, 'sai', 'policies', 'worker-report-transport.md'), 'utf8');
  const section = policy.slice(policy.indexOf('### Role fields'), policy.indexOf('### Progress reports'));
  const rows = new Map();
  for (const line of section.split('\n')) {
    if (!line.startsWith('| `')) continue;
    const cells = line.split('|').map((cell) => cell.trim());
    const names = (cell) => [...cell.matchAll(/`([^`]+)`/g)].map((match) => match[1]);
    const [command] = names(cells[1]);
    if (command === '--command') continue;
    rows.set(command, names(cells[3]));
  }
  assert.deepEqual([...rows.keys()].sort(), Object.keys(validator.COMMAND_FIELDS).sort());
  for (const [command, fields] of rows) {
    assert.deepEqual([...fields].sort(), Object.keys(validator.COMMAND_FIELDS[command]).sort(), `${command} role fields match the policy table`);
  }
});

test('every role field a worker card shapes is in its command\'s table', () => {
  const cards = {
    implement: 'sai/commands/implement/worker-common.md',
    spec: 'sai/commands/plan/worker-common.md',
    design: 'sai/commands/plan/worker-common.md',
    review: 'sai/commands/review/worker.md',
    security: 'sai/commands/audit/worker-common.md',
    performance: 'sai/commands/audit/worker-common.md',
    accessibility: 'sai/commands/audit/worker-common.md',
    archive: 'sai/commands/archive/worker.md',
    commit: 'sai/commands/commit/worker.md',
  };
  const baseKeys = new Set(['status', 'summary', 'changed_files', 'outcome', 'question', 'options', 'event', 'step_ids']);
  for (const [command, card] of Object.entries(cards)) {
    const text = fs.readFileSync(path.join(REPO_ROOT, card), 'utf8');
    for (const block of text.matchAll(/```yaml\n([\s\S]*?)```/g)) {
      for (const line of block[1].split('\n')) {
        const key = /^([a-z_]+):/.exec(line);
        if (!key || (baseKeys.has(key[1]) && key[1] !== 'step_ids')) continue;
        if (key[1] === 'step_ids' && !['spec', 'design'].includes(command)) continue;
        assert.ok(key[1] in validator.COMMAND_FIELDS[command], `${card} spells ${key[1]}, which ${command} does not list`);
      }
    }
  }
});
