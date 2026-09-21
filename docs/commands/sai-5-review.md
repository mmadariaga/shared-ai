# `/sai-5-review`

## Command function

Reviews the completed changes and produces a report with problems, risks, omissions, and recommendations. It also determines whether a specialized security, performance, or accessibility review would be useful.

## Flags and behavior modifiers

It has no documented behavior flags. It receives the change name and the completed changes to analyze.

## In detail

The command examines the change from several perspectives: correctness, alignment with the goal, test quality, compatibility with the rest of the project, and possible regressions. It looks for concrete evidence and identifies where each problem is located so it can be verified and corrected.

In addition to the usual checks, it can perform a deterministic check of changes that alter behavior. The report distinguishes important problems from minor observations and explains why each finding deserves attention.

At the end, it identifies the type of surface affected. For example, it may recommend a security review if permissions or sensitive data were changed, a performance review if expensive operations were modified, or an accessibility review if an interface was changed. The recommended reviews can be run afterward, but this command does not modify code.
