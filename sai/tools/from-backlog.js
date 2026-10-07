'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

function fault(reason, message) {
  return Object.assign(new Error(message), { reason });
}

function loadAdapter(entry) {
  if (!/^from-backlog-[a-z0-9-]+\.js$/.test(entry.adapter) || !/^providers\/[a-z0-9-]+\.md$/.test(entry.instructions)) throw fault('invalid-registry', 'Invalid provider reference');
  return require(path.join(__dirname, entry.adapter));
}

function resolve(reference, registry, io = {}) {
  if (typeof reference !== 'string' || !reference.trim()) throw fault('invalid-reference', 'Supply a complete issue URL or /owner/repo/issues/123');
  const value = reference.trim();
  let host, url, parseError;
  if (value.startsWith('/') && !value.startsWith('//')) host = null;
  else {
    try { url = new URL(value); host = url.hostname.toLowerCase(); }
    catch { parseError = fault('invalid-reference', 'A complete issue reference is required; search and guessing are not supported'); }
  }
  const readable = registry.providers.filter(entry => entry.capabilities.includes('read'));
  const adapters = new Map();
  const getAdapter = entry => {
    if (!adapters.has(entry)) adapters.set(entry, (io.loadAdapter || loadAdapter)(entry));
    return adapters.get(entry);
  };
  const candidates = readable.map(entry => {
    // Classification is pure; only the selected adapter may resolve context.
    if (entry.classification === 'provider') {
      const classification = getAdapter(entry).classify(value);
      if (![null, 'match', 'fallback'].includes(classification)) throw fault('invalid-registry', 'Invalid provider classification');
      return { entry, classification };
    }
    const match = !parseError && (host ? entry.hosts?.includes(host) : entry.domainless);
    return { entry, classification: match ? 'match' : host && entry.resolution === 'provider' ? 'fallback' : null };
  });
  const matched = candidates.filter(candidate => candidate.classification === 'match');
  const entries = (matched.length ? matched : candidates.filter(candidate => candidate.classification === 'fallback')).map(candidate => candidate.entry);
  if (parseError && !entries.length) throw parseError;
  if (!entries.some(entry => entry.resolution === 'provider') && url && (url.protocol !== 'https:' || url.username || url.password || url.port)) throw fault('invalid-reference', 'Use an HTTPS issue URL without credentials or a custom port');
  if (entries.length !== 1) throw fault('unsupported-provider', readable.some(entry => entry.resolution === 'provider')
    ? 'The issue reference does not select exactly one registered provider; supply a supported, unambiguous reference'
    : 'Only github.com issues and /owner/repo/issues/123 are supported');
  const entry = entries[0];
  const adapter = getAdapter(entry);
  const resolved = entry.resolution === 'provider' ? adapter.resolve(value, io) : { status: 'resolved', ...adapter.normalize(value) };
  return { ...resolved, provider: entry.id, instructions: entry.instructions, adapter: entry.adapter };
}

function run(command, args, input) {
  const result = spawnSync(command, args, { input, encoding: 'utf8', shell: false, maxBuffer: 64 * 1024 * 1024 });
  if (result.error || result.status !== 0) throw fault('retrieval-failed', `${command}: ${result.error?.message || result.stderr || `exit ${result.status}`}. Content was not loaded completely.`);
  return result.stdout;
}

function main(argv) {
  try {
    const [operation, registryPath] = argv;
    if (!['resolve', 'read'].includes(operation) || !registryPath || argv.length !== 2) throw fault('usage', 'Usage: node from-backlog.js resolve|read <registry.json>; JSON {reference} on stdin');
    const request = JSON.parse(fs.readFileSync(0, 'utf8'));
    const resolved = resolve(request.reference, JSON.parse(fs.readFileSync(registryPath, 'utf8')), { run });
    const result = operation === 'resolve' || resolved.status !== 'resolved' ? resolved : require(path.join(__dirname, resolved.adapter)).read(resolved, { run });
    process.stdout.write(JSON.stringify(result) + '\n');
    return ['resolved', 'complete'].includes(result.status) ? 0 : 1;
  } catch (error) {
    process.stdout.write(JSON.stringify({ status: 'error', reason: error.reason || 'retrieval-failed', message: error.message }) + '\n');
    return 2;
  }
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));
module.exports = { resolve, run, main };
