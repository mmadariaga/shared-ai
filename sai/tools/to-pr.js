'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const backlog = require('./to-backlog');
const { receiptPath: backlogReceiptPath } = require('./to-backlog-github');
const { checkPrTitleRules } = require('./lint');
const digest = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
function prepare(request, { filesystem = fs, platform = process.platform } = {}) {
  if (!['claude', 'opencode'].includes(request.harness)) throw new Error('Expected harness: claude or opencode');
  const root = platform === 'linux' && request.harness === 'opencode' ? '/tmp/opencode' : os.tmpdir();
  let stat;
  try { stat = filesystem.lstatSync(root); }
  catch (error) {
    if (error.code === 'ENOENT') throw new Error(`Required existing temporary root ${root} is missing; restore the permitted temporary location before retrying. Preparation does not create or repair shared roots`);
    throw error;
  }
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('Existing temporary root must be a directory without symbolic links');
  const directory = filesystem.mkdtempSync(path.join(root, 'to-pr-'));
  if (platform !== 'win32') filesystem.chmodSync(directory, 0o700);
  return { status: 'ready', receipt: path.join(directory, 'receipt.json') };
}
function receiptPath(file) {
  const canonical = backlogReceiptPath(file);
  // Reject symlinked ancestors as well as symlinked receipt files. The shared
  // backlog safeguard checks repository containment, ownership, mode and links.
  if (canonical !== path.resolve(file)) throw new Error('Receipt path must not pass through symbolic links');
  return canonical;
}
function loadAdapter(entry) {
  if (!/^to-pr-[a-z0-9-]+\.js$/.test(entry.adapter)) throw new Error('Invalid registry adapter');
  if (!/^providers\/[a-z0-9-]+\.md$/.test(entry.instructions)) throw new Error('Invalid provider instruction reference');
  return require(path.join(__dirname, entry.adapter));
}
function adapter(provider, io) {
  // Every operation uses the same registry supplied to the CLI, including recovery.
  const entry = io.registry.providers.find(item => item.id === provider);
  if (!entry?.capabilities.includes('publish')) throw new Error('Unsupported provider');
  return loadAdapter(entry);
}
function resolve(request, registry, io) {
  const explicit = request.explicit || {}, config = request.config || {};
  if (!explicit.provider && !config.provider) {
    const values = explicit.repository ? [explicit.repository] : config.repository ? [config.repository] : request.remotes || [];
    const hosts = registry.providers.flatMap(entry => entry.hosts || []);
    const unknownHosts = [...new Set(values.map(backlog.address).filter(Boolean).map(item => item.host).filter(host => !hosts.includes(host)))];
    if (unknownHosts.length) return { status: 'needs_input', reason: 'provider-ambiguous', unknownHosts };
  }
  const result = backlog.resolve(request, registry, { ...io, loadAdapter });
  if (result.status === 'resolved') loadAdapter(registry.providers.find(entry => entry.id === result.provider));
  return result;
}
function ref(value) {
  if (typeof value !== 'string' || !value || value.startsWith('-') || /[\s~^:?*\[\\]/.test(value) || value.includes('..') || value.includes('@{')) throw new Error('Invalid branch or remote');
  return value;
}
function collect(request, io) {
  const git = args => io.run('git', args).trim();
  const source = ref(git(['symbolic-ref', '--quiet', '--short', 'HEAD']));
  const head = git(['rev-parse', 'HEAD']);
  const remotes = git(['remote']).split('\n').filter(Boolean).map(name => ({ name, url: git(['remote', 'get-url', name]), pushUrl: git(['remote', 'get-url', '--push', name]) }));
  const state = { source, head, remotes, pending: git(['status', '--porcelain=v1']) };
  if (!request.base) return state;
  const base = ref(request.base);
  git(['rev-parse', '--verify', `${base}^{commit}`]);
  const context = {};
  if (request.change) {
    if (!/^[a-zA-Z0-9][a-zA-Z0-9-]*$/.test(request.change)) throw new Error('Invalid optional change name');
    for (const name of ['proposal', 'design', 'review', 'security', 'performance', 'accessibility']) {
      const file = path.join(io.cwd || process.cwd(), 'openspec', 'changes', request.change, `${name}.md`);
      try { context[name] = fs.readFileSync(file, 'utf8'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
  }
  return { ...state, base, commits: git(['log', `${base}..HEAD`, '--format=%H%n%s%n%b']), diff: git(['diff', `${base}...HEAD`]), diffStats: git(['diff', '--stat', `${base}...HEAD`]), context };
}
function destination(request, io) {
  const target = adapter(request.provider, io).inspect(request.repository, io);
  const state = collect({}, io);
  const candidates = state.remotes.filter(remote => {
    const same = value => { const parsed = backlog.address(value); return parsed && parsed.host === target.host.split(':')[0] && parsed.repository === target.repository; };
    return same(remote.url) && same(remote.pushUrl);
  });
  const remote = request.remote ? candidates.find(item => item.name === request.remote) : candidates.length === 1 ? candidates[0] : null;
  if (!remote) throw new Error('Select an unambiguous remote whose fetch and push URLs match the destination; cross-repository branches require clarification');
  const base = ref(request.base || target.defaultBranch);
  if (base === state.source) throw new Error('Source and target branches must differ');
  return { target, source: state.source, head: state.head, base, remote: remote.name, pushUrl: remote.pushUrl };
}
function pushQuery(request, io) {
  const proposal = destination(request, io);
  const rows = io.run('git', ['ls-remote', '--heads', proposal.remote, `refs/heads/${proposal.source}`]).trim();
  const remoteHead = rows ? rows.split(/\s+/)[0] : null;
  return { status: remoteHead === proposal.head ? 'no_changes' : 'ready', proposal, confirmation: digest(proposal) };
}
function push(request, io) {
  const ready = pushQuery(request, io);
  if (request.approved !== true || ready.confirmation !== request.confirmation) throw new Error('Independent exact remote and branch push approval required');
  if (ready.status === 'no_changes') return ready;
  io.run('git', ['push', ready.proposal.remote, `${ready.proposal.head}:refs/heads/${ready.proposal.source}`]);
  const verified = pushQuery(request, io);
  if (verified.status !== 'no_changes') throw new Error('Push could not be verified');
  return { status: 'complete' };
}
function query(request, io) {
  if (typeof request.title !== 'string' || /[\r\n]/.test(request.title) || typeof request.description !== 'string' || !request.description.trim()) throw new Error('Single-line title and nonempty description required');
  const violations = checkPrTitleRules(request.title);
  if (violations.length) throw new Error(`Invalid request title: ${JSON.stringify(violations)}`);
  const selected = destination(request, io);
  const rows = adapter(request.provider, io).list(selected.target, selected.source, selected.base, io);
  if (rows.length > 1) throw new Error('Multiple matching requests; resolve ambiguity before publication');
  const proposal = { provider: request.provider, ...selected, existing: rows[0] || null, title: request.title, description: request.description };
  const matches = rows[0]?.title === request.title && rows[0]?.description === request.description;
  return { status: matches ? 'no_changes' : 'ready', proposal, confirmation: digest(proposal) };
}
function publish(request, io) {
  const ready = query(request, io);
  if (request.approved !== true || request.confirmation !== ready.confirmation) throw new Error('Exact destination, baseline and content approval required; review again');
  if (ready.status === 'no_changes') return ready;
  if (pushQuery(request, io).status !== 'no_changes') throw new Error('Branch is not published at the approved commit; obtain independent push approval');
  request = { ...request, receipt: receiptPath(request.receipt) };
  fs.writeFileSync(request.receipt, JSON.stringify({ proposal: ready.proposal }), { flag: 'wx', mode: 0o600 });
  try {
    adapter(request.provider, io).mutate(ready.proposal, io);
    return recover({ receipt: request.receipt }, io);
  } catch (error) { return { status: 'uncertain', receipt: request.receipt, message: error.message }; }
}
function recover(request, io) {
  request = { ...request, receipt: receiptPath(request.receipt) };
  const { proposal } = JSON.parse(fs.readFileSync(request.receipt, 'utf8'));
  const target = adapter(proposal.provider, io).inspect(proposal.target.url, io);
  if (target.id !== proposal.target.id || target.host !== proposal.target.host) throw new Error('Recovery destination identity changed');
  const rows = adapter(proposal.provider, io).list(target, proposal.source, proposal.base, io);
  const candidates = rows.filter(row => (!proposal.existing || row.number === proposal.existing.number) && row.title === proposal.title && row.description === proposal.description);
  return candidates.length === 1 ? { status: 'complete', request: candidates[0] } : { status: 'uncertain', candidates: rows, receipt: request.receipt, message: 'Read-only recovery cannot verify the approved content; do not repeat creation' };
}
function main(argv) {
  let request;
  try {
    const [operation, registryPath] = argv;
    const operations = { prepare, collect, destination, query, 'push-query': pushQuery, push, publish, recover };
    if (argv.length !== 2 || (!operations[operation] && operation !== 'resolve')) throw new Error('Usage: node to-pr.js prepare|collect|resolve|destination|query|push-query|push|publish|recover <registry.json>; JSON on stdin');
    request = JSON.parse(fs.readFileSync(0, 'utf8'));
    const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
    const io = { registry, cwd: process.cwd(), run: (command, args, input) => backlog.run(command, args, process.cwd(), input) };
    let result;
    if (operation === 'resolve') {
      let config = {};
      try { config = JSON.parse(fs.readFileSync('.to-pr.json', 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
      result = resolve({ explicit: request.explicit || {}, config, remotes: collect({}, io).remotes.map(row => row.url) }, registry, io);
    } else result = operations[operation](request, io);
    process.stdout.write(JSON.stringify(result) + '\n');
    return ['ready', 'resolved', 'complete', 'no_changes'].includes(result.status) || ['collect', 'destination'].includes(operation) ? 0 : 1;
  } catch (error) { process.stdout.write(JSON.stringify({ status: 'blocked', message: error.message, ...(typeof request?.receipt === 'string' ? { receipt: request.receipt } : {}) }) + '\n'); return 2; }
}
if (require.main === module) process.exitCode = main(process.argv.slice(2));
module.exports = { prepare, resolve, collect, destination, query, pushQuery, push, publish, recover, main };
