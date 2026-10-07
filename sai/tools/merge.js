#!/usr/bin/env node
'use strict';

// Mechanical evidence only. Git mutations and semantic decisions stay with the caller.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { performance } = require('node:perf_hooks');
const { validateText, parsePayloadText } = require('./worker-report-validator');

// Section libraries, sliced per stage as [library, start heading, end heading].
// The coordinator runs the mechanical stages; the worker owns the judgment stages.
const LIBRARIES = { stages: 'coordinator-stages.md', presentation: 'presentation.md', instructions: 'instructions.md' };
const SIDES = ['instructions', '## Sides', '## Gate trips'];
const PROVENANCE = ['instructions', '### Merge provenance', '### Step 6:'];
const MESSAGES = ['stages', '## Informative messages', null];
const STAGES = {
  preflight: { owner: 'coordinator', facts: 'preflight', slices: [['presentation', '# Merge Presentation Seam', '## Preflight texts'],
    ['stages', '## Stage: preflight', '## Stage: conflicts'], ['presentation', '## Preflight texts', '## Conflict texts']] },
  conflicts: { owner: 'coordinator', facts: 'conflicts', slices: [['stages', '## Stage: conflicts', '## Stage: verify'],
    ['presentation', '## Conflict texts', '## Verification texts']] },
  verify: { owner: 'coordinator', facts: 'verify', slices: [['stages', '## Stage: verify', '## Stage: collision'],
    ['presentation', '## Verification texts', '## Collision texts']] },
  collision: { owner: 'coordinator', facts: 'collision', slices: [['stages', '## Stage: collision', '## Stage: final'],
    ['presentation', '## Collision texts', '## Final texts']] },
  final: { owner: 'coordinator', facts: 'status', slices: [['stages', '## Stage: final', '## Informative messages'], MESSAGES,
    ['presentation', '## Final texts', null]] },
  messages: { owner: 'coordinator', slices: [MESSAGES] },
  strategy: { owner: 'worker', slices: [['instructions', '## Sides', '#### Writing the resolution']] },
  apply: { owner: 'worker', slices: [['instructions', '#### Writing the resolution', '### Step 8:']] },
  'test-correction': { owner: 'worker', slices: [['instructions', '### Step 8:', '### Step 9:']] },
  'renumbering-plan': { owner: 'worker', slices: [SIDES, PROVENANCE, ['instructions', '### Step 9:', null]] },
};
const RECORD = /^docs\/(adr|ddr)\/(\d{4})([a-z]*)-(.+)\.md$/;
const MARKER = /^(<{7,}|={7,}|>{7,}|\|{7,})(?: .*)?\r?$/m;
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const split0 = value => value.split('\0').filter(Boolean);
const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;

function git(cwd, args, optional = false) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (result.error || result.status !== 0 && !optional) {
    throw new Error(`git ${args[0]}: ${result.error?.message || result.stderr.trim() || `exit ${result.status}`}`);
  }
  return result.status === 0 ? result.stdout : null;
}

function localPath(cwd, name) {
  if (typeof name !== 'string' || !name || name.includes('\0') || name.includes('\\') || path.isAbsolute(name)
      || name.split('/').some(part => part === '..' || part === '.git')) throw new Error(`unsafe repository path: ${name}`);
  const resolved = path.resolve(cwd, name);
  const relative = path.relative(cwd, resolved);
  if (relative.startsWith('..' + path.sep) || relative === '..') throw new Error(`outside repository: ${name}`);
  // Refuse traversal through symlinked directories. Symlink files are hashed, never followed.
  let parent = path.dirname(resolved);
  while (parent !== cwd) {
    if (fs.existsSync(parent) && fs.lstatSync(parent).isSymbolicLink()) throw new Error(`symlink directory: ${name}`);
    parent = path.dirname(parent);
  }
  return resolved;
}

function fileState(cwd, name) {
  const filename = localPath(cwd, name);
  try {
    const stat = fs.lstatSync(filename);
    if (stat.isSymbolicLink()) return { type: 'symlink', hash: hash(fs.readlinkSync(filename)) };
    if (stat.isDirectory()) return { type: 'directory', hash: directoryHash(filename) };
    return { type: 'file', mode: stat.mode & 0o777, hash: hash(fs.readFileSync(filename)) };
  } catch (error) {
    if (error.code === 'ENOENT') return { type: 'absent' };
    throw error;
  }
}

function directoryHash(directory) {
  // Gitlinks can contain files not enumerated by the parent index. Hash their
  // content rather than treating an unchanged directory entry as valid evidence.
  const entries = fs.readdirSync(directory).filter(name => name !== '.git').sort(compare).map(name => {
    const filename = path.join(directory, name); const stat = fs.lstatSync(filename);
    if (stat.isSymbolicLink()) return [name, 'symlink', hash(fs.readlinkSync(filename))];
    if (stat.isDirectory()) return [name, 'directory', directoryHash(filename)];
    return [name, 'file', stat.mode & 0o777, hash(fs.readFileSync(filename))];
  });
  return hash(JSON.stringify(entries));
}

function operations(cwd) {
  const result = {};
  for (const name of ['MERGE_HEAD', 'REBASE_HEAD', 'rebase-merge', 'rebase-apply']) {
    const filename = git(cwd, ['rev-parse', '--git-path', name]).trim();
    const absolute = path.resolve(cwd, filename);
    result[name] = fs.existsSync(absolute)
      ? fs.statSync(absolute).isDirectory() ? 'present' : hash(fs.readFileSync(absolute)) : null;
  }
  return result;
}

function state(cwd, dependencies) {
  const result = { repository: git(cwd, ['rev-parse', '--show-toplevel']).trim() };
  // Native resolution expands Windows 8.3 aliases (e.g. RUNNER~1); the JS
  // realpath implementation can retain them even when Git returns the long name.
  const cwdRoot = fs.realpathSync.native(cwd);
  const repositoryRoot = fs.realpathSync.native(result.repository);
  if (path.relative(cwdRoot, repositoryRoot) !== '') throw new Error(`--cwd must be the repository root (cwd: ${cwdRoot}; git root: ${repositoryRoot})`);
  for (const dependency of dependencies) {
    if (dependency === 'head') result.head = git(cwd, ['rev-parse', '--verify', 'HEAD']).trim();
    else if (dependency === 'index') result.index = hash(git(cwd, ['ls-files', '--stage', '-z']));
    else if (dependency === 'refs') result.refs = hash(git(cwd, ['for-each-ref', '--format=%(refname)%00%(objectname)', 'refs/heads/', 'refs/remotes/']));
    else if (dependency === 'operations') result.operations = operations(cwd);
    else if (dependency === 'tree') {
      const names = [...new Set(split0(git(cwd, ['ls-files', '-c', '-o', '--exclude-standard', '-z'])))].sort(compare);
      result.tree = hash(JSON.stringify(names.map(name => [name, fileState(cwd, name)])));
    } else if (dependency.startsWith('path:')) result[dependency] = fileState(cwd, dependency.slice(5));
    else throw new Error(`unknown dependency: ${dependency}`);
  }
  return result;
}

function fact(cwd, action, dependencies, collect) {
  const before = state(cwd, dependencies);
  const data = collect();
  const after = state(cwd, dependencies);
  if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error(`${action}: state changed during collection; recapture`);
  return { version: 1, action, outcome: 'success', dependencies, state: after, data };
}

function valid(cwd, receipt) {
  if (receipt?.version !== 1 || !Array.isArray(receipt.dependencies) || !receipt.state) {
    return { outcome: 'failure', changed_dependencies: ['receipt'] };
  }
  const current = state(cwd, receipt.dependencies);
  const changed = [...new Set([...Object.keys(current), ...Object.keys(receipt.state)])]
    .filter(key => JSON.stringify(current[key]) !== JSON.stringify(receipt.state[key]));
  return { outcome: changed.length ? 'failure' : 'success', changed_dependencies: changed };
}

function inProgress(cwd) {
  const op = operations(cwd);
  return { merge_in_progress: op.MERGE_HEAD !== null,
    rebase_in_progress: op.REBASE_HEAD !== null || op['rebase-merge'] !== null || op['rebase-apply'] !== null };
}

// Closing facts: what is staged, what is still unmerged, and where HEAD stands.
function status(cwd) {
  return fact(cwd, 'status', ['head', 'index', 'operations'], () => ({
    head: git(cwd, ['rev-parse', '--verify', 'HEAD']).trim(),
    head_subject: git(cwd, ['log', '-1', '--format=%s']).trim(),
    current_branch: git(cwd, ['rev-parse', '--abbrev-ref', 'HEAD']).trim(),
    staged: split0(git(cwd, ['diff', '--cached', '--name-only', '-z'])).sort(compare),
    unmerged: split0(git(cwd, ['diff', '--name-only', '--diff-filter=U', '-z'])).sort(compare),
    ...inProgress(cwd) }));
}

function preflight(cwd) {
  return fact(cwd, 'preflight', ['head', 'index', 'refs', 'operations', 'tree'], () => {
    const entries = split0(git(cwd, ['status', '--porcelain=v1', '-z']));
    const dirty = [];
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      dirty.push({ status: entry.slice(0, 2), path: entry.slice(3),
        ...(entry.slice(0, 2).match(/[RC]/) ? { original_path: entries[++i] } : {}) });
    }
    const candidates = git(cwd, ['branch', '--no-merged', 'HEAD', '--format=%(refname:short)%00%(committerdate:iso-strict)'])
      .trimEnd().split('\n').filter(Boolean).map(line => {
        const [name, timestamp] = line.split('\0');
        return { name, timestamp };
      }).sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp) || compare(a.name, b.name));
    return { current_branch: git(cwd, ['rev-parse', '--abbrev-ref', 'HEAD']).trim(), dirty, candidates, ...inProgress(cwd) };
  });
}

function nameStatus(cwd, args) {
  const fields = split0(git(cwd, ['diff', '--name-status', '-z', ...args]));
  const entries = [];
  for (let i = 0; i < fields.length;) {
    const status = fields[i++];
    const name = fields[i++];
    if (!name) throw new Error('incomplete name-status output');
    if (/^[RC]/.test(status)) entries.push({ status, original_path: name, path: fields[i++] });
    else entries.push({ status, path: name });
  }
  return entries;
}

function provenance(cwd, sourceRef, method, squash) {
  if (!/^refs\/(heads|remotes\/origin)\/.+/.test(sourceRef) || sourceRef.includes('\0')) throw new Error('full branch source_ref required');
  if (!['merge', 'rebase'].includes(method) || !['yes', 'no', 'not-applicable'].includes(squash)
      || method === 'merge' && squash !== 'not-applicable' || method === 'rebase' && squash === 'not-applicable') throw new Error('invalid method/squash');
  // One call validates the exact ref before capturing: format, existence, commit.
  git(cwd, ['check-ref-format', sourceRef]);
  git(cwd, ['show-ref', '--verify', '--quiet', sourceRef]);
  return fact(cwd, 'provenance', ['head', 'refs', 'index', 'operations'], () => {
    const targetSha = git(cwd, ['rev-parse', '--verify', 'HEAD']).trim();
    const sourceSha = git(cwd, ['rev-parse', '--verify', `${sourceRef}^{commit}`]).trim();
    const base = git(cwd, ['merge-base', targetSha, sourceSha]).trim();
    const added = nameStatus(cwd, ['--diff-filter=A', '--find-renames', '--find-copies', '--find-copies-harder', base, sourceSha, '--', 'docs/adr/', 'docs/ddr/']);
    const rules = sha => nameStatus(cwd, ['--diff-filter=AM', base, sha, '--', 'openspec/specs/', 'docs/adr/', 'docs/ddr/']).map(item => item.path);
    return { target_sha: targetSha, source_ref: sourceRef, source_sha: sourceSha, merge_base: base, method, squash,
      source_introduced_records: added.filter(item => item.status === 'A' && RECORD.test(item.path)
        && !/\/0000-INDEX\.md$/.test(item.path)).map(item => item.path),
      target_rules: rules(targetSha), source_rules: rules(sourceSha) };
  });
}

// Offsets are bytes (latin1 gives one JS character per byte), including marker lines.
function regions(bytes) {
  const text = bytes.toString('latin1');
  const lines = [...text.matchAll(/[^\n]*\n|[^\n]+$/g)];
  const result = [];
  let start = null;
  let width = 0;
  let separator = false;
  let ancestor = false;
  for (const line of lines) {
    const value = line[0].replace(/\r?\n$/, '');
    const marker = /^(<{7,}|={7,}|>{7,}|\|{7,})(?: .*)?$/.exec(value);
    if (!marker) continue;
    const token = marker[1];
    if (token[0] === '<') {
      if (start !== null) throw new Error('nested conflict markers');
      start = line.index; width = token.length; separator = false; ancestor = false;
    } else if (start === null || token.length !== width) throw new Error('malformed conflict markers');
    else if (token[0] === '|') {
      if (ancestor || separator) throw new Error('malformed ancestor marker');
      ancestor = true;
    } else if (token[0] === '=') {
      if (separator) throw new Error('duplicate separator');
      separator = true;
    } else {
      if (!separator) throw new Error('missing separator');
      result.push({ start, end: line.index + line[0].length }); start = null;
    }
  }
  if (start !== null) throw new Error('unterminated conflict');
  return result;
}

// The sides Git wrote between one region's markers, as latin1 (one character per byte).
function regionSides(bytes, region) {
  const body = bytes.subarray(region.start, region.end).toString('latin1');
  const lines = [...body.matchAll(/[^\n]*\n|[^\n]+$/g)];
  const start = lines[0][0].length;
  const ancestor = lines.find(line => /^\|{7,}(?: |\r?\n|$)/.test(line[0]));
  const separator = lines.find(line => /^={7,}\r?(?:\n|$)/.test(line[0]));
  const finish = lines[lines.length - 1].index;
  if (!separator) throw new Error('missing captured separator');
  return { ours: body.slice(start, ancestor?.index ?? separator.index),
    base: ancestor ? body.slice(ancestor.index + ancestor[0].length, separator.index) : null,
    theirs: body.slice(separator.index + separator[0].length, finish) };
}

function stageSplice(file, stage) {
  const bytes = Buffer.from(file.before, 'base64');
  const parts = []; let cursor = 0;
  for (const region of file.regions) {
    const sides = regionSides(bytes, region);
    parts.push(bytes.subarray(cursor, region.start), Buffer.from(stage === 2 ? sides.ours : sides.theirs, 'latin1')); cursor = region.end;
  }
  parts.push(bytes.subarray(cursor));
  return Buffer.concat(parts);
}

function conflicts(cwd) {
  const names = split0(git(cwd, ['diff', '--name-only', '--diff-filter=U', '-z'])).sort(compare);
  return fact(cwd, 'conflicts', ['head', 'index', 'operations', 'tree', 'path:openspec', ...names.map(name => `path:${name}`)], () => {
    const hasSpecs = fs.existsSync(path.join(cwd, 'openspec'));
    const index = split0(git(cwd, ['ls-files', '--unmerged', '--stage', '-z'])).map(entry => {
      const match = /^(\d+) ([0-9a-f]+) ([123])\t([\s\S]+)$/.exec(entry);
      if (!match) throw new Error('invalid unmerged index entry');
      return { mode: match[1], oid: match[2], stage: Number(match[3]), path: match[4] };
    });
    const inventory = [...new Set(split0(git(cwd, ['ls-files', '-c', '-o', '--exclude-standard', '-z'])))].sort(compare);
    const categoryOf = name => /^(docs\/adr|docs\/ddr)\//.test(name) ? 'adr-ddr' : hasSpecs && name.startsWith('openspec/') ? 'specs' : 'code';
    const categories = { specs: 0, 'adr-ddr': 0, code: 0 };
    for (const name of names) categories[categoryOf(name)]++;
    return { categories, operation: inProgress(cwd), unrelated: Object.fromEntries(inventory.filter(name => !names.includes(name)).map(name => [name, fileState(cwd, name)])), files: names.map(name => {
      const type = fileState(cwd, name).type;
      const bytes = type === 'file' ? fs.readFileSync(localPath(cwd, name)) : null;
      const category = categoryOf(name);
      const file = { path: name, category, type, before: bytes?.toString('base64') ?? null,
        regions: bytes ? regions(bytes).map((region, i) => ({ ...region, conflict_id: `${category}:${name}#${i + 1}` })) : [],
        stages: index.filter(item => item.path === name) };
      file.stage_checkout_preserves_combined_content = {};
      for (const stage of file.stages.filter(item => item.stage !== 1)) {
        if (!file.regions.length) { file.stage_checkout_preserves_combined_content[stage.stage] = true; continue; }
        const blob = spawnSync('git', ['cat-file', 'blob', stage.oid], { cwd, maxBuffer: 64 * 1024 * 1024 });
        if (blob.status !== 0) throw new Error(`cannot read captured stage: ${name}`);
        file.stage_checkout_preserves_combined_content[stage.stage] = blob.stdout.equals(stageSplice(file, stage.stage));
      }
      return file;
    }) };
  });
}

function correction(cwd, authorized) {
  if (!Array.isArray(authorized) || !authorized.length) throw new Error('complete authorized correction region inventory required');
  const names = authorized.map(item => item.path);
  if (new Set(names).size !== names.length) throw new Error('duplicate correction path');
  return fact(cwd, 'conflicts', ['head', 'index', 'operations', 'tree', ...names.map(name => `path:${name}`)], () => {
    const inventory = [...new Set(split0(git(cwd, ['ls-files', '-c', '-o', '--exclude-standard', '-z'])))].sort(compare);
    return { correction: true, unrelated: Object.fromEntries(inventory.filter(name => !names.includes(name)).map(name => [name, fileState(cwd, name)])),
      files: authorized.map(item => {
        if (fileState(cwd, item.path).type !== 'file' || !['specs', 'adr-ddr', 'code'].includes(item.category)
            || !Array.isArray(item.regions) || !item.regions.length) throw new Error('invalid correction file');
        const before = fs.readFileSync(localPath(cwd, item.path));
        if (hash(before) !== item.before_hash) throw new Error(`correction preimage changed: ${item.path}`);
        let end = 0;
        const ids = new Set();
        for (const region of item.regions) {
          if (!Number.isInteger(region.start) || !Number.isInteger(region.end) || region.start < end
              || region.end < region.start || region.end > before.length || typeof region.conflict_id !== 'string'
              || !region.conflict_id.startsWith(`${item.category}:${item.path}#`) || ids.has(region.conflict_id)) throw new Error('invalid correction region');
          end = region.end; ids.add(region.conflict_id);
        }
        return { path: item.path, category: item.category, type: 'file', before: before.toString('base64'), regions: item.regions, stages: [] };
      }) };
  });
}

// How a file stores its text. Only UTF-8 (with or without BOM) is determined
// safely; anything else admits a whole-side choice only.
function textProfile(bytes) {
  const text = bytes.toString('latin1');
  // A conflict on the first line puts Git's opening marker before the BOM.
  let encoding = /^(?:<{7,}[^\n]*\n)?\xEF\xBB\xBF/.test(text) ? 'utf-8-bom' : 'utf-8';
  if (bytes.includes(0)) encoding = 'undetermined';
  else try { new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch { encoding = 'undetermined'; }
  const crlf = (text.match(/\r\n/g) || []).length;
  const lf = (text.match(/\n/g) || []).length - crlf;
  return { encoding, eol: crlf > lf ? 'crlf' : lf ? 'lf' : null };
}

// Resolved text as the bytes the file stores at byte offset `start`: the
// pre-write snapshot decides the line endings and whether the file opens with a
// BOM. The write and the resolution check share this, so they agree on every byte.
function storedBytes(before, text, start) {
  const { encoding, eol } = textProfile(before);
  if (encoding === 'undetermined') return Buffer.from(text);
  let value = text.replace(/^﻿/, '');
  if (eol) value = value.replace(/\r\n/g, '\n');
  if (eol === 'crlf') value = value.replace(/\n/g, '\r\n');
  return Buffer.from((encoding === 'utf-8-bom' && start === 0 ? '﻿' : '') + value);
}

// The pre-write snapshot with the given regions replaced; the others keep their captured bytes.
function spliced(file, texts) {
  const before = Buffer.from(file.before, 'base64');
  const parts = []; let cursor = 0;
  for (const region of file.regions) {
    if (!Object.hasOwn(texts, region.conflict_id)) continue;
    parts.push(before.subarray(cursor, region.start), storedBytes(before, texts[region.conflict_id], region.start)); cursor = region.end;
  }
  parts.push(before.subarray(cursor));
  return Buffer.concat(parts);
}

function snapshotStale(cwd, snapshot) {
  if (snapshot?.action !== 'conflicts' || snapshot.version !== 1 || !Array.isArray(snapshot.data?.files)) throw new Error('complete conflict snapshot required');
  // Writes may change captured paths, but HEAD, index and operation identity must remain fixed until checkout/staging.
  const immutableDependencies = snapshot.dependencies.filter(dep => !dep.startsWith('path:') && dep !== 'tree');
  const immutable = { ...snapshot, dependencies: immutableDependencies,
    state: Object.fromEntries(Object.entries(snapshot.state).filter(([key]) => key === 'repository' || immutableDependencies.includes(key))) };
  return valid(cwd, immutable).outcome !== 'success';
}

const decodeUtf8 = value => {
  try { return new TextDecoder('utf-8', { fatal: true }).decode(typeof value === 'string' ? Buffer.from(value, 'latin1') : value); } catch { return null; }
};
const lineList = text => [...text.matchAll(/[^\n]*\n|[^\n]+$/g)].map(line => line[0]);

// Base lines matching the ours lines [a, b), through the zero-context hunks of base -> ours.
function baseRange(hunks, a, b) {
  const at = (x, end) => {
    let shift = 0;
    for (const h of hunks) {
      const newEnd = h.newStart + h.newCount;
      if (newEnd < x || newEnd === x && (h.newCount > 0 || end)) shift += h.oldCount - h.newCount;
      else if (h.newStart < x) return end ? h.oldStart + h.oldCount : h.oldStart;
      else break;
    }
    return x + shift;
  };
  return [at(a, false), at(b, true)];
}

function sideCommits(cwd, range, name) {
  const limit = 20;
  const entries = git(cwd, ['log', '--format=%H%x00%s%x00%b%x1e', '-n', String(limit + 1), ...range, '--', name]).split('\x1e')
    .map(entry => entry.replace(/^\n/, '')).filter(Boolean).map(entry => {
      const [sha, subject, body = ''] = entry.split('\0');
      const trimmed = body.trim();
      return { sha: sha.slice(0, 12), subject, body: trimmed.length > 2000 ? trimmed.slice(0, 2000) + '\n[truncated]' : trimmed };
    });
  return { messages: entries.slice(0, limit), more: entries.length > limit };
}

// The conflict bundle: everything the worker needs to decide a resolution,
// built from the captured snapshot. `ours` / `theirs` are Git's stages 2 / 3.
function bundle(cwd, snapshot, context = 3) {
  if (!Number.isInteger(context) || context < 0 || context > 20) throw new Error('--context takes 0 to 20 lines');
  if (snapshotStale(cwd, snapshot)) throw new Error('conflict snapshot HEAD/index/operation is stale; recapture');
  if (snapshot.data.correction) throw new Error('bundle requires a conflicts snapshot, not a correction snapshot');
  const rev = name => git(cwd, ['rev-parse', '--verify', '--quiet', `${name}^{commit}`], true)?.trim() || null;
  const merging = rev('MERGE_HEAD');
  const other = merging || rev('REBASE_HEAD') || rev('CHERRY_PICK_HEAD');
  const base = other && (git(cwd, ['merge-base', 'HEAD', other], true)?.trim() || null);
  const blob = oid => {
    const run = spawnSync('git', ['cat-file', 'blob', oid], { cwd, maxBuffer: 64 * 1024 * 1024 });
    if (run.status !== 0) throw new Error(`cannot read captured stage: ${oid}`);
    return run.stdout;
  };
  const files = snapshot.data.files.map(file => {
    const bytes = file.before === null ? null : Buffer.from(file.before, 'base64');
    const present = file.stages.map(item => item.stage);
    const profile = bytes && textProfile(bytes);
    let kind;
    if (file.regions.length) kind = profile.encoding === 'undetermined' ? 'encoding-undetermined' : 'text';
    else if (present.includes(1) && present.length === 2) kind = 'deleted-on-one-side';
    else if (present.length === 1) kind = 'renamed';
    else kind = bytes?.subarray(0, 8000).includes(0) ? 'binary' : 'no-markers';
    const entry = { path: file.path, category: file.category, conflict_category: kind,
      resolution: kind === 'text' ? 'regions-or-whole-side' : 'whole-side-only',
      sides_present: { base: present.includes(1), ours: present.includes(2), theirs: present.includes(3) },
      whole_side_preserves_combined_content: file.stage_checkout_preserves_combined_content,
      commits: { ours: sideCommits(cwd, base ? [`${base}..HEAD`] : ['HEAD'], file.path),
        theirs: other ? sideCommits(cwd, merging && base ? [`${base}..${other}`] : merging ? [other] : [`${other}^!`], file.path) : null },
      regions: [] };
    if (kind !== 'text') return entry;
    entry.encoding = profile.encoding; entry.eol = profile.eol;
    const oid = stage => file.stages.find(item => item.stage === stage)?.oid;
    let mapping;
    const derived = (a, b) => {
      if (!oid(1) || !oid(2)) return null;
      if (!mapping) {
        const diff = git(cwd, ['diff', '--no-color', '--no-ext-diff', '--no-textconv', '-U0', oid(1), oid(2)], true);
        if (diff === null) return null;
        const hunks = [...diff.matchAll(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/gm)].map(match => {
          const oldCount = Number(match[2] ?? 1); const newCount = Number(match[4] ?? 1);
          // With a zero count, Git names the line before the gap; otherwise the first line (1-based).
          return { oldStart: Number(match[1]) - (oldCount ? 1 : 0), oldCount, newStart: Number(match[3]) - (newCount ? 1 : 0), newCount };
        });
        mapping = { hunks, lines: lineList(blob(oid(1)).toString('latin1')) };
      }
      const [low, high] = baseRange(mapping.hunks, a, b);
      return low < 0 || high < low || high > mapping.lines.length ? null : decodeUtf8(mapping.lines.slice(low, high).join(''));
    };
    let cursor = 0; let oursLine = 0; let line = 1;
    file.regions.forEach((region, i) => {
      const gap = lineList(bytes.subarray(cursor, region.start).toString('latin1'));
      const sides = regionSides(bytes, region);
      const next = file.regions[i + 1]?.start ?? bytes.length;
      const count = lineList(sides.ours).length;
      oursLine += gap.length; line += gap.length;
      const mapped = sides.base === null ? derived(oursLine, oursLine + count) : null;
      entry.regions.push({ conflict_id: region.conflict_id, start_line: line,
        ours: decodeUtf8(sides.ours), theirs: decodeUtf8(sides.theirs),
        base: sides.base === null ? mapped : decodeUtf8(sides.base),
        // `markers`: Git wrote the ancestor between the markers. `mapped`: derived from the base blob by line alignment with ours.
        base_from: sides.base !== null ? 'markers' : mapped === null ? 'unavailable' : 'mapped',
        context_before: decodeUtf8(context ? gap.slice(-context).join('') : ''),
        context_after: decodeUtf8(lineList(bytes.subarray(region.end, next).toString('latin1')).slice(0, context).join('')) });
      oursLine += count; line += lineList(bytes.subarray(region.start, region.end).toString('latin1')).length; cursor = region.end;
    });
    return entry;
  });
  return { version: 1, action: 'bundle', outcome: 'success', data: { context_lines: context,
    sides: { ours: git(cwd, ['rev-parse', '--verify', 'HEAD']).trim(), theirs: other, merge_base: base }, files } };
}

// Tool-owned resolution write. All-or-nothing: a rejection writes nothing. The
// ledger beside the snapshot record holds every text placed so far, so each
// call rebuilds the file from the protected pre-write content.
function write(cwd, snapshot, recordFile, input) {
  const writes = Array.isArray(input) ? input : [input];
  if (!writes.length) throw new Error('at least one {conflict_id, text} required');
  const errors = [];
  if (snapshotStale(cwd, snapshot)) errors.push('conflict snapshot HEAD/index/operation is stale');
  const ledgerFile = `${recordFile}.writes.json`;
  const ledger = fs.existsSync(ledgerFile) ? JSON.parse(fs.readFileSync(ledgerFile, 'utf8')) : {};
  const texts = { ...ledger };
  const touched = new Map();
  for (const item of writes) {
    const id = item?.conflict_id;
    const file = typeof id === 'string' && snapshot.data.files.find(entry => entry.regions.some(region => region.conflict_id === id));
    if (!file) errors.push(`unknown region: ${id}`);
    else if (typeof item.text !== 'string') errors.push(`text required: ${id}`);
    else if (MARKER.test(item.text)) errors.push(`conflict markers in text: ${id}`);
    else if (textProfile(Buffer.from(file.before, 'base64')).encoding === 'undetermined') errors.push(`encoding undetermined; whole-side choice only: ${file.path}`);
    else { texts[id] = item.text; touched.set(file.path, [...(touched.get(file.path) || []), id]); }
  }
  const outputs = [];
  for (const [name, ids] of touched) {
    const file = snapshot.data.files.find(entry => entry.path === name);
    const current = fileState(cwd, name);
    if (current.type !== 'file' || current.hash !== hash(spliced(file, ledger))) errors.push(`file changed outside the tool: ${name}`);
    else outputs.push({ file, ids, bytes: spliced(file, texts) });
  }
  if (errors.length) return { version: 1, action: 'write', outcome: 'failure', errors, written: [] };
  for (const output of outputs) fs.writeFileSync(localPath(cwd, output.file.path), output.bytes);
  fs.writeFileSync(ledgerFile, JSON.stringify(texts), { mode: 0o600 });
  return { version: 1, action: 'write', outcome: 'success', errors: [], written: outputs.map(({ file, ids, bytes }) => ({ path: file.path,
    conflict_ids: ids, ...textProfile(Buffer.from(file.before, 'base64')), hash: hash(bytes),
    pending: file.regions.map(region => region.conflict_id).filter(id => !Object.hasOwn(texts, id)) })) };
}

function resolutionFromSource(source) {
  const verdict = validateText(source, 'terminal');
  if (!verdict.ok) throw new Error(verdict.errors.join('; '));
  const outer = parsePayloadText(source).payload;
  if (outer.status !== 'completed') throw new Error('resolution requires original completed worker result');
  const marker = '## Complete resolution payload';
  const start = outer.summary.indexOf(marker);
  if (start < 0 || outer.summary.indexOf(marker, start + marker.length) >= 0) throw new Error('one resolution payload heading required');
  let text = outer.summary.slice(start + marker.length).trimStart();
  if (text.startsWith('```json')) text = text.slice(7).trimStart();
  else if (text.startsWith('```')) text = text.slice(3).trimStart();
  if (text[0] !== '{') throw new Error('resolution JSON object required');
  // Find the object's end without transforming the source or discarding envelope fields.
  let depth = 0; let quoted = false; let escaped = false; let end = -1;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === '"') quoted = false;
    } else if (c === '"') quoted = true;
    else if (c === '{') depth++;
    else if (c === '}' && --depth === 0) { end = i + 1; break; }
  }
  if (end < 0) throw new Error('unterminated resolution object');
  const tail = text.slice(end).trimStart().replace(/^```\s*/, '');
  if (tail.trim() && !tail.startsWith('## ')) throw new Error('extra resolution content');
  return { outer, payload: JSON.parse(text.slice(0, end)), source_hash: hash(source) };
}

function checkResolution(cwd, snapshot, source, confirmed, phase = 'authored') {
  const { payload, outer, source_hash: sourceHash } = resolutionFromSource(source);
  const errors = [];
  if (snapshotStale(cwd, snapshot)) errors.push('conflict snapshot HEAD/index/operation is stale');
  const files = snapshot.data.files;
  if (!snapshot.data.unrelated) throw new Error('complete unrelated-content inventory required');
  const inventory = [...new Set(split0(git(cwd, ['ls-files', '-c', '-o', '--exclude-standard', '-z'])))];
  for (const name of new Set([...inventory, ...Object.keys(snapshot.data.unrelated)])) {
    if (files.some(file => file.path === name)) continue;
    if (JSON.stringify(fileState(cwd, name)) !== JSON.stringify(snapshot.data.unrelated[name])) errors.push(`unrelated content changed: ${name}`);
  }
  if (!Array.isArray(payload.files) || !Array.isArray(payload.selected_contextual_decisions) || !Array.isArray(confirmed)) throw new Error('complete payload and confirmed semantic decisions required');
  const expectedDecisions = new Map();
  for (const item of confirmed) {
    if (!item || !['ours', 'theirs', 'synthesis'].includes(item.decision) || typeof item.conflict_id !== 'string'
        || expectedDecisions.has(item.conflict_id)
        || !files.some(file => file.regions.length ? file.regions.some(region => region.conflict_id === item.conflict_id)
          : `${file.category}:${file.path}#1` === item.conflict_id)) errors.push('invalid confirmed semantic decision inventory');
    else expectedDecisions.set(item.conflict_id, item.decision);
  }
  const actualDecisions = new Map();
  for (const item of payload.selected_contextual_decisions) {
    if (!item || typeof item.conflict_id !== 'string' || !expectedDecisions.has(item.conflict_id)
        || actualDecisions.has(item.conflict_id) || expectedDecisions.get(item.conflict_id) !== item.decision) errors.push('semantic decision does not match confirmation');
    else actualDecisions.set(item.conflict_id, item.decision);
  }
  if (actualDecisions.size !== expectedDecisions.size) errors.push('incomplete semantic decisions');
  const seen = new Set();
  for (const item of payload.files) {
    const original = files.find(file => file.path === item?.path);
    if (!original || seen.has(item.path)) { errors.push(`unexpected/duplicate file: ${item?.path}`); continue; }
    seen.add(item.path);
    if (item.category !== original.category || !['git-ours', 'git-theirs', 'authored'].includes(item.source)
        || !Array.isArray(item.regions) || !Array.isArray(item.decisions)) { errors.push(`invalid record: ${item.path}`); continue; }
    const perFile = confirmed.filter(entry => entry.conflict_id.startsWith(`${item.category}:${item.path}#`));
    const fileIds = new Set();
    if (item.decisions.length !== perFile.length || item.decisions.some(entry => {
      if (!entry || fileIds.has(entry.conflict_id)) return true;
      fileIds.add(entry.conflict_id);
      return !perFile.some(expected => entry.conflict_id === expected.conflict_id && entry.decision === expected.decision);
    })) errors.push(`file decisions mismatch: ${item.path}`);
    if (item.source === 'authored') {
      if (original.type !== 'file' || !original.regions.length || item.regions.length !== original.regions.length) { errors.push(`incomplete authored regions: ${item.path}`); continue; }
      const before = Buffer.from(original.before, 'base64');
      const parts = []; let cursor = 0;
      for (let i = 0; i < original.regions.length; i++) {
        const region = original.regions[i]; const replacement = item.regions[i];
        if (replacement?.conflict_id !== region.conflict_id || typeof replacement.text !== 'string' || MARKER.test(replacement.text)
            || /^(diff --git |@@ |--- |\+\+\+ )/m.test(replacement.text)) { errors.push(`invalid region: ${region.conflict_id}`); continue; }
        parts.push(before.subarray(cursor, region.start), storedBytes(before, replacement.text, region.start)); cursor = region.end;
      }
      parts.push(before.subarray(cursor));
      const actual = fileState(cwd, item.path);
      if (actual.type !== 'file' || hash(Buffer.concat(parts)) !== actual.hash
          || actual.mode !== snapshot.state[`path:${item.path}`].mode) errors.push(`content outside regions or resolution differs: ${item.path}`);
      if (!outer.changed_files.includes(item.path)) errors.push(`authored path not reported: ${item.path}`);
    } else {
      if (item.regions.length) errors.push(`git-sourced regions must be empty: ${item.path}`);
      const chosenDecision = item.source === 'git-ours' ? 'ours' : 'theirs';
      if (perFile.some(entry => entry.decision !== chosenDecision)) errors.push(`git source contradicts confirmed decision: ${item.path}`);
      const stage = original.stages.find(entry => entry.stage === (item.source === 'git-ours' ? 2 : 3));
      if (!stage) errors.push(`selected stage absent; explicit coordinator deletion/escalation required: ${item.path}`);
      if (stage && original.regions.length && !original.stage_checkout_preserves_combined_content?.[stage.stage]) {
        errors.push(`whole-stage checkout discards Git-combined content; use authored region splices: ${item.path}`);
      }
      const actual = fileState(cwd, item.path);
      if (phase === 'authored') {
        if (JSON.stringify(actual) !== JSON.stringify(snapshot.state[`path:${item.path}`])) errors.push(`worker changed git-sourced file: ${item.path}`);
      } else if (stage) {
        const blob = spawnSync('git', ['cat-file', 'blob', stage.oid], { cwd, maxBuffer: 64 * 1024 * 1024 });
        if (blob.status !== 0 || actual.type !== (stage.mode === '120000' ? 'symlink' : 'file')
            || actual.type === 'file' && Boolean(actual.mode & 0o111) !== (stage.mode === '100755')
            || actual.hash !== hash(blob.stdout)) errors.push(`checkout differs from captured stage: ${item.path}`);
      }
    }
  }
  if (seen.size !== files.length) errors.push('incomplete affected file inventory');
  return { outcome: errors.length ? 'failure' : 'success', source_hash: sourceHash, errors, checked_files: [...seen] };
}

const METADATA = ['package.json', 'pnpm-lock.yaml', 'yarn.lock', 'Cargo.toml', 'go.mod', 'pyproject.toml', 'setup.py', 'setup.cfg', 'Makefile', 'mix.exs', 'pom.xml', 'build.gradle'];

// .NET markers have no fixed name: every *.sln at the root or one level below,
// else every *.csproj at the root.
function dotnetMarkers(cwd) {
  const list = directory => fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => compare(a.name, b.name));
  const named = (entries, extension) => entries.filter(entry => entry.isFile() && entry.name.toLowerCase().endsWith(extension)).map(entry => entry.name);
  const root = list(cwd);
  const solutions = [...named(root, '.sln'), ...root.filter(entry => entry.isDirectory() && !entry.name.startsWith('.'))
    .flatMap(directory => named(list(path.join(cwd, directory.name)), '.sln').map(name => `${directory.name}/${name}`))];
  return solutions.length ? solutions : named(root, '.csproj');
}

function suite(cwd) {
  const markers = dotnetMarkers(cwd);
  return fact(cwd, 'suite', [...METADATA, ...markers].map(name => `path:${name}`), () => {
    const exists = name => fs.existsSync(localPath(cwd, name));
    if (exists('package.json')) {
      const pkg = JSON.parse(fs.readFileSync(localPath(cwd, 'package.json'), 'utf8'));
      if (pkg.scripts?.test) {
        const manager = pkg.packageManager?.split('@')[0] || (exists('pnpm-lock.yaml') ? 'pnpm' : exists('yarn.lock') ? 'yarn' : 'npm');
        if (!['npm', 'pnpm', 'yarn'].includes(manager)) throw new Error(`unsupported package manager: ${manager}`);
        return { command: [manager, 'test'] };
      }
    }
    const options = [['Cargo.toml', ['cargo', 'test']], ['go.mod', ['go', 'test', './...']],
      ['pyproject.toml', ['pytest']], ['setup.py', ['pytest']], ['setup.cfg', ['pytest']],
      ['Makefile', ['make', 'test']], ['mix.exs', ['mix', 'test']], ['pom.xml', ['mvn', 'test']], ['build.gradle', ['gradle', 'test']]];
    const listed = options.find(([filename]) => exists(filename))?.[1];
    if (listed || !markers.length) return { command: listed || null };
    // Several candidates give no single target to test: report them instead of choosing one.
    return markers.length === 1 ? { command: ['dotnet', 'test', markers[0]] } : { command: null, ambiguous: markers };
  });
}

function collision(cwd, captured) {
  const provenanceData = captured?.data;
  if (captured?.action !== 'provenance' || !Array.isArray(provenanceData?.source_introduced_records)) throw new Error('captured provenance required');
  const receipt = fact(cwd, 'collision', ['head', 'index', 'operations', 'tree'], () => {
    if (operations(cwd)['rebase-merge'] || operations(cwd)['rebase-apply']) return { applicability: 'not-applicable', reason: 'rebase-in-progress; defer until finished' };
    if (split0(git(cwd, ['diff', '--name-only', '--diff-filter=U', '-z'])).length) throw new Error('collision pass requires the final resolved integration state');
    if (!provenanceData.source_introduced_records.length) return { applicability: 'not-applicable', reason: 'no-source-introduced-records', groups: [] };
    const names = [...new Set(split0(git(cwd, ['ls-files', '-z', '--', 'docs/adr/', 'docs/ddr/'])))].filter(name => RECORD.test(name) && !/\/0000-INDEX\.md$/.test(name));
    const missing = provenanceData.source_introduced_records.filter(name => !names.includes(name) || fileState(cwd, name).type === 'absent');
    if (missing.length) return { applicability: 'needs-judgment', reason: 'reconcile-survival-or-rename', paths: missing };
    const keys = new Set(provenanceData.source_introduced_records.map(name => { const match = RECORD.exec(name); return `${match[1]}:${match[2]}`; }));
    const groups = [...keys].sort(compare).map(key => ({ key, paths: names.filter(name => { const match = RECORD.exec(name); return `${match[1]}:${match[2]}` === key; }).sort(compare) }));
    return { applicability: groups.some(group => group.paths.length > 1) ? 'needs-judgment' : 'no-collision', groups };
  });
  if (receipt.data.applicability === 'not-applicable') receipt.outcome = 'not-applicable';
  return receipt;
}

// cmd.exe reports an unknown command with exit 1 and a localized message, so
// on Windows the command word is resolved against PATH instead.
const CMD_BUILTINS = ['call', 'cd', 'chdir', 'echo', 'for', 'if', 'pushd', 'rem', 'set', 'setlocal', 'type'];
function resolvable(cwd, line) {
  const match = /^\s*(?:"([^"]+)"|(\S+))/.exec(line);
  const word = match?.[1] || match?.[2];
  if (!word || CMD_BUILTINS.includes(word.toLowerCase())) return true;
  const extensions = ['', ...(process.env.PATHEXT || '.COM;.EXE;.BAT;.CMD').split(';').filter(Boolean)];
  const directories = /[\\/]/.test(word) ? [cwd] : [cwd, ...(process.env.PATH || process.env.Path || '').split(path.delimiter).filter(Boolean)];
  return directories.some(directory => extensions.some(extension => {
    try { return fs.statSync(path.resolve(directory, word + extension)).isFile(); } catch { return false; }
  }));
}

// The reason a command never started, or null when it ran: a run that started
// and exited non-zero is a test failure, not a start failure.
function startFailure(cwd, run, line, shell) {
  if (['ENOENT', 'EACCES', 'EPERM'].includes(run.error?.code)) return run.error.message;
  if (!shell || run.error || run.status === 0) return null;
  if (process.platform !== 'win32') return [126, 127].includes(run.status) ? `shell exit ${run.status}: command not found or not executable` : null;
  return run.status === 9009 || run.status === 1 && !resolvable(cwd, line) ? 'command not found on PATH' : null;
}

// `explicit` is the documented command line the coordinator fixed at run start;
// `fixed` is the suite receipt captured at run start. With neither, the marker
// list is read now.
function verify(cwd, explicit, fixed) {
  if (fixed && (fixed.action !== 'suite' || !fixed.data || !('command' in fixed.data))) throw new Error('captured suite receipt required');
  const detected = explicit ? null : fixed || suite(cwd);
  const chosen = explicit || detected.data.command;
  const dependencies = ['head', 'index', 'operations', 'tree'];
  const before = state(cwd, dependencies);
  const unavailable = (reason, current, data) => ({ version: 1, action: 'verify', outcome: 'not-applicable', dependencies,
    state: current, data: { verification_result: 'unavailable', unavailable_reason: reason, command: null, exit_code: null, test_ms: 0, ...data } });
  if (!chosen) {
    return detected.data.ambiguous
      ? unavailable('ambiguous-suite', before, { detail: `several .NET candidates: ${detected.data.ambiguous.join(', ')}` })
      : unavailable('no-suite', before);
  }
  const start = performance.now();
  const options = { cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, NODE_TEST_CONTEXT: undefined } };
  // A documented command is a shell line, and Windows package managers ship
  // .cmd shims, which need a shell too. The line comes only from the
  // coordinator's fixed choice or suite's allowlist, never from script content.
  const shell = Boolean(explicit) || process.platform === 'win32';
  const line = explicit || chosen.map(part => /[\s&|<>^()"]/.test(part) ? `"${part}"` : part).join(' ');
  const run = shell ? spawnSync(line, { ...options, shell: true, windowsHide: true }) : spawnSync(chosen[0], chosen.slice(1), options);
  const elapsed = performance.now() - start;
  const after = state(cwd, dependencies);
  const evidence = { command: chosen, command_source: explicit ? 'documented' : 'list', exit_code: run.status, signal: run.signal,
    error: run.error?.message || null, test_ms: elapsed, stdout: run.stdout || '', stderr: run.stderr || '' };
  const notStarted = startFailure(cwd, run, line, shell);
  if (notStarted) return unavailable('not-runnable', after, { ...evidence, detail: notStarted });
  const changed = JSON.stringify(before) !== JSON.stringify(after);
  const passed = run.status === 0 && !run.error && !changed;
  return { version: 1, action: 'verify', outcome: passed ? 'success' : 'failure', dependencies,
    state: after, data: { verification_result: passed ? 'passed' : 'failed', ...evidence, state_changed_during_run: changed } };
}

function instructions(stage, reconstruct = false) {
  // Own-property lookup: a stage name such as "constructor" is unknown, not inherited.
  if (!Object.hasOwn(STAGES, stage)) throw new Error(`unknown active stage: ${stage}`);
  const { owner, slices } = STAGES[stage];
  const directory = path.join(__dirname, '..', 'commands', 'merge');
  const library = {};
  const read = name => library[name] ??= fs.readFileSync(path.join(directory, LIBRARIES[name]), 'utf8').replace(/\r\n/g, '\n');
  const mechanics = fs.readFileSync(path.join(directory, 'mechanics.md'), 'utf8').replace(/\r\n/g, '\n');
  const common = mechanics.slice(mechanics.indexOf('## Evidence, not authority'), mechanics.indexOf('## Stage delivery')).trim();
  // A worker starting or replaced at a judgment point saw no earlier stage:
  // --reconstruct adds the common rules, the side mapping and the provenance definition.
  const rebuild = reconstruct && owner === 'worker';
  const slice = ([name, start, end]) => {
    const source = read(name);
    const from = source.indexOf(start); const to = end ? source.indexOf(end, from + start.length) : source.length;
    if (from < 0 || to < from) throw new Error(`missing instruction section: ${start}`);
    return source.slice(from, to).trim();
  };
  let body = slices.map(slice).join('\n\n');
  if (rebuild) body = [SIDES, PROVENANCE].filter(([, start]) => !body.includes(start)).map(slice).concat(body).join('\n\n');
  const lead = owner === 'worker'
    ? 'Execute only this disclosed stage. Return at its hand-off; the coordinator names the next stage. References to other steps identify destinations, not permission to execute them.'
    : 'Run this stage now and follow it to its exit. The lifecycle seam selects the next stage; references to other stages identify destinations, not text to act on yet.';
  return `# Active merge stage: ${stage}\n\n${lead}\n\n` + (rebuild ? common + '\n\n' : '') + body + '\n';
}

function saveReceipt(cwd, result, filename) {
  if (!filename) throw new Error('receipt requires --record (new file outside the repository)');
  filename = path.resolve(filename);
  const root = fs.realpathSync.native(git(cwd, ['rev-parse', '--show-toplevel']).trim());
  const relative = path.relative(root, fs.realpathSync.native(path.dirname(filename)));
  if (relative === '' || relative !== '..' && !relative.startsWith('..' + path.sep)) throw new Error('snapshot must be outside repository');
  fs.writeFileSync(filename, JSON.stringify(result), { flag: 'wx', mode: 0o600 });
  return { ...result, record: filename, record_hash: hash(fs.readFileSync(filename)) };
}

function saveSnapshot(cwd, result, filename) {
  const saved = saveReceipt(cwd, result, filename);
  return { ...saved,
    data: { correction: result.data.correction || false, ...(result.data.categories ? { categories: result.data.categories } : {}),
      ...(result.data.operation ? { operation: result.data.operation } : {}),
      files: result.data.files.map(({ before, ...file }) => file) } };
}

// One mechanical action, with its receipt recorded when --record is given.
function collect(action, cwd, opts, stdin) {
  let result;
  if (action === 'preflight') result = preflight(cwd);
  else if (action === 'status') result = status(cwd);
  else if (action === 'provenance') result = provenance(cwd, opts['source-ref'], opts.method, opts.squash);
  else if (action === 'conflicts') result = saveSnapshot(cwd, conflicts(cwd), opts.record);
  else if (action === 'correction') result = saveSnapshot(cwd, correction(cwd, stdin()), opts.record);
  else if (action === 'valid') result = valid(cwd, stdin());
  else if (action === 'suite') result = suite(cwd);
  else if (action === 'verify') {
    if (opts.command && opts.suite) throw new Error('verify takes --command or --suite, not both');
    let fixed;
    if (opts.suite) {
      const record = fs.readFileSync(opts.suite);
      if (!opts['suite-hash'] || hash(record) !== opts['suite-hash']) throw new Error('missing or changed suite record hash');
      fixed = JSON.parse(record);
    }
    result = verify(cwd, opts.command, fixed);
  }
  else if (action === 'collision') result = collision(cwd, stdin());
  else if (action === 'bundle' || action === 'write') {
    const record = fs.readFileSync(opts.record);
    if (!opts['record-hash'] || hash(record) !== opts['record-hash']) throw new Error('missing or changed snapshot hash');
    result = action === 'bundle' ? bundle(cwd, JSON.parse(record), opts.context === undefined ? 3 : Number(opts.context))
      : write(cwd, JSON.parse(record), path.resolve(opts.record), stdin());
  }
  else if (action === 'resolution') {
    if (!['authored', 'materialized'].includes(opts.phase || 'authored')) throw new Error('invalid resolution phase');
    const record = fs.readFileSync(opts.record);
    if (!opts['record-hash'] || hash(record) !== opts['record-hash']) throw new Error('missing or changed snapshot hash');
    result = checkResolution(cwd, JSON.parse(record), fs.readFileSync(opts.source, 'utf8'),
      JSON.parse(fs.readFileSync(opts.confirmed, 'utf8')), opts.phase || 'authored');
  } else throw new Error(`unknown action: ${action}`);
  if (opts.record && !['conflicts', 'correction', 'resolution', 'bundle', 'write'].includes(action)) {
    result = saveReceipt(cwd, result, opts.record);
    if (action === 'verify') {
      const { stdout, stderr, ...data } = result.data;
      result = { ...result, data: { ...data, output_ref: result.record,
        stdout_hash: hash(stdout || ''), stderr_hash: hash(stderr || '') } };
    }
  }
  return result;
}

// Composite stage entry for the coordinator: the stage text and its facts in one call.
function enter(stage, cwd, opts, stdin) {
  if (!Object.hasOwn(STAGES, stage) || !STAGES[stage].facts) throw new Error(`unknown coordinator stage: ${stage}`);
  const action = STAGES[stage].facts;
  if (['conflicts', 'verify', 'collision'].includes(action) && !opts.record) throw new Error(`stage ${stage} requires --record (new file outside the repository)`);
  const result = collect(action, cwd, opts, stdin);
  return { text: instructions(stage) + `\n## Stage facts\n\n\`\`\`json\n${JSON.stringify(result, null, 2)}\n\`\`\`\n`, result };
}

function main(argv) {
  const opts = { cwd: process.cwd() }; let action;
  const flags = ['cwd', 'source-ref', 'method', 'squash', 'record', 'record-hash', 'source', 'confirmed', 'phase', 'stage', 'command', 'suite', 'suite-hash', 'context'];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--json') continue;
    if (arg === '--reconstruct') { opts.reconstruct = true; continue; }
    if (arg === '--help') {
      process.stdout.write('Usage: node merge.js <enter|instructions|preflight|provenance|conflicts|correction|bundle|write|valid|resolution|suite|verify|collision|status> --cwd <root> [--json]\n'
        + 'enter: --stage preflight|conflicts|verify|collision|final [--record <external-new-file>] (coordinator stage text plus its facts; Markdown output)\n'
        + 'instructions: --stage strategy|apply|test-correction|renumbering-plan [--reconstruct] (worker stage text), or a coordinator stage or messages (text only; Markdown output)\n'
        + 'provenance: --source-ref <full-ref> --method merge|rebase --squash yes|no|not-applicable (validates the ref, then captures)\n'
        + 'valid/collision: receipt JSON on stdin; conflicts/correction: --record <external-new-file>; correction: authorized region inventory on stdin\n'
        + 'verify, enter --stage verify: --command <documented-test-command-line>, or --suite <suite-record-file> --suite-hash <sha256> (the outcome of `suite --record` captured at run start); with neither, the marker list is read now\n'
        + 'bundle: --record <snapshot-file> --record-hash <sha256> [--context <0-20 lines, default 3>] (each conflict region with its three versions, bounded context, the conflict category, and each side\'s commit messages)\n'
        + 'write: --record <snapshot-file> --record-hash <sha256>; {"conflict_id", "text"} or an array of them on stdin (splices resolved text keeping the file\'s encoding, BOM and line endings; a rejection writes nothing)\n'
        + 'resolution: --record <snapshot-file> --record-hash <sha256> --source <original-worker-result-file> --confirmed <decision-json-file> [--phase authored|materialized]\n'
        + 'Exit: 0 success/non-applicability; 1 failed assertion; 2 usage/collection error.\n');
      return 0;
    }
    if (arg.startsWith('--')) {
      const name = arg.slice(2);
      if (!flags.includes(name) || !argv[i + 1] || argv[i + 1].startsWith('--')) throw new Error(`invalid flag: ${arg}`);
      opts[name] = argv[++i];
    } else if (action) throw new Error(`unexpected argument: ${arg}`);
    else action = arg;
  }
  // Shells differ in how they pipe text: accept UTF-8 with or without BOM, and UTF-16 with BOM.
  const stdin = () => {
    const input = fs.readFileSync(0);
    const utf16 = input[0] === 0xFF && input[1] === 0xFE ? 'utf-16le' : input[0] === 0xFE && input[1] === 0xFF ? 'utf-16be' : null;
    return JSON.parse(new TextDecoder(utf16 || 'utf-8').decode(input));
  };
  if (action === 'instructions') { process.stdout.write(instructions(opts.stage, opts.reconstruct)); return 0; }
  const cwd = fs.realpathSync.native(opts.cwd);
  if (action === 'enter') {
    const entered = enter(opts.stage, cwd, opts, stdin);
    process.stdout.write(entered.text);
    return entered.result?.outcome === 'failure' ? 1 : 0;
  }
  const result = collect(action, cwd, opts, stdin);
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  return result.outcome === 'failure' ? 1 : 0;
}

if (require.main === module) {
  try { process.exitCode = main(process.argv.slice(2)); }
  catch (error) { process.stdout.write(JSON.stringify({ outcome: 'failure', error: error.message }) + '\n'); process.exitCode = 2; }
}
module.exports = { preflight, provenance, conflicts, correction, bundle, write, valid, regions, checkResolution, suite, verify, collision, status, instructions, enter, STAGES, state, main };
