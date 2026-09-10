# Recovery bug matrix

No row is mobile-verified until the owner completes the full five-question run.

| ID | Priority | Finding | Evidence | Status |
|---|---|---|---|---|
| R01 | P0 | Movement interruption ignored; throw leaves permanent lock | recovery now checks `movePlayerTo().success` and retries | Fixed in source; mobile proof pending |
| R02 | P0 | Dropped readiness response cannot recover | server accepts safe same-question retry; client retries delivery | Fixed in source; mobile proof pending |
| R03 | P0 | Lost answer/state response leaves pending forever | answer transport errors surface; response timeout still absent | Partially fixed; follow-up risk |
| R04 | P0 | Q4 phone stall | owner report; no correlated incident trace yet | Cause unproven |
| R05 | P1 | Completed board becomes Q1 | completion state now uses `quiz-complete` and a dedicated texture | Fixed in source; mobile proof pending |
| R06 | P1 | Replay/latest/best missing | explicit server replay action and client button; best-history policy remains simple | Partially fixed; mobile proof pending |
| R07 | P1 | Avatar plus fallback both rendered | AvatarShape and fallback are now mutually exclusive | Fixed in source; mobile proof pending |
| R08 | P1 | Shadow recreated on every state | personal root survives refresh; historical gallery still rebuilds | Partially fixed |
| R09 | P1 | Level 4/5 indistinguishable | distinct ring/full-set accents added | Fixed in source; mobile proof pending |
| R10 | P1 | Hall contains legacy fake percentages | Hall texture now uses truthful copy | Fixed in source; mobile proof pending |
| R11 | P1 | Hall path crosses A; gallery crowds | route moved below/around captures; .82 x .6 grid remains | Route fixed; spacing rendered check pending |
| R12 | P1 | Wrong correct-answer text not shown | result UI now renders authoritative correct answer | Fixed in source; mobile proof pending |
| R13 | P1 | Stale hydrated state can answer on reconnect | client starts UNARMED, recenters if reconnecting inside capture, then arms | Fixed in source; mobile proof pending |
| R14 | P1 | Persistence two-write crash window | global write before per-player write; rollback not checked | Residual architecture risk, do not erase state |
| R15 | P2 | Prior tests/claims overstate coverage | tests execute retired arming/visibility, not movement client | Audit correction required |

## Test policy

Separate pure rules, actual-client adapter tests, server fault-injection tests, rendered evidence, and owner mobile UAT. In-memory Storage is not restart proof against Hammurabi. An ECS mutation timestamp is not proof an avatar finished rendering.
