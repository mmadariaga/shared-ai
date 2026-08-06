'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { PassThrough } = require('stream');

const { main } = require('../bin/doctor.js');
const { installClaude, installOpencode } = require('../bin/install-flow.js');

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
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-doctor-harness-'));
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

async function runDoctor({ projectRoot, claudeBase, opencodeBase }) {
  const { stream: out, end } = collectOut();
  const code = await main({
    argv: ['--json'],
    projectRoot,
    claudeBase,
    opencodeBase,
    execOpenspec: execOk,
    out,
  });
  const raw = end();
  const parsed = JSON.parse(raw);
  return { code, parsed };
}

describe('doctor harness inventory', () => {

  test('STEP1_RETIRE_INLINE: doctor reports exactly Claude Code and opencode', async () => {
    const projectRoot = makeGoodFixture();
    const claudeBase = makeTempDir('sai-step1-doctor-claude-');
    const opencodeBase = makeTempDir('sai-step1-doctor-opencode-');
    try {
      installClaude(claudeBase);
      installOpencode(opencodeBase);
      const { code, parsed } = await runDoctor({
        projectRoot,
        claudeBase,
        opencodeBase,
      });

      assert.equal(code, 0);
      assert.ok(parsed['[Claude Code]']);
      assert.ok(parsed['[Opencode]']);
      assert.equal(Object.hasOwn(parsed, '[GitHub Copilot]'), false);
      assert.equal(JSON.stringify(parsed).toLowerCase().includes('copilot'), false);
      assert.equal(JSON.stringify(parsed).toLowerCase().includes('sai-step1-doctor-copilot'), false);
    } finally {
      fs.rmSync(projectRoot, { recursive: true, force: true });
      fs.rmSync(claudeBase, { recursive: true, force: true });
      fs.rmSync(opencodeBase, { recursive: true, force: true });
    }
  });

  test('1: only claudeBase exists — opencode and copilot dirs absent', async () => {
    const projectRoot = makeGoodFixture();
    const claudeBase = makeTempDir('sai-harness-claude-');
    try {
      installClaude(claudeBase);

      const opencodeBase = nonexistentPath('sai-harness-oc-nonexistent');
      const { code, parsed } = await runDoctor({ projectRoot, claudeBase, opencodeBase });

      assert.equal(code, 0);

      const claude = parsed['[Claude Code]'];
      assert.ok(claude, '[Claude Code] section should exist');
      assert.ok(Array.isArray(claude.files), 'files should be an array');
      assert.ok(claude.files.length > 0, 'should list expected files');
      for (const r of claude.files) {
        assert.equal(r.severity, 'ok', `expected ok for ${r.name}`);
      }

      const oc = parsed['[Opencode]'];
      assert.ok(oc, '[Opencode] section should exist');
      assert.equal(oc.notInstalled, true, 'opencode should report not installed');

      assert.deepEqual(Object.keys(parsed).filter(key => ['[Claude Code]', '[Opencode]'].includes(key)).sort(), ['[Claude Code]', '[Opencode]']);
    } finally {
      fs.rmSync(projectRoot, { recursive: true, force: true });
      fs.rmSync(claudeBase, { recursive: true, force: true });
    }
  });

  test('2: fully-populated supported harnesses', async () => {
    const projectRoot = makeGoodFixture();
    const claudeBase = makeTempDir('sai-harness-claude-');
    const opencodeBase = makeTempDir('sai-harness-opencode-');
    try {
      installClaude(claudeBase);
      installOpencode(opencodeBase);

      const { code, parsed } = await runDoctor({ projectRoot, claudeBase, opencodeBase });

      assert.equal(code, 0);

      for (const key of ['[Claude Code]', '[Opencode]']) {
        const section = parsed[key];
        assert.ok(section, `${key} section should exist`);
        assert.ok(Array.isArray(section.files), `${key} files should be an array`);
        assert.ok(section.files.length > 0, `${key} should list expected files`);
        for (const r of section.files) {
          assert.equal(r.severity, 'ok', `${key} file ${r.name} should be ok`);
        }
      }
      for (const file of [
        path.join('sai', 'commands', 'design', 'coordinator.md'),
        path.join('sai', 'commands', 'design', 'invocation.md'),
        path.join('sai', 'commands', 'implement', 'coordinator.md'),
        path.join('sai', 'commands', 'implement', 'invocation.md'),
      ]) {
        assert.equal(fs.existsSync(path.join(claudeBase, file)), true, `${file} should be installed`);
        assert.equal(fs.existsSync(path.join(opencodeBase, file)), true, `${file} should be installed`);
      }
    } finally {
      fs.rmSync(projectRoot, { recursive: true, force: true });
      for (const d of [claudeBase, opencodeBase]) {
        fs.rmSync(d, { recursive: true, force: true });
      }
    }
  });

  test('3: one expected file deleted — error severity and exit 1', async () => {
    const projectRoot = makeGoodFixture();
    const claudeBase = makeTempDir('sai-harness-claude-');
    try {
      installClaude(claudeBase);

      const target = path.join(claudeBase, 'commands', 'sai-1-spec.md');
      assert.ok(fs.existsSync(target), 'sai-1-spec.md should exist after install');
      fs.unlinkSync(target);

      const opencodeBase = nonexistentPath('sai-harness-oc-nonexistent');
      const { code, parsed } = await runDoctor({ projectRoot, claudeBase, opencodeBase });

      assert.equal(code, 1);

      const claude = parsed['[Claude Code]'];
      assert.ok(claude, '[Claude Code] section should exist');
      const errorFile = claude.files.find(r => r.severity === 'error');
      assert.ok(errorFile, 'should have a file record with error severity for the missing file');
      assert.ok(
        (errorFile.name && errorFile.name.includes('sai-1-spec.md')) ||
        (errorFile.path && errorFile.path.includes('sai-1-spec.md')),
        'error record should reference the deleted sai-1-spec.md'
      );
    } finally {
      fs.rmSync(projectRoot, { recursive: true, force: true });
      fs.rmSync(claudeBase, { recursive: true, force: true });
    }
  });

  test('4: extra .md added — unexpected record with warn severity', async () => {
    const projectRoot = makeGoodFixture();
    const claudeBase = makeTempDir('sai-harness-claude-');
    try {
      installClaude(claudeBase);

      const extra = path.join(claudeBase, 'commands', 'extra-user-file.md');
      fs.writeFileSync(extra, '# User-added file\n');

      const opencodeBase = nonexistentPath('sai-harness-oc-nonexistent');
      const { code, parsed } = await runDoctor({ projectRoot, claudeBase, opencodeBase });

      assert.equal(code, 0);

      const claude = parsed['[Claude Code]'];
      assert.ok(claude, '[Claude Code] section should exist');
      assert.ok(Array.isArray(claude.unexpected), 'should have unexpected array');
      assert.ok(claude.unexpected.length >= 1, 'should have at least one unexpected record');
      assert.ok(
        claude.unexpected.some(r => r.severity === 'warn'),
        'unexpected records should have warn severity'
      );
      assert.ok(
        claude.unexpected.some(r =>
          (r.name && r.name.includes('extra-user-file')) ||
          (r.path && r.path.includes('extra-user-file'))
        ),
        'unexpected record should reference the extra file'
      );
    } finally {
      fs.rmSync(projectRoot, { recursive: true, force: true });
      fs.rmSync(claudeBase, { recursive: true, force: true });
    }
  });

});
