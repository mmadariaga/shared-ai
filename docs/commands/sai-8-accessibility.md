# `/sai-8-accessibility`

## Command function

Reviews interface changes to find accessibility barriers and check compatibility with WCAG 2.2 AA.

## Flags and behavior modifiers

- `--full`: audits all interface files in the repository instead of only the diff.
- `--path <dir>`: audits one path.
- `--runtime`: runs browser checks, each after you authorize it. It is the only option that makes the command ask a question mid-run; without it the review is static only.
- `--parent-branch <branch>`: the branch the change is compared against. It is the only way to name it; a bare second word is rejected.

It receives the change name and asks nothing between choosing the change and finishing unless `--runtime` is passed.

## In detail

The command analyzes whether people with different abilities can perceive, understand, and use the interface. It reviews aspects such as keyboard use, control names, navigation order, contrast, error messages, and the information received by assistive technologies.

When the change allows it, the command can also perform browser checks to observe the result while it is running. These checks complement code inspection and help find problems that only appear during interaction with the screen.

Each problem is explained with an example of its effect on the user and the specific place that should be reviewed. The command produces a report and does not modify the interface itself.
