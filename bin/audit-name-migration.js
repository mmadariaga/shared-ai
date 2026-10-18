'use strict';

const fs = require('node:fs');
const path = require('node:path');

const AUDIT_RENAMES = Object.freeze({
  'sai-6-security': 'sai-5-security',
  'sai-7-performance': 'sai-6-performance',
  'sai-8-accessibility': 'sai-7-accessibility',
});

function migratePreset(preset) {
  if (!preset || typeof preset !== 'object' || Array.isArray(preset)) return preset;
  const result = { ...preset };
  for (const [oldName, newName] of Object.entries(AUDIT_RENAMES)) {
    for (const [prefix, suffix] of [['command:', ''], ['worker:', '-worker']]) {
      const oldKey = `${prefix}${oldName}${suffix}`;
      const newKey = `${prefix}${newName}${suffix}`;
      if (!Object.hasOwn(result, oldKey)) continue;
      if (!Object.hasOwn(result, newKey)) result[newKey] = result[oldKey];
      delete result[oldKey];
    }
  }
  return result;
}

function prepare(base) {
  for (const [oldName, newName] of Object.entries(AUDIT_RENAMES)) {
    for (const [folder, suffix] of [['commands', ''], ['agents', '-worker']]) {
      const oldPath = path.join(base, folder, `${oldName}${suffix}.md`);
      const destination = path.join(base, folder, `${newName}${suffix}.md`);
      if (!fs.existsSync(oldPath) && !fs.existsSync(destination)) continue;
      const previous = fs.readFileSync(fs.existsSync(destination) ? destination : oldPath, 'utf8');
      if (!fs.existsSync(destination)) {
        fs.mkdirSync(path.dirname(destination), { recursive: true });
        fs.writeFileSync(destination, previous.replaceAll(oldName, newName));
      }
    }
  }
  const presets = path.join(base, 'sai', 'presets');
  function visit(directory) {
    if (!fs.existsSync(directory)) return;
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(file);
      else if (entry.isFile() && entry.name.endsWith('.json')) {
        try {
          const original = JSON.parse(fs.readFileSync(file, 'utf8'));
          const migrated = migratePreset(original);
          if (JSON.stringify(original) !== JSON.stringify(migrated)) fs.writeFileSync(file, `${JSON.stringify(migrated, null, 2)}\n`);
        } catch (error) {
          console.warn(`Pending resolution: preset migration failed for ${file}: ${error.message}`);
        }
      }
    }
  }
  visit(presets);
}

function isAuditCommand(destination) {
  return path.basename(path.dirname(destination)) === 'commands'
    && Object.values(AUDIT_RENAMES).some(name => path.basename(destination) === `${name}.md`);
}

module.exports = { AUDIT_RENAMES, migratePreset, prepare, isAuditCommand };
