'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { PassThrough } = require('stream');

const { main } = require('../bin/doctor.js');
const { installClaude } = require('../bin/install-flow.js');

function fixture() {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-doctor-retirement-'));
  fs.mkdirSync(path.join(projectRoot, 'openspec'), { recursive: true });
  fs.writeFileSync(path.join(projectRoot, 'openspec', 'config.yaml'), 'schema: sai-workflow\n');
  const claudeBase = path.join(projectRoot, 'claude');
  installClaude(claudeBase);
  return { projectRoot, claudeBase };
}

function execOk() {
  return { status: 0, stdout: '1.4.1\n', stderr: '', error: null };
}

function output() {
  const out = new PassThrough();
  const chunks = [];
  out.on('data', chunk => chunks.push(chunk));
  return { out, text: () => Buffer.concat(chunks).toString() };
}

function retiredCopy(claudeBase, contents = 'user-owned retired copy\n') {
  const destination = path.join(claudeBase, 'commands', 'sai-2-design-inline.md');
  fs.writeFileSync(destination, contents);
  return destination;
}

async function runJson(projectRoot, claudeBase) {
  const capture = output();
  const code = await main({
    argv: ['--json'],
    projectRoot,
    claudeBase,
    opencodeBase: path.join(projectRoot, 'missing-opencode'),
    copilot: {
      promptsBase: path.join(projectRoot, 'missing-copilot-prompts'),
      skillsBase: path.join(projectRoot, 'missing-copilot-skills'),
      agentsBase: path.join(projectRoot, 'missing-copilot-agents'),
      saiBase: path.join(projectRoot, 'missing-copilot-sai'),
    },
    execOpenspec: execOk,
    out: capture.out,
  });
  return { code, report: JSON.parse(capture.text()) };
}

function retirementWarning(report, destination) {
  const section = report['[Claude Code]'];
  const warnings = section && (section.retirementWarnings || section.retirements || section.warnings);
  assert.ok(Array.isArray(warnings), 'doctor should expose retirement warnings');
  const warning = warnings.find(record => record.destination === destination || record.path === destination);
  assert.ok(warning, 'doctor should identify the retired destination');
  return warning;
}

test('doctor reports an unrecognized retired copy without changing it', async () => {
  const { projectRoot, claudeBase } = fixture();
  try {
    const destination = retiredCopy(claudeBase);
    const before = fs.readFileSync(destination, 'utf8');
    const { code, report } = await runJson(projectRoot, claudeBase);

    assert.equal(code, 0);
    const warning = retirementWarning(report, destination);
    assert.equal(warning.severity, 'warn');
    assert.equal(warning.classification, 'retirement');
    assert.equal(warning.harness, 'claude');
    assert.equal(warning.recognized, false);
    assert.match(warning.remediation, /manual cleanup/i);
    assert.equal(fs.readFileSync(destination, 'utf8'), before);
  } finally {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }
});

test('doctor does not classify an unrecognized retired copy as missing or generic unexpected', async () => {
  const { projectRoot, claudeBase } = fixture();
  try {
    const destination = retiredCopy(claudeBase);
    const { report } = await runJson(projectRoot, claudeBase);
    const section = report['[Claude Code]'];

    assert.equal(section.files.some(record => record.severity === 'error' && record.path === destination), false);
    assert.equal(section.unexpected.some(record => record.path === destination), false);
  } finally {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }
});

test('human doctor output identifies retired-copy cleanup and remains successful', async () => {
  const { projectRoot, claudeBase } = fixture();
  try {
    retiredCopy(claudeBase);
    const capture = output();
    const code = await main({
      argv: [],
      projectRoot,
      claudeBase,
      opencodeBase: path.join(projectRoot, 'missing-opencode'),
      copilot: {
        promptsBase: path.join(projectRoot, 'missing-copilot-prompts'),
        skillsBase: path.join(projectRoot, 'missing-copilot-skills'),
        agentsBase: path.join(projectRoot, 'missing-copilot-agents'),
        saiBase: path.join(projectRoot, 'missing-copilot-sai'),
      },
      execOpenspec: execOk,
      out: capture.out,
    });

    assert.equal(code, 0);
    assert.match(capture.text(), /retirement/i);
    assert.match(capture.text(), /manual cleanup/i);
  } finally {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }
});
