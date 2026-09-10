# SHADOW PARK mobile performance QA

The mobile Shadow sweep runs from a disposable copy of the Gate 2 checkpoint:

`C:\Users\HomePC\Documents\Codex\shadow-park-performance-qa`

That copy uses the same `createShadow()` and `renderState()` path as the project. It adds only a temporary QA control message and a temporary 2D control row for the five requested populations: 1, 5, 10, 20, and 30.

## Isolation

- The QA copy uses the dedicated scene-storage key `shadow-park/state/performance-qa-spawn-onboarding-b-20260901`.
- Its question ID is `2026-08-space-ocean-performance-qa`, so player vote locks cannot collide with the public QA state.
- The `performanceQaSetPopulation` message accepts only 1, 5, 10, 20, or 30 and writes a deterministic `ParkState` with alternating A/B Shadow records and unique `performance-qa-shadow-*` IDs.
- Each accepted population is broadcast through the normal `stateChanged` message. The phone therefore exercises the production state-receive, clear, and Shadow-entity creation path; no rendered evidence is faked.
- No votes are required and the production `shadow-park/state/qa-8007` key is not written by this copy.

The temporary bundle is identified on-screen as `MOBILE PERFORMANCE QA 2026-08-30`. This marker and the population buttons are QA-only and must not be retained in the production bundle. The disposable copy and its performance storage key are removed or retired after the sweep; no broad cleanup is used on the checkpoint project.

## Procedure

1. Connect once through the clean QR for the isolated performance realm.
2. Confirm the QA marker is visible.
3. Select 1, then 5, 10, 20, and 30 in order. At each level observe load/hydration, movement, camera/touch responsiveness, visual readability/crowding, missing or duplicate entities, and any crash/freeze.
4. Record only trustworthy client metrics if the client exposes them; otherwise use qualitative observations and do not invent FPS values.

## Completed sweep — 2026-09-01

The disposable QA copy was rebuilt after enlarging the mobile-only population controls and served from a fresh isolated CLI preview on port `8024`. The QR/deep link targeted the same authoritative Hammurabi realm. The temporary control row was rendered as five separate touch targets: `[ 1 ] [ 5 ] [ 10 ] [ 20 ] [ 30 ]`.

| Population | Authoritative state | Client state-render evidence | Operator result |
| ---: | --- | --- | --- |
| 1 | Existing baseline | Previously observed as **EXCELLENT** on real mobile | **EXCELLENT** |
| 5 | Final reset: 3 A / 2 B; `shadowCount: 5` at 10:13:50Z. An earlier accidental A vote briefly raised the state to 6; the QA control reset the population to 5 before the timed observation. | State broadcast completed; client timing report followed | Observation completed after the reset; no stop-condition reported, but no explicit category label was captured |
| 10 | 5 A / 5 B; `shadowCount: 10` at 10:16:06Z | State broadcast completed; client receive-to-render reports 2–3 ms | Observation completed; no stop-condition reported, but no explicit category label was captured |
| 20 | 10 A / 10 B; `shadowCount: 20` at 10:17:09Z | State broadcast completed; client receive-to-render report 1 ms | Observation completed; no stop-condition reported, but no explicit category label was captured |
| 30 | 15 A / 15 B; `shadowCount: 30` at 10:17:46Z | State broadcast completed; client receive-to-render report 10 ms | Observation completed; no stop-condition reported, but no explicit category label was captured |

No crash or population-generation/state-application error was logged. The first 5-Shadow setup included one accidental A vote before the control was used again to restore the exact five-Shadow population; no vote occurred after that final reset or during the 10/20/30 levels. These logs validate the authoritative state-generation and client state-application path; they do not provide FPS or frame-drop telemetry. The operator completed each requested mobile observation, but did not provide explicit per-level rating labels in the transcript, so no subjective rating is inferred.

### Production budget decision

- **Conservative production visible-Shadow budget: 20.** This leaves headroom for final art, audio, animation, and interaction effects while preserving a tested mobile state-render path.
- **30 visible Shadows: QA stress ceiling only.** The implementation can generate and render 30 in the disposable test, but 30 is not the production target until explicit frame-time telemetry or a labeled visual review supports it.
- Historical tallies may exceed the visible budget; keep the existing bounded sampling strategy and render the newest eligible Shadow records only.
