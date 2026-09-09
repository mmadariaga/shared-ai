# prereq-remediation-guidance Specification

## Purpose
TBD - created by archiving change prereqs-openspec-skills-check. Update Purpose after archive.
## Requirements
### Requirement: Aggregated missing-skills halt

When the `skills` check fails, `sai/tools/prereqs.js` SHALL exit 1 with a halt payload declaring `failed_check: 'skills'` and `reason: openspec-skill-missing`, and the payload SHALL aggregate every missing skill into one result — a structured `missing_skills: string[]` field next to a `message` naming the probed skills root and each absent skill — so a single remediation pass suffices, while first-failure-stops across the other checks stays untouched.

#### Scenario: Every absent skill is reported in one halt
- **WHEN** `check` runs with a valid harness value on a project whose first three checks pass and two of the three required skills lack their `SKILL.md` file at the probed root
- **THEN** the tool exits 1 with `failed_check: 'skills'`, `reason: openspec-skill-missing`, and `missing_skills` listing both absent skills — not two sequential halts

### Requirement: Interactive remediation guidance for missing skills

The consuming surface SHALL, for a `failed_check: 'skills'` halt, print one remediation literal in the form "OpenSpec skills missing at <skills-root>: <missing_skills>. Run: openspec init to install them for this harness." — where `<missing_skills>` is the comma-joined list from the payload's `missing_skills` field and `<skills-root>` is the probed root the payload names — and a tool exit 2 usage error SHALL be reported as-is with no remediation literal and no continuation as if the checks passed.

#### Scenario: One remediation pass for the current harness
- **WHEN** a `skills` halt is relayed to the user
- **THEN** the printed literal names the probed root, lists every missing skill comma-joined, and directs the user to run `openspec init` to install the skills for the current harness

