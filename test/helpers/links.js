'use strict';
const fs = require('node:fs');

function linkDirectory(target, link) {
  fs.symlinkSync(target, link, 'junction');
}

function linkFile(t, target, link) {
  try {
    fs.symlinkSync(target, link, 'file');
    return true;
  } catch (error) {
    if (error.code !== 'EPERM' && error.code !== 'EACCES') throw error;
    t.skip(`file links need symlink privilege (${error.code})`);
    return false;
  }
}

module.exports = { linkDirectory, linkFile };
