'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const backlog = require('./to-backlog');
const { makeTempDir } = require('./temp-root');
const { receiptPath: backlogReceiptPath } = require('./to-backlog-github');
const { checkPrTitleRules, checkAiAttribution } = require('./lint');
const projectSettings = require('./project-settings');
const riskSignals = require('./risk-signals');
const { readBacklog } = projectSettings;
const digest = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
function prepare(request, options = {}) {
  const directory = makeTempDir(request.harness, 'to-pr-', options);
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
const LEGACY_CONFIG = '.to-pr.json';
// E1/E2/E12: `pr.*` in the project settings first, then the deprecated `.to-pr.json` in the project root.
function configuration(registry, io) {
  const settings = projectSettings.readPr({ cwd: io.cwd, providerIds: registry.providers.filter(entry => entry.capabilities.includes('publish')).map(entry => entry.id) });
  const warnings = [...settings.warnings], notices = [...(settings.notices || [])];
  let legacy;
  try { legacy = JSON.parse(fs.readFileSync(path.join(settings.root, LEGACY_CONFIG), 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const fromSettings = Object.keys(settings.config).length > 0;
  if (legacy !== undefined) warnings.push(`${LEGACY_CONFIG} is deprecated${fromSettings ? ' and ignored because pr.* in .sai/settings.jsonc is set' : ''}; move its keys to pr.* in .sai/settings.jsonc and delete it.`);
  if (fromSettings) return { config: settings.config, settings: true, warnings, notices };
  if (legacy?.type !== undefined) throw new Error('Work-item type is invocation-scoped');
  return { config: legacy || {}, settings: false, warnings, notices };
}
function resolve(request, registry, io) {
  const explicit = request.explicit || {};
  // An injected `config` stands in for the files; otherwise the working directory's files supply it.
  const read = request.config === undefined && io.cwd ? configuration(registry, io) : { config: request.config || {}, settings: false, warnings: [], notices: [] };
  const config = read.config;
  const finish = result => {
    const addressed = read.settings ? backlog.detect(explicit.repository, registry, loadAdapter) : [];
    const addressProvider = addressed.length === 1 ? addressed[0].provider : undefined;
    const lines = read.settings ? [...projectSettings.notices(config, explicit, result, addressProvider, 'pr'), ...projectSettings.overrides(config, explicit, addressProvider, 'pr')] : [];
    return projectSettings.report(result, { warnings: read.warnings, notices: [...read.notices, ...lines] });
  };
  if (!explicit.provider && !config.provider) {
    const values = explicit.repository ? [explicit.repository] : config.repository ? [config.repository] : request.remotes || [];
    const hosts = registry.providers.flatMap(entry => entry.hosts || []);
    const unknownHosts = [...new Set(values.filter(value => !registry.providers.some(entry => entry.classification === 'provider' && loadAdapter(entry).classify(value) === 'match')).map(backlog.address).filter(Boolean).map(item => item.host).filter(host => !hosts.includes(host)))];
    if (unknownHosts.length) return finish({ status: 'needs_input', reason: 'provider-ambiguous', unknownHosts });
  }
  const result = backlog.resolve({ ...request, explicit, config }, registry, { ...io, loadAdapter });
  if (result.status === 'resolved') loadAdapter(registry.providers.find(entry => entry.id === result.provider));
  return finish(result);
}
function ref(value) {
  if (typeof value !== 'string' || !value || value.startsWith('-') || /[\s~^:?*\[\\]/.test(value) || value.includes('..') || value.includes('@{')) throw new Error('Invalid branch or remote');
  return value;
}
// The ratings block stored in the change's review.md, checked against the merge-base of HEAD with the request's
// base: `fresh` carries the block to publish as is; `stale` and `absent` (including a block that cannot be
// checked) leave the ratings to be computed.
function inherentRisk(review, base, cwd) {
  try {
    const { state, block } = riskSignals.validate({ parent: base, text: review }, cwd);
    return state === 'fresh' ? { state, block } : { state };
  } catch { return { state: 'absent' }; }
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
  return { ...state, base, inherent_risk: inherentRisk(context.review, base, io.cwd || process.cwd()), commits: git(['log', `${base}..HEAD`, '--format=%H%n%s%n%b']), diff: git(['diff', `${base}...HEAD`]), diffStats: git(['diff', '--stat', `${base}...HEAD`]), context };
}
function destination(request, io) {
  const provider = adapter(request.provider, io);
  const target = provider.inspect(request.repository, io);
  const state = collect({}, io);
  const candidates = state.remotes.filter(remote => {
    const same = value => { if (provider.sameRepository) return provider.sameRepository(value, target); const parsed = backlog.address(value); return parsed && parsed.host === target.host.split(':')[0] && parsed.repository === target.repository; };
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
// Closing references (E1-E6): the tool computes and places the closing block.
const CLOSING_START = '<!-- sai-closing-refs:start -->', CLOSING_END = '<!-- sai-closing-refs:end -->';
const CLOSING_BLOCK = new RegExp(`\\s*${CLOSING_START}[\\s\\S]*?${CLOSING_END}`, 'g');
const CLOSING_KEYWORD = /\b(?:close[sd]?|fix(?:es|ed)?|resolve[sd]?)\b:?[ \t]+(?:https?:\/\/([^\s/]+)\/([^\s#]+?)\/(?:-\/)?(?:issues|work_items)\/(\d+)|([\w.-]+(?:\/[\w.-]+)+)#(\d+)|#(\d+))/gi;
const ISSUE_URL = /^https?:\/\/([^/]+)\/(.+?)\/(?:-\/)?(?:issues|work_items)\/(\d+)\/?$/;
const issueKey = ref => `${ref.host}/${ref.repository}#${ref.number}`.toLowerCase();
const writtenIssue = (ref, target) => (ref.host.toLowerCase() === target.host.toLowerCase() && ref.repository.toLowerCase() === target.repository.toLowerCase() ? `#${ref.number}` : `${ref.repository}#${ref.number}`);
// Issues preceded by a closing keyword, qualified against the destination (I1).
function closingReferences(text, target) {
  return [...text.matchAll(CLOSING_KEYWORD)].map(match => match[3]
    ? { host: match[1], repository: match[2], number: Number(match[3]) }
    : { host: target.host, repository: match[4] || target.repository, number: Number(match[5] || match[6]) });
}
function uniqueReferences(refs) {
  const seen = new Set();
  return refs.filter(ref => !seen.has(issueKey(ref)) && seen.add(issueKey(ref)));
}
// E5: the branch id closes its issue only when it has children and all are covered.
function branchParent(request, selected, provider, covered, io) {
  const id = /^[^/]+\/([1-9]\d*)_/.exec(selected.source)?.[1];
  if (!id) return {};
  const { config } = readBacklog({ cwd: io.cwd || process.cwd() });
  if (config.provider && config.provider !== request.provider) return {};
  let repository = selected.target.repository;
  if (config.repository) {
    const url = /^https?:\/\//.test(config.repository) ? new URL(config.repository) : null;
    if (url && url.host.toLowerCase() !== selected.target.host.toLowerCase()) return {};
    repository = url ? url.pathname.replace(/^\/|\/$|\.git$/g, '') : config.repository;
  }
  const ref = { host: selected.target.host, repository, number: Number(id) };
  if (covered.has(issueKey(ref))) return {};
  const children = provider.closing.children(provider.closing.issueUrl(repository, ref.number, selected.target), io);
  if (children.status !== 'complete') return { warning: `Issue ${writtenIssue(ref, selected.target)} from the branch name was not evaluated for closing: ${children.message}` };
  const done = children.children.length && children.children.every(child => {
    const found = ISSUE_URL.exec(child.url);
    return child.state === 'CLOSED' || (found && covered.has(issueKey({ host: found[1], repository: found[2], number: Number(found[3]) })));
  });
  return done ? { ref } : {};
}
// E1-E6: the description with its closing block, plus warnings to show before approval.
function withClosingBlock(request, selected, io) {
  const provider = adapter(request.provider, io);
  const warnings = [];
  if (!provider.closing) return { description: request.description, warnings };
  let log = '';
  for (const range of [selected.base, `${selected.remote}/${selected.base}`]) {
    try { log = io.run('git', ['log', `${range}..HEAD`, '--format=%H%n%s%n%b']); break; }
    catch (error) { if (range !== selected.base) warnings.push(`Commit log unavailable, so no closing references were computed: ${error.message}`); }
  }
  const stripped = request.description.replace(CLOSING_BLOCK, '');
  const text = stripped.trimEnd();
  const found = uniqueReferences(closingReferences(log, selected.target));
  const manual = closingReferences(text, selected.target);
  const parent = branchParent(request, selected, provider, new Set([...found, ...manual].map(issueKey)), io);
  if (parent.warning) warnings.push(parent.warning);
  const handWritten = new Set(manual.map(issueKey));
  const closable = [...found, ...(parent.ref ? [parent.ref] : [])].filter(ref => ref.host.toLowerCase() === selected.target.host.toLowerCase());
  for (const ref of found.filter(ref => !closable.includes(ref))) warnings.push(`Issue ${ref.host}/${ref.repository}#${ref.number} is on another host and cannot be closed from this request.`);
  const lines = closable.filter(ref => !handWritten.has(issueKey(ref))).map(ref => `Closes ${writtenIssue(ref, selected.target)}`);
  const block = lines.length ? `${text}${text ? '\n\n' : ''}${CLOSING_START}\n${lines.join('\n')}\n${CLOSING_END}` : stripped === request.description ? request.description : text;
  return { description: block, warnings };
}
const UNSUPPORTED_LABELLING = 'no assignee or labels: the provider does not support them';
// Creation only: the current user and the requested labels bounded to the project's real label list.
// Every read or selection problem is a warning; none of them stops the proposal.
function labelling(request, selected, provider, io) {
  if (!provider.currentUser || !provider.labels) return { warnings: [UNSUPPORTED_LABELLING] };
  const warnings = [];
  let assignee, available, userFailed = false, labelsFailed = false;
  try { assignee = provider.currentUser(selected.target, io); } catch (error) { userFailed = true; warnings.push(`The current user could not be read, so no assignee is set: ${error.message}`); }
  try { available = provider.labels(selected.target, io); } catch (error) { labelsFailed = true; warnings.push(`The project labels could not be read, so no labels are applied: ${error.message}`); }
  const requested = [...new Set(Array.isArray(request.labels) ? request.labels : [])];
  const labels = requested.filter(name => typeof name === 'string' && available?.includes(name));
  const dropped = requested.filter(name => !labels.includes(name));
  if (dropped.length) warnings.push(`Labels not in the project's label list were dropped: ${dropped.map(String).join(', ')}`);
  return { assignee, labels, available, warnings, userFailed, labelsFailed };
}
const baseline = ({ assignees, labels, ...row }) => row;
// `build` rebuilds the proposal around a given assignee and labels, for publish's fallback.
function prepareQuery(request, io) {
  if (typeof request.title !== 'string' || /[\r\n]/.test(request.title) || typeof request.description !== 'string' || !request.description.trim()) throw new Error('Single-line title and nonempty description required');
  const violations = checkPrTitleRules(request.title);
  if (violations.length) throw new Error(`Invalid request title: ${JSON.stringify(violations)}`);
  const selected = destination(request, io);
  const provider = adapter(request.provider, io);
  const rows = provider.list(selected.target, selected.source, selected.base, io);
  if (rows.length > 1) throw new Error('Multiple matching requests; resolve ambiguity before publication');
  const warning = rows[0] && provider.concurrencyWarning;
  const { description, warnings } = withClosingBlock(request, selected, io);
  const attribution = request.allow_attribution === true ? [] : checkAiAttribution(description, 'request description');
  if (attribution.length) throw new Error(`Invalid request description: ${JSON.stringify(attribution)}`);
  const applied = rows[0] ? { warnings: [] } : labelling(request, selected, provider, io);
  const build = (assignee, labels) => ({ provider: request.provider, ...selected, existing: rows[0] ? baseline(rows[0]) : null, title: request.title, description,
    ...(assignee ? { assignee } : {}), ...(labels ? { labels } : {}), ...(warning ? { concurrency_warning: warning } : {}) });
  const proposal = build(applied.assignee, applied.labels);
  const matches = rows[0]?.title === request.title && rows[0]?.description === description;
  const all = [...warnings, ...applied.warnings];
  const ready = { status: matches ? 'no_changes' : 'ready', proposal, confirmation: digest(proposal), ...(applied.available ? { available_labels: applied.available } : {}), ...(all.length ? { warnings: all } : {}) };
  return { ready, applied, build };
}
function query(request, io) { return prepareQuery(request, io).ready; }
// E10: a user or label read that fails when publish re-queries never rejects an approved creation. The assignee and
// labels the caller echoes back stand in for the failed read only when the approval digest proves they are exactly the approved ones.
function approvedWithFailedReads({ ready, applied, build }, request) {
  if (request.confirmation === ready.confirmation || !(applied.userFailed || applied.labelsFailed)) return ready;
  const echoed = request.assignee;
  const assignee = applied.userFailed && typeof echoed?.login === 'string' ? { ...(echoed.id !== undefined ? { id: echoed.id } : {}), login: echoed.login } : applied.assignee;
  const labels = applied.labelsFailed && Array.isArray(request.labels) ? [...new Set(request.labels.filter(name => typeof name === 'string'))] : applied.labels;
  const proposal = build(assignee, labels);
  if (digest(proposal) !== request.confirmation) return ready;
  const note = [applied.userFailed && 'the current user', applied.labelsFailed && 'the project labels'].filter(Boolean).join(' and ');
  return { ...ready, proposal, confirmation: digest(proposal), warnings: [...(ready.warnings || []), `${note} could not be re-read at publication; the approved assignee and labels are applied unchanged`] };
}
// After a creation: every difference between the approved assignee and labels and the request's actual ones is a warning.
function labellingOutcome(outcome, proposal, result, notices = []) {
  if (outcome.status !== 'complete' || proposal.existing) return outcome;
  const warnings = [...notices, ...(result?.warnings || [])];
  if (!result?.warnings?.length && proposal.labels) {
    const differences = (expected, actual, label) => {
      const have = Array.isArray(actual) ? actual : [];
      const missing = expected.filter(name => !have.includes(name)), unexpected = have.filter(name => !expected.includes(name));
      if (missing.length) warnings.push(`The request is missing the approved ${label}: ${missing.join(', ')}`);
      if (unexpected.length) warnings.push(`The request carries ${label} that were not approved: ${unexpected.join(', ')}`);
    };
    differences(proposal.assignee ? [proposal.assignee.login] : [], outcome.request?.assignees, 'assignee');
    differences(proposal.labels, outcome.request?.labels, 'labels');
  }
  return warnings.length ? { ...outcome, warnings } : outcome;
}
function publish(request, io) {
  const prepared = prepareQuery(request, io);
  const ready = approvedWithFailedReads(prepared, request);
  const rereadNotices = ready === prepared.ready ? [] : ready.warnings.slice(-1);
  if (request.approved !== true || request.confirmation !== ready.confirmation) throw new Error('Exact destination, baseline and content approval required; review again');
  if (ready.status === 'no_changes') return ready;
  if (pushQuery(request, io).status !== 'no_changes') throw new Error('Branch is not published at the approved commit; obtain independent push approval');
  request = { ...request, receipt: receiptPath(request.receipt) };
  const provider = adapter(request.provider, io);
  const receipt = { proposal: ready.proposal, ...(provider.publicationEvidence ? { evidence: provider.publicationEvidence(ready.proposal, io) } : {}) };
  fs.writeFileSync(request.receipt, JSON.stringify(receipt), { flag: 'wx', mode: 0o600 });
  let submitted = false;
  try {
    const result = provider.mutate(ready.proposal, io);
    submitted = true;
    if (receipt.evidence) {
      receipt.evidence.result = result;
      fs.writeFileSync(request.receipt, JSON.stringify(receipt), { mode: 0o600 });
    }
    return labellingOutcome(recover({ receipt: request.receipt }, io), ready.proposal, result, rereadNotices);
  } catch (error) { return { status: !submitted && error.rejected ? 'rejected' : 'uncertain', receipt: request.receipt, message: error.message }; }
}
function recover(request, io) {
  request = { ...request, receipt: receiptPath(request.receipt) };
  const { proposal, evidence } = JSON.parse(fs.readFileSync(request.receipt, 'utf8'));
  const provider = adapter(proposal.provider, io);
  if (provider.recoverPublication) {
    if (!evidence || !Array.isArray(evidence.previous)) throw new Error('Missing private publication evidence');
    return { ...provider.recoverPublication(proposal, evidence, io, request), receipt: request.receipt };
  }
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
      result = resolve({ explicit: request.explicit || {}, remotes: collect({}, io).remotes.map(row => row.url) }, registry, io);
    } else result = operations[operation](request, io);
    process.stdout.write(JSON.stringify(result) + '\n');
    return ['ready', 'resolved', 'complete', 'no_changes'].includes(result.status) || ['collect', 'destination'].includes(operation) ? 0 : 1;
  } catch (error) { process.stdout.write(JSON.stringify({ status: 'blocked', message: error.message, ...(typeof request?.receipt === 'string' ? { receipt: request.receipt } : {}) }) + '\n'); return 2; }
}
if (require.main === module) process.exitCode = main(process.argv.slice(2));
module.exports = { prepare, resolve, collect, closingReferences, destination, query, pushQuery, push, publish, recover, main };
