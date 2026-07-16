'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { PassThrough } = require('stream');

const { main } = require('../bin/doctor.js');

function execVersion(version) {
  return () => ({ status: 0, stdout: version + '\n', stderr: '', error: null });
}

function execNoVersion() {
  return () => ({ status: 0, stdout: 'unknown version', stderr: '', error: null });
}

function collectOut() {
  const ps = new PassThrough();
  const chunks = [];
  ps.on('data', (c) => chunks.push(c));
  const end = () => Buffer.concat(chunks).toString();
  return { stream: ps, end };
}

function makeGoodFixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-doctor-ss-'));
  fs.mkdirSync(path.join(dir, 'openspec'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'openspec', 'config.yaml'), 'schema: sai-workflow\n');
  return dir;
}

function createSkillDir(root, harnessDir, skillName, generatedBy) {
  const skillDir = path.join(root, harnessDir, 'skills', 'openspec-' + skillName);
  fs.mkdirSync(skillDir, { recursive: true });
  const frontmatter = generatedBy !== null
    ? `---\ngeneratedBy: "${generatedBy}"\n---\n`
    : `# ${skillName} skill\n`;
  fs.writeFileSync(path.join(skillDir, 'SKILL.md'), frontmatter);
}

function nonexistentPath(prefix) {
  const ts = Date.now().toString(36);
  const rnd = Math.random().toString(36).slice(2, 8);
  return path.join(os.tmpdir(), prefix + '-' + ts + '-' + rnd);
}

async function runDoctor({ projectRoot, execOpenspec }) {
  const { stream: out, end } = collectOut();
  const claudeBase = nonexistentPath('sai-ss-claude-');
  const opencodeBase = nonexistentPath('sai-ss-oc-');
  const copilot = {
    promptsBase: nonexistentPath('sai-ss-cp-prompts-'),
    skillsBase: nonexistentPath('sai-ss-cp-skills-'),
    agentsBase: nonexistentPath('sai-ss-cp-agents-'),
    saiBase: nonexistentPath('sai-ss-cp-sai-'),
  };
  const code = await main({
    argv: ['--json'],
    projectRoot,
    claudeBase,
    opencodeBase,
    copilot,
    execOpenspec,
    out,
  });
  const raw = end();
  const parsed = JSON.parse(raw);
  return { code, parsed };
}

describe('doctor skill staleness', () => {

  test('1: generatedBy matches CLI version — ok severity', async () => {
    const projectRoot = makeGoodFixture();
    try {
      createSkillDir(projectRoot, '.claude', 'explore', '1.5.0');
      const { code, parsed } = await runDoctor({
        projectRoot,
        execOpenspec: execVersion('1.5.0'),
      });

      assert.equal(code, 0);

      const skills = parsed['[OpenSpec skills]'];
      assert.ok(skills, '[OpenSpec skills] section should exist');
      assert.ok(Array.isArray(skills), 'should be an array');
      const okRecord = skills.find(r => r.severity === 'ok');
      assert.ok(okRecord, 'should have an ok record');
    } finally {
      fs.rmSync(projectRoot, { recursive: true, force: true });
    }
  });

  test('2: generatedBy differs from CLI version — warn severity', async () => {
    const projectRoot = makeGoodFixture();
    try {
      createSkillDir(projectRoot, '.claude', 'explore', '1.4.0');
      const { code, parsed } = await runDoctor({
        projectRoot,
        execOpenspec: execVersion('1.5.0'),
      });

      assert.equal(code, 0);

      const skills = parsed['[OpenSpec skills]'];
      assert.ok(skills, '[OpenSpec skills] section should exist');
      const warnRecord = skills.find(r => r.severity === 'warn');
      assert.ok(warnRecord, 'should have a warn record');
      assert.ok(warnRecord.message.includes('1.4.0'), 'message should reference the generatedBy version');
      assert.ok(warnRecord.message.includes('1.5.0'), 'message should reference the CLI version');
      assert.ok(warnRecord.name.includes('openspec-explore'), 'name should reference the skill dir');
    } finally {
      fs.rmSync(projectRoot, { recursive: true, force: true });
    }
  });

  test('3: skill without generatedBy — warn severity', async () => {
    const projectRoot = makeGoodFixture();
    try {
      createSkillDir(projectRoot, '.claude', 'explore', null);
      const { code, parsed } = await runDoctor({
        projectRoot,
        execOpenspec: execVersion('1.5.0'),
      });

      assert.equal(code, 0);

      const skills = parsed['[OpenSpec skills]'];
      assert.ok(skills, '[OpenSpec skills] section should exist');
      const warnRecord = skills.find(r => r.severity === 'warn');
      assert.ok(warnRecord, 'should have a warn record');
      assert.ok(warnRecord.message.includes('generatedBy'), 'message should mention missing generatedBy');
    } finally {
      fs.rmSync(projectRoot, { recursive: true, force: true });
    }
  });

  test('4: no openspec-* skill dirs — nothing-to-check ok record', async () => {
    const projectRoot = makeGoodFixture();
    try {
      const { code, parsed } = await runDoctor({
        projectRoot,
        execOpenspec: execVersion('1.5.0'),
      });

      assert.equal(code, 0);

      const skills = parsed['[OpenSpec skills]'];
      assert.ok(skills, '[OpenSpec skills] section should exist');
      const okRecord = skills.find(r => r.severity === 'ok');
      assert.ok(okRecord, 'should have an ok record');
      assert.ok(okRecord.message.includes('nothing'), 'message should indicate nothing to check');
    } finally {
      fs.rmSync(projectRoot, { recursive: true, force: true });
    }
  });

  test('5: execOpenspec returns unparseable version — indeterminate warn', async () => {
    const projectRoot = makeGoodFixture();
    try {
      createSkillDir(projectRoot, '.claude', 'explore', '1.5.0');
      const { code, parsed } = await runDoctor({
        projectRoot,
        execOpenspec: execNoVersion(),
      });

      assert.equal(code, 0);

      const skills = parsed['[OpenSpec skills]'];
      assert.ok(skills, '[OpenSpec skills] section should exist');
      const warnRecord = skills.find(r => r.severity === 'warn');
      assert.ok(warnRecord, 'should have a warn record');
      assert.ok(warnRecord.message.includes('indeterminate'), 'message should indicate version indeterminate');
    } finally {
      fs.rmSync(projectRoot, { recursive: true, force: true });
    }
  });

});
