'use strict';

function classify(value) {
  return value === 'ready' ? 'ready' : 'pending';
}

module.exports = { classify };
