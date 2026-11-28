'use strict';

// The inverse passthrough: an opencode worker whose agent file carries `harness: claude` runs through the Claude Code
// CLI (sai/policies/claude-dispatch.md and sai/tools/claude-dispatch.js), and the setup screen writes and removes the
// line (the claude-code-passthrough change).

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const dispatch = require('../sai/tools/claude-dispatch.js');
const { acquireTurnLock } = require('../sai/tools/dispatch-common.js');
const { isPassthroughEligible } = require('../bin/model-customization.js');

const {
  route,
  checkAgents,
  turn,
  guardedTurn,
  stopSession,
  terminateTree,
  readResult,
  runArguments,
  agentSettings,
  childEnvironment,
  harnessOf,
  FALLBACK_CAUSES,
  BUSY_EXIT,
} = dispatch;

const repoRoot = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(repoRoot, file), 'utf8');

function scratch(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `claude-dispatch-${prefix}-`));
}

function agentFile(directory, name, lines) {
  fs.mkdirSync(path.join(directory, 'agents'), { recursive: true });
  fs.writeFileSync(path.join(directory, 'agents', `${name}.md`), ['---', `name: ${name}`, ...lines, '---', '', 'body', ''].join('\n'));
}

const probeOf = (available, authenticated) => () => ({ available, authenticated });

test('E1 only the exact harness value claude routes, and the project agent file wins', () => {
  const project = scratch('route');
  const opencodeGlobal = scratch('route-opencode');
  const claudeGlobal = scratch('route-claude');
  try {
    agentFile(path.join(project, '.opencode'), 'routed', ['model: opencode-go/a', 'harness: claude']);
    agentFile(path.join(project, '.opencode'), 'plain', ['model: opencode-go/a']);
    agentFile(path.join(project, '.opencode'), 'odd', ['harness: somewhere']);
    agentFile(path.join(project, '.claude'), 'routed', ['model: opus', 'effort: high', 'tools: Read']);
    agentFile(opencodeGlobal, 'global-routed', ['harness: "claude"']);
    agentFile(claudeGlobal, 'global-routed', ['model: sonnet']);
    const options = { root: () => opencodeGlobal, harnessRoot: () => claudeGlobal, probe: probeOf(true, true) };
    assert.deepEqual(route({ agent: 'routed', cwd: project }, options), { route: 'claude', cause: 'harness-claude', agent: 'routed' });
    assert.deepEqual(route({ agent: 'plain', cwd: project }, options), { route: 'opencode', cause: 'no-harness-key', agent: 'plain' });
    assert.deepEqual(route({ agent: 'odd', cwd: project }, options), { route: 'opencode', cause: 'harness-not-claude', agent: 'odd' });
    assert.deepEqual(route({ agent: 'absent', cwd: project }, options), { route: 'opencode', cause: 'agent-file-missing', agent: 'absent' });
    assert.equal(route({ agent: 'global-routed', cwd: project }, options).route, 'claude', 'the user-global agent file counts and its quotes are stripped');
    agentFile(path.join(project, '.opencode'), 'global-routed', ['harness: claude']);
    agentFile(path.join(project, '.claude'), 'global-routed', ['model: haiku']);
    assert.equal(route({ agent: 'global-routed', cwd: project }, options).route, 'claude', 'the project agent files win');
  } finally {
    for (const dir of [project, opencodeGlobal, claudeGlobal]) fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('E3 a missing binary, signed-out session, or agent file falls back to opencode with a notice that names the agent and the cause', () => {
  const project = scratch('route-fallback');
  const claudeGlobal = scratch('route-fallback-claude');
  try {
    agentFile(path.join(project, '.opencode'), 'worker', ['harness: claude']);
    agentFile(path.join(project, '.opencode'), 'worker-without-claude-file', ['harness: claude']);
    agentFile(path.join(project, '.claude'), 'worker', ['model: opus']);
    const options = { root: () => project, harnessRoot: () => claudeGlobal };
    const cases = [
      [() => ({ available: false, authenticated: false, cause: 'claude-missing' }), 'claude-missing', /command is not available/],
      [probeOf(true, false), 'claude-auth-unavailable', /no signed-in session/],
      [probeOf(true, true), 'claude-agent-missing', /no agent file of that name/],
    ];
    for (const [probe, cause, text] of cases) {
      const agent = cause === 'claude-agent-missing' ? 'worker-without-claude-file' : 'worker';
      const answer = route({ agent, cwd: project }, { ...options, probe });
      assert.equal(answer.route, 'opencode');
      assert.equal(answer.cause, cause);
      assert.match(answer.notice, new RegExp(`Agent ${agent} `));
      assert.match(answer.notice, text);
      assert.match(answer.notice, /runs through opencode/);
      assert.match(answer.notice, new RegExp(FALLBACK_CAUSES[cause]));
    }
  } finally {
    fs.rmSync(project, { recursive: true, force: true });
    fs.rmSync(claudeGlobal, { recursive: true, force: true });
  }
});

test('I1 checkAgents probes once and reports one cause per agent', () => {
  const project = scratch('check');
  const claudeGlobal = scratch('check-claude');
  try {
    agentFile(path.join(project, '.claude'), 'ready', ['model: opus']);
    let probes = 0;
    const causes = checkAgents(['ready', 'missing'], { cwd: project, harnessRoot: () => claudeGlobal }, { probe: () => { probes += 1; return { available: true, authenticated: true }; } });
    assert.equal(probes, 1);
    assert.deepEqual(causes, { ready: null, missing: 'claude-agent-missing' });
  } finally {
    fs.rmSync(project, { recursive: true, force: true });
    fs.rmSync(claudeGlobal, { recursive: true, force: true });
  }
});

test('harnessOf reads only the frontmatter key', () => {
  assert.equal(harnessOf('---\nname: a\nharness: claude\n---\nharness: opencode\n'), 'claude');
  assert.equal(harnessOf('---\nname: a\n---\nharness: claude\n'), null);
  assert.equal(harnessOf("---\nharness: 'claude'\r\n---\n"), 'claude');
});

test('I4 I5 a turn runs claude -p with the message on stdin, the agent file tools, and no model or effort', () => {
  const settings = { allowedTools: 'Read, Bash', permissionMode: 'acceptEdits' };
  assert.deepEqual(runArguments({ agent: 'w', session: 'u-1', create: true }, settings),
    ['-p', '--agent', 'w', '--output-format', 'json', '--session-id', 'u-1', '--allowedTools', 'Read', 'Bash', '--permission-mode', 'acceptEdits']);
  assert.deepEqual(runArguments({ agent: 'w', session: 'u-1', create: false }, settings),
    ['-p', '--resume', 'u-1', '--output-format', 'json', '--allowedTools', 'Read', 'Bash', '--permission-mode', 'acceptEdits']);
  for (const args of [runArguments({ agent: 'w', session: 'u', create: true }), runArguments({ agent: 'w', session: 'u', create: false })]) {
    assert.ok(!args.includes('--model') && !args.includes('--effort'), 'the Claude Code agent file carries model and effort');
  }
  assert.deepEqual(agentSettings('---\nname: w\nmodel: opus\npermissionMode: plan\ntools: Read, Edit\n---\n'), { allowedTools: 'Read, Edit', permissionMode: 'plan' });
  assert.deepEqual(agentSettings('---\nname: w\n---\n'), { allowedTools: null, permissionMode: null });
});

test('I4 the child environment drops the opencode session variable', () => {
  const env = childEnvironment({ OPENCODE_SESSION_ID: 'ses_1', PATH: '/bin', CLAUDE_CODE_AGENT_ID: 'agent-1' });
  assert.equal(env.OPENCODE_SESSION_ID, undefined);
  assert.equal(env.PATH, '/bin');
  assert.equal(env.CLAUDE_CODE_AGENT_ID, 'agent-1');
});

test('I2 a turn maps the JSON result, its usage, and its cost; an error result is failed', async () => {
  const project = scratch('turn');
  try {
    agentFile(path.join(project, '.claude'), 'worker', ['model: opus', 'tools: Read']);
    const ok = await turn({ agent: 'worker', session: 'u-1', message: 'hello', cwd: project, create: true }, async (args, cwd, message) => {
      assert.deepEqual(args.slice(0, 5), ['-p', '--agent', 'worker', '--output-format', 'json']);
      assert.equal(message, 'hello');
      return {
        status: 0, error: null,
        stdout: JSON.stringify({
          type: 'result', subtype: 'success', is_error: false, result: 'ready', session_id: 'u-1',
          usage: { input_tokens: 9, output_tokens: 4, cache_read_input_tokens: 2, cache_creation_input_tokens: 1 }, total_cost_usd: 0.03,
        }),
      };
    });
    assert.deepEqual(ok, {
      status: 'ok', sessionID: 'u-1', text: 'ready',
      tokens: { input: 9, output: 4, reasoning: 0, cache_read: 2, cache_write: 1 }, cost: 0.03, exit_code: 0, error: null,
    });
    const errors = [
      [async () => ({ status: 0, error: null, stdout: JSON.stringify({ is_error: true, result: 'boom', session_id: 'u-1' }) }), /boom/],
      [async () => ({ status: 1, error: null, stdout: '' }), /exited with status 1/],
      [async () => ({ status: 0, error: null, stdout: JSON.stringify({ subtype: 'error_during_execution', result: 'x', session_id: 'u-1' }) }), /claude reported error_during_execution/],
      [async () => ({ status: null, error: 'spawn claude ENOENT', stdout: '' }), /ENOENT/],
    ];
    for (const [run, expected] of errors) {
      const result = await turn({ agent: 'worker', session: 'u-1', message: 'x', cwd: project }, run);
      assert.equal(result.status, 'failed');
      assert.match(result.error, expected);
    }
    const noSession = await turn({ agent: 'worker', session: 'u-1', message: 'x', cwd: project, create: true }, async () => ({
      status: 0, error: null, stdout: JSON.stringify({ subtype: 'success', result: 'ready' }),
    }));
    assert.equal(noSession.status, 'failed');
    assert.match(noSession.error, /no session_id/);
    const missing = await turn({ agent: 'ghost', session: 'u-1', message: 'x', cwd: project }, async () => assert.fail('no turn runs without an agent file'));
    assert.equal(missing.status, 'failed');
  } finally {
    fs.rmSync(project, { recursive: true, force: true });
  }
});

test('readResult takes the whole output or its last JSON line', () => {
  assert.deepEqual(readResult('{"session_id":"u-1"}'), { session_id: 'u-1' });
  assert.deepEqual(readResult('noise\n{"session_id":"u-2"}\n'), { session_id: 'u-2' });
  assert.equal(readResult('noise'), null);
  assert.equal(readResult(''), null);
});

const okRun = async () => ({ status: 0, error: null, stdout: JSON.stringify({ subtype: 'success', result: 'done', session_id: 'u-1' }) });

test('E10 a second turn of the same session answers busy, sends nothing, and exits 3', async () => {
  const dir = scratch('lock-busy');
  try {
    assert.equal(acquireTurnLock(dir, 'u-1', { pid: 4242 }).acquired, true);
    let sent = 0;
    const result = await guardedTurn({ agent: 'w', session: 'u-1', message: 'again', cwd: '.' }, { lockDirectory: () => dir, alive: pid => pid === 4242, run: async () => { sent += 1; return okRun(); } });
    assert.equal(sent, 0, 'nothing reaches claude');
    assert.deepEqual([result.status, result.sessionID, result.busy_pid], ['busy', 'u-1', 4242]);
    assert.match(result.error, /still running \(process 4242\); nothing was sent/);
    assert.equal(BUSY_EXIT, 3);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('E10 a lock whose process no longer exists is replaced, and the turn releases its own lock', async () => {
  const dir = scratch('lock-stale');
  const project = scratch('lock-stale-project');
  try {
    agentFile(path.join(project, '.claude'), 'w', ['model: opus']);
    fs.writeFileSync(path.join(dir, 'u-1.lock'), '999999');
    let sent = 0;
    const result = await guardedTurn({ agent: 'w', session: 'u-1', message: 'again', cwd: project }, {
      lockDirectory: () => dir, alive: () => false,
      run: async () => { sent += 1; assert.equal(fs.readFileSync(path.join(dir, 'u-1.lock'), 'utf8'), String(process.pid)); return okRun(); },
    });
    assert.equal(sent, 1);
    assert.equal(result.status, 'ok');
    assert.deepEqual(fs.readdirSync(dir), [], 'the lock and its draft are gone when the turn ends');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
    fs.rmSync(project, { recursive: true, force: true });
  }
});

test('I12 stop kills the process tree of the lock, releases it, and answers none without a live turn', () => {
  const dir = scratch('stop');
  try {
    const base = { sessionID: 'u-1', text: '', tokens: { input: 0, output: 0, reasoning: 0, cache_read: 0, cache_write: 0 }, cost: 0, exit_code: null, error: null };
    assert.deepEqual(stopSession('u-1', { lockDirectory: () => dir }), { status: 'none', ...base });
    fs.writeFileSync(path.join(dir, 'u-1.lock'), '4242');
    const killed = [];
    const result = stopSession('u-1', { lockDirectory: () => dir, alive: pid => pid === 4242, terminate: pid => killed.push(pid) });
    assert.deepEqual(result, { status: 'stopped', ...base });
    assert.deepEqual(killed, [4242]);
    assert.equal(fs.existsSync(path.join(dir, 'u-1.lock')), false, 'stop releases the lock');
    fs.writeFileSync(path.join(dir, 'u-1.lock'), '4242');
    assert.equal(stopSession('u-1', { lockDirectory: () => dir, alive: () => false }).status, 'none', 'a dead holder is no live turn');
    assert.equal(fs.existsSync(path.join(dir, 'u-1.lock')), false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('M2 stop ends the child process group on POSIX and waits for the tree', () => {
  const calls = [];
  let childUp = true;
  let toolUp = true;
  let clock = 0;
  const kill = (target, signal) => {
    calls.push([target, signal]);
    if (signal !== 0) return true;
    const up = target === 4242 ? toolUp : target === -5150 ? childUp : false;
    if (!up) { const error = new Error('gone'); error.code = 'ESRCH'; throw error; }
    return true;
  };
  terminateTree(4242, {
    childPid: 5150,
    platform: 'linux',
    alive: pid => pid === 4242 && toolUp,
    kill,
    sleep: () => { clock += 50; if (clock >= 100) { childUp = false; toolUp = false; } },
    now: () => clock,
  });
  assert.deepEqual(calls.slice(0, 2), [[-5150, 'SIGTERM'], [4242, 'SIGTERM']], 'the child group is signalled with the tool');
  assert.ok(clock >= 100, 'the stop waited for the tree to end');
  assert.ok(!calls.some(([target, signal]) => target === -5150 && signal === 'SIGKILL'), 'no force kill is needed once the group ends');

  const forced = [];
  let groupUp = true;
  let forcedClock = 0;
  terminateTree(4242, {
    childPid: 5150,
    platform: 'linux',
    alive: () => true,
    now: () => forcedClock,
    kill: (target, signal) => {
      forced.push([target, signal]);
      if (signal !== 0) return true;
      if (target === -5150 && groupUp) return true;
      const error = new Error('gone');
      error.code = 'ESRCH';
      throw error;
    },
    sleep: () => { forcedClock += 1000; },
    graceMs: 1000,
  });
  assert.ok(forced.some(([target, signal]) => target === -5150 && signal === 'SIGKILL'), 'a group that ignores SIGTERM is force-killed');
});

test('M2 stop passes the turn child PID from its marker file and removes both markers', () => {
  const dir = scratch('stop-tree');
  try {
    fs.writeFileSync(path.join(dir, 'u-1.lock'), '4242');
    fs.writeFileSync(path.join(dir, 'u-1.child'), '5150');
    const seen = [];
    const result = stopSession('u-1', { lockDirectory: () => dir, alive: pid => pid === 4242, terminate: (pid, options) => seen.push([pid, options.childPid]) });
    assert.equal(result.status, 'stopped');
    assert.deepEqual(seen, [[4242, 5150]]);
    assert.deepEqual(fs.readdirSync(dir), [], 'the lock and the child marker are gone');
    fs.writeFileSync(path.join(dir, 'u-1.child'), '5150');
    assert.equal(stopSession('u-1', { lockDirectory: () => dir }).status, 'none');
    assert.deepEqual(fs.readdirSync(dir), [], 'a stale child marker is removed with no live turn');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('M2 a turn detaches its child, writes the child marker, and removes it when the turn ends', { skip: process.platform === 'win32' }, async () => {
  const dir = scratch('child-marker');
  const project = scratch('child-marker-project');
  const bin = scratch('child-marker-bin');
  const originalPath = process.env.PATH;
  try {
    agentFile(path.join(project, '.claude'), 'w', ['model: opus']);
    fs.writeFileSync(path.join(bin, 'claude'), '#!/bin/sh\ncat >/dev/null\necho \'{"type":"result","subtype":"success","is_error":false,"result":"ready","session_id":"u-1"}\'\n', { mode: 0o755 });
    process.env.PATH = `${bin}${path.delimiter}${originalPath ?? ''}`;
    const result = await guardedTurn({ agent: 'w', session: 'u-1', message: 'hello', cwd: project }, { lockDirectory: () => dir, alive: () => true });
    assert.equal(result.status, 'ok');
    assert.equal(result.text, 'ready');
    assert.deepEqual(fs.readdirSync(dir), [], 'the lock and the child marker are removed when the turn ends');
  } finally {
    process.env.PATH = originalPath;
    for (const directory of [dir, project, bin]) fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('I11 the policy is the single source and the four dispatch sites point to it', () => {
  const policy = read('sai/policies/claude-dispatch.md');
  assert.match(policy, /claude-dispatch\.js/);
  assert.match(policy, /`harness: claude`/);
  assert.match(policy, /route --agent/);
  assert.match(policy, /background: true/);
  assert.match(policy, /subagent` call/);
  assert.match(policy, /needs_input/);
  assert.match(policy, /`warming: false`/);
  assert.match(policy, /stop --session/);
  assert.match(policy, /`--harness opencode` as its second line/);
  assert.match(policy, /the tool adds nothing to any message/);
  // The notice belongs to the opencode fallback; the claude branch never carries one.
  const route = policy.slice(policy.indexOf('## Route'), policy.indexOf('## Create'));
  assert.match(route, /- `opencode`:[^\n]*notice[^\n]*print it once/);
  assert.match(route, /- `claude`: dispatch as below\. This branch carries no `notice`\./);
  assert.match(read('sai/policies/worker-lifecycle.md'), /Claude-routed worker[\s\S]*claude-dispatch\.js stop/);
  assert.match(read('sai/policies/cache-warming.md'), /Claude-routed worker \(`@sai\/policies\/claude-dispatch\.md`\) receives no switch/);
  assert.match(read('sai/policies/worker-report-transport.md'), /A Claude-routed worker[\s\S]*`--harness opencode` this way/);
  assert.doesNotMatch(read('sai/policies/opencode-dispatch.md'), /the `harness:` key exists only in Claude Code agent files/);
  assert.match(read('sai/orchestration/workers/bindings/opencode/standalone-worker-template.md'), /route\s+query of `@sai\/policies\/claude-dispatch\.md`/);
});

test('I9 the setup documents the route and its inert model', () => {
  const models = read('docs/models.md');
  assert.match(models, /Run an opencode agent on a Claude Code model/);
  assert.match(models, /harness: claude/);
  assert.match(models, /inert/);
  assert.match(models, /Model and effort are never passed as flags/);
  assert.match(models, /tools and the permission mode are, as `--allowedTools` and\s+`--permission-mode`/);
  assert.doesNotMatch(models, /passes none of them as flags/);
});

test('E12 only opencode worker rows are eligible for the Claude Code route', () => {
  assert.equal(isPassthroughEligible({ family: 'worker', name: 'w' }, 'opencode'), true);
  assert.equal(isPassthroughEligible({ family: 'agent', name: 'budget-explorer' }, 'opencode'), false);
  assert.equal(isPassthroughEligible({ family: 'command', name: 'sai-1-spec' }, 'opencode'), false);
  assert.equal(isPassthroughEligible({ family: 'agent', name: 'budget-explorer' }, 'claude'), true);
});
