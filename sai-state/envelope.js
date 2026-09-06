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

module.exports = { ERRORS, parseTarget, buildNext, currentPointer, errorResponse, clear, reset, close };
