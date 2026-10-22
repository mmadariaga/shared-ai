'use strict';

const PROBE_TEXT = 'Respond exactly: OK. Do not use any tools. Say nothing else.';
const DEFAULTS = {
  base: 4, step: 5, gran: 30, cap: 90, warm: 3, repeats: 3,
  'hit-min': 2000, 'miss-max': 500, 'max-probes': null,
  'max-runtime-min': null, 'consistent-threshold-s': null,
  'probe-text': PROBE_TEXT, 'time-prefix': true,
};

function parameters(input = {}) {
  const p = { ...DEFAULTS, ...input };
  for (const key of ['base', 'step', 'gran', 'cap', 'warm', 'repeats', 'hit-min']) {
    if (!Number.isFinite(p[key]) || p[key] <= 0) throw new Error(`${key} must be positive`);
  }
  if (!Number.isSafeInteger(p.repeats)) throw new Error('repeats must be an integer');
  if (!Number.isFinite(p['miss-max']) || p['miss-max'] < 0 || p['miss-max'] >= p['hit-min']) throw new Error('miss-max must be nonnegative and below hit-min');
  for (const key of ['max-probes', 'max-runtime-min', 'consistent-threshold-s']) {
    if (p[key] !== null && (!Number.isFinite(p[key]) || p[key] <= 0)) throw new Error(`${key} must be positive`);
  }
  if (p['max-probes'] !== null && !Number.isSafeInteger(p['max-probes'])) throw new Error('max-probes must be an integer');
  if (typeof p['time-prefix'] !== 'boolean' || typeof p['probe-text'] !== 'string' || !p['probe-text'].trim()) throw new Error('Invalid probe text or time-prefix');
  let ladder = 0, gap = Math.min(p.base, p.cap);
  // Compute the clamped arithmetic ladder without iterating over user input.
  const rungs = Math.ceil((p.cap - gap) / p.step);
  ladder = rungs * gap + p.step * rungs * (rungs - 1) / 2 + p.cap;
  p['max-probes'] ??= 30 * p.repeats;
  p['max-runtime-min'] ??= Math.max(55, Math.ceil(ladder * 1.5)) * p.repeats;
  p['consistent-threshold-s'] ??= Math.max(2 * p.gran, 60);
  return p;
}

function modelKey(m) {
  if (!m || typeof m.providerID !== 'string' || !m.providerID || typeof m.id !== 'string' || !m.id || (m.variant !== undefined && typeof m.variant !== 'string')) throw new Error('Exact model identity is unavailable');
  return JSON.stringify([m.providerID, m.id, m.variant ?? null]);
}

function validateIdentity(identity) {
  if (!identity || !['opencode', 'claude'].includes(identity.tool) || !['main', 'subagent'].includes(identity.mode) || !identity.session || !identity.invoking_session) throw new Error('Explicit tool, mode, target and invoking session are required');
  modelKey(identity.model);
  if (identity.mode === 'main' && identity.session !== identity.invoking_session) throw new Error('Main mode must target the invoking conversation');
  if (identity.mode === 'subagent' && (identity.session === identity.invoking_session || identity.parent_session !== identity.invoking_session || modelKey(identity.parent_model) !== modelKey(identity.model))) throw new Error('Subagent must be an actual child with the same model and variant');
}

function classify(read, p) {
  if (!Number.isFinite(read) || read < 0) throw new Error('Per-request cache usage is unavailable');
  return read >= p['hit-min'] ? true : read <= p['miss-max'] ? false : null;
}

function conclusion(samples) {
  const timed = samples.filter(s => !s.phase.endsWith('-warm'));
  const valid = timed.filter(s => s.valid && typeof s.hit === 'boolean');
  const hits = valid.filter(s => s.hit).map(s => s.actual_gap_s);
  const misses = valid.filter(s => !s.hit).map(s => s.actual_gap_s);
  const lower = hits.length ? Math.max(...hits) : null;
  const upper = misses.length ? Math.min(...misses) : null;
  if (!valid.length) return { kind: 'uncertain', lower_s: null, upper_s: null };
  if (lower !== null && upper !== null && lower >= upper) return { kind: 'contradictory', lower_s: lower, upper_s: upper };
  if (lower === null) return { kind: 'upper-bound', lower_s: null, upper_s: upper };
  if (upper === null) return { kind: 'lower-bound', lower_s: lower, upper_s: null };
  if (timed.some(s => !s.valid || s.hit === null) || timed.some(s => s.phase.startsWith('sanity') && s.hit === false)) return { kind: 'uncertain', lower_s: lower, upper_s: upper };
  return { kind: 'bracket', lower_s: lower, upper_s: upper };
}

// The adapter alone owns hosting and provider I/O. A clock and cancellation
// signal are injected so the complete search runs offline in tests.
async function measure(adapter, options = {}, io = {}) {
  const p = parameters(options), identity = await adapter.identify();
  validateIdentity(identity);
  const clock = io.clock ?? { now: () => Date.now(), sleep: ms => new Promise(resolve => setTimeout(resolve, ms)) };
  const started = clock.now(), deadline = started + p['max-runtime-min'] * 60000;
  const samples = [], repetitions = [];
  let stopped = null, carry = null, probes = 0;
  const cancelled = () => io.signal?.aborted;
  const budget = () => {
    if (cancelled()) stopped = 'cancelled';
    else if (clock.now() >= deadline) stopped = 'duration-limit';
    else if (probes >= p['max-probes']) stopped = 'probe-limit';
    return !stopped;
  };
  const persist = rec => { samples.push(rec); io.onSample?.(rec); };
  let anchor;
  async function probe(gap, phase, rep) {
    if (!budget()) return null;
    const rec = { rep, phase, target_gap_s: gap, actual_gap_s: null, hit: null, valid: false, limitations: [] };
    try {
      const before = anchor ?? await adapter.snapshot();
      while (clock.now() < before.anchor_ms + gap * 1000) {
        if (!budget()) return null;
        await clock.sleep(Math.min(1000, before.anchor_ms + gap * 1000 - clock.now(), deadline - clock.now()));
      }
      if (!budget()) return null;
      await adapter.assertUnchanged(before, identity);
      if (!budget()) return null;
      const text = p['time-prefix']
        ? `It's ${new Date(clock.now()).toISOString().slice(11, 16)} UTC. ${((clock.now() - before.anchor_ms) / 1000).toFixed(1)} s since the last message. ${p['probe-text']}`
        : p['probe-text'];
      probes++;
      const result = await adapter.probe(text, { before, identity, deadline, signal: io.signal });
      rec.actual_gap_s = (result.created_ms - before.anchor_ms) / 1000;
      if (!Number.isFinite(rec.actual_gap_s) || rec.actual_gap_s < gap) throw new Error('Probe request timing is unavailable or shorter than its waiting interval');
      if (modelKey(result.model) !== modelKey(identity.model)) throw new Error('Model or variant changed');
      rec.cache_read = result.cache_read;
      rec.input = result.input;
      rec.row_id = result.id;
      rec.limitations = result.limitations ?? [];
      rec.valid = rec.limitations.length === 0;
      rec.hit = classify(result.cache_read, p);
      if (!rec.valid) stopped = 'invalid-sample';
      anchor = result.snapshot;
      if (!anchor || !Number.isFinite(anchor.anchor_ms)) throw new Error('Probe completion anchor is unavailable');
    } catch (error) {
      rec.valid = false;
      rec.limitations.push(error.message);
      stopped = cancelled() ? 'cancelled' : 'adapter-error';
    }
    persist(rec);
    return rec;
  }
  const usable = r => r?.valid && !stopped;
  try {
    // Establish a completed anchor before the first measured gap. No provider
    // request is sent by preflight or while waiting.
    anchor = adapter.ready ? await adapter.ready({ deadline, signal: io.signal }) : await adapter.snapshot();
    for (let rep = 1; rep <= p.repeats && budget(); rep++) {
      const startIndex = samples.length, cap = p.cap * 60;
      let gap = Math.min(cap, carry === null ? p.base * 60 : Math.max(p.base * 60, carry - p.step * 60));
      const start = gap;
      let lo = null, hi = null;
      while (budget()) {
        let r = await probe(gap, 'A', rep);
        if (!usable(r)) break;
        if (r.hit === null) r = await probe(gap, 'A-gray', rep);
        if (!usable(r) || r.hit === null) { stopped ??= 'ambiguous-usage'; break; }
        if (!r.hit) { hi = gap; break; }
        lo = gap;
        if (gap === cap) break;
        gap = Math.min(cap, gap + p.step * 60);
      }
      // Preserve the maintained source's actual 60/30/15-second descent.
      for (const shorter of [60, 30, 15]) {
        if (stopped || hi === null || lo !== null || !budget()) break;
        if (shorter >= hi) continue;
        const r = await probe(shorter, 'A-descend', rep);
        if (!usable(r)) break;
        if (r.hit === true) lo = shorter;
        else if (r.hit === false) hi = shorter;
        else { stopped = 'ambiguous-usage'; break; }
      }
      while (!stopped && lo !== null && hi !== null && hi - lo > 2 * p.gran && budget()) {
        const mid = Math.round((lo + hi) / 2 / p.gran) * p.gran;
        if (mid <= lo || mid >= hi) break;
        const warm = await probe(p.warm, 'B-warm', rep);
        if (!usable(warm) || warm.hit !== true) { stopped ??= 'rewarm-not-hit'; break; }
        const r = await probe(mid, 'B', rep);
        if (!usable(r)) break;
        if (r.hit === true) lo = mid;
        else if (r.hit === false) hi = mid;
        else { stopped = 'ambiguous-usage'; break; }
      }
      let sanity = null;
      if (!stopped && lo !== null && hi !== null && budget()) {
        let r = await probe(30, 'sanity', rep);
        if (usable(r) && r.hit === false && budget()) r = await probe(30, 'sanity-retry', rep);
        sanity = r?.hit ?? null;
      }
      if (lo !== null) carry = lo;
      repetitions.push({ rep, start_from_s: start, ttl_bracket_targets_s: lo !== null && hi !== null ? [lo, hi] : null, sanity_30s_hit: sanity, evicted_lru_suspect: sanity === false, observation: conclusion(samples.slice(startIndex)) });
    }
  } catch (error) { stopped = cancelled() ? 'cancelled' : 'adapter-error'; persist({ phase: 'preflight', valid: false, hit: null, limitations: [error.message] }); }
  const observation = conclusion(samples);
  const estimates = repetitions.filter(r => r.observation.kind === 'bracket').map(r => (r.observation.lower_s + r.observation.upper_s) / 2);
  const range = estimates.length ? [Math.min(...estimates), Math.max(...estimates)] : null;
  return { ...identity, parameters: p, status: stopped ? 'incomplete' : 'completed', stop_reason: stopped, probes, runtime_min: (clock.now() - started) / 60000, repetitions, observation, ttl_estimates_s: estimates, ttl_range_s: range, ttl_spread_s: range ? range[1] - range[0] : null, ttl_consistent: range ? range[1] - range[0] <= p['consistent-threshold-s'] : null, results_valid: samples.length > 0 && samples.every(s => s.valid), samples, limitations: ['Empirical cache reuse, not a provider retention guarantee.', 'Cache-read thresholds can include a shared prefix; account traffic can cause eviction.', 'Interference monitoring covers the session history and configured server log only; unlogged warming cannot be excluded.'] };
}

function renderSummary(report) {
  const lines = ['# sai-context-cache-ttl-benchmark', '', `- Tool: ${report.tool}; mode: ${report.mode}; session: ${report.session}`, `- Model: ${report.model?.providerID}/${report.model?.id}; variant: ${report.model?.variant ?? '(none)'}`, `- Status: ${report.status}; stop: ${report.stop_reason ?? 'none'}`, `- Observation: ${JSON.stringify(report.observation ?? { kind: 'unavailable' })}`, `- Valid samples: ${(report.samples ?? []).filter(s => s.valid).length}/${(report.samples ?? []).length}`, '', '| rep | phase | target seconds | actual seconds | cache read | input | verdict |', '|---|---|---|---|---|---|---|'];
  for (const s of report.samples ?? []) lines.push(`| ${s.rep ?? '—'} | ${s.phase} | ${s.target_gap_s ?? '—'} | ${s.actual_gap_s ?? '—'} | ${s.cache_read ?? '—'} | ${s.input ?? '—'} | ${!s.valid ? 'INVALID' : s.hit === true ? 'HIT' : s.hit === false ? 'MISS' : 'partial'} |`);
  lines.push('', `- Repetitions recorded: ${(report.repetitions ?? []).length}/${report.parameters?.repeats ?? '—'}; probes: ${report.probes ?? 0}`, `- Bracket midpoints (seconds): ${JSON.stringify(report.ttl_estimates_s ?? [])}; spread: ${report.ttl_spread_s ?? '—'}; consistent: ${report.ttl_consistent ?? 'unknown'}`);
  for (const rep of report.repetitions ?? []) lines.push(`- Repetition ${rep.rep}: start ${rep.start_from_s}s; target bracket ${JSON.stringify(rep.ttl_bracket_targets_s)}; observed ${JSON.stringify(rep.observation)}; sanity ${rep.sanity_30s_hit ?? 'unknown'}; eviction suspected ${rep.evicted_lru_suspect}`);
  lines.push('', ...(report.limitations ?? []).map(l => `- ${l}`), ...(report.samples ?? []).flatMap(s => s.limitations.map(l => `- ${s.phase}: ${l}`)));
  if (report.observation?.kind === 'lower-bound') lines.push(`- Cache reuse observed through ${report.observation.lower_s} seconds; lifetime exceeds the maximum tested HIT interval. No exact lifetime established.`);
  if (report.observation?.kind === 'upper-bound') lines.push(`- No HIT observed; observed MISS bound ${report.observation.upper_s} seconds, not an exact lifetime.`);
  return lines.join('\n') + '\n';
}

module.exports = { DEFAULTS, parameters, modelKey, validateIdentity, classify, conclusion, measure, renderSummary };
