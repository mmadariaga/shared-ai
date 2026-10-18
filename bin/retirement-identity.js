'use strict';

const crypto = require('node:crypto');

function digest(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function recognizedRetirement(bytes, retirement) {
  const hashes = retirement.managedHashes || retirement.acceptedHashes;
  if (hashes.includes(digest(bytes))) return true;
  if (!retirement.managedBodyHashes || !retirement.tunableKeys) return false;
  // Lazy loading avoids the installer/uninstaller dependency cycle.
  const { stripTunableLines } = require('./install-flow');
  return retirement.managedBodyHashes.includes(digest(stripTunableLines(bytes, retirement.tunableKeys)));
}

module.exports = { recognizedRetirement };
