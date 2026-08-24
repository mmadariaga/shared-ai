'use strict';

const SPEC_COORDINATOR_ARTIFACTS = {
  phaseContract: 'sai/policies/spec-phase-contract.md',
  coordinator: 'sai/commands/spec/coordinator.md',
  worker: 'sai/commands/spec/worker.md',
  claudeBinding: 'sai/orchestration/workers/bindings/claude/spec-worker.md',
  opencodeBinding: 'sai/orchestration/workers/bindings/opencode/spec-worker.md',
};

const REQUIRED_OPERATIONS = [
  'dispatch_worker',
  'continue_same_worker',
  'dispatch_one_replacement_worker',
];

module.exports = { SPEC_COORDINATOR_ARTIFACTS, REQUIRED_OPERATIONS };
