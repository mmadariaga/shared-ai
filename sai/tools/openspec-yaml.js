#!/usr/bin/env node

'use strict';

/**
 * openspec-yaml — shared reader for .openspec.yaml metadata files.
 *
 * Extracted for reuse by the status tool and the linter. Reads .openspec.yaml
 * and extracts key values by regex. No external dependencies; Node stdlib only.
 *
 * Exported as a module for require() by other tools.
 */

const fs = require('fs');

/** Usage error / tooling failure. Carries the exit code the caller sees. */
class ToolError extends Error {
  constructor(message, code = 2) {
    super(message);
    this.code = code;
  }
}

function pathExists(target) {
  try {
    fs.lstatSync(target);
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Read .openspec.yaml and extract key values by regex.
 * Returns object with: approval_specs_approved_at, overview_state, backfilled
 * Returns null if file doesn't exist.
 * Throws ToolError if file is unreadable.
 */
function readOpenspecYaml(yamlPath) {
  if (!pathExists(yamlPath)) {
    return null;
  }

  let content;
  try {
    content = fs.readFileSync(yamlPath, 'utf8');
  } catch (err) {
    throw new ToolError(`failed to read ${yamlPath}: ${err.message}`);
  }

  const result = {
    approval_specs_approved_at: null,
    overview_state: null,
    backfilled: false,
  };

  // Extract approval.specs.approved_at - look for the nested key more flexibly
  // First try multi-line structure, then try compact forms
  let approvalMatch = content.match(/^\s*approval:\s*\n\s*specs:\s*\n\s*approved_at:\s*(.+?)$/m);
  if (!approvalMatch) {
    // Try inline or varied spacing
    approvalMatch = content.match(/approval\.specs\.approved_at:\s*(.+?)$/m);
  }
  if (approvalMatch && approvalMatch[1].trim()) {
    result.approval_specs_approved_at = approvalMatch[1].trim();
  }

  // Extract overview.state - look for nested or dotted form
  let overviewMatch = content.match(/^\s*overview:\s*\n\s*state:\s*(\S+)/m);
  if (!overviewMatch) {
    overviewMatch = content.match(/overview\.state:\s*(\S+)/m);
  }
  if (overviewMatch) {
    result.overview_state = overviewMatch[1];
  }

  // Extract backfilled flag
  const backfilledMatch = content.match(/^\s*backfilled:\s*(true|false)/m);
  if (backfilledMatch) {
    result.backfilled = backfilledMatch[1] === 'true';
  }

  return result;
}

module.exports = { readOpenspecYaml, ToolError };
