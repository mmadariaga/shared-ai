'use strict';

// Step 1 contract stub. The implementation phase replaces these placeholders.
const ImplementationAdapter = {
  original_envelope: null,
  allowed_extensions: [],
  extension_handlers: null,
  replacement_fields: [
    'resolved_change_name?',
    'opaque_input_history',
    'durable_artifact_reconstruction_instruction',
  ],
  terminal_navigation: () => 'completion',
  validate_terminal_payload: () => true,
  build_replacement_request: () => null,
  validate_plan: () => false,
};

module.exports = { ImplementationAdapter };
