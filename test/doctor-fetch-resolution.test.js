'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { PassThrough } = require('stream');

const { main } = require('../bin/doctor.js');
const { installClaude, installCopilot, ensureDir } = require('../bin/install-flow.js');

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
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-doctor-fr-'));
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

async function runDoctor({ projectRoot, claudeBase, opencodeBase, copilot }) {
  const { stream: out, end } = collectOut();
  const code = await main({
    argv: ['--json'],
    projectRoot,
    claudeBase,
    opencodeBase,
    copilot,
    execOpenspec: execOk,
    out,
  });
  const raw = end();
  const parsed = JSON.parse(raw);
  return { code, parsed };
}

describe('doctor fetch resolution', () => {

  test('1: Fetch @sai/instructions/x.md resolved via global fallback — no error', async () => {
    const projectRoot = makeGoodFixture();
    const claudeBase = makeTempDir('sai-dr-fr-claude-');
    try {
      installClaude(claudeBase);

      const wrapper = path.join(claudeBase, 'commands', 'sai-1-spec.md');
      fs.appendFileSync(wrapper, '\nFetch @sai/instructions/fr-test-x.md\n');

      const targetDir = path.join(claudeBase, 'sai', 'instructions');
      ensureDir(targetDir);
      fs.writeFileSync(path.join(targetDir, 'fr-test-x.md'), '# x\n');

      const opencodeBase = nonexistentPath('sai-dr-fr-oc-');
      const copilot = {
        promptsBase: nonexistentPath('sai-dr-fr-cp-prompts-'),
        skillsBase: nonexistentPath('sai-dr-fr-cp-skills-'),
        agentsBase: nonexistentPath('sai-dr-fr-cp-agents-'),
        saiBase: nonexistentPath('sai-dr-fr-cp-sai-'),
      };

      const { code, parsed } = await runDoctor({ projectRoot, claudeBase, opencodeBase, copilot });

      assert.equal(code, 0);

      const claude = parsed['[Claude Code]'];
      assert.ok(claude, '[Claude Code] section should exist');

      const fetchRefErrors = (claude['fetch-ref'] || []).filter(r => r.severity === 'error');
      assert.equal(fetchRefErrors.length, 0,
        `expected no fetch-ref errors, got: ${JSON.stringify(fetchRefErrors)}`);
    } finally {
      fs.rmSync(projectRoot, { recursive: true, force: true });
      fs.rmSync(claudeBase, { recursive: true, force: true });
    }
  });

  test('2: Fetch @sai/instructions/missing.md resolvable nowhere — error + exit 1', async () => {
    const projectRoot = makeGoodFixture();
    const claudeBase = makeTempDir('sai-dr-fr-claude-');
    try {
      installClaude(claudeBase);

      const wrapper = path.join(claudeBase, 'commands', 'sai-1-spec.md');
      fs.appendFileSync(wrapper, '\nFetch @sai/instructions/fr-test-missing.md\n');

      const opencodeBase = nonexistentPath('sai-dr-fr-oc-');
      const copilot = {
        promptsBase: nonexistentPath('sai-dr-fr-cp-prompts-'),
        skillsBase: nonexistentPath('sai-dr-fr-cp-skills-'),
        agentsBase: nonexistentPath('sai-dr-fr-cp-agents-'),
        saiBase: nonexistentPath('sai-dr-fr-cp-sai-'),
      };

      const { code, parsed } = await runDoctor({ projectRoot, claudeBase, opencodeBase, copilot });

      assert.equal(code, 1);

      const claude = parsed['[Claude Code]'];
      assert.ok(claude, '[Claude Code] section should exist');
      const fetchRefErrors = (claude['fetch-ref'] || []).filter(r => r.severity === 'error');
      assert.ok(fetchRefErrors.length >= 1, 'should have at least one fetch-ref error');
      assert.ok(
        fetchRefErrors.some(r => r.message.includes('fr-test-missing.md')),
        'error message should reference the missing target'
      );
    } finally {
      fs.rmSync(projectRoot, { recursive: true, force: true });
      fs.rmSync(claudeBase, { recursive: true, force: true });
    }
  });

  test('3: Copilot wrapper token resolvable at .github/sai/ — no error', async () => {
    const projectRoot = makeGoodFixture();
    const copilot = {
      promptsBase: makeTempDir('sai-dr-fr-cp-prompts-'),
      skillsBase: makeTempDir('sai-dr-fr-cp-skills-'),
      agentsBase: makeTempDir('sai-dr-fr-cp-agents-'),
      saiBase: makeTempDir('sai-dr-fr-cp-sai-'),
    };
    try {
      installCopilot(copilot.promptsBase, copilot.skillsBase, copilot.agentsBase, copilot.saiBase);

      const promptsDir = copilot.promptsBase;
      const cmdFiles = fs.readdirSync(promptsDir).filter(f => f.endsWith('.prompt.md'));
      assert.ok(cmdFiles.length > 0, 'should have copilot prompt files');
      const wrapper = path.join(promptsDir, cmdFiles[0]);
      fs.appendFileSync(wrapper, '\nFetch @sai/instructions/fr-copilot-ref.md\n');

      const projectSaiDir = path.join(projectRoot, '.github', 'sai', 'instructions');
      ensureDir(projectSaiDir);
      fs.writeFileSync(path.join(projectSaiDir, 'fr-copilot-ref.md'), '# resolved\n');

      const claudeBase = nonexistentPath('sai-dr-fr-claude-');
      const opencodeBase = nonexistentPath('sai-dr-fr-oc-');

      const { code, parsed } = await runDoctor({ projectRoot, claudeBase, opencodeBase, copilot });

      assert.equal(code, 0);

      const cpSection = parsed['[GitHub Copilot]'];
      assert.ok(cpSection, '[GitHub Copilot] section should exist');
      const fetchRefErrors = (cpSection['fetch-ref'] || []).filter(r => r.severity === 'error');
      assert.equal(fetchRefErrors.length, 0,
        `expected no fetch-ref errors, got: ${JSON.stringify(fetchRefErrors)}`);
    } finally {
      fs.rmSync(projectRoot, { recursive: true, force: true });
      for (const d of [copilot.promptsBase, copilot.skillsBase, copilot.agentsBase, copilot.saiBase]) {
        fs.rmSync(d, { recursive: true, force: true });
      }
    }
  });

  test('4a: Fetch @skills/fetch/SKILL.md — installed skill, no error', async () => {
    const projectRoot = makeGoodFixture();
    const claudeBase = makeTempDir('sai-dr-fr-claude-');
    try {
      installClaude(claudeBase);

      const opencodeBase = nonexistentPath('sai-dr-fr-oc-');
      const copilot = {
        promptsBase: nonexistentPath('sai-dr-fr-cp-prompts-'),
        skillsBase: nonexistentPath('sai-dr-fr-cp-skills-'),
        agentsBase: nonexistentPath('sai-dr-fr-cp-agents-'),
        saiBase: nonexistentPath('sai-dr-fr-cp-sai-'),
      };

      const { code, parsed } = await runDoctor({ projectRoot, claudeBase, opencodeBase, copilot });

      assert.equal(code, 0);

      const claude = parsed['[Claude Code]'];
      assert.ok(claude, '[Claude Code] section should exist');
      const fetchSkillErrors = (claude['fetch-skill'] || []).filter(r => r.severity === 'error');
      assert.equal(fetchSkillErrors.length, 0,
        `expected no fetch-skill errors, got: ${JSON.stringify(fetchSkillErrors)}`);
    } finally {
      fs.rmSync(projectRoot, { recursive: true, force: true });
      fs.rmSync(claudeBase, { recursive: true, force: true });
    }
  });

  test('4b: Fetch @skills/nonexistent/SKILL.md — absent skill, error', async () => {
    const projectRoot = makeGoodFixture();
    const claudeBase = makeTempDir('sai-dr-fr-claude-');
    try {
      installClaude(claudeBase);

      const wrapper = path.join(claudeBase, 'commands', 'sai-1-spec.md');
      fs.appendFileSync(wrapper, '\nFetch @skills/nonexistent/SKILL.md\n');

      const opencodeBase = nonexistentPath('sai-dr-fr-oc-');
      const copilot = {
        promptsBase: nonexistentPath('sai-dr-fr-cp-prompts-'),
        skillsBase: nonexistentPath('sai-dr-fr-cp-skills-'),
        agentsBase: nonexistentPath('sai-dr-fr-cp-agents-'),
        saiBase: nonexistentPath('sai-dr-fr-cp-sai-'),
      };

      const { code, parsed } = await runDoctor({ projectRoot, claudeBase, opencodeBase, copilot });

      assert.equal(code, 1);

      const claude = parsed['[Claude Code]'];
      assert.ok(claude, '[Claude Code] section should exist');
      const fetchSkillErrors = (claude['fetch-skill'] || []).filter(r => r.severity === 'error');
      assert.ok(fetchSkillErrors.length >= 1, 'should have at least one fetch-skill error');
      assert.ok(
        fetchSkillErrors.some(r => r.message.includes('nonexistent')),
        'error message should reference the nonexistent skill name'
      );
    } finally {
      fs.rmSync(projectRoot, { recursive: true, force: true });
      fs.rmSync(claudeBase, { recursive: true, force: true });
    }
  });

});
