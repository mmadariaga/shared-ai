'use strict';

const identity = require('./backlog-slice-identity');
function bind(platform, load) {
  return function readSet(reference, io) {
    let selected, failedSource;
    const sources = [];
    try {
      function full(url) {
        const result = load(url, io, reference);
        if (result.status !== 'complete') {
          failedSource = { url, result };
          throw new Error(result.message || 'Source content is incomplete');
        }
        const item = result.item, value = identity.decode(item.description);
        if (value && (value.platform !== platform || (value.role === 'parent' ? value.parent : value.slices.find(slice => slice.change_name === value.change_name)?.issue) !== item.url)) throw new Error('Correspondence does not identify its containing issue');
        const upper = identity.upper(value);
        const parent = upper ? upper.parent : null;
        if (parent && item.parent && parent !== item.parent) throw new Error('Native parent conflicts with correspondence');
        const dependencies = upper ? upper.slices.find(slice => slice.change_name === upper.change_name).depends_on.map(name => upper.slices.find(slice => slice.change_name === name).issue) : [];
        return { ...result, item: { ...item, parent: item.parent || parent, children: [...new Set([...(item.children || []), ...(value?.role === 'parent' ? value.slices.map(slice => slice.issue) : [])])], dependencies: [...new Set([...(item.dependencies || []), ...dependencies])], correspondence: value } };
      }
      selected = full(reference.url); sources.push({ role: 'selected', ...selected });
      function confirm(parent, child) {
        if (!parent.item.children.includes(child.item.url) || child.item.parent !== parent.item.url) throw new Error('Parent and child do not confirm their relationship');
        const value = identity.upper(child.item.correspondence) ?? child.item.correspondence;
        if (value && (!parent.item.correspondence || parent.item.correspondence.role !== 'parent' || JSON.stringify(parent.item.correspondence.slices) !== JSON.stringify(value.slices))) throw new Error('Parent and child correspondence disagree');
      }
      if (selected.item.parent) {
        const parent = full(selected.item.parent);
        confirm(parent, selected);
        sources.push({ role: 'parent-context', ...parent });
      }
      if (selected.item.correspondence?.role === 'parent' || (!selected.item.correspondence && selected.item.children.length)) {
        for (const url of selected.item.children) {
          const child = full(url);
          confirm(selected, child);
          sources.push({ role: 'child', ...child });
        }
      }
      return { ...selected, status: 'complete', origin: { platform, issue: selected.item.url, parent: selected.item.parent, change_name: selected.item.correspondence?.change_name || null }, sources };
    } catch (error) {
      const partial = selected || (failedSource?.url === reference.url ? failedSource.result : null);
      return { status: partial?.item ? 'incomplete' : 'error', reason: error.reason || 'retrieval-failed', message: error.message,
        ...(partial?.item ? { item: partial.item, comments: partial.comments, sources, origin: { platform, issue: partial.item.url } } : {}),
        ...(failedSource ? { missing_source: failedSource.url } : {}) };
    }
  };
}
module.exports = { bind };
