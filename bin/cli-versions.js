'use strict';

// Minimum versions of the external CLIs SAI depends on. Raised by hand when SAI
// starts to depend on newer behavior; there is no maximum.
const CODEGRAPH_MIN_VERSION = '1.6.4';
const OPENSPEC_MIN_VERSION = '1.13.1';
const OPENCODE_MIN_VERSION = '2.2.0';

// The first `X.Y.Z` of a `--version` output; a suffix such as `-beta` is ignored.
function readVersion(output) {
  const match = /(?<!\d)(\d+\.\d+\.\d+)/.exec(String(output ?? ''));
  return match ? match[1] : null;
}

function compareVersions(a, b) {
  const left = a.split('.').map(Number);
  const right = b.split('.').map(Number);
  for (let i = 0; i < 3; i += 1) {
    if (left[i] !== right[i]) return left[i] < right[i] ? -1 : 1;
  }
  return 0;
}

module.exports = {
  CODEGRAPH_MIN_VERSION,
  OPENSPEC_MIN_VERSION,
  OPENCODE_MIN_VERSION,
  readVersion,
  compareVersions,
};
