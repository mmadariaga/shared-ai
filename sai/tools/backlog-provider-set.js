'use strict';

const fs = require('node:fs');
const documents = require('./change-document');
const identity = require('./backlog-slice-identity');
const { digest, receiptPath, save } = require('./to-backlog-github');
const origin = require('./backlog-set-origin');

// The workflow is shared; adapters own destination, content and remote mechanics.
function bind(provider, mechanics) {
  // Descriptions compare byte for byte unless the provider declares which stored forms are the same content.
  const same = mechanics.equivalent || ((sent, received) => sent === received);
  const accepted = (sent, received, format) => sent.some(value => typeof value === 'string' && same(value, received, format));
  // A provider may keep a description format per issue; the origin keeps its own and every created item has the provider's.
  const formatOf = (receipt, index) => mechanics.formatOf?.(receipt.proposal, index);
  // A provider that declares `progress` has each remote step reported, with its elapsed time, through `io.progress`.
  async function timed(io, step, index, call, numberOf) {
    if (!mechanics.progress || !io.progress) return await call();
    const start = Date.now(), value = await call();
    io.progress({ step, ...(index === undefined ? {} : { index }), ...(numberOf ? { number: numberOf(value) } : {}), ms: Date.now() - start });
    return value;
  }
  const readItem = (receipt, index, io) => timed(io, 'read', index, () => mechanics.read(receipt.proposal, receipt.items[index].issue, io), value => value.issue.number);
  // The IDs a provider already holds: a provider with a cheaper query than its full inventory declares `ids`.
  async function idsOf(proposal, io, index) {
    return await timed(io, mechanics.ids ? 'ids' : 'inventory', index, async () => mechanics.ids ? await mechanics.ids(proposal, io) : (await mechanics.inventory(proposal, io)).map(row => row.issue.id));
  }
  // The rows created since a baseline: a provider declares `inventorySince` to read only the new IDs.
  async function createdSince(proposal, baseline, io, index) {
    return await timed(io, 'inventory', index, async () => mechanics.inventorySince ? await mechanics.inventorySince(proposal, baseline, io)
      : (await mechanics.inventory(proposal, io)).filter(row => !baseline.includes(row.issue.id)));
  }
  async function query(request, io) {
    const validation = documents.readSet(Array.isArray(request.documents) ? request.documents : []);
    if (!validation.ok) return { status: 'needs_input', reason: 'invalid-dependencies', validation };
    let ready = request.origin ? undefined : await mechanics.query(request, io), existing;
    if (request.origin) {
      if (!mechanics.origin) return { status: 'blocked', reason: 'origin-unsupported', message: 'Provider cannot publish a set under an originating issue' };
      const prepared = await origin.prepare(provider, request, io, mechanics);
      if (prepared.status !== 'ready') return prepared;
      ({ ready, origin: existing } = prepared);
    }
    if (ready.status !== 'ready') return ready;
    // Each child is its change document: the title line is the issue title and the rest the description.
    const slices = validation.order.map(name => {
      const document = validation.documents.find(row => row.name === name);
      return { change_name: name, title: document.title, description: mechanics.renderDocument(document.description), depends_on: document.dependencies };
    });
    const representation = mechanics.representation;
    const proposal = { ...ready.proposal, ...(io.autoApprove === true ? { auto_approve: true } : {}), operation: 'set', ...(existing ? { origin: existing } : {}), slices, ...representation,
      relations: existing ? origin.RELATIONS : 'Separate verified creations, written correspondence and supported native relations; assignment is unchanged' };
    return { status: 'ready', proposal, confirmation: digest(proposal) };
  }
  function body(receipt, index) {
    const slices = receipt.proposal.slices.map((slice, i) => ({ change_name: slice.change_name, issue: receipt.items[i + 1].issue.url, depends_on: slice.depends_on }));
    const upper = index ? null : receipt.proposal.origin?.child_of;
    const value = { version: 1, platform: provider, role: index ? 'child' : 'parent', parent: receipt.items[0].issue.url, slices,
      hierarchy: receipt.proposal.hierarchy, dependency_representation: receipt.proposal.dependencies,
      ...(index ? { change_name: slices[index - 1].change_name } : {}), ...(upper ? { child_of: upper } : {}) };
    const links = index ? [`Parent: ${value.parent}`, ...slices[index - 1].depends_on.map(name => `Depends on: ${slices.find(slice => slice.change_name === name).issue}`)]
      : [...slices.map(slice => `Child: ${slice.change_name} — ${slice.issue}`), ...(upper ? origin.upperLinks(upper) : [])];
    return mechanics.append(receipt.items[index].description, links, value, formatOf(receipt, index));
  }
  function report(receipt, message) {
    const pending = receipt.items.flatMap((item, index) => [!item.issue && `create:${index}`, !item.references && `references:${index}`,
      index && receipt.proposal.hierarchy === 'native' && !item.hierarchy && `hierarchy:${index}`,
      ...(index && receipt.proposal.dependencies === 'native' ? receipt.proposal.slices[index - 1].depends_on.filter(name => !item.dependencies?.includes(name)).map(name => `dependency:${index}:${name}`) : [])].filter(Boolean));
    const adopted = receipt.items.find(item => item.origin);
    return { status: pending.length || message ? 'partial_failure' : 'complete', created: receipt.items.filter(item => item.issue && !item.origin).map(item => item.issue), ...(adopted ? { origin: adopted.issue } : {}), pending,
      representation: { hierarchy: receipt.proposal.hierarchy, dependencies: receipt.proposal.dependencies },
      correspondence: pending.length || message ? null : identity.decode(body(receipt, 0)), ...(message ? { message } : {}) };
  }
  function load(request) {
    const file = receiptPath(request.receipt), receipt = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (receipt.version !== 1 || receipt.proposal?.provider !== provider || receipt.proposal.operation !== 'set' || !Array.isArray(receipt.items) || receipt.items.length !== receipt.proposal.slices.length + 1) throw new Error('Invalid provider set receipt');
    return { file, receipt };
  }
  async function check(receipt, io) {
    if (receipt.proposal.origin) return await origin.checkDestination(receipt, mechanics.query, io);
    const ready = await query(receipt.request, io);
    if (ready.status !== 'ready' || digest(ready.proposal) !== receipt.original_confirmation) throw new Error('Publication destination, content, type or authenticated identity changed; renew review');
  }
  async function recover(request, io) {
    const { file, receipt } = await load(request);
    try {
    await check(receipt, io);
    const candidates = [];
    let verificationIncomplete = false;
    for (let index = 0; index < receipt.items.length; index++) {
      const item = receipt.items[index];
      if (!item.issue && item.attempted) {
        const matches = (await createdSince(receipt.proposal, item.baseline, io, index)).filter(row => !item.baseline.includes(row.issue.id) && row.title === item.title && same(item.description, row.description, formatOf(receipt, index)) && row.actor === receipt.proposal.actor);
        const chosen = matches.find(row => row.issue.url === request.identified?.[index]);
        if (chosen) item.issue = chosen.issue;
        else candidates.push({ index, issues: matches.map(row => row.issue) });
      }
      if (!item.issue) continue;
      const current = await readItem(receipt, index, io);
      const expected = receipt.items.every(row => row.issue) ? body(receipt, index) : item.description;
      if (digest(current.issue) !== digest(item.issue) || current.title !== item.title || !accepted(origin.bodies(item, expected), current.description, formatOf(receipt, index))) throw new Error('Existing result diverged; no continuation is authorized');
      item.references = same(expected, current.description, formatOf(receipt, index)) && expected !== item.description;
      if (index && receipt.items[0].issue) {
        try {
        if (receipt.proposal.hierarchy === 'native') item.hierarchy = await timed(io, 'relation', index, () => mechanics.hasRelation(receipt.proposal, item.issue, receipt.items[0].issue, 'parent', io), () => item.issue.number);
        if (receipt.proposal.dependencies === 'native') {
          const verified = [];
          for (const name of receipt.proposal.slices[index - 1].depends_on) {
            const blocker = receipt.items[receipt.proposal.slices.findIndex(slice => slice.change_name === name) + 1].issue;
            if (blocker && await timed(io, 'relation', index, () => mechanics.hasRelation(receipt.proposal, item.issue, blocker, 'dependency', io), () => item.issue.number)) verified.push(name);
          }
          item.dependencies = verified;
        }
        if (item.hierarchy) item.last_verified_hierarchy = true;
        item.last_verified_dependencies = [...new Set([...(item.last_verified_dependencies || []), ...(item.dependencies || [])])];
        } catch (error) {
          if (!receipt.relation_error) throw error;
          // An unavailable relation read is not proof of absence or success.
          item.hierarchy = false; item.dependencies = [];
          receipt.relation_error = error.message;
          verificationIncomplete = true;
        }
      }
    }
    save(file, receipt);
    const result = { ...report(receipt), candidates };
    if (request.fallback === 'written') {
      if (!receipt.relation_error) throw new Error('Written fallback requires an established native relation failure');
      return { ...result, fallback_proposal: { hierarchy: 'written', dependencies: 'written', reason: receipt.relation_error,
        existing_native_links: receipt.items.filter(item => item.last_verified_hierarchy).map(item => item.issue), existing_native_dependencies: receipt.items.filter(item => item.last_verified_dependencies?.length).map(item => ({ issue: item.issue, depends_on: item.last_verified_dependencies })) }, continuation: digest({ receipt, fallback: 'written' }) };
    }
    return { ...result, ...(verificationIncomplete ? { message: 'Relationship verification incomplete; consult the user' } : { continuation: digest(receipt) }) };
    } catch (error) {
      // Keep verified identities visible, but offer no continuation from an unread frontier.
      return { ...report(receipt, error.message), candidates: [] };
    }
  }
  async function perform(receipt, file, io) {
    try {
      await check(receipt, io);
      for (const [index, item] of receipt.items.entries()) {
        if (item.issue) continue;
        if (item.attempted) return report(receipt, 'Recover and identify the existing creation before continuing');
        item.baseline = await idsOf(receipt.proposal, io, index);
        item.attempted = true; save(file, receipt);
        item.issue = await timed(io, 'create', index, () => mechanics.create(receipt.proposal, item, io), value => value.number); save(file, receipt);
        const current = await readItem(receipt, index, io);
        if (digest(current.issue) !== digest(item.issue) || current.title !== item.title || !same(item.description, current.description, formatOf(receipt, index))) throw new Error('Creation identity or complete content not verified');
      }
      // An origin is rewritten last, so an interrupted publication never lists children that do not exist.
      const order = receipt.items.map((row, index) => index);
      if (receipt.items[0].origin) order.push(order.shift());
      for (const index of order) {
        const item = receipt.items[index], expected = body(receipt, index);
        const current = await readItem(receipt, index, io);
        if (current.title !== item.title || !accepted(origin.bodies(item, expected), current.description, formatOf(receipt, index))) throw new Error('Content diverged; renew approval');
        if (!same(expected, current.description, formatOf(receipt, index))) await timed(io, 'references', index, () => mechanics.writeReferences(receipt.proposal, current, expected, io), () => item.issue.number);
        if (!same(expected, (await readItem(receipt, index, io)).description, formatOf(receipt, index))) throw new Error('Written references not verified');
        item.references = true; save(file, receipt);
        if (!index) continue;
        const relations = [ ...(receipt.proposal.hierarchy === 'native' ? [{ other: receipt.items[0].issue, kind: 'parent' }] : []),
          ...(receipt.proposal.dependencies === 'native' ? receipt.proposal.slices[index - 1].depends_on.map(name => ({ other: receipt.items[receipt.proposal.slices.findIndex(slice => slice.change_name === name) + 1].issue, kind: 'dependency' })) : []) ];
        for (const relation of relations) {
          try {
            const has = () => timed(io, 'relation', index, () => mechanics.hasRelation(receipt.proposal, item.issue, relation.other, relation.kind, io), () => item.issue.number);
            if (!await has()) await timed(io, 'relation', index, () => mechanics.addRelation(receipt.proposal, item.issue, relation.other, relation.kind, io), () => item.issue.number);
            if (!await has()) throw new Error('Native relation not verified');
            if (relation.kind === 'parent') item.last_verified_hierarchy = true;
            else {
              const name = receipt.proposal.slices.find((slice, i) => receipt.items[i + 1].issue.url === relation.other.url).change_name;
              item.last_verified_dependencies = [...new Set([...(item.last_verified_dependencies || []), name])];
            }
            save(file, receipt);
          } catch (error) { receipt.relation_error = error.message; save(file, receipt); throw error; }
        }
      }
      return await recover({ receipt: file }, io);
    } catch (error) { return report(receipt, error.message); }
  }
  async function publish(request, io) {
    let receipt, file;
    try {
      file = receiptPath(request.receipt);
      const ready = await query(request, io);
      if (ready.status !== 'ready') return ready;
      if (ready.confirmation !== request.confirmation) throw new Error('Exact parent, children, destination and relations approval required');
      const { receipt: ignoredReceipt, confirmation: ignoredConfirmation, ...input } = request;
      receipt = { version: 1, request: input, original_confirmation: ready.confirmation, proposal: ready.proposal,
        items: [ready.proposal.origin ? origin.item(ready.proposal) : { title: ready.proposal.title, description: ready.proposal.description }, ...ready.proposal.slices.map(slice => ({ title: slice.title, description: slice.description }))] };
      fs.writeFileSync(file, JSON.stringify(receipt), { flag: 'wx', mode: 0o600 });
    } catch (error) { return { status: 'failure_before_publication', message: error.message }; }
    return await perform(receipt, file, io);
  }
  async function continueSet(request, io) {
    const verified = await recover(request, io);
    if (verified.candidates.length) return verified;
    if (verified.status === 'complete' && !request.fallback) return verified;
    if (!verified.continuation || verified.continuation !== request.confirmation) throw new Error('Explicit approval of verified pending operations required: pass the continuation token in the `confirmation` field');
    const { file, receipt } = await load(request);
    require('./backlog-publication-retry').authorize(request, receipt, file, save);
    if (request.fallback === 'written') {
      receipt.items.forEach((item, index) => { item.previous_body = body(receipt, index); item.references = false; });
      receipt.proposal.hierarchy = 'written'; receipt.proposal.dependencies = 'written'; save(file, receipt);
    }
    return await perform(receipt, file, io);
  }
  async function lookupSlice(request, io) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(request.change_name)) throw new Error('Explicit change name required');
    const ready = await mechanics.query({ ...request, title: 'lookup', description: '' }, io);
    if (ready.status !== 'ready') return ready;
    // A provider that can filter by change name declares `sliceCandidates`; its parent is read through the URL of the marker.
    const rows = await timed(io, 'inventory', undefined, async () => mechanics.sliceCandidates ? await mechanics.sliceCandidates(ready.proposal, request.change_name, io) : await mechanics.inventory(ready.proposal, io));
    const candidates = [];
    for (const row of rows) {
      const value = identity.upper(identity.decode(row.description, row.issue.url));
      if (!value || value.platform !== provider || value.change_name !== request.change_name || identity.slicesOf(value, row.issue.url).find(slice => slice.change_name === value.change_name)?.issue !== row.issue.url) continue;
      const parentRow = rows.find(other => other.issue.url === value.parent) || (mechanics.readByUrl ? await timed(io, 'read', undefined, () => mechanics.readByUrl(ready.proposal, value.parent, io), found => found?.issue.number) : undefined);
      const parent = parentRow && identity.decode(parentRow.description, parentRow.issue.url);
      if (!parent || parent.role !== 'parent' || parent.platform !== provider || parent.parent !== value.parent || digest(identity.slicesOf(parent, parentRow.issue.url)) !== digest(value.slices)) throw new Error('Parent does not confirm recovered slice correspondence');
      candidates.push({ issue: row.issue.url, parent: value.parent, change_name: value.change_name, platform: provider, correspondence: value });
    }
    return candidates.length === 1 ? { status: 'complete', ...candidates[0] } : { status: 'needs_input', reason: 'slice-identity-ambiguous', candidates };
  }
  return { 'query-set': query, 'publish-set': publish, 'recover-set': recover, 'continue-set': continueSet, 'lookup-slice': lookupSlice };
}
module.exports = { bind };
