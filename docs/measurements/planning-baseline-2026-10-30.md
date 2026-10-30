# Planning and implementation cost baseline (2026-10-30)

Baseline format 1. Measured with `sai/tools/retrospective.js cost --with-worktrees --format markdown` over the projects listed below; the figures are the harnesses' own token counts for every SAI planning and implementation run still present in their transcripts. Rerun the same command after a contract change and compare the tables.

## Reading the figures

- A run is an execution of `/sai-1-spec`, `/sai-2-design`, `/sai-plan`, `/sai-3-implement`, or `/sai-build`, or of any other command (such as an `/sai-explore` route) whose workers did a spec, design, or implement segment. It covers the invocation up to the next SAI invocation of the same session; the coordinator of an `/sai-explore` run is the whole exploration session.
- The coordinator is the main session of the run. A worker is a SAI worker the run created; its segment follows its type (`spec`, `design`, or `implement` for the RED, GREEN, and Direct Build workers). Any other SAI worker, such as the review worker of `/sai-build`, is reported under `other` with its own type.
- A dispatched agent is a helper another agent launched (for example the explorers of the design worker). It is reported by type, apart from the agent that dispatched it, under that agent's segment; a helper the main session launched follows the run's command.
- Usage is summed per model request. Claude Code separates 5-minute and 1-hour cache writes and records no cost; opencode records one cache-write figure and a cost when the provider reports one. An agent whose usage is missing counts as `unavailable` and adds nothing to the sums.
- Total tokens are input, output, cache read, and cache write added together. Tool calls are the tool-use blocks an agent issued.
- Review rounds and coordination stay inside the coordinator's figures.

## Coverage

| Project | Harness | Directories with sessions | Sessions read | Status |
| --- | --- | --- | --- | --- |
| shared-ai | claude | 2 | 86 | analyzed |
| shared-ai | opencode | 5 | 622 | analyzed |
| Project B | claude | 0 | 0 | not analyzed |
| Project B | opencode | 3 | 196 | analyzed |

- 175 runs were read; 3 were still in progress at read time; 19 include an agent without usage data.

## shared-ai

### shared-ai: Claude Code

| Command | Runs | In progress |
| --- | --- | --- |
| `sai-cache-warmer` | 1 | 0 |
| `sai-explore` | 38 | 3 |

Cost by segment, role, and agent type:

| Segment | Role | Agent | Runs | Agents | Input | Output | Cache read | Cache write 5m | Cache write 1h | Tool calls |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| implement | worker | sai-direct-build-worker | 39 | 60 | 5,326 | 1,040,032 | 436,060,470 | 12,873,679 | 0 | 3,518 |
| other | coordinator | sai-cache-warmer | 1 | 1 | 476 | 117,625 | 107,624,042 | 0 | 386,870 | 187 |
| other | coordinator | sai-explore | 38 | 38 | 11,709 | 3,985,841 | 1,704,523,157 | 0 | 18,946,559 | 5,321 |
| other | worker | sai-archive-worker | 35 | 53 | 1,818 | 348,136 | 55,103,562 | 4,808,741 | 0 | 1,014 |
| other | worker | sai-backfill-worker | 36 | 53 | 3,524 | 600,146 | 186,625,867 | 8,795,895 | 0 | 2,171 |
| other | dispatched | budget-executor | 35 | 83 | 2,584 | 147,761 | 42,506,767 | 4,668,563 | 0 | 676 |
| other | dispatched | budget-explorer | 39 | 115 | 2,310 | 496,951 | 63,277,931 | 9,733,383 | 0 | 1,593 |
| other | dispatched | budget-subagent | 1 | 1 | 54 | 4,940 | 1,951,489 | 166,458 | 0 | 21 |

Mean per run, over the runs that have the segment:

| Segment | Runs | Total tokens | Input | Output | Cache read | Cache write 5m | Cache write 1h | Tool calls |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| implement | 39 | 11,537,936 | 137 | 26,667 | 11,181,038 | 330,094 | 0 | 90 |
| other | 39 | 56,790,850 | 576 | 146,190 | 55,425,970 | 722,386 | 495,729 | 282 |

### shared-ai: opencode

| Command | Runs | In progress |
| --- | --- | --- |
| `sai-build` | 2 | 0 |
| `sai-explore` | 120 | 0 |

Cost by segment, role, and agent type:

| Segment | Role | Agent | Runs | Agents | Input | Output | Cache read | Cache write | Tool calls | Cost |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| spec | worker | sai-1-spec-proposal-worker | 2 | 2 | 285,072 | 32,112 | 7,295,280 | 0 | 140 | $0.0345 |
| spec | dispatched | explore | 2 | 6 | 243,088 | 11,340 | 1,151,124 | 0 | 76 | $0.0189 |
| design | worker | sai-2-design-worker | 2 | 2 | 505,342 | 46,299 | 14,188,157 | 0 | 156 | $0.0739 |
| design | dispatched | budget | 1 | 1 | 57,117 | 6,899 | 317,945 | 0 | 18 | $0.0095 |
| design | dispatched | explore | 2 | 7 | 354,232 | 12,675 | 1,458,758 | 0 | 97 | $0.0340 |
| implement | worker | sai-direct-build-worker | 118 | 136 | 24,236,378 | 1,401,895 | 592,626,859 | 0 | 7,492 | $11.3194 |
| other | coordinator | sai-build | 2 | 2 | 604,286 | 11,402 | 1,659,776 | 0 | 58 | $0.0000 |
| other | coordinator | sai-explore | 120 | 120 | 78,241,089 | 3,445,157 | 1,501,040,020 | 0 | 16,362 | $60.0008 |
| other | worker | sai-archive-worker | 117 | 151 | 18,655,870 | 1,088,475 | 249,083,806 | 0 | 5,910 | $8.4834 |
| other | worker | sai-backfill-worker | 117 | 135 | 19,747,253 | 1,623,671 | 255,372,553 | 0 | 5,058 | $8.4078 |
| other | worker | sai-commit-worker | 5 | 6 | 504,234 | 11,749 | 3,638,528 | 0 | 113 | $0.0000 |
| other | dispatched | budget | 31 | 96 | 2,368,441 | 94,279 | 15,435,855 | 0 | 694 | $0.2620 |
| other | dispatched | budget-executor | 6 | 22 (4 unavailable) | 739,507 | 40,622 | 7,264,750 | 0 | 228 | $0.0986 |
| other | dispatched | budget-explorer | 6 | 23 (4 unavailable) | 1,505,126 | 55,937 | 13,183,299 | 0 | 429 | $0.1859 |
| other | dispatched | budget-subagent | 1 | 1 (1 unavailable) | - | - | - | - | 0 | - |
| other | dispatched | executor | 20 | 71 (3 unavailable) | 3,944,388 | 202,356 | 58,581,047 | 0 | 851 | $0.3378 |
| other | dispatched | explore | 114 | 331 (32 unavailable) | 18,182,827 | 624,124 | 107,805,763 | 0 | 4,870 | $0.9546 |
| other | dispatched | sai-3-implementation-worker | 1 | 1 | 1,128,251 | 16,884 | 6,468,608 | 0 | 298 | $0.0000 |
| other | dispatched | sai-4-green-worker | 1 | 1 | 86,154 | 3,964 | 551,424 | 0 | 38 | $0.0000 |

Mean per run, over the runs that have the segment:

| Segment | Runs | Total tokens | Input | Output | Cache read | Cache write | Tool calls | Cost |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| spec | 2 | 4,509,008 | 264,080 | 21,726 | 4,223,202 | 0 | 108 | $0.0267 |
| design | 2 | 8,473,712 | 458,346 | 32,937 | 7,982,430 | 0 | 136 | $0.0587 |
| implement | 118 | 5,239,535 | 205,393 | 11,880 | 5,022,262 | 0 | 63 | $0.0959 |
| other | 122 | 19,450,914 | 1,194,323 | 59,169 | 18,197,422 | 0 | 286 | $0.6453 |

### shared-ai: pairing of planning and implementation

1 changes have both planning and implementation runs, 1 only planning runs, 119 only implementation runs, and 37 runs have no determinable change name and count as unpaired.

| Change | Status | Planning runs | Planning tokens | Planning tool calls | Implementation runs | Implementation tokens | Implementation tool calls |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `rename-build-to-meta-build` | paired | 1 | 15,766,097 | 281 | 2 | 10,530,749 | 394 |
| `state-machine-sidecar` | unpaired (planning-only) | 1 | 36,484,169 | 750 | 0 | - | - |
| 119 changes | unpaired (implementation-only) | 0 | - | - | 120 | 3,583,434,062* | 37,784 |

\* includes an agent without usage data.

## Project B

### Project B: opencode

| Command | Runs | In progress |
| --- | --- | --- |
| `sai-build` | 5 | 0 |
| `sai-explore` | 9 | 0 |

Cost by segment, role, and agent type:

| Segment | Role | Agent | Runs | Agents | Input | Output | Cache read | Cache write | Tool calls | Cost |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| spec | worker | sai-1-spec-proposal-worker | 5 | 5 | 6,578,827 | 91,633 | 18,020,864 | 0 | 397 | $0.0000 |
| spec | dispatched | explore | 4 | 23 (11 unavailable) | 5,397,384 | 242,038 | 0 | 0 | 381 | $0.0000 |
| design | worker | sai-2-design-worker | 5 | 5 | 6,797,804 | 123,167 | 18,842,112 | 0 | 434 | $0.0000 |
| design | dispatched | budget | 4 | 5 | 750,259 | 81,578 | 1,148,025 | 313,296 | 79 | $0.1177 |
| design | dispatched | explore | 5 | 22 | 10,657,322 | 298,716 | 0 | 0 | 638 | $0.0000 |
| implement | worker | sai-3-green-worker | 5 | 7 | 13,401,644 | 97,848 | 39,274,944 | 0 | 762 | $0.0000 |
| implement | worker | sai-3-red-worker | 5 | 8 | 27,931,400 | 196,611 | 132,596,224 | 0 | 1,230 | $0.0000 |
| implement | worker | sai-direct-build-worker | 4 | 4 | 11,578,710 | 91,120 | 64,925,824 | 0 | 569 | $0.0000 |
| other | coordinator | sai-build | 5 | 5 | 40,616,687 | 249,556 | 124,744,448 | 0 | 1,278 | $0.0000 |
| other | coordinator | sai-explore | 9 | 9 | 64,022,249 | 420,992 | 170,008,960 | 0 | 2,009 | $0.0000 |
| other | worker | sai-4-review-worker | 5 | 5 | 1,282,423 | 52,548 | 66,047,482 | 0 | 608 | $1.7966 |
| other | worker | sai-archive-worker | 4 | 5 | 1,584,635 | 42,368 | 2,108,224 | 0 | 161 | $0.0000 |
| other | worker | sai-backfill-worker | 4 | 4 | 4,679,694 | 68,788 | 7,619,648 | 0 | 235 | $0.0000 |
| other | dispatched | budget | 1 | 1 | 1,325,011 | 47,141 | 0 | 0 | 35 | $0.0000 |
| other | dispatched | budget-executor | 5 | 55 (2 unavailable) | 1,566,952 | 106,551 | 475,200 | 0 | 282 | $0.0000 |
| other | dispatched | budget-explorer | 4 | 7 (5 unavailable) | 2,550,289 | 31,729 | 0 | 0 | 122 | $0.0000 |
| other | dispatched | budget-subagent | 1 | 4 (3 unavailable) | 460,949 | 37,422 | 0 | 0 | 28 | $0.0000 |
| other | dispatched | executor | 4 | 9 | 666,873 | 39,827 | 0 | 0 | 53 | $0.0000 |
| other | dispatched | explore | 9 | 46 (26 unavailable) | 9,226,365 | 452,671 | 2,404,000 | 0 | 675 | $0.0000 |

Mean per run, over the runs that have the segment:

| Segment | Runs | Total tokens | Input | Output | Cache read | Cache write | Tool calls | Cost |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| spec | 5 | 6,066,149 | 2,395,242 | 66,734 | 3,604,173 | 0 | 156 | $0.0000 |
| design | 5 | 7,802,456 | 3,641,077 | 100,692 | 3,998,027 | 62,659 | 230 | $0.0235 |
| implement | 9 | 32,232,703 | 5,879,084 | 42,842 | 26,310,777 | 0 | 285 | $0.0000 |
| other | 14 | 35,924,263 | 9,141,581 | 110,685 | 26,671,997 | 0 | 392 | $0.1283 |

### Project B: pairing of planning and implementation

4 changes have both planning and implementation runs, 0 only planning runs, 2 only implementation runs, and 4 runs have no determinable change name and count as unpaired.

| Change | Status | Planning runs | Planning tokens | Planning tool calls | Implementation runs | Implementation tokens | Implementation tool calls |
| --- | --- | --- | --- | --- | --- | --- | --- |
| change 1 | paired | 1 | 34,955,419* | 553 | 1 | 25,244,256* | 398 |
| change 2 | paired | 1 | 42,029,750 | 632 | 1 | 54,771,945* | 856 |
| change 3 | paired | 1 | 32,646,142* | 522 | 1 | 121,365,285* | 1,282 |
| change 4 | paired | 1 | 69,740,364* | 1,070 | 1 | 177,993,388* | 1,312 |
| 2 changes | unpaired (implementation-only) | 0 | - | - | 2 | 106,548,037* | 1,065 |

\* includes an agent without usage data.
