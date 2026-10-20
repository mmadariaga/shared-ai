#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const registry = require('../sai-state/registry.js');
const envelope = require('../sai-state/envelope.js');

// The worker-report validator is resolved relative to this file. The installed
// layout is `sai/{bin,tools}` and the source layout is `{bin,sai/tools}`; in each
// layout exactly one candidate exists. Loaded by every verb: it is the single source of `received_at`.
const VALIDATOR_CANDIDATES = [
  path.join(__dirname, '..', 'tools', 'worker-report-validator.js'),
  path.join(__dirname, '..', 'sai', 'tools', 'worker-report-validator.js'),
];

// The Ready to Propose detector, resolved the same way. Loaded only by the
// block emit (`emit --ready-to-propose`).
const DETECTOR_CANDIDATES = [
  path.join(__dirname, '..', 'tools', 'ready-to-propose.js'),
  path.join(__dirname, '..', 'sai', 'tools', 'ready-to-propose.js'),
];

// Installed and source layouts both put temp-root beside the detector.
const TEMP_ROOT_CANDIDATES = DETECTOR_CANDIDATES.map(candidate => path.join(path.dirname(candidate), 'temp-root.js'));

let receivedAt = null;

// Every stdout JSON response goes through here so `received_at` is its first key.
function writeResponse(payload) {
  process.stdout.write(JSON.stringify(Object.assign({ received_at: receivedAt }, payload)) + '\n');
}

function loadValidator() {
  for (const candidate of VALIDATOR_CANDIDATES) {
    if (fs.existsSync(candidate)) return require(candidate);
  }
  return null;
}

function loadTempRoot() {
  for (const candidate of TEMP_ROOT_CANDIDATES) {
    if (fs.existsSync(candidate)) return require(candidate);
  }
  throw new Error('sai-state could not load temp-root.js; tried: ' + TEMP_ROOT_CANDIDATES.join(', '));
}

function loadDetector() {
  for (const candidate of DETECTOR_CANDIDATES) {
    if (fs.existsSync(candidate)) return require(candidate);
  }
  return null;
}

const STATE_VERSION = '2.0.0';
const sessions = new Map();

function getSession(id) {
  let s = sessions.get(id);
  if (!s) {
    s = { stateByMachine: new Map(), lastPointer: { follow: 'sai/commands/explore/steps/common.md', hint: 'fetch the current step' } };
    sessions.set(id, s);
  }
  return s;
}

function pointerFor(session, machineId) {
  try {
    if (machineId) {
      const mod = registry.get(machineId);
      if (mod) {
        const cur = session.stateByMachine.has(machineId) ? session.stateByMachine.get(machineId) : mod.initialState;
        try {
          const projected = mod.project(cur);
          if (projected && projected.next && typeof projected.next.follow === 'string' && typeof projected.next.hint === 'string') {
            return projected.next;
          }
        } catch (err) {}
      }
    }
  } catch (err) {}
  return session.lastPointer;
}

function machineLookupError(machineId) {
  const parsed = envelope.parseTarget(machineId);
  if (!parsed) return 'INVALID_EVENT';
  let mod = null;
  try { mod = registry.get(parsed.key); } catch (err) { mod = null; }
  if (mod) return null;
  try {
    const keys = registry.machines();
    for (const k of keys) {
      const kat = k.lastIndexOf('@');
      const kbase = kat === -1 ? null : k.slice(0, kat);
      if (kbase === parsed.machineId) return 'VERSION_MISMATCH';
    }
  } catch (err) {}
  return 'UNKNOWN_MACHINE';
}

// Sessions live in the SAI temp root of the harness this copy is installed
// under (`temp-root.js` resolves and checks it); a source checkout counts as
// Claude Code.
function sessionDir() {
  const tempRoot = loadTempRoot();
  return path.join(tempRoot.resolveTempRoot(tempRoot.harnessFromInstalledPath(__filename)), 'sai-state');
}

const EMIT_STDIN_FORM = "echo '<json>' | node <tool-path> emit <id> <machineId> -";
const EMIT_PROGRESS_FORM = "echo '<progress-payload-json>' | node <tool-path> emit <id> <machineId> --progress [--with-overview true|false] -";
const EMIT_BLOCKS_FORM = "node <tool-path> emit <id> explore-slice@1 --ready-to-propose - (Ready to Propose block set on stdin, optionally followed by a <<<VERDICTS>>> line and the judgment verdicts as a JSON array: quoted heredoc in Bash, single-quoted here-string in PowerShell)";

const EMIT_AMEND_FORM = "node <tool-path> emit <id> explore-slice@1 --ready-to-propose --amend <change-name> - (one Ready to Propose block on stdin, optionally followed by a <<<VERDICTS>>> line and the judgment verdicts as a JSON array)";

// The explore slice machine is the only one that accepts the block emit.
const READY_TO_PROPOSE_MACHINE = 'explore-slice@1';

// The block emit is accepted only while this machine sits at its final stage.
const BLOCK_STAGE_MACHINE = 'explore-idea@1';
const BLOCK_STAGE = 'crystallize';

// The design machine is the only one that accepts the variant option.
const WITH_OVERVIEW_MACHINE = 'design-standalone@1';

// Reads the whole of stdin synchronously. A closed or empty pipe yields ''.
function readStdinSync() {
  const chunks = [];
  const buf = Buffer.alloc(65536);
  for (;;) {
    let n = 0;
    try {
      n = fs.readSync(0, buf, 0, buf.length, null);
    } catch (err) {
      if (err && err.code === 'EAGAIN') continue;
      if (err && err.code === 'EOF') break;
      throw err;
    }
    if (n === 0) break;
    chunks.push(Buffer.from(buf.subarray(0, n)));
  }
  return Buffer.concat(chunks).toString('utf8');
}

// Strips a leading BOM and surrounding whitespace/line breaks (Windows
// PowerShell 5.1 adds both when piping a string to a native command).
function normalizeEventText(raw) {
  let t = typeof raw === 'string' ? raw : '';
  if (t.charCodeAt(0) === 0xFEFF) t = t.slice(1);
  return t.trim();
}

function sessionFile(id) { return path.join(sessionDir(), id + '.json'); }

function isUuidv4(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value || '');
}

function ensureSessionDir() { fs.mkdirSync(sessionDir(), { recursive: true, mode: 0o700 }); }

function writeSessionFile(id, record) {
  ensureSessionDir();
  const target = sessionFile(id);
  const tmp = target + '.' + crypto.randomBytes(6).toString('hex') + '.tmp';
  try {
    fs.writeFileSync(tmp, JSON.stringify(record, null, 2) + '\n', { mode: 0o600 });
    try { fs.chmodSync(tmp, 0o600); } catch (err) {}
    fs.renameSync(tmp, target);
  } catch (err) {
    try { fs.unlinkSync(tmp); } catch (e) {}
    throw err;
  }
}

function readSessionRecord(id) {
  let raw = null;
  try { raw = fs.readFileSync(sessionFile(id), 'utf8'); } catch (err) { raw = null; }
  if (raw === null) return { record: null, warnings: null };
  let record = null;
  try { record = JSON.parse(raw); } catch (err) { record = null; }
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    return { record: null, warnings: ['SESSION_FILE_CORRUPT'] };
  }
  return { record, warnings: null };
}

function seedFromRecord(session, record) {
  if (!record || typeof record !== 'object') return;
  const persisted = record.stateByMachine;
  if (!persisted || typeof persisted !== 'object' || Array.isArray(persisted)) return;
  for (const mid of Object.keys(persisted)) {
    if (session.stateByMachine.has(mid)) continue;
    const entry = persisted[mid];
    if (!entry || typeof entry !== 'object') continue;
    let mod = null;
    try { mod = registry.get(mid); } catch (err) { mod = null; }
    if (!mod) continue;
    session.stateByMachine.set(mid, entry.state && typeof entry.state === 'object' ? entry.state : mod.initialState);
  }
}

function withWarnings(payload, warnings) {
  if (!warnings || warnings.length === 0) return payload;
  return Object.assign({}, payload, { warnings });
}

// Machine-authored observability fields carried verbatim onto the emit wire.
// The set is closed: budget tallies, the name of the exhausted budget, scope
// entry outcomes, the apply-only authorized retry grant/history, and the
// apply-only worker veto record/override outcomes, and the `/sai-3-implement`
// run view (identifiers and paths only).
const OBSERVABILITY_FIELDS = ['budgets', 'exhausted', 'step_entry', 'retry_grant', 'retry_cycle', 'attempt_history', 'veto', 'veto_override', 'run'];

function attachObservabilityFields(target, source) {
  if (!target || !source) return target;
  for (const field of OBSERVABILITY_FIELDS) {
    if (source[field] !== undefined) target[field] = source[field];
  }
  return target;
}

function entryRev(entry) {
  return (entry && typeof entry === 'object' && !Array.isArray(entry) && typeof entry.rev === 'number') ? entry.rev : 0;
}

function stateByMachineMap(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) return {};
  const m = record.stateByMachine;
  if (!m || typeof m !== 'object' || Array.isArray(m)) return {};
  return m;
}

function unionDoneInCanonicalOrder(mod, ...lists) {
  const seen = new Set();
  const flat = [];
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const v of list) {
      if (typeof v !== 'string') continue;
      if (!seen.has(v)) { seen.add(v); flat.push(v); }
    }
  }
  let steps = null;
  try { steps = (mod && Array.isArray(mod.STEPS)) ? mod.STEPS : null; } catch (err) { steps = null; }
  if (steps) {
    const order = new Map();
    for (let i = 0; i < steps.length; i++) { if (!order.has(steps[i])) order.set(steps[i], i); }
    flat.sort((a, b) => {
      const ai = order.has(a) ? order.get(a) : Number.MAX_SAFE_INTEGER;
      const bi = order.has(b) ? order.get(b) : Number.MAX_SAFE_INTEGER;
      if (ai !== bi) return ai - bi;
      return 0;
    });
  }
  return flat;
}

function canonicalizeMergedState(mod, mergedState) {
  try {
    if (!mod || typeof mod.project !== 'function' || !mergedState) return mergedState;
    const proj = mod.project(mergedState);
    if (proj && proj.snapshot && proj.snapshot.state && typeof proj.snapshot.state.stage === 'string') {
      mergedState.stage = proj.snapshot.state.stage;
    }
    if (proj && proj.snapshot && proj.snapshot.state && ('active' in proj.snapshot.state)) {
      mergedState.active = proj.snapshot.state.active;
    }
  } catch (err) {}
  return mergedState;
}

// Re-reads the session file just before writing, keeps sibling machines by max
// `rev`, and unions the target `done[]` in canonical order unless its machine
// declares that this transition replaces a versioned inventory. The
// read-then-write is not atomic (no lockfile, no CAS retry): the residual window
// is accepted because callers serialize store operations per session id and
// the union keeps survivors harmless for monotonic step sets. One file per
// session, never one per machine.
// Top-level session-record fields the next persistMachineOutcome write carries
// with the machine state, so an inventory and its stored blocks land in one
// session-file write. Set by the block emit around its runEmit call only.
let pendingRecordExtras = null;

function persistMachineOutcome(id, record, machineId, nextState, eventId, wire) {
  let freshRecord = null;
  try { freshRecord = readSessionRecord(id).record; } catch (err) { freshRecord = null; }
  const staleMap = stateByMachineMap(record);
  const freshMap = stateByMachineMap(freshRecord);
  const baseForMeta = (freshRecord && typeof freshRecord === 'object' && !Array.isArray(freshRecord)) ? freshRecord : ((record && typeof record === 'object' && !Array.isArray(record)) ? record : {});
  const freshCreatedAt = (freshRecord && typeof freshRecord.createdAt === 'number') ? freshRecord.createdAt : null;
  const staleCreatedAt = (record && typeof record.createdAt === 'number') ? record.createdAt : null;
  const createdAt = (typeof freshCreatedAt === 'number') ? freshCreatedAt : ((typeof staleCreatedAt === 'number') ? staleCreatedAt : Date.now());

  let mod = null;
  try { mod = registry.get(machineId); } catch (err) { mod = null; }

  const staleEntry = (staleMap[machineId] && typeof staleMap[machineId] === 'object' && !Array.isArray(staleMap[machineId])) ? staleMap[machineId] : {};
  const freshEntry = (freshMap[machineId] && typeof freshMap[machineId] === 'object' && !Array.isArray(freshMap[machineId])) ? freshMap[machineId] : {};
  const newRev = Math.max(entryRev(staleEntry), entryRev(freshEntry)) + 1;
  const resetDone = !!(
    mod
    && typeof mod.shouldResetDone === 'function'
    && mod.shouldResetDone(nextState, [staleEntry.state, freshEntry.state])
  );

  let mergedState = nextState;
  const nextHasDone = !!(nextState && Array.isArray(nextState.done));
  const staleHasDone = !!(staleEntry.state && Array.isArray(staleEntry.state.done));
  const freshHasDone = !!(freshEntry.state && Array.isArray(freshEntry.state.done));
  if (nextHasDone || staleHasDone || freshHasDone) {
    const nextDone = nextHasDone ? nextState.done : [];
    const freshDone = freshHasDone ? freshEntry.state.done : [];
    const staleDone = staleHasDone ? staleEntry.state.done : [];
    const united = resetDone
      ? nextDone.slice()
      : unionDoneInCanonicalOrder(mod, nextDone, freshDone, staleDone);
    mergedState = Object.assign({}, nextState);
    mergedState.done = united;
    mergedState = canonicalizeMergedState(mod, mergedState);
  }

  let mergedStage = (mergedState && typeof mergedState.stage === 'string') ? mergedState.stage : wire.stage;
  let mergedNext = wire.next;
  try {
    if (mod && typeof mod.project === 'function' && mergedState) {
      const proj = mod.project(mergedState);
      if (proj && proj.next && typeof proj.next.follow === 'string' && typeof proj.next.hint === 'string') {
        mergedNext = proj.next;
        if (proj.snapshot && proj.snapshot.state && typeof proj.snapshot.state.stage === 'string') {
          mergedStage = proj.snapshot.state.stage;
        }
      }
    }
  } catch (err) {}
  const mergedWire = { stage: mergedStage, next: mergedNext };
  if (wire.rejected !== undefined) mergedWire.rejected = wire.rejected;
  attachObservabilityFields(mergedWire, wire);

  const merged = Object.assign({}, baseForMeta);
  merged.createdAt = createdAt;
  merged.stateVersion = STATE_VERSION;
  if (pendingRecordExtras) Object.assign(merged, pendingRecordExtras);
  merged.stateByMachine = {};
  const allKeys = new Set(Object.keys(staleMap).concat(Object.keys(freshMap)));
  for (const key of allKeys) {
    if (key === machineId) continue;
    const sEnt = staleMap[key];
    const fEnt = freshMap[key];
    const sValid = (sEnt && typeof sEnt === 'object' && !Array.isArray(sEnt)) ? sEnt : null;
    const fValid = (fEnt && typeof fEnt === 'object' && !Array.isArray(fEnt)) ? fEnt : null;
    if (sValid && fValid) {
      merged.stateByMachine[key] = (entryRev(fValid) >= entryRev(sValid)) ? fValid : sValid;
    } else if (fValid) {
      merged.stateByMachine[key] = fValid;
    } else if (sValid) {
      merged.stateByMachine[key] = sValid;
    }
  }
  const lastOutcome = { stage: mergedWire.stage, next: mergedWire.next };
  if (mergedWire.rejected !== undefined) lastOutcome.rejected = mergedWire.rejected;
  attachObservabilityFields(lastOutcome, mergedWire);
  merged.stateByMachine[machineId] = {
    state: mergedState,
    rev: newRev,
    lastEventId: eventId,
    lastOutcome,
  };
  writeSessionFile(id, merged);
  return { mergedState, mergedWire, newRev };
}

// Flags that never take a value, so a following `-` stays positional.
const BOOLEAN_FLAGS = new Set(['progress', 'ready-to-propose', 'export']);

function parseArgs(argv) {
  const out = { command: null, positional: [], named: {} };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const eqIdx = arg.indexOf('=');
      if (eqIdx > 0) {
        out.named[arg.slice(2, eqIdx)] = arg.slice(eqIdx + 1);
      } else {
        out.named[arg.slice(2)] = true;
        if (!BOOLEAN_FLAGS.has(arg.slice(2)) && i + 1 < argv.length && !argv[i + 1].startsWith('--')) {
          out.named[arg.slice(2)] = argv[++i];
        }
      }
    } else if (out.command === null) {
      out.command = arg;
    } else {
      out.positional.push(arg);
    }
  }
  return out;
}

function deriveUuidFromKey(key) {
  const hash = crypto.createHash('sha256').update(key).digest();
  let uuid = '';
  for (let i = 0; i < 16; i++) {
    uuid += ('0' + hash[i].toString(16)).slice(-2);
  }
  // Set version to 4 (bits 12-15 of time_hi_and_version)
  uuid = uuid.substring(0, 12) + '4' + uuid.substring(13);
  // Set variant to RFC 4122 (bits 6-7 of clock_seq_hi_and_reserved to 10)
  const variantSet = ((parseInt(uuid.substring(16, 17), 16) & 0x3) | 0x8).toString(16);
  uuid = uuid.substring(0, 16) + variantSet + uuid.substring(17);
  return uuid.match(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/).slice(1).join('-').toLowerCase();
}

function commandSpawn(key) {
  if (!key) {
    process.stderr.write('spawn requires --key <stable-key>\n');
    process.exitCode = 2;
    return;
  }
  const id = deriveUuidFromKey(key);
  const loaded = readSessionRecord(id);
  const record = loaded.record;
  const loadWarnings = loaded.warnings;

  if (record && record.stateVersion === STATE_VERSION) {
    const payload = withWarnings({ id }, loadWarnings);
    writeResponse(payload);
    process.exitCode = 0;
    return;
  }

  const previous = (record && typeof record === 'object' && !Array.isArray(record)) ? record : null;
  const carriedState = (previous && previous.stateByMachine && typeof previous.stateByMachine === 'object' && !Array.isArray(previous.stateByMachine)) ? previous.stateByMachine : {};
  const newRecord = {
    createdAt: (previous && typeof previous.createdAt === 'number') ? previous.createdAt : Date.now(),
    stateVersion: STATE_VERSION,
    stateByMachine: carriedState,
  };
  writeSessionFile(id, newRecord);
  const payload = withWarnings({ id }, loadWarnings);
  writeResponse(payload);
  process.exitCode = 0;
}

// Shared emit core. `obtainEvent(session, loadWarnings)` returns either
// `{ event }` or `{ payload }` (an INVALID_EVENT outcome whose stderr notice, if
// any, it already wrote). Returns `{ payload, code }` and writes no stdout.
function runEmit(id, machineIdArg, obtainEvent) {
  const loaded = readSessionRecord(id);
  const record = loaded.record;
  const loadWarnings = loaded.warnings;
  const session = getSession(id);

  seedFromRecord(session, record);

  const parsed = envelope.parseTarget(machineIdArg);
  if (!parsed) {
    const payload = withWarnings({ error: 'INVALID_EVENT', next: pointerFor(session, null) }, loadWarnings);
    return { payload, code: 1 };
  }

  const lookup = machineLookupError(machineIdArg);
  if (lookup) {
    const payload = withWarnings({ error: lookup, next: pointerFor(session, null) }, loadWarnings);
    return { payload, code: 1 };
  }

  const targetId = parsed.key;
  const obtained = obtainEvent(session, loadWarnings);
  if (obtained.payload) return { payload: obtained.payload, code: 1 };
  const event = obtained.event;

  let mod = null;
  try { mod = registry.get(targetId); } catch (err) { mod = null; }
  if (!mod) {
    const payload = withWarnings({ error: 'UNKNOWN_MACHINE', next: pointerFor(session, null) }, loadWarnings);
    return { payload, code: 1 };
  }

  const cur = session.stateByMachine.has(targetId) ? session.stateByMachine.get(targetId) : mod.initialState;
  let result = null;
  try {
    result = mod.transition(cur, event);
  } catch (err) {
    result = null;
  }

  if (!result || !result.state || typeof result.state !== 'object') {
    let failNext = session.lastPointer;
    try {
      const projected = mod.project(cur);
      if (projected && projected.next && typeof projected.next.follow === 'string' && typeof projected.next.hint === 'string') {
        failNext = projected.next;
      }
    } catch (e) {}
    const payload = withWarnings({ error: 'INVALID_EVENT', next: failNext }, loadWarnings);
    return { payload, code: 1 };
  }

  const nextState = result.state;
  let nxt = session.lastPointer;
  if (result.next && typeof result.next.follow === 'string' && typeof result.next.hint === 'string') {
    nxt = result.next;
  }

  const wire = { stage: typeof nextState.stage === 'string' ? nextState.stage : undefined, next: nxt };
  if (result.rejected) wire.rejected = result.rejected;
  attachObservabilityFields(wire, result);

  let emitWire = wire;
  let persistedState = nextState;
  try {
    const merged = persistMachineOutcome(id, record, targetId, nextState, '', wire);
    if (merged && merged.mergedWire) emitWire = merged.mergedWire;
    if (merged && merged.mergedState) persistedState = merged.mergedState;
  } catch (err) {}

  session.stateByMachine.set(targetId, persistedState);
  session.lastPointer = emitWire.next;

  const payload = withWarnings(emitWire, loadWarnings);
  return { payload, code: 0 };
}

function commandEmit(id, machineIdArg, eventSource, extraArgs) {
  if (!id || !machineIdArg || eventSource !== '-' || (extraArgs && extraArgs.length > 0) || process.stdin.isTTY) {
    process.stderr.write('emit requires <id> <machineId> - and reads the event JSON from stdin: ' + EMIT_STDIN_FORM + '\n');
    process.exitCode = 2;
    return;
  }

  const outcome = runEmit(id, machineIdArg, (session, loadWarnings) => {
    let eventText = '';
    try { eventText = readStdinSync(); } catch (err) { eventText = ''; }
    try {
      return { event: JSON.parse(normalizeEventText(eventText)) };
    } catch (err) {
      const payload = withWarnings({ error: 'INVALID_EVENT', reason: 'EVENT_UNPARSEABLE', next: pointerFor(session, null) }, loadWarnings);
      process.stderr.write('emit could not parse the event JSON read from stdin; no transition occurred. Send it as: ' + EMIT_STDIN_FORM + '\n');
      return { payload };
    }
  });
  writeResponse(outcome.payload);
  process.exitCode = outcome.code;
}

// Progress emit: validates the worker progress payload read from stdin through
// the validator module BEFORE any session, machine, or registry read, then
// derives the machine event `{ step_ids }` from the valid payload and advances
// the machine. Output is always an object carrying `validation` (the verdict);
// a valid verdict adds the ordinary emit fields unchanged. Exit 1 covers both an
// invalid verdict and a machine error; callers discriminate by `validation.ok`.
function commandEmitProgress(id, machineIdArg, eventSource, extraArgs, withOverviewArg) {
  if (!id || !machineIdArg || eventSource !== '-' || (extraArgs && extraArgs.length > 0) || process.stdin.isTTY) {
    process.stderr.write('emit --progress requires <id> <machineId> --progress - and reads the worker progress payload JSON from stdin: ' + EMIT_PROGRESS_FORM + '\n');
    process.exitCode = 2;
    return;
  }

  let withOverview;
  if (withOverviewArg !== undefined) {
    const target = envelope.parseTarget(machineIdArg);
    if (!target || target.key !== WITH_OVERVIEW_MACHINE) {
      process.stderr.write('--with-overview is accepted only on ' + WITH_OVERVIEW_MACHINE + ', got ' + machineIdArg + '\n');
      process.exitCode = 2;
      return;
    }
    if (withOverviewArg !== 'true' && withOverviewArg !== 'false') {
      process.stderr.write('--with-overview requires true or false: ' + EMIT_PROGRESS_FORM + '\n');
      process.exitCode = 2;
      return;
    }
    withOverview = withOverviewArg === 'true';
  }

  const validator = loadValidator();

  // The raw stdin text goes to the validator unmodified, so the verdict is
  // byte-identical to `worker-report-validator.js validate --kind progress`.
  let text = '';
  try { text = readStdinSync(); } catch (err) { text = ''; }
  const validation = validator.validateText(text, 'progress');
  if (!validation.ok) {
    writeResponse({ validation });
    process.exitCode = 1;
    return;
  }

  const progress = validator.parsePayloadText(text).payload;
  const event = { step_ids: progress.step_ids };
  if (withOverview !== undefined) event.withOverview = withOverview;

  const outcome = runEmit(id, machineIdArg, () => ({ event }));
  writeResponse(Object.assign({ validation }, outcome.payload));
  process.exitCode = outcome.code;
}

// Block emit: validates the Ready to Propose block set read from stdin with the
// detector's dispatchable profile BEFORE any session, machine, or registry read,
// then derives `{ recordedList: [...] }` from the extracted change names
// (display order) and advances the explore slice machine. The stdin may carry
// the bounded-judgment verdicts after a `<<<VERDICTS>>>` line (a JSON array, see
// sai/policies/block-hygiene-judgment.md). The whole set is validated as one
// unit: a set with a structural violation, a flagged line without a `context`
// verdict, or a `violation` verdict records nothing. Output always carries
// `validation`; change names never appear on the wire, so the verdict is
// projected without them. A delivery failure (`EVENT_UNPARSEABLE`) is empty
// stdin, stdin with no block heading, or a final block cut off before its
// `---` line; every other violation is an invalid verdict.
function projectBlockVerdict(verdict) {
  const judgment = verdict.judgment || { ok: true, pending: [], violations: [], unknown: [], invalid: [] };
  return {
    ok: verdict.dispatchable === true,
    structural_ok: verdict.ok,
    profile: verdict.profile,
    blocks: verdict.blocks.map((block) => ({ index: block.index, line: block.line, violations: block.violations, flagged: block.flagged })),
    violations: verdict.violations,
    flagged: verdict.flagged,
    judgment: {
      ok: judgment.ok,
      pending: judgment.pending,
      violations: judgment.violations,
      unknown: judgment.unknown,
      invalid: judgment.invalid,
    },
  };
}

function blockDeliveryFailed(text, verdict) {
  if (normalizeEventText(text) === '') return true;
  if (verdict.blocks.length === 0) return true;
  const last = verdict.blocks[verdict.blocks.length - 1];
  return last.violations.some((v) => v.problem === 'MISSING_SEPARATOR');
}

// Builds, per change name, each recorded block's text, sha256 hash, and the
// judgment verdicts of its flagged lines: the session file's top-level `blocks`
// map. It travels in the same session-file write as the inventory, and a later
// successful block emit replaces the whole map exactly as it replaces the
// inventory.
function buildRecordedBlocks(detector, verdict, text) {
  const texts = detector.extractBlockTexts(text);
  const cleared = (verdict.judgment && verdict.judgment.cleared) || [];
  const blocks = {};
  verdict.blocks.forEach((block, i) => {
    blocks[block.name] = {
      text: texts[i],
      hash: block.hash,
      verdicts: cleared
        .filter((entry) => entry.block === block.index)
        .map((entry) => ({ clause: entry.clause, line: entry.line, evidence: entry.evidence, verdict: entry.verdict })),
    };
  });
  return blocks;
}

function blocksMatch(stored, expected) {
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return false;
  const keys = Object.keys(expected);
  if (Object.keys(stored).length !== keys.length) return false;
  return keys.every((key) => stored[key] && stored[key].hash === expected[key].hash && stored[key].text === expected[key].text);
}

// Confirms the stored blocks match the recorded inventory. When they do not,
// retries the store once and, failing that, removes any earlier emit's map so
// stale text is never left beside a newer inventory. Returns whether the
// session file now holds exactly the recorded blocks.
function ensureRecordedBlocks(id, expected) {
  try {
    if (blocksMatch((readSessionRecord(id).record || {}).blocks, expected)) return true;
    const record = readSessionRecord(id).record;
    if (record) {
      record.blocks = expected;
      writeSessionFile(id, record);
      return true;
    }
  } catch (err) {}
  try {
    const record = readSessionRecord(id).record;
    if (record && record.blocks !== undefined) {
      delete record.blocks;
      writeSessionFile(id, record);
    }
  } catch (err) {}
  return false;
}

// The `explore-idea@1` stage recorded for this session; the machine's initial
// stage when the session holds no state for it.
function ideaStageOf(id) {
  const session = getSession(id);
  seedFromRecord(session, readSessionRecord(id).record);
  const mod = registry.get(BLOCK_STAGE_MACHINE);
  const state = session.stateByMachine.has(BLOCK_STAGE_MACHINE) ? session.stateByMachine.get(BLOCK_STAGE_MACHINE) : mod.initialState;
  return state && typeof state.stage === 'string' ? state.stage : mod.initialState.stage;
}

function commandEmitReadyToPropose(id, machineIdArg, eventSource, extraArgs, amendName, blockFile, verdictsFile) {
  const amending = amendName !== undefined;
  const fromFiles = blockFile !== undefined || verdictsFile !== undefined;
  if (!id || !machineIdArg || (fromFiles ? (eventSource !== undefined && eventSource !== '-') : eventSource !== '-') || (extraArgs && extraArgs.length > 0) || (!fromFiles && process.stdin.isTTY) || (amending && (typeof amendName !== 'string' || amendName === ''))) {
    process.stderr.write('emit --ready-to-propose requires <id> explore-slice@1 --ready-to-propose [--amend <change-name>] - and reads the block set from stdin: ' + (amending ? EMIT_AMEND_FORM : EMIT_BLOCKS_FORM) + '\n');
    process.exitCode = 2;
    return;
  }
  const target = envelope.parseTarget(machineIdArg);
  if (!target || target.key !== READY_TO_PROPOSE_MACHINE) {
    process.stderr.write('--ready-to-propose is accepted only on ' + READY_TO_PROPOSE_MACHINE + ', got ' + machineIdArg + '\n');
    process.exitCode = 2;
    return;
  }

  const detector = loadDetector();
  if (!detector || typeof detector.detect !== 'function') {
    process.stderr.write('sai-state could not load the Ready to Propose detector; tried: ' + DETECTOR_CANDIDATES.join(', ') + '\n');
    process.exitCode = 2;
    return;
  }

  let text = '';
  if (fromFiles) {
    try {
      if (typeof blockFile !== 'string' || typeof verdictsFile !== 'string') throw new Error('--block-file and --verdicts-file are both required');
      text = detector.composeVerdicts(fs.readFileSync(blockFile, 'utf8'), JSON.parse(fs.readFileSync(verdictsFile, 'utf8')));
    } catch (error) {
      writeResponse({ error: 'INVALID_EVENT', reason: 'BLOCK_COMPOSITION_FAILED', detail: error.message });
      process.exitCode = 1;
      return;
    }
  } else {
    try { text = readStdinSync(); } catch (err) { text = ''; }
  }
  const verdict = detector.detect(text, 'dispatchable');
  const validation = projectBlockVerdict(verdict);

  if (blockDeliveryFailed(text, verdict)) {
    const session = getSession(id);
    seedFromRecord(session, readSessionRecord(id).record);
    process.stderr.write('emit --ready-to-propose read an empty or cut-off block set from stdin; no transition occurred. Send it as: ' + EMIT_BLOCKS_FORM + '\n');
    writeResponse({ validation, error: 'INVALID_EVENT', reason: 'EVENT_UNPARSEABLE', next: pointerFor(session, READY_TO_PROPOSE_MACHINE) });
    process.exitCode = 1;
    return;
  }

  if (!verdict.dispatchable) {
    writeResponse({ validation });
    process.exitCode = 1;
    return;
  }

  if (amending) {
    commandAmendBlock(id, machineIdArg, detector, verdict, text, validation, amendName);
    return;
  }

  const stage = ideaStageOf(id);
  if (stage !== BLOCK_STAGE) {
    const session = getSession(id);
    seedFromRecord(session, readSessionRecord(id).record);
    process.stderr.write('emit --ready-to-propose is accepted only at the ' + BLOCK_STAGE + ' stage of ' + BLOCK_STAGE_MACHINE + ', found ' + stage + '; no transition occurred. Advance the exploration to ' + BLOCK_STAGE + ' first.\n');
    writeResponse({ validation, error: 'INVALID_EVENT', reason: 'STAGE_NOT_CRYSTALLIZE', stage, next: pointerFor(session, BLOCK_STAGE_MACHINE) });
    process.exitCode = 1;
    return;
  }

  const dependencies = detector.validateDependencySet(text);
  if (!dependencies.ok) {
    writeResponse({ validation: Object.assign({}, validation, { ok: false, structural_ok: false, violations: validation.violations.concat(dependencies.violations) }), dependencies });
    process.exitCode = 1;
    return;
  }
  const event = { recordedList: dependencies.order };
  const expectedBlocks = buildRecordedBlocks(detector, verdict, text);
  pendingRecordExtras = { blocks: expectedBlocks };
  let outcome;
  try {
    outcome = runEmit(id, machineIdArg, () => ({ event }));
  } finally {
    pendingRecordExtras = null;
  }
  let payload = outcome.payload;
  if (outcome.code === 0 && !payload.rejected && !ensureRecordedBlocks(id, expectedBlocks)) {
    payload = Object.assign({}, payload, { warnings: (payload.warnings || []).concat('BLOCKS_NOT_STORED') });
  }
  writeResponse(Object.assign({ validation }, payload));
  process.exitCode = outcome.code;
}

// Stores one amended block entry beside the untouched entries of the other
// slices: reads the session record, replaces only `blocks[name]`, writes it back,
// and confirms the stored entry. Returns whether the session file now holds it.
function storeAmendedBlock(id, name, entry) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const record = readSessionRecord(id).record;
      if (!record || typeof record !== 'object' || Array.isArray(record)) return false;
      const blocks = (record.blocks && typeof record.blocks === 'object' && !Array.isArray(record.blocks)) ? record.blocks : {};
      record.blocks = Object.assign({}, blocks, { [name]: entry });
      writeSessionFile(id, record);
      const stored = (readSessionRecord(id).record || {}).blocks;
      if (stored && stored[name] && stored[name].hash === entry.hash && stored[name].text === entry.text) return true;
    } catch (err) {}
  }
  return false;
}

// Single-slice amendment (`emit --ready-to-propose --amend <change-name>`): the
// dispatchable verdict of the one block is already in hand. The block must be
// the only one on stdin and carry the amended change name; the machine then
// accepts the amendment for a pending or stopped slice only, and only an
// accepted amendment replaces that slice's stored text, hash, and verdicts.
function commandAmendBlock(id, machineIdArg, detector, verdict, text, validation, amendName) {
  if (verdict.blocks.length !== 1) {
    const session = getSession(id);
    seedFromRecord(session, readSessionRecord(id).record);
    process.stderr.write('emit --ready-to-propose --amend takes exactly one block; no transition occurred. Send it as: ' + EMIT_AMEND_FORM + '\n');
    writeResponse({ validation, error: 'INVALID_EVENT', reason: 'AMEND_BLOCK_COUNT', next: pointerFor(session, READY_TO_PROPOSE_MACHINE) });
    process.exitCode = 1;
    return;
  }
  if (verdict.names[0] !== amendName) {
    const session = getSession(id);
    seedFromRecord(session, readSessionRecord(id).record);
    process.stderr.write('emit --ready-to-propose --amend read a block whose change name differs from the amended slice; no transition occurred.\n');
    writeResponse({ validation, error: 'INVALID_EVENT', reason: 'AMEND_NAME_MISMATCH', next: pointerFor(session, READY_TO_PROPOSE_MACHINE) });
    process.exitCode = 1;
    return;
  }

  const recorded = (readSessionRecord(id).record || {}).blocks || {};
  if (!Object.prototype.hasOwnProperty.call(recorded, amendName)) {
    const outcome = runEmit(id, machineIdArg, () => ({ event: { amend: amendName } }));
    writeResponse(Object.assign({ validation }, outcome.payload));
    process.exitCode = outcome.code;
    return;
  }
  const resulting = Object.entries(recorded).map(([name, entry]) => name === amendName ? detector.extractBlockTexts(text)[0] : entry.text);
  // The amended block alone reads as a single change, so a multi-slice
  // inventory validates the resulting set: every slice keeps an in-scope `I`
  // and no `I` is duplicated or left without a slice.
  if (resulting.length > 1) {
    const setVerdict = detector.detect(resulting.join('\n\n'), 'dispatchable');
    if (!setVerdict.ok) {
      const setValidation = Object.assign(projectBlockVerdict(setVerdict), { flagged: validation.flagged, judgment: validation.judgment });
      writeResponse({ validation: setValidation });
      process.exitCode = 1;
      return;
    }
  }
  const dependencies = detector.validateDependencySet(resulting.join('\n\n'));
  if (!dependencies.ok) {
    writeResponse({ validation: Object.assign({}, validation, { ok: false, structural_ok: false, violations: validation.violations.concat(dependencies.violations) }), dependencies, error: 'INVALID_EVENT', reason: 'AMEND_DEPENDENCIES_INVALID' });
    process.exitCode = 1;
    return;
  }
  // Inventory order cannot be changed underneath running or completed work.
  const previous = detector.validateDependencySet(Object.values(recorded).map(entry => entry.text).join('\n\n'));
  if (JSON.stringify(previous.order) !== JSON.stringify(dependencies.order)) {
    writeResponse({ validation, dependencies, error: 'INVALID_EVENT', reason: 'AMEND_REQUIRES_SET_REEMISSION' });
    process.exitCode = 1;
    return;
  }
  const outcome = runEmit(id, machineIdArg, () => ({ event: { amend: amendName } }));
  let payload = outcome.payload;
  if (outcome.code === 0 && !payload.rejected) {
    const entry = buildRecordedBlocks(detector, verdict, text)[amendName];
    if (!storeAmendedBlock(id, amendName, entry)) {
      payload = Object.assign({}, payload, { warnings: (payload.warnings || []).concat('BLOCKS_NOT_STORED') });
    }
  }
  writeResponse(Object.assign({ validation }, payload));
  process.exitCode = outcome.code;
}

// `sai-state block <id> <change-name>`: returns the stored block text and hash
// of one recorded slice. A missing record, session, or entry is BLOCK_NOT_FOUND
// (exit 1) with no text; the caller dispatches nothing.
function commandBlock(id, name, exportFile, harness) {
  if (!id || !name) {
    process.stderr.write('block requires <id> <change-name>\n');
    process.exitCode = 2;
    return;
  }
  let entry = null;
  try {
    const blocks = (readSessionRecord(id).record || {}).blocks;
    if (blocks && typeof blocks === 'object' && !Array.isArray(blocks) && Object.prototype.hasOwnProperty.call(blocks, name)) {
      entry = blocks[name];
    }
  } catch (err) { entry = null; }
  if (!entry || typeof entry.text !== 'string' || entry.text === '' || typeof entry.hash !== 'string' || entry.hash === '') {
    writeResponse({ error: 'BLOCK_NOT_FOUND' });
    process.exitCode = 1;
    return;
  }
  if (exportFile) {
    try {
      const detector = loadDetector();
      const texts = detector.extractBlockTexts(entry.text);
      if (texts.length !== 1 || detector.hashBlock(texts[0]) !== entry.hash) throw new Error('Stored block does not match its hash');
      // Both installed and source layouts put transfer beside the detector.
      const detectorPath = DETECTOR_CANDIDATES.find(candidate => fs.existsSync(candidate));
      const transfer = require(path.join(path.dirname(detectorPath), 'transfer.js'));
      const { dir } = transfer.open(harness);
      const reference = transfer.put(dir, 'block.md', Buffer.from(entry.text, 'utf8'));
      writeResponse({ hash: entry.hash, block_file: reference.path, transfer_dir: dir });
    } catch (error) {
      writeResponse({ error: 'BLOCK_EXPORT_FAILED', reason: error.message });
      process.exitCode = 1;
      return;
    }
  } else writeResponse({ hash: entry.hash, text: entry.text });
  process.exitCode = 0;
}

function commandReset(id, machineIdArg) {
  if (!id || !machineIdArg) {
    process.stderr.write('reset requires <id> <machineId>\n');
    process.exitCode = 2;
    return;
  }

  const loaded = readSessionRecord(id);
  const record = loaded.record;
  const loadWarnings = loaded.warnings;

  const parsed = envelope.parseTarget(machineIdArg);
  if (!parsed) {
    const payload = withWarnings({ error: 'INVALID_EVENT' }, loadWarnings);
    writeResponse(payload);
    process.exitCode = 1;
    return;
  }

  const targetId = parsed.key;
  let mod = null;
  try { mod = registry.get(targetId); } catch (err) { mod = null; }
  if (!mod) {
    const payload = withWarnings({ error: 'UNKNOWN_MACHINE' }, loadWarnings);
    writeResponse(payload);
    process.exitCode = 1;
    return;
  }

  // Build new record with this machine reset to initialState, preserving siblings by max rev
  const base = (record && typeof record === 'object' && !Array.isArray(record)) ? record : {};
  let freshRecordForReset = null;
  try { freshRecordForReset = readSessionRecord(id).record; } catch (err) { freshRecordForReset = null; }
  const staleMapForReset = stateByMachineMap(record);
  const freshMapForReset = stateByMachineMap(freshRecordForReset);
  const baseForReset = (freshRecordForReset && typeof freshRecordForReset === 'object' && !Array.isArray(freshRecordForReset)) ? freshRecordForReset : base;
  const freshCreatedAtForReset = (freshRecordForReset && typeof freshRecordForReset.createdAt === 'number') ? freshRecordForReset.createdAt : null;
  const baseCreatedAtForReset = (typeof base.createdAt === 'number') ? base.createdAt : null;
  const merged = Object.assign({}, baseForReset);
  merged.createdAt = (typeof freshCreatedAtForReset === 'number') ? freshCreatedAtForReset : ((typeof baseCreatedAtForReset === 'number') ? baseCreatedAtForReset : Date.now());
  merged.stateVersion = STATE_VERSION;
  merged.stateByMachine = {};
  const allResetKeys = new Set(Object.keys(staleMapForReset).concat(Object.keys(freshMapForReset)));
  for (const key of allResetKeys) {
    if (key === targetId) continue;
    const sEnt = staleMapForReset[key];
    const fEnt = freshMapForReset[key];
    const sValid = (sEnt && typeof sEnt === 'object' && !Array.isArray(sEnt)) ? sEnt : null;
    const fValid = (fEnt && typeof fEnt === 'object' && !Array.isArray(fEnt)) ? fEnt : null;
    if (sValid && fValid) {
      merged.stateByMachine[key] = (entryRev(fValid) >= entryRev(sValid)) ? fValid : sValid;
    } else if (fValid) {
      merged.stateByMachine[key] = fValid;
    } else if (sValid) {
      merged.stateByMachine[key] = sValid;
    }
  }

  // Reset just this machine to initial state
  const staleTarget = (staleMapForReset[targetId] && typeof staleMapForReset[targetId] === 'object' && !Array.isArray(staleMapForReset[targetId])) ? staleMapForReset[targetId] : {};
  const freshTarget = (freshMapForReset[targetId] && typeof freshMapForReset[targetId] === 'object' && !Array.isArray(freshMapForReset[targetId])) ? freshMapForReset[targetId] : {};
  const priorRev = Math.max(entryRev(staleTarget), entryRev(freshTarget));
  merged.stateByMachine[targetId] = {
    state: mod.initialState,
    rev: priorRev + 1,
    lastEventId: '',
    lastOutcome: null,
  };

  try {
    writeSessionFile(id, merged);
  } catch (err) {
    const payload = withWarnings({ error: 'WRITE_FAILED' }, loadWarnings);
    writeResponse(payload);
    process.exitCode = 1;
    return;
  }

  // Clear from in-memory cache as well
  sessions.delete(id);

  // Step machines also return the pointer for their first filed step, so the
  // coordinator can send it with the post-ready task disclosure and the worker
  // reports the fileless first step and that step in one progress event.
  // Additive: machines without `firstFiled` keep the `{reset}` response.
  const response = { reset: machineIdArg };
  if (typeof mod.firstFiled === 'function') {
    try {
      const first = mod.firstFiled();
      if (first && typeof first.stage === 'string' && first.next && typeof first.next.follow === 'string' && typeof first.next.hint === 'string') {
        response.stage = first.stage;
        response.next = { follow: first.next.follow, hint: first.next.hint };
      }
    } catch (err) {}
  }

  const payload = withWarnings(response, loadWarnings);
  writeResponse(payload);
  process.exitCode = 0;
}

function commandClose(id) {
  if (!id) {
    process.stderr.write('close requires <id>\n');
    process.exitCode = 2;
    return;
  }

  const target = sessionFile(id);
  try {
    fs.unlinkSync(target);
  } catch (err) {
    if (err.code !== 'ENOENT') {
      process.stderr.write('close failed: ' + err.message + '\n');
      process.exitCode = 2;
      return;
    }
  }

  sessions.delete(id);
  writeResponse({ closed: id });
  process.exitCode = 0;
}

function main(argv) {
  const parsed = parseArgs(argv);
  if (['spawn', 'emit', 'reset', 'close', 'block'].includes(parsed.command)) {
    const validator = loadValidator();
    if (!validator || typeof validator.generateReceivedAt !== 'function' || typeof validator.validateText !== 'function') {
      process.stderr.write('sai-state could not load the worker-report validator; tried: ' + VALIDATOR_CANDIDATES.join(', ') + '\n');
      process.exitCode = 2;
      return;
    }
    receivedAt = validator.generateReceivedAt();
  }
  if (parsed.command === 'spawn') {
    commandSpawn(parsed.named.key);
    return;
  }
  if (parsed.command === 'emit' && parsed.named['ready-to-propose'] === true) {
    if (parsed.named.progress !== undefined || parsed.named['with-overview'] !== undefined) {
      process.stderr.write('--ready-to-propose cannot be combined with --progress or --with-overview\n');
      process.exitCode = 2;
      return;
    }
    commandEmitReadyToPropose(parsed.positional[0], parsed.positional[1], parsed.positional[2], parsed.positional.slice(3), parsed.named.amend, parsed.named['block-file'], parsed.named['verdicts-file']);
    return;
  }
  if (parsed.command === 'emit' && parsed.named.progress === true) {
    commandEmitProgress(parsed.positional[0], parsed.positional[1], parsed.positional[2], parsed.positional.slice(3), parsed.named['with-overview']);
    return;
  }
  if (parsed.command === 'emit') {
    commandEmit(parsed.positional[0], parsed.positional[1], parsed.positional[2], parsed.positional.slice(3));
    return;
  }
  if (parsed.command === 'reset') {
    commandReset(parsed.positional[0], parsed.positional[1]);
    return;
  }
  if (parsed.command === 'close') {
    commandClose(parsed.positional[0]);
    return;
  }
  if (parsed.command === 'block') {
    if (parsed.named.export !== undefined && (parsed.named.export !== true || !['claude', 'opencode'].includes(parsed.named.harness))) {
      process.stderr.write('block --export requires --harness <claude|opencode>\n');
      process.exitCode = 2;
      return;
    }
    commandBlock(parsed.positional[0], parsed.positional[1], parsed.named.export === true, parsed.named.harness);
    return;
  }
  process.stderr.write('Usage: sai-state spawn --key <stable-key>\n');
  process.stderr.write('       sai-state emit <id> <machineId> -   (event JSON on stdin)\n');
  process.stderr.write('       sai-state emit <id> <machineId> --progress [--with-overview true|false] -   (worker progress payload JSON on stdin)\n');
  process.stderr.write('       sai-state emit <id> explore-slice@1 --ready-to-propose -   (Ready to Propose block set on stdin)\n');
  process.stderr.write('       sai-state emit <id> explore-slice@1 --ready-to-propose --amend <change-name> -   (one amended block on stdin)\n');
  process.stderr.write('       sai-state emit <id> explore-slice@1 --ready-to-propose [--amend <name>] --block-file <path> --verdicts-file <path>\n');
  process.stderr.write('       sai-state block <id> <change-name> [--export --harness <claude|opencode>]\n');
  process.stderr.write('       sai-state reset <id> <machineId>\n');
  process.stderr.write('       sai-state close <id>\n');
  process.exitCode = 2;
}

module.exports = { sessionFile, sessionDir, isUuidv4, STATE_VERSION, entryRev, stateByMachineMap, unionDoneInCanonicalOrder, persistMachineOutcome, normalizeEventText };
if (require.main === module) {
  try {
    main(process.argv.slice(2));
  } catch (err) {
    // A missing or unsafe temp root is a blocker with its own message, not a crash.
    if (!(err && err.code && /^TEMP_ROOT_/.test(err.code))) throw err;
    process.stderr.write('sai-state: ' + err.message + '\n');
    process.exitCode = 2;
  }
}
