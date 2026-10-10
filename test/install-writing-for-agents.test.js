'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const os = require('os');
const fs = require('fs');

const {
  WRITING_FOR_AGENTS_SKILLS_ARGS,
  invokingSkillsRunner,
  selectSkillsRunner,
  writingForAgentsCommandFor,
  probeWritingForAgents,
  offerWritingForAgentsInstall,
} = require('../bin/install-flow.js');

const REPO = path.resolve(__dirname, '..');
const CLAUDE = 'Claude Code';
const OPENCODE = 'Opencode';

function makeRoots() {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'wfa-'));
  return {
    home,
    claudeBase: path.join(home, '.claude'),
    opencodeBase: path.join(home, '.config', 'opencode'),
    agentsSkills: path.join(home, '.agents', 'skills'),
    cleanup: () => fs.rmSync(home, { recursive: true, force: true }),
  };
}

function writeSkill(skillsDir) {
  const dir = path.join(skillsDir, 'writing-for-agents');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'SKILL.md'), '# skill\n');
}

function probeOptions(roots) {
  return { claudeBase: roots.claudeBase, opencodeBase: roots.opencodeBase, homeDir: roots.home };
}

test('E1: Claude Code reads only ~/.claude/skills', () => {
  const roots = makeRoots();
  try {
    writeSkill(path.join(roots.opencodeBase, 'skills'));
    assert.deepEqual(probeWritingForAgents([CLAUDE], probeOptions(roots)), [CLAUDE]);
    writeSkill(path.join(roots.claudeBase, 'skills'));
    assert.deepEqual(probeWritingForAgents([CLAUDE], probeOptions(roots)), []);
  } finally {
    roots.cleanup();
  }
});

test('E1: opencode reads its own, ~/.claude, and ~/.agents skills roots', () => {
  for (const pick of [
    r => path.join(r.opencodeBase, 'skills'),
    r => path.join(r.claudeBase, 'skills'),
    r => r.agentsSkills,
  ]) {
    const roots = makeRoots();
    try {
      assert.deepEqual(probeWritingForAgents([OPENCODE], probeOptions(roots)), [OPENCODE]);
      writeSkill(pick(roots));
      assert.deepEqual(probeWritingForAgents([OPENCODE], probeOptions(roots)), []);
    } finally {
      roots.cleanup();
    }
  }
});

test('E1: the probe reports only the assistants that lack the skill', () => {
  const roots = makeRoots();
  try {
    writeSkill(path.join(roots.opencodeBase, 'skills'));
    assert.deepEqual(probeWritingForAgents([CLAUDE, OPENCODE], probeOptions(roots)), [CLAUDE]);
  } finally {
    roots.cleanup();
  }
});

test('E1: a symlinked skill directory counts as present, a dangling link as absent', () => {
  const roots = makeRoots();
  try {
    const target = path.join(roots.home, 'store', 'writing-for-agents');
    fs.mkdirSync(target, { recursive: true });
    fs.writeFileSync(path.join(target, 'SKILL.md'), '# skill\n');
    const skills = path.join(roots.claudeBase, 'skills');
    fs.mkdirSync(skills, { recursive: true });
    const link = path.join(skills, 'writing-for-agents');
    fs.symlinkSync(target, link, 'dir');
    assert.deepEqual(probeWritingForAgents([CLAUDE], probeOptions(roots)), []);

    fs.rmSync(target, { recursive: true, force: true });
    assert.deepEqual(probeWritingForAgents([CLAUDE], probeOptions(roots)), [CLAUDE]);
  } finally {
    roots.cleanup();
  }
});

test('I3: the command is fixed and preselects no assistant, scope, or answer', () => {
  assert.deepEqual(WRITING_FOR_AGENTS_SKILLS_ARGS, [
    'skills@latest',
    'add',
    'mattpocock/skills',
    '--skill=writing-for-agents',
  ]);
  for (const flag of ['-a', '-g', '-y', '--agent', '--global', '--yes']) {
    assert.ok(!WRITING_FOR_AGENTS_SKILLS_ARGS.includes(flag));
  }
});

test('I4: the invoking runner is mapped from npm_config_user_agent', () => {
  const all = () => true;
  const pick = ua => selectSkillsRunner({ env: { npm_config_user_agent: ua }, available: all });
  assert.equal(writingForAgentsCommandFor(pick('npm/10.0.0 node/v22')), 'npx skills@latest add mattpocock/skills --skill=writing-for-agents');
  assert.equal(writingForAgentsCommandFor(pick('pnpm/9.0.0 npm/? node/v22')), 'pnpm dlx skills@latest add mattpocock/skills --skill=writing-for-agents');
  assert.equal(writingForAgentsCommandFor(pick('bun/1.1.0 npm/? node/v22')), 'bunx skills@latest add mattpocock/skills --skill=writing-for-agents');
});

test('I4: an unavailable invoking runner falls back to the first available of npx, pnpm dlx, bunx', () => {
  const only = commands => runner => commands.includes(runner.command);
  const env = { npm_config_user_agent: 'pnpm/9.0.0' };
  assert.equal(selectSkillsRunner({ env, available: only(['npx', 'bunx']) }).command, 'npx');
  assert.equal(selectSkillsRunner({ env, available: only(['bunx']) }).command, 'bunx');
  assert.equal(selectSkillsRunner({ env: {}, available: only(['pnpm', 'bunx']) }).command, 'pnpm');
  assert.equal(selectSkillsRunner({ env: {}, available: () => false }), null);
});

function offerHarness(overrides = {}) {
  const calls = { prompts: [], installs: [] };
  const notices = [];
  const runner = { command: 'npx', prefixArgs: [] };
  const options = {
    assistants: [CLAUDE, OPENCODE],
    probe: () => [CLAUDE],
    selectRunner: () => runner,
    runInstall: r => { calls.installs.push(r); return true; },
    promptYesNo: async q => { calls.prompts.push(q); return true; },
    isTTY: true,
    notices,
    ...overrides,
  };
  return { options, calls, notices, runner };
}

test('E1: present for every selected assistant means no offer and no output', async () => {
  const { options, calls, notices } = offerHarness({ probe: () => [] });
  await offerWritingForAgentsInstall(options);
  assert.equal(calls.prompts.length, 0);
  assert.equal(calls.installs.length, 0);
  assert.deepEqual(notices, []);
});

test('E2: one offer names every assistant that lacks the skill', async () => {
  const { options, calls } = offerHarness({ probe: () => [CLAUDE, OPENCODE] });
  await offerWritingForAgentsInstall(options);
  assert.equal(calls.prompts.length, 1);
  assert.match(calls.prompts[0], /Claude Code and Opencode/);
  assert.equal(calls.installs.length, 1);
});

test('E3: no usable runner prints the manual command and starts nothing', async () => {
  const { options, calls, notices } = offerHarness({ selectRunner: () => null });
  await offerWritingForAgentsInstall(options);
  assert.equal(calls.prompts.length, 0);
  assert.equal(calls.installs.length, 0);
  assert.equal(notices.length, 1);
  assert.match(notices[0], /npx skills@latest add mattpocock\/skills --skill=writing-for-agents/);
});

test('E4: without a TTY the command is printed, no process starts, and no runner is probed', async () => {
  let selectCalls = 0;
  const { options, calls, notices } = offerHarness({
    isTTY: false,
    selectRunner: () => { selectCalls += 1; return null; },
    env: { npm_config_user_agent: 'pnpm/9.0.0 node/v22' },
  });
  const childProcess = require('child_process');
  const origSpawnSync = childProcess.spawnSync;
  let spawns = 0;
  childProcess.spawnSync = (...args) => { spawns += 1; return origSpawnSync(...args); };
  try {
    await offerWritingForAgentsInstall(options);
  } finally {
    childProcess.spawnSync = origSpawnSync;
  }
  assert.equal(spawns, 0, 'no spawn in the non-TTY path');
  assert.equal(selectCalls, 0, 'no runner availability probe in the non-TTY path');
  assert.equal(calls.prompts.length, 0);
  assert.equal(calls.installs.length, 0);
  assert.equal(notices.length, 1);
  assert.match(notices[0], /pnpm dlx skills@latest add mattpocock\/skills --skill=writing-for-agents/);
});

test('E4: without a TTY and without a recognised user agent the manual command uses npx', async () => {
  const { options, notices } = offerHarness({ isTTY: false, env: {} });
  await offerWritingForAgentsInstall(options);
  assert.match(notices[0], /npx skills@latest add/);
  assert.equal(invokingSkillsRunner({}), null);
});

test('I2: the resolved opencode base is forwarded to every probe call', async () => {
  const seen = [];
  let n = 0;
  const { options } = offerHarness({
    opencodeBase: '/resolved/opencode',
    probe: (assistants, probeOptions) => {
      seen.push(probeOptions);
      return ++n === 1 ? [OPENCODE] : [];
    },
  });
  await offerWritingForAgentsInstall(options);
  assert.equal(seen.length, 2, 'initial probe plus the re-check');
  for (const probeOptions of seen) assert.equal(probeOptions.opencodeBase, '/resolved/opencode');
});

test('E5: a declined offer starts nothing and leaves the manual command', async () => {
  const { options, calls, notices } = offerHarness({ promptYesNo: async () => false });
  await offerWritingForAgentsInstall(options);
  assert.equal(calls.installs.length, 0);
  assert.equal(notices.length, 1);
});

test('E5: a failed install leaves the manual command and does not throw', async () => {
  const { options, notices } = offerHarness({ runInstall: () => false });
  await offerWritingForAgentsInstall(options);
  assert.equal(notices.length, 1);
  assert.match(notices[0], /--skill=writing-for-agents/);
});

test('E5: the offer uses the selected runner, pnpm dlx included', async () => {
  const pnpm = { command: 'pnpm', prefixArgs: ['dlx'] };
  const { options, calls, notices } = offerHarness({ selectRunner: () => pnpm, promptYesNo: async () => false });
  await offerWritingForAgentsInstall(options);
  assert.match(notices[0], /pnpm dlx skills@latest add/);
  assert.equal(calls.installs.length, 0);
});

test('E6: after a successful install the probe runs again and reports assistants still lacking the skill', async () => {
  let probeCalls = 0;
  const { options, calls, notices } = offerHarness({
    probe: () => {
      probeCalls += 1;
      return probeCalls === 1 ? [CLAUDE, OPENCODE] : [OPENCODE];
    },
  });
  await offerWritingForAgentsInstall(options);
  assert.equal(probeCalls, 2);
  assert.equal(calls.installs.length, 1, 'the offer runs once per install');
  assert.equal(notices.length, 1);
  assert.match(notices[0], /Opencode/);
  assert.doesNotMatch(notices[0], /Claude Code/);
});

test('E6: a successful install that satisfies every assistant prints nothing', async () => {
  let probeCalls = 0;
  const { options, notices } = offerHarness({
    probe: () => (++probeCalls === 1 ? [CLAUDE] : []),
  });
  await offerWritingForAgentsInstall(options);
  assert.deepEqual(notices, []);
});

test('E7: no manifest projection targets writing-for-agents', () => {
  const manifest = fs.readFileSync(path.join(REPO, 'sai', 'install-manifest.json'), 'utf8');
  assert.ok(!manifest.includes('writing-for-agents'));
  assert.ok(!fs.existsSync(path.join(REPO, 'skills', 'universal', 'writing-for-agents')));
  assert.ok(!fs.existsSync(path.join(REPO, 'skills', 'writing-for-agents')));
});

test('I6: both Explore list stages reach list-writing.md and keep their list contracts', () => {
  const listWriting = fs.readFileSync(path.join(REPO, 'sai', 'commands', 'explore', 'list-writing.md'), 'utf8');
  assert.match(listWriting, /writing-for-agents/);
  assert.match(listWriting, /`Skill` tool/);
  assert.match(listWriting, /`skill` tool/);
  assert.match(listWriting, /once per `\/sai-explore` invocation/);
  assert.match(listWriting, /`- None`/);

  const edge = fs.readFileSync(path.join(REPO, 'sai', 'commands', 'explore', 'steps', 'review-edge-cases.md'), 'utf8');
  assert.match(edge, /Use the writing-for-agents skill to create the list\./);
  assert.match(edge, /Fetch @sai\/commands\/explore\/list-writing\.md/);
  assert.match(edge, /@sai\/commands\/explore\/list-writing\.md/);
  assert.match(edge, /`E1` through `En`/);
  assert.match(edge, /An empty list \(`- None`\) runs no probes\./);

  const impl = fs.readFileSync(path.join(REPO, 'sai', 'commands', 'explore', 'steps', 'implementation-details.md'), 'utf8');
  assert.match(impl, /Use the writing-for-agents skill to create the list\./);
  assert.match(impl, /Fetch @sai\/commands\/explore\/list-writing\.md/);
  assert.match(impl, /@sai\/commands\/explore\/list-writing\.md/);
  assert.match(impl, /`I1` through `In`/);
});
