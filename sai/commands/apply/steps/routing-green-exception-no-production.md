# Routing: GREEN Exception — No Production

RED block present, exact `## Step N` contract, no production file in scope. Dispatch one RED worker as `green-exception`.

Task disclosure: the `## Step N` contract, the Step's RED block, its allowed files, and the testing slice (framework and assertion libraries, the Step test command of coordinator § Verification commands). The worker authors the tests, leaves them green, and reports its RED classification in field 3 and `GREEN result: pass`.

The dispatch is terminal for the Step: no GREEN dispatch follows. A green-exception that cannot leave its tests green closes failed; it never reports broken tests as a pass.
