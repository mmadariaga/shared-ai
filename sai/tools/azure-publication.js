'use strict';

// Shared Services-only identity and CLI transport. The import reader owns URL
// interpretation; all Azure execution uses its authenticated Windows-safe path.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { address, segment } = require('./from-backlog-azuredevops');

function repositoryAddress(value) {
  if (typeof value !== 'string') return null;
  const ssh = /^(?:git@ssh\.dev\.azure\.com:v3\/|ssh:\/\/git@ssh\.dev\.azure\.com(?::22)?\/v3\/)([^/]+)\/([^/]+)\/([^/]+)$/i.exec(value);
  const oldSsh = /^(?:([a-z0-9-]+)@vs-ssh\.visualstudio\.com:v3\/|ssh:\/\/([a-z0-9-]+)@vs-ssh\.visualstudio\.com(?::22)?\/v3\/)([^/]+)\/([^/]+)\/([^/]+)$/.exec(value);
  if (oldSsh && !equal(oldSsh[1] || oldSsh[2], oldSsh[3])) throw new Error('Conflicting legacy SSH organization');
  const legacy = /^(?:[^@/:]+@)?([a-z0-9-]+)\.visualstudio\.com:v3\/([^/]+)\/([^/]+)\/([^/]+)$/.exec(value);
  if (legacy && !oldSsh && legacy[1].toLowerCase() !== legacy[2].toLowerCase()) throw new Error('Conflicting legacy SSH organization');
  const parsed = address(ssh ? `https://dev.azure.com/${ssh[1]}/${ssh[2]}/_git/${ssh[3]}` : oldSsh ? `https://dev.azure.com/${oldSsh[3]}/${oldSsh[4]}/_git/${oldSsh[5]}` : legacy ? `https://dev.azure.com/${legacy[2]}/${legacy[3]}/_git/${legacy[4]}` : value);
  if (!parsed) return null;
  const [project, marker, repository] = parsed.parts;
  if (parsed.parts.length !== 3 || marker !== '_git' || !segment(project) || !segment(repository)) return null;
  return { organization: parsed.organization, project, repository, url: `${parsed.organization}/${encodeURIComponent(project)}/_git/${encodeURIComponent(repository)}` };
}
const equal = (a, b) => String(a).toLowerCase() === String(b).toLowerCase();
function resolve({ explicit = {}, config = {}, remotes = [] }, requireRepository = false) {
  if (config.type !== undefined) throw new Error('Work-item type is invocation-scoped, not configuration');
  const selected = {};
  for (const input of [config, explicit]) {
    const repository = input.repository && repositoryAddress(input.repository);
    const projectAddress = input.repository && !repository && address(input.repository);
    const parsed = repository || (projectAddress && !projectAddress.username && projectAddress.parts.length === 1 && segment(projectAddress.parts[0])
      ? { organization: projectAddress.organization, project: projectAddress.parts[0] } : null);
    if (input.repository && /:\/\/|@|:v3\//.test(input.repository) && !parsed) throw new Error('Unsupported destination: Azure DevOps Services only');
    if (parsed) Object.assign(selected, parsed);
    if (input.organization) {
      const org = address(input.organization);
      if (!org || org.parts.length || org.username) throw new Error('Azure DevOps Services organization URL required');
      if (parsed && !equal(org.organization, parsed.organization)) throw new Error('Incompatible organization and repository');
      selected.organization = org.organization;
    }
    if (input.project) {
      if (!segment(input.project) || (parsed && !equal(input.project, parsed.project))) throw new Error('Incompatible or invalid project');
      selected.project = input.project;
    }
    if (input.repository && !parsed) {
      if (!segment(input.repository)) throw new Error('Invalid repository');
      selected.repository = input.repository;
    }
  }
  const complete = selected.organization && selected.project && (!requireRepository || selected.repository);
  const candidates = [...new Map((complete ? [] : remotes).map(repositoryAddress).filter(Boolean).map(row => [row.url.toLowerCase(), row])).values()]
    .filter(row => ['organization', 'project', ...(requireRepository ? ['repository'] : [])].every(key => !selected[key] || equal(selected[key], row[key])));
  for (const key of ['organization', 'project', ...(requireRepository ? ['repository'] : [])]) {
    if (selected[key]) continue;
    const values = [...new Set(candidates.map(row => row[key]))];
    if (values.length === 1) selected[key] = values[0];
  }
  if (!selected.organization || !selected.project || (requireRepository && !selected.repository)) return { status: 'needs_input', reason: 'destination-ambiguous', candidates };
  const url = `${selected.organization}/${encodeURIComponent(selected.project)}`;
  return { status: 'resolved', ...selected, repository: requireRepository ? `${url}/_git/${encodeURIComponent(selected.repository)}` : url };
}
function destination(value, project) {
  const repo = repositoryAddress(value);
  if (repo) {
    if (project && !equal(project, repo.project)) throw new Error('Incompatible project');
    return repo;
  }
  const parsed = address(value);
  if (!parsed || parsed.username || parsed.parts.length !== 1 || !segment(parsed.parts[0]) || (project && !equal(project, parsed.parts[0]))) throw new Error('Azure DevOps Services project URL required');
  return { organization: parsed.organization, project: parsed.parts[0] };
}
function api(target, area, resource, route, io, method = 'GET', body, query = {}, patch = false) {
  let directory, file;
  try {
  if ((area === 'wit' && resource === 'workitems') || (area === 'location' && resource === 'connectionData')) {
    const identity = area === 'location';
    const location = identity ? '00d9565f-ed9c-4a06-9a50-00e7896ccab4'
      : route.type !== undefined ? '62d3d110-0047-428c-ad3c-4fe872c91c74' : '72c7ddf8-2cdc-4f60-90cd-ab71c14a399b';
    const result = JSON.parse(io.run('azure-sdk', [], JSON.stringify({ organization: target.organization, identity, location,
      version: identity ? '5.0-preview.1' : '7.1-preview.3', method, route, body, query,
      mediaType: patch ? 'application/json-patch+json' : 'application/json' })));
    if (result.sdk_error) throw new Error(`${result.status_code ? `HTTP status ${result.status_code}: ` : ''}${result.sdk_error}`);
    return result;
  }
  const args = ['devops', 'invoke', '--organization', target.organization, '--area', area, '--resource', resource,
    '--http-method', method, '--api-version', '7.1', '--detect', 'false', '--output', 'json', '--only-show-errors'];
  const routes = Object.entries(route).map(([key, value]) => `${key}=${value}`);
  if (routes.length) args.push('--route-parameters', ...routes);
  if (Object.keys(query).length) args.push('--query-parameters', ...Object.entries(query).map(([key, value]) => `${key}=${value}`));
  if (body !== undefined) {
    // invoke accepts a JSON file, not stdin. Keep payloads private and outside Git.
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'azure-publication-'));
    if (process.platform !== 'win32') fs.chmodSync(directory, 0o700);
    file = path.join(directory, 'payload.json');
    fs.writeFileSync(file, JSON.stringify(body), { mode: 0o600, flag: 'wx' });
    args.push('--in-file', file, '--encoding', 'utf-8', '--media-type', patch ? 'application/json-patch+json' : 'application/json');
  }
  return JSON.parse(io.run('az', args));
  }
  catch (error) {
    const text = error.message || '';
    const reason = ['tool-unavailable', 'extension-unavailable'].includes(error.reason) ? error.reason
      : /ENOENT|not found|not recognized|tool-unavailable/i.test(text) ? 'tool-unavailable'
      : /extension.*not installed|az extension add|not in the.*command group/i.test(text) ? 'extension-unavailable'
        : /az login|az devops login|authentication|credentials|expired/i.test(text) ? 'authentication-failed' : 'azure-request-failed';
    throw Object.assign(new Error(`Azure DevOps ${reason}: ${text}. Publication does not install tools or change credentials or defaults.`), {
      reason, rejected: /(?:HTTP(?: status)?|StatusCode|status code)\s*[:=]?\s*(?:400|401|403|404|409|412)\b/i.test(text)
    });
  } finally {
    // Only this call's transport scratch is removed, never recovery receipts.
    // Cleanup errors cannot turn a possibly submitted write into a safe retry.
    if (file) { try { fs.unlinkSync(file); } catch (error) { if (error.code !== 'ENOENT') process.stderr.write('Azure transport payload cleanup failed; retain the publication outcome.\n'); } }
    if (directory) { try { fs.rmdirSync(directory); } catch (error) { process.stderr.write('Azure transport directory cleanup failed; retain the publication outcome.\n'); } }
  }
}
function inspect(value, io, project) {
  const target = destination(value, project);
  const row = api(target, 'core', 'projects', { projectId: target.project }, io);
  const actor = api(target, 'location', 'connectionData', {}, io).authenticatedUser?.id;
  if (typeof row.id !== 'string' || !segment(row.name) || !equal(row.name, target.project) || !['private', 'public'].includes(row.visibility) || typeof actor !== 'string' || !actor) throw new Error('Incomplete Azure destination or authenticated identity');
  return { ...target, project: row.name, projectId: row.id, visibility: row.visibility, actor, url: `${target.organization}/${encodeURIComponent(row.name)}` };
}
module.exports = { repositoryAddress, resolve, destination, api, inspect, equal };
