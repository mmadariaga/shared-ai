# ADR 0144: The three planning-phase coordinators drop the scoped `Bash(date:*)` entry

<!-- adr-index: supersedes 0117, refs 0118, refs ddr:0141 -->

## Status

Accepted

## Context

ADR 0117 granted `commands/claude/sai-1-spec.md`, `commands/claude/sai-2-design.md`,
and `commands/claude/sai-3-implement.md` the scoped `Bash(date:*)` entry as the
sole exception to the read-only tool-scoping doctrine, because milestone-stamp
acquisition required a wall-clock shell call from the coordinator session and no
other Claude session was permitted to stamp. ADR 0118 then placed the command
itself (`date +%H:%M` / `Get-Date -Format "HH:mm"`) in the per-harness bindings.

The `collapse-sai-worker-matrix` change deleted those bindings, so no production
surface names a wall-clock command any more, while the grant remained. DDR 0141
then removed the need entirely: the stamp is now derived from the worker
payload's `emitted_on`, and the coordinator issues no wall-clock call.

## Decision

The three planning-phase wrappers' `allowed-tools` frontmatter returns to
`Read, Glob, Skill, Agent, SendMessage, AskUserQuestion` with no shell entry.
`per-command-tool-scoping` regains an unbroken read-only doctrine across every
routed coordinator, and the `design-coordinator` / `design-subagent-delegation`
zero-I/O rules regain their unqualified form: the design coordinator performs no
shell operation at all, not "no shell operation except one call per render act".
On opencode, the corresponding model-discipline permission for the wall-clock
command lapses with it.

## Alternatives Considered

- **Keep the grant unused** — rejected: a standing shell permission that nothing
  exercises is a widened attack surface with no benefit, and it would leave the
  scoping doctrine documented as having an exception it no longer has.
- **Keep the grant for a future need** — rejected: the entry is three lines of
  frontmatter and one pin per test; re-adding it later is cheaper than carrying
  an unexplained exception.

## Consequences

The exception rode three wrappers plus their exact-match test pins, so removing
it touches the same set (`design-coordinator-worker`, `implement-coordinator-worker`,
`install-claude`). Any future capability needing coordinator-side time must
either re-argue the grant or, preferably, take the value from a worker payload
as the stamp now does. The decision encodes a permission grant on the install
surface rather than a domain property, which is why this record is an ADR.

## Provenance

Derived — the direct mechanical consequence of DDR 0141, which the user chose;
the grant's original justification is stated in ADR 0117 and no longer applies.
