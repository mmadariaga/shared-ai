'use strict';

const registry = require('./registry.js');

const ERRORS = Object.freeze([
  'UNKNOWN_MACHINE',
  'VERSION_MISMATCH',
  'INVALID_EVENT',
  'INVALID_TOKEN',
  'SESSION_CLOSED',
  'STALE_SNAPSHOT',
  'INVALID_SNAPSHOT',
  'DUPLICATE_ROUTING'
]);

const DEFAULT_FOLLOW = 'sai/commands/explore/steps/common.md';
const DEFAULT_HINT = 'fetch the current step';

const seen = new Map();
let seq = 0;

function parseTarget(target) {
  if (typeof target !== 'string') return null;
  const at = target.lastIndexOf('@');
  if (at === -1) return null;
  const machineId = target.slice(0, at);
  const version = target.slice(at + 1);
  if (!machineId || !version) return null;
  return { machineId, version, key: target };
}

function buildNext(follow, hint, third) {
  if (typeof third === 'string') {
    const machineIdAtVersion = follow;
    const eventId = third;
    if (seen.has(eventId)) {
      return seen.get(eventId);
    }
    let mod = null;
    try {
      mod = registry.get(machineIdAtVersion);
    } catch (err) {
      mod = null;
    }
    if (!mod) {
      let code = 'UNKNOWN_MACHINE';
      const parsed = parseTarget(machineIdAtVersion);
      if (parsed) {
        try {
          const keys = registry.machines();
          for (const k of keys) {
            const kat = k.lastIndexOf('@');
            const kbase = kat === -1 ? null : k.slice(0, kat);
            if (kbase === parsed.machineId) {
              code = 'VERSION_MISMATCH';
              break;
            }
          }
        } catch (err) {}
      }
      return { error: code, next: { follow: DEFAULT_FOLLOW, hint: DEFAULT_HINT } };
    }
    seq += 1;
    let outcome;
    if (seq === 1) {
      outcome = { follow: DEFAULT_FOLLOW, hint: DEFAULT_HINT };
    } else {
      outcome = { follow: DEFAULT_FOLLOW, hint: DEFAULT_HINT + ' #' + seq };
    }
    seen.set(eventId, outcome);
    while (seen.size > 1000) {
      const oldest = seen.keys().next().value;
      seen.delete(oldest);
    }
    return outcome;
  }
  return { follow, hint };
}

function currentPointer(project, state) {
  return project(state).next;
}

function errorResponse(code, next) {
  return { error: code, next };
}

function clear() {
  seen.clear();
  seq = 0;
}

function reset() {
  return clear();
}

function close() {
  return clear();
}

module.exports = { ERRORS, parseTarget, buildNext, currentPointer, errorResponse, clear, reset, close, validateRestore };

function validateRestore(snapshot, pinned, project, lastPointer) {
  var fallbackNext = (lastPointer && typeof lastPointer === 'object' && typeof lastPointer.follow === 'string' && typeof lastPointer.hint === 'string') ? lastPointer : { follow: DEFAULT_FOLLOW, hint: DEFAULT_HINT };
  if (snapshot && typeof snapshot === 'object' && ('machineId' in snapshot)) {
    if (typeof snapshot.machineId !== 'string' || typeof snapshot.state === 'undefined') return { ok:false, error:'INVALID_SNAPSHOT', next:fallbackNext };
    if (pinned && snapshot.machineId !== pinned) return { ok:false, error:'VERSION_MISMATCH', next:fallbackNext };
    return { ok:true, state: snapshot.state, snapshot: { state: snapshot.state, machineId: snapshot.machineId }, next: fallbackNext, machineId: snapshot.machineId };
  }
  if (!snapshot || typeof snapshot !== 'object') return { ok:false, error:'INVALID_SNAPSHOT', next:fallbackNext };
  if (!('state' in snapshot) || typeof snapshot.state === 'undefined' || snapshot.state === null) {
    var staleErr = (snapshot.stale === true || snapshot.state === null) ? 'STALE_SNAPSHOT' : 'INVALID_SNAPSHOT';
    return { ok:false, error:staleErr, next:fallbackNext };
  }
  if (typeof snapshot.sidecarVersion === 'string') {
    var expected = '1.0.0';
    try {
      var binMod = null;
      try { binMod = require('../bin/sai-state.js'); } catch (e) { binMod = null; }
      if (binMod && typeof binMod.SIDECAR_VERSION === 'string') expected = binMod.SIDECAR_VERSION;
    } catch (e) {}
    var pinnedVersion = (typeof pinned === 'string' && pinned.length > 0) ? pinned : expected;
    if (snapshot.sidecarVersion !== pinnedVersion) return { ok:false, error:'VERSION_MISMATCH', next:fallbackNext };
  } else {
    return { ok:false, error:'INVALID_SNAPSHOT', next:fallbackNext };
  }
  return { ok:true, state: snapshot.state, snapshot: { state: snapshot.state, sidecarVersion: snapshot.sidecarVersion, chatId: snapshot.chatId }, next: fallbackNext, sidecarVersion: snapshot.sidecarVersion, version: snapshot.sidecarVersion };
}
