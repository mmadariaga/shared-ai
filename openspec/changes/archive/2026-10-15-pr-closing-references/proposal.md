> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

Pull request descriptions published by `to-pr` did not carry closing references for the issues they resolve. No code path linked a pull request to an issue. The only closing-keyword rule wrote `Closes: #N` for whatever id appeared in the branch name, which could close a parent issue whose sub-issues were still open.

## What Changes

- `sai/tools/to-pr.js`: `query` computes the closing set and writes a tool-owned closing block at the end of GitHub and GitLab descriptions, between `<!-- sai-closing-refs:start -->` and `<!-- sai-closing-refs:end -->`.
  - The closing set holds the issues preceded by a closing keyword (`close[sd]`, `fix(es|ed)`, `resolve[sd]`, case-insensitive, optional `:`) in the `base..HEAD` commit log.
  - Each issue is written as `#N` in the destination repository and as `owner/repo#N` or `group/project#N` in another repository on the same host.
  - Issues on another host are reported as warnings and left out of the block.
  - Hand-written closing lines stay where they are and their issues are omitted from the block.
  - On update, the previous block is replaced and all other text is kept.
  - The proposal and the unchanged-content comparison use this computed description.
  - `closingReferences` is exported.
- Branch-id parent: a numeric `<id>` in a `<type>/<id>_<name>` branch adds that issue only when it has children and every child is closed or carries a closing keyword in the commits.
  - The parent's repository is the backlog repository from `.sai/settings.jsonc` when set, otherwise the destination repository.
  - A failed child read adds a warning and leaves the parent out.
  - The parent is skipped when the settings name another provider or another host.
- When `git log` fails for both the local base and `<remote>/<base>`, `query` returns a warning that no closing references were computed.
- `query` returns `warnings` when any exist. The `to-pr` skill shows every entry verbatim before approval.
- `sai/tools/to-pr-github.js` and `sai/tools/to-pr-gitlab.js` expose a `closing` adapter that builds issue URLs and reads children. The Azure Repos adapter has none, so Azure descriptions are published as drafted.
- `sai/tools/from-backlog-github.js` and `sai/tools/from-backlog-gitlab.js` add `readChildren`, which returns child URLs with their state and reads no comments or assignees.
  - GitHub combines the written slice correspondence with native sub-issues.
  - GitLab uses the written slice correspondence.
- `sai/tools/openspec-yaml.js` returns `backlog_origin`, quoted or unquoted, and `null` when the key is absent.
- `sai/policies/commit-rules.md`: a branch-name id is written only as `Refs: #N`. A new § Closing Lines makes archive commits the only commits with closing lines: one `Closes owner/repo#N` or `Closes group/project#N` line per archived change, taken from `backlog_origin` and always fully qualified.
- `sai/commands/archive/archive-commit-gate.instructions.md`:
  - The new-commit option adds the closing lines before committing.
  - The amend option adds only the missing closing lines. It uses `git commit --amend -F -` when lines are missing and `--no-edit` otherwise.
- `sai/commands/archive/worker.md`: the Direct Build archive commit adds the closing lines.
- `skills/universal/to-pr/description-format.md`: drafting stays above the tool's closing block.
- Tests cover these behaviors:
  - closing set, normalization, empty set, hand-written lines, update replacement, branch parent, and read failure on GitHub and GitLab;
  - publication of the approved block;
  - Azure pass-through;
  - `backlog_origin` reading.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `to-pr`: tool-computed closing set and closing block for GitHub and GitLab descriptions, pre-approval warnings, and an Azure Repos pass-through.
- `commit-rules`: branch-name ids become non-closing references, and closing lines come only from an archived change's `backlog_origin`.
- `sai-archive-commit-gate`: the new-commit and amend options carry the archived change's closing lines.
- `auto-fast-archive-execution`: the Direct Build archive commit carries the archived change's closing lines.

## Impact

Modified files:
- `sai/tools/to-pr.js`
- `sai/tools/to-pr-github.js`
- `sai/tools/to-pr-gitlab.js`
- `sai/tools/from-backlog-github.js`
- `sai/tools/from-backlog-gitlab.js`
- `sai/tools/openspec-yaml.js`
- `sai/policies/commit-rules.md`
- `sai/commands/archive/archive-commit-gate.instructions.md`
- `sai/commands/archive/worker.md`
- `skills/universal/to-pr/SKILL.md`
- `skills/universal/to-pr/description-format.md`
- `test/to-pr.test.js`
- `test/azure-publication.test.js`
- `test/status-tool.test.js`

Known limitations:
- A change that is not archived before the pull request, or is archived with "Do nothing", produces no closing reference.
- Evaluating a branch-id parent adds provider reads of its children to `to-pr`.
- A non-numeric branch id contributes no parent.
- Azure DevOps closing and work-item linking are not supported.

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill

## Request Additional Notes

Undecided: whether GitHub honours a colon after the closing keyword (`Closes: #N`); I1 reads both forms and writes `Closes` without a colon. Undecided: the exact GitLab cross-project closing syntax for E2, to be confirmed during spec. Not verified: that `backlog_origin` survives `openspec archive` in the archived `.openspec.yaml` (affects I5).
