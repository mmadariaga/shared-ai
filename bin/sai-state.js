#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const registry = require('../sai-state/registry.js');
const envelope = require('../sai-state/envelope.js');

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

function sessionDir() {
  const base = process.env.TMPDIR || process.env.TEMP || process.env.TMP || os.tmpdir();
  return path.join(base, 'sai-state');
}

const EMIT_STDIN_FORM = "echo '<json>' | node <tool-path> emit <id> <machineId> -";

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
// The set is closed: budget tallies, the name of the exhausted budget, and the
// first-entry/re-entry outcome of a scope entry.
const OBSERVABILITY_FIELDS = ['budgets', 'exhausted', 'step_entry'];

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
// `rev`, and unions the target `done[]` in canonical order. The read-then-write
// is not atomic (no lockfile, no CAS retry): the residual window is accepted
// because callers serialize store operations per session id and the union keeps
// survivors harmless for monotonic step sets. One file per session, never one
// per machine.
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

  let mergedState = nextState;
  const nextHasDone = !!(nextState && Array.isArray(nextState.done));
  const staleHasDone = !!(staleEntry.state && Array.isArray(staleEntry.state.done));
  const freshHasDone = !!(freshEntry.state && Array.isArray(freshEntry.state.done));
  if (nextHasDone || staleHasDone || freshHasDone) {
    const nextDone = nextHasDone ? nextState.done : [];
    const freshDone = freshHasDone ? freshEntry.state.done : [];
    const staleDone = staleHasDone ? staleEntry.state.done : [];
    const united = unionDoneInCanonicalOrder(mod, nextDone, freshDone, staleDone);
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
        if (i + 1 < argv.length && !argv[i + 1].startsWith('--')) {
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
    process.stdout.write(JSON.stringify(payload) + '\n');
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
  process.stdout.write(JSON.stringify(payload) + '\n');
  process.exitCode = 0;
}

function commandEmit(id, machineIdArg, eventSource, extraArgs) {
  if (!id || !machineIdArg || eventSource !== '-' || (extraArgs && extraArgs.length > 0) || process.stdin.isTTY) {
    process.stderr.write('emit requires <id> <machineId> - and reads the event JSON from stdin: ' + EMIT_STDIN_FORM + '\n');
    process.exitCode = 2;
    return;
  }

  const loaded = readSessionRecord(id);
  const record = loaded.record;
  const loadWarnings = loaded.warnings;
  const session = getSession(id);

  seedFromRecord(session, record);

  const parsed = envelope.parseTarget(machineIdArg);
  if (!parsed) {
    const payload = withWarnings({ error: 'INVALID_EVENT', next: pointerFor(session, null) }, loadWarnings);
    process.stdout.write(JSON.stringify(payload) + '\n');
    process.exitCode = 1;
    return;
  }

  const lookup = machineLookupError(machineIdArg);
  if (lookup) {
    const payload = withWarnings({ error: lookup, next: pointerFor(session, null) }, loadWarnings);
    process.stdout.write(JSON.stringify(payload) + '\n');
    process.exitCode = 1;
    return;
  }

  const targetId = parsed.key;
  let eventText = '';
  try { eventText = readStdinSync(); } catch (err) { eventText = ''; }
  let event = null;
  try {
    event = JSON.parse(normalizeEventText(eventText));
  } catch (err) {
    const payload = withWarnings({ error: 'INVALID_EVENT', reason: 'EVENT_UNPARSEABLE', next: pointerFor(session, null) }, loadWarnings);
    process.stderr.write('emit could not parse the event JSON read from stdin; no transition occurred. Send it as: ' + EMIT_STDIN_FORM + '\n');
    process.stdout.write(JSON.stringify(payload) + '\n');
    process.exitCode = 1;
    return;
  }

  let mod = null;
  try { mod = registry.get(targetId); } catch (err) { mod = null; }
  if (!mod) {
    const payload = withWarnings({ error: 'UNKNOWN_MACHINE', next: pointerFor(session, null) }, loadWarnings);
    process.stdout.write(JSON.stringify(payload) + '\n');
    process.exitCode = 1;
    return;
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
    process.stdout.write(JSON.stringify(payload) + '\n');
    process.exitCode = 1;
    return;
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
  process.stdout.write(JSON.stringify(payload) + '\n');
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
    process.stdout.write(JSON.stringify(payload) + '\n');
    process.exitCode = 1;
    return;
  }

  const targetId = parsed.key;
  let mod = null;
  try { mod = registry.get(targetId); } catch (err) { mod = null; }
  if (!mod) {
    const payload = withWarnings({ error: 'UNKNOWN_MACHINE' }, loadWarnings);
    process.stdout.write(JSON.stringify(payload) + '\n');
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
    process.stdout.write(JSON.stringify(payload) + '\n');
    process.exitCode = 1;
    return;
  }

  // Clear from in-memory cache as well
  sessions.delete(id);

  const payload = withWarnings({ reset: machineIdArg }, loadWarnings);
  process.stdout.write(JSON.stringify(payload) + '\n');
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
  process.stdout.write(JSON.stringify({ closed: id }) + '\n');
  process.exitCode = 0;
}

function main(argv) {
  const parsed = parseArgs(argv);
  if (parsed.command === 'spawn') {
    commandSpawn(parsed.named.key);
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
  process.stderr.write('Usage: sai-state spawn --key <stable-key>\n');
  process.stderr.write('       sai-state emit <id> <machineId> -   (event JSON on stdin)\n');
  process.stderr.write('       sai-state reset <id> <machineId>\n');
  process.stderr.write('       sai-state close <id>\n');
  process.exitCode = 2;
}

module.exports = { sessionFile, sessionDir, isUuidv4, STATE_VERSION, entryRev, stateByMachineMap, unionDoneInCanonicalOrder, persistMachineOutcome, normalizeEventText };
if (require.main === module) { main(process.argv.slice(2)); }
