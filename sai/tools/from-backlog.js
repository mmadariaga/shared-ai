'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

function fault(reason, message) {
  return Object.assign(new Error(message), { reason });
}

function resolve(reference, registry) {
  if (typeof reference !== 'string' || !reference.trim()) throw fault('invalid-reference', 'Supply a complete issue URL or /owner/repo/issues/123');
  const value = reference.trim();
  let host;
  if (value.startsWith('/') && !value.startsWith('//')) host = null;
  else {
    let url;
    try { url = new URL(value); } catch { throw fault('invalid-reference', 'A complete issue reference is required; search and guessing are not supported'); }
    if (url.protocol !== 'https:' || url.username || url.password || url.port) throw fault('invalid-reference', 'Use an HTTPS issue URL without credentials or a custom port');
    host = url.hostname.toLowerCase();
  }
  const entries = registry.providers.filter(entry => entry.capabilities.includes('read') && (host ? entry.hosts.includes(host) : entry.domainless));
  if (entries.length !== 1) throw fault('unsupported-provider', 'Only github.com issues and /owner/repo/issues/123 are supported');
  const entry = entries[0];
  if (!/^from-backlog-[a-z0-9-]+\.js$/.test(entry.adapter) || !/^providers\/[a-z0-9-]+\.md$/.test(entry.instructions)) throw fault('invalid-registry', 'Invalid provider reference');
  const adapter = require(path.join(__dirname, entry.adapter));
  return { status: 'resolved', provider: entry.id, instructions: entry.instructions, adapter: entry.adapter, ...adapter.normalize(value) };
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
    const resolved = resolve(request.reference, JSON.parse(fs.readFileSync(registryPath, 'utf8')));
    const result = operation === 'resolve' ? resolved : require(path.join(__dirname, resolved.adapter)).read(resolved, { run });
    process.stdout.write(JSON.stringify(result) + '\n');
    return ['resolved', 'complete'].includes(result.status) ? 0 : 1;
  } catch (error) {
    process.stdout.write(JSON.stringify({ status: 'error', reason: error.reason || 'retrieval-failed', message: error.message }) + '\n');
    return 2;
  }
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));
module.exports = { resolve, run, main };
