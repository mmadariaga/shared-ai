# `/sai-5-security`

## Command function

Looks for vulnerabilities and security risks in the completed changes. It explains the impact of each finding, identifies the exact location where it appears, and links it to known references when useful.

## Flags and behavior modifiers

- `--full`: audits the whole repository instead of only the diff.
- `--path <dir>`: audits one path.
- `--parent-branch <branch>`: the branch the change is compared against. It is the only way to name it; a bare second word is rejected.

- `--fast-track`: accepted and ignored. The command already runs with no human in the loop.

Without a change name, the command takes the only active change that has a `proposal.md`; with none or several it prints the candidates and stops. It asks nothing between resolving the change and finishing, and it has no change picker.

## In detail

The command analyzes modified code by considering how an unauthorized person could abuse it. It reviews situations including resource access, identity management, data validation, information exposure, and dependency use.

When it finds a risk, it describes what could happen, what conditions would be required, and why the problem matters. It also identifies the file and line to review so the correction is concrete rather than based on a vague explanation.

The report may relate findings to known practices or standards, such as OWASP or CVE, when there is a useful match. The command is a read-only audit: it does not fix code, change configuration, or publish anything by itself.

A fresh `sai-5-security-worker` does the analysis. Dependency analysis runs only when the change touches a dependency manifest; otherwise the report says SCA did not run and why. A scanner or audit tool that is not installed is not an obstacle: the report marks it unavailable and the static analysis goes on.

`security.md` contains scope/scan/date provenance, evidence-backed SAST and
dependency findings, optional acknowledged trade-offs, and a severity tally.
Clean categories and empty sections are omitted. If the selected scope has no
attack surface and no dependency manifest qualifies, or the diff is empty, the
report records `Not Applicable` with a justification. Accepted trade-offs remain
acknowledged rather than findings.

The command checks the finished report itself: the template structure, the
`Critical`/`High`/`Medium`/`Low` severity subset and its `Summary:` tally
(security has no `Informational` counter), a tally that matches the findings,
and that every cited path exists. When the worker cannot produce a valid report,
the command tries up to 3 different approaches and then asks you how to continue,
with an option to stop.

`security.md` is staged alone and committed in one local commit only when the
project's ignore rules do not ignore it. An ignored report stays on disk, and
nothing is force-added or pushed. A new run regenerates the report from scratch;
an interrupted run is not resumed. The command ends with `Security audit done.`.
Use [review scope and fix selection](../review-triage.md) to combine this audit
with the other phases, and [`/sai-3-implement`](sai-3-implement.md) to act on open
findings.
