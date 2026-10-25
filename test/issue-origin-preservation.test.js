'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');
const detector = require('../sai/tools/ready-to-propose');
const { readOpenspecYaml } = require('../sai/tools/openspec-yaml');
const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

function block(name) {
  return `## Ready to Propose

**Change name**: ${name}
**Depends on**: None
**What**: Preserve an origin.
**Why**: Keep the issue identity.
**Capabilities in scope**:
- origin: Preserve the issue.
**Research Leads**:
- None
**Decisions & Rationale**:
- None
**Alternatives Considered**:
- None
**Trade-offs Accepted**:
- None
**Model / Re-framings**:
- None
**Key constraints**:
- Keep scope small.
**Terms**:
- None
**Edge Cases**:
- E1: Retain the selected issue.
**Implementation Details**:
- I1: Preserve the origin.
**Out of scope Implementation Details**:
- None
**Overview language**: None

---`;
}

test('backfill and both Direct Build validators allow origin independently of intent', () => {
  const instruction = read('sai/commands/backfill/instructions.md');
  assert.match(instruction, /optional `backlog_origin` key/g);
  assert.match(instruction, /independent of usable intent/);
  for (const file of ['sai/commands/backfill/coordinator.md', 'sai/commands/explore/direct-build-coordinator.md']) {
    const content = read(file);
    assert.match(content, /optional validated `backlog_origin`/);
    assert.match(content, /issue-origin-preservation\.md/);
  }
});

test('known loss warns, no issue stays silent, and all handoff owners apply the policy', () => {
  const policy = read('sai/policies/issue-origin-preservation.md');
  assert.match(policy, /missing or\nunverifiable origin is non-blocking/);
  assert.match(policy, /no issue association was ever known, omit the key silently/);
  assert.match(policy, /Retain a valid existing origin/);
  assert.match(policy, /--ready-to-propose --amend <name>/);
  assert.match(policy, /Claude Code and opencode/);
  for (const file of [
    'sai/commands/explore/steps/issue-intake.md',
    'sai/commands/explore/steps/crystallization-protocol.md',
    'sai/commands/spec/worker.md',
    'sai/commands/backfill/instructions.md',
    'sai/commands/archive/instructions.md',
    'sai/commands/archive/worker.md',
    'sai/commands/archive/archive-commit-gate.instructions.md',
  ]) assert.match(read(file), /issue-origin-preservation\.md/, file);
});

for (const priorIntent of [false, true]) test(`sai-workflow ${priorIntent ? 'usable-intent' : 'no-intent'} child origins survive normal archive sync and closing-reference query`, t => {
  const available = spawnSync('openspec', ['--version'], { encoding: 'utf8' });
  if (available.error?.code === 'ENOENT') return t.skip('OpenSpec CLI is not installed');
  assert.equal(available.status, 0, available.stderr);
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'origin-archive-'));
  t.after(() => fs.rmSync(cwd, { recursive: true, force: true }));
  fs.mkdirSync(path.join(cwd, 'openspec', 'changes'), { recursive: true });
  fs.cpSync(path.join(root, 'openspec', 'schemas', 'sai-workflow'), path.join(cwd, 'openspec', 'schemas', 'sai-workflow'), { recursive: true });
  fs.writeFileSync(path.join(cwd, 'openspec', 'config.yaml'), 'schema: sai-workflow\n');
  const correspondence = { version: 1, platform: 'github', role: 'parent', parent: 'https://github.com/team/repo/issues/10', slices: [11, 12, 13].map(number => ({ change_name: `child-${number}`, issue: `https://github.com/team/repo/issues/${number}`, depends_on: [] })) };
  const attached = detector.attachBacklogOrigins(correspondence.slices.map(slice => block(slice.change_name)).join('\n\n'), correspondence);
  const closingLines = [];
  for (const updated of attached.blocks) {
    assert.notEqual(updated.hash, detector.hashBlock(block(updated.name)));
    assert.equal(updated.hash, detector.hashBlock(updated.text));
    const intake = detector.checkDispatchable(updated.text);
    assert.equal(intake.dispatchable, true);
    const origin = intake.blocks[0].backlog_origin;
    assert.equal(origin, correspondence.slices.find(slice => slice.change_name === updated.name).issue);
    assert.notEqual(origin, correspondence.parent);
    // The prompt-owned planning/backfill writer's canonical metadata, followed by
    // the real archive boundary, rather than an assumed rename implementation.
    const dir = path.join(cwd, 'openspec', 'changes', updated.name);
    fs.mkdirSync(dir);
    const metadata = `schema: sai-workflow\ncreated: 2026-10-17\nbackfilled: true\n${priorIntent ? 'prior_intent: true\n' : ''}backlog_origin: ${origin}\n`;
    assert.deepEqual(metadata.trim().split('\n').map(line => line.split(':')[0]), ['schema', 'created', 'backfilled', ...(priorIntent ? ['prior_intent'] : []), 'backlog_origin']);
    fs.writeFileSync(path.join(dir, '.openspec.yaml'), metadata);
    const capability = `origin-${updated.name}`;
    const postHoc = priorIntent
      ? '> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.'
      : '> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation. It describes a decision already made, not one being proposed.';
    fs.writeFileSync(path.join(dir, 'proposal.md'), `${postHoc}\n\n## Why\nPreserve issue identity through archival.\n\n## What Changes\n- Preserve the issue URL.\n\n## Capabilities\n### New Capabilities\n- ${capability}: Preserve the issue URL.\n\n### Modified Capabilities\n- None\n\n## Impact\nChange metadata and ${capability} specification.\nOut of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill\n`);
    const delta = `## Purpose\nPreserve each selected child's issue identity through the complete archival workflow.\n\n## ADDED Requirements\n\n### Requirement: Preserve selected issue origin\nThe system SHALL retain the selected issue URL for ${updated.name} through archival.\n\n#### Scenario: Archive the selected child\n- **WHEN** the completed change is archived\n- **THEN** its metadata retains ${origin}\n`;
    fs.mkdirSync(path.join(dir, 'specs', capability), { recursive: true });
    fs.writeFileSync(path.join(dir, 'specs', capability, 'spec.md'), delta);
    const result = spawnSync('openspec', ['archive', updated.name, '--yes', '--json'], { cwd, encoding: 'utf8', env: { ...process.env, OPENSPEC_TELEMETRY: '0' } });
    assert.equal(result.status, 0, result.stdout + result.stderr);
    const archive = path.join(cwd, 'openspec', 'changes', 'archive');
    const moved = fs.readdirSync(archive).find(name => name.endsWith(`-${updated.name}`));
    assert.ok(moved, result.stdout);
    const archived = path.join(archive, moved, '.openspec.yaml');
    assert.equal(fs.readFileSync(archived, 'utf8'), metadata);
    assert.equal(readOpenspecYaml(archived).backlog_origin, origin);
    assert.equal(fs.readFileSync(path.join(archive, moved, 'specs', capability, 'spec.md'), 'utf8'), delta);
    const synced = fs.readFileSync(path.join(cwd, 'openspec', 'specs', capability, 'spec.md'), 'utf8');
    assert.match(synced, /### Requirement: Preserve selected issue origin/);
    assert.ok(synced.includes(origin), 'normal archive synchronizes the child delta into its main spec');
    const selected = readOpenspecYaml(archived).backlog_origin;
    // Execute the archive commit-message conversion specified by Closing Lines.
    closingLines.push(`Closes ${new URL(selected).pathname.replace(/^\//, '').replace('/issues/', '#')}`);
    assert.equal(fs.existsSync(dir), false);
  }
  const pr = require('../sai/tools/to-pr');
  const target = { host: 'github.com', repository: 'team/repo' };
  assert.deepEqual(pr.closingReferences(closingLines.join('\n'), target).map(ref => ref.number), [11, 12, 13]);
  const io = { cwd, registry: require('../skills/universal/to-pr/providers/registry.json'), run(command, args, input) {
    if (command === 'git') {
      if (args[0] === 'symbolic-ref') return 'feat/10_origins';
      if (args[0] === 'rev-parse') return 'a'.repeat(40);
      if (args[0] === 'status') return '';
      if (args[0] === 'remote') return args.length === 1 ? 'origin' : 'https://github.com/team/repo.git';
      if (args[0] === 'log') return closingLines.join('\n');
    }
    if (command === 'gh') {
      if (args[1] === 'repos/team/repo') return JSON.stringify({ id: 9, html_url: 'https://github.com/team/repo', default_branch: 'main', private: false, archived: false });
      if (args[1].includes('/pulls?')) return '[]';
      if (args[1] === 'user') return JSON.stringify({ login: 'tester' });
      if (args[1].includes('/labels?')) return '[]';
      if (args[1] === 'graphql') {
        const { query, variables } = JSON.parse(input);
        if (query.includes('__type(')) return JSON.stringify({ data: { __type: { fields: [{ name: 'subIssues' }] } } });
        if (query.includes('subIssues(')) return JSON.stringify({ data: { repository: { issue: { subIssues: { nodes: correspondence.slices.map(slice => ({ url: slice.issue })), pageInfo: { hasNextPage: false } } } } } });
        return JSON.stringify({ data: { repository: { nameWithOwner: 'team/repo', isArchived: false, issueOrPullRequest: { __typename: 'Issue', number: variables.number, url: `https://github.com/team/repo/issues/${variables.number}`, title: 'Issue', body: '', state: 'OPEN' } } } });
      }
    }
    throw new Error(`Unexpected read: ${command} ${args.join(' ')}`);
  } };
  const request = { provider: 'github', repository: 'team/repo', remote: 'origin', base: 'main', title: 'fix: preserve origins', description: 'Summary' };
  const result = pr.query(request, io);
  assert.deepEqual(pr.closingReferences(result.proposal.description, target).map(ref => ref.number), [11, 12, 13, 10]);
  assert.equal(pr.query({ ...request, description: result.proposal.description }, io).proposal.description, result.proposal.description);
});
