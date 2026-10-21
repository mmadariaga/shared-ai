'use strict';

const fs = require('node:fs');
const blocks = require('./ready-to-propose');
const identity = require('./backlog-slice-identity');
const { rest } = require('./backlog-assignment-github');
const origin = require('./backlog-set-origin');
function adapter() { return require('./to-backlog-github'); }

function query(request, io) {
  const validation = blocks.validateDependencySet(request.blocks);
  if (!validation.ok) return { status: 'needs_input', reason: 'invalid-dependencies', validation };
  let ready = request.origin ? undefined : adapter().query(request, io), existing;
  if (request.origin) {
    const prepared = origin.prepare('github', request, io, { origin: adapter()['read-origin'], query: adapter().query });
    if (prepared.status !== 'ready') return prepared;
    ({ ready, origin: existing } = prepared);
  }
  if (ready.status !== 'ready') return ready;
  const fields = adapter().api(io, 'query{__type(name:"Issue"){fields{name}}}', {}).__type?.fields;
  if (!Array.isArray(fields)) throw new Error('Hierarchy capability inspection is incomplete');
  const hierarchy = fields.some(field => field.name === 'parent') && fields.some(field => field.name === 'subIssues') ? 'native' : 'written';
  const texts = blocks.extractBlockTexts(request.blocks);
  const slices = validation.order.map(name => {
    const index = validation.blocks.findIndex(block => block.name === name);
    return { change_name: name, title: name, description: texts[index], depends_on: validation.blocks[index].dependencies };
  });
  const dependencies = fields.some(field => field.name === 'blockedBy') ? 'native' : 'written';
  const proposal = { ...ready.proposal, operation: 'set', ...(existing ? { origin: existing } : {}), slices, hierarchy, dependencies, relations: existing ? origin.RELATIONS : 'Append verified issue links and sai-backlog-slices@1 correspondence without altering agreed source content; create separately verified native relations when supported' };
  return { status: 'ready', proposal, confirmation: adapter().digest(proposal) };
}

function allIssues(receipt, io) {
  const [owner, name] = receipt.proposal.repository.split('/');
  return adapter().pages(cursor => adapter().api(io, 'query($owner:String!,$name:String!,$cursor:String){repository(owner:$owner,name:$name){issues(first:100,after:$cursor){nodes{id number url title body author{login}} pageInfo{hasNextPage endCursor}}}}', { owner, name, cursor }), data => data.repository?.issues);
}
function checkDestination(receipt, io) {
  const current = adapter().inspect({ repository: receipt.proposal.repository, project: receipt.proposal.project.url }, io);
  if (current.actor !== receipt.actor || current.repo.id !== receipt.proposal.repositoryId || current.repo.visibility !== receipt.proposal.visibility || current.projects[0]?.id !== receipt.proposal.project.id) throw new Error('Publication identity, destination or visibility changed; stop for renewed review');
}
function relationBody(receipt, index) {
  const upper = index ? null : receipt.proposal.origin?.child_of;
  const slices = receipt.proposal.slices.map((slice, i) => ({ change_name: slice.change_name, issue: receipt.items[i + 1].issue.url, depends_on: slice.depends_on }));
  const value = { version: 1, platform: 'github', hierarchy: receipt.proposal.hierarchy, dependency_representation: receipt.proposal.dependencies, role: index ? 'child' : 'parent', parent: receipt.items[0].issue.url, slices, ...(index ? { change_name: slices[index - 1].change_name } : {}), ...(upper ? { child_of: upper } : {}) };
  const links = index
    ? [`Parent: ${value.parent}`, ...slices[index - 1].depends_on.map(name => `Depends on: ${slices.find(slice => slice.change_name === name).issue}`)]
    : [...slices.map(slice => `Child: ${slice.change_name} — ${slice.issue}`), ...(upper ? origin.upperLinks(upper) : [])];
  return `${receipt.items[index].description}\n\n${links.join('\n')}\n${identity.encode(value)}`;
}
function report(receipt, message) {
  const pending = receipt.items.flatMap((item, index) => [!item.issue && `create:${index}`, !item.project && `project:${index}`, !item.relations && `references:${index}`, index && receipt.proposal.hierarchy === 'native' && !item.hierarchy && `hierarchy:${index}`, ...(index && receipt.proposal.dependencies === 'native' ? receipt.proposal.slices[index - 1].depends_on.filter(name => !item.dependencies?.includes(name)).map(name => `dependency:${index}:${name}`) : [])].filter(Boolean));
  const adopted = receipt.items.find(item => item.origin);
  return { status: pending.length || message ? 'partial_failure' : 'complete', created: receipt.items.filter(item => item.issue && !item.origin).map(item => item.issue), ...(adopted ? { origin: adopted.issue } : {}), pending, representation: { hierarchy: receipt.proposal.hierarchy, dependencies: receipt.proposal.dependencies }, correspondence: pending.length || message ? null : identity.decode(relationBody(receipt, 0)), ...(message ? { message } : {}) };
}
function save(file, receipt) { adapter().save(file, receipt); }

// Every mutation is recorded before execution; lost responses are reconciled by reads.
function perform(receipt, file, io) {
  try {
    checkDestination(receipt, io);
    for (let index = 0; index < receipt.items.length; index++) {
      const item = receipt.items[index];
      if (!item.issue) {
        if (item.attempted) return report(receipt, 'Creation outcome is uncertain. Recover and identify the existing result before continuing.');
        item.baseline = allIssues(receipt, io).map(issue => issue.id);
        item.attempted = true; save(file, receipt);
        const created = adapter().api(io, 'mutation($repo:ID!,$title:String!,$body:String!){createIssue(input:{repositoryId:$repo,title:$title,body:$body}){issue{id number url}}}', { repo: receipt.proposal.repositoryId, title: item.title, body: item.description }).createIssue?.issue;
        if (!created?.id || !created.url || !created.number) throw new Error('Incomplete creation result');
        item.issue = created; save(file, receipt);
        const found = allIssues(receipt, io).find(issue => issue.id === created.id);
        if (!found || found.title !== item.title || found.body !== item.description) throw new Error('Created issue content could not be verified');
      }
      if (!item.project) {
        const { project } = receipt.proposal;
        adapter().ensureMembership(io, project.id, item.issue.id);
        item.project = true; save(file, receipt);
      }
    }
    // An origin is rewritten last, so an interrupted publication never lists children that do not exist.
    const order = receipt.items.map((row, index) => index);
    if (receipt.items[0].origin) order.push(order.shift());
    for (const index of order) {
      const item = receipt.items[index];
      const description = relationBody(receipt, index);
      if (!item.relations) {
        const current = allIssues(receipt, io).find(issue => issue.id === item.issue.id);
        if (!current || current.title !== item.title || !origin.bodies(item, description).includes(current.body)) throw new Error('Issue content diverged; reconcile and obtain new approval');
        if (current.body !== description) adapter().api(io, 'mutation($id:ID!,$title:String!,$body:String!){updateIssue(input:{id:$id,title:$title,body:$body}){issue{id url}}}', { id: item.issue.id, title: item.title, body: description });
        if (allIssues(receipt, io).find(issue => issue.id === item.issue.id)?.body !== description) throw new Error('Written references not verified');
        item.relations = true; save(file, receipt);
      }
      if (index && receipt.proposal.hierarchy === 'native' && !item.hierarchy) {
        const endpoint = `repos/${receipt.proposal.repository}/issues/${receipt.items[0].issue.number}/sub_issues`;
        try {
        if (!subIssues(endpoint, io).some(issue => issue.html_url === item.issue.url)) {
          const child = rest(io, `repos/${receipt.proposal.repository}/issues/${item.issue.number}`);
          if (!Number.isSafeInteger(child.id) || child.html_url !== item.issue.url) throw new Error('Child numeric identity not verified');
          rest(io, endpoint, 'POST', { sub_issue_id: child.id });
        }
        if (!subIssues(endpoint, io).some(issue => issue.html_url === item.issue.url)) throw new Error('Native hierarchy not verified');
        item.hierarchy = true; save(file, receipt);
        } catch (error) {
          receipt.hierarchy_error = error.message; save(file, receipt);
          throw error;
        }
      }
      if (index && receipt.proposal.dependencies === 'native' && receipt.proposal.slices[index - 1].depends_on.length) {
        const endpoint = `repos/${receipt.proposal.repository}/issues/${item.issue.number}/dependencies/blocked_by`;
        for (const name of receipt.proposal.slices[index - 1].depends_on) {
          if (item.dependencies?.includes(name)) continue;
          try {
            const blocker = receipt.items[receipt.proposal.slices.findIndex(slice => slice.change_name === name) + 1].issue;
            if (!subIssues(endpoint, io).some(issue => issue.html_url === blocker.url)) {
              const current = rest(io, `repos/${receipt.proposal.repository}/issues/${blocker.number}`);
              if (!Number.isSafeInteger(current.id) || current.html_url !== blocker.url) throw new Error('Blocker numeric identity not verified');
              rest(io, endpoint, 'POST', { issue_id: current.id });
            }
            if (!subIssues(endpoint, io).some(issue => issue.html_url === blocker.url)) throw new Error('Native dependency not verified');
            item.dependencies = [...(item.dependencies || []), name]; save(file, receipt);
          } catch (error) { receipt.dependency_error = error.message; save(file, receipt); throw error; }
        }
      }
    }
    // Re-read the complete frontier before claiming set completion.
    return recover({ receipt: file }, io);
  } catch (error) { return report(receipt, error.message); }
}
function subIssues(endpoint, io) {
  const result = [], seen = new Set();
  for (let page = 1; ; page++) {
    const rows = rest(io, `${endpoint}?per_page=100&page=${page}`);
    if (!Array.isArray(rows) || rows.some(row => !row?.id || typeof row.html_url !== 'string' || seen.has(row.id))) throw new Error('Incomplete or repeated sub-issue page');
    rows.forEach(row => seen.add(row.id)); result.push(...rows);
    if (rows.length < 100) return result;
  }
}
function publish(request, io) {
  let file, receipt;
  try {
    file = adapter().receiptPath(request.receipt);
    const ready = query(request, io);
    if (ready.status !== 'ready') return ready;
    if (request.confirmation !== ready.confirmation) throw new Error('Exact parent, slices, destination and relations approval is required');
    // An origin set takes its destination from the originating issue.
    const state = adapter().inspect(ready.proposal.origin ? { ...request, repository: ready.proposal.repository } : request, io);
    receipt = { version: 1, proposal: ready.proposal, actor: state.actor, items: [ready.proposal.origin ? { ...origin.item(ready.proposal), project: true } : { title: request.title, description: request.description }, ...ready.proposal.slices.map(slice => ({ title: slice.title, description: slice.description }))] };
    fs.writeFileSync(file, JSON.stringify(receipt), { flag: 'wx', mode: 0o600 });
  } catch (error) { return { status: 'failure_before_publication', message: error.message }; }
  return perform(receipt, file, io);
}
function load(request) {
  const file = adapter().receiptPath(request.receipt);
  const receipt = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (receipt.version !== 1 || receipt.proposal?.operation !== 'set' || !Array.isArray(receipt.items) || receipt.items.length !== receipt.proposal.slices.length + 1) throw new Error('Invalid set receipt');
  return { file, receipt };
}
function recover(request, io) {
  const { file, receipt } = load(request);
  checkDestination(receipt, io);
  const all = allIssues(receipt, io), candidates = [];
  let verificationIncomplete = false;
  for (let index = 0; index < receipt.items.length; index++) {
    const item = receipt.items[index];
    if (!item.issue && item.attempted) {
      const matches = all.filter(issue => !item.baseline.includes(issue.id) && issue.title === item.title && issue.body === item.description && issue.author?.login === receipt.actor);
      const chosen = matches.find(issue => issue.url === request.identified?.[index]);
      if (chosen) item.issue = { id: chosen.id, number: chosen.number, url: chosen.url };
      else candidates.push({ index, issues: matches.map(({ id, number, url }) => ({ id, number, url })) });
    }
    if (item.issue) {
      const current = all.find(issue => issue.id === item.issue.id && issue.url === item.issue.url);
      const expected = receipt.items.every(row => row.issue) ? relationBody(receipt, index) : item.description;
      if (!current || current.title !== item.title || !origin.bodies(item, expected).includes(current.body)) throw new Error('Existing result diverged; no continuation is authorized');
      item.relations = current.body === expected && expected !== item.description;
      // An existing origin keeps its own Project membership; only published children are added.
      item.project = item.origin || !!adapter().membership(io, receipt.proposal.project.id, item.issue.id);
      if (index && receipt.proposal.hierarchy === 'native') {
        try { item.hierarchy = subIssues(`repos/${receipt.proposal.repository}/issues/${receipt.items[0].issue.number}/sub_issues`, io).some(issue => issue.html_url === item.issue.url); }
        catch (error) {
          if (!receipt.hierarchy_error && !(request.fallback === 'written' && receipt.dependency_error)) throw error;
          receipt.hierarchy_error = error.message;
          verificationIncomplete = true;
          item.hierarchy = false;
        }
      }
      if (index && receipt.proposal.dependencies === 'native' && receipt.proposal.slices[index - 1].depends_on.length) {
        try {
          const rows = subIssues(`repos/${receipt.proposal.repository}/issues/${item.issue.number}/dependencies/blocked_by`, io);
          item.dependencies = receipt.proposal.slices[index - 1].depends_on.filter(name => rows.some(row => row.html_url === receipt.items[receipt.proposal.slices.findIndex(slice => slice.change_name === name) + 1]?.issue?.url));
        } catch (error) {
          if (!receipt.dependency_error && !(request.fallback === 'written' && receipt.hierarchy_error)) throw error;
          receipt.dependency_error = error.message; item.dependencies = [];
          verificationIncomplete = true;
        }
      }
    }
  }
  save(file, receipt);
  const result = { ...report(receipt), candidates };
  if (request.fallback === 'written') {
    if (!receipt.hierarchy_error && !receipt.dependency_error) throw new Error('Written fallback requires an established native relationship failure');
    return { ...result, fallback_proposal: { hierarchy: 'written', dependencies: 'written', reason: receipt.hierarchy_error || receipt.dependency_error, existing_native_links: receipt.items.filter(item => item.hierarchy).map(item => item.issue), existing_native_dependencies: receipt.items.filter(item => item.dependencies?.length).map(item => ({ issue: item.issue, depends_on: item.dependencies })) }, continuation: adapter().digest({ receipt, fallback: 'written' }) };
  }
  return { ...result, ...(verificationIncomplete ? { message: 'Relationship verification incomplete; consult the user' } : { continuation: adapter().digest(receipt) }) };
}
function continueSet(request, io) {
  const verified = recover(request, io);
  if (verified.candidates.length) return verified;
  if (verified.status === 'complete' && !request.fallback) return verified;
  if (!verified.continuation || verified.continuation !== request.confirmation) throw new Error('Explicit approval of the verified pending operations is required');
  const { file, receipt } = load(request);
  require('./backlog-publication-retry').authorize(request, receipt, file, save);
  if (request.fallback === 'written') {
    receipt.items.forEach((item, index) => { item.previous_relation_body = relationBody(receipt, index); item.relations = false; });
    receipt.proposal.hierarchy = 'written';
    receipt.proposal.dependencies = 'written';
    save(file, receipt);
  }
  return perform(receipt, file, io);
}
module.exports = { query, publish, recover, continueSet, relationBody, subIssues };
