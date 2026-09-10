# Verified Milestone Build Plan

Status terms: `DONE` means the relevant behavior was exercised, not merely coded.

Current phase: post-performance design implementation. The locked visual direction is being applied in bounded, mobile-safe passes.

## M0: onboarding, environment, architecture

In progress. Product model, event gates, stable build, authoritative API surface, headless server execution, and local restart persistence are verified. Remaining: rendered client, two-client, guest, and real mobile smoke tests.

Exit gate: persistence survives restart locally (passed) and a second client sees the same state (pending).

## M1: ugly vertical slice

Built in code and compile-tested with primitives only: question board, left/right labels and trigger zones, authoritative queued one-vote handler, persisted state object, deterministic lightweight Shadow placement, and shared-state update. Rendered walk/message proof remains pending.

Exit gate: walk -> choose -> count -> Shadow -> persist -> restart -> still present -> second client sees it.

## M2: mobile performance proof

Test 1, 5, 10, 20, then 30 lightweight Shadows on a real phone. Stop increasing at the first meaningful stability, responsiveness, memory, or clutter issue.

Current gate note: the spatial A/B orientation gate passed on mobile. The disposable 5/10/20/30 stress sweep then completed on 2026-09-01 through the authoritative QA controls; the 1-Shadow result remains `EXCELLENT`. No crash or state-application error was logged. Because frame-rate telemetry and explicit per-level subjective labels were not captured, lock a conservative production budget of 20 visible Shadows and retain 30 as a QA stress ceiling.

## Pre-M2 functional UX corrections

These are targeted comprehension and first-arrival corrections, not the full visual-design phase. Complete them in this order:

1. Finish real-mobile A-orientation verification, then real-mobile B-orientation verification, using explicit stable `CHOICE_A_ZONE` / `CHOICE_B_ZONE` identities and authoritative logs.
2. Correct the deterministic spawn position and facing so a new player enters a neutral area outside both choice triggers and any arming boundary, facing the question/decision paths and visible historical Shadows. Spawn must not arm or cast a vote.
3. Add minimal player-facing onboarding: identify the question, explain “choose with your feet,” direct the player to walk to A or B, and explain that the Shadow remains.
4. Make the onboarding state-aware: reduce instructions after movement/understanding, and after voting show concise confirmation plus the current result rather than debug vote state.
5. Completed: real-mobile spawn/onboarding review passed; the remaining 5/10/20/30 Shadow sweep then completed on the isolated QA realm.

The M2 budget is now recorded. The QA overlay, hydration wording, build marker, vote-state text, and other diagnostics remain temporary and must not ship as submission UI. The design direction has now been run through the local design-skill workflow and implementation is proceeding. Production signage is accepted; the first bounded typography/environment/Shadow polish is ready for mobile UAT on fresh preview 8049.

## M3: robust daily state — DONE

UTC date-keyed curated questions, safe rotation, idempotent initialization, and previous-question summary bounded in storage.

## M4: production Shadow system — DONE

Cap visible traces, deterministic distribution, lightweight geometry/model, graceful overflow summary, and no dependence on full NPC avatars.

## M5: Resonate — DONE

Proximity interaction with visible reaction and an authoritative lightweight persisted count.

## M6: optional live presence bonus — DONE

Same-side/opposite-side acknowledgement only when other live users exist. Core never waits for it.

## M7: design system and park art — IN PROGRESS

Run design workflow against confirmed behavior. Dreamlike nighttime garden, central monument, two legible paths, Shadows as visual hero, large mobile text, minimal UI.

## M8: microinteraction polish — IN PROGRESS

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


Spatial UX correction (2026-09-06): 8049 UAT failed because the board stood between spawn and the A/B destinations. The corrected composition places the board at the rear edge and brings both complete destinations/triggers forward; fresh mobile stationary-spawn verification is pending on preview 8051.

8051 UAT follow-up (2026-09-06): real-mobile review failed on stacked signage silhouette, readable sign backs, and incidental Shadow composition. The bounded cleanup moves Memory Garden to a side pocket, gives every readable sign an opaque blank rear, and groups Shadows beyond the A/B plinths. Automated validation is green; fresh mobile stationary-walkaround verification is pending on cache-busted preview 8052.


8052 lateral composition correction (2026-09-06): clean sign rears and open routes passed, but Memory Garden and Shadow populations failed the spatial composition review. Memory Garden is now a farther side pocket and Shadows are grouped laterally beside A/B; fresh mobile walkaround verification is pending on isolated preview 8053.
