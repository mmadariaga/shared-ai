# Receipt preparation

After explicit approval of a new creation or update, run the script from the
same installed skill directory that supplied the registry:
`node <skill-directory>/scripts/prepare-temp.js <harness>`. Pass paths as separate
quoted arguments. Use `claude` for Claude Code and `opencode` for OpenCode.
Run from the target repository directory. The script creates a unique private
directory under the SAI temp root, the `sai/` folder inside the harness
temporary root (Linux: `/tmp/claude-{uid}/sai/` for Claude Code and
`/tmp/opencode/sai/` for OpenCode; Windows and macOS: your temp folder plus
`<harness>/sai/`).

On Linux the harness root must already exist. The script creates only the SAI
temp root and its unique private child; it never creates, changes permissions
on, or repairs the Linux harness root. If the root is missing, stop publication
and report the required root path. Ask the user to restore the permitted
temporary location before retrying; do not create the shared root or choose
another location as a fallback.

Require exit code zero and JSON containing an absolute `directory`. The script
verifies ownership, mode `0700`, absence of symbolic links and location outside
the repository. Use `<directory>/receipt.json` for this approved operation and
retain that exact receipt path in conversation state. Preparation creates only a
private temporary directory; it neither publishes nor writes to the repository,
changes existing directory permissions, or deletes receipts.

If preparation fails or access is denied, stop before publication, report the
concrete error and retain the approved draft. Do not select a less secure
location or substitute shell directory commands. Keep the directory and receipt
after success, partial failure or uncertain outcome. Recovery and pending-operation
retries use the original receipt through the provider's recovery operation;
preparation is only for a separately confirmed new operation.
