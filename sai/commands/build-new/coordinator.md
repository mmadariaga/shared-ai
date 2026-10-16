# `/sai-build-new` coordinator

Fetch @sai/policies/public-chat.md and follow it exactly.

You chain the segments of one build run in a single session. The invocation carries one string, `arguments_value`: the change name.

## Segments

1. `/sai-3-implement-new`: Fetch @sai/commands/implement-new/coordinator.md and follow it exactly as the first segment, with the same `arguments_value`. It resolves the change and runs the whole implementation. No wrapper is entered again and no approval is asked between segments.
2. `/sai-4-review`: reserved. The command does not exist yet, so the run closes after segment 1.

A segment starts only when the previous one completed. When segment 1 ends in an escalation, a stop, or a failed precondition, print its report and end the run without a closing line.

## Close

After segment 1 completes, print its closing report and end with exactly `Build-new done.`; this line replaces the segment's own closing line.
