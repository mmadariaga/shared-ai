'use strict';

const SPEC_COORDINATOR_ARTIFACTS = {
  invocationCore: 'sai/commands/spec/invocation.md',
  coordinator: 'sai/commands/spec/coordinator.md',
  worker: 'sai/orchestration/workers/sai-1-spec-proposal-worker.md',
  claudeBinding: 'sai/orchestration/workers/bindings/claude/spec-worker.md',
  opencodeBinding: 'sai/orchestration/workers/bindings/opencode/spec-worker.md',
};

const REQUIRED_OPERATIONS = [
  'dispatch_worker',
  'continue_same_worker',
  'dispatch_one_replacement_worker',
];

module.exports = { SPEC_COORDINATOR_ARTIFACTS, REQUIRED_OPERATIONS };
