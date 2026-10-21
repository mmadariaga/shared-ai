'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const projectSettings = require('./project-settings');

function fault(reason, message) {
  return Object.assign(new Error(message), { reason });
}

function loadAdapter(entry) {
  if (!/^from-backlog-[a-z0-9-]+\.js$/.test(entry.adapter) || !/^providers\/[a-z0-9-]+\.md$/.test(entry.instructions)) throw fault('invalid-registry', 'Invalid provider reference');
  return require(path.join(__dirname, entry.adapter));
}

const BARE_REFERENCE = /^#?([1-9][0-9]*)$/;

// A bare number names no host, so the configured provider supplies the missing context:
// the provider's own context (Azure DevOps) or the repository of the Git remotes.
function remoteRepositories(entry, registry, io) {
  let output = '';
  try { output = io.run('git', ['remote', '-v']); } catch { return []; }
  const others = registry.providers.filter(item => item.id !== entry.id).flatMap(item => item.hosts || []);
  const found = new Map();
  for (const line of output.split(/\r?\n/)) {
    const value = line.trim().split(/\s+/)[1];
    const scp = value && !value.includes('://') ? /^(?:[^@/:]+@)?([^/:]+):(.+)$/.exec(value) : null;
    let host, protocol = 'https:', pathname;
    try {
      if (scp) [host, pathname] = [scp[1], scp[2]];
      else if (value) { const url = new URL(value); [host, pathname] = [/^https?:$/.test(url.protocol) ? url.host : url.hostname, url.pathname]; if (/^https?:$/.test(url.protocol)) protocol = url.protocol; }
    } catch { continue; }
    const repository = pathname?.replace(/^\/+|\/+$/g, '').replace(/\.git$/, '');
    const name = host?.toLowerCase().split(':')[0];
    if (!repository || !repository.includes('/') || (entry.hosts ? !entry.hosts.includes(name) : others.includes(name))) continue;
    found.set(`${host.toLowerCase()}/${repository}`, { host, protocol, repository });
  }
  return [...found.values()];
}

function configuredReference(number, entry, registry, adapter, io) {
  if (entry.classification === 'provider') {
    const { organization, project } = io.configuredDestination || {};
    return organization && project ? `${organization.replace(/\/+$/, '')}/${encodeURIComponent(project)}/_workitems/edit/${number}` : String(number);
  }
  const repositories = remoteRepositories(entry, registry, io);
  if (repositories.length !== 1) return null;
  const { host, protocol, repository } = repositories[0];
  if (entry.resolution === 'provider') return `${protocol}//${host}/${repository}/-/issues/${number}`;
  return `/${repository}/issues/${number}`;
}

// E6: the configured backlog provider decides a bare `N` or `#N`.
function resolveBare(number, registry, readable, getAdapter, io) {
  const entry = readable.find(item => item.id === io.configuredProvider);
  if (!entry) throw fault('provider-destination-conflict', `The configured backlog provider ${io.configuredProvider} does not accept this issue reference`);
  const adapter = getAdapter(entry);
  if (entry.classification === 'provider' && adapter.classify(String(number)) !== 'match') throw fault('provider-destination-conflict', `The configured backlog provider ${io.configuredProvider} does not accept this issue reference`);
  const value = configuredReference(number, entry, registry, adapter, io);
  if (value === null) return { status: 'needs_input', reason: 'context-ambiguous', provider: entry.id, message: 'Supply a complete issue URL; the Git remotes name no single repository for this provider' };
  const resolved = entry.resolution === 'provider' ? adapter.resolve(value, io) : { status: 'resolved', ...adapter.normalize(value) };
  return { ...resolved, provider: entry.id, instructions: entry.instructions, adapter: entry.adapter, settingApplied: true };
}

function resolve(reference, registry, io = {}) {
  if (typeof reference !== 'string' || !reference.trim()) throw fault('invalid-reference', 'Supply a complete issue URL or /owner/repo/issues/123');
  const value = reference.trim();
  const bare = BARE_REFERENCE.exec(value);
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
  if (bare && io.configuredProvider) return resolveBare(Number(bare[1]), registry, readable, getAdapter, io);
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
  let entries = (matched.length ? matched : candidates.filter(candidate => candidate.classification === 'fallback')).map(candidate => candidate.entry);
  if (parseError && !entries.length) throw parseError;
  // The configured provider only breaks ties among fallback candidates; a full URL's positive match wins.
  let settingApplied = false;
  if (!matched.length && entries.length && io.configuredProvider) {
    const configured = entries.filter(entry => entry.id === io.configuredProvider);
    if (!configured.length) throw fault('provider-destination-conflict', `The configured backlog provider ${io.configuredProvider} does not accept this issue reference`);
    settingApplied = entries.length > 1;
    entries = configured;
  }
  if (!entries.some(entry => entry.resolution === 'provider') && url && (url.protocol !== 'https:' || url.username || url.password || url.port)) throw fault('invalid-reference', 'Use an HTTPS issue URL without credentials or a custom port');
  if (entries.length !== 1) throw fault('unsupported-provider', readable.some(entry => entry.resolution === 'provider')
    ? 'The issue reference does not select exactly one registered provider; supply a supported, unambiguous reference'
    : 'Only github.com issues and /owner/repo/issues/123 are supported');
  const entry = entries[0];
  const adapter = getAdapter(entry);
  const resolved = entry.resolution === 'provider' ? adapter.resolve(value, io) : { status: 'resolved', ...adapter.normalize(value) };
  const settingOverridden = Boolean(matched.length && io.configuredProvider && entry.id !== io.configuredProvider);
  return { ...resolved, provider: entry.id, instructions: entry.instructions, adapter: entry.adapter, ...(settingApplied ? { settingApplied } : {}), ...(settingOverridden ? { settingOverridden } : {}) };
}

function azureRuntime() {
  // Invoke the MSI launcher's Python directly, without cmd.exe interpreting
  // project names or continuation tokens as shell syntax.
  if (process.platform === 'win32') {
    const located = spawnSync('where.exe', ['az'], { encoding: 'utf8', shell: false });
    const launcher = located.stdout?.trim().split(/\r?\n/).find(file => /\.(?:exe|cmd)$/i.test(file));
    if (!launcher) throw fault('tool-unavailable', 'Azure CLI executable not found');
    if (/\.cmd$/i.test(launcher)) {
      const python = path.resolve(path.dirname(launcher), '..', 'python.exe');
      if (!fs.existsSync(python) || !/-IBm azure\.cli/.test(fs.readFileSync(launcher, 'utf8'))) throw fault('tool-unavailable', 'Unsupported Azure CLI launcher; a direct executable or standard Windows MSI installation is required');
      return { command: python, prefix: ['-IBm', 'azure.cli'], python };
    }
    return { command: launcher, prefix: [] };
  }
  return { command: 'az', prefix: [] };
}

function run(command, args, input) {
  const azure = command === 'az';
  if (azure) {
    const runtime = azureRuntime();
    command = runtime.command;
    args = [...runtime.prefix, ...args];
  }
  const result = spawnSync(command, args, { input, encoding: 'utf8', shell: false, maxBuffer: 64 * 1024 * 1024, ...(azure ? { env: { ...process.env, AZURE_EXTENSION_USE_DYNAMIC_INSTALL: 'no' } } : {}) });
  if (result.error || result.status !== 0) throw fault('retrieval-failed', `${command}: ${result.error?.message || result.stderr || `exit ${result.status}`}. Content was not loaded completely.`);
  return result.stdout;
}

// Execute the installed CLI extension's own authenticated SDK. invoke chooses
// by resource name and cannot distinguish the two WorkItems location IDs or
// reach the repository-scoped pull-request location. `client` is location|wit|git|work.
const SDK_SCRIPT = `import sys, json
from urllib.parse import quote
request = json.loads(sys.stdin.buffer.read().decode('utf-8'))
sys.path.insert(0, request.pop('extension'))
from azext_devops.dev.common.services import get_work_item_tracking_client, get_location_client, get_git_client
if request['client'] == 'work':
    from azext_devops.dev.common.services import get_work_client
    client = get_work_client(request['organization'])
else:
    client = {'location': get_location_client, 'wit': get_work_item_tracking_client, 'git': get_git_client}[request['client']](request['organization'])
routes = {k: quote(str(v), safe='') for k, v in request['route'].items()}
# The SDK's service errors do not carry the HTTP status; record it where the SDK raises them.
seen = []
handle = getattr(client, '_handle_error', None)
if handle:
    def record(request_message, response):
        seen.append(response.status_code)
        return handle(request_message, response)
    client._handle_error = record
try:
    response = client._send(http_method=request['method'], location_id=request['location'], version=request['version'], route_values=routes, query_parameters=request['query'], content=request.get('body'), media_type=request['mediaType'])
    print(json.dumps(response.json()))
except Exception as error:
    status = seen[0] if seen else getattr(error, 'status_code', None)
    print(json.dumps({'sdk_error': str(error), 'status_code': status}))
`;
function runAzureSdk(input) {
  // Built-in extension show never installs. The installed extension is required
  // even under inherited yes_without_prompt configuration.
  let extension;
  try {
    extension = JSON.parse(run('az', ['extension', 'show', '--name', 'azure-devops', '--output', 'json', '--only-show-errors']));
    if (extension.name !== 'azure-devops' || typeof extension.path !== 'string' || !fs.statSync(extension.path).isDirectory()) throw new Error('Installed extension path is unavailable');
  } catch (error) {
    if (error.reason === 'tool-unavailable' || /ENOENT/.test(error.message)) throw error;
    throw fault('extension-unavailable', `Installed azure-devops extension required; no installation is attempted. ${error.message}`);
  }
  let python = azureRuntime().python;
  if (!python && process.platform !== 'win32') {
    // Official pip/Homebrew launchers name the CLI's interpreter in a shebang.
    // Other packaging must stop, not guess an unrelated system interpreter.
    const launcher = process.env.PATH.split(path.delimiter).map(dir => path.join(dir, 'az')).find(file => fs.existsSync(file));
    const shebang = launcher && /^#!([^\r\n]+)[\r\n]/.exec(fs.readFileSync(fs.realpathSync(launcher), 'utf8'))?.[1];
    if (shebang && /^\/[^\s]*python[0-9.]*$/.test(shebang) && fs.existsSync(shebang)) python = shebang;
  }
  if (!python) throw fault('tool-unavailable', 'This publication path requires the existing Azure CLI Python launcher (standard Windows MSI or absolute Python shebang); no interpreter is installed or guessed');
  const request = { ...JSON.parse(input), extension: extension.path };
  const result = spawnSync(python, ['-IBc', SDK_SCRIPT], { input: JSON.stringify(request), encoding: 'utf8', shell: false, maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, AZURE_EXTENSION_USE_DYNAMIC_INSTALL: 'no' } });
  if (result.error || result.status !== 0) throw fault('retrieval-failed', result.error?.message || result.stderr || `Azure SDK exit ${result.status}`);
  return result.stdout;
}

function main(argv) {
  try {
    const [operation, registryPath] = argv;
    if (!['resolve', 'read'].includes(operation) || !registryPath || argv.length !== 2) throw fault('usage', 'Usage: node from-backlog.js resolve|read <registry.json>; JSON {reference} on stdin');
    const request = JSON.parse(fs.readFileSync(0, 'utf8'));
    const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
    const settings = projectSettings.readBacklog({ cwd: process.cwd(), providerIds: registry.providers.filter(entry => entry.capabilities.includes('read')).map(entry => entry.id) });
    const { settingApplied, settingOverridden, ...resolved } = resolve(request.reference, registry, { run, configuredProvider: settings.config.provider, configuredDestination: settings.config });
    const adapter = resolved.status === 'resolved' ? require(path.join(__dirname, resolved.adapter)) : null;
    const result = operation === 'resolve' || resolved.status !== 'resolved' ? resolved : (adapter.readSet || adapter.read)(resolved, { run });
    const lines = [...(settings.notices || []), ...(settingApplied ? [projectSettings.notice('provider', settings.config.provider)] : []),
      ...(settingOverridden ? [`${projectSettings.notice('provider', settings.config.provider)} is overridden by the issue URL, which selects ${resolved.provider}`] : [])];
    process.stdout.write(JSON.stringify(projectSettings.report(result, { warnings: settings.warnings, notices: lines })) + '\n');
    return ['resolved', 'complete'].includes(result.status) ? 0 : 1;
  } catch (error) {
    process.stdout.write(JSON.stringify({ status: 'error', reason: error.reason || 'retrieval-failed', message: error.message }) + '\n');
    return 2;
  }
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));
module.exports = { resolve, run, main, runAzureSdk, SDK_SCRIPT };
