#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const childProcess = require('child_process');

const REPO_ROOT_DEFAULT = path.join(__dirname, '..');

function shorten(p) {
  const home = os.homedir();
  return p.startsWith(home) ? '~' + p.slice(home.length) : p;
}

function defaultExecOpenspec(args) {
  return childProcess.spawnSync('openspec', args, { encoding: 'utf8', shell: true });
}

function checkProjectHealth({ projectRoot, execOpenspec }) {
  const section = '[Project health]';
  const records = [];

  let onPath = false;
  try {
    const r = execOpenspec(['--version']);
    onPath = !!r && !r.error && r.status === 0;
  } catch { onPath = false; }
  records.push(onPath
    ? { section, name: 'openspec binary', id: 'openspec binary', severity: 'ok', message: 'openspec is on PATH' }
    : { section, name: 'openspec binary', id: 'openspec binary', severity: 'error', message: 'openspec CLI not found on PATH', recommendation: 'Install it: https://github.com/Fission-AI/OpenSpec' });

  const hasDir = fs.existsSync(path.join(projectRoot, 'openspec'));
  records.push(hasDir
    ? { section, name: 'openspec directory', id: 'openspec directory', severity: 'ok', message: 'openspec/ exists' }
    : { section, name: 'openspec directory', id: 'openspec directory', severity: 'error', message: 'openspec/ not found at project root', recommendation: 'Run: openspec init' });

  let schemaOk = false;
  const cfgPath = path.join(projectRoot, 'openspec', 'config.yaml');
  if (fs.existsSync(cfgPath)) {
    schemaOk = /^schema:\s*sai-workflow\s*$/m.test(fs.readFileSync(cfgPath, 'utf8'));
  }
  records.push(schemaOk
    ? { section, name: 'workflow schema', id: 'workflow schema', severity: 'ok', message: 'schema: sai-workflow declared' }
    : { section, name: 'workflow schema', id: 'workflow schema', severity: 'error', message: 'openspec/config.yaml missing schema: sai-workflow', recommendation: 'Add `schema: sai-workflow` to openspec/config.yaml' });

  return records;
}

function aggregateExit(records) {
  return records.some(r => r.severity === 'error') ? 1 : 0;
}

function groupSections(records) {
  const order = [];
  const map = new Map();
  for (const r of records) {
    if (!map.has(r.section)) { map.set(r.section, []); order.push(r.section); }
    map.get(r.section).push(r);
  }
  return order.map(section => ({ section, records: map.get(section) }));
}

function objectify(sections) {
  const obj = {};
  for (const { section, records } of sections) {
    obj[section] = records;
  }
  return obj;
}

function renderHuman(sections) {
  const glyph = { ok: '✓', warn: '!', error: '✗' };
  const lines = [];
  for (const { section, records } of sections) {
    lines.push('');
    lines.push(section);
    for (const r of records) {
      lines.push(`  ${glyph[r.severity] || '?'} ${r.name}: ${r.message}`);
      if (r.recommendation && r.severity !== 'ok') lines.push(`      → ${r.recommendation}`);
    }
  }
  return lines.join('\n');
}

async function main(options = {}) {
  const {
    argv = process.argv.slice(2),
    projectRoot = process.cwd(),
    execOpenspec = defaultExecOpenspec,
    out = process.stdout,
  } = options;
  const json = argv.includes('--json');

  const records = [];
  records.push(...checkProjectHealth({ projectRoot, execOpenspec }));

  const sections = groupSections(records);
  const code = aggregateExit(records);
  out.write((json ? JSON.stringify(objectify(sections), null, 2) : renderHuman(sections)) + '\n');
  return code;
}

module.exports = { main, checkProjectHealth, aggregateExit, groupSections, renderHuman, shorten };
