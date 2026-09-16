#!/usr/bin/env node

'use strict';

/**
 * check-cited-paths — deterministic cited-path existence checker.
 *
 * Fails fast on hallucinated file paths cited in planning artifacts instead
 * of surfacing them mid-apply. One binary, three hooks: hard verdict in the
 * sai-1/sai-2 workers, finding-mapped report mode in the explore review-loop.
 *
 * Extraction covers designated sections only, to avoid false positives from
 * inline examples:
 *   - `### Local files` sections (proposal, design, tasks Required Documentation)
 *   - `**Files Affected**` entries (tasks.md steps, with A/M/D/R prefix)
 *   - `### Precise file locations` sections (where present)
 *   - `interfaces.md` spec-anchor paths (`**Test assertions**` backticked paths)
 *
 * Semantics:
 *   - sai-1 (spec evidence): every extracted path must exist (E1).
 *   - sai-2 (design plan): `A` paths may be absent; `M`/`D`/`R` and all
 *     unprefixed evidence paths must exist (E2).
 *   - Rename (`R <src> -> <dst>`): the origin must exist, the destination may
 *     be absent; both missing is an error (E3).
 *   - Paths outside designated sections are never checked (E4).
 *   - Report mode (`--findings`) reuses the same binary read-only and maps
 *     each violation to a `High` artifact-review finding (E5).
 *   - On a miss the tool suggests basename candidates but never rewrites the
 *     artifact (E6 / no auto-fix).
 *
 * The tool is read-only: no artifact writes, no auto-fix.
 *
 * Usage:
 *   node sai/tools/check-cited-paths.js <sai-1|sai-2> <change-name> [--json]
 *     [--findings] [--root <dir>] [--change-dir <dir>]
 *
 * Exit codes: 0 = all cited paths resolve (or report emitted in --findings
 * mode); 1 = missing/unresolvable paths found (blocking modes only);
 * 2 = usage or I/O error.
 */

const fs = require('fs');
const path = require('path');

class ToolError extends Error {
  constructor(message, code = 2) {
    super(message);
    this.code = code;
  }
}

function usage() {
  return [
    'Usage: node sai/tools/check-cited-paths.js <sai-1|sai-2> <change-name> [--json] [--findings] [--root <dir>] [--cwd <dir>] [--change-dir <dir>]',
    '',
    '  <sai-1|sai-2>     Evidence mode: sai-1 requires every cited path to',
    '                     exist; sai-2 lets `A` paths stay absent while `M`/`D`/`R`',
    '                     and unprefixed paths must exist.',
    '  <change-name>     OpenSpec change whose artifacts are checked.',
    '  --json            Emit the report as JSON on stdout.',
    '  --findings        Report mode for the explore review-loop: emit violations',
    '                     as an artifact-review findings block (High) and exit 0',
    '                     when the report itself was produced.',
    '  --root <dir>      Project root for path resolution (default: repository',
    '                     containing sai/).',
    '  --cwd <dir>       Alias for --root (same semantics); later flag wins.',
    '  --change-dir <dir>  Change directory holding the artifacts (default:',
    '                     <root>/openspec/changes/<name>).',
  ].join('\n');
}

function parseArgs(argv) {
  const opts = { mode: null, name: null, json: false, findings: false, root: null, changeDir: null, help: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--json') opts.json = true;
    else if (arg === '--findings') opts.findings = true;
    else if (arg === '--help' || arg === '-h') opts.help = true;
    else if (arg === '--root') opts.root = argv[++i];
    else if (arg === '--cwd') opts.root = argv[++i];
    else if (arg === '--change-dir') opts.changeDir = argv[++i];
    else if (arg.startsWith('--')) return { error: `unknown flag: ${arg}` };
    else if (opts.mode === null) opts.mode = arg;
    else if (opts.name === null) opts.name = arg;
    else return { error: `unexpected positional argument: ${arg}` };
  }
  return { opts };
}

/** Normalize separators; keep the value repo-relative and posix-style. */
function normalizeSeparators(raw) {
  return raw.replace(/\\/g, '/').trim();
}

/** True for URLs and out-of-root references: never checked against disk. */
function isUnresolvable(raw) {
  const v = raw.trim();
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(v)) return true;
  if (/^[a-zA-Z]:[\\/]/.test(v)) return true;
  if (v.startsWith('/') || v.startsWith('~/')) return true;
  if (v === '..' || v.startsWith('../') || v.startsWith('..\\')) return true;
  return false;
}

/** Strip bullet/quote/backtick noise around a candidate path token. */
function cleanToken(raw) {
  let v = raw.trim();
  v = v.replace(/^[-*+]\s+/, '');
  v = v.replace(/^["'`]+|["'`.,;:]+$/g, '');
  v = v.replace(/[.,;:]+$/, '');
  return v.trim();
}

/** A token looks like a repo path when it has a slash plus a file extension.
 * Extensionless slash tokens count only under known top-level prefixes
 * (they may be directories); anything else (e.g. `a/b` prose) is noise. */
function looksLikePath(token) {
  const v = cleanToken(token);
  if (!v || v === 'None' || v.includes(' ')) return false;
  if (isUnresolvable(v)) return true;
  if (/^[A-Za-z0-9_.@-]+(\/[A-Za-z0-9_.@-]+)+\.[A-Za-z0-9]+$/.test(v)) return true;
  if (/^(sai|test|openspec|commands|agents|skills|configs|bin|sai-state|src|server|api|services|web|client|app|pages|migrations|prisma|scripts|infra|terraform|k8s|docs)(\/[A-Za-z0-9_.@-]+)+\/?$/.test(v)) return true;
  if (/^(\.opencode|\.claude)(\/[A-Za-z0-9_.@-]+)+\/?$/.test(v)) return true;
  if (/^[A-Za-z0-9_.-]+\.[A-Za-z0-9]+$/.test(v) && !/^(None|All|Some)$/i.test(v)) return true;
  return false;
}

/**
 * Extract path-like tokens from a free-text line: backticked spans first,
 * then bare slash-bearing tokens.
 */
function extractPathsFromText(line) {
  const out = [];
  const seen = new Set();
  const backticked = line.match(/`([^`]+)`/g) || [];
  for (const span of backticked) {
    const inner = span.slice(1, -1).trim();
    const first = inner.split(/\s+/)[0];
    if (first && looksLikePath(first) && !seen.has(first)) {
      seen.add(first);
      out.push(first);
    }
  }
  const bare = line.match(/[A-Za-z0-9_.@-]+(?:\/[A-Za-z0-9_.@-]+)+(?:\.[A-Za-z0-9]+)?\/?/g) || [];
  for (const token of bare) {
    const cleaned = cleanToken(token);
    if (cleaned && looksLikePath(cleaned) && !seen.has(cleaned)) {
      seen.add(cleaned);
      out.push(cleaned);
    }
  }
  return out;
}

function isHeading(line, level) {
  return new RegExp(`^#{1,${level}}\\s+`).test(line.trim());
}

/**
 * Collect designated-section citations from one artifact file.
 * Returns [{cited, kind, line}] where kind is A|M|D|R|EVIDENCE.
 */
function collectFromContent(content, fileLabel) {
  const out = [];
  const lines = content.split('\n');
  const isInterfaces = fileLabel.endsWith('interfaces.md');
  let inLocalFiles = false;
  let inPreciseLocations = false;
  let inFilesAffected = false;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i].replace(/\r$/, '');
    const trimmed = raw.trim();

    if (/^#{1,3}\s+Local files\s*$/i.test(trimmed)) {
      inLocalFiles = true;
      inPreciseLocations = false;
      inFilesAffected = false;
      continue;
    }
    if (/^#{1,3}\s+Precise file locations\s*$/i.test(trimmed)) {
      inPreciseLocations = true;
      inLocalFiles = false;
      inFilesAffected = false;
      continue;
    }
    if (/^#{1,3}\s+/.test(trimmed) && (inLocalFiles || inPreciseLocations)) {
      inLocalFiles = false;
      inPreciseLocations = false;
    }
    if (/\*\*Files Affected\*\*/.test(raw)) {
      inFilesAffected = true;
      const after = raw.slice(raw.indexOf('**Files Affected**') + '**Files Affected**'.length).replace(/^:\s*/, '');
      parseFilesAffectedLine(after, i + 1, out);
      continue;
    }
    if (inFilesAffected) {
      if (/^\*\*\S/.test(trimmed) || /^##\s+/.test(trimmed)) {
        inFilesAffected = false;
      } else if (trimmed !== '') {
        parseFilesAffectedLine(raw, i + 1, out);
        continue;
      } else {
        continue;
      }
    }

    if (inLocalFiles || inPreciseLocations) {
      if (trimmed === '' || /^None\b/i.test(trimmed)) continue;
      if (/^#{1,3}\s+/.test(trimmed)) continue;
      const beforeNote = raw.split(' — ')[0].split(' -- ')[0];
      const cleaned = cleanToken(beforeNote);
      if (cleaned && looksLikePath(cleaned)) {
        out.push({ cited: cleaned, kind: 'EVIDENCE', line: i + 1 });
      }
      continue;
    }

    if (isInterfaces && /\*\*Test assertions\*\*/.test(raw)) {
      for (const p of extractPathsFromText(raw)) {
        out.push({ cited: p, kind: 'EVIDENCE', line: i + 1 });
      }
    }
  }
  return out;
}

/** Parse one Files Affected line into A/M/D/R citations. */
function parseFilesAffectedLine(text, lineNum, out) {
  let v = text.trim().replace(/^[-*+]\s+/, '');
  if (!v || /^None\b/i.test(v)) return;
  const m = v.match(/^([AMDR])\s+(.+)$/);
  if (!m) return;
  const kind = m[1];
  const rest = m[2].trim();
  if (kind === 'R') {
    const parts = rest.split(/\s+->\s+/);
    if (parts.length === 2) {
      const src = cleanToken(parts[0]);
      const dst = cleanToken(parts[1].replace(/\s*\(.*\)\s*$/, ''));
      if (src) out.push({ cited: src, kind: 'R-src', line: lineNum });
      if (dst) out.push({ cited: dst, kind: 'R-dst', line: lineNum });
    } else if (rest) {
      out.push({ cited: cleanToken(rest), kind: 'R-src', line: lineNum });
    }
    return;
  }
  const bare = cleanToken(rest.replace(/\s*\(.*\)\s*$/, ''));
  if (bare && looksLikePath(bare)) out.push({ cited: bare, kind, line: lineNum });
}

function listFilesRecursive(dir, maxFiles = 5000) {
  const out = [];
  const stack = [dir];
  const skip = new Set(['.git', 'node_modules', '.opencode', '.claude', '.stryker-tmp']);
  while (stack.length > 0 && out.length < maxFiles) {
    const cur = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(cur, { withFileTypes: true });
    } catch (err) {
      continue;
    }
    for (const e of entries) {
      if (skip.has(e.name)) continue;
      const full = path.join(cur, e.name);
      if (e.isDirectory()) stack.push(full);
      else if (e.isFile()) {
        out.push(full);
        if (out.length >= maxFiles) break;
      }
    }
  }
  return out;
}

let candidateIndex = null;

/** Suggest up to 3 repo-relative candidates sharing the cited basename. */
function suggestCandidates(root, cited) {
  const base = normalizeSeparators(cited).split('/').pop();
  if (!base) return [];
  if (!candidateIndex) {
    candidateIndex = listFilesRecursive(root).map((f) => path.relative(root, f).split(path.sep).join('/'));
  }
  const matches = candidateIndex.filter((p) => p.split('/').pop().toLowerCase() === base.toLowerCase());
  matches.sort((a, b) => {
    if (a.length !== b.length) return a.length - b.length;
    return a < b ? -1 : a > b ? 1 : 0;
  });
  return matches.slice(0, 3);
}

function existsUnderRoot(root, normalized) {
  const target = path.resolve(root, normalized);
  const rel = path.relative(root, target);
  if (rel === '' || rel.startsWith('..') || path.isAbsolute(rel)) return false;
  try {
    const st = fs.statSync(target);
    return st.isFile() || st.isDirectory();
  } catch (err) {
    return false;
  }
}

/** Shorthand fallback: `specs/…` or bare `proposal.md` resolve inside the change dir. */
function existsUnderChangeDir(changeDir, normalized) {
  try {
    const st = fs.statSync(path.join(changeDir, normalized));
    return st.isFile() || st.isDirectory();
  } catch (err) {
    return false;
  }
}

/** A cited path resolves when it exists under the repo root or as change-relative shorthand. */
function citedExists(root, changeDir, normalized) {
  return existsUnderRoot(root, normalized) || existsUnderChangeDir(changeDir, normalized);
}

function collectArtifactFiles(mode, changeDir) {
  const files = [];
  if (mode === 'sai-1') {
    const proposal = path.join(changeDir, 'proposal.md');
    if (fs.existsSync(proposal)) files.push(proposal);
    const specsRoot = path.join(changeDir, 'specs');
    if (fs.existsSync(specsRoot)) {
      const stack = [specsRoot];
      while (stack.length > 0) {
        const cur = stack.pop();
        for (const e of fs.readdirSync(cur, { withFileTypes: true })) {
          const full = path.join(cur, e.name);
          if (e.isDirectory()) stack.push(full);
          else if (e.isFile() && e.name.endsWith('.md')) files.push(full);
        }
      }
    }
  } else {
    for (const name of ['design.md', 'tasks.md', 'interfaces.md']) {
      const full = path.join(changeDir, name);
      if (fs.existsSync(full)) files.push(full);
    }
  }
  files.sort();
  return files;
}

function checkChange(mode, root, changeDir) {
  const files = collectArtifactFiles(mode, changeDir);
  const violations = [];
  let checkedPaths = 0;

  for (const file of files) {
    let content;
    try {
      content = fs.readFileSync(file, 'utf8');
    } catch (err) {
      throw new ToolError(`cannot read artifact: ${file}`);
    }
    const rel = path.relative(root, file).split(path.sep).join('/') || file;
    const citations = collectFromContent(content, rel);

    for (const c of citations) {
      const normalized = normalizeSeparators(c.cited);
      if (isUnresolvable(c.cited)) {
        checkedPaths += 1;
        violations.push({
          file: rel,
          line: c.line,
          cited: c.cited,
          normalized,
          kind: c.kind.startsWith('R-') ? 'R' : c.kind,
          problem: 'UNRESOLVABLE_PATH',
          detail: 'path is a URL or out-of-root reference and cannot be checked against disk',
          candidates: [],
        });
        continue;
      }
      if (mode === 'sai-2' && (c.kind === 'A' || c.kind === 'R-dst')) continue;
      if (c.kind === 'R-src') {
        checkedPaths += 1;
        if (!citedExists(root, changeDir, normalized)) {
          violations.push({
            file: rel,
            line: c.line,
            cited: c.cited,
            normalized,
            kind: 'R',
            problem: 'RENAME_ORIGIN_MISSING',
            detail: 'rename origin must exist while the destination may be absent',
            candidates: suggestCandidates(root, normalized),
          });
        }
        continue;
      }
      checkedPaths += 1;
      if (!citedExists(root, changeDir, normalized)) {
        violations.push({
          file: rel,
          line: c.line,
          cited: c.cited,
          normalized,
          kind: c.kind,
          problem: mode === 'sai-1' ? 'EVIDENCE_PATH_MISSING' : 'PLANNED_PATH_MISSING',
          detail: mode === 'sai-1'
            ? 'cited evidence path does not exist'
            : 'planned path with prefix M/D/R must exist (A may be absent)',
          candidates: suggestCandidates(root, normalized),
        });
      }
    }
  }
  return { files, checkedPaths, violations };
}

/** Format violations as an artifact-review findings block (all High). */
function formatFindings(violations) {
  const lines = [];
  violations.forEach((v, idx) => {
    const id = `H${idx + 1}`;
    const candidateText = v.candidates.length > 0
      ? ` Did you mean ${v.candidates.join(', ')}?`
      : ' No same-basename candidate found.';
    lines.push(`- Identifier: ${id}`);
    lines.push(`- Severity: High`);
    lines.push(`- Artifact location: ${v.file}:${v.line}`);
    lines.push(`- Issue: cited path '${v.cited}' does not exist [${v.problem}].`);
    lines.push(`- Recommended correction: fix the cited path to the existing location.${candidateText} Never auto-substituted; the worker or person decides.`);
    lines.push('');
  });
  lines.push(`Summary: High=${violations.length} Medium=0 Low=0`);
  return lines.join('\n');
}

function main(argv) {
  const parsed = parseArgs(argv);
  if (parsed.error) {
    process.stderr.write(`${parsed.error}\n${usage()}\n`);
    return 2;
  }
  const { opts } = parsed;
  if (opts.help) {
    process.stdout.write(`${usage()}\n`);
    return 0;
  }
  if (opts.mode !== 'sai-1' && opts.mode !== 'sai-2') {
    process.stderr.write(`mode required: sai-1 or sai-2.\n${usage()}\n`);
    return 2;
  }
  if (!opts.name && !opts.changeDir) {
    process.stderr.write(`change name required.\n${usage()}\n`);
    return 2;
  }
  if (opts.json && opts.findings) {
    process.stderr.write(`--json and --findings are mutually exclusive.\n${usage()}\n`);
    return 2;
  }

  const root = opts.root ? path.resolve(opts.root) : path.resolve(__dirname, '..', '..');
  const changeDir = opts.changeDir
    ? path.resolve(opts.changeDir)
    : path.join(root, 'openspec', 'changes', opts.name);

  try {
    const st = fs.statSync(changeDir);
    if (!st.isDirectory()) {
      process.stderr.write(`change directory not found: ${changeDir}\n`);
      return 2;
    }
  } catch (err) {
    process.stderr.write(`change directory not found: ${changeDir}\n`);
    return 2;
  }

  let result;
  try {
    result = checkChange(opts.mode, root, changeDir);
  } catch (err) {
    if (err instanceof ToolError) {
      process.stderr.write(`${err.message}\n`);
      return err.code;
    }
    process.stderr.write(`${err.message}\n`);
    return 2;
  }

  const ok = result.violations.length === 0;
  const changeName = opts.name || path.basename(changeDir);

  if (opts.findings) {
    process.stdout.write(`${formatFindings(result.violations)}\n`);
    return 0;
  }

  if (opts.json) {
    process.stdout.write(`${JSON.stringify({
      ok,
      mode: opts.mode,
      change: changeName,
      checkedFiles: result.files.map((f) => path.relative(root, f).split(path.sep).join('/')),
      checkedPaths: result.checkedPaths,
      violations: result.violations,
    }, null, 2)}\n`);
  } else if (ok) {
    process.stdout.write(
      `cited-path check passed for change '${changeName}' (${opts.mode}): ${result.checkedPaths} path(s) across ${result.files.length} file(s), no missing paths.\n`,
    );
  } else {
    for (const v of result.violations) {
      const candidates = v.candidates.length > 0 ? ` (candidate: ${v.candidates.join(', ')})` : '';
      process.stdout.write(
        `${v.file}:${v.line} [${v.problem}] '${v.cited}' — ${v.detail}.${candidates}\n`,
      );
    }
    process.stdout.write(
      `cited-path check FAILED for change '${changeName}' (${opts.mode}): ${result.violations.length} missing path(s).\n`,
    );
  }
  return ok ? 0 : 1;
}

module.exports = {
  checkChange,
  collectFromContent,
  normalizeSeparators,
  suggestCandidates,
  formatFindings,
  usage,
};

if (require.main === module) {
  process.exitCode = main(process.argv.slice(2));
}
