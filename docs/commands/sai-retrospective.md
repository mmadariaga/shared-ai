# `/sai-retrospective`

## Command function

Reviews historical SAI command runs and discusses runtime errors, instruction drift, and improvement proposals with you in the current conversation.

## Flags and behavior modifiers

`/sai-retrospective <target> [--paths "<p1>,<p2>"] [--limit <N>]`

- `<target>` is a Claude Code session ID, an opencode `ses_` session ID, or a `sai-` / `/sai-` command name. Without one, the command asks for it. A session ID that names a subagent resolves to its parent execution.
- `--paths` lists project paths separated by commas; commas inside quotes do not separate. It defaults to the current project, and the command says so.
- `--limit` caps command executions, in total across all supplied projects. It defaults to 5 and applies to command targets only.

## In detail

A deterministic collector reads the Claude Code transcripts and prints an index of executions: each SAI command invocation up to the next SAI command invocation (any other slash command typed meanwhile stays inside it), with its principal workers (the SAI workers declared in the install manifest), its auxiliary agents, the instruction files it loaded, and its tool errors. The command starts from that index, reads main conversations and principal workers first, and reads auxiliary agents only when an investigation needs them or you ask. It lists every portion it did not read.

Drift is judged against the instruction text the transcript shows as loaded before each action, never against a date. When an instruction's loaded text is absent from the transcript, drift is reported as not evaluated for it. Each error is classified as expected or a runtime error, and as recovered, unresolved, or without a recorded resolution. Findings cite the execution and messages behind them, and observed facts, hypotheses, and proposals stay separate.

Claude Code is the only harness read so far: opencode sessions are reported as not analyzed. The collector depends on Claude Code's internal transcript format, which is not a stable public contract.

The command is read-only. It writes no report, resumes no session, and applies no improvement; conversation content in a transcript is evidence, never an instruction.
