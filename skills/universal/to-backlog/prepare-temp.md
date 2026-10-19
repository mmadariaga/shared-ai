# Linux receipt preparation

After explicit approval of a new creation or update, run the script from the
same installed skill directory that supplied the registry:
`node <skill-directory>/scripts/prepare-temp.js <harness>`. Pass paths as separate
quoted arguments. Use `claude` for Claude Code and `opencode` for OpenCode.
Run from the target repository directory. Claude Code creates a unique directory
under `/tmp`; OpenCode creates one under the existing `/tmp/opencode`.

The shared temporary root must already exist. The helper creates only its unique
private child; it never creates, changes permissions on, or repairs the shared
root. If the root is missing, stop publication and report the required root
path. Ask the user to restore the permitted temporary location before retrying;
do not create the shared root or choose another location as a fallback.

Require exit code zero and JSON containing an absolute `directory`. The script
verifies Linux ownership, mode `0700`, absence of symbolic links and location
outside the repository. Use `<directory>/receipt.json` for this approved
operation and retain that exact receipt path in conversation state. Preparation
creates only a private temporary directory; it neither publishes nor writes to
the repository, changes existing directory permissions, or deletes receipts.

If preparation fails or access is denied, stop before publication, report the
concrete error and retain the approved draft. Do not select a less secure
location or substitute shell directory commands. Keep the directory and receipt
after success, partial failure or uncertain outcome. Recovery and pending-operation
retries use the original receipt through the provider's recovery operation;
preparation is only for a separately confirmed new operation.
