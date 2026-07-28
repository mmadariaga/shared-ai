'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ImplementationAdapter } = require('../fixtures/implementation-adapter.js');

test('Step 1 rejects post-resolution terminal payloads without a resolved change name', () => {
  const payload = {
    status: 'completed',
    lifecycle: { phase: 'terminal' },
  };

  assert.equal(ImplementationAdapter.validate_terminal_payload(payload), false);
  assert.notEqual(ImplementationAdapter.terminal_navigation(payload), 'completion');
});

test('Step 1 replacement request forwards only the exact reconstruction envelope', () => {
  const input = {
    original_envelope: { wrapper_echo_value: '', arguments_value: 'change-a' },
    resolved_change_name: 'change-a',
    opaque_input_history: [
      {
        question: 'Which change?',
        options: [
          { label: 'Change A', value: 'change-a' },
          { label: 'Change B', value: 'change-b' },
        ],
        answer_value: 'change-a',
      },
    ],
    durable_artifact_reconstruction_instruction:
      'Reread the current durable artifacts before continuing.',
    binding_identifier: 'must-not-forward',
  };
  const expected = {
    original_envelope: input.original_envelope,
    resolved_change_name: input.resolved_change_name,
    opaque_input_history: input.opaque_input_history,
    durable_artifact_reconstruction_instruction:
      input.durable_artifact_reconstruction_instruction,
  };

  assert.deepEqual(ImplementationAdapter.build_replacement_request(input), expected);
});

test('Step 1 accepts a plan with ordered coverage, RED before GREEN, verification, STOP and COMMIT, and no execution', () => {
  const plan = {
    tasks: [
      { order: 1, description: 'Define the adapter contract' },
      { order: 2, description: 'Define worker payload handling' },
    ],
    verification: ['Run the focused Node test command'],
    markers: ['RED', 'GREEN', 'STOP & COMMIT'],
    red_before_green: true,
    interface_conformance: true,
    implementation_executed: false,
  };

  assert.equal(ImplementationAdapter.validate_plan(plan), true);
});
