# SHADOW PARK recovery audit

Status: recovery in progress. No mobile UX, release, or deployment pass is claimed.

Baseline HEAD: `ad42ba8` on `master`. Earlier mobile checkpoint `f40ae07` remains tagged `mobile-functional-gate-pass`. The quiz pivot is primarily uncommitted work and must be preserved, not reset to an old opinion-voting checkpoint.

## Confirmed source defects and recovery status

- Recenter success was previously ignored; the recovery now inspects `movePlayerTo().success`, retries interrupted moves, and retries readiness delivery.
- Readiness acknowledgement is now safely retryable on the server for the same question while the client retries delivery.
- Answer sends now surface transport failure; a response timeout/retry policy remains a follow-up risk.
- Completed client state now has a completion board and explicit Play Again message/action.
- The personal Shadow root now survives state refreshes; historical gallery visuals are still rebuilt on global refresh.
- AvatarShape and primitive fallback are now mutually exclusive; scene-controlled progression accents remain available for AvatarShape players.
- Levels four and five now have distinct ring/full-set progression geometry.
- Hall artwork no longer contains fabricated A/B percentages.
- Hall route now leaves below both capture footprints and runs along the parcel edge; gallery spacing remains a mobile review item.
- Reconnect/loading copy is visible and wrong-answer feedback includes the authoritative correct answer.

## Q4 incident

Exact cause of the owner's Q4 stall is not proven. The above transition failures are deterministic source-level failure paths, not evidence identifying the particular phone incident. Correlated runtime evidence is required.

## Recovery verification

- Unit suite: 37 passing.
- Authoritative sequential and concurrency suites: passing; replay regression added for completed-run restart without a duplicate historical Shadow.
- Pinned-SDK build/typecheck: passing with no compiler errors.
- Isolated Bevy Web render on local realm 8066 reached `SHADOW PARK`, connected a participant, hydrated global state (`total:21`, three historical Shadows), and emitted `state_render_completed` with a 4 ms client receive-to-render interval. Local screenshot artifact: `internal-walkthrough/bevy-connected.png` (SHA-256 `c752101c1f2fd6a8e8fdf4703a19db8e67bb329ca916ac85649445f73fc9b796`).
- This is internal rendered evidence, not owner mobile UAT; a fresh owner preview remains required.

## Owner preview handoff

- Fresh cache-controlled preview: port `8067`, LAN host `192.168.100.9`, listener reachable.
- Clean deep link: `decentraland://open?preview=http://192.168.100.9:8067&position=0,0`.
- QR artifact: `scene/preview-8067-qr.png` and matching `scene/preview-8067-deep-link.txt`.
- No owner mobile result is inferred from the internal walkthrough; wait for the owner to complete one natural five-question run and Hall visit.

## Protected foundation

Do not upgrade the SDK/runtime pins, replace Hammurabi/Storage, reset live persistence, change A/B semantic identities, or reinstate custom-GLB signage. Preserve existing dirty files and generated metadata in the recovery checkpoint.

## Evidence limits

Prior containment tests do not execute client movement/network transitions. Prior integration tests use in-memory Storage and ideal network delivery. A rendered eye-level walkthrough and full owner mobile run remain required before any new QR/deployment.
