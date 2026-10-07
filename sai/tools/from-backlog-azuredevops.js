'use strict';

function fault(reason, message) { return Object.assign(new Error(message), { reason }); }
const positive = value => /^[1-9][0-9]*$/.test(String(value)) && Number.isSafeInteger(Number(value));
const segment = value => typeof value === 'string' && !!value.trim() && !/[\x00-\x1f\x7f/\\]/.test(value) && !['.', '..'].includes(value);

function address(value) {
  let url;
  try { url = new URL(value); } catch { return null; }
  if (/[\x00-\x1f\x7f\\]/.test(value)) throw fault('invalid-reference', 'Malformed Azure DevOps URL');
  if (/(?:^|\/)(?:\.|%2e){1,2}(?:\/|$)/i.test(value) || /%2f|%5c/i.test(url.pathname)) throw fault('invalid-reference', 'Malformed Azure DevOps path');
  let organization, parts;
  try { parts = url.pathname.split('/').filter(Boolean).map(part => decodeURIComponent(part)); }
  catch { throw fault('invalid-reference', 'Malformed Azure DevOps path encoding'); }
  if (url.hostname.toLowerCase() === 'dev.azure.com') organization = parts.shift();
  else {
    const match = /^([a-z0-9][a-z0-9-]*)\.visualstudio\.com$/i.exec(url.hostname);
    if (!match) return null;
    organization = match[1];
    if (parts[0] === 'DefaultCollection') parts.shift();
  }
  if (url.protocol !== 'https:' || url.port || url.password || !/^[a-z0-9][a-z0-9-]*$/i.test(organization || '')) throw fault('invalid-reference', 'Use an Azure DevOps Services HTTPS link without credentials or a custom port');
  return { organization: `https://dev.azure.com/${organization}`, parts, username: url.username };
}

function classify(value) {
  if (positive(value)) return 'match';
  try {
    const host = new URL(value).hostname.toLowerCase();
    return host === 'dev.azure.com' || /^[a-z0-9][a-z0-9-]*\.visualstudio\.com$/.test(host) ? 'match' : null;
  } catch { return null; }
}

function execute(io, args) {
  try { return io.run('az', args); }
  catch (error) {
    const message = error.message || '';
    const reason = error.reason === 'tool-unavailable' || /ENOENT|not recognized|not found|cannot find.*az/i.test(message) ? 'tool-unavailable'
      : /extension.*not installed|az extension add|not in the.*command group/i.test(message) ? 'extension-unavailable'
        : /az login|az devops login|authentication|credentials|token.*expired/i.test(message) ? 'authentication-failed' : 'inaccessible-item';
    throw fault(reason, `Azure DevOps read failed (${reason}). ${message}`);
  }
}

function context(io) {
  const organizations = new Map();
  const add = (organization, project) => {
    const key = organization.toLowerCase();
    if (!organizations.has(key)) organizations.set(key, { organization, projects: new Set() });
    if (project) organizations.get(key).projects.add(project);
  };
  const defaults = execute(io, ['devops', 'configure', '--list', '--only-show-errors']);
  const organization = /^\s*organization\s*=\s*(.+?)\s*$/im.exec(defaults)?.[1];
  const project = /^\s*project\s*=\s*(.+?)\s*$/im.exec(defaults)?.[1];
  if (organization) {
    const parsed = address(organization);
    if (!parsed || parsed.parts.length || parsed.username) throw fault('invalid-reference', 'Existing organization context is not Azure DevOps Services');
    add(parsed.organization, project);
  }
  let remotes = '';
  try { remotes = io.run('git', ['remote', '-v']); } catch { /* No repository context is available. */ }
  for (const line of remotes.split('\n')) {
    const value = line.trim().split(/\s+/)[1];
    if (!value) continue;
    const ssh = /^(?:git@ssh\.dev\.azure\.com:v3\/|ssh:\/\/git@ssh\.dev\.azure\.com\/v3\/)([^/]+)\/([^/]+)\/[^/]+$/.exec(value);
    const parsed = ssh ? address(`https://dev.azure.com/${ssh[1]}/${ssh[2]}/_git/repository`) : address(value);
    if (parsed && parsed.parts.length === 3 && parsed.parts[1] === '_git' && segment(parsed.parts[0])) add(parsed.organization, parsed.parts[0]);
  }
  if (organizations.size !== 1) return null;
  const selected = [...organizations.values()][0];
  return { organization: selected.organization, ...(selected.projects.size === 1 ? { project: [...selected.projects][0] } : {}) };
}

function resolve(value, io) {
  if (positive(value)) {
    const selected = context(io);
    return selected ? { status: 'resolved', ...selected, number: Number(value) }
      : { status: 'needs_input', reason: 'context-ambiguous', message: 'Supply a complete Azure DevOps work-item link; no unambiguous organization is available' };
  }
  const parsed = address(value);
  if (!parsed || parsed.username || parsed.parts.length !== 4 || !segment(parsed.parts[0]) || parsed.parts[1] !== '_workitems' || parsed.parts[2] !== 'edit' || !positive(parsed.parts[3]) || /\/\/{1,}/.test(new URL(value).pathname)) throw fault('invalid-reference', 'Supply a complete Azure DevOps Services project/_workitems/edit/ID link');
  const project = parsed.parts[0], number = Number(parsed.parts[3]);
  return { status: 'resolved', organization: parsed.organization, project, number, url: `${parsed.organization}/${encodeURIComponent(project)}/_workitems/edit/${number}` };
}

function read(reference, io) {
  let item;
  const comments = [];
  try {
    const data = JSON.parse(execute(io, ['boards', 'work-item', 'show', '--id', String(reference.number), '--organization', reference.organization, '--detect', 'false', '--output', 'json', '--only-show-errors']));
    const fields = data.fields;
    if (data.id !== reference.number || !fields || !segment(fields['System.TeamProject']) || ['System.Title', 'System.State', 'System.WorkItemType'].some(key => typeof fields[key] !== 'string') || (fields['System.Description'] != null && typeof fields['System.Description'] !== 'string')) throw fault('retrieval-failed', 'Incomplete Azure DevOps work-item response');
    const project = fields['System.TeamProject'];
    if (reference.project && reference.project.toLowerCase() !== project.toLowerCase()) throw fault('retrieval-failed', 'Work-item project does not match the resolved project');
    const description = fields['System.Description'] ?? '';
    item = { provider: 'azuredevops', organization: reference.organization, project, number: data.id, url: `${reference.organization}/${encodeURIComponent(project)}/_workitems/edit/${data.id}`, title: fields['System.Title'], state: fields['System.State'], type: fields['System.WorkItemType'], description, description_format: 'html', description_missing: !description.trim() };
    const seenTokens = new Set(), seenComments = new Set();
    let token, total;
    for (;;) {
      const args = ['devops', 'invoke', '--organization', item.organization, '--area', 'wit', '--resource', 'comments', '--route-parameters', `project=${project}`, `workItemId=${item.number}`, '--query-parameters', '$top=100'];
      if (token !== undefined) args.push(`continuationToken=${token}`);
      args.push('--http-method', 'GET', '--api-version', '7.1-preview', '--detect', 'false', '--output', 'json', '--only-show-errors');
      const page = JSON.parse(execute(io, args));
      if (!Array.isArray(page.comments) || !Number.isSafeInteger(page.count) || page.count !== page.comments.length || !Number.isSafeInteger(page.totalCount) || page.totalCount < 0 || (total !== undefined && page.totalCount !== total)) throw fault('retrieval-failed', 'Incomplete or changing Azure DevOps comments response');
      total = page.totalCount;
      for (const comment of page.comments) {
        if (!positive(comment?.id) || typeof comment.text !== 'string' || (comment.workItemId !== undefined && comment.workItemId !== item.number) || seenComments.has(comment.id) || (comment.createdBy != null && typeof comment.createdBy.displayName !== 'string')) throw fault('retrieval-failed', 'Incomplete or repeated Azure DevOps comment');
        seenComments.add(comment.id);
        comments.push({ id: comment.id, body: comment.text, format: comment.format || 'html', author: comment.createdBy?.displayName ?? null, url: `${item.url}#comment-${comment.id}` });
      }
      const next = page.continuationToken;
      if (next == null || next === '') {
        if (comments.length !== total) throw fault('retrieval-failed', 'Azure DevOps comments ended before the available total');
        return { status: 'complete', item, comments };
      }
      if (!['string', 'number'].includes(typeof next) || !String(next).length || /[\x00-\x1f]/.test(String(next)) || seenTokens.has(String(next)) || !page.comments.length) throw fault('retrieval-failed', 'Invalid or repeated Azure DevOps comments continuation');
      token = String(next);
      seenTokens.add(token);
    }
  } catch (error) {
    return { status: item ? 'incomplete' : 'error', reason: error.reason || 'retrieval-failed', message: error.message, ...(item ? { item, comments } : {}) };
  }
}

module.exports = { classify, resolve, read };
