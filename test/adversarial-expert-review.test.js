'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(repoRoot, file), 'utf8');
const manifest = require('../sai/install-manifest.json');
const { EXPERT_REVIEW_ROLES } = require('../bin/worker-matrix.js');
const validator = require('../sai/tools/worker-report-validator.js');

const CARD = 'sai/commands/adversarial-expert-review/worker.md';
const POLICY = 'sai/policies/adversarial-expert-review.md';
const WORKER = 'sai-adversarial-expert-review-worker';

test('the matrix pins one expert review role after the plan roles, on the request expert tier', () => {
  assert.deepEqual(EXPERT_REVIEW_ROLES.map(role => [role.phase, role.workerName, role.bindingStem, role.tier]), [
    ['expert-review', WORKER, 'adversarial-expert-review', 'expert'],
  ]);
  const entries = manifest['worker-matrix'].entries;
  assert.deepEqual(entries.map(entry => entry.phase), [
    'spec', 'design', 'security', 'performance', 'accessibility', 'commit', 'archive', 'backfill', 'merge',
    'direct-build', 'red', 'green', 'review', 'design-red', 'expert-review',
  ]);
  const entry = entries.find(candidate => candidate.workerName === WORKER);
  assert.ok(entry, 'the manifest should declare the expert review worker');
  assert.equal(entry.workerContract, CARD);
  assert.equal(entry.bindingStem, 'adversarial-expert-review');
  assert.equal(entry.selfContained, true, 'the reviewer agent body is inlined from its contract');
  assert.equal(entry.dispatchPrompt,
    'Return event: ready now; await task disclosure in the same-worker continuation.\n\nReturn exactly:\n```yaml\nevent: ready\nchanged_files: []\n```',
    'the reviewer is created with a ready-only prompt');
  for (const other of entries.filter(candidate => candidate.workerName !== WORKER)) {
    assert.equal(Object.hasOwn(other, 'selfContained'), false,
      `${other.workerName} should keep its canonical fetch chain`);
  }
  assert.equal(entry.claudeAgent.model, 'opus');
  assert.equal(entry.claudeAgent.effort, 'high');
  assert.equal(entry.opencodeAgent.model, 'opencode-go/gpt-5.6-luna');
  assert.equal(entry.opencodeAgent.variant, 'max');
});

test('the expert reviewer holds read, edit, write, and shell access with no delegation', () => {
  assert.equal(manifest.capabilities.assignments.agents[WORKER], 'worker-expert');
  assert.deepEqual(manifest.capabilities.profiles['worker-expert'], { extends: 'worker-write' });
  const resolved = {};
  const walk = name => {
    const profile = manifest.capabilities.profiles[name];
    if (profile.extends) walk(profile.extends);
    for (const [key, value] of Object.entries(profile)) {
      if (key !== 'extends') resolved[key] = value;
    }
  };
  walk('worker-expert');
  assert.equal(resolved.read, true);
  assert.equal(resolved.write, true);
  assert.ok(resolved.shell.includes('*'));
  assert.equal(Object.hasOwn(resolved, 'delegate'), false, 'the reviewer dispatches no subagent');
  for (const command of ['sai-explore', 'sai-plan', 'sai-build']) {
    const profile = manifest.capabilities.profiles[manifest.capabilities.assignments.commands[command]];
    assert.ok(profile.delegate.includes(WORKER), `${command} should be able to dispatch the reviewer`);
  }
  for (const command of ['sai-1-spec', 'sai-2-design', 'sai-3-implement', 'sai-4-review', 'sai-deep-review', 'sai-merge', 'sai-commit', 'sai-archive']) {
    const profile = manifest.capabilities.profiles[manifest.capabilities.assignments.commands[command]];
    assert.equal((profile.delegate || []).includes(WORKER), false, `${command} should not dispatch the reviewer`);
  }
});

test('the expert review worker prompt is self-contained, carries the protocol, and imports no SAI file', () => {
  const card = read(CARD);
  assert.doesNotMatch(card, /Fetch\??\s+`@/, 'the self-contained prompt carries no Fetch @ directive');
  assert.doesNotMatch(card, /@sai\/(?:policies|commands)\//, 'the prompt names no SAI policy or command file to read');
  assert.doesNotMatch(card, /worker-common/, 'the prompt delegates to no shared worker card');
  assert.match(card, /```yaml\nevent: ready\nchanged_files: \[\]\n```/);
  assert.match(card, /`--report-dir <path>`/);
  assert.match(card, /`Mode:` `document` or `mutations`/);
  assert.match(card, /`Transfer path:`/);
  assert.match(card, /`Document tool path:`/);
  assert.match(card, /`Verdicts file:`/);
  assert.match(card, /`Report name:`/);
  assert.match(card, /`Chat language:`/);
  assert.match(card, /--exclusive/);
  assert.match(card, /Return only the `\{path, sha256\}`/);
  assert.match(card, /scope observation/);
  assert.match(card, /`High` — a defect/);
  assert.match(card, /`Medium` — a material/);
  assert.match(card, /`Low` — a precision/);
  assert.match(card, /severity: High\|Medium\|Low/);
  assert.match(card, /status: completed\nsummary: string\nchanged_files: string\[\]\nfindings:/);
  assert.match(card, /corrected_documents: \{path: string, sha256: string, change_name: string\}\[\]/);
  assert.match(card, /no `outcome` field/);
  assert.match(card, /Run no git command that changes the repository/);
  assert.match(card, /Dispatch no subagent/);
  assert.match(card, /live --note "check the worker is live"/);
  assert.match(card, /retired` or `gone/);
  assert.match(card, /warming chain/);
  assert.match(card, /no `warming:` line/);
  assert.doesNotMatch(card, /emit --progress|event: progress/, 'the reviewer emits no progress report');
  assert.equal(fs.existsSync(path.join(repoRoot, 'sai/commands/adversarial-expert-review/coordinator.md')), false,
    'the reviewer has no coordinator of its own');
});

test('the review brief carries the mode, product, scope, transport paths, and the mode procedure', () => {
  const brief = read('sai/commands/adversarial-expert-review/brief.md');
  for (const fragment of [
    /^Mode: document \| mutations$/m,
    /^Product: /m,
    /^Approved scope: /m,
    /^Allowed write paths: /m,
    /^Transfer path: /m,
    /^Document tool path: /m,
    /^Verdicts file: /m,
    /^Report name: /m,
    /^Scratch folder: /m,
    /^Chat language: /m,
    /## Procedure for document mode/,
    /## Procedure for mutations mode/,
    /check --document-file <corrected file> --slice/,
    /--verdicts-file/,
    /writing-for-agents/,
    /corrected_documents/,
  ]) assert.match(brief, fragment);
  assert.doesNotMatch(brief, /Fetch\??\s+`@/, 'the brief travels as message text, not as a fetch chain');
});

test('the installer inlines the contract as the agent body and renders a ready-only create prompt', () => {
  const { matrixRenderFor } = require('../bin/install-manifest.js');
  const contract = read(CARD).trim();
  for (const harness of ['claude', 'opencode']) {
    const rendered = matrixRenderFor(manifest, harness, repoRoot);
    const agent = rendered.find(item => item.kind === 'agent' && item.phase === 'expert-review');
    assert.ok(agent, `${harness} should render the expert review agent`);
    const frontmatterEnd = agent.text.indexOf('\n---\n') + '\n---\n'.length;
    const marker = agent.text.indexOf('<!-- User customizations below this line -->');
    assert.ok(frontmatterEnd > 0 && marker > frontmatterEnd, `${harness} agent should keep its frontmatter and marker`);
    assert.equal(agent.text.slice(frontmatterEnd, marker).trim(), contract,
      `${harness} agent body should be the worker contract, byte for byte`);
    assert.doesNotMatch(agent.text, /Fetch `@sai\//, `${harness} agent should carry no canonical fetch chain`);

    const binding = rendered.find(item => item.kind === 'binding' && item.phase === 'expert-review');
    assert.ok(binding, `${harness} should render the expert review binding`);
    assert.match(binding.text,
      /prompt: "Return event: ready now; await task disclosure in the same-worker continuation\.\\n\\nReturn exactly:\\n```yaml\\nevent: ready\\nchanged_files: \[\]\\n```"/,
      `${harness} binding should carry the ready-only create prompt`);
    assert.doesNotMatch(binding.text, /Worker contract: Fetch/,
      `${harness} binding should not fetch a contract for the self-contained worker`);
  }
  const other = matrixRenderFor(manifest, 'opencode', repoRoot)
    .find(item => item.kind === 'agent' && item.phase === 'design');
  assert.match(other.text, /^Fetch `@sai\/commands\/design\/worker\.md` and follow it exactly\.$/m,
    'every other managed agent keeps its canonical fetch chain');
});

test('the installer refuses a self-contained contract that is missing, empty, or still fetches', () => {
  const os = require('node:os');
  const { matrixRenderFor } = require('../bin/install-manifest.js');
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-self-contained-'));
  try {
    const written = {
      ...manifest,
      'worker-matrix': {
        ...manifest['worker-matrix'],
        templates: {},
      },
    };
    for (const [name, file] of Object.entries(manifest['worker-matrix'].templates)) {
      const destination = path.join(base, 'templates', `${name}.md`);
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.copyFileSync(path.join(repoRoot, file), destination);
      written['worker-matrix'].templates[name] = path.relative(base, destination).split(path.sep).join('/');
    }
    const contractPath = path.join(base, 'sai/commands/adversarial-expert-review/worker.md');
    fs.mkdirSync(path.dirname(contractPath), { recursive: true });
    const render = () => matrixRenderFor(written, 'opencode', base);

    fs.writeFileSync(contractPath, '');
    assert.throws(render, /self-contained contract is empty/,
      'an empty self-contained contract should fail the expansion');

    fs.writeFileSync(contractPath, 'Contract body.\nFetch `@sai/policies/worker-lifecycle.md`\n');
    assert.throws(render, /self-contained contract declares a Fetch @ directive/,
      'a self-contained contract that still fetches an SAI file should fail the expansion');

    fs.rmSync(contractPath);
    assert.throws(render, /self-contained contract does not exist/,
      'a missing self-contained contract should fail the expansion');

    fs.writeFileSync(contractPath, '# Self-contained\n\nContract body.');
    const agent = render().find(item => item.kind === 'agent' && item.phase === 'expert-review');
    assert.match(agent.text, /# Self-contained\n\nContract body\./,
      'a self-contained contract that stands alone should render as the agent body');
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
});

test('the shared policy owns the answer, the two questions, the cycle, keep-or-revert, and the closing lines', () => {
  const policy = read(POLICY);
  for (const fragment of [
    /The `--expert-review \[no\|auto\|ask\]` argument/,
    /`Cannot start \{command\}: --expert-review takes no, auto or ask\.`/,
    /`No` \(`no`\), `Yes, decide the corrections` \(`auto`\), and `Yes, ask me before keeping them` \(`ask`\)/,
    /`Keep the recommended corrections` \(`recommended`\)/,
    /`Keep all corrections` \(`keep-all`\)/,
    /`Discard all corrections` \(`discard-all`\)/,
    /restore <before-snapshot> <the group's paths>/,
    /review-delta\.js/,
    /Fetch `@sai\/orchestration\/workers\/bindings\/adversarial-expert-review-worker\.md`/,
    /`sai\/commands\/adversarial-expert-review\/brief\.md`/,
    /self-contained prompt/,
    /A missing, invalid, or failed report costs one line in the closing report[\s\S]{0,400}revert every path of the worker's delta from the before-snapshot with `review-delta\.js restore`/,
    /verify the corrected copy against the `sha256` its `corrected_documents` entry reports/,
  ]) assert.match(policy, fragment);
  for (const line of ['Kept:', 'Discarded:', 'Reported without correction:', 'Expert review: no findings.']) {
    assert.match(policy, new RegExp(line.replace('.', '\\.')), `the closing report should carry ${line}`);
  }
  assert.match(policy, /Findings stay out of the repository/);
});

test('a failed worker report and an unverified document copy never leave a correction behind', () => {
  const policy = read(POLICY);
  const checkpoint = policy.slice(policy.indexOf('## The checkpoint'), policy.indexOf('## The findings'));
  assert.match(checkpoint, /Document mode reverts nothing, because the worker wrote only the report directory/);
  assert.match(checkpoint, /A copy that does not match its hash, or that fails the check, is discarded and its stored document stays \(E7\); the finding counts as discarded in the closing report/);
  const design = read('sai/commands/design/coordinator.md');
  assert.match(design, /created through the installed binding that policy § The checkpoint names/);
  assert.doesNotMatch(design, /Fetch\?? `@sai\/orchestration\/workers\/bindings\/adversarial-expert-review-worker\.md`/,
    'the binding is single-sourced in the policy');
});

test('each checkpoint sits where its command can keep or revert before settling', () => {
  const plan = read('sai/commands/plan/coordinator.md');
  assert.match(plan, /## Expert review answer/);
  assert.match(plan, /`--expert-review \[no\|auto\|ask\]`/);
  assert.match(plan, /handing it the valid research pointers of the cycle's Research hand-over for its brief and its own `--expert-review <no\|auto\|ask>` argument/);

  const design = read('sai/commands/design/coordinator.md');
  assert.match(design, /Take `--expert-review <no\|auto\|ask>` out too/);
  const checkpoint = design.slice(design.indexOf('**Expert review checkpoint.**'), design.indexOf('**Commit paths.**'));
  assert.match(checkpoint, /after the last review round and before the commits/);
  assert.match(checkpoint, /the product as this segment's commit paths of the two commits below/);
  assert.match(checkpoint, /red-by-assertion acceptance/);
  assert.match(checkpoint, /expert_review_checkpoint/);

  const build = read('sai/commands/build/coordinator.md');
  assert.match(build, /--expert-review takes no, auto or ask\./);
  assert.match(build, /## Expert review answer/);
  const buildCheckpoint = build.slice(build.indexOf('## Expert review checkpoint'), build.indexOf('## Close'));
  assert.match(buildCheckpoint, /after the last implementation segment that ran completed/);
  assert.match(buildCheckpoint, /test files excluded/);
  assert.match(buildCheckpoint, /test-select\.js/);
  assert.match(buildCheckpoint, /one local commit/);
  assert.match(buildCheckpoint, /inherent-risk block/);
  assert.ok(build.indexOf('## Expert review checkpoint') < build.indexOf('## Close'),
    'the build checkpoint runs before the close steps');
  assert.match(build, /`--expert-review no` always/);

  const implement = read('sai/commands/implement/coordinator.md');
  assert.match(implement, /Take `--expert-review <value>` out too and ignore it/);

  const selector = read('sai/commands/explore/steps/route-selector.md');
  const exploreCheckpoint = selector.slice(selector.indexOf('\n## Expert review checkpoint\n'), selector.indexOf('\n## Optional pre-route actions\n'));
  assert.match(exploreCheckpoint, /right after every document is printed and before round 1/);
  assert.match(exploreCheckpoint, /explore-slice@1 --amend <change-name>/);
  assert.match(exploreCheckpoint, /A corrected copy that fails the check is discarded/);
  assert.ok(selector.indexOf('\n## Expert review checkpoint\n') < selector.indexOf('\n## Optional pre-route actions\n'),
    'explore reviews the documents before its backlog and branch rounds');

  const pipeline = read('sai/commands/explore/steps/pipeline-plan-unattended.md');
  assert.match(pipeline, /--expert-review no/);
});

test('the validator accepts the expert review report shape and rejects an unknown severity', () => {
  assert.ok(Object.hasOwn(validator.COMMAND_FIELDS, 'adversarial-expert-review'));
  assert.deepEqual(Object.keys(validator.COMMAND_FIELDS['adversarial-expert-review']).sort(), ['corrected_documents', 'findings']);
  assert.deepEqual(validator.COMMAND_OUTCOMES['adversarial-expert-review'], []);
  const verdict = payload => validator.validateText(JSON.stringify(payload), 'terminal', { command: 'adversarial-expert-review' });
  const base = { status: 'completed', summary: 'ok', changed_files: [], findings: [] };
  assert.equal(verdict(base).ok, true);
  assert.equal(verdict({ ...base, findings: [{ identifier: 'H1', severity: 'Critical', location: 'a', issue: 'b', correction: 'c' }] }).ok, false);
  assert.equal(verdict({ ...base, findings: [{ identifier: 'H1', severity: 'High', location: 'a', issue: 'b', correction: 'c', paths: ['src/a.js'] }] }).ok, true);
  assert.equal(verdict({ ...base, corrected_documents: [{ path: '/tmp/copy.md', sha256: 'a'.repeat(64), change_name: 'x' }] }).ok, true);
  assert.equal(verdict({ status: 'failed', summary: 'x', changed_files: [] }).ok, true);
});

test('the project setting answers before each question, and Direct Build runs the checkpoint at step-2c', () => {
  const policy = read(POLICY);
  assert.match(policy, /`expertReview\.plan` for `\/sai-plan`, `expertReview\.build` for `\/sai-build` and `\/sai-direct-build`/);
  assert.match(policy, /It reads `expertReview\.explore` before its per-set question/);
  assert.match(policy, /only `auto` runs the checkpoint/);
  assert.match(policy, /## Direct Build/);
  assert.match(policy, /`step-2c`, after the suite gate of Step 2b and before the backfill of Step 3/);

  assert.match(read('sai/commands/plan/coordinator.md'), /the `expertReview\.plan` setting/);
  assert.match(read('sai/commands/build/coordinator.md'), /the `expertReview\.build` setting/);
  const selector = read('sai/commands/explore/steps/route-selector.md');
  assert.match(selector, /expertReview\.explore/);
  assert.match(selector, /`auto` runs it and decides each finding without asking/);
  const pipeline = read('sai/commands/explore/steps/pipeline-plan-unattended.md');
  assert.match(pipeline, /pass `--expert-review auto` only when the value is `auto`/);
  assert.match(pipeline, /`ask`, `no`, or an absent key it passes `--expert-review no`/);

  const direct = read('sai/commands/explore/direct-build-coordinator.md');
  assert.match(direct, /2c\. \*\*Expert review\*\*/);
  assert.match(direct, /only when the resolved answer is `auto`/);
  assert.match(direct, /`expert_review_checkpoint`/);
  assert.match(direct, /verified after[\s\S]{0,260}Step 2c/);
  assert.match(direct, /`backfill` after Step 2c is handled/);

  const command = read('sai/commands/direct-build/coordinator.md');
  assert.match(command, /Cannot start \/sai-direct-build: --expert-review takes no, auto or ask\./);
  assert.match(command, /wins over the `expertReview\.build` setting/);
  assert.match(read('docs/project-settings.md'), /### Expert review/);
  assert.match(read('docs/project-settings.md'), /Expert review\*\*: opens a submenu with `Explore`, `Plan`, and `Build`/);
});
