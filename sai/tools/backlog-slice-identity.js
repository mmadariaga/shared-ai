'use strict';

const { normalize } = require('./from-backlog-github');
const PREFIX = '<!-- sai-backlog-slices@1 ';

function checkIdentity(value) {
  if (!value || value.version !== 1 || value.platform !== 'github' || !['parent', 'child'].includes(value.role)) throw new Error('Invalid slice identity');
  const parent = normalize(value.parent).url;
  if (!Array.isArray(value.slices) || !value.slices.length) throw new Error('Missing slice correspondence');
  const names = new Set(), issues = new Set();
  const slices = value.slices.map(slice => {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slice.change_name) || names.has(slice.change_name) || !Array.isArray(slice.depends_on)) throw new Error('Invalid slice correspondence');
    const issue = normalize(slice.issue).url;
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
  return { version: 1, platform: 'github', role: value.role, parent, slices, ...(value.hierarchy ? { hierarchy: value.hierarchy } : {}), ...(value.dependency_representation ? { dependency_representation: value.dependency_representation } : {}), ...(value.role === 'child' ? { change_name: value.change_name } : {}) };
}

function encode(value) { return `${PREFIX}${JSON.stringify(checkIdentity(value))} -->`; }
function decode(body) {
  const markers = String(body).split('\n').filter(line => line.startsWith(PREFIX));
  if (!markers.length) return null;
  if (markers.length !== 1 || !markers[0].endsWith(' -->')) throw new Error('Incomplete or ambiguous slice identity');
  return checkIdentity(JSON.parse(markers[0].slice(PREFIX.length, -4)));
}
module.exports = { encode, decode, checkIdentity };
