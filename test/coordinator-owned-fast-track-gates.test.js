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

test('implementation coordinator carries the fast-track boolean and gives the planner one gap-driven research rule', () => {
  const coordinator = read('sai/commands/implement/coordinator.md');
  const worker = read('sai/commands/implement/worker.md');
  const common = read('sai/commands/implement/steps/common.md');
  const docReview = read('sai/commands/implement/steps/documentation-review.md');
  const planGeneration = read('sai/commands/implement/steps/plan-generation.md');
  assert.match(worker, /post-ready task continuation and again in replacement reconstruction/);
  assert.match(coordinator, /Do not send the raw `--fast-track` token to the worker/);
  assert.match(common, /## Planning Evidence/);
  assert.match(common, /A \*\*gap\*\* is evidence indispensable to plan one specific Step/);
  assert.match(common, /`budget-explorer` dispatch/);
  assert.match(common, /one line per gap in the form `Researched gap: Step N/);
  assert.match(docReview, /Planning Evidence rule in `steps\/common\.md`/);
  assert.match(planGeneration, /Planning Evidence rule in `steps\/common\.md`/);
});

test('apply grants first Step and eligible terminal local commits at segment entry only', () => {
  const apply = read('sai/commands/apply/coordinator.md');
  const build = read('sai/commands/meta-build/coordinator.md');
  const runner = read('sai/commands/apply/runner.md');
  const invocation = read('sai/commands/apply/invocation.md');
  assert.match(apply, /after the standalone Fast-track parse or the chained supervisor's injected signal is known and before Run-Start Step Projection or first Step work, set `session_commit_authorized=true`/);
  assert.match(build, /At apply segment activation, inject fast-track true before Run-Start Step Projection/);
  assert.match(invocation, /sole authority that detects and removes `--fast-track`/);
  assert.match(runner, /Visibility report[\s\S]*Message[\s\S]*Authorization[\s\S]*git add -- <add-list>` exactly/);
  assert.match(apply, /does not authorize pushes, branch changes, unrelated files, unresolved-conflict stops/);
});

test('both harness wrappers use the same coordinator and implementation binding', () => {
  for (const harness of ['claude', 'opencode']) {
    assert.match(read(`commands/${harness}/sai-build.md`), /@sai\/commands\/meta-build\/command-bootstrap\.md/);
    assert.match(read(`commands/${harness}/sai-3-implement.md`), /@sai\/commands\/implement\/command-bootstrap\.md/);
    assert.match(read(`commands/${harness}/sai-4-apply.md`), /@sai\/commands\/apply\/command-bootstrap\.md/);
  }
});

test('published build specification preserves coordinator-owned fast-track grants', () => {
  const spec = read('openspec/specs/sai-build-command/spec.md');
  const requirement = title => {
    const heading = `### Requirement: ${title}\n`;
    const start = spec.indexOf(heading);
    assert.notEqual(start, -1, `published specification should contain ${title}`);
    const next = spec.indexOf('\n### Requirement:', start + heading.length);
    return spec.slice(start + heading.length, next === -1 ? spec.length : next);
  };
  const activation = requirement('Apply fast-track is injected and composition-owned');
  assert.match(activation, /print `> FAST-TRACK MODE ACTIVE` exactly once at implement activation, not at apply activation/);
  const commit = requirement('Apply commit grant is active before the first Step');
  assert.match(commit, /At apply segment entry the apply coordinator SHALL set `session_commit_authorized` from injected fast-track state before Step projection or dispatch/);
});

test('fast-track never skips the explore open-decision reconfirmation', () => {
  const policy = read('sai/policies/fast-track-flag.md');
  assert.match(policy, /open-decision reconfirmation at `Crystallize` entry\s+\(`sai\/commands\/explore\/steps\/open-decisions\.md`\) runs unchanged under\s+`--fast-track`/);
  assert.match(policy, /every open decision is asked/);
  assert.match(read('AGENTS.md'), /open-decision reconfirmation at Crystallize entry \(`sai\/commands\/explore\/steps\/open-decisions\.md`\) always runs/);
  assert.match(read('sai/commands/explore/steps/open-decisions.md'), /`--fast-track` leaves this step unchanged \(`sai\/policies\/fast-track-flag\.md`\)/);
});
