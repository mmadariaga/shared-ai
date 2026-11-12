'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const manifest = require('../sai/install-manifest.json');
const { resolveProfile, translate } = require('../bin/capabilities');
const { ROUTES } = require('../benchmark/corpus');
const { hashBlock } = require('../sai/tools/ready-to-propose.js');

const repoRoot = path.join(__dirname, '..');
const read = relative => fs.readFileSync(path.join(repoRoot, relative), 'utf8');
const CARD = 'sai/commands/direct-build/coordinator.md';
const CLOSING = 'Direct build done.';

test('the wrappers fetch the harness skill and the direct-build coordinator, mirrored on both harnesses', () => {
  const skill = { claude: 'Fetch `@skills/fetch/SKILL.md`', opencode: 'Fetch @~/.config/opencode/skills/fetch/SKILL.md before you continue.' };
  for (const harness of ['claude', 'opencode']) {
    const source = read(`commands/${harness}/sai-direct-build.md`);
    const fetches = source.split(/\r?\n/).filter(line => /^Fetch `?@/.test(line.trim())).map(line => line.trim());
    assert.deepEqual(fetches, [
      skill[harness],
      'Fetch `@sai/commands/direct-build/coordinator.md` and follow it exactly, forwarding the InvocationEnvelope block below.',
    ], harness);
    assert.match(source, /command_name: direct-build\n {2}arguments_value: \$ARGUMENTS/);
  }
  assert.match(read('commands/claude/sai-direct-build.md'), /^argument-hint: "--block-file <path> --block-hash <sha256>"$/m);
  assert.doesNotMatch(read('commands/opencode/sai-direct-build.md'), /^argument-hint:/m);
});

test('the card verifies the stored block with verify-file and ends before any write when it does not verify', () => {
  const card = read(CARD);
  assert.match(card, /ready-to-propose\.js/);
  assert.match(card, /`verify-file --block-file <path> --block-hash <hash>`/);
  assert.match(card, /Cannot start \/sai-direct-build: pass --block-file <path> and --block-hash <sha256>/);
  assert.match(card, /Cannot start \/sai-direct-build: the block file does not verify against --block-hash \(\{problem\}\)\./);
  assert.match(card, /write nothing, and dispatch nothing/);
});

test('the card follows the explore Direct Build card as its run and keeps its single commit and its closing literal', () => {
  const card = read(CARD);
  assert.match(card, /Fetch `@sai\/commands\/explore\/direct-build-coordinator\.md` and follow it exactly/);
  assert.match(card, /pre-authorizes exactly one local commit: the archived change/);
  assert.match(card, /Record no change telemetry and make no second commit/);
  assert.match(card, /Skip `backlog-implementation-start\.md`/);
  assert.match(card, /not `\/sai-build`/);
  assert.equal(card.split(CLOSING).length - 1, 2, 'the literal is named in the goal and in the close');
  assert.match(card, /as the last line of the output, alone on its line and with nothing after it: `Direct build done\.`/);
  assert.match(card, /Print no closing line after a stop, a cancellation, or an escalation\./);
  assert.doesNotMatch(card, /command-bootstrap|boot adapter/);
});

test('the explore card keeps exporting the block from the store and its two-commit grant', () => {
  const explore = read('sai/commands/explore/direct-build-coordinator.md');
  assert.match(explore, /sai-state block <id> <change-name> --export --harness <claude\|opencode>/);
  assert.match(explore, /pre-authorized exactly two local commits for this slice: the archived change and its change telemetry/);
});

test('the benchmark classifies the route by the same closing literal the card prints', () => {
  assert.equal(ROUTES['direct-build'].command, '/sai-direct-build');
  assert.equal(ROUTES['direct-build'].closingLiteral, CLOSING);
  assert.ok(read(CARD).includes(`\`${ROUTES['direct-build'].closingLiteral}\``));
});

test('the command holds a coordinator profile that delegates to the Direct Build workers only', () => {
  assert.equal(manifest.capabilities.assignments.commands['sai-direct-build'], 'direct-build-command');
  const resolved = resolveProfile(manifest.capabilities, 'direct-build-command');
  assert.deepEqual(resolved.delegate, ['executor', 'explorer', 'sai-direct-build-worker', 'sai-backfill-worker', 'sai-archive-worker']);
  assert.equal(resolved.stopTask, true);
  assert.equal(resolved.write, 'temp');
  for (const harness of ['claude', 'opencode']) {
    const translated = translate(manifest.capabilities, 'direct-build-command', harness);
    assert.ok(translated.toolRequirements.some(item => item.capability === 'shell'), harness);
  }
});

test('verify-file accepts a stored block with its hash and rejects a mismatched hash', () => {
  const tool = name => path.join(repoRoot, 'sai', 'tools', name);
  const run = (name, args) => spawnSync(process.execPath, [tool(name), ...args], { encoding: 'utf8' });
  const opened = JSON.parse(run('transfer.js', ['open', '--harness', 'claude']).stdout);
  try {
    const file = path.join(opened.dir, 'block.md');
    const block = read('test/fixtures/benchmark-corpus/briefs/greeting/block.md').trimEnd();
    fs.writeFileSync(file, block);
    const matching = run('ready-to-propose.js', ['verify-file', '--block-file', file, '--block-hash', hashBlock(block)]);
    assert.equal(matching.status, 0, matching.stderr);
    assert.equal(JSON.parse(matching.stdout).ok, true);
    const mismatch = run('ready-to-propose.js', ['verify-file', '--block-file', file, '--block-hash', '0'.repeat(64)]);
    assert.notEqual(mismatch.status, 0);
  } finally {
    run('transfer.js', ['close', '--dir', opened.dir]);
  }
});

test('the command page, the README, and the on-demand index document the command', () => {
  const page = read('docs/commands/sai-direct-build.md');
  assert.match(page, /\/sai-direct-build --block-file|`--block-file <path> --block-hash <sha256>`/);
  assert.ok(page.includes(CLOSING));
  assert.match(read('README.md'), /docs\/commands\/sai-direct-build\.md/);
  assert.match(read('docs/on-demand-commands.md'), /commands\/sai-direct-build\.md/);
  assert.match(read('docs/benchmark.md'), /\/sai-direct-build/);
});
