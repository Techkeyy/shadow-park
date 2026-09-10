# SHADOW PARK UX cleanup

Status: final active-entity subtraction pass complete; awaiting one internal player-eye walkthrough before the next natural two-question mobile UAT.

## Product sentence

Read the question, step onto the visible A or B pad, get immediate acknowledgement and an authoritative result, watch one Personal Shadow progress, then return to the quiz center for the next question. Past players belong only in the Hall of Shadows.

## Active production inventory (from the live initializer)

| Active entity/group | Decision | Current purpose |
| --- | --- | --- |
| Opaque question landmark + one visible SDK-plane question surface | KEEP | Single focal point for today's question; blank physical rear. |
| A sign at x=2.8, z=8.35 | KEEP | Labels the A destination and current answer. |
| B sign at x=13.2, z=8.35 | KEEP | Labels the B destination and current answer. |
| A pad at x=2.8, z=6.8 | REBUILD | Violet step-on affordance in front of the A sign. |
| B pad at x=13.2, z=6.8 | REBUILD | Cyan step-on affordance in front of the B sign. |
| Central neutral plaza and fork paths | KEEP | Open route from spawn to either pad; no answer is accepted at spawn. |
| Personal Shadow pedestal + compact YOUR SHADOW plaque | REBUILD | One owned progression home beside the quiz plaza. |
| Hall of Shadows base at x=2.2, z=13.2 + one modest entrance sign | KEEP / RELOCATE | Physically separate side destination; historical gallery is not visible beside A/B from spawn. |
| Historical Shadow AvatarShape entities | KEEP / RELOCATE | Instantiated only in the Hall gallery using the 20-visible cap; permanent nameplates suppressed; cool ghost treatment. |
| Side path, four restrained trees, low ground treatment | KEEP / REDUCE | Quiet twilight navigation dressing; excess posts, lantern poles and canopy clutter removed. |
| Audio source | KEEP | Short local acknowledgement sound; optional for comprehension. |
| Legacy Genesis booth/core-art GLBs | REMOVE | Not part of the current quiz composition. |
| Gateway pillars, beams, ocean/space rings, corner groves, extra posts | REMOVE | Prototype/legacy destination clutter removed from the active initializer. |
| Dark blank slab behind the central promenade | REMOVE | Unexplained competing structure removed from the primary quiz view. |
| Question-board finials/decorative cylinders | REMOVE | The single question landmark remains the focal point without ornamental clutter. |
| Hall-path lantern poles/spheres and extra rear trees | REMOVE | Side route remains readable without a second field of vertical props. |
| Memory Garden board/structures | REMOVE | No active Memory Garden presentation remains; Hall of Shadows is the only history area. |
| Duplicate boards, stale voting props, QA markers/debug geometry | REMOVE | No active production instantiation. |

## Pad and capture geometry

The visible pad is the player-facing source of truth. Both zones are authored at centerZ=6.8, with scaleX=4.4 and scaleZ=2.2.

- A visual pad bounds: x 0.6..5.0, z 5.7..7.9.
- B visual pad bounds: x 11.0..15.4, z 5.7..7.9.
- The sign front is 1.55 world units behind the pad center (z=8.35), leaving a 0.45 unit visual gap from the pad rear edge.
- Capture adds 0.45 horizontally and 0.25 in depth, ending at z 8.15, still before the sign body.

Position polling evaluates the current X/Z every update. Center, corner, diagonal, side, slow, fast, and edge-standing cases use the same path-independent containment rule; no trajectory or hidden corridor is required. The authoritative server still validates question identity, correctness, duplicates, stale requests, and transitions.

On detection the pad pulses, the UI reports CHOICE LOCKED / ANSWERING..., and only the server reports CORRECT or NOT THIS TIME.

## Personal Shadow semantics

A fresh unanswered run has no Personal Shadow AvatarShape; the pedestal/plaque is present as a stable home. After the first accepted answer, exactly one Personal Shadow is materialized at (6.35, 0.12, 4.65), receives the current player's supported avatar snapshot when available, and gets a one-time pulse plus YOUR SHADOW AWAKENS feedback. Later correct answers update that same entity's visible progression pieces; wrong answers do not increase its level. Reconnect restores the run level without creating another Personal Shadow.

Historical Shadows are created only from persisted completed/history records and are placed in the Hall gallery grid. They are never placed on the primary quiz pads, routes, spawn, or Personal Shadow pedestal.

## Final active-entity inventory

### Primary plaza

- One opaque question landmark with one visible question plane and a physically blank rear.
- One A sign and one violet A pad.
- One B sign and one cyan B pad.
- One compact Personal Shadow pedestal/plaque (the pedestal remains before the first answer; the AvatarShape does not).
- Neutral spawn plaza, two low fork paths, a short Hall side path, four restrained trees, and minimal ground treatment.

### Hall of Shadows

- One modest entrance sign: `HALL OF SHADOWS / PAST PLAYERS REMAIN HERE`.
- One separated gallery base and a deliberate four-column staggered grid for persisted historical Shadows.
- No secondary information board, no permanent nameplates, and no Shadows on the quiz routes.

### Removed from active instantiation

- Dark blank central slab.
- Question-board finial cylinders and spheres.
- Hall-route lantern poles/spheres and two rear canopy trees.
- Legacy Memory Garden, voting, duplicate-board, gateway, ring, post, frame, QA, and statistics surfaces.

### Shadow category invariant

- Active Personal Shadows: `0` for a fresh unanswered run, otherwise exactly `1`.
- Active Historical Hall Shadows: `0..20` (the persisted visible cap).
- Invalid/unclassified Shadow entities: `0`.

## Internal evidence

- Build/typecheck: PASS.
- Unit/regression suite: 37/37 PASS.
- Authoritative integration suite: PASS (sequential and concurrency scenarios).
- SDK pins unchanged: @dcl/sdk=7.26.1-32239895147.commit-3c77d90; @dcl/js-runtime=7.26.1-32239895147.commit-3c77d90.
- Natural A/B position matrix: PASS by shared containment/capture tests; mobile UAT is intentionally stopped until the new preview is presented.
- Full five-question state/transition tests: PASS in the existing authoritative suite; no gameplay or persistence code was changed in this pass.

The next owner test should be a natural first-two-question playthrough, not a path-specific implementation checklist.
