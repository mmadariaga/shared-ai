'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function fileHash(filePath) {
  return fs.existsSync(filePath) ? sha256(fs.readFileSync(filePath)) : null;
}

function managedHash(ownerPath) {
  try {
    const record = JSON.parse(fs.readFileSync(ownerPath, 'utf8'));
    return typeof record.managedHash === 'string' ? record.managedHash : null;
  } catch {
    return null;
  }
}

function inspectManagedWorkerMigration({
  legacyPath,
  legacyOwnerPath,
  replacementPath,
  replacementOwnerPath,
  replacementBytes,
}) {
  const legacyHash = fileHash(legacyPath);
  if (legacyHash === null) return { status: 'not-found' };

  const recordedLegacyHash = managedHash(legacyOwnerPath);
  if (recordedLegacyHash === null || recordedLegacyHash !== legacyHash) {
    return { status: 'protected-collision', reason: 'legacy ownership could not be verified' };
  }

  const expectedReplacementHash = sha256(replacementBytes);
  const existingReplacementHash = fileHash(replacementPath);
  if (existingReplacementHash === null) return { status: 'ready', expectedReplacementHash };

  const recordedReplacementHash = managedHash(replacementOwnerPath);
  if (existingReplacementHash !== expectedReplacementHash || recordedReplacementHash !== existingReplacementHash) {
    return { status: 'protected-collision', reason: 'replacement destination is incompatible or user-owned' };
  }

  return { status: 'ready-existing', expectedReplacementHash };
}

function migrateManagedWorkerIdentity(options) {
  const assessment = inspectManagedWorkerMigration(options);
  if (assessment.status === 'not-found' || assessment.status === 'protected-collision') return assessment;

  if (assessment.status === 'ready') {
    fs.mkdirSync(path.dirname(options.replacementPath), { recursive: true });
    fs.writeFileSync(options.replacementPath, options.replacementBytes);
    fs.writeFileSync(options.replacementOwnerPath, `${JSON.stringify({ managedHash: assessment.expectedReplacementHash }, null, 2)}\n`);
  }

  fs.unlinkSync(options.legacyPath);
  if (fs.existsSync(options.legacyOwnerPath)) fs.unlinkSync(options.legacyOwnerPath);
  return { status: 'migrated' };
}

module.exports = { inspectManagedWorkerMigration, migrateManagedWorkerIdentity };
