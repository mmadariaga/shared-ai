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

test('implementation coordinator owns typed lookup decisions for build and standalone', () => {
  const coordinator = read('sai/commands/implement/coordinator.md');
  const worker = read('sai/commands/implement/worker.md');
  const step = read('sai/commands/implement/steps/plan-generation.md');
  assert.match(coordinator, /Validate the entire payload with `worker-report-validator\.js` before any/);
  assert.match(coordinator, /Only a valid `needs_input` with `lookup_request\.type: bounded-project-lookup`/);
  assert.match(coordinator, /approve every valid item with\s+`answer_value: yes` without presenting the picker/);
  assert.match(coordinator, /Otherwise present each\s+question and its ordered yes\/no options/);
  assert.match(coordinator, /lookup_request_history[\s\S]*replacement resumes a decided request without presenting it again/);
  assert.match(step, /≤3 citations per area, ≤20 lines per citation, project-root confined/);
  assert.match(step, /The worker never auto-approves this permission/);
  assert.match(worker, /post-ready task continuation and again in replacement reconstruction/);
  assert.match(coordinator, /Do not send the raw `--fast-track` token to the worker/);
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
  const lookup = requirement('Implementation coordinator decides bounded lookup authorization');
  assert.match(lookup, /typed validated bounded-project-lookup request with 1–5 functional areas/);
  assert.match(lookup, /The coordinator SHALL approve each valid item/);
  assert.match(lookup, /ordinary standalone implementation SHALL present each item for a decision/);
  assert.match(lookup, /project-root, read-only, citation \(at most three per area\), and line \(at most 20 per citation\) limits/);
  assert.match(lookup, /Ordered decisions and original limits SHALL survive worker continuation and replacement without new approval or broader search/);
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
