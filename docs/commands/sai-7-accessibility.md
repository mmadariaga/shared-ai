# `/sai-7-accessibility`

## Command function

Reviews interface changes to find accessibility barriers and check compatibility with WCAG 2.2 AA.

## Flags and behavior modifiers

- `--full`: audits all interface files in the repository instead of only the diff.
- `--path <dir>`: audits one path.
- `--runtime`: runs the browser scanners (axe, pa11y, Lighthouse). The flag is the whole authorization: no scanner question is asked. A scanner that is not installed is marked unavailable in the report, and the static review goes on. Without it the review is static only.
- `--url <url>`: the dev-server URL the scanners take. It is an input, not an authorization. When `--runtime` comes without `--url`, the command asks for the URL before the audit starts; if you decline, or the URL does not respond, the runtime part is marked unavailable.
- `--parent-branch <branch>`: the branch the change is compared against. It is the only way to name it; a bare second word is rejected.
- `--fast-track`: accepted and ignored. The command already runs with no human in the loop.

Without a change name, the command takes the only active change that has a `proposal.md`; with none or several it prints the candidates and stops. Apart from the URL, it asks nothing between resolving the change and finishing.

## In detail

The command analyzes whether people with different abilities can perceive, understand, and use the interface. It reviews aspects such as keyboard use, control names, navigation order, contrast, error messages, and the information received by assistive technologies.

When the change allows it, the command can also perform browser checks to observe the result while it is running. These checks complement code inspection and help find problems that only appear during interaction with the screen.

Each problem is explained with an example of its effect on the user and the specific place that should be reviewed. The command produces a report and does not modify the interface itself.

Scope includes JSX/TSX, Astro, HTML, Vue, Svelte, CSS, and component-bearing
Markdown: `.mdx` plus `.md` containing HTML elements or capitalized component
tags. Checks follow the frameworks and component types actually found, not only
React. A scope with no UI file, or an empty diff, writes a `Not Applicable` report
and runs no scanner, even with `--runtime`. Screen-reader statements are labeled
`Inferred:`; static inspection is not evidence of a screen-reader session. The
keyboard walks and screen-reader smoke tests only a person can run go into the
report's pending manual checks, never as verified results. See
[review scope and fix selection](../review-triage.md) for combined runs.

The command checks the finished report itself: the template sections, the
Executive Summary severity table and the `Summary:` tally of the five levels
(`Critical` to `Informational`), a tally that matches the findings, and that every
cited path exists. When the worker cannot produce a valid report, the command
tries up to 3 different approaches and then asks you how to continue, with an
option to stop.

`accessibility.md` is staged alone and committed in one local commit only when the
project's ignore rules do not ignore it. An ignored report stays on disk, and
nothing is force-added or pushed. A new run regenerates the report from scratch;
an interrupted run is not resumed. The command ends with `Accessibility audit done.`.
