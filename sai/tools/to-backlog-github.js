'use strict';

const fs = require('node:fs');
const crypto = require('node:crypto');
const path = require('node:path');

function contains(root, target) {
  const relative = path.relative(root, target);
  return relative === '' || (!path.isAbsolute(relative) && relative !== '..' && !relative.startsWith(`..${path.sep}`));
}

function receiptPath(file) {
  if (typeof file !== 'string' || !path.isAbsolute(file)) throw new Error('Receipt must be an absolute path outside the repository');
  const cwd = fs.realpathSync(process.cwd());
  let root = cwd;
  // .git can be a directory or a worktree/submodule pointer file. Follow real
  // directories so running from a nested or symlinked directory stays bounded.
  for (let directory = cwd; ; directory = path.dirname(directory)) {
    if (fs.existsSync(path.join(directory, '.git'))) { root = directory; break; }
    if (directory === path.dirname(directory)) break;
  }
  const parent = fs.realpathSync(path.dirname(file));
  const canonical = path.join(parent, path.basename(file));
  if (contains(root, path.resolve(file)) || contains(root, canonical)) throw new Error('Receipt must be outside the repository');
  function privateOwned(stat) {
    if (process.platform !== 'win32' && ((stat.mode & 0o077) !== 0 || stat.uid !== process.getuid())) throw new Error('Receipt directory and file must be private and owned by the current user');
  }
  const directory = fs.statSync(parent);
  if (!directory.isDirectory()) throw new Error('Receipt parent must be an existing private directory');
  privateOwned(directory);
  try {
    const stat = fs.lstatSync(canonical);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1) throw new Error('Receipt must be a regular, unlinked private file');
    privateOwned(stat);
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  return canonical;
}

function api(io, query, variables) {
  const result = JSON.parse(io.run('gh', ['api', 'graphql', '--hostname', 'github.com', '--input', '-'], JSON.stringify({ query, variables })));
  if (result.errors?.length || !result.data) throw new Error(`GitHub query failed: ${JSON.stringify(result.errors || result)}`);
  return result.data;
}

function pages(fetch, connection) {
  const nodes = [];
  let cursor = null;
  const seen = new Set();
  do {
    const page = connection(fetch(cursor));
    if (!page || !Array.isArray(page.nodes) || typeof page.pageInfo?.hasNextPage !== 'boolean') throw new Error('Incomplete GitHub connection');
    nodes.push(...page.nodes.filter(Boolean));
    if (!page.pageInfo.hasNextPage) return nodes;
    cursor = page.pageInfo.endCursor;
    if (!cursor || seen.has(cursor)) throw new Error('Invalid GitHub pagination cursor');
    seen.add(cursor);
  } while (true);
}

function repository(value) {
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(value || '')) throw new Error('Repository must be owner/name on github.com');
  return value.split('/');
}

function projectAddress(value) {
  const match = /^https:\/\/github\.com\/(users|orgs)\/([A-Za-z0-9-]+)\/projects\/([1-9][0-9]*)\/?$/.exec(value || '');
  if (!match) throw new Error('Project must be https://github.com/users/OWNER/projects/N or https://github.com/orgs/OWNER/projects/N');
  return { type: match[1] === 'users' ? 'user' : 'organization', owner: match[2], number: Number(match[3]) };
}

const PROJECT_FIELDS = 'id title url closed viewerCanUpdate';

function inspect(request, io) {
  io.run('gh', ['--version']);
  io.run('gh', ['auth', 'status', '--hostname', 'github.com']);
  const [owner, name] = repository(request.repository);
  const data = api(io, 'query($owner:String!,$name:String!){viewer{login} repository(owner:$owner,name:$name){id nameWithOwner url visibility hasIssuesEnabled isArchived}}', { owner, name });
  const repo = data.repository;
  if (!repo || !repo.hasIssuesEnabled || repo.isArchived) throw new Error('Repository is inaccessible, archived, or has issues disabled');
  let projects;
  if (request.project) {
    const project = projectAddress(request.project);
    const data = api(io, `query($owner:String!,$number:Int!){${project.type}(login:$owner){projectV2(number:$number){${PROJECT_FIELDS}}}}`, { owner: project.owner, number: project.number });
    const found = data[project.type]?.projectV2;
    if (!found || found.closed || !found.viewerCanUpdate) throw new Error('Selected Project is inaccessible, closed, or not writable');
    projects = [found];
  } else {
    projects = pages(cursor => api(io, `query($owner:String!,$name:String!,$cursor:String){repository(owner:$owner,name:$name){projectsV2(first:100,after:$cursor){nodes{${PROJECT_FIELDS}} pageInfo{hasNextPage endCursor}}}}`, { owner, name, cursor }), data => data.repository?.projectsV2)
      .filter(project => !project.closed && project.viewerCanUpdate);
  }
  return { repo, projects, actor: data.viewer.login };
}

function content(request) {
  if (typeof request.title !== 'string' || !request.title.trim() || typeof request.description !== 'string') throw new Error('A nonempty title and string description are required');
  return { title: request.title, description: request.description };
}

function digest(proposal) {
  return crypto.createHash('sha256').update(JSON.stringify(proposal)).digest('hex');
}

function query(request, io) {
  const { repo, projects } = inspect(request, io);
  if (projects.length !== 1) return { status: 'needs_input', reason: projects.length ? 'project-ambiguous' : 'project-required', repository: repo.nameWithOwner, projects };
  const proposal = { provider: 'github', repository: repo.nameWithOwner, repositoryId: repo.id, visibility: repo.visibility, project: projects[0], ...content(request) };
  return { status: 'ready', proposal, confirmation: digest(proposal) };
}

function issues(receipt, io) {
  const [owner, name] = repository(receipt.proposal.repository);
  return pages(cursor => api(io, 'query($owner:String!,$name:String!,$cursor:String){repository(owner:$owner,name:$name){issues(first:100,after:$cursor){nodes{id number url title body author{login}} pageInfo{hasNextPage endCursor}}}}', { owner, name, cursor }), data => data.repository?.issues);
}

function save(file, receipt) {
  file = receiptPath(file);
  // Atomic replacement keeps the previous conservative state on interruption.
  const temporary = `${file}.${crypto.randomUUID()}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(receipt), { mode: 0o600, flag: 'wx' });
  fs.renameSync(temporary, file);
}

function report(receipt, message) {
  return { status: receipt.stage === 'complete' ? 'complete' : receipt.issue ? 'partial_failure' : 'uncertain', issue: receipt.issue || null, project: receipt.proposal.project.url, message };
}

function insert(receipt, file, io) {
  try {
    file = receiptPath(file);
    const state = inspect({ repository: receipt.proposal.repository, project: receipt.proposal.project.url }, io);
    if (state.actor !== receipt.actor || state.repo.id !== receipt.proposal.repositoryId || state.projects[0].id !== receipt.proposal.project.id) throw new Error('Recovery identity or destination changed');
    if (state.repo.visibility !== receipt.proposal.visibility) throw new Error('Repository visibility changed; fresh review is required before insertion');
    const current = issues(receipt, io).find(issue => issue.id === receipt.issue.id && issue.url === receipt.issue.url);
    if (!current) throw new Error('Created issue could not be verified');
    if (current.title !== receipt.proposal.title || current.body !== receipt.proposal.description) throw new Error('Issue content changed; fresh review is required before insertion');
    const items = pages(cursor => api(io, 'query($id:ID!,$cursor:String){node(id:$id){... on ProjectV2{items(first:100,after:$cursor){nodes{id content{... on Issue{id}}} pageInfo{hasNextPage endCursor}}}}}', { id: receipt.proposal.project.id, cursor }), data => data.node?.items);
    if (!items.some(item => item.content?.id === receipt.issue.id)) {
      receipt.stage = 'insertion_pending';
      save(file, receipt);
      const data = api(io, 'mutation($project:ID!,$issue:ID!){addProjectV2ItemById(input:{projectId:$project,contentId:$issue}){item{id}}}', { project: receipt.proposal.project.id, issue: receipt.issue.id });
      if (!data.addProjectV2ItemById?.item?.id) throw new Error('Project insertion response is incomplete; verify before retrying');
    }
    receipt.stage = 'complete';
    save(file, receipt);
    return report(receipt);
  } catch (error) { return { ...report(receipt, error.message), status: 'partial_failure' }; }
}

function publish(request, io) {
  let receipt;
  try {
    request = { ...request, receipt: receiptPath(request.receipt) };
    const ready = query(request, io);
    if (ready.status !== 'ready') return ready;
    if (request.confirmation !== ready.confirmation) throw new Error('Exact content and destination confirmation is required; review the current proposal again');
    const actor = api(io, 'query{viewer{login}}', {}).viewer.login;
    receipt = { proposal: ready.proposal, actor, stage: 'prepared' };
    receipt.baseline = issues(receipt, io).map(issue => issue.id);
    // An existing receipt is never overwritten to start a second creation.
    fs.writeFileSync(request.receipt, JSON.stringify(receipt), { flag: 'wx', mode: 0o600 });
  } catch (error) { return { status: 'failure_before_publication', message: error.message }; }
  try {
    receipt.stage = 'creation_pending';
    save(request.receipt, receipt);
    const data = api(io, 'mutation($repo:ID!,$title:String!,$body:String!){createIssue(input:{repositoryId:$repo,title:$title,body:$body}){issue{id number url}}}', { repo: receipt.proposal.repositoryId, title: receipt.proposal.title, body: receipt.proposal.description });
    const issue = data.createIssue?.issue;
    if (!issue?.id || !issue.url || !issue.number) throw new Error('Issue creation response is incomplete');
    receipt.issue = issue;
    receipt.stage = 'issue_created';
    save(request.receipt, receipt);
  } catch (error) { return report(receipt, error.message); }
  return insert(receipt, request.receipt, io);
}

function recover(request, io) {
  let receipt;
  try {
    request = { ...request, receipt: receiptPath(request.receipt) };
    receipt = JSON.parse(fs.readFileSync(request.receipt, 'utf8'));
    if (receipt.proposal?.provider !== 'github' || !Array.isArray(receipt.baseline)) throw new Error('Invalid publication receipt');
    // Recovery performs queries first and never creates an issue.
    const state = inspect({ repository: receipt.proposal.repository, project: receipt.proposal.project.url }, io);
    if (state.actor !== receipt.actor || state.repo.id !== receipt.proposal.repositoryId || state.projects[0].id !== receipt.proposal.project.id) throw new Error('Recovery identity or destination changed');
    if (state.repo.visibility !== receipt.proposal.visibility) throw new Error('Repository visibility changed; fresh review is required before recovery');
    const all = issues(receipt, io);
    if (!receipt.issue) {
      const matches = all.filter(issue => !receipt.baseline.includes(issue.id) && issue.title === receipt.proposal.title && issue.body === receipt.proposal.description && issue.author?.login === receipt.actor);
      // User identifies the verified issue; a similar concurrent issue is not proof.
      const chosen = matches.find(issue => issue.url === request.issueUrl);
      if (!chosen) return { ...report(receipt, 'Verify the creation outcome and supply the confirmed issueUrl; recovery will not recreate it.'), candidates: matches.map(({ id, number, url }) => ({ id, number, url })) };
      receipt.issue = { id: chosen.id, number: chosen.number, url: chosen.url };
    } else {
      const current = all.find(issue => issue.id === receipt.issue.id && issue.url === receipt.issue.url);
      if (!current) throw new Error('Created issue could not be verified');
      if (current.title !== receipt.proposal.title || current.body !== receipt.proposal.description) throw new Error('Issue content changed; fresh review is required before recovery');
    }
    save(request.receipt, receipt);
    return insert(receipt, request.receipt, io);
  } catch (error) {
    return receipt?.proposal ? { ...report(receipt, error.message), status: receipt.issue ? 'partial_failure' : 'uncertain' } : { status: 'failure_before_publication', message: error.message };
  }
}

module.exports = { query, publish, recover, pages, inspect, digest };
