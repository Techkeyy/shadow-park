# Technical Verification Ledger

Last updated: 2026-09-05.

## Environment

| Check | Result | Evidence level |
| --- | --- | --- |
| OS | Windows NT 10.0.22621, PowerShell 7.6.4 | RUNTIME CONFIRMED |
| Node.js | v24.14.0 | RUNTIME CONFIRMED |
| npm | 11.9.0 | RUNTIME CONFIRMED |
| Git | 2.53.0.windows.2 | RUNTIME CONFIRMED |
| TypeScript global | 6.0.3 | RUNTIME CONFIRMED, project uses SDK toolchain compiler |
| Creator Hub | Official Creator Hub 0.44.2 installed from Decentraland and recognizes `scene/` as SHADOW PARK | RUNTIME CONFIRMED |
| Stable SDK scaffold | `@dcl/sdk` 7.26.0 template initialized | RUNTIME CONFIRMED |
| Stable build | `npm run build`, bundle and typecheck passed | RUNTIME CONFIRMED |
| Local preview server | Listened on `0.0.0.0:8000`, emitted Bevy Web preview URL | RUNTIME CONFIRMED |
| Rendered interaction | Real phone rendered question, A/B zones, movement, tally update, and an A-side Shadow | RUNTIME CONFIRMED ON MOBILE |
| Real mobile preview | Creator Hub mobile QR connected a physical phone on the local network | RUNTIME CONFIRMED |

## Authoritative SDK verification

Registry checked on 2026-08-24:

- stable `@dcl/sdk`: `7.26.0`
- `auth-server` tag: `7.26.1-32239895147.commit-3c77d90`
- exact commit recorded by package: `3c77d90836f4d1517c3d10b2ba761979f4eebf81`

The project pins the exact authoritative build instead of the moving tag.

| Capability | Finding | Evidence level |
| --- | --- | --- |
| Server/client branch | `isServer()` exported from `@dcl/sdk/network` | RUNTIME CONFIRMED API SURFACE |
| Typed room messages | `registerMessages`, `Room.send`, `Room.onMessage`, sender context | RUNTIME CONFIRMED API SURFACE |
| Scene storage | `Storage.get/set/delete/getValues` from `@dcl/sdk/server` | RUNTIME CONFIRMED API SURFACE |
| Player storage | `Storage.player.get/set/delete/getValues` | RUNTIME CONFIRMED API SURFACE |
| Storage values | SDK automatically JSON serializes/parses values | RUNTIME CONFIRMED BY INSTALLED TYPES/IMPLEMENTATION |
| Write ordering | Same-key writes are serialized/coalesced in installed implementation | RUNTIME CONFIRMED BY INSTALLED IMPLEMENTATION, end-to-end pending |
| Storage durability | Verification record survived a full preview-service stop/start; SHADOW PARK state was initialized by `Storage.set` and loaded by `Storage.get` on the next headless-server boot | RUNTIME CONFIRMED LOCALLY |
| Guest flag | `getPlayer()` returns `isGuest` and `userId` | RUNTIME CONFIRMED API SURFACE |
| Guest durable identity | No proof that guest `userId` persists across session/device | UNKNOWN, product must not depend on it |

Important correction: current scene-scoped storage is `Storage.get/set`, not `Storage.world.get/set`. Older/community examples using `Storage.world` are stale for this exact package.

## Smoke-test history

1. Official `scene-template` initialized with pinned CLI 7.26.0. The generic `--project scene` option failed; valid current option was `scene-template`.
2. Initial sandboxed build failed with `EPERM` writing `main.crdt`; the same command with Desktop write permission passed. This was a sandbox boundary, not an SDK failure.
3. Stable build produced `bin/index.js` and passed type checking.
4. Preview server built and listened on port 8000, providing a Bevy Web URL.
5. Automated browser attachment failed with `failed to write kernel assets: path not found`; no rendered interaction claim is made.
6. Exact authoritative SDK installed and its local type/runtime exports inspected.
7. Headless authoritative server started through `@dcl/hammurabi-server@next`, connected to the local realm, executed SHADOW PARK server code, and initialized `shadow-park/state/v1` through the SDK.
8. A verification object was written to the local storage endpoint, the entire preview process was stopped and restarted, and the identical object was read back.
9. On the following headless-server restart, SHADOW PARK loaded its own stored state and logged readiness without a missing-key response or reinitialization.
10. `npm test` passes 4 state tests. `npm run doctor` passes runtime version, exact dependency pins, authoritative flag, tests, build, and typecheck; it warns that the World name is a development placeholder.
11. A real phone connected through Creator Hub's **Show QR Code for Mobile** flow. The question and both zones were visible, movement worked, walking into A updated the tally, and the A-side Shadow rendered with no obvious lag.
12. The earlier approximately 60-second rendered persistence observation is explicitly retired as invalid timing/client-path evidence because a stale CLI authoritative server was active alongside Creator Hub. It remains only historical context that stored data existed; it is not a hydration measurement.

## External deployment status

- World access: CONFIRMED
- World: `TheShire.dcl.eth`
- Friendzone organizer deployment permission: GRANTED
- DCL NAME purchase: NOT REQUIRED
- LAND purchase: NOT REQUIRED
- Organizer World-access blocker: RESOLVED
- Deployment performed: NO

## Startup and hydration timing investigation

The first rendered restart observation was not instrumented finely enough to separate stages:

| Run | Scene usable | Persisted tally visible | Persisted Shadow visible | Result |
| --- | --- | --- | --- | --- |
| Baseline rendered restart | Not separately timed | Approximately 60 seconds after reconnect | Approximately 60 seconds after reconnect | CONTAMINATED/INVALID: stale CLI authoritative server overlapped Creator Hub |
| Timed restart 1 | Yes, before hydration | Not visible after more than 2 minutes | Not visible after more than 2 minutes | Startup/delivery failed: Creator Hub preview ran on port 8001, but its authoritative multiplayer child failed to launch with `spawn EINVAL` before the phone connected |

For timed restart 1, Creator Hub attempted to start its multiplayer server at 16:51:20.023 local and logged `spawn EINVAL` at 16:51:20.028. The phone debug session connected at 17:10:03.969, authenticated at 17:10:17.346, and joined `room-1` at 17:10:17.348. No SHADOW PARK server timing markers appeared on the Creator Hub process because no authoritative scene server was running for its port 8001 realm. The only Hammurabi process on the machine belonged to an older CLI preview on port 8000.

The persisted data itself remained present immediately before the failed run: the existing authoritative process read `shadow-park/state/v1` at 16:51:08.661, 16:51:12.858, and 16:51:15.125 local, each with `found: true` and `total: 1`; the reads took 22 ms, 27 ms, and 58 ms. Timed restart 1 made no vote and its missing Creator Hub authoritative process could not overwrite that value.

Targeted timing markers cover server setup, Storage read, hydration readiness, state request receipt, state send, client receipt, and synchronous Shadow entity creation. The Creator Hub authoritative launch incompatibility remains documented separately; it is not part of the trusted CLI timing result.

## Clean authoritative preview isolation

After terminating the identified CLI preview, Hammurabi process, and Creator Hub preview, ports 8000 and 8001 were both confirmed clear. One isolated Creator Hub 0.44.2 retry then launched pinned SDK process PID 24012 and served visual preview port 8000, but its authoritative launch failed at 17:50:48.364 local with `spawn EINVAL`. No SHADOW PARK server marker occurred.

The installed auth-server SDK attempts to spawn Creator Hub's bundled Node v22.23.2 with its bundled `npx-cli.js`, arguments `--yes @dcl/hammurabi-server@next --realm=http://localhost:8000`, `cwd` set to `scene/`, `shell: false`, and `stdio: inherit`. Both executable and script exist. The synchronous Windows `EINVAL` occurred before a Hammurabi child PID existed, while the same SDK workflow succeeds under the normal system Node/terminal. This is recorded as a Creator Hub 0.44.2 Windows authoritative-preview tooling incompatibility.

The official CLI fallback was started as the sole stack on port 8000. Its matching Hammurabi process used `--realm=http://localhost:8000`. At 17:56:27 local it read `shadow-park/state/v1` with `found: true`, `total: 1` in 73 ms, reached `hydration_ready` in 147 ms, and completed its initial broadcast in 148 ms. The CLI mobile URI targets the same port-8000 realm.

The clean CLI mobile hydration result functionally passed: the real phone displayed the persisted A tally and A-side Shadow without voting. Client instrumentation correlates `requestId`, `requestSentAtIso`, `serverSentAtIso`, `clientReceivedAtIso`, `clientRenderAtIso`, `clientReceiveToRenderMs`, and `serverToRenderMs` across `state_request_sent`, `state_message_received`, and `state_render_completed`; the versioned diagnostics message relays those values to the authoritative server log.

## Gate 1: correlated hydration timing — PASS

One clean reconnect on the isolated CLI realm at port 8002 used request ID `initial-1787600308745-0`. The authoritative server had already hydrated the persisted state (`found: true`, `total: 2`) at `2026-08-24T19:37:28.227Z`. The measured request chain was:

| Marker | System timestamp |
| --- | --- |
| `state_request_sent` | `2026-08-24T19:38:28.745Z` (client) |
| `state_request_received` | `2026-08-24T19:38:27.070Z` (server) |
| `state_send_completed` | `2026-08-24T19:38:27.071Z` (server) |
| `state_message_received` | `2026-08-24T19:38:29.549Z` (client) |
| `state_render_completed` | `2026-08-24T19:38:29.552Z` (client) |
| `client_timing_report` | received by server; same request ID |

The phone and PC clocks were offset. Using the four edge timestamps with midpoint clock-offset correction (server-minus-client offset estimated at `-2076.5 ms`), the application-level segments were:

| Segment | Measured |
| --- | ---: |
| Request → server receive | 401.5 ms |
| Server receive → send completion | 1 ms |
| Send completion → client receive | 401.5 ms |
| Client receive → render completion | 3 ms |
| Total request → rendered state | 807 ms |

The server sent the persisted `total: 2` state, and the client completed the state render path. The initial client treatment is `CALLING...` / `Calling back the Shadows...`, not `0 SHADOWS`; `renderState` replaces it with the restored tallies and clears the loading status. This closes the precise hydration-latency issue as PASS for the clean CLI path. The prior roughly 60-second observation remains retired as contaminated evidence.

After the measured chain, a later live tick found the reconnecting avatar inside Choice A and the existing choice system auto-cast A; the server logged a missing per-player vote key and then broadcast `total: 3`. That mutation occurred after the timing sample and was not part of the hydration result. It is recorded as a test-safety/runtime finding: future A/B sessions must begin outside both zones, or the interaction should be explicitly armed.

## Gate 2: rendered two-client observation — NOT VERIFIED

The real rendered two-client observation remains unverified. The second physical phone is not available; Desktop Explorer was blocked by its external UnityTLS/version guard; and the hosted Bevy Web path stopped at the communications gate with HTTP 401. The authoritative fallback below is explicitly not presented as rendered-client evidence.

## Gate 2: authoritative multi-client fallback — PASS WITH RENDERED-CLIENT LIMITATION

To close the protocol/integration portion of Gate 2 without inventing a second rendered client, the actual production `setupServer()` was exercised through its real typed room-message and Storage boundaries with deterministic in-memory test doubles. No server, state-machine, or persistence logic was copied into the tests. The verified checkpoint remains commit `f40ae07e3c2dfc84576230cbc9698b41a7de50d8`, with annotated tag `mobile-functional-gate-pass` resolving to that commit; both exact pinned dependencies remain unchanged.

| Check | Result | Evidence |
| --- | --- | --- |
| Initial state for identities A/B | PASS | Both received the same question, A=0, B=0, Shadows=0 snapshot |
| Identity A valid neutral → armed → A flow | PASS | Authoritative A=1/B=0, one Shadow, shared `stateChanged` broadcast received by both clients |
| Identity B valid neutral → armed → B flow | PASS | Authoritative A=1/B=1, two Shadows, shared broadcast received by both clients |
| State convergence | PASS | A and B inboxes deep-equal after each accepted mutation |
| Same-side duplicate protection | PASS | Repeated A and repeated B requests rejected with no state or Shadow change |
| Opposite-side second vote | PASS | A→B and B→A requests rejected after `VOTED` |
| Near-concurrent opposing votes | PASS | Three independent fresh-state runs; every run ended A=1/B=1 with two unique Shadows and no lost update |
| Reconnect / late join | PASS | Reconnecting B and late-joining C requested and received the latest snapshot without mutation |
| Broadcast evidence | PASS | Tests assert initial/targeted state sends and one shared broadcast per accepted mutation |

The nine existing state tests plus one sequential integration test plus three independent concurrency runs produced **13 passing test cases**. This establishes authoritative multi-client behavior, duplicate safety, queue serialization, reconnect hydration, late-join synchronization, and broadcast delivery. It does not establish that two separate rendered clients display those updates simultaneously.

**Gate 2 status: PASS WITH RENDERED-CLIENT LIMITATION.** Real single-device mobile rendering, persistence, and vote-safety remain verified; the only outstanding limitation is direct observation of two rendered clients on one realm. The 1/5/10/20/30 Shadow mobile performance sweep is now authorized to proceed, with rendered two-client evidence kept clearly labeled as unavailable.

## UX findings / visual bugs

The first attempted rear-face mitigation (an opaque slab placed behind the front `TextShape` labels) failed on the real mobile renderer. The 8007 real-phone review closed the defect: dynamic question/status/tally copy now uses official 2D UI, the physical board is text-free scenery, and the rear is clean/blank. Front question orientation and readability passed. Do not spend additional engineering time on mirrored text unless it regresses.

The accepted QA/prototype overlay was intentionally temporary. The production pass removes the mobile build marker, vote-state/debug copy, and orientation-QA wire message; the remaining top-center question hierarchy is compact and preserves question readability.

## 2026-09-01 mobile Shadow performance sweep — technically complete

The disposable QA copy was rebuilt with large, separated mobile-only population controls and served from a fresh port-8024 CLI/Hammurabi stack. The authoritative logs recorded successful deterministic state generation and client state-render timing for 5, 10, 20, and 30 Shadows. The first 5-Shadow setup included one accidental A vote before the control restored the exact five-Shadow population; no vote occurred after that reset or during the 10/20/30 levels. No crash or population-generation/state-application error was logged. The prior 1-Shadow result remains **EXCELLENT**.

The logs do not expose FPS/frame-drop data, and the operator supplied completion confirmations without explicit EXCELLENT/GOOD/MARGINAL/FAIL labels for 5/10/20/30. Therefore this is a technically successful stress sweep, not fabricated quantitative performance proof. The conservative production cap is **20 visible Shadows**; 30 remains a QA stress ceiling pending stronger frame-time evidence.

## Vote safety / interaction arming

The 8007 implementation uses official Trigger Areas plus an authoritative `UNARMED -> ARMED -> VOTED` state machine. In the captured real-phone session, unarmed A/B requests were rejected, a neutral exit toward the choices armed the session, one intentional B vote created one Shadow, and repeated same-side and opposite-side requests were rejected with `state: VOTED`; every duplicate response rebroadcast `total: 1`. A later clean reconnect created a new session at `2026-08-25T00:28:02.307Z`, received persisted `total: 1`, and produced no vote request, `vote_accepted`, or `shadow_created` event.

## 8007 real-mobile functional gate — PASS

Director-reviewed phone screenshots passed the 2D question UI, correct orientation, clean blank board rear, chosen-side Shadow, and QA tally/status presentation. Authoritative logs passed unarmed rejection, neutral-to-choice arming, exactly-one intentional vote, same-side duplicate rejection, opposite-side second-vote rejection, and reconnect-without-vote/Shadow duplication. The final design cleanup remains deferred: remove the temporary build marker, vote-state/debug copy, and excessive overlay coverage.

## Required remaining proofs

- A two-rendered-client observation remains desirable but is not required for the authoritative fallback Gate 2 result; do not describe the current evidence as two-device rendered proof.
- Verify guest participation and once-per-current-identity behavior.
- The 1/5/10/20/30 mobile Shadow sweep is complete on the disposable QA realm; run one fresh post-design mobile smoke check before deployment.
- Determine redeployment persistence from official service guarantees or an organizer-granted test World. Do not claim until exercised.

## Dependency/security warning

The exact authoritative dependency tree currently reports 14 npm audit findings: 2 low, 5 moderate, 6 high, and 1 critical. The critical advisory is transitive `protobufjs` in official SDK tooling/protocol/hash paths; other notable issues include `extract-zip`, old `esbuild`, and `ts-deepmerge`. npm's proposed fix is an incompatible downgrade to SDK 7.1.3, which removes the required authoritative path. No force-fix or major-version override was applied. This is an upstream/toolchain risk that needs a verified official SDK update or carefully scoped mitigation before submission.


## 2026-09-05 production signage integration — PASS

The rejected custom-GLB signage path is no longer active in the production presentation. Main question surfaces, A/B destination signs, and the Memory Garden plaque now use the exact pinned-SDK
`MeshRenderer.setPlane` + `Material.setBasicMaterial` textured-plane pipeline validated by the pinned mobile control. Production textures are power-of-two 1024×1024 PNGs. The question landmark rear is a separate opaque physical slab; no production signage relies on TextShape or backface-culling behavior.

Validation: `npm test` = 23/23 passing; `npm run build` and type checking passed; both pinned dependencies are unchanged. A fresh isolated CLI realm on port 8047 served the rebuilt scene. Real-phone checks all passed: main board readable, board rear blank/non-mirrored, A sign readable, and B sign readable.


## 2026-09-05 bounded polish implementation

After the production signage gate passed, the first bounded completion pass increased mobile signage contrast and hierarchy without changing plane geometry or UVs. It also added restrained garden pathways, lanterns, tree silhouettes, destination gateways, and softer translucent A/B Shadow silhouettes with halo accents. The authoritative voting, persistence, question rotation, interaction arming, Resonate, live feedback, and 20-visible-Shadow cap were not changed.

The 23-test suite passes and the pinned SDK build/typecheck passes. Fresh isolated preview 8049 contains this bundle and is ready for the next normal-visitor mobile UAT; visual acceptance of this polish remains pending that UAT.


## 2026-09-06 first-time visitor spatial correction

The 8049 manual UAT found the board separating instruction from action: A/B destinations sat behind the question landmark. The bounded correction moves the question landmark to the rear backdrop at z=11.4, brings both A/B destination installations and their trigger volumes forward to z=8.2, tightens the neutral pad to z=4.1, and points the spawn camera at z=8.0. Shadows continue to derive placement from the same explicit A/B zone identities. The accepted signage pipeline, vote safety, persistence, question state, Resonate, live feedback, and SDK pins are unchanged. Automated spatial, unit, integration, build, and type checks pass; fresh mobile verification is pending on preview 8051.

## 2026-09-06 8051 bounded composition cleanup

The 8051 rendered review failed only its bounded composition checks: stacked board silhouette, readable sign backs, and incidental Shadow placement. The correction is presentation-only. Memory Garden is now spatially separated at the side pocket; A/B and Memory Garden signs use the proven `MeshRenderer.setPlane` + `Material.setBasicMaterial` front with an opaque body and oversized blank rear; and rendered Shadows use deterministic 6x5 side-group slots that stay beyond the destination plinths and off the vote routes.

Validation after the correction: `npm test` = 24/24 passing (including the Memory Garden separation assertion), `npm run build` and type checking pass, and `npm run test:integration` passes. No authoritative state, persistence, duplicate protection, question, Resonate, or SDK pin changes were made. Fresh real-mobile verification is pending on isolated preview 8052.


## 2026-09-06 8052 lateral composition correction

The 8052 real-mobile review passed blank sign rears and open A/B routes, but failed spatial composition: Memory Garden remained attached to the main-board silhouette and Shadows were behind the A/B signs. The presentation-only correction moves Memory Garden to a compact west side pocket, adds a low-profile side path, and computes per-choice lateral Shadow positions beside each destination. Voting, persistence, duplicate protection, A/B mapping, signage front/rear implementation, question state, Resonate, and SDK pins are unchanged. Automated build and tests remain green; fresh mobile verification is pending on isolated preview 8053.
