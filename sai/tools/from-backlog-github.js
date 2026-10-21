'use strict';

function fault(reason, message) { return Object.assign(new Error(message), { reason }); }

function normalize(value) {
  // Validate the raw path too: URL normalization must not repair a bad reference.
  const match = /^(?:https:\/\/github\.com)?\/([A-Za-z0-9-]+)\/([A-Za-z0-9_.-]+)\/issues\/([1-9][0-9]*)\/?(?:[?#][^\s]*)?$/i.exec(value);
  if (!match || ['.', '..'].includes(match[2]) || !Number.isSafeInteger(Number(match[3])) || Number(match[3]) > 2147483647) throw fault('invalid-reference', 'Use https://github.com/owner/repo/issues/123 or /owner/repo/issues/123');
  return { repository: `${match[1]}/${match[2]}`, number: Number(match[3]), url: `https://github.com/${match[1]}/${match[2]}/issues/${Number(match[3])}` };
}

function api(io, query, variables) {
  const response = JSON.parse(io.run('gh', ['api', 'graphql', '--hostname', 'github.com', '--input', '-'], JSON.stringify({ query, variables })));
  if (response.errors?.length || !response.data) throw fault('retrieval-failed', `GitHub retrieval failed: ${JSON.stringify(response.errors || response)}`);
  return response.data;
}

function readIssue(reference, io) {
  const checked = normalize(reference.url);
  const [owner, name] = checked.repository.split('/');
  const repo = api(io, 'query($owner:String!,$name:String!,$number:Int!){repository(owner:$owner,name:$name){nameWithOwner isArchived issueOrPullRequest(number:$number){__typename ... on Issue{number url title body state}}}}', { owner, name, number: checked.number }).repository;
  const issue = repo?.issueOrPullRequest;
  if (!issue) throw fault('inaccessible-issue', 'Issue is missing or not readable; check authentication and repository access');
  if (issue.__typename === 'PullRequest') throw fault('not-an-issue', 'This number identifies a pull request, not an issue');
  if (issue.__typename !== 'Issue' || issue.number !== checked.number || typeof issue.url !== 'string' || typeof issue.title !== 'string' || typeof issue.body !== 'string' || !['OPEN', 'CLOSED'].includes(issue.state) || typeof repo.isArchived !== 'boolean' || typeof repo.nameWithOwner !== 'string') throw fault('incomplete-response', 'GitHub issue response is incomplete');
  return { provider: 'github', repository: repo.nameWithOwner, repository_archived: repo.isArchived, number: issue.number, url: issue.url, title: issue.title, description: issue.body, state: issue.state, description_missing: issue.body.trim().length === 0 };
}

function read(reference, io) {
  let item;
  const comments = [];
  try {
    const checked = normalize(reference.url);
    const [owner, name] = checked.repository.split('/');
    const variables = { owner, name, number: checked.number };
    item = readIssue(checked, io);
    let cursor = null;
    const seen = new Set();
    do {
      const result = api(io, 'query($owner:String!,$name:String!,$number:Int!,$cursor:String){repository(owner:$owner,name:$name){issue(number:$number){comments(first:100,after:$cursor){nodes{id url body author{login}} pageInfo{hasNextPage endCursor}}}}}', { ...variables, cursor });
      const page = result.repository?.issue?.comments;
      if (!Array.isArray(page?.nodes) || typeof page.pageInfo?.hasNextPage !== 'boolean') throw fault('incomplete-response', 'GitHub comments response is incomplete');
      for (const comment of page.nodes) {
        if (!comment || typeof comment.id !== 'string' || typeof comment.url !== 'string' || typeof comment.body !== 'string' || (comment.author !== null && typeof comment.author?.login !== 'string') || seen.has(`id:${comment.id}`)) throw fault('incomplete-response', 'GitHub comment is incomplete or repeated');
        seen.add(`id:${comment.id}`);
        comments.push({ id: comment.id, url: comment.url, author: comment.author?.login ?? null, body: comment.body });
      }
      if (!page.pageInfo.hasNextPage) return { status: 'complete', item, comments };
      cursor = page.pageInfo.endCursor;
      if (typeof cursor !== 'string' || !cursor || seen.has(`cursor:${cursor}`)) throw fault('incomplete-response', 'GitHub pagination cursor is missing or repeated');
      seen.add(`cursor:${cursor}`);
    } while (true);
  } catch (error) {
    return { status: item ? 'incomplete' : 'error', reason: error.reason || 'retrieval-failed', message: error.message, ...(item ? { item, comments } : {}) };
  }
}

function connection(io, reference, field) {
  const [owner, name] = normalize(reference.url).repository.split('/');
  const nodes = [], cursors = new Set(), urls = new Set();
  let cursor = null;
  do {
    const data = api(io, `query($owner:String!,$name:String!,$number:Int!,$cursor:String){repository(owner:$owner,name:$name){issue(number:$number){${field}(first:100,after:$cursor){nodes{url} pageInfo{hasNextPage endCursor}}}}}`, { owner, name, number: reference.number, cursor });
    const page = data.repository?.issue?.[field];
    if (!Array.isArray(page?.nodes) || typeof page.pageInfo?.hasNextPage !== 'boolean') throw fault('incomplete-response', `Incomplete ${field} connection`);
    for (const row of page.nodes) {
      if (typeof row?.url !== 'string' || urls.has(row.url)) throw fault('incomplete-response', `Incomplete or repeated ${field} item`);
      normalize(row.url); urls.add(row.url); nodes.push(row.url);
    }
    if (!page.pageInfo.hasNextPage) return nodes;
    cursor = page.pageInfo.endCursor;
    if (!cursor || cursors.has(cursor)) throw fault('incomplete-response', `Invalid ${field} pagination`);
    cursors.add(cursor);
  } while (true);
}

/** Hierarchical delivery is read-only and retains the selected issue as origin. */
function readSet(reference, io) {
  let selected;
  const sources = [];
  try {
    const identity = require('./backlog-slice-identity');
    const fields = api(io, 'query{__type(name:"Issue"){fields{name}}}', {}).__type?.fields;
    if (!Array.isArray(fields)) throw fault('incomplete-response', 'Hierarchy capability read is incomplete');
    const native = fields.some(field => field.name === 'parent') && fields.some(field => field.name === 'subIssues');
    const load = url => {
      const ref = normalize(url);
      const result = read(ref, io);
      if (result.status !== 'complete') throw fault(result.reason, result.message);
      const assignees = [];
      const [owner, name] = ref.repository.split('/');
      let cursor = null;
      const seen = new Set();
      do {
        const page = api(io, 'query($owner:String!,$name:String!,$number:Int!,$cursor:String){repository(owner:$owner,name:$name){issue(number:$number){assignees(first:100,after:$cursor){nodes{login} pageInfo{hasNextPage endCursor}}}}}', { owner, name, number: ref.number, cursor }).repository?.issue?.assignees;
        if (!Array.isArray(page?.nodes) || typeof page.pageInfo?.hasNextPage !== 'boolean') throw fault('incomplete-response', 'Incomplete assignee page');
        for (const row of page.nodes) {
          if (typeof row?.login !== 'string' || seen.has(`login:${row.login}`)) throw fault('incomplete-response', 'Incomplete or repeated assignee');
          seen.add(`login:${row.login}`); assignees.push(row.login);
        }
        if (!page.pageInfo.hasNextPage) break;
        cursor = page.pageInfo.endCursor;
        if (!cursor || seen.has(cursor)) throw fault('incomplete-response', 'Invalid assignee pagination');
        seen.add(cursor);
      } while (true);
      const correspondence = identity.decode(result.item.description);
      if (correspondence && (correspondence.role === 'parent' ? correspondence.parent !== ref.url : correspondence.slices.find(slice => slice.change_name === correspondence.change_name)?.issue !== ref.url)) throw fault('incomplete-response', 'Slice correspondence does not identify its containing issue');
      const upper = identity.upper(correspondence);
      let parent = upper ? upper.parent : null;
      let children = correspondence?.role === 'parent' ? correspondence.slices.map(slice => slice.issue) : [];
      if (native) {
        const issue = api(io, 'query($owner:String!,$name:String!,$number:Int!){repository(owner:$owner,name:$name){issue(number:$number){parent{url}}}}', { owner, name, number: ref.number }).repository?.issue;
        if (!issue || !Object.prototype.hasOwnProperty.call(issue, 'parent')) throw fault('incomplete-response', 'Parent relationship read is incomplete');
        const nativeParent = issue.parent?.url || null;
        if (parent && nativeParent && parent !== nativeParent) throw fault('incomplete-response', 'Native parent conflicts with written correspondence');
        parent = nativeParent || parent;
        children = [...new Set([...children, ...connection(io, ref, 'subIssues')])];
      }
      const dependencies = upper ? upper.slices.find(slice => slice.change_name === upper.change_name).depends_on.map(name => upper.slices.find(slice => slice.change_name === name).issue) : [];
      if (fields.some(field => field.name === 'blockedBy')) dependencies.push(...connection(io, ref, 'blockedBy'));
      return { ...result, item: { ...result.item, assignees, parent, children, dependencies: [...new Set(dependencies)], correspondence } };
    };
    selected = load(reference.url); sources.push({ role: 'selected', ...selected });
    if (selected.item.parent) {
      const parent = load(selected.item.parent);
      if (!parent.item.children.includes(selected.item.url)) throw fault('incomplete-response', 'Parent does not confirm the selected child');
      sources.push({ role: 'parent-context', ...parent });
    }
    // A grouping parent may itself be a child of a higher issue. Its explicit
    // published role, or direct children for ordinary issues, owns import scope.
    const importsChildren = selected.item.correspondence?.role === 'parent'
      || (!selected.item.correspondence && selected.item.children.length > 0);
    if (importsChildren) {
      for (const url of selected.item.children) {
        const child = load(url);
        if (child.item.parent !== selected.item.url) throw fault('incomplete-response', 'Child does not confirm its parent');
        sources.push({ role: 'child', ...child });
      }
    }
    return { ...selected, status: 'complete', origin: { platform: 'github', issue: selected.item.url, parent: selected.item.parent, change_name: selected.item.correspondence?.change_name || null }, sources };
  } catch (error) {
    return { status: selected ? 'incomplete' : 'error', reason: error.reason || 'retrieval-failed', message: error.message, ...(selected ? { item: selected.item, comments: selected.comments, sources } : {}) };
  }
}

/** Children of an issue with their state: written slice correspondence plus native sub-issues. No comments or assignees. */
function readChildren(reference, io) {
  try {
    const checked = normalize(reference.url);
    const written = require('./backlog-slice-identity').decode(readIssue(checked, io).description);
    const fields = api(io, 'query{__type(name:"Issue"){fields{name}}}', {}).__type?.fields;
    if (!Array.isArray(fields)) throw fault('incomplete-response', 'Hierarchy capability read is incomplete');
    const urls = [...new Set([
      ...(written?.role === 'parent' ? written.slices.map(slice => slice.issue) : []),
      ...(fields.some(field => field.name === 'subIssues') ? connection(io, checked, 'subIssues') : []),
    ])];
    return { status: 'complete', children: urls.map(url => { const child = readIssue({ url }, io); return { url: child.url, state: child.state }; }) };
  } catch (error) {
    return { status: 'error', reason: error.reason || 'retrieval-failed', message: error.message };
  }
}

module.exports = { normalize, api, readIssue, read, readSet, readChildren, connection };
