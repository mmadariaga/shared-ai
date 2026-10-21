'use strict';

const PREFIX = '<!-- sai-backlog-slices@1 ';

function platformFor(value) {
  const url = new URL(value);
  if (url.hostname === 'github.com') return 'github';
  if (url.hostname === 'dev.azure.com' || /^[a-z0-9-]+\.visualstudio\.com$/i.test(url.hostname)) return 'azuredevops';
  return 'gitlab';
}

function normalize(value, platform) {
  if (platform === 'github') return require('./from-backlog-github').normalize(value).url;
  if (platform === 'gitlab') {
    const parsed = require('./from-backlog-gitlab').issueURL(value);
    return `${parsed.destination}/-/${parsed.route}/${parsed.number}`;
  }
  const ref = require('./from-backlog-azuredevops').resolve(value, {});
  if (ref.status !== 'resolved' || !ref.url) throw new Error('Complete Azure slice URL required');
  return ref.url;
}

function checkIdentity(value) {
  if (!value || value.version !== 1 || !['github', 'gitlab', 'azuredevops'].includes(value.platform) || !['parent', 'child'].includes(value.role)) throw new Error('Invalid slice identity');
  const parent = normalize(value.parent, value.platform);
  if (!Array.isArray(value.slices) || !value.slices.length) throw new Error('Missing slice correspondence');
  const names = new Set(), issues = new Set();
  const slices = value.slices.map(slice => {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slice.change_name) || names.has(slice.change_name) || !Array.isArray(slice.depends_on)) throw new Error('Invalid slice correspondence');
    const issue = normalize(slice.issue, value.platform);
    if (issue === parent || issues.has(issue)) throw new Error('Duplicate issue correspondence');
    names.add(slice.change_name); issues.add(issue);
    return { change_name: slice.change_name, issue, depends_on: slice.depends_on };
  });
  for (const slice of slices) {
    if (new Set(slice.depends_on).size !== slice.depends_on.length || slice.depends_on.some(name => !names.has(name) || name === slice.change_name)) throw new Error('Invalid correspondence dependency');
  }
  const done = new Set();
  while (done.size < slices.length) {
    const next = slices.find(slice => !done.has(slice.change_name) && slice.depends_on.every(name => done.has(name)));
    if (!next) throw new Error('Cyclic correspondence dependency');
    done.add(next.change_name);
  }
  if (value.role === 'child' && !names.has(value.change_name)) throw new Error('Unknown child change name');
  if (value.hierarchy !== undefined && !['native', 'written'].includes(value.hierarchy)) throw new Error('Invalid hierarchy representation');
  if (value.dependency_representation !== undefined && !['native', 'written'].includes(value.dependency_representation)) throw new Error('Invalid dependency representation');
  // An adopted origin that is itself a published child keeps that earlier correspondence beside its own set.
  if (value.child_of !== undefined) {
    if (value.role !== 'parent') throw new Error('Only a parent marker can carry child_of');
    const upper = checkIdentity(value.child_of);
    if (upper.role !== 'child' || upper.platform !== value.platform || upper.child_of || upper.slices.find(slice => slice.change_name === upper.change_name).issue !== parent) throw new Error('child_of must be the earlier child correspondence of this issue');
  }
  return { version: 1, platform: value.platform, role: value.role, parent, slices, ...(value.hierarchy ? { hierarchy: value.hierarchy } : {}), ...(value.dependency_representation ? { dependency_representation: value.dependency_representation } : {}), ...(value.role === 'child' ? { change_name: value.change_name } : {}), ...(value.child_of ? { child_of: checkIdentity(value.child_of) } : {}) };
}

/** The child-role correspondence of an issue: its own marker, or the one kept beside the set it later became the parent of. */
function upper(value) { return value?.role === 'child' ? value : value?.child_of ?? null; }

function encode(value) { return `${PREFIX}${JSON.stringify(checkIdentity(value))} -->`; }
function decode(body) {
  // Boards stores HTML. A visible escaped pre block survives HTML sanitizers.
  const html = String(body).match(/<pre>sai-backlog-slices@1 ([\s\S]*?)<\/pre>/g) || [];
  if (html.length) {
    if (html.length !== 1 || String(body).includes(PREFIX)) throw new Error('Ambiguous slice identity');
    const text = html[0].replace(/^<pre>|<\/pre>$/g, '').replace(/&quot;/g, '"').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&');
    if (!text.startsWith('sai-backlog-slices@1 ')) throw new Error('Invalid HTML slice identity');
    return checkIdentity(JSON.parse(text.slice('sai-backlog-slices@1 '.length)));
  }
  const markers = String(body).split('\n').filter(line => line.startsWith(PREFIX));
  if (!markers.length) return null;
  if (markers.length !== 1 || !markers[0].endsWith(' -->')) throw new Error('Incomplete or ambiguous slice identity');
  return checkIdentity(JSON.parse(markers[0].slice(PREFIX.length, -4)));
}
const escape = text => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
function encodeHtml(value) { return `<pre>${escape(`sai-backlog-slices@1 ${JSON.stringify(checkIdentity(value))}`)}</pre>`; }
module.exports = { upper, encode, encodeHtml, decode, checkIdentity, normalize, platformFor, escape };
