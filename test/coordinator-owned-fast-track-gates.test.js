'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function read(file) {
  // Normalize CRLF checkouts (Windows autocrlf) to LF so heading scans
  // hold on every platform. See .gitattributes (eol=lf).
  return fs.readFileSync(path.join(__dirname, '..', file), 'utf8').replace(/\r\n/g, '\n');
}

test('published build specification keeps fast-track out of build and with the implement coordinator', () => {
  const spec = read('openspec/specs/sai-build-command/spec.md');
  const heading = '### Requirement: Build strips residual fast-track tokens before resolution\n';
  const start = spec.indexOf(heading);
  assert.notEqual(start, -1, 'published specification should contain the fast-track token requirement');
  const next = spec.indexOf('\n### Requirement:', start + heading.length);
  const requirement = spec.slice(start + heading.length, next === -1 ? spec.length : next);
  assert.match(requirement, /every `--fast-track` token SHALL be removed from `arguments_value` in any order, by the first implementation segment's Start step/);
  assert.match(requirement, /SHALL not make build a fifth parser or create build-local fast-track state/);
  assert.match(read('sai/commands/implement/coordinator.md'), /Drop any `--fast-track` token from `arguments_value`/);
});

test('explore strips the fast-track token silently and keeps no fast-track state or skip', () => {
  const policy = read('sai/policies/fast-track-flag.md');
  assert.match(policy, /`\/sai-explore` strips the token silently and treats the remainder as the\s+request: no banner, no `fast_track_active` state, and no behavioral effect/);
  assert.doesNotMatch(policy, /keeps its own parse|open-decision reconfirmation|POC lane/);
  const body = read('sai/commands/explore/body.md');
  assert.match(body, /Remove the `--fast-track` token from `arguments_value` and trim surrounding whitespace, silently: no banner, no signal, and no behavioral effect/);
  assert.doesNotMatch(body, /FAST-TRACK MODE ACTIVE/);
  const stepsDirectory = path.join(__dirname, '..', 'sai', 'commands', 'explore', 'steps');
  for (const file of fs.readdirSync(stepsDirectory)) {
    assert.doesNotMatch(read(`sai/commands/explore/steps/${file}`), /fast[- ]track/i, `explore step ${file} names no fast-track behavior`);
  }
  assert.doesNotMatch(read('AGENTS.md'), /sai-explore`, `sai-archive`, and `sai-backfill`/, 'AGENTS.md lists no explore fast-track parse');
});
