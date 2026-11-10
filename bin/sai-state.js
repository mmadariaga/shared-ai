#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const registry = require('../sai-state/registry.js');
const envelope = require('../sai-state/envelope.js');
const { ID_PATTERN } = require('../sai-state/machines/run-core.js');

// The worker-report validator is resolved relative to this file. The installed
// layout is `sai/{bin,tools}` and the source layout is `{bin,sai/tools}`; in each
// layout exactly one candidate exists. Loaded only by the progress emit and the
// block emit (`requireValidator`); the other verbs run without it.
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

// The `received_at` clock, resolved the same way. Loaded by every verb: it is the
// single source of `received_at` and does not depend on the validator.
const RECEIVED_AT_CANDIDATES = DETECTOR_CANDIDATES.map(candidate => path.join(path.dirname(candidate), 'received-at.js'));

// The shared input reader, resolved the same way. Reads `--input-file` or stdin.
const INPUT_READER_CANDIDATES = DETECTOR_CANDIDATES.map(candidate => path.join(path.dirname(candidate), 'input-reader.js'));

let receivedAt = null;

const CORRUPT_WARNING = 'SESSION_FILE_CORRUPT';

// The unparseable session file this process renamed aside, if any: `{ file }` with
// the path of the preserved copy, or null for none. Any verb that reads the store
// can trigger it, and the response of that verb reports it whichever read it was,
// so it is process state rather than a per-read result.
let corruption = null;

// Every stdout JSON response goes through here so `received_at` is its first key.
// A corrupt session file renamed aside by this verb is reported on its response.
function writeResponse(payload) {
  let body = payload;
  if (corruption) {
    body = Object.assign({}, payload);
    const warnings = Array.isArray(body.warnings) ? body.warnings.slice() : [];
    if (!warnings.includes(CORRUPT_WARNING)) warnings.unshift(CORRUPT_WARNING);
    body.warnings = warnings;
    body.corrupt_file = corruption.file;
  }
  process.stdout.write(JSON.stringify(Object.assign({ received_at: receivedAt }, body)) + '\n');
}

function loadValidator() {
  for (const candidate of VALIDATOR_CANDIDATES) {
    if (fs.existsSync(candidate)) return require(candidate);
  }
  return null;
}

// The progress emit and the block emit need the validator module; without it they
// exit 2 naming the paths tried and change nothing. Returns the module, or null
// after reporting.
function requireValidator() {
  const validator = loadValidator();
  if (!validator || typeof validator.validateText !== 'function') {
    process.stderr.write('sai-state could not load the worker-report validator; tried: ' + VALIDATOR_CANDIDATES.join(', ') + '\n');
    process.exitCode = 2;
    return null;
  }
  return validator;
}

function loadReceivedAt() {
  for (const candidate of RECEIVED_AT_CANDIDATES) {
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

function loadInputReader() {
  for (const candidate of INPUT_READER_CANDIDATES) {
    if (fs.existsSync(candidate)) return require(candidate);
  }
  throw new Error('sai-state could not load input-reader.js; tried: ' + INPUT_READER_CANDIDATES.join(', '));
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

const EMIT_STDIN_FORM = "node <tool-path> emit <id> <machineId> --input-file <path> (event JSON in the input file; stdin `-` is still accepted)";
const EMIT_PROGRESS_FORM = "node <tool-path> emit <id> <machineId> --progress --report-dir <dir> --report-file <path> --report-hash <sha256> (the worker's progress report reference, verified and validated here), or --progress --input-file <path> (worker progress payload JSON in the input file; stdin `-` is still accepted)";
const EMIT_BLOCKS_FORM = "node <tool-path> emit <id> explore-slice@1 --ready-to-propose --input-file <path> (Ready to Propose block set in the input file, optionally followed by a <<<VERDICTS>>> line and the judgment verdicts as a JSON array; stdin `-` is still accepted)";

const EMIT_AMEND_FORM = "node <tool-path> emit <id> explore-slice@1 --ready-to-propose --amend <change-name> --input-file <path> (one Ready to Propose block in the input file, optionally followed by a <<<VERDICTS>>> line and the judgment verdicts as a JSON array; stdin `-` is still accepted)";

// The explore slice machine is the only one that accepts the block emit.
const READY_TO_PROPOSE_MACHINE = 'explore-slice@1';

// The block emit is accepted only while this machine sits at its final stage.
const BLOCK_STAGE_MACHINE = 'explore-idea@1';
const BLOCK_STAGE = 'crystallize';

// Reads the structured input: the input file when given, otherwise stdin. A
// stdin failure yields ''; an input file failure is reported and changes no state.
function readEmitInput(inputFile) {
  const reader = loadInputReader();
  if (inputFile) return { text: reader.readInputFile(inputFile) };
  try { return { text: reader.readStdinSync() }; } catch (err) { return { text: '' }; }
}

function inputFileFailure(error) {
  process.stderr.write('emit: ' + error.message + '; no transition occurred\n');
  process.exitCode = 2;
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

// Another writer changed the session file between this verb's read and its write.
class StoreConflictError extends Error {
  constructor(message) {
    super(message);
    this.code = 'STORE_CONFLICT';
  }
}

// The revision counter of a session record: the integer every write raises, `0`
// for an absent record and for a file written before the counter existed.
function revisionOf(record) {
  return (record && typeof record === 'object' && !Array.isArray(record) && Number.isSafeInteger(record.revision) && record.revision >= 0) ? record.revision : 0;
}

// The revision the session file holds right now: `0` when it is absent, `-1`
// when it cannot be read or parsed (never equal to a revision a verb read).
function peekRevision(id) {
  let raw;
  try { raw = fs.readFileSync(sessionFile(id), 'utf8'); } catch (err) { return err && err.code === 'ENOENT' ? 0 : -1; }
  try {
    const parsed = JSON.parse(raw);
    return (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) ? revisionOf(parsed) : -1;
  } catch (err) { return -1; }
}

// Writes the session record as revision `expectedRevision + 1`, where
// `expectedRevision` is the revision this verb read at its start. The file's
// revision is read again just before the rename and a difference raises
// `StoreConflictError` with nothing replaced. The window between that read and
// the rename is accepted: the check detects a crossed write, it does not lock.
function writeSessionFile(id, record, expectedRevision) {
  if (corruption && corruption.file === null) {
    throw new Error('the unparseable session file could not be set aside, so it is not overwritten');
  }
  ensureSessionDir();
  const target = sessionFile(id);
  const tmp = target + '.' + crypto.randomBytes(6).toString('hex') + '.tmp';
  const written = Object.assign({}, record, { revision: expectedRevision + 1 });
  try {
    fs.writeFileSync(tmp, JSON.stringify(written, null, 2) + '\n', { mode: 0o600 });
    try { fs.chmodSync(tmp, 0o600); } catch (err) {}
    const onDisk = peekRevision(id);
    if (onDisk !== expectedRevision) {
      throw new StoreConflictError('the session file is at revision ' + onDisk + ', this verb read revision ' + expectedRevision);
    }
    fs.renameSync(tmp, target);
  } catch (err) {
    try { fs.unlinkSync(tmp); } catch (e) {}
    throw err;
  }
}

// Moves an unparseable session file aside as `<session-file>.corrupt`, adding a
// numeric suffix when that name is taken so an earlier copy survives, and records
// where it went for the response. When the rename fails the file stays in place
// and `corruption.file` is null, which stops any later write over it.
function setAsideCorruptFile(id) {
  const source = sessionFile(id);
  let candidate = source + '.corrupt';
  for (let n = 1; fs.existsSync(candidate) && n < 10000; n++) candidate = source + '.corrupt.' + n;
  try {
    fs.renameSync(source, candidate);
    corruption = { file: candidate };
  } catch (err) {
    corruption = { file: null };
  }
}

function readSessionRecord(id) {
  let raw = null;
  try { raw = fs.readFileSync(sessionFile(id), 'utf8'); } catch (err) { raw = null; }
  if (raw === null) return { record: null, warnings: null };
  let record = null;
  try { record = JSON.parse(raw); } catch (err) { record = null; }
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    setAsideCorruptFile(id);
    return { record: null, warnings: [CORRUPT_WARNING] };
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
// apply-only worker veto record/override outcomes, the `/sai-3-implement`
// run view (identifiers and paths only), and the unknown step ids of a rejected
// step report.
const OBSERVABILITY_FIELDS = ['budgets', 'exhausted', 'step_entry', 'retry_grant', 'retry_cycle', 'attempt_history', 'veto', 'veto_override', 'run', 'unknown_ids'];

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

// Writes one machine's outcome into the session record in a single session-file
// write: the machine's new state, the siblings of the record the verb read at its
// start, and `extras`, top-level session-record fields that must land with the
// state (the block emit's inventory and its stored blocks). The write raises the
// record's revision and fails with `STORE_CONFLICT` when another writer got in
// between (`writeSessionFile`); it throws on any write failure and writes nothing
// then. The target `done[]` is unioned with the stored one in canonical order
// unless the machine declares that this transition replaces a versioned inventory.
// One file per session, never one per machine.
function persistMachineOutcome(id, record, machineId, nextState, eventId, wire, extras) {
  const staleMap = stateByMachineMap(record);
  const baseForMeta = (record && typeof record === 'object' && !Array.isArray(record)) ? record : {};
  const createdAt = (typeof baseForMeta.createdAt === 'number') ? baseForMeta.createdAt : Date.now();

  let mod = null;
  try { mod = registry.get(machineId); } catch (err) { mod = null; }

  const staleEntry = (staleMap[machineId] && typeof staleMap[machineId] === 'object' && !Array.isArray(staleMap[machineId])) ? staleMap[machineId] : {};
  const newRev = entryRev(staleEntry) + 1;
  const resetDone = !!(
    mod
    && typeof mod.shouldResetDone === 'function'
    && mod.shouldResetDone(nextState, [staleEntry.state])
  );

  let mergedState = nextState;
  const nextHasDone = !!(nextState && Array.isArray(nextState.done));
  const staleHasDone = !!(staleEntry.state && Array.isArray(staleEntry.state.done));
  if (nextHasDone || staleHasDone) {
    const nextDone = nextHasDone ? nextState.done : [];
    const staleDone = staleHasDone ? staleEntry.state.done : [];
    const united = resetDone
      ? nextDone.slice()
      : unionDoneInCanonicalOrder(mod, nextDone, staleDone);
    mergedState = Object.assign({}, nextState);
    mergedState.done = united;
    mergedState = canonicalizeMergedState(mod, mergedState);
  }

  let mergedStage = (mergedState && typeof mergedState.stage === 'string') ? mergedState.stage : wire.stage;
  let mergedNext = wire.next;
  try {
    // A rejection answers with the machine's own stage and pointer; every other
    // outcome re-derives them from the merged state.
    if (!wire.rejected && mod && typeof mod.project === 'function' && mergedState) {
      const proj = mod.project(mergedState);
      if (proj && proj.next && typeof proj.next.follow === 'string' && typeof proj.next.hint === 'string') {
        mergedNext = proj.next;
        if (proj.snapshot && proj.snapshot.state && typeof proj.snapshot.state.stage === 'string') {
          mergedStage = proj.snapshot.state.stage;
        }
      }
    }
  } catch (err) {}
  if (wire.rejected && typeof wire.stage === 'string') mergedStage = wire.stage;
  const mergedWire = { stage: mergedStage, next: mergedNext };
  if (wire.rejected !== undefined) mergedWire.rejected = wire.rejected;
  attachObservabilityFields(mergedWire, wire);

  const merged = Object.assign({}, baseForMeta);
  merged.createdAt = createdAt;
  merged.stateVersion = STATE_VERSION;
  if (extras) Object.assign(merged, extras);
  merged.stateByMachine = {};
  for (const key of Object.keys(staleMap)) {
    const entry = staleMap[key];
    if (entry && typeof entry === 'object' && !Array.isArray(entry)) merged.stateByMachine[key] = entry;
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
  writeSessionFile(id, merged, revisionOf(record));
  return { mergedState, mergedWire, newRev };
}

// Flags that never take a value, so a following `-` stays positional.
const BOOLEAN_FLAGS = new Set(['progress', 'ready-to-propose', 'export']);

// Event-building flags: repeatable, each carrying one `<field>=<value>` argument.
// They are collected in order in `out.eventFlags` (a flag without its argument
// records the value `null`) and validated by `buildFlagEvent`.
const EVENT_FLAGS = new Set(['set', 'add', 'set-path']);

function parseArgs(argv) {
  const out = { command: null, positional: [], named: {}, eventFlags: [] };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const eqIdx = arg.indexOf('=');
      const flagName = eqIdx > 0 ? arg.slice(2, eqIdx) : arg.slice(2);
      if (EVENT_FLAGS.has(flagName)) {
        let value = null;
        if (eqIdx > 0) value = arg.slice(eqIdx + 1);
        else if (i + 1 < argv.length && !argv[i + 1].startsWith('--')) value = argv[++i];
        out.eventFlags.push({ flag: flagName, value });
        continue;
      }
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

// Maps a thrown store write error to its wire literal: a crossed write is
// `STORE_CONFLICT`, any other failure `STORE_WRITE_FAILED`. The response carries
// the error text as `detail` and no `stage` or `next`.
function storeFailure(err, loadWarnings) {
  const error = err && err.code === 'STORE_CONFLICT' ? 'STORE_CONFLICT' : 'STORE_WRITE_FAILED';
  return withWarnings({ error, detail: err && err.message ? err.message : String(err) }, loadWarnings);
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
  try {
    writeSessionFile(id, newRecord, revisionOf(record));
  } catch (err) {
    writeResponse(storeFailure(err, loadWarnings));
    process.exitCode = 1;
    return;
  }
  const payload = withWarnings({ id }, loadWarnings);
  writeResponse(payload);
  process.exitCode = 0;
}

// Shared emit core. `obtainEvent(session, loadWarnings)` returns either
// `{ event }` or `{ payload }` (an INVALID_EVENT outcome whose stderr notice, if
// any, it already wrote). `extras` is an object of top-level session-record fields
// written together with the machine state, or a function of the machine's wire
// outcome and the record the verb read that returns such an object or null. A failed or conflicting write
// answers `STORE_WRITE_FAILED` or `STORE_CONFLICT` (exit 1) with no `stage` or
// `next`, leaves the session file as it was, and advances neither the in-memory
// session nor the pointer. Returns `{ payload, code }` and writes no stdout.
function runEmit(id, machineIdArg, obtainEvent, extras) {
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

  // A machine may answer with a stage of its own besides its state (a rejection
  // that re-steers to a pointer the stored state does not derive).
  const answeredStage = typeof result.stage === 'string' ? result.stage : nextState.stage;
  const wire = { stage: typeof answeredStage === 'string' ? answeredStage : undefined, next: nxt };
  if (result.rejected) wire.rejected = result.rejected;
  attachObservabilityFields(wire, result);

  let emitWire = wire;
  let persistedState = nextState;
  try {
    const recordExtras = typeof extras === 'function' ? extras(wire, record) : extras;
    const merged = persistMachineOutcome(id, record, targetId, nextState, '', wire, recordExtras || null);
    if (merged && merged.mergedWire) emitWire = merged.mergedWire;
    if (merged && merged.mergedState) persistedState = merged.mergedState;
  } catch (err) {
    return { payload: storeFailure(err, loadWarnings), code: 1 };
  }

  session.stateByMachine.set(targetId, persistedState);
  session.lastPointer = emitWire.next;

  const payload = withWarnings(emitWire, loadWarnings);
  return { payload, code: 0 };
}

// True when the structured input comes from stdin: the `-` marker, no input file.
function usesStdin(inputFile, eventSource) {
  return !inputFile && eventSource === '-';
}

const EMIT_FLAGS_FORM = "node <tool-path> emit <id> <machineId> --set <field>=<id> [--add <field>=<id> ...] [--set-path <field>=\"<path>\"] (an identifier event built from flags, no input file)";

// A field name starts with a letter and holds letters, digits, or `_`.
const FLAG_FIELD_PATTERN = /^[A-Za-z][A-Za-z0-9_]*$/;
// A `--set-path` value must survive a double-quoted argument in Bash and PowerShell 7.
const FLAG_PATH_FORBIDDEN = /["$`\u0000-\u001f\u007f]/;

// Builds the identifier event of the flag form: `--set <field>=<id>` sets one
// value, repeatable `--add <field>=<id>` appends to a list (`--add <field>=`
// records an empty list), `--set-path <field>=<path>` sets a path. Returns
// `{ event }`, or `{ error }` naming the first violation; nothing else is read.
function buildFlagEvent(flags) {
  const event = {};
  const scalars = new Set();
  const lists = new Map();
  for (const entry of flags) {
    const flag = '--' + entry.flag;
    if (typeof entry.value !== 'string' || entry.value.indexOf('=') < 1) {
      return { error: flag + ' requires <field>=<value>' };
    }
    const eq = entry.value.indexOf('=');
    const field = entry.value.slice(0, eq);
    const value = entry.value.slice(eq + 1);
    if (!FLAG_FIELD_PATTERN.test(field)) {
      return { error: flag + ' field "' + field + '" must start with a letter and hold only letters, digits, or _' };
    }
    if (entry.flag === 'add') {
      if (scalars.has(field)) return { error: 'field "' + field + '" is named by --add and by --set or --set-path' };
      if (!lists.has(field)) lists.set(field, []);
      if (value !== '') {
        if (!ID_PATTERN.test(value)) return { error: '--add value for "' + field + '" is not an identifier (' + ID_PATTERN + ')' };
        lists.get(field).push(value);
      }
      continue;
    }
    if (lists.has(field)) return { error: 'field "' + field + '" is named by --add and by --set or --set-path' };
    if (scalars.has(field)) return { error: 'field "' + field + '" is set more than once' };
    if (entry.flag === 'set') {
      if (!ID_PATTERN.test(value)) return { error: '--set value for "' + field + '" is not an identifier (' + ID_PATTERN + ')' };
    } else if (value === '' || FLAG_PATH_FORBIDDEN.test(value)) {
      return { error: '--set-path value for "' + field + '" is empty or holds a double quote, $, a backtick, or a control character; send this event with --input-file instead' };
    }
    scalars.add(field);
    event[field] = value;
  }
  for (const [field, items] of lists) event[field] = items;
  if (Object.keys(event).length === 0) return { error: 'the flag form needs at least one --set, --add, or --set-path' };
  return { event };
}

function flagUsageError(message) {
  process.stderr.write('emit: ' + message + '; no transition occurred. Send it as: ' + EMIT_FLAGS_FORM + '\n');
  process.exitCode = 2;
}

// Flag-form emit: the event is built from `--set`, `--add`, and `--set-path`,
// so no input file or stdin is read. Combining the flags with any other event
// source is a usage error that changes nothing.
function commandEmitFlags(parsed) {
  const [id, machineIdArg, ...extra] = parsed.positional;
  if (parsed.named['input-file'] !== undefined || parsed.named.progress !== undefined || parsed.named['ready-to-propose'] !== undefined || extra.length > 0) {
    flagUsageError('--set, --add, and --set-path cannot be combined with --input-file, stdin "-", --progress, or --ready-to-propose');
    return;
  }
  if (!id || !machineIdArg) {
    flagUsageError('emit requires <id> <machineId>');
    return;
  }
  const built = buildFlagEvent(parsed.eventFlags);
  if (built.error) {
    flagUsageError(built.error);
    return;
  }
  const outcome = runEmit(id, machineIdArg, () => ({ event: built.event }));
  writeResponse(outcome.payload);
  process.exitCode = outcome.code;
}

function commandEmit(id, machineIdArg, eventSource, extraArgs, inputFile) {
  if (!id || !machineIdArg || !(inputFile ? eventSource === undefined || eventSource === '-' : eventSource === '-') || (extraArgs && extraArgs.length > 0) || (usesStdin(inputFile, eventSource) && process.stdin.isTTY)) {
    process.stderr.write('emit requires <id> <machineId> and reads the event JSON from an input file: ' + EMIT_STDIN_FORM + '\n');
    process.exitCode = 2;
    return;
  }

  let input;
  try { input = readEmitInput(inputFile); } catch (error) { inputFileFailure(error); return; }

  const outcome = runEmit(id, machineIdArg, (session, loadWarnings) => {
    const eventText = input.text;
    try {
      return { event: JSON.parse(normalizeEventText(eventText)) };
    } catch (err) {
      const payload = withWarnings({ error: 'INVALID_EVENT', reason: 'EVENT_UNPARSEABLE', next: pointerFor(session, null) }, loadWarnings);
      process.stderr.write('emit could not parse the event JSON it read; no transition occurred. Send it as: ' + EMIT_STDIN_FORM + '\n');
      return { payload };
    }
  });
  writeResponse(outcome.payload);
  process.exitCode = outcome.code;
}

// Progress emit: validates the worker progress payload through the validator
// module BEFORE any session, machine, or registry read, then derives the machine
// event `{ step_ids }` from the valid payload and advances the machine. Two input
// modes:
//   - reference mode (`--report-dir`, `--report-file`, `--report-hash`, all three):
//     the worker's report reference is verified once (directory, path, sha256) and
//     the machine advances from those same verified bytes, never from a second read
//     of the file; a coordinator does not validate the report beforehand.
//   - input mode (`--input-file`, or stdin `-`): the raw text goes to the validator
//     unmodified, with no hash check.
// Output is always an object carrying `validation` (the verdict); a valid verdict
// adds the ordinary emit fields unchanged. Exit 1 covers both an invalid verdict
// and a machine error; callers discriminate by `validation.ok`.
const PROGRESS_REFERENCE_FLAGS = ['report-dir', 'report-file', 'report-hash'];

function commandEmitProgress(id, machineIdArg, eventSource, extraArgs, inputFile, reference = {}) {
  const referenceMode = PROGRESS_REFERENCE_FLAGS.some((flag) => reference[flag] !== undefined);
  const referenceComplete = PROGRESS_REFERENCE_FLAGS.every((flag) => typeof reference[flag] === 'string' && reference[flag] !== '' && !reference[flag].startsWith('--'));
  if (referenceMode) {
    if (!referenceComplete || inputFile || eventSource !== undefined || (extraArgs && extraArgs.length > 0)) {
      process.stderr.write('emit --progress takes either a report reference (all of --report-dir, --report-file, and --report-hash, with no --input-file) or an input file: ' + EMIT_PROGRESS_FORM + '\n');
      process.exitCode = 2;
      return;
    }
  } else if (!id || !machineIdArg || !(inputFile ? eventSource === undefined || eventSource === '-' : eventSource === '-') || (extraArgs && extraArgs.length > 0) || (usesStdin(inputFile, eventSource) && process.stdin.isTTY)) {
    process.stderr.write('emit --progress requires <id> <machineId> --progress and reads the worker progress payload JSON from an input file: ' + EMIT_PROGRESS_FORM + '\n');
    process.exitCode = 2;
    return;
  }
  if (!id || !machineIdArg) {
    process.stderr.write('emit --progress requires <id> <machineId>: ' + EMIT_PROGRESS_FORM + '\n');
    process.exitCode = 2;
    return;
  }

  const validator = requireValidator();
  if (!validator) return;

  let validation;
  let progress;
  if (referenceMode) {
    // Verified once: the validator reads the bytes through `transfer.js verify`
    // (report directory, containment, symbolic links, sha256) and validates exactly
    // those bytes, so the step ids below come from the bytes that were checked.
    const verdict = validator.validateFile(reference['report-dir'], { path: reference['report-file'], sha256: reference['report-hash'] }, 'progress');
    const { payload, ...rest } = verdict;
    validation = rest;
    progress = payload;
  } else {
    // The raw text goes to the validator unmodified, so the verdict is
    // byte-identical to `worker-report-validator.js validate --kind progress`.
    let text = '';
    try { text = readEmitInput(inputFile).text; } catch (error) { inputFileFailure(error); return; }
    validation = validator.validateText(text, 'progress');
    if (validation.ok) progress = validator.parsePayloadText(text).payload;
  }
  if (!validation.ok) {
    writeResponse({ validation });
    process.exitCode = 1;
    return;
  }

  const event = { step_ids: progress.step_ids };

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

// The `explore-idea@1` stage recorded for this session; the machine's initial
// stage when the session holds no state for it.
function ideaStageOf(id) {
  const session = getSession(id);
  seedFromRecord(session, readSessionRecord(id).record);
  const mod = registry.get(BLOCK_STAGE_MACHINE);
  const state = session.stateByMachine.has(BLOCK_STAGE_MACHINE) ? session.stateByMachine.get(BLOCK_STAGE_MACHINE) : mod.initialState;
  return state && typeof state.stage === 'string' ? state.stage : mod.initialState.stage;
}

function commandEmitReadyToPropose(id, machineIdArg, eventSource, extraArgs, amendName, blockFile, verdictsFile, inputFile) {
  const amending = amendName !== undefined;
  const fromFiles = blockFile !== undefined || verdictsFile !== undefined;
  const fromInputFile = Boolean(inputFile) && !fromFiles;
  if (!id || !machineIdArg || (fromFiles || fromInputFile ? (eventSource !== undefined && eventSource !== '-') : eventSource !== '-') || (extraArgs && extraArgs.length > 0) || (!fromFiles && !fromInputFile && process.stdin.isTTY) || (amending && (typeof amendName !== 'string' || amendName === ''))) {
    process.stderr.write('emit --ready-to-propose requires <id> explore-slice@1 --ready-to-propose [--amend <change-name>] - and reads the block set from an input file: ' + (amending ? EMIT_AMEND_FORM : EMIT_BLOCKS_FORM) + '\n');
    process.exitCode = 2;
    return;
  }
  const target = envelope.parseTarget(machineIdArg);
  if (!target || target.key !== READY_TO_PROPOSE_MACHINE) {
    process.stderr.write('--ready-to-propose is accepted only on ' + READY_TO_PROPOSE_MACHINE + ', got ' + machineIdArg + '\n');
    process.exitCode = 2;
    return;
  }

  if (!requireValidator()) return;

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
    try { text = readEmitInput(inputFile).text; } catch (error) { inputFileFailure(error); return; }
  }
  const verdict = detector.detect(text, 'dispatchable');
  const validation = projectBlockVerdict(verdict);

  if (blockDeliveryFailed(text, verdict)) {
    const session = getSession(id);
    seedFromRecord(session, readSessionRecord(id).record);
    process.stderr.write('emit --ready-to-propose read an empty or cut-off block set; no transition occurred. Send it as: ' + EMIT_BLOCKS_FORM + '\n');
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
  // The inventory and the blocks land in one session-file write; when it fails
  // the response is the store failure and the earlier inventory and blocks stay.
  const outcome = runEmit(id, machineIdArg, () => ({ event }), { blocks: buildRecordedBlocks(detector, verdict, text) });
  writeResponse(Object.assign({ validation }, outcome.payload));
  process.exitCode = outcome.code;
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
  // An accepted amendment replaces only that slice's entry, in the same
  // session-file write as the machine outcome; a rejected one stores nothing.
  const entry = buildRecordedBlocks(detector, verdict, text)[amendName];
  const outcome = runEmit(id, machineIdArg, () => ({ event: { amend: amendName } }), (wire, current) => (wire.rejected ? null : { blocks: Object.assign({}, (current && current.blocks) || {}, { [amendName]: entry }) }));
  writeResponse(Object.assign({ validation }, outcome.payload));
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

  // Build the new record with this machine reset to initialState; siblings stay as read
  const base = (record && typeof record === 'object' && !Array.isArray(record)) ? record : {};
  const siblings = stateByMachineMap(record);
  const merged = Object.assign({}, base);
  merged.createdAt = (typeof base.createdAt === 'number') ? base.createdAt : Date.now();
  merged.stateVersion = STATE_VERSION;
  merged.stateByMachine = {};
  for (const key of Object.keys(siblings)) {
    if (key === targetId) continue;
    const entry = siblings[key];
    if (entry && typeof entry === 'object' && !Array.isArray(entry)) merged.stateByMachine[key] = entry;
  }

  // Reset just this machine to initial state
  const priorTarget = (siblings[targetId] && typeof siblings[targetId] === 'object' && !Array.isArray(siblings[targetId])) ? siblings[targetId] : {};
  merged.stateByMachine[targetId] = {
    state: mod.initialState,
    rev: entryRev(priorTarget) + 1,
    lastEventId: '',
    lastOutcome: null,
  };

  try {
    writeSessionFile(id, merged, revisionOf(record));
  } catch (err) {
    writeResponse(storeFailure(err, loadWarnings));
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
    const clock = loadReceivedAt();
    if (!clock || typeof clock.generateReceivedAt !== 'function') {
      process.stderr.write('sai-state could not load the received_at clock; tried: ' + RECEIVED_AT_CANDIDATES.join(', ') + '\n');
      process.exitCode = 2;
      return;
    }
    receivedAt = clock.generateReceivedAt();
  }
  if (parsed.command === 'spawn') {
    commandSpawn(parsed.named.key);
    return;
  }
  if (parsed.command === 'emit' && parsed.eventFlags.length > 0) {
    commandEmitFlags(parsed);
    return;
  }
  if (parsed.command === 'emit' && parsed.named['ready-to-propose'] === true) {
    if (parsed.named.progress !== undefined) {
      process.stderr.write('--ready-to-propose cannot be combined with --progress\n');
      process.exitCode = 2;
      return;
    }
    commandEmitReadyToPropose(parsed.positional[0], parsed.positional[1], parsed.positional[2], parsed.positional.slice(3), parsed.named.amend, parsed.named['block-file'], parsed.named['verdicts-file'], parsed.named['input-file']);
    return;
  }
  if (parsed.command === 'emit' && parsed.named.progress === true) {
    commandEmitProgress(parsed.positional[0], parsed.positional[1], parsed.positional[2], parsed.positional.slice(3), parsed.named['input-file'], {
      'report-dir': parsed.named['report-dir'],
      'report-file': parsed.named['report-file'],
      'report-hash': parsed.named['report-hash'],
    });
    return;
  }
  if (parsed.command === 'emit') {
    commandEmit(parsed.positional[0], parsed.positional[1], parsed.positional[2], parsed.positional.slice(3), parsed.named['input-file']);
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
  process.stderr.write('       sai-state emit <id> <machineId> --input-file <path>   (event JSON in the input file; `-` reads stdin)\n');
  process.stderr.write('       sai-state emit <id> <machineId> --set <field>=<id> [--add <field>=<id> ...] [--set-path <field>="<path>"]   (identifier event built from flags)\n');
  process.stderr.write('       sai-state emit <id> <machineId> --progress --report-dir <dir> --report-file <path> --report-hash <sha256>   (the worker progress report reference, verified and validated)\n');
  process.stderr.write('       sai-state emit <id> <machineId> --progress --input-file <path>   (worker progress payload JSON in the input file; `-` reads stdin)\n');
  process.stderr.write('       sai-state emit <id> explore-slice@1 --ready-to-propose --input-file <path>   (Ready to Propose block set in the input file; `-` reads stdin)\n');
  process.stderr.write('       sai-state emit <id> explore-slice@1 --ready-to-propose --amend <change-name> --input-file <path>   (one amended block in the input file; `-` reads stdin)\n');
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
