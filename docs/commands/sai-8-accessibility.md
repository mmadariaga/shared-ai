# `/sai-8-accessibility`

## Command function

Reviews interface changes to find accessibility barriers and check compatibility with WCAG 2.2 AA.

## Flags and behavior modifiers

It has no documented behavior flags. It receives the change name and the interface changes to review.

## In detail

The command analyzes whether people with different abilities can perceive, understand, and use the interface. It reviews aspects such as keyboard use, control names, navigation order, contrast, error messages, and the information received by assistive technologies.

When the change allows it, the command can also perform browser checks to observe the result while it is running. These checks complement code inspection and help find problems that only appear during interaction with the screen.

Each problem is explained with an example of its effect on the user and the specific place that should be reviewed. The command produces a report and does not modify the interface itself.
