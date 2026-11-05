# `/sai-status`

## Command function

Shows change progress and a suggested next command. It is read-only: files,
branches, and workflow state stay unchanged.

## Usage

`/sai-status [<change-name>]`

- With a name, shows that change's panel, including an archived change.
- Without a name, asks which active change to show, or offers `See all` for a
  summary table. With exactly one active change, asks you to confirm it; with
  none, reports that no active changes exist.

## Output

The panel shows available workflow documents, specs approval, completed tasks,
archive location when applicable, and a `Next:` suggestion. For a change with
`skip_specs: true`, specs appear as `skipped`, not missing.
