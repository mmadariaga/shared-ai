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

// The change document tool, resolved the same way. Loaded only by the document
// emit (`emit --document-file`) and the document export (`block --export`).
const DETECTOR_CANDIDATES = [
  path.join(__dirname, '..', 'tools', 'change-document.js'),
  path.join(__dirname, '..', 'sai', 'tools', 'change-document.js'),
];

// Installed and source layouts both put temp-root beside the detector.
const TEMP_ROOT_CANDIDATES = DETECTOR_CANDIDATES.map(candidate => path.join(path.dirname(candidate), 'temp-root.js'));

// The `received_at` clock, resolved the same way. Loaded by every verb: it is the
// single source of `received_at` and does not depend on the validator.
const RECEIVED_AT_CANDIDATES = DETECTOR_CANDIDATES.map(candidate => path.join(path.dirname(candidate), 'received-at.js'));

// The shared input reader, resolved the same way. Reads `--input-file` or stdin.
const INPUT_READER_CANDIDATES = DETECTOR_CANDIDATES.map(candidate => path.join(path.dirname(candidate), 'input-reader.js'));

// The shared usage renderer, resolved the same way. Loaded by every invocation: it answers `--help`
// and a wrong invocation before any other work, and without it the tool exits 2 naming the paths tried.
let usageKit = null;
const USAGE_CANDIDATES = DETECTOR_CANDIDATES.map(candidate => path.join(path.dirname(candidate), 'usage.js'));

function loadUsage() {
  for (const candidate of USAGE_CANDIDATES) {
    if (fs.existsSync(candidate)) return require(candidate);
  }
  return null;
}

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

// A usage error keeps the message of the verb parser exactly, then shows the usage block of the verb, so the
// message that states that no transition occurred and shows the canonical form is still the first line.
function usageFailure(verb, message) {
  process.stderr.write(usageKit.render(USAGE, verb, message.replace(/\n$/, '')) + '\n');
  process.exitCode = 2;
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
const EMIT_DOCUMENTS_FORM = "node <tool-path> emit <id> explore-slice@1 --document-file <path> [--verdicts-file <path>] [--document-file <path> [--verdicts-file <path>] ...] (one change document file per change; the verdicts file after a document is the JSON array of its hygiene judgment verdicts)";

const EMIT_AMEND_FORM = "node <tool-path> emit <id> explore-slice@1 --amend <change-name> --document-file <path> [--verdicts-file <path>] (the one amended change document)";

// The explore slice machine is the only one that accepts the document emit.
const READY_TO_PROPOSE_MACHINE = 'explore-slice@1';

// The Direct Build run state of the explore route follows the slice cursor of
// `explore-slice@1`: its `goto` is judged against the run state the store holds
// (the event carries the view), and the effect an accepted outcome has on that
// state lands in the same session-file write as the slice outcome.
const RUN_STATE_MACHINE = 'direct-build-run@1';

// The block emit is accepted only while this machine sits at its final stage.
const BLOCK_STAGE_MACHINE = 'explore-idea@1';
const BLOCK_STAGE = 'crystallize';

// The route intents of `explore-slice@1`: they stay locked while any stored
// block may be stale. `staleBlocks` is the list of stale change names in the
// session file: an accepted backward `goto` from `crystallize` after the blocks
// were registered lists every stored name; an accepted amendment removes its own
// name; a block emit (re-registration) empties the list.
const ROUTE_INTENTS = new Set(['route-choice', 'direct-build', 'plan', 'auto-continue', 'resume-direct-build']);

// Reads the structured input: the input file when given, otherwise stdin. A
// stdin failure yields ''; an input file failure is reported and changes no state.
function readEmitInput(inputFile) {
  const reader = loadInputReader();
  if (inputFile) return { text: reader.readInputFile(inputFile) };
  try { return { text: reader.readStdinSync() }; } catch (err) { return { text: '' }; }
}

function inputFileFailure(error) {
  usageFailure('emit', 'emit: ' + error.message + '; no transition occurred');
  process.exitCode = 2;
}

// Strips a leading BOM and surrounding whitespace/line breaks (Windows
// PowerShell 5.1 adds both when piping a string to a native command).
function normalizeEventText(raw) {
  let t = typeof raw === 'string' ? raw : '';
  if (t.charCodeAt(0) === 0xFEFF) t = t.slice(1);
  return t.trim();
}

// A session id is the lowercase UUID that `spawn` derives from a key, so it holds no
// path separator and no `..`. Every verb checks it before its first file operation.
const SESSION_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function isSessionId(id) { return typeof id === 'string' && SESSION_ID_PATTERN.test(id); }

class SessionIdError extends Error {
  constructor(id) {
    super('session id must be a lowercase UUID, got ' + JSON.stringify(String(id)));
    this.code = 'SESSION_ID_INVALID';
  }
}

function sessionFile(id) {
  if (!isSessionId(id)) throw new SessionIdError(id);
  return path.join(sessionDir(), id + '.json');
}

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
  const machineWarnings = Array.isArray(payload.warnings) ? payload.warnings : [];
  return Object.assign({}, payload, { warnings: warnings.concat(machineWarnings.filter((entry) => !warnings.includes(entry))) });
}

// Machine-authored observability fields carried verbatim onto the emit wire.
// The set is closed: budget tallies, the name of the exhausted budget, scope
// entry outcomes, the apply-only authorized retry grant/history, and the
// apply-only worker veto record/override outcomes, the `/sai-3-implement`
// run view (identifiers and paths only), the unknown step ids of a rejected
// step report, the absent sections and the stage to resume at of a rejected
// `goto` (`missing`, `resume_at`), and the machine warnings (`warnings`, a list of identifiers such
// as WORKER_HANDLE_CHANGED, which the response merges with the store warnings).
const OBSERVABILITY_FIELDS = ['budgets', 'exhausted', 'step_entry', 'retry_grant', 'retry_cycle', 'attempt_history', 'veto', 'veto_override', 'run', 'unknown_ids', 'warnings', 'missing', 'resume_at'];

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
// `siblings` is an optional object of other machines' next states, written in the
// same session-file write as the target machine's state.
function persistMachineOutcome(id, record, machineId, nextState, eventId, wire, extras, siblings) {
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
  for (const siblingId of Object.keys(siblings || {})) {
    const previous = (staleMap[siblingId] && typeof staleMap[siblingId] === 'object' && !Array.isArray(staleMap[siblingId])) ? staleMap[siblingId] : {};
    merged.stateByMachine[siblingId] = {
      state: siblings[siblingId],
      rev: entryRev(previous) + 1,
      lastEventId: '',
      lastOutcome: previous.lastOutcome === undefined ? null : previous.lastOutcome,
    };
  }
  writeSessionFile(id, merged, revisionOf(record));
  return { mergedState, mergedWire, newRev };
}

// Flags that never take a value, so a following `-` stays positional.
const BOOLEAN_FLAGS = new Set(['progress', 'export']);

// Document flags: `--document-file` is repeatable and each `--verdicts-file`
// belongs to the document file named before it. They are collected in order in
// `out.documents` as `{ file, verdictsFile }`; a verdicts file with no document
// before it is kept in `out.orphanVerdicts`.
const DOCUMENT_FLAGS = new Set(['document-file', 'verdicts-file']);

// Event-building flags: repeatable, each carrying one `<field>=<value>` argument.
// They are collected in order in `out.eventFlags` (a flag without its argument
// records the value `null`) and validated by `buildFlagEvent`.
const EVENT_FLAGS = new Set(['set', 'add', 'set-path']);

function parseArgs(argv) {
  const out = { command: null, positional: [], named: {}, eventFlags: [], documents: [], orphanVerdicts: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const eqIdx = arg.indexOf('=');
      const flagName = eqIdx > 0 ? arg.slice(2, eqIdx) : arg.slice(2);
      if (DOCUMENT_FLAGS.has(flagName)) {
        let value = null;
        if (eqIdx > 0) value = arg.slice(eqIdx + 1);
        else if (i + 1 < argv.length && !argv[i + 1].startsWith('--')) value = argv[++i];
        if (flagName === 'document-file') out.documents.push({ file: value, verdictsFile: undefined });
        else if (out.documents.length === 0 || out.documents[out.documents.length - 1].verdictsFile !== undefined) out.orphanVerdicts = true;
        else out.documents[out.documents.length - 1].verdictsFile = value;
        continue;
      }
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
  if (typeof key !== 'string' || !key) {
    usageFailure('spawn', 'spawn requires --key <stable-key>');
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

// The view of the Direct Build run state the store holds, for `explore-slice@1`
// to judge a rewind against: the slice it belongs to, the route items it holds,
// and any hold on a rewind. A session that never wrote one has none.
function runStateView(session) {
  const stored = session.stateByMachine.get(RUN_STATE_MACHINE);
  return registry.get(RUN_STATE_MACHINE).rewindView(stored === undefined ? registry.get(RUN_STATE_MACHINE).initialState : stored);
}

// The run state after the effect of an accepted slice outcome, keyed for the
// session-file write; null when the session holds no run state or the effect
// leaves it as it is.
function runStateAfter(session, effect) {
  const stored = session.stateByMachine.get(RUN_STATE_MACHINE);
  if (!stored || !effect) return null;
  const mod = registry.get(RUN_STATE_MACHINE);
  const events = (effect.drop || []).map((change) => ({ kind: 'discard', change }));
  if (effect.rewind) events.push({ kind: 'rewind', change: effect.rewind.slice, item: effect.rewind.item });
  let state = stored;
  for (const event of events) {
    const result = mod.transition(state, event);
    if (result && result.state && !result.rejected) state = result.state;
  }
  return JSON.stringify(state) === JSON.stringify(mod.project(stored).snapshot.state) ? null : { [RUN_STATE_MACHINE]: state };
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
  const staleBlocks = targetId === READY_TO_PROPOSE_MACHINE && record && Array.isArray(record.staleBlocks) && record.staleBlocks.length > 0
    && event && typeof event === 'object' && ROUTE_INTENTS.has(event.intent);
  // The reception time of an accepted `goto` is the response's `received_at`; a
  // slice `goto` also carries the view of the Direct Build run state in the store.
  const isGoto = event && typeof event === 'object' && !Array.isArray(event) && event.intent === 'goto';
  const machineEvent = isGoto
    ? Object.assign({}, event, { received_at: receivedAt }, targetId === READY_TO_PROPOSE_MACHINE ? { run_state: runStateView(session) } : {})
    : event;
  let result = null;
  try {
    result = mod.transition(cur, machineEvent);
    if (staleBlocks && result && result.state) result = Object.assign({}, mod.transition(cur, {}), { rejected: 'BLOCKS_STALE' });
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
  let siblings = null;
  try {
    let recordExtras = typeof extras === 'function' ? extras(wire, record) : extras;
    // Moving back from `crystallize` after the blocks were registered leaves
    // every stored block stale until it is registered again or amended.
    if (targetId === BLOCK_STAGE_MACHINE && machineEvent && machineEvent.intent === 'goto' && !wire.rejected
      && cur && cur.stage === BLOCK_STAGE && nextState.stage !== BLOCK_STAGE
      && record && record.blocks && typeof record.blocks === 'object' && Object.keys(record.blocks).length > 0) {
      recordExtras = Object.assign({}, recordExtras || {}, { staleBlocks: Object.keys(record.blocks) });
    }
    siblings = targetId === READY_TO_PROPOSE_MACHINE && !wire.rejected ? runStateAfter(session, result.run_effect) : null;
    const merged = persistMachineOutcome(id, record, targetId, nextState, '', wire, recordExtras || null, siblings);
    if (merged && merged.mergedWire) emitWire = merged.mergedWire;
    if (merged && merged.mergedState) persistedState = merged.mergedState;
  } catch (err) {
    return { payload: storeFailure(err, loadWarnings), code: 1 };
  }

  session.stateByMachine.set(targetId, persistedState);
  if (siblings) for (const siblingId of Object.keys(siblings)) session.stateByMachine.set(siblingId, siblings[siblingId]);
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
      if (!ID_PATTERN.test(value)) {
        return { error: '--set value for "' + field + '" is not an identifier (' + ID_PATTERN + '); use --set-path ' + field + '="<value>"' };
      }
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
  usageFailure('emit', 'emit: ' + message + '; no transition occurred. Send it as: ' + EMIT_FLAGS_FORM);
  process.exitCode = 2;
}

// Flag-form emit: the event is built from `--set`, `--add`, and `--set-path`,
// so no input file or stdin is read. Combining the flags with any other event
// source is a usage error that changes nothing.
function commandEmitFlags(parsed) {
  const [id, machineIdArg, ...extra] = parsed.positional;
  if (parsed.named['input-file'] !== undefined || parsed.named.progress !== undefined || parsed.documents.length > 0 || extra.length > 0) {
    flagUsageError('--set, --add, and --set-path cannot be combined with --input-file, stdin "-", --progress, or --document-file');
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
    usageFailure('emit', 'emit requires <id> <machineId> and reads the event JSON from an input file: ' + EMIT_STDIN_FORM);
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
      usageFailure('emit', 'emit --progress takes either a report reference (all of --report-dir, --report-file, and --report-hash, with no --input-file) or an input file: ' + EMIT_PROGRESS_FORM);
      process.exitCode = 2;
      return;
    }
  } else if (!id || !machineIdArg || !(inputFile ? eventSource === undefined || eventSource === '-' : eventSource === '-') || (extraArgs && extraArgs.length > 0) || (usesStdin(inputFile, eventSource) && process.stdin.isTTY)) {
    usageFailure('emit', 'emit --progress requires <id> <machineId> --progress and reads the worker progress payload JSON from an input file: ' + EMIT_PROGRESS_FORM);
    process.exitCode = 2;
    return;
  }
  if (!id || !machineIdArg) {
    usageFailure('emit', 'emit --progress requires <id> <machineId>: ' + EMIT_PROGRESS_FORM);
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

// Document emit: validates the change document set named by the repeatable
// `--document-file` flags with the change-document tool BEFORE any session,
// machine, or registry read, then derives `{ recordedList: [...] }` from the
// documents' change names in dependency order and advances the explore slice
// machine. Each document may be followed by its own `--verdicts-file`, the JSON
// array of its bounded-judgment verdicts (see sai/policies/block-hygiene-judgment.md),
// with each `line` counted in the document file. The whole set is validated as
// one unit: a set with a structural violation, a repeated change name, a
// dependency that is absent or forms a cycle, a flagged line without a `context`
// verdict, or a `violation` verdict records nothing. Output always carries
// `validation`; change names never appear on the wire, so the verdict is
// projected without them. A delivery failure (`EVENT_UNPARSEABLE`) is an empty
// set or a file that is not one change document; a `Ready to Propose` block is
// the retired format (`RETIRED_FORMAT`) and is never converted.
function projectDocumentVerdict(setResult, checks) {
  const judgment = { ok: true, pending: [], violations: [], unknown: [], invalid: [] };
  const flagged = [];
  checks.forEach((check, index) => {
    if (!check.judgment.ok) judgment.ok = false;
    for (const key of ['pending', 'violations', 'unknown', 'invalid']) {
      for (const entry of check.judgment[key]) judgment[key].push(Object.assign({ document: index }, entry));
    }
    for (const entry of check.flagged) flagged.push(Object.assign({ document: index }, entry));
  });
  return {
    ok: setResult.ok === true && judgment.ok,
    structural_ok: setResult.ok === true,
    profile: 'document',
    documents: checks.map((check, index) => ({ index, violations: check.violations, flagged: check.flagged })),
    violations: setResult.violations,
    flagged,
    judgment,
  };
}

// Builds, per change name, each recorded document's text, sha256 hash, and the
// judgment verdicts of its flagged lines: the session file's top-level `blocks`
// map. It travels in the same session-file write as the inventory, and a later
// successful document emit replaces the whole map exactly as it replaces the
// inventory.
function buildRecordedDocuments(texts, checks) {
  const documents = {};
  checks.forEach((check, i) => {
    documents[check.name] = {
      text: texts[i],
      hash: check.hash,
      verdicts: check.judgment.cleared
        .map((entry) => ({ clause: entry.clause, line: entry.line, evidence: entry.evidence, verdict: entry.verdict })),
    };
  });
  return documents;
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

function commandEmitDocuments(id, machineIdArg, eventSource, extraArgs, amendName, documents, orphanVerdicts, inputFile) {
  const amending = amendName !== undefined;
  const form = amending ? EMIT_AMEND_FORM : EMIT_DOCUMENTS_FORM;
  if (!id || !machineIdArg || eventSource !== undefined || (extraArgs && extraArgs.length > 0) || inputFile !== undefined || orphanVerdicts
    || documents.length === 0 || documents.some((entry) => typeof entry.file !== 'string' || entry.file === '' || (entry.verdictsFile !== undefined && (typeof entry.verdictsFile !== 'string' || entry.verdictsFile === '')))
    || (amending && (typeof amendName !== 'string' || amendName === ''))) {
    usageFailure('emit', 'emit --document-file requires <id> explore-slice@1 and reads the documents from files: ' + form);
    process.exitCode = 2;
    return;
  }
  const target = envelope.parseTarget(machineIdArg);
  if (!target || target.key !== READY_TO_PROPOSE_MACHINE) {
    usageFailure('emit', '--document-file is accepted only on ' + READY_TO_PROPOSE_MACHINE + ', got ' + machineIdArg);
    process.exitCode = 2;
    return;
  }

  if (!requireValidator()) return;

  const detector = loadDetector();
  if (!detector || typeof detector.checkDocument !== 'function') {
    process.stderr.write('sai-state could not load the change document tool; tried: ' + DETECTOR_CANDIDATES.join(', ') + '\n');
    process.exitCode = 2;
    return;
  }

  let texts;
  let verdictLists;
  try {
    texts = documents.map((entry) => fs.readFileSync(entry.file, 'utf8'));
    verdictLists = documents.map((entry) => (entry.verdictsFile === undefined ? [] : JSON.parse(fs.readFileSync(entry.verdictsFile, 'utf8'))));
    if (verdictLists.some((list) => !Array.isArray(list))) throw new Error('the verdicts of a document must be a JSON array');
  } catch (error) {
    writeResponse({ error: 'INVALID_EVENT', reason: 'DOCUMENT_READ_FAILED', detail: error.message });
    process.exitCode = 1;
    return;
  }

  const shapeFailure = texts.map((text) => detector.documentShape(text)).find((shape) => shape !== null);
  if (shapeFailure !== undefined) {
    const session = getSession(id);
    seedFromRecord(session, readSessionRecord(id).record);
    const retired = texts.some((text) => detector.isRetiredBlockFormat(text));
    process.stderr.write('emit --document-file read ' + (retired ? 'a retired Ready to Propose block' : 'a file that is not one change document') + '; no transition occurred. Send it as: ' + form + '\n');
    writeResponse({ error: 'INVALID_EVENT', reason: retired ? 'RETIRED_FORMAT' : 'EVENT_UNPARSEABLE', detail: shapeFailure, next: pointerFor(session, READY_TO_PROPOSE_MACHINE) });
    process.exitCode = 1;
    return;
  }

  if (amending) {
    if (documents.length !== 1) {
      const session = getSession(id);
      seedFromRecord(session, readSessionRecord(id).record);
      usageFailure('emit', 'emit --amend takes exactly one document; no transition occurred. Send it as: ' + EMIT_AMEND_FORM);
      writeResponse({ error: 'INVALID_EVENT', reason: 'AMEND_DOCUMENT_COUNT', next: pointerFor(session, READY_TO_PROPOSE_MACHINE) });
      process.exitCode = 1;
      return;
    }
    commandAmendDocument(id, machineIdArg, detector, texts[0], verdictLists[0], amendName);
    return;
  }

  const sliced = texts.length > 1;
  const checks = texts.map((text, index) => detector.checkDocument(text, { verdicts: verdictLists[index], sliced }));
  const set = detector.checkSet(texts);
  const validation = projectDocumentVerdict(set, checks);
  if (!validation.ok) {
    writeResponse({ validation });
    process.exitCode = 1;
    return;
  }

  const stage = ideaStageOf(id);
  if (stage !== BLOCK_STAGE) {
    const session = getSession(id);
    seedFromRecord(session, readSessionRecord(id).record);
    process.stderr.write('emit --document-file is accepted only at the ' + BLOCK_STAGE + ' stage of ' + BLOCK_STAGE_MACHINE + ', found ' + stage + '; no transition occurred. Advance the exploration to ' + BLOCK_STAGE + ' first.\n');
    writeResponse({ validation, error: 'INVALID_EVENT', reason: 'STAGE_NOT_CRYSTALLIZE', stage, next: pointerFor(session, BLOCK_STAGE_MACHINE) });
    process.exitCode = 1;
    return;
  }

  const recordedDocuments = buildRecordedDocuments(texts, checks);
  // A slice whose document hash equals the stored one keeps its completion and
  // its parked cursor through the re-registration.
  const previousDocuments = (readSessionRecord(id).record || {}).blocks || {};
  const unchanged = set.order.filter((name) => Object.prototype.hasOwnProperty.call(previousDocuments, name)
    && previousDocuments[name] && previousDocuments[name].hash === recordedDocuments[name].hash);
  const event = { recordedList: set.order, unchanged };
  // The inventory and the documents land in one session-file write; when it
  // fails the response is the store failure and the earlier inventory and
  // documents stay.
  const outcome = runEmit(id, machineIdArg, () => ({ event }), { blocks: recordedDocuments, staleBlocks: [] });
  writeResponse(Object.assign({ validation }, outcome.payload));
  process.exitCode = outcome.code;
}

// Single-slice amendment (`emit --amend <change-name> --document-file <path>`):
// the one document must be dispatchable and carry the amended change name; the
// machine then accepts the amendment for a pending or stopped slice only, and
// only an accepted amendment replaces that slice's stored text, hash, and
// verdicts.
function commandAmendDocument(id, machineIdArg, detector, text, verdicts, amendName) {
  const recorded = (readSessionRecord(id).record || {}).blocks || {};
  const check = detector.checkDocument(text, { verdicts, sliced: Object.keys(recorded).length > 1 });
  const validation = projectDocumentVerdict({ ok: check.ok, violations: [] }, [check]);
  if (!validation.ok) {
    writeResponse({ validation });
    process.exitCode = 1;
    return;
  }
  if (check.name !== amendName) {
    const session = getSession(id);
    seedFromRecord(session, readSessionRecord(id).record);
    process.stderr.write('emit --amend read a document whose change name differs from the amended slice; no transition occurred.\n');
    writeResponse({ validation, error: 'INVALID_EVENT', reason: 'AMEND_NAME_MISMATCH', next: pointerFor(session, READY_TO_PROPOSE_MACHINE) });
    process.exitCode = 1;
    return;
  }

  if (!Object.prototype.hasOwnProperty.call(recorded, amendName)) {
    const outcome = runEmit(id, machineIdArg, () => ({ event: { amend: amendName, amend_kind: 'content' } }));
    writeResponse(Object.assign({ validation }, outcome.payload));
    process.exitCode = outcome.code;
    return;
  }
  // The amended document alone reads as one change, so the resulting set is
  // validated: every slice keeps an in-scope `I`, no `I` is duplicated or left
  // without a slice, and the names and dependencies stay consistent.
  const resulting = Object.entries(recorded).map(([name, entry]) => (name === amendName ? text : entry.text));
  const set = detector.checkSet(resulting);
  if (!set.ok) {
    const dependencyProblem = set.violations.some((entry) => entry.problem === 'MISSING_DEPENDENCY' || entry.problem === 'DEPENDENCY_CYCLE');
    const setValidation = Object.assign({}, validation, { ok: false, structural_ok: false, violations: validation.violations.concat(set.violations) });
    writeResponse(Object.assign({ validation: setValidation }, dependencyProblem ? { error: 'INVALID_EVENT', reason: 'AMEND_DEPENDENCIES_INVALID' } : {}));
    process.exitCode = 1;
    return;
  }
  // Inventory order cannot be changed underneath running or completed work.
  const previous = detector.checkSet(Object.values(recorded).map((entry) => entry.text));
  if (JSON.stringify(previous.order) !== JSON.stringify(set.order)) {
    writeResponse({ validation, error: 'INVALID_EVENT', reason: 'AMEND_REQUIRES_SET_REEMISSION' });
    process.exitCode = 1;
    return;
  }
  // An accepted amendment replaces only that slice's entry, in the same
  // session-file write as the machine outcome; a rejected one stores nothing.
  const entry = buildRecordedDocuments([text], [check])[amendName];
  // The field-by-field comparison decides whether the route authorization stays.
  const amendKind = detector.compareDocuments(recorded[amendName].text, text).amend_kind;
  const outcome = runEmit(id, machineIdArg, () => ({ event: { amend: amendName, amend_kind: amendKind } }), (wire, current) => (wire.rejected ? null : { blocks: Object.assign({}, (current && current.blocks) || {}, { [amendName]: entry }), staleBlocks: ((current && Array.isArray(current.staleBlocks)) ? current.staleBlocks : []).filter((name) => name !== amendName) }));
  writeResponse(Object.assign({ validation, amend_kind: amendKind }, outcome.payload));
  process.exitCode = outcome.code;
}

// `sai-state block <id> <change-name>`: returns the stored change document text
// and hash of one recorded slice, or with `--export` writes the text to a private
// transfer file and returns its path. A missing record, session, or entry is
// BLOCK_NOT_FOUND (exit 1) with no text; the caller dispatches nothing.
function commandBlock(id, name, exportFile, harness) {
  if (!id || !name) {
    usageFailure('block', 'block requires <id> <change-name>');
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
      if (detector.documentShape(entry.text) !== null || detector.hashDocument(entry.text) !== entry.hash) throw new Error('Stored document does not match its hash');
      // Both installed and source layouts put transfer beside the document tool.
      const detectorPath = DETECTOR_CANDIDATES.find(candidate => fs.existsSync(candidate));
      const transfer = require(path.join(path.dirname(detectorPath), 'transfer.js'));
      const { dir } = transfer.open(harness);
      const reference = transfer.put(dir, 'document.md', Buffer.from(entry.text, 'utf8'));
      writeResponse({ hash: entry.hash, document_file: reference.path, transfer_dir: dir });
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
    usageFailure('reset', 'reset requires <id> <machineId>');
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
    usageFailure('close', 'close requires <id>');
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

const SS = 'node bin/sai-state.js';
const EMIT_SOURCES = { '--input-file': { once: true }, '--set': true, '--add': true, '--set-path': true, '--progress': false,
  '--report-dir': { once: true }, '--report-file': { once: true }, '--report-hash': { once: true },
  '--document-file': true, '--verdicts-file': true, '--amend': { once: true },
  '--ready-to-propose': true, '--block-file': true };

const USAGE = {
  subcommands: {
    spawn: {
      usage: [`${SS} spawn --key <stable-key>`],
      notes: ['Opens (or finds) the store session of the stable key.'],
      examples: [`${SS} spawn --key implement-my-change`],
      flags: { '--key': { once: true } },
      lenient: true,
    },
    emit: {
      usage: [
        `${SS} emit <id> <machineId> --input-file <path>`,
        `${SS} emit <id> <machineId> --set <field>=<id> [--add <field>=<id> ...] [--set-path <field>="<path>"]`,
        `${SS} emit <id> <machineId> --progress --report-dir <dir> --report-file <path> --report-hash <sha256>`,
        `${SS} emit <id> <machineId> --progress --input-file <path>`,
        `${SS} emit <id> explore-slice@1 --document-file <path> [--verdicts-file <path>] [--document-file <path> ...]`,
        `${SS} emit <id> explore-slice@1 --amend <change-name> --document-file <path> [--verdicts-file <path>]`,
      ],
      notes: [
        'Each line is one shape of emit, and the shapes do not combine:',
        '  --input-file: the event JSON is in the input file (`-` as a third argument reads stdin).',
        '  --set, --add, --set-path: an identifier event built from flags, with no input file.',
        '  --progress --report-dir --report-file --report-hash: the worker progress report reference, verified and validated here.',
        '  --progress --input-file: the worker progress payload JSON is in the input file.',
        '  --document-file: one change document file per change, each optionally followed by its --verdicts-file.',
        '  --amend: the one amended change document of the named change.',
      ],
      examples: [
        `${SS} emit implement-my-change implement-run@1 --input-file event.json`,
        `${SS} emit implement-my-change implement-run@1 --set stage=green --add done=step-1`,
        `${SS} emit review-my-change review-steps@1 --progress --report-dir /path/to/report-dir --report-file progress-1.yaml --report-hash 0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef`,
        `${SS} emit review-my-change review-steps@1 --progress --input-file progress.json`,
        `${SS} emit explore-session explore-slice@1 --document-file document.md --verdicts-file verdicts.json`,
        `${SS} emit explore-session explore-slice@1 --amend my-change --document-file document.md`,
      ],
      flags: EMIT_SOURCES,
      lenient: true,
    },
    block: {
      usage: [`${SS} block <id> <change-name> [--export --harness <claude|opencode>]`],
      notes: ['Reads the stored change document of the change; --export writes it to a private file for the named harness.'],
      examples: [`${SS} block explore-session my-change --export --harness claude`],
      flags: { '--export': false, '--harness': true },
      lenient: true,
    },
    reset: {
      usage: [`${SS} reset <id> <machineId>`],
      notes: ['Resets one machine of the session to its initial state; a step machine answers with the pointer of its first filed step.'],
      examples: [`${SS} reset review-my-change review-steps@1`],
      flags: {},
      lenient: true,
    },
    close: {
      usage: [`${SS} close <id>`],
      notes: ['Removes the session from the store.'],
      examples: [`${SS} close implement-my-change`],
      flags: {},
      lenient: true,
    },
  },
};

function main(argv) {
  usageKit = loadUsage();
  if (!usageKit) {
    process.stderr.write('sai-state could not load usage.js; tried: ' + USAGE_CANDIDATES.join(', ') + '\n');
    process.exitCode = 2;
    return;
  }
  const guarded = usageKit.handle(USAGE, argv);
  if (guarded !== null) {
    process.exitCode = guarded;
    return;
  }
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
  if (['emit', 'reset', 'close', 'block'].includes(parsed.command)) {
    const sessionId = parsed.positional[0];
    if (sessionId !== undefined && !isSessionId(sessionId)) {
      usageFailure(parsed.command, parsed.command + ': ' + new SessionIdError(sessionId).message);
      process.exitCode = 2;
      return;
    }
  }
  if (parsed.command === 'spawn') {
    commandSpawn(parsed.named.key);
    return;
  }
  if (parsed.command === 'emit' && parsed.eventFlags.length > 0) {
    commandEmitFlags(parsed);
    return;
  }
  if (parsed.command === 'emit' && (parsed.named['ready-to-propose'] !== undefined || parsed.named['block-file'] !== undefined)) {
    usageFailure('emit', 'emit --ready-to-propose and --block-file are retired: the Ready to Propose block is a retired format. Send the change documents as: ' + EMIT_DOCUMENTS_FORM);
    process.exitCode = 2;
    return;
  }
  if (parsed.command === 'emit' && (parsed.documents.length > 0 || parsed.orphanVerdicts)) {
    if (parsed.named.progress !== undefined) {
      usageFailure('emit', '--document-file cannot be combined with --progress');
      process.exitCode = 2;
      return;
    }
    commandEmitDocuments(parsed.positional[0], parsed.positional[1], parsed.positional[2], parsed.positional.slice(3), parsed.named.amend, parsed.documents, parsed.orphanVerdicts, parsed.named['input-file']);
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
      usageFailure('block', 'block --export requires --harness <claude|opencode>');
      process.exitCode = 2;
      return;
    }
    commandBlock(parsed.positional[0], parsed.positional[1], parsed.named.export === true, parsed.named.harness);
    return;
  }
  process.stderr.write(usageKit.render(USAGE) + '\n');
  process.exitCode = 2;
}

module.exports = { USAGE, sessionFile, sessionDir, isUuidv4, STATE_VERSION, entryRev, stateByMachineMap, unionDoneInCanonicalOrder, persistMachineOutcome, normalizeEventText };
if (require.main === module) {
  try {
    main(process.argv.slice(2));
  } catch (err) {
    // A missing or unsafe temp root is a blocker with its own message, not a crash.
    if (!(err && err.code && /^(TEMP_ROOT_|SESSION_ID_INVALID)/.test(err.code))) throw err;
    process.stderr.write('sai-state: ' + err.message + '\n');
    process.exitCode = 2;
  }
}
