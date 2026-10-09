'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

function run(command, args, cwd, input) {
  if (command === 'azure-sdk') return require('./from-backlog').runAzureSdk(input);
  if (command === 'az') return require('./from-backlog').run(command, args, input);
  const result = spawnSync(command, args, { cwd, input, encoding: 'utf8', shell: false, maxBuffer: 32 * 1024 * 1024 });
  if (result.error || result.status !== 0) throw new Error(`${command}: ${result.error?.message || result.stderr || `exit ${result.status}`}`);
  return result.stdout;
}

// Both scp-style SSH and URL remotes are data, never executable text.
function address(value) {
  if (typeof value !== 'string') return null;
  const scp = /^(?:[^@/:]+@)?([^/:]+):([^\s]+)$/.exec(value);
  try {
    const url = scp && !value.includes('://') ? { hostname: scp[1], pathname: scp[2] } : new URL(value);
    return { host: url.hostname.toLowerCase(), repository: url.pathname.replace(/^\/+|\/+$/g, '').replace(/\.git$/, '') };
  } catch { return null; }
}

function detect(value, registry, adapterLoader = loadAdapter) {
  const parsed = address(value);
  if (!parsed) return [];
  const classified = registry.providers.filter(entry => entry.classification === 'provider' && adapterLoader(entry).classify(value) === 'match');
  if (classified.length) return classified.map(entry => ({ provider: entry.id, repository: value }));
  const hosted = registry.providers.filter(entry => entry.hosts?.includes(parsed.host));
  const entries = hosted.length ? hosted : registry.providers.filter(entry => entry.resolution === 'provider' && entry.classification !== 'provider');
  return entries.map(entry => ({ provider: entry.id, repository: entry.resolution === 'provider' ? value : parsed.repository }));
}

function loadAdapter(entry) {
  if (!/^to-backlog-[a-z0-9-]+\.js$/.test(entry.adapter)) throw new Error('Invalid registry adapter');
  validateInstructions(entry);
  return require(path.join(__dirname, entry.adapter));
}

function validateInstructions(entry) {
  if (!/^providers\/[a-z0-9-]+\.md$/.test(entry.instructions)) throw new Error('Invalid provider instruction reference');
}

function resolve({ explicit = {}, config = {}, remotes = [] }, registry, io = {}) {
  for (const input of [explicit, config]) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Destination must be an object');
    for (const [key, value] of Object.entries(input)) {
      if (!['provider', 'repository', 'project', 'organization'].includes(key) || typeof value !== 'string' || !value.trim()) throw new Error(`Invalid destination field: ${key}`);
    }
  }
  if (explicit.provider) {
    const entry = registry.providers.find(item => item.id === explicit.provider);
    if (!entry?.capabilities.includes('publish')) return { status: 'unsupported', provider: explicit.provider };
  }
  const selected = { ...config, ...explicit };
  const detectAddress = value => detect(value, registry, io.loadAdapter || loadAdapter);
  const explicitAddress = detectAddress(explicit.repository);
  let provider = explicit.provider || (explicitAddress.length === 1 ? explicitAddress[0].provider : config.provider);
  let repository = selected.repository;
  const fromAddress = repository ? detectAddress(repository) : [];
  if (!provider && fromAddress.length === 1) provider = fromAddress[0].provider;
  const delegated = registry.providers.find(entry => entry.id === provider && entry.resolution === 'provider');
  if (delegated) {
    if (!delegated.capabilities.includes('publish')) return { status: 'unsupported', provider };
    validateInstructions(delegated);
    const result = (io.loadAdapter || loadAdapter)(delegated).resolve({ explicit, config, remotes }, io);
    return { ...result, provider, instructions: delegated.instructions, adapter: delegated.adapter };
  }
  if (address(repository) && !fromAddress.length) return { status: 'needs_input', reason: 'unrecognized-destination', repository };
  if (fromAddress.length === 1) repository = fromAddress[0].repository;
  if (provider && fromAddress.length && !fromAddress.some(item => item.provider === provider)) {
    return { status: 'needs_input', reason: 'provider-destination-conflict' };
  }
  const candidates = [...new Map(remotes.flatMap(detectAddress).map(item => [`${item.provider}:${item.repository}`, item])).values()];
  if (!provider) {
    const unknownHosts = [...new Set(remotes.filter(value => !detectAddress(value).length).map(address).filter(Boolean).map(parsed => parsed.host))];
    if (unknownHosts.length) return { status: 'needs_input', reason: 'provider-ambiguous', candidates, unknownHosts };
    const providers = [...new Set(candidates.map(item => item.provider))];
    if (providers.length !== 1) return { status: 'needs_input', reason: 'provider-ambiguous', candidates };
    provider = providers[0];
  }
  const entry = registry.providers.find(item => item.id === provider);
  if (!entry || !entry.capabilities.includes('publish')) return { status: 'unsupported', provider };
  validateInstructions(entry);
  if (entry.resolution === 'provider') {
    const result = (io.loadAdapter || loadAdapter)(entry).resolve({ explicit, config, remotes }, io);
    return { ...result, provider, instructions: entry.instructions, adapter: entry.adapter };
  }
  if (!repository) {
    const repos = candidates.filter(item => item.provider === provider);
    if (repos.length !== 1) return { status: 'needs_input', reason: 'repository-ambiguous', provider, candidates: repos };
    repository = repos[0].repository;
  }
  return { status: 'resolved', provider, repository, project: selected.project, instructions: entry.instructions, adapter: entry.adapter };
}

function main(argv) {
  try {
    const [operation, registryPath] = argv;
    if (!['resolve', 'resolve-origin', 'query', 'publish', 'recover', 'read-update', 'query-update', 'update', 'recover-update'].includes(operation) || !registryPath || argv.length !== 2) {
      throw new Error('Usage: node to-backlog.js resolve|resolve-origin|query|publish|recover|read-update|query-update|update|recover-update <registry.json>; JSON request on stdin; JSON result on stdout');
    }
    const request = JSON.parse(fs.readFileSync(0, 'utf8'));
    const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
    const cwd = process.cwd();
    const io = { run: (command, args, input) => run(command, args, cwd, input) };
    let result;
    if (operation === 'resolve-origin') {
      const candidates = request.provider ? registry.providers.filter(entry => entry.id === request.provider)
        : typeof request.reference === 'string' && request.reference.startsWith('/') && !request.reference.startsWith('//')
          ? registry.providers.filter(entry => entry.originDomainless)
          : detect(request.reference, registry).map(row => registry.providers.find(entry => entry.id === row.provider));
      if (candidates.length !== 1 || !candidates[0].capabilities.includes('read-update')) result = { status: 'needs_input', reason: 'origin-provider-ambiguous' };
      else {
        const entry = candidates[0];
        if (!/^providers\/[a-z0-9-]+\.md$/.test(entry.updateInstructions)) throw new Error('Invalid update instruction reference');
        result = { status: 'resolved', provider: entry.id, instructions: entry.updateInstructions, adapter: entry.adapter };
      }
    } else if (operation === 'resolve') {
      let config = {};
      try { config = JSON.parse(fs.readFileSync(path.join(cwd, '.to-backlog.json'), 'utf8')); }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
      if (config.type !== undefined) throw new Error('Work-item type is invocation-scoped, not configuration');
      result = resolve({ explicit: request.explicit, config }, registry, io);
      // Unsupported explicit providers and complete destinations need no Git.
      if (result.status === 'needs_input' && ['provider-ambiguous', 'repository-ambiguous', 'destination-ambiguous'].includes(result.reason)) {
        const remotes = run('git', ['remote', '-v'], cwd).split(/\r?\n/).map(line => line.split(/\s+/)[1]).filter(Boolean);
        result = resolve({ explicit: request.explicit, config, remotes }, registry, io);
      }
    } else {
      const entry = registry.providers.find(item => item.id === request.provider);
      if (!entry?.capabilities.includes(operation)) result = { status: 'unsupported', provider: request.provider };
      else {
        result = loadAdapter(entry)[operation](request, io);
      }
    }
    process.stdout.write(JSON.stringify(result) + '\n');
    return ['resolved', 'ready', 'complete', 'no_changes'].includes(result.status) ? 0 : 1;
  } catch (error) {
    process.stdout.write(JSON.stringify({ status: 'failure_before_publication', message: error.message }) + '\n');
    return 2;
  }
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));
module.exports = { run, address, detect, resolve, main };
