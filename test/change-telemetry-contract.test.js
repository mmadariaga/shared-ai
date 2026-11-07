'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

test('I7: the sai-workflow schema declares the optional telemetry artifact with a template and no dependency', () => {
  const schema = read('openspec/schemas/sai-workflow/schema.yaml');
  const start = schema.indexOf('  - id: telemetry');
  assert.ok(start >= 0, 'schema.yaml should declare the telemetry artifact');
  const entry = schema.slice(start, schema.indexOf('\napply:', start));
  assert.match(entry, /generates: telemetry\.md/);
  assert.match(entry, /requires: \[\]/);
  assert.ok(fs.existsSync(path.join(__dirname, '..', 'openspec/schemas/sai-workflow/templates/telemetry.md')));
  assert.ok(!/requires:.*telemetry/.test(schema), 'no artifact requires telemetry');
});

test('I4: every plan review round file ends with the base-form Summary line', () => {
  const cycle = read('sai/commands/plan/cycle.md');
  assert.match(cycle, /End every round file with the line `Summary: High=<n> Medium=<n> Low=<n>`/);
  assert.match(cycle, /state in that file is `open`/);
});

test('I5: both coordinators fetch the telemetry policy and record telemetry before their closing line', () => {
  const plan = read('sai/commands/plan/coordinator.md');
  assert.match(plan, /Fetch `@sai\/policies\/change-telemetry\.md`/);
  assert.ok(plan.indexOf('record the change telemetry') < plan.indexOf('close the planning report with exactly'), 'telemetry comes before the plan closing line');
  assert.match(plan, /--command sai-explore-plan` when this coordinator runs inside the `\/sai-explore` \*\*Plan - Unattended\*\* route and `--command sai-plan` otherwise/);
  assert.match(plan, /--run-dir` set to the run directory/);
  const build = read('sai/commands/build/coordinator.md');
  assert.match(build, /Fetch `@sai\/policies\/change-telemetry\.md`/);
  assert.ok(build.indexOf('record the change telemetry') < build.indexOf('End with exactly `Build done.`'), 'telemetry comes before the build closing line');
  assert.match(build, /--command sai-build/);
});

test('E1, E2, E3, E12, E13: the policy gates on the setting, skips relays, and commits only an unignored file', () => {
  const policy = read('sai/policies/change-telemetry.md');
  assert.match(policy, /experimental\.changeTelemetry` is `true`/);
  assert.match(policy, /do nothing, with no tool call, no file, no commit, and no line/);
  assert.match(policy, /in-session route: \*\*Plan - Unattended\*\* or \*\*Direct Build - Unattended\*\*/);
  assert.match(policy, /`\/sai-deep-review` composes a segment, record nothing/);
  assert.match(policy, /--command <sai-plan\|sai-build\|sai-explore-plan\|sai-explore-direct-build>/);
  assert.match(policy, /starts at the creation of the slice's first route worker/);
  assert.match(policy, /openspec\/changes\/archive\/YYYY-MM-DD-\{name\}\//);
  assert.match(policy, /add the `reason` as one line to the closing report/);
  assert.match(policy, /git check-ignore -q <path>/);
  assert.match(policy, /git add` that path alone and commit with `git commit -m "<subject>" -- <path>`/);
  assert.match(policy, /stays on disk uncommitted and one line of the closing report says so/);
  assert.match(policy, /Never force-add with `-f`, never push/);
});

test('I7: the Direct Build coordinator collects after the archive clean result and commits it before its report', () => {
  const card = read('sai/commands/explore/direct-build-coordinator.md');
  assert.match(card, /Fetch `@sai\/policies\/change-telemetry\.md`/);
  assert.match(card, /--command sai-explore-direct-build`, `--status completed`, and `--run-dir <run directory>/);
  assert.match(card, /archive worker returned a clean `completed` result, record the change telemetry/);
  assert.ok(card.indexOf('record the change telemetry') < card.indexOf('Close with the Direct Build terminal report'), 'telemetry comes before the terminal report');
  assert.match(card, /pre-authorized exactly two local commits/);
  assert.match(card, /reviews\/implement-round-\{k\}\.md/);
  assert.match(card, /mkdtemp --harness <claude\|opencode> --prefix direct-build-\{name\}-/);
});

test('I7: the Direct Build route pre-authorizes two local commits in the selector and the route card', () => {
  const selector = read('sai/commands/explore/steps/route-selector.md');
  assert.match(selector, /pre-authorizes exactly two local commits/);
  assert.match(selector, /Description: Implement, update specs, archive, and authorize two local commits\./);
  assert.ok(!/one local commit/.test(selector), 'no selector statement keeps the single-commit authorization');
  const route = read('sai/commands/explore/steps/pipeline-direct-build.md');
  assert.match(route, /pre-authorizes two local commits for the current slice/);
  assert.ok(!/exactly one local commit/.test(route), 'the route card keeps no single-commit authorization');
});

test('I3: the setting is documented in the catalogue table and its own section', () => {
  const docs = read('docs/project-settings.md');
  assert.match(docs, /\| `experimental\.changeTelemetry` \| `true` or `false`/);
  assert.match(docs, /## Change telemetry/);
});

test('the tool resolution policy lists the collector and its invocation', () => {
  const resolution = read('sai/policies/tool-resolution.md');
  assert.match(resolution, /`change-telemetry\.js`: `node <tool-path> collect --harness/);
});

test('Explore origin: the block label, its persistence, and the exploration section are documented where each owner reads them', () => {
  assert.match(read('sai/policies/ready-to-propose-format.md'), /\*\*Explore origin\*\*: <harness> <sessionID>\[, <harness> <sessionID>…\]/);
  assert.match(read('sai/policies/ready-to-propose-format.md'), /INVALID_EXPLORE_ORIGIN/);
  const crystallization = read('sai/commands/explore/steps/crystallization-protocol.md');
  assert.match(crystallization, /copy its list in order and unchanged/);
  assert.match(crystallization, /`experimental\.changeTelemetry` is `true`/);
  assert.match(crystallization, /`--harness opencode --session <sessionID>`/);
  assert.match(crystallization, /`--harness claude --session <id>`[\s\S]*Session id: \$\{CLAUDE_SESSION_ID\}/);
  assert.match(read('commands/claude/sai-explore.md'), /^Session id: \$\{CLAUDE_SESSION_ID\}$/m);
  assert.match(crystallization, /keep the inherited list unchanged and append nothing/);
  assert.match(read('sai/commands/spec/worker.md'), /write the validator's returned `explore_origin` list as the flat flow list/);
  assert.match(read('sai/commands/backfill/instructions.md'), /`explore_origin: \[<sessionID>, <sessionID>\]`/);
  assert.match(read('sai/commands/backfill/coordinator.md'), /`backlog_origin` and `explore_origin`/);
  assert.match(read('sai/commands/explore/direct-build-coordinator.md'), /`Backlog origin` and `Explore origin` unchanged to backfill/);
  assert.match(read('sai/commands/explore/direct-build-coordinator.md'), /`backlog_origin` and `explore_origin` of section 6a/);
  assert.match(read('sai/policies/change-telemetry.md'), /## Exploration[\s\S]*recorded once per change/);
  assert.match(read('sai/policies/tool-resolution.md'), /explore-origin --harness <claude\|opencode> --session <sessionID>/);
  assert.match(read('openspec/schemas/sai-workflow/templates/telemetry.md'), /## Exploration/);
});
