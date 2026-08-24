# Technical Verification Ledger

Last updated: 2026-08-24.

## Environment

| Check | Result | Evidence level |
| --- | --- | --- |
| OS | Windows NT 10.0.22621, PowerShell 7.6.4 | RUNTIME CONFIRMED |
| Node.js | v24.14.0 | RUNTIME CONFIRMED |
| npm | 11.9.0 | RUNTIME CONFIRMED |
| Git | 2.53.0.windows.2 | RUNTIME CONFIRMED |
| TypeScript global | 6.0.3 | RUNTIME CONFIRMED, project uses SDK toolchain compiler |
| Creator Hub | Not found in standard install locations | RUNTIME CHECK, install status not globally exhaustive |
| Stable SDK scaffold | `@dcl/sdk` 7.26.0 template initialized | RUNTIME CONFIRMED |
| Stable build | `npm run build`, bundle and typecheck passed | RUNTIME CONFIRMED |
| Local preview server | Listened on `0.0.0.0:8000`, emitted Bevy Web preview URL | RUNTIME CONFIRMED |
| Rendered interaction | Browser control failed before tab creation due local runtime path error | UNKNOWN / BLOCKED |
| Real mobile preview | Not yet performed on a phone | UNKNOWN / REQUIRES DEVICE |

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

## Required remaining proofs

- Open two independent client identities; cast on one and observe the broadcast/Shadow on the other.
- Exercise the physical walk-in trigger and vote message through a rendered client.
- Verify guest participation and once-per-current-identity behavior.
- Run the primary journey on a real supported phone and record performance/legibility observations.
- Determine redeployment persistence from official service guarantees or an organizer-granted test World. Do not claim until exercised.

## Dependency/security warning

The exact authoritative dependency tree currently reports 14 npm audit findings: 2 low, 5 moderate, 6 high, and 1 critical. The critical advisory is transitive `protobufjs` in official SDK tooling/protocol/hash paths; other notable issues include `extract-zip`, old `esbuild`, and `ts-deepmerge`. npm's proposed fix is an incompatible downgrade to SDK 7.1.3, which removes the required authoritative path. No force-fix or major-version override was applied. This is an upstream/toolchain risk that needs a verified official SDK update or carefully scoped mitigation before submission.
