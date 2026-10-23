'use strict';

// Deterministic inherent-risk signals for a change: the merge-base with a parent branch, the code fingerprint,
// and the floor of each rating that path, extension, and diff-size signals justify. The policy
// `sai/policies/inherent-risk.md` owns what the floors mean and how the rating levels are assigned over them.
// `validate` reads a stored ratings block and reports whether it still matches the current code.

const { execFileSync } = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const LEVELS = ['low', 'medium', 'high'];
// Pathspecs outside the measured code: the change artifacts and the learnings file a run promotes at close.
const EXCLUDE_ARTIFACTS = [':(exclude)openspec', ':(exclude)SAI_LEARNINGS.md'];
const EVIDENCE_PER_SIGNAL = 5;
const DEPENDENTS_PROBE_LIMIT = 12;
const SAFE_PATH = /^[\w./@+-]+$/;

// Size thresholds: [medium, high].
const THRESHOLDS = { files: [15, 50], lines: [400, 1500], dependents: [10, 30], deletedFiles: [1, 10] };

const word = names => new RegExp(`(^|[/._-])(${names.join('|')})([/._-]|$)`, 'i');

const TEST_OR_DOC = /(^|\/)(tests?|__tests__|specs?|docs?|fixtures)\/|\.(test|spec)\.[a-z0-9]+$|\.(md|mdx|txt|rst)$/i;
const SENSITIVE = word(['auth', 'authn', 'authz', 'authentication', 'authorization', 'oauth', 'oidc', 'saml', 'session', 'sessions', 'login', 'password', 'passwords', 'credential', 'credentials', 'secret', 'secrets', 'token', 'tokens', 'jwt', 'payment', 'payments', 'billing', 'checkout', 'crypto', 'permission', 'permissions', 'acl', 'rbac']);
const EXPOSED = word(['route', 'routes', 'router', 'controller', 'controllers', 'handler', 'handlers', 'endpoint', 'endpoints', 'middleware', 'graphql', 'resolver', 'resolvers', 'webhook', 'webhooks', 'upload', 'uploads', 'api']);
const USER_INPUT = /\breq\.(body|query|params|headers|cookies)\b|\brequest\.(args|form|json|GET|POST|data|files|body|query_params)\b|\$_(GET|POST|REQUEST|COOKIE|FILES)\b|@(Request|Path|Query)(Body|Param|Variable)\b|\[From(Body|Query|Form|Route)\]|\bgetParameter\(|\bctx\.(request|params|query)\b/;

const MIGRATION = /(^|\/)(migrations?|migrate|alembic|flyway|liquibase)\/|\.(sql|ddl|prisma)$|(^|\/)(schema\.rb|structure\.sql)$/i;
const INFRASTRUCTURE = /(^|\/)(\.github\/workflows|\.circleci|k8s|kubernetes|helm|charts|terraform|ansible)\/|(^|\/)(\.gitlab-ci\.ya?ml|azure-pipelines[^/]*\.ya?ml|Jenkinsfile|Chart\.ya?ml)$|(^|\/)(Dockerfile|docker-compose)[^/]*$|\.(tf|tfvars|bicep)$/i;
const DEPENDENCY = /(^|\/)(package(-lock)?\.json|yarn\.lock|pnpm-lock\.ya?ml|requirements[^/]*\.txt|Pipfile(\.lock)?|pyproject\.toml|poetry\.lock|go\.(mod|sum)|Cargo\.(toml|lock)|pom\.xml|build\.gradle(\.kts)?|packages\.config|Gemfile(\.lock)?|composer\.(json|lock))$|\.csproj$/i;

const BLOCK_START = '<!-- sai-inherent-risk:start -->';
const BLOCK_END = '<!-- sai-inherent-risk:end -->';
const RATING_ROWS = { Security: 'security', Reversibility: 'reversibility', 'Critical sections': 'critical_sections', 'Blast radius': 'blast_radius' };

const higher = (a, b) => (LEVELS.indexOf(b) > LEVELS.indexOf(a) ? b : a);
const bySize = (value, [medium, high]) => (value >= high ? 'high' : value >= medium ? 'medium' : 'low');

// Diff output feeds the fingerprint and the parsed file headers, so it must not depend on the user's git
// configuration: these pin every setting that changes the bytes of a plain `git diff`.
const DIFF_CONFIG = [
  'diff.noprefix=false', 'diff.mnemonicPrefix=false', 'diff.relative=false', 'diff.algorithm=myers',
  'diff.indentHeuristic=true', 'diff.context=3', 'diff.interHunkContext=0', 'diff.suppressBlankEmpty=false',
  `diff.orderFile=${process.platform === 'win32' ? 'NUL' : '/dev/null'}`, 'core.quotePath=false', 'color.ui=false',
].flatMap(setting => ['-c', setting]);

function git(cwd, args) {
  return execFileSync('git', [...DIFF_CONFIG, ...args], { cwd, encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'pipe'] });
}

// A diff header path is C-quoted when it holds a quote, a backslash, or a control character.
const ESCAPES = { a: 7, b: 8, t: 9, n: 10, v: 11, f: 12, r: 13, '"': 34, '\\': 92 };
function unquote(text) {
  if (!text.startsWith('"') || !text.endsWith('"')) return text;
  const bytes = [];
  const body = text.slice(1, -1);
  for (let index = 0; index < body.length; index++) {
    if (body[index] !== '\\') { bytes.push(...Buffer.from(body[index])); continue; }
    const octal = /^[0-7]{3}/.exec(body.slice(index + 1));
    if (octal) { bytes.push(parseInt(octal[0], 8)); index += 3; }
    else bytes.push(ESCAPES[body[++index]] ?? body.charCodeAt(index));
  }
  return Buffer.from(bytes).toString('utf8');
}

function checkedRef(value) {
  if (typeof value !== 'string' || !value || value.startsWith('-') || /[\s~^:?*\[\\]/.test(value) || value.includes('..') || value.includes('@{')) throw new Error('Invalid parent branch');
  return value;
}

// `--name-status -z` yields `<status>\0<path>\0` and, for a rename or copy, `<status>\0<old>\0<new>\0`.
function changedFiles(cwd, base) {
  const parts = git(cwd, ['diff', '--name-status', '-z', '-M', base, 'HEAD', '--', '.', ...EXCLUDE_ARTIFACTS]).split('\0');
  const files = [];
  for (let index = 0; index < parts.length - 1;) {
    const status = parts[index++];
    if (!status) continue;
    const pair = status[0] === 'R' || status[0] === 'C';
    const from = pair ? parts[index++] : null;
    files.push({ status: status[0], path: parts[index++], from });
  }
  return files;
}

function lineTotals(cwd, base) {
  let added = 0, deleted = 0;
  for (const row of git(cwd, ['diff', '--numstat', '-M', base, 'HEAD', '--', '.', ...EXCLUDE_ARTIFACTS]).split('\n')) {
    const [plus, minus] = row.split('\t');
    added += Number(plus) || 0;
    deleted += Number(minus) || 0;
  }
  return { added, deleted };
}

// Added lines with their new-file line numbers, read from the zero-context diff. A `+++ ` row is a file header
// only before the file's first hunk; inside a hunk it is an added line that starts with `++ `.
function* addedLines(cwd, base) {
  let file = null, line = 0, header = false;
  for (const row of git(cwd, ['diff', '-U0', '--no-color', '--no-ext-diff', '-M', base, 'HEAD', '--', '.', ...EXCLUDE_ARTIFACTS]).split('\n')) {
    if (row.startsWith('diff --git ')) { header = true; file = null; }
    else if (header && row.startsWith('+++ ')) {
      const target = unquote(row.slice(4));
      file = target.startsWith('b/') ? target.slice(2) : null;
    } else if (row.startsWith('@@')) { header = false; line = Number(/\+(\d+)/.exec(row)?.[1]) || 0; }
    else if (!header && row.startsWith('+') && file) yield { path: file, line: line++, text: row.slice(1) };
  }
}

// The Windows CodeGraph shim is a batch file, which only the command interpreter runs.
const command = args => (process.platform === 'win32' ? [process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', 'codegraph', ...args]] : ['codegraph', args]);

// Probes the changed files' dependents when a CodeGraph index exists; any failure leaves the probe empty.
function dependents(cwd, files) {
  const probe = { indexed: false, files_probed: 0, max_dependents: 0 };
  try {
    if (!fs.existsSync(path.join(cwd, '.codegraph'))) return probe;
    probe.indexed = true;
    // The Windows shim runs through the command interpreter, so only paths free of shell metacharacters are probed.
    for (const file of files.filter(item => item.status !== 'D' && !TEST_OR_DOC.test(item.path) && SAFE_PATH.test(item.path)).slice(0, DEPENDENTS_PROBE_LIMIT)) {
      let text;
      try { text = execFileSync(...command(['node', '-f', file.path, '--symbols-only']), { cwd, encoding: 'utf8', timeout: 20000, stdio: ['ignore', 'pipe', 'ignore'] }); } catch { continue; }
      probe.files_probed += 1;
      probe.max_dependents = Math.max(probe.max_dependents, Number(/used by (\d+) files?/.exec(text)?.[1]) || 0);
    }
  } catch { /* a missing or broken index only removes the caller signal */ }
  return probe;
}

function compute(request, cwd) {
  const parent = checkedRef(request.parent);
  git(cwd, ['rev-parse', '--verify', `${parent}^{commit}`]);
  const head = git(cwd, ['rev-parse', 'HEAD']).trim();
  const base = git(cwd, ['merge-base', parent, 'HEAD']).trim();
  const fingerprint = crypto.createHash('sha256').update(git(cwd, ['diff', '--no-color', '--no-ext-diff', '--no-textconv', '-M', base, 'HEAD', '--', '.', ...EXCLUDE_ARTIFACTS])).digest('hex');
  const files = changedFiles(cwd, base);
  const totals = lineTotals(cwd, base);
  const floors = { security: 'low', reversibility: 'low', blast_radius: 'low', critical_sections: null };
  const signals = [];
  const counts = new Map();
  const signal = (rating, level, name, extra) => {
    floors[rating] = higher(floors[rating], level);
    const key = `${rating}:${name}`;
    counts.set(key, (counts.get(key) || 0) + 1);
    if (counts.get(key) <= EVIDENCE_PER_SIGNAL) signals.push({ rating, level, signal: name, ...extra });
  };

  const code = files.filter(file => file.status !== 'D' && !TEST_OR_DOC.test(file.path));
  for (const file of code) {
    if (SENSITIVE.test(file.path)) signal('security', 'high', 'sensitive-path', { path: file.path });
    else if (EXPOSED.test(file.path)) signal('security', 'medium', 'exposed-path', { path: file.path });
    if (MIGRATION.test(file.path)) signal('reversibility', 'high', 'migration-or-schema', { path: file.path });
    if (INFRASTRUCTURE.test(file.path)) signal('reversibility', 'medium', 'ci-container-infrastructure', { path: file.path });
    if (DEPENDENCY.test(file.path)) signal('reversibility', 'medium', 'dependency-manifest', { path: file.path });
  }
  const deletions = files.filter(file => file.status === 'D' && !TEST_OR_DOC.test(file.path));
  const deletionLevel = bySize(deletions.length, THRESHOLDS.deletedFiles);
  if (deletionLevel !== 'low') signal('reversibility', deletionLevel, 'file-deletions', { count: deletions.length, path: deletions[0].path });
  for (const deleted of deletions.filter(file => MIGRATION.test(file.path))) signal('reversibility', 'high', 'migration-or-schema', { path: deleted.path });
  for (const added of addedLines(cwd, base)) {
    if (!TEST_OR_DOC.test(added.path) && USER_INPUT.test(added.text)) signal('security', 'medium', 'user-input', { path: added.path, line: added.line });
  }

  const lines = totals.added + totals.deleted;
  const probe = dependents(cwd, files);
  for (const [name, value, thresholds] of [['changed-files', files.length, THRESHOLDS.files], ['changed-lines', lines, THRESHOLDS.lines], ['dependents', probe.max_dependents, THRESHOLDS.dependents]]) {
    const level = bySize(value, thresholds);
    if (level !== 'low') signal('blast_radius', level, name, { count: value });
  }

  return { status: 'ok', parent, head, merge_base: base, fingerprint, floors, signals,
    stats: { changed_files: files.length, added_lines: totals.added, deleted_lines: totals.deleted, deleted_files: deletions.length },
    codegraph: probe };
}

// The ratings block of a report: the text from the start marker to the end marker, or null unless the markers
// appear exactly once each, in order.
function extractBlock(text) {
  if (typeof text !== 'string') return null;
  const start = text.indexOf(BLOCK_START);
  const end = text.indexOf(BLOCK_END);
  if (start === -1 || end < start || text.indexOf(BLOCK_START, start + 1) !== -1 || text.indexOf(BLOCK_END, end + 1) !== -1) return null;
  return text.slice(start, end + BLOCK_END.length);
}

// The merge-base, the code fingerprint, and the four levels of a block, or null when any of them is missing or invalid.
function parseBlock(block) {
  const header = /^Merge-base: `([0-9a-f]{7,64})` \| Code fingerprint: `([0-9a-f]{64})`\r?$/m.exec(block);
  if (!header) return null;
  const levels = {};
  for (const row of block.split('\n')) {
    const cells = row.split('|').map(cell => cell.trim());
    if (cells.length < 4 || cells[0] !== '' || !(cells[1] in RATING_ROWS)) continue;
    if (RATING_ROWS[cells[1]] in levels || !LEVELS.includes(cells[2])) return null;
    levels[RATING_ROWS[cells[1]]] = cells[2];
  }
  return Object.values(RATING_ROWS).every(rating => rating in levels) ? { merge_base: header[1], fingerprint: header[2], levels } : null;
}

// `fresh`: the block matches the current code and respects the floors; `stale`: the merge-base or the code
// fingerprint no longer matches; `absent`: the block is missing or invalid, or a stored level is below the floor
// computed now. A block that is not well formed returns before any Git command runs.
function validate(request, cwd) {
  const block = extractBlock(request.text);
  const stored = block && parseBlock(block);
  if (!stored) return { status: 'ok', state: 'absent' };
  const current = compute({ parent: request.parent }, cwd);
  if (stored.merge_base !== current.merge_base || stored.fingerprint !== current.fingerprint) return { status: 'ok', state: 'stale' };
  for (const [rating, floor] of Object.entries(current.floors)) {
    if (floor && LEVELS.indexOf(stored.levels[rating]) < LEVELS.indexOf(floor)) return { status: 'ok', state: 'absent' };
  }
  return { status: 'ok', state: 'fresh', block };
}

const USAGE = 'Usage: node risk-signals.js compute --parent <branch> [--cwd <project-root>] | validate --parent <branch> --file <review.md> [--cwd <project-root>]';

function main(argv) {
  const options = {};
  try {
    const [operation, ...rest] = argv;
    const allowed = { compute: ['--parent', '--cwd'], validate: ['--parent', '--file', '--cwd'] }[operation];
    if (!allowed) throw new Error(USAGE);
    for (let index = 0; index < rest.length; index += 2) {
      if (!allowed.includes(rest[index]) || rest[index + 1] === undefined) throw new Error(USAGE);
      options[rest[index].slice(2)] = rest[index + 1];
    }
    const cwd = options.cwd || process.cwd();
    let result;
    if (operation === 'compute') result = compute({ parent: options.parent }, cwd);
    else {
      if (!options.file) throw new Error(USAGE);
      let text = null;
      try { text = fs.readFileSync(path.resolve(cwd, options.file), 'utf8'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
      result = validate({ parent: options.parent, text }, cwd);
    }
    process.stdout.write(JSON.stringify(result) + '\n');
    return 0;
  } catch (error) {
    process.stdout.write(JSON.stringify({ status: 'blocked', message: error.message }) + '\n');
    return 2;
  }
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));
module.exports = { compute, validate, extractBlock, main, LEVELS, THRESHOLDS };
