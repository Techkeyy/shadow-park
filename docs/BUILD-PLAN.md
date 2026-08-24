# Verified Milestone Build Plan

Status terms: `DONE` means the relevant behavior was exercised, not merely coded.

## M0: onboarding, environment, architecture

In progress. Product model, event gates, stable build, authoritative API surface, headless server execution, and local restart persistence are verified. Remaining: rendered client, two-client, guest, and real mobile smoke tests.

Exit gate: persistence survives restart locally (passed) and a second client sees the same state (pending).

## M1: ugly vertical slice

Built in code and compile-tested with primitives only: question board, left/right labels and trigger zones, authoritative queued one-vote handler, persisted state object, deterministic lightweight Shadow placement, and shared-state update. Rendered walk/message proof remains pending.

Exit gate: walk -> choose -> count -> Shadow -> persist -> restart -> still present -> second client sees it.

## M2: mobile performance proof

Test 1, 5, 10, 20, then 30 lightweight Shadows on a real phone. Stop increasing at the first meaningful stability, responsiveness, memory, or clutter issue.

## M3: robust daily state

UTC date-keyed curated questions, safe rotation, idempotent initialization, and previous-question summary bounded in storage.

## M4: production Shadow system

Cap visible traces, deterministic distribution, lightweight geometry/model, graceful overflow summary, and no dependence on full NPC avatars.

## M5: Resonate

Proximity interaction with visible reaction and an authoritative lightweight persisted count.

## M6: optional live presence bonus

Same-side/opposite-side acknowledgement only when other live users exist. Core never waits for it.

## M7: design system and park art

Run design workflow against confirmed behavior. Dreamlike nighttime garden, central monument, two legible paths, Shadows as visual hero, large mobile text, minimal UI.

## M8: microinteraction polish

Only useful audio, animation, and feedback that clarify commitment or Resonance.

## M9: mobile/accessibility optimization

Touch journey, small-screen text, performance, reduced motion where applicable, color-independent choice labels, and 30-second cold-user test.

## M10: organizer World deployment

External dependency: World name and collaborator permission from organizer. No purchase authorized.

## M11: real visitor seed test

Invite test visitors, verify independent identities, observe returned state, and avoid fabricated production counts.

## M12: full audit

Claims, code hygiene, repository hygiene, adversarial vote/persistence cases, mobile performance, live deployment, source accuracy.

## M13: truthful README and submission assets

Run perfect-readme only from actual output, current test counts, screenshots/video, known limits, live URL, and public repository.

## Priority ladder

1. Authoritative persistence proof.
2. Ugly complete loop.
3. Solo/mobile clarity.
4. Reproducibility and failure handling.
5. Performance.
6. Resonate.
7. Visual polish.
