'use strict';
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function isolatedProject(t) {
  const directory = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), 'sai-isolated-project-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return directory;
}

module.exports = { isolatedProject };
