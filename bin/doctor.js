#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const childProcess = require('child_process');
const https = require('https');

const flow = require('./install-flow');
const uninstall = require('./uninstall-flow');

const REPO_ROOT_DEFAULT = path.join(__dirname, '..');

const FETCH_ORDER = {
  claude:   (root, base, sub) => [path.join(root, '.claude', sub), path.join(base, sub)],
  opencode: (root, base, sub) => [path.join(root, '.opencode', sub), path.join(base, sub)],
  copilot:  (root, saiBase, sub) => { const c = sub.replace(/^sai\//, ''); return [path.join(root, '.github', 'sai', c), path.join(saiBase, c)]; },
};

const SKILL_BASES = {
  claude:   (root, base) => [path.join(root, '.claude', 'skills'), path.join(base, 'skills')],
  opencode: (root, base) => [path.join(root, '.opencode', 'skills'), path.join(base, 'skills')],
  copilot:  (root, base) => [path.join(root, '.github', 'skills'), base],
};

function parseFetchRefs(text) {
  const refs = [];
  const re = /(?:Also fetch|Fetch)\s+@([^\s`)]+)/g;
  let m;
  while ((m = re.exec(text)) !== null) refs.push(m[1].replace(/[.,;:]+$/, ''));
  return refs;
}

function resolveFetchRefs(section, wrapperPath, kind, { projectRoot, globalBase, skillsBase }) {
  const records = [];
  let text;
  try { text = fs.readFileSync(wrapperPath, 'utf8'); } catch { return records; }
  for (const ref of parseFetchRefs(text)) {
    if (ref.startsWith('~')) continue;
    const skillMatch = ref.match(/^skills\/([^/]+)\/SKILL\.md$/);
    if (skillMatch) {
      const name = skillMatch[1];
      const bases = SKILL_BASES[kind](projectRoot, skillsBase);
      const found = bases.some(b => fs.existsSync(path.join(b, name, 'SKILL.md')));
      if (!found) {
        records.push({ section, name: 'fetch-skill', severity: 'error', message: `skill not installed: ${name} (in ${shorten(wrapperPath)})`, recommendation: 'Re-run the installer to restore the skill' });
      }
      continue;
    }
    const candidates = FETCH_ORDER[kind](projectRoot, globalBase, ref);
    if (!candidates.some(c => fs.existsSync(c))) {
      records.push({ section, name: 'fetch-ref', severity: 'error', message: `dangling Fetch @${ref} in ${shorten(wrapperPath)}`, recommendation: 'Re-run the installer to restore the referenced file' });
    }
  }
  return records;
}

function fetchResolutionRecords(harness, expectedEntries, { projectRoot }) {
  const section = `[${harness.id}]`;
  const globalBase = harness.kind === 'copilot' ? harness.copilotSaiBase : harness.base;
  const skillsBase = harness.kind === 'copilot' ? harness.copilotSkillsBase : harness.base;
  const wrappers = expectedEntries
    .filter(e => e.src !== e.dest && e.dest.endsWith('.md') && !e.src.includes(`${path.sep}sai${path.sep}`) && !e.src.includes(`${path.sep}skills${path.sep}`) && !e.src.includes(`${path.sep}agents${path.sep}`))
    .filter(e => fs.existsSync(e.dest));
  const records = [];
  for (const w of wrappers) {
    records.push(...resolveFetchRefs(section, w.dest, harness.kind, { projectRoot, globalBase, skillsBase }));
  }
  return records;
}

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

function detectHarnesses({ claudeBase, opencodeBase, copilot }) {
  return [
    { id: 'Claude Code', base: claudeBase, kind: 'claude',
      entries: () => uninstall.enumerateClaude(claudeBase) },
    { id: 'Opencode', base: opencodeBase, kind: 'opencode',
      entries: () => uninstall.enumerateOpencode(opencodeBase) },
    { id: 'GitHub Copilot', base: copilot.promptsBase, kind: 'copilot', copilotSaiBase: copilot.saiBase, copilotSkillsBase: copilot.skillsBase,
      entries: () => uninstall.enumerateCopilot(copilot.promptsBase, copilot.skillsBase, copilot.agentsBase, copilot.saiBase) },
  ];
}

function inventoryHarness(section, expectedEntries, { projectRoot, harness }) {
  const records = [];
  const expected = expectedEntries.filter(e => e.src !== e.dest);
  const expectedDests = new Set(expected.map(e => e.dest));

  const missing = expected.filter(e => !fs.existsSync(e.dest)).map(e => shorten(e.dest));
  records.push(missing.length === 0
    ? { section, name: 'files', severity: 'ok', message: `${expected.length} expected files present` }
    : { section, name: 'files', severity: 'error', message: `${missing.length} expected file(s) missing: ${missing.join(', ')}`, path: missing.join(', '), recommendation: 'Re-run the installer: npx github:mmadariaga/shared-ai install' });

  const dirs = new Set(expected.map(e => path.dirname(e.dest)));
  const unexpected = [];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).filter(n => n.endsWith('.md'))) {
      const full = path.join(dir, f);
      if (!expectedDests.has(full)) unexpected.push(shorten(full));
    }
  }
  if (unexpected.length > 0) {
    records.push({ section, name: 'unexpected', severity: 'warn', message: `${unexpected.length} unexpected file(s): ${unexpected.join(', ')}`, path: unexpected.join(', ') });
  }

  if (harness.kind === 'copilot') {
    const projectPrompts = path.join(projectRoot, '.github', 'prompts');
    if (fs.existsSync(projectPrompts)) {
      const overrides = expected
        .filter(e => path.dirname(e.dest) === harness.base)
        .filter(e => fs.existsSync(path.join(projectPrompts, path.basename(e.dest))))
        .map(e => path.basename(e.dest));
      if (overrides.length > 0) {
        records.push({ section, name: 'project-override', severity: 'warn', message: `project-local Copilot override(s) present: ${overrides.join(', ')}` });
      }
    }
  }

  return records;
}

function readGeneratedBy(skillMdPath) {
  let text;
  try { text = fs.readFileSync(skillMdPath, 'utf8'); } catch { return null; }
  const m = text.match(/^generatedBy:\s*["']?([^"'\n]+?)["']?\s*$/m);
  return m ? m[1].trim() : null;
}

function openspecCliVersion(execOpenspec) {
  try {
    const r = execOpenspec(['--version']);
    if (!r || r.error || r.status !== 0 || !r.stdout) return null;
    const m = String(r.stdout).match(/\d+\.\d+\.\d+/);
    return m ? m[0] : null;
  } catch { return null; }
}

function checkSkillStaleness({ projectRoot, execOpenspec }) {
  const section = '[OpenSpec skills]';
  const roots = [
    path.join(projectRoot, '.claude', 'skills'),
    path.join(projectRoot, '.opencode', 'skills'),
    path.join(projectRoot, '.github', 'skills'),
  ];
  const skills = [];
  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
      if (entry.isDirectory() && entry.name.startsWith('openspec-')) {
        skills.push({ name: entry.name, md: path.join(root, entry.name, 'SKILL.md') });
      }
    }
  }
  if (skills.length === 0) {
    return [{ section, name: 'skills', severity: 'ok', message: 'nothing to check — no project-local OpenSpec skills installed' }];
  }
  const cliVersion = openspecCliVersion(execOpenspec);
  if (cliVersion === null) {
    return [{ section, name: 'skills', severity: 'warn', message: 'OpenSpec CLI version unavailable — staleness indeterminate' }];
  }
  const records = [];
  for (const s of skills) {
    const gen = readGeneratedBy(s.md);
    if (gen === null) {
      records.push({ section, name: s.name, severity: 'warn', message: `generatedBy could not be read for ${s.name}` });
    } else if (gen !== cliVersion) {
      records.push({ section, name: s.name, severity: 'warn', message: `${s.name} generatedBy ${gen} != CLI ${cliVersion}`, recommendation: 'Re-run: openspec init' });
    } else {
      records.push({ section, name: s.name, severity: 'ok', message: `${s.name} current (${gen})` });
    }
  }
  return records;
}

function sectionObjFromRecords(sectionName, allRecords) {
  const sectionRecords = allRecords.filter(r => r.section === sectionName);
  if (sectionName === '[Project health]' || sectionName === '[OpenSpec skills]') {
    return sectionRecords;
  }
  const obj = {};
  for (const r of sectionRecords) {
    const key = r.name;
    if (key === 'detection' && r.message === 'not installed (user-global dir absent)') {
      obj.notInstalled = true;
      continue;
    }
    if (!obj[key]) obj[key] = [];
    obj[key].push(r);
  }
  return obj;
}

function defaultFetchLatestVersion(timeoutMs = 5000) {
  return new Promise((resolve) => {
    const req = https.get(
      'https://raw.githubusercontent.com/mmadariaga/shared-ai/main/package.json',
      { headers: { 'User-Agent': 'shared-ai-doctor' } },
      (res) => {
        if (res.statusCode !== 200) { res.resume(); return resolve(null); }
        let data = '';
        res.on('data', (c) => { data += c; });
        res.on('end', () => {
          try { resolve(JSON.parse(data).version || null); } catch { resolve(null); }
        });
      });
    req.on('error', () => resolve(null));
    req.setTimeout(timeoutMs, () => { req.destroy(); resolve(null); });
  });
}

function readMarker(base) {
  const p = path.join(base, '.version');
  try { return fs.readFileSync(p, 'utf8').trim() || null; } catch { return null; }
}

function diffAgainstBundled(expectedEntries) {
  const drift = [];
  for (const e of expectedEntries.filter(x => x.src !== x.dest)) {
    const destHash = uninstall.sha256File(e.dest);
    if (destHash === null) { drift.push(`${shorten(e.dest)} (missing)`); continue; }
    const srcHash = uninstall.sha256File(e.src);
    if (srcHash !== null && srcHash !== destHash) drift.push(`${shorten(e.dest)} (differs)`);
  }
  return drift;
}

function versionSkewRecords(harness, expectedEntries, latest) {
  const section = `[${harness.id}]`;
  const markerBase = harness.kind === 'copilot' ? harness.copilotSaiBase : harness.base;
  const marker = readMarker(markerBase);
  if (marker !== null) {
    if (latest === null) {
      return [{ section, name: 'version', severity: 'warn', message: `installed ${marker}; latest version unknown (network)` }];
    }
    return marker === latest
      ? [{ section, name: 'version', severity: 'ok', message: `up to date (${marker})` }]
      : [{ section, name: 'version', severity: 'warn', message: `version skew: installed ${marker}, latest ${latest}`, recommendation: 'Re-run the installer to update' }];
  }
  const drift = diffAgainstBundled(expectedEntries);
  return drift.length === 0
    ? [{ section, name: 'version', severity: 'ok', message: 'no .version marker; installed files match bundled source' }]
    : [{ section, name: 'version', severity: 'warn', message: `no .version marker; ${drift.length} file(s) differ from bundled source: ${drift.join(', ')}`, recommendation: 'Re-run the installer to normalize' }];
}

async function main(options = {}) {
  const {
    argv = process.argv.slice(2),
    projectRoot = process.cwd(),
    claudeBase = flow.CLAUDE_BASE,
    opencodeBase = flow.OPENCODE_BASE,
    copilot = { promptsBase: flow.COPILOT_PROMPTS_BASE, skillsBase: flow.COPILOT_SKILLS_BASE, agentsBase: flow.COPILOT_AGENTS_BASE, saiBase: flow.COPILOT_SAI_BASE },
    repoRoot = REPO_ROOT_DEFAULT,
    execOpenspec = defaultExecOpenspec,
    out = process.stdout,
    fetchLatestVersion = defaultFetchLatestVersion,
  } = options;
  const json = argv.includes('--json');

  const records = [];
  records.push(...checkProjectHealth({ projectRoot, execOpenspec }));

  const latest = argv.includes('--offline') ? null : await fetchLatestVersion();
  const harnesses = detectHarnesses({ claudeBase, opencodeBase, copilot });
  for (const h of harnesses) {
    if (!h.base || !fs.existsSync(h.base)) {
      records.push({ section: `[${h.id}]`, name: 'detection', severity: 'ok', message: 'not installed (user-global dir absent)' });
      continue;
    }
    const entries = h.entries();
    const sectionRecords = inventoryHarness(`[${h.id}]`, entries, { projectRoot, harness: h });
    sectionRecords.push(...fetchResolutionRecords(h, entries, { projectRoot }));
    sectionRecords.push(...versionSkewRecords(h, entries, latest));
    records.push(...sectionRecords);
  }

  records.push(...checkSkillStaleness({ projectRoot, execOpenspec }));

  const sections = groupSections(records);
  const code = aggregateExit(records);

  if (json) {
    const obj = {};
    for (const { section } of sections) {
      obj[section] = sectionObjFromRecords(section, records);
    }
    out.write(JSON.stringify(obj, null, 2) + '\n');
  } else {
    out.write(renderHuman(sections) + '\n');
  }
  return code;
}

module.exports = { main, checkProjectHealth, aggregateExit, groupSections, renderHuman, shorten, detectHarnesses, inventoryHarness, parseFetchRefs, resolveFetchRefs, fetchResolutionRecords, checkSkillStaleness, readGeneratedBy, readMarker, diffAgainstBundled, versionSkewRecords, defaultFetchLatestVersion };
