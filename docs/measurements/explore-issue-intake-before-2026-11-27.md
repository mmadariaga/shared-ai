# `/sai-explore` mature-issue intake: before measurement (2026-11-27)

Baseline for the `explore-issue-fast-path` change (GitLab work item 37, project
`onira-hub-front`). It records the measured cost of the observed run the change's
problem statement cites, so the same measurement can be compared after the fast
path is in use.

## Method

Measured with the `/sai-retrospective` collector, not by hand:

```
node sai/tools/retrospective.js index sai-explore \
  --paths "/home/flmn/src/oniratec/onira-hub-front" --limit 500
```

The matching execution is the `sai-explore` invocation whose `args` is
`https://git.oniratec.com/oniratec/onira-hub-front/-/work_items/37`, the root
opencode session `ses_de1c29264fferEp1LOli9vp1In`. The run covered the whole
invocation (issue intake through the Direct Build close), which is the case the
change cites. Tokens are the harness's own counts; the provider reported no cost.

## Before

| Agent | Requests | Input | Output | Reasoning | Cache read | Tool calls |
| --- | --- | --- | --- | --- | --- | --- |
| Coordinator (`sai-explore`, `ses_de1c29264fferEp1LOli9vp1In`) | 260 | 526,035 | 55,153 | 58,819 | 55,110,016 | 298 |
| `sai-direct-build-worker` | 63 | 290,900 | 14,756 | 37,544 | 5,959,552 | 128 |
| `sai-backfill-worker` | 60 | 146,043 | 16,696 | 30,884 | 5,695,488 | 78 |
| `sai-archive-worker` | 26 | 75,241 | 4,788 | 8,561 | 1,237,888 | 37 |
| Helpers (2 `budget-explorer`, 3 `budget-executor`) | 109 | 247,395 | 13,534 | 15,537 | 4,097,152 | 124 |
| **Total** | **518** | **1,285,614** | **104,927** | **151,345** | **72,100,096** | **665** |

The intake itself is the first part of the coordinator figures: the change's
problem statement records about four model turns and two explorer dispatches
after the base load, with about 160 KB of policies (some 40k tokens) in context.

## After

Not yet measured: the fast path has not run on this case since the change. Take
the after figure with the same command on the next mature-issue intake and add
the matching execution row above it. The measured differences to read are the
coordinator's requests, input and cache-read tokens, and tool calls, and the
number of helper dispatches; the workers that run after the intake (review,
backfill, archive) are the same route and stay in the table for context.
