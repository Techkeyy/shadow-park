# M0 Technical Checkpoint Audit

Date: 2026-08-24.

## What is wrong and matters

1. **Rendered client behavior is unverified.** The preview realm and headless server run, but Codex browser control failed before tab creation with a missing runtime path. The Kane browser runner could not start because its required Bash service is access-denied on this Windows host. Therefore physical movement, environmental text legibility, room messages from a client, Shadow rendering, and second-client observation are not claimed complete.
2. **Real mobile behavior is unverified.** No supported phone has scanned the mobile preview QR. Touch movement, readability, frame rate, and mobile client compatibility remain delivery gates.
3. **Production World access is missing.** `shadow-park-dev.dcl.eth` is an explicit placeholder. Organizer-granted name and collaborator rights are required. No purchase is authorized.
4. **Official SDK tooling has material transitive advisories.** `npm audit` reports 14 findings, including critical `protobufjs`. npm recommends an incompatible SDK downgrade. No unsafe automatic fix was applied.
5. **Exact submission cutoff and judging weights are unknown.** September 4 is confirmed, exact time/timezone and weights are not.

## What is wrong and does not currently block the proof

- Node's test runner warns that the TypeScript test file is reparsed as ESM. All four tests pass; changing package module type could affect the scene toolchain, so the warning is accepted for now.
- Current visuals are intentionally ugly primitives and do not represent the final design.
- The headless runtime emits upstream deprecation/restricted-action warnings while continuing to run the authoritative scene.

## What was verified

- Official stable scene template initialized and built.
- Exact authoritative SDK and JS runtime pinned to `7.26.1-32239895147.commit-3c77d90`.
- `Storage`, player storage, `isServer`, typed room messaging, and guest identity fields exist in the installed package surface.
- Authoritative SHADOW PARK bundle and typecheck pass.
- Four deterministic state tests pass, including the 30-Shadow cap.
- Headless authoritative scene executes and connects to the local realm.
- Scene storage record survives full preview process restart.
- SHADOW PARK state is initialized via SDK storage and loaded on the next server boot.
- Unused template code, visual composite, binary CRDT, and misleading template README were removed.
- The package lockfile is no longer ignored.
- `npm run doctor` passes all implemented load-bearing local checks and warns on the placeholder World.

## What could not be verified

- Walk -> vote request -> accepted result through a real client.
- Count/Shadow broadcast to two independent clients.
- Guest once-only semantics across active session and restart.
- Real phone performance and controls.
- Production storage across server replacement or scene redeployment.
- Organizer World permissions, public URL, GitHub repository, and DoraHacks submission.

## Checkpoint status

**READY WITH WARNINGS** for continued M1 client verification. Not ready for design lock, deployment, or submission.
