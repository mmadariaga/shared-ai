'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { run } = require('./from-backlog');
const destination = require('./to-backlog');
const adapters = {
  github: require('./from-next-backlog-item-github'),
  gitlab: require('./from-next-backlog-item-gitlab'),
  azuredevops: require('./from-next-backlog-item-azuredevops'),
};
const FIELDS = {
  github: ['owner', 'owner_kind', 'project', 'view', 'filters'],
  gitlab: ['project', 'pile', 'filters', 'board', 'list', 'view'],
  azuredevops: ['organization', 'project', 'team', 'backlog', 'view', 'filters'],
};
function pending(reason, message, extra = {}) { return { status: 'pending', reason, message, ...extra }; }
function check(condition, message) { if (!condition) throw Object.assign(new Error(message), { reason: 'incomplete-response' }); }
function positive(value) { return Number.isSafeInteger(value) && value > 0; }
function text(value) { return typeof value === 'string' && !!value.trim() && !/[\x00-\x1f\x7f]/.test(value); }
function resolveDestination(request, io) {
  const r = { ...request };
  if ((r.provider === 'gitlab' && text(r.project)) ||
      (r.provider === 'github' && text(r.owner)) ||
      (r.provider === 'azuredevops' && text(r.organization) && text(r.project))) return r;
  // The same registry and resolver serve source installs and both harness projections.
  const installed = path.join(__dirname, '../../skills/to-backlog/providers/registry.json');
  const registry = JSON.parse(fs.readFileSync(fs.existsSync(installed) ? installed
    : path.join(__dirname, '../../skills/universal/to-backlog/providers/registry.json'), 'utf8'));
  const explicit = {};
  if (r.provider) explicit.provider = r.provider;
  const repository = r.repository || (typeof r.project === 'string' && destination.address(r.project) ? r.project : undefined);
  if (repository) explicit.repository = repository;
  if (r.organization) explicit.organization = r.organization;
  if (r.provider === 'azuredevops' && r.project) explicit.project = r.project;
  let result = destination.resolve({ explicit }, registry, io);
  if (result.status === 'needs_input' && ['provider-ambiguous', 'repository-ambiguous', 'destination-ambiguous'].includes(result.reason)) {
    const urls = io.run('git', ['remote', '-v']).split(/\r?\n/).map(line => line.split(/\s+/)[1]).filter(Boolean)
      .filter(url => !r.provider || destination.detect(url, registry).some(candidate => candidate.provider === r.provider));
    const remotes = [...new Map(urls.map(url => {
      const parsed = destination.address(url);
      return [parsed ? `${parsed.host}/${parsed.repository}` : url, url];
    })).values()];
    result = destination.resolve({ explicit, remotes }, registry, io);
  }
  if (result.provider) r.provider = result.provider;
  if (result.status === 'resolved') {
    if (r.provider === 'gitlab') r.project ??= result.repository;
    if (r.provider === 'github') r.owner ??= result.repository.split('/')[0];
    if (r.provider === 'azuredevops') {
      r.organization ??= result.organization;
      r.project ??= result.project;
    }
    return r;
  }
  return pending(result.reason || 'destination-unresolved', 'Supply only the unresolved destination information.', {
    selection: r, candidates: result.candidates || [],
    ...(!r.provider ? { options: Object.keys(adapters).map(value => ({ label: value, value })) } : {}),
  });
}
function select(request, io = { run }) {
  try {
    if (!request || typeof request !== 'object' || Array.isArray(request)) return pending('invalid-request', 'Supply a selection object.');
    if (request.cancel === true) return { status: 'cancelled' };
    if (request.provider && !Object.hasOwn(adapters, request.provider)) return pending('unsupported-provider', 'Supported providers: GitHub, GitLab, Azure DevOps.');
    const fields = request.provider ? FIELDS[request.provider] : Object.values(FIELDS).flat();
    if (Object.keys(request).some(key => !['provider', 'cancel', 'repository', ...fields].includes(key))) return pending('unsupported-context', 'The pile has unsupported selection context; membership and manual order cannot be established.');
    const resolved = resolveDestination(request, io);
    if (resolved.status === 'pending') return resolved;
    if (Object.keys(resolved).some(key => !['provider', 'cancel', 'repository', ...FIELDS[resolved.provider]].includes(key))) return pending('unsupported-context', 'The destination has incompatible selection context.');
    const result = adapters[resolved.provider].select(resolved, io, { pending, check, positive, text });
    return result.status === 'pending' ? { ...result, selection: resolved } : result;
  } catch (error) {
    return pending(error.reason || 'retrieval-failed', error.message);
  }
}
function main(argv) {
  if (argv.length !== 1 || argv[0] !== 'select') {
    process.stdout.write(JSON.stringify(pending('usage', 'Usage: node from-next-backlog-item.js select; selection JSON on stdin')) + '\n');
    return 2;
  }
  let result;
  try { result = select(JSON.parse(fs.readFileSync(0, 'utf8'))); }
  catch (error) { result = pending('invalid-request', error.message); }
  process.stdout.write(JSON.stringify(result) + '\n');
  return ['selected', 'candidates', 'empty', 'cancelled'].includes(result.status) ? 0 : 1;
}
if (require.main === module) process.exitCode = main(process.argv.slice(2));
module.exports = { select, main };
