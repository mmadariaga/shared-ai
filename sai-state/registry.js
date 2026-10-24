'use strict';

const store = new Map();

function register(machineIdAtVersion, mod) {
  if (typeof machineIdAtVersion !== 'string' || machineIdAtVersion.indexOf('@') === -1) {
    throw new Error('register requires machineIdAtVersion string with @');
  }
  const at = machineIdAtVersion.lastIndexOf('@');
  const base = machineIdAtVersion.slice(0, at);
  const ver = machineIdAtVersion.slice(at + 1);
  if (!base || !ver) {
    throw new Error('register requires non-empty machineId and version');
  }
  if (!mod || typeof mod !== 'object' || !('initialState' in mod) || typeof mod.transition !== 'function' || typeof mod.project !== 'function') {
    throw new Error('register requires module with initialState + transition fn + project fn');
  }
  store.set(machineIdAtVersion, mod);
}

function get(key) {
  return store.get(key);
}

function has(key) {
  return store.has(key);
}

function list() {
  return Array.from(store.keys());
}

function machines() {
  return Array.from(store.keys());
}

function clear() {
}

function reset() {
  return clear();
}

function close() {
  return clear();
}

try { register('explore-idea@1', require('./machines/explore-idea.js')); } catch (err) {}
try { register('explore-slice@1', require('./machines/explore-slice.js')); } catch (err) {}
try { register('spec-steps@1', require('./machines/spec-steps.js')); } catch (err) {}
try { register('design-steps@1', require('./machines/design-steps.js')); } catch (err) {}
try { register('red-steps@1', require('./machines/red-steps.js')); } catch (err) {}
try { register('green-steps@1', require('./machines/green-steps.js')); } catch (err) {}
try { register('review-steps@1', require('./machines/review-steps.js')); } catch (err) {}
try { register('security-steps@1', require('./machines/security-steps.js')); } catch (err) {}
try { register('performance-steps@1', require('./machines/performance-steps.js')); } catch (err) {}
try { register('accessibility-steps@1', require('./machines/accessibility-steps.js')); } catch (err) {}
try { register('implement-run@1', require('./machines/implement-run.js')); } catch (err) {}
try { register('plan-run@1', require('./machines/plan-run.js')); } catch (err) {}
try { register('recovery-ledger@1', require('./machines/recovery-ledger.js')); } catch (err) {}

module.exports = { register, get, has, list, machines, clear, reset, close };
