# Autonomy Audit Log (pinned layout)

Single source of the pinned scannable layout of the entries that the unattended
Direct Build - Unattended terminal report adds for automatic corrections and
ignored process statements. Consuming surfaces SHALL NOT restate the layout
inline.

## Invariants

- The entries are assembled from the run's own records. They are presented in
  conversation only and are NEVER written to any file, artifact, change
  directory, or configuration.
- Emit each count only when non-zero.

## Automatic corrections and ignored process statements

Unattended lanes add entries to their terminal report in this layout:

```text
Corrections: <N>
1. Failed: <what failed>
   Corrected: <what was corrected>
   Within authorization: <why it stays inside what the user authorized>
Ignored process statements: <K>
1. <worker input statement> — <worker that reported it>
```
