# SHADOW PARK endless knowledge-park pivot

Status: building. This document records the implemented core and open release gates.

## Reused foundation

- Pinned authoritative SDK/server boundary and Hammurabi Storage hydration.
- Neutral spawn, forgiving world-space A/B capture, client pending guard, authoritative validation, reconnect handling, and recentering.
- Accepted SDK-plane signage pipeline with opaque board backs and bounded mobile rendering.
- Supported `AvatarShape` snapshots and deployment preparation for `TheShire.dcl.eth`.

## Endless quiz model

The bank contains 360 deterministic `BankQuestion` records across nine categories.
Each player receives an identity-seeded deck with no repeats inside a cycle. At a
cycle boundary the order changes and the first question cannot equal the final
question from the previous cycle.

The authoritative player run stores `lifetimeAnswered`, `lifetimeCorrect`,
`shadowScore`, current and best Chain, rank, Master Stars, deck version/cycle/
cursor, current question, supported appearance snapshot, and timestamps. There
is no terminal fifth question.

Correct answers award 10 Shadow Score plus configured streak milestones. Wrong
answers award zero and reset the current Chain without reducing lifetime rank.
The server validates question identity, option, transition state, and duplicate
requests before persisting and advancing the run.

## Personal Shadow and House of Masters

A fresh player has an empty Personal Shadow niche. The first correct answer
materializes exactly one supported avatar-derived Shadow; later correct answers
update its visible progression. A pooled energy orb travels from the selected
pad to that Shadow after server confirmation.

Only Masters qualify for the separate House of Masters pavilion. The global
registry stores one record per identity, ranks by Shadow Score and best Chain,
and renders at most 20 real historical Masters. Legacy opinion-voting Shadows
are filtered during migration and are not treated as House records.

## Verification

- Unit suite: 41/41 passing.
- Authoritative sequential and concurrency integration suites: passing.
- Pinned SDK build/typecheck: passing.
- Question-bank audit: 360 records, zero validation errors.
- SDK pins unchanged: `@dcl/sdk=7.26.1-32239895147.commit-3c77d90`, `@dcl/js-runtime=7.26.1-32239895147.commit-3c77d90`.

## Remaining gates

Long natural mobile game-feel UAT, Master/House mobile verification, production
deployment, deployed mobile QA, final audit, README/submission materials, and
the public release decision remain open. No release-ready or submission-ready
claim is made yet.
