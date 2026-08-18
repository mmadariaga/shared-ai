'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

test('Claude and opencode expose symmetric surface-neutral panel bindings', () => {
  const claude = read('sai/adapters/claude/panel-render.md');
  const opencode = read('sai/adapters/opencode/panel-render.md');

  for (const binding of [claude, opencode]) {
    assert.match(binding, /native task panel/);
    assert.match(binding, /never runtime-detected/);
    assert.match(binding, /machine-readable marker carrier/);
    assert.match(binding, /start clear/);
    assert.doesNotMatch(binding, /sai-idea-list:|sai-explore-stage:/);
  }
  assert.match(claude, /TaskList|TaskGet|TaskUpdate/);
  assert.match(opencode, /todowrite|todos/);
  for (const binding of [claude, opencode]) {
    assert.match(binding, /unavailable at runtime/);
    assert.match(binding, /exactly one visible notice/);
    assert.match(binding, /continuing without task-panel updates/);
    assert.match(binding, /does not activate a plain-text fallback/);
    assert.match(binding, /does not retry or runtime-detect/);
  }
});

test('explore bindings delegate mechanics while retaining their idea-list policy', () => {
  const claude = read('sai/adapters/claude/idea-list-render.md');
  const opencode = read('sai/adapters/opencode/idea-list-render.md');

  assert.match(claude, /Fetch @sai\/adapters\/claude\/panel-render\.md/);
  assert.match(opencode, /Fetch @sai\/adapters\/opencode\/panel-render\.md/);
  assert.match(claude, /sai-idea-list:<change-name>/);
  assert.match(opencode, /sai-idea-list:<change-name>/);
  assert.match(claude, /active review item/);
  assert.match(opencode, /active review item/);
  assert.match(claude, /change name/);
  assert.match(opencode, /change name/);
  assert.doesNotMatch(claude, /TaskList|TaskGet|TaskUpdate/);
  assert.doesNotMatch(opencode, /todowrite|todos/);
});
