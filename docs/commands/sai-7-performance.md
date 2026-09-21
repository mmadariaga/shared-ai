# `/sai-7-performance`

## Command function

Detects performance problems introduced by the changes. It looks for operations that could slow the system down, consume too many resources, or grow without control.

## Flags and behavior modifiers

It has no documented behavior flags. It receives the change name and the changes to analyze.

## In detail

The command checks whether the change could make an operation take longer, use more memory, do more work than necessary, or behave worse as the amount of data or number of users grows.

It may identify slow queries, heavy rendering, loops without a clear limit, repeated work, and similar situations. It does not call something a problem merely because it could be improved: it looks for a cause and evidence that explain the impact.

The result states which part of the change could be expensive, in which scenario it would be noticeable, and what should be measured or reviewed. It is an analysis report; it does not modify code or apply optimizations automatically.
