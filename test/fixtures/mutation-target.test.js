'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { classify } = require('./mutation-target.js');

test('mutation target recognizes the ready state', () => {
  assert.equal(classify('ready'), 'ready');
});

test('mutation target handles every other state as pending', () => {
  assert.equal(classify('other'), 'pending');
});
