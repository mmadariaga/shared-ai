#!/usr/bin/env node

'use strict';

/**
 * temp-root — shared harness temp root resolver.
 *
 * Resolves the one directory under which SAI helpers create private
 * per-invocation directories. The map is the one `to-pr.js` already uses:
 * opencode on Linux uses `/tmp/opencode`; every other harness/platform pair
 * uses `os.tmpdir()`. The reason for the opencode root is unrecorded, so the
 * map is kept as is.
 *
 * The root must already exist as a directory that is not a symbolic link. This
 * module never creates, repairs, or chmods the root: a missing root is a
 * concrete blocker for the caller to report.
 */

const fs = require('node:fs');
const os = require('node:os');

const HARNESSES = ['claude', 'opencode'];
const OPENCODE_LINUX_ROOT = '/tmp/opencode';

/** Blocker raised when the root is missing or unusable. Never repaired here. */
class TempRootError extends Error {
  constructor(message, code = 'TEMP_ROOT_UNUSABLE') {
    super(message);
    this.code = code;
  }
}

/** The candidate root for a harness, before any filesystem check. */
function candidateRoot(harness, { platform = process.platform, tmpdir = os.tmpdir } = {}) {
  if (!HARNESSES.includes(harness)) throw new TempRootError('Expected harness: claude or opencode', 'USAGE');
  return platform === 'linux' && harness === 'opencode' ? OPENCODE_LINUX_ROOT : tmpdir();
}

/**
 * Resolve and verify the harness temp root. Dependencies are injectable for
 * tests; the CLI accepts no root override.
 */
function resolveTempRoot(harness, { platform = process.platform, tmpdir = os.tmpdir, io = fs } = {}) {
  const root = candidateRoot(harness, { platform, tmpdir });
  let stat;
  try {
    stat = io.lstatSync(root);
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new TempRootError(`Required existing temporary root ${root} is missing; restore the permitted temporary location before retrying. This helper does not create or repair shared roots`, 'TEMP_ROOT_MISSING');
    }
    throw error;
  }
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    throw new TempRootError(`Temporary root ${root} must be an existing directory that is not a symbolic link`);
  }
  return root;
}

module.exports = { HARNESSES, OPENCODE_LINUX_ROOT, TempRootError, candidateRoot, resolveTempRoot };
