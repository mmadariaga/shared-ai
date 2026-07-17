'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { PassThrough } = require('stream');

const { main } = require('../bin/doctor.js');
const { installClaude } = require('../bin/install-flow.js');

function execOk() {
  return { status: 0, stdout: '1.4.1\n', stderr: '', error: null };
}

function collectOut() {
  const ps = new PassThrough();
  const chunks = [];
  ps.on('data', (c) => chunks.push(c));
  const end = () => Buffer.concat(chunks).toString();
  return { stream: ps, end };
}

function makeGoodFixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-doctor-vs-'));
  fs.mkdirSync(path.join(dir, 'openspec'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'openspec', 'config.yaml'), 'schema: sai-workflow\n');
  return dir;
}

function makeTempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function nonexistentPath(prefix) {
  const ts = Date.now().toString(36);
  const rnd = Math.random().toString(36).slice(2, 8);
  return path.join(os.tmpdir(), prefix + '-' + ts + '-' + rnd);
}

function stubLatest(version) {
  return async () => version;
}

async function runDoctor({ projectRoot, claudeBase, opencodeBase, copilot, fetchLatestVersion }) {
  const { stream: out, end } = collectOut();
  const opts = {
    argv: ['--json'],
    projectRoot,
    claudeBase,
    opencodeBase,
    copilot,
    execOpenspec: execOk,
    out,
  };
  if (fetchLatestVersion !== undefined) opts.fetchLatestVersion = fetchLatestVersion;
  const code = await main(opts);
  const raw = end();
  const parsed = JSON.parse(raw);
  return { code, parsed };
}

describe('doctor version skew', () => {

  test('1: marker matches stubbed latest — ok severity, up to date', async () => {
    const projectRoot = makeGoodFixture();
    const claudeBase = makeTempDir('sai-vs-claude-');
    try {
      installClaude(claudeBase);
      fs.writeFileSync(path.join(claudeBase, '.version'), '1.0.0');

      const opencodeBase = nonexistentPath('sai-vs-oc-');
      const copilot = {
        promptsBase: nonexistentPath('sai-vs-cp-prompts-'),
        skillsBase: nonexistentPath('sai-vs-cp-skills-'),
        agentsBase: nonexistentPath('sai-vs-cp-agents-'),
        saiBase: nonexistentPath('sai-vs-cp-sai-'),
      };

      const { code, parsed } = await runDoctor({
        projectRoot, claudeBase, opencodeBase, copilot,
        fetchLatestVersion: stubLatest('1.0.0'),
      });

      assert.equal(code, 0);

      const claude = parsed['[Claude Code]'];
      assert.ok(claude, '[Claude Code] section should exist');
      assert.ok(Array.isArray(claude.version), 'version should be an array');
      assert.equal(claude.version[0].severity, 'ok');
      assert.ok(claude.version[0].message.includes('up to date'));
    } finally {
      fs.rmSync(projectRoot, { recursive: true, force: true });
      fs.rmSync(claudeBase, { recursive: true, force: true });
    }
  });

  test('2: marker behind stubbed latest — warn severity, names both versions', async () => {
    const projectRoot = makeGoodFixture();
    const claudeBase = makeTempDir('sai-vs-claude-');
    try {
      installClaude(claudeBase);
      fs.writeFileSync(path.join(claudeBase, '.version'), '1.0.0');

      const opencodeBase = nonexistentPath('sai-vs-oc-');
      const copilot = {
        promptsBase: nonexistentPath('sai-vs-cp-prompts-'),
        skillsBase: nonexistentPath('sai-vs-cp-skills-'),
        agentsBase: nonexistentPath('sai-vs-cp-agents-'),
        saiBase: nonexistentPath('sai-vs-cp-sai-'),
      };

      const { code, parsed } = await runDoctor({
        projectRoot, claudeBase, opencodeBase, copilot,
        fetchLatestVersion: stubLatest('2.0.0'),
      });

      assert.equal(code, 0);

      const claude = parsed['[Claude Code]'];
      assert.ok(claude, '[Claude Code] section should exist');
      assert.ok(Array.isArray(claude.version), 'version should be an array');
      assert.equal(claude.version[0].severity, 'warn');
      assert.ok(claude.version[0].message.includes('1.0.0'), 'message should name installed version');
      assert.ok(claude.version[0].message.includes('2.0.0'), 'message should name latest version');
    } finally {
      fs.rmSync(projectRoot, { recursive: true, force: true });
      fs.rmSync(claudeBase, { recursive: true, force: true });
    }
  });

  test('3: fetchLatestVersion returns null — warn latest version unknown, exit unaffected', async () => {
    const projectRoot = makeGoodFixture();
    const claudeBase = makeTempDir('sai-vs-claude-');
    try {
      installClaude(claudeBase);
      fs.writeFileSync(path.join(claudeBase, '.version'), '1.0.0');

      const opencodeBase = nonexistentPath('sai-vs-oc-');
      const copilot = {
        promptsBase: nonexistentPath('sai-vs-cp-prompts-'),
        skillsBase: nonexistentPath('sai-vs-cp-skills-'),
        agentsBase: nonexistentPath('sai-vs-cp-agents-'),
        saiBase: nonexistentPath('sai-vs-cp-sai-'),
      };

      const { code, parsed } = await runDoctor({
        projectRoot, claudeBase, opencodeBase, copilot,
        fetchLatestVersion: stubLatest(null),
      });

      assert.equal(code, 0);

      const claude = parsed['[Claude Code]'];
      assert.ok(claude, '[Claude Code] section should exist');
      assert.ok(Array.isArray(claude.version), 'version should be an array');
      const warnRecord = claude.version.find(r => r.severity === 'warn');
      assert.ok(warnRecord, 'should have a warn version record');
      assert.ok(warnRecord.message.includes('unknown'), 'message should indicate latest version unknown');
    } finally {
      fs.rmSync(projectRoot, { recursive: true, force: true });
      fs.rmSync(claudeBase, { recursive: true, force: true });
    }
  });

  test('4: no marker — fallback lists drifted files via hash compare', async () => {
    const projectRoot = makeGoodFixture();
    const claudeBase = makeTempDir('sai-vs-claude-');
    try {
      installClaude(claudeBase);
      fs.unlinkSync(path.join(claudeBase, '.version'));
      const targetFile = path.join(claudeBase, 'commands', 'sai-1-spec.md');
      assert.ok(fs.existsSync(targetFile), 'sai-1-spec.md should exist after install');
      fs.appendFileSync(targetFile, '\n<!-- modified by test -->\n');

      const opencodeBase = nonexistentPath('sai-vs-oc-');
      const copilot = {
        promptsBase: nonexistentPath('sai-vs-cp-prompts-'),
        skillsBase: nonexistentPath('sai-vs-cp-skills-'),
        agentsBase: nonexistentPath('sai-vs-cp-agents-'),
        saiBase: nonexistentPath('sai-vs-cp-sai-'),
      };

      const { code, parsed } = await runDoctor({
        projectRoot, claudeBase, opencodeBase, copilot,
      });

      assert.equal(code, 0);

      const claude = parsed['[Claude Code]'];
      assert.ok(claude, '[Claude Code] section should exist');
      assert.ok(Array.isArray(claude.version), 'version should be an array');
      const warnRecord = claude.version.find(r => r.severity === 'warn');
      assert.ok(warnRecord, 'should have a warn version record for drifted files');
      assert.ok(warnRecord.message.includes('sai-1-spec.md'), 'message should name the differing file');
    } finally {
      fs.rmSync(projectRoot, { recursive: true, force: true });
      fs.rmSync(claudeBase, { recursive: true, force: true });
    }
  });

});
