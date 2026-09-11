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

function persistMachineOutcome(id, record, machineId, nextState, eventId, wire) {
  const base = (record && typeof record === 'object') ? record : {};
  const persisted = (base.stateByMachine && typeof base.stateByMachine === 'object' && !Array.isArray(base.stateByMachine)) ? base.stateByMachine : {};
  const prev = (persisted[machineId] && typeof persisted[machineId] === 'object' && !Array.isArray(persisted[machineId])) ? persisted[machineId] : {};
  const lastOutcome = { stage: wire.stage, next: wire.next };
  if (wire.rejected !== undefined) lastOutcome.rejected = wire.rejected;
  const merged = Object.assign({}, base);
  merged.createdAt = typeof base.createdAt === 'number' ? base.createdAt : Date.now();
  merged.stateVersion = STATE_VERSION;
  merged.stateByMachine = Object.assign({}, persisted);
  merged.stateByMachine[machineId] = {
    state: nextState,
    rev: (typeof prev.rev === 'number' ? prev.rev : 0) + 1,
    lastEventId: eventId,
    lastOutcome,
  };
  writeSessionFile(id, merged);
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

function commandEmit(id, machineIdArg, eventJsonArg) {
  if (!id || !machineIdArg || !eventJsonArg) {
    process.stderr.write('emit requires <id> <machineId> <eventJson>\n');
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
  let event = null;
  try {
    event = JSON.parse(eventJsonArg);
  } catch (err) {
    const payload = withWarnings({ error: 'INVALID_EVENT', next: pointerFor(session, null) }, loadWarnings);
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

  session.stateByMachine.set(targetId, nextState);
  session.lastPointer = nxt;

  try { persistMachineOutcome(id, record, targetId, nextState, '', wire); } catch (err) {}

  const payload = withWarnings(wire, loadWarnings);
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

  // Build new record with this machine reset to initialState
  const base = (record && typeof record === 'object') ? record : {};
  const persisted = (base.stateByMachine && typeof base.stateByMachine === 'object' && !Array.isArray(base.stateByMachine)) ? base.stateByMachine : {};
  const merged = Object.assign({}, base);
  merged.createdAt = typeof base.createdAt === 'number' ? base.createdAt : Date.now();
  merged.stateVersion = STATE_VERSION;
  merged.stateByMachine = Object.assign({}, persisted);

  // Reset just this machine to initial state
  const priorRev = (persisted[targetId] && typeof persisted[targetId].rev === 'number') ? persisted[targetId].rev : 0;
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
    commandEmit(parsed.positional[0], parsed.positional[1], parsed.positional[2]);
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
  process.stderr.write('       sai-state emit <id> <machineId> <eventJson>\n');
  process.stderr.write('       sai-state reset <id> <machineId>\n');
  process.stderr.write('       sai-state close <id>\n');
  process.exitCode = 2;
}

module.exports = { sessionFile, sessionDir, isUuidv4, STATE_VERSION };
if (require.main === module) { main(process.argv.slice(2)); }
