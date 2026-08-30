# SHADOW PARK mobile performance QA

The mobile Shadow sweep runs from a disposable copy of the Gate 2 checkpoint:

`C:\Users\HomePC\Documents\Codex\shadow-park-performance-qa`

That copy uses the same `createShadow()` and `renderState()` path as the project. It adds only a temporary QA control message and a temporary 2D control row for the five requested populations: 1, 5, 10, 20, and 30.

## Isolation

- The QA copy uses the dedicated scene-storage key `shadow-park/state/performance-qa-20260830`.
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
