'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

function run(command, args, cwd, input) {
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

function detect(value, registry) {
  const parsed = address(value);
  if (!parsed) return [];
  return registry.providers.filter(entry => entry.hosts.includes(parsed.host)).map(entry => ({ provider: entry.id, repository: parsed.repository }));
}

function resolve({ explicit = {}, config = {}, remotes = [] }, registry) {
  for (const input of [explicit, config]) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Destination must be an object');
    for (const [key, value] of Object.entries(input)) {
      if (!['provider', 'repository', 'project'].includes(key) || typeof value !== 'string' || !value.trim()) throw new Error(`Invalid destination field: ${key}`);
    }
  }
  if (explicit.provider) {
    const entry = registry.providers.find(item => item.id === explicit.provider);
    if (!entry?.capabilities.includes('publish')) return { status: 'unsupported', provider: explicit.provider };
  }
  const selected = { ...config, ...explicit };
  const explicitAddress = detect(explicit.repository, registry);
  let provider = explicit.provider || (explicitAddress.length === 1 ? explicitAddress[0].provider : config.provider);
  let repository = selected.repository;
  const fromAddress = repository ? detect(repository, registry) : [];
  if (address(repository) && !fromAddress.length) return { status: 'needs_input', reason: 'unrecognized-destination', repository };
  if (!provider && fromAddress.length === 1) provider = fromAddress[0].provider;
  if (fromAddress.length === 1) repository = fromAddress[0].repository;
  if (provider && fromAddress.length && !fromAddress.some(item => item.provider === provider)) {
    return { status: 'needs_input', reason: 'provider-destination-conflict' };
  }
  const candidates = [...new Map(remotes.flatMap(value => detect(value, registry)).map(item => [`${item.provider}:${item.repository}`, item])).values()];
  if (!provider) {
    const unknownHosts = [...new Set(remotes.map(address).filter(parsed => parsed && !registry.providers.some(entry => entry.hosts.includes(parsed.host))).map(parsed => parsed.host))];
    if (unknownHosts.length) return { status: 'needs_input', reason: 'provider-ambiguous', candidates, unknownHosts };
    const providers = [...new Set(candidates.map(item => item.provider))];
    if (providers.length !== 1) return { status: 'needs_input', reason: 'provider-ambiguous', candidates };
    provider = providers[0];
  }
  const entry = registry.providers.find(item => item.id === provider);
  if (!entry || !entry.capabilities.includes('publish')) return { status: 'unsupported', provider };
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
    if (!['resolve', 'query', 'publish', 'recover'].includes(operation) || !registryPath || argv.length !== 2) {
      throw new Error('Usage: node to-backlog.js resolve|query|publish|recover <registry.json>; JSON request on stdin; JSON result on stdout');
    }
    const request = JSON.parse(fs.readFileSync(0, 'utf8'));
    const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
    const cwd = process.cwd();
    let result;
    if (operation === 'resolve') {
      let config = {};
      try { config = JSON.parse(fs.readFileSync(path.join(cwd, '.to-backlog.json'), 'utf8')); }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
      result = resolve({ explicit: request.explicit, config }, registry);
      // Unsupported explicit providers and complete destinations need no Git.
      if (result.status === 'needs_input' && ['provider-ambiguous', 'repository-ambiguous'].includes(result.reason)) {
        const remotes = run('git', ['remote', '-v'], cwd).split(/\r?\n/).map(line => line.split(/\s+/)[1]).filter(Boolean);
        result = resolve({ explicit: request.explicit, config, remotes }, registry);
      }
    } else {
      const entry = registry.providers.find(item => item.id === request.provider);
      if (!entry?.capabilities.includes(operation)) result = { status: 'unsupported', provider: request.provider };
      else {
        if (!/^to-backlog-[a-z0-9-]+\.js$/.test(entry.adapter)) throw new Error('Invalid registry adapter');
        const adapter = require(path.join(__dirname, entry.adapter));
        result = adapter[operation](request, { run: (command, args, input) => run(command, args, cwd, input) });
      }
    }
    process.stdout.write(JSON.stringify(result) + '\n');
    return ['resolved', 'ready', 'complete'].includes(result.status) ? 0 : 1;
  } catch (error) {
    process.stdout.write(JSON.stringify({ status: 'failure_before_publication', message: error.message }) + '\n');
    return 2;
  }
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));
module.exports = { run, address, detect, resolve, main };
