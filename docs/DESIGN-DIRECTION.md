# Design Direction

Status: performance proof is recorded; the local `veritable-ui-design` workflow has been run against the verified scene and this direction is now being implemented in bounded passes.

## Product-derived traits

Quiet, haunting, human.

## Experience hierarchy

1. Today's question, readable immediately.
2. Two unmistakable spatial choices, A left and B right.
3. Existing Shadows as the dominant social proof.
4. Commitment feedback and updated tally.
5. Optional Resonance prompt near an old Shadow.

## Intended identity

A dreamlike nighttime social garden with deliberate negative space and glowing human traces. The park must not become a generic colorful low-poly metaverse scene or a purple Web3 interface. Environmental art frames the Shadows and never overpowers them.

## Mobile constraints

- No required menus or long tutorial.
- Large environmental text and short labels.
- Choice is made by ordinary movement, using native touch controls.
- Both direction and words distinguish A/B; color alone is insufficient.
- Important interaction target sizes and proximity must tolerate imprecise touch movement.
- Motion must clarify commitment and reaction, not delay control.

## UX findings to carry into implementation/design

These findings came from real Decentraland Mobile observation and are recorded for the next functional pass:

- The first view must be intentional; never spawn facing the rear of the monument or a blank wall.
- Spawn in a neutral, unarmed entrance area with a clear facing toward the question, both decision paths, and historical Shadows where present.
- “Choose with your feet” is the fundamental interaction. A visitor must understand A/B without reading documentation, and the environment should do most of that teaching through a clear path split, readable ground identities, and a visual relationship between each choice and its Shadows.
- Onboarding should be concise and state-aware: question plus “walk to A or B” on first arrival, a lighter footprint after movement, and a short post-vote confirmation with the current result.
- The current QA/debug overlay (mobile build marker, hydration diagnostics, vote-state text, and excessive state information) is temporary and must disappear from production UI.
- Final UI must be mobile-safe around Decentraland’s existing controls, favoring a restrained top-center hierarchy rather than a screen-dominating panel. Do not lock final dimensions yet.
- Shadows remain the visual hero; debug information must not compete with them.
- 8023 structural review passed: spawn is neutral and forward-facing, the board remains a non-blocking landmark, and the A/B decision space is open. The composition cleanup now centers the landmark without changing the route.
- The temporary QA overlay remains a design debt item: remove duplicate loading copy, build markers, vote-state/debug text, and excessive screen coverage before production.
- The environment should connect each physical A/B destination to its answer name so the world teaches the choice without a permanent instruction panel. The cleanup uses matched destination arches, path lights, and distinct upward/ripple silhouettes rather than unrelated marker objects.
- Performance headroom: design around a conservative 20-visible-Shadow budget; treat 30 as a stress ceiling rather than a visual target.

These were the pre-design functional UX corrections. The performance gate is now complete, so the bounded visual/interaction pass below can proceed without reopening those closed investigations.

## Locked direction for implementation

This direction applies the local `veritable-ui-design` workflow to the verified mobile loop, the 8023 spatial review, and the 2026-09-01 Shadow stress sweep. It is intentionally bounded by the proven 20-visible-Shadow budget and the existing authoritative message/state architecture.

### Spatial composition

- Preserve the successful neutral spawn: the player enters at the south edge, faces north into the question and the two open paths, and cannot vote until deliberately leaving neutral.
- Center the question landmark above the fork as a readable visual anchor. It must frame the choice, never block either route, and retain an opaque, intentionally blank rear.
- Make A and B destinations physically legible from spawn through two distinct paths, large ground glyphs, repeated answer names, and different environmental silhouettes. Never rely on left/right camera assumptions or color alone.

### Visual language

- Tone: quiet, haunting, human; generous negative space and a night-garden atmosphere.
- Base: deep ink/navy ground and matte dark monument surfaces.
- Choice A / space: restrained orchid-violet light, sparse constellation marks, and an upward/airy silhouette.
- Choice B / deep ocean: restrained cyan/teal light, low ripple bands, and a grounded/flowing silhouette.
- Accent: warm moon-white for readable labels and a small amount of emissive glow. Avoid a saturated purple Web3 dashboard or generic colorful low-poly clutter.

### UI and onboarding

- Replace the QA panel with a small top-center hierarchy: question first, one short “Choose with your feet” instruction while unarmed, and a compact post-vote result.
- Keep the loading treatment distinct from a zero state, but show it once only: “Calling back the Shadows…” until hydration completes.
- Remove build markers, hydration diagnostics, vote-state debug text, and developer copy from production.
- Let the world teach the A/B split. Counts and feedback should be compact, readable, and subordinate to the physical destinations and Shadows.

### Shadows and interaction

- Shadows are the visual hero: lightweight luminous silhouettes with a clear A/B tint, stable deterministic placement, and a soft arrival cue after an accepted vote.
- Design and test around a conservative **20 visible Shadows**. Historical tallies may exceed that number; render the newest bounded sample and preserve the full tally in state.
- Add only purposeful motion, sound, and microfeedback: choice commitment, Shadow arrival, and optional Resonance. Never delay movement or obscure the question.

### Product scope retained

The transformation must retain daily/rotating questions, persisted Memory Garden/history, live same-side/opposite-side feedback when available, final Shadow design, Resonate, audio/animation/microinteractions, deployment, deployed mobile QA, audit, README, and demo/submission materials. The current functional architecture and vote-safety invariants remain unchanged.

Exact production assets and implementation sequencing can now be chosen within this direction; they must preserve the verified spawn, explicit A/B identities, loading distinction, authoritative persistence, and 20-visible-Shadow budget.

## 2026-09-01 composition cleanup

The first post-design mobile review found a scattered composition and an overlay that sat too low. The focused correction centers the solid question landmark above the fork, keeps its rear opaque and blank, simplifies the garden frame to four corner trees and two entry lights, and gives A/B matched destination arches with distinct upward/ripple silhouettes. The top-center UI is now a lightweight companion: onboarding copy is safe in the upper margin and choice badges collapse after the player is armed or has voted. No world-space text was reintroduced, so the resolved mirrored-rear defect remains protected.
## 2026-09-01 decisive composition rebuild

The previous incremental layout was rejected as a collection of prototype objects. The presentation is now being rebuilt as one compact social plaza: a neutral south spawn, a front-facing question installation at the fork, matching A/B pavilions, simple colored paths, Shadows grouped inside each destination, and a quiet Memory Garden behind the landmark. The question installation uses generated front-only PNG surfaces for the rotating question and instructions, with an opaque blank rear. This avoids the mobile mirrored-text failure caused by the prior world-space text approach.

The production HUD now shows only hydration feedback, a short first-entry helper, compact post-vote results, and contextual Memory Garden or Resonance feedback. It no longer duplicates the board question or exposes developer state. The visual language follows Decentraland's official UX values: welcoming guidance, reactive feedback, minimalism, readable hierarchy, and environmental composition that teaches the route. Reference: https://docs.decentraland.org/creator/scenes-sdk7/designing-the-experience/ux-ui-guide.

The rebuild keeps the authoritative persistence, question rotation, A/B mappings, vote guards, live moments, Resonance, and 20-visible-Shadow budget unchanged. It is intentionally a first composition pass; the final Memory Garden detail, audio polish, and deployment validation remain after real-mobile visual review.

### Approved asset provenance

The Memory Garden accents use the small `message_booth.glb`, `core_art.glb`, and `stone.glb` models from the official Decentraland Genesis Plaza scene repository (`decentraland-scenes/Genesis-Plaza`, Apache-2.0). They are copied locally under `scene/assets/scene/genesis/` and kept intentionally lightweight for the 20-visible-Shadow mobile budget.

## 2026-09-01 true visual reset acceptance notes

The rejected 8030 shell is no longer the active composition. The reset removes its legacy board frame, floor glyphs, arrows/cones/posts, and permanent question HUD while leaving the invisible neutral/A/B/Memory Garden triggers and all authoritative logic unchanged.

The locked reset floor plan is:

- spawn at (8, 0, 1.5), camera target (8, 1.5, 6.35), facing north into the park;
- question landmark centered at (8, 3.15, 6.85) with a south-facing pre-rendered front surface and a separate opaque blank rear;
- open A and B installations at (4, 0.35, 11.35) and (12, 0.35, 11.35), preserving the explicit world-space zone identities;
- Memory Garden at (8, 0.8, 14.35), beyond the choice fork.

Production question and answer content is texture-backed and front-only; no TextShape is used for the question landmark. The world uses local, lightweight Genesis Plaza reference assets for the garden accents. The HUD is contextual and compact: it appears for hydration, first-entry guidance, vote results, Memory Garden, or Resonance feedback, rather than duplicating the question permanently.

## 8031 review correction and second reset

The 8031 mobile review failed. Its screenshots were visibly different but still showed an inverted question face, a persistent question-heavy HUD, and destination geometry that read as prototype scaffolding. That result is recorded as a failure; no visual-gate pass is inferred.

The follow-up reset removes the SDK primitive-plane sign path entirely. Question and A/B answer surfaces are now local glTF panels with an opaque, text-free landmark body and one-sided materials. Five question panels are pre-rendered and visibility-swapped for the finite question pool, so rotation does not reintroduce world-text or mirrored plane behavior. The top HUD now shows only one short first-entry hint for eight seconds, hydration feedback, compact post-vote results, or contextual Memory Garden/Resonance messages.

Destinations are simplified to two coherent shrines with one inlaid route band each: A uses an upward beacon silhouette and B uses low water-ring forms. Their readable front panels remain A / EXPLORE SPACE and B / DEEP OCEAN; the routes and invisible trigger identities are unchanged. The Memory Garden remains a separate rear area with its own base, kiosk, crystal, and stone grove.

## 8032 board micro-gate correction

The 8032 mobile review failed because the new one-sided front panel was placed behind the opaque board body. The glTF itself was valid, contained its PNG in an internal buffer view, used explicit POSITION/TEXCOORD_0 UVs, OPAQUE alpha, and a one-sided material, but the body occluded the panel from the spawn side. This is a placement/occlusion defect, not a persistence, cache, or mirrored-text defect.

A disposable board-only ECS7 scene now tests the exact panel technology with a south-facing spawn, one front question panel, a separate blank rear slab, and simple lighting. It contains no voting, Shadows, A/B logic, or Memory Garden. The production landmark uses the same panel technology with the front plane explicitly offset in front of the measured body depth. The next mobile micro-gate is limited to confirming FRONT readable and REAR blank/non-mirrored before any full-scene visual work resumes.


## 2026-09-05 production signage gate

The production signage integration is accepted on real Decentraland Mobile. The main question board, A destination sign, B destination sign, and Memory Garden plaque use the pinned-SDK plane/material pipeline that passed the control test. The board front is readable and its rear is physically blank/non-mirrored. No active production signage uses the retired custom-GLB or TextShape approach.


## 2026-09-05 bounded visual completion pass

Typography was strengthened for mobile legibility: brighter/heavier primary copy, larger question and answer labels, and reduced low-value small text. The environment now has a restrained central promenade, warm path lights, corner groves, lightweight tree silhouettes, and distinct but shared A/B destination gateways. Shadows use calmer translucent violet/cyan silhouettes with a soft halo, remaining within the 20-visible-Shadow production budget. This pass preserves the accepted signage plane pipeline and all verified gameplay/state behavior. Real-mobile UAT of the polish is pending on fresh preview 8049.


## 2026-09-06 first-time visitor spatial correction

The question landmark is now a rear backdrop rather than a barrier. A and B sit in the open foreground decision plaza, left and right of the direct spawn-to-choice paths, with their complete visual installations, trigger zones, and Shadow groups sharing the same coordinates. Memory Garden remains behind the decision loop as a secondary destination. The next mobile check is limited to the stationary spawn view: question comprehension, immediate A/B identification, and unobstructed routes.

## 2026-09-06 8051 signage/rear and Shadow-composition cleanup

The 8051 real-mobile UAT remains a failure: a secondary board silhouette appeared behind the question landmark, several readable signs exposed mirrored/inverted backs, and Shadows read as incidental geometry around signs/routes. This is recorded as a bounded composition issue, not a gameplay or signage-front failure.

The cleanup moves Memory Garden into a separate side pocket at the west/rear edge of the park; wraps A/B and Memory Garden readable SDK planes in opaque bodies with slightly oversized blank rear slabs; and places A/B Shadows in deterministic 6x5 side clusters beyond each destination plinth, outside the direct walking lanes. The accepted SDK-plane front pipeline, voting, persistence, A/B mapping, question state, Resonate, and SDK pins remain unchanged. A fresh mobile verification is required before normal-user vote UAT resumes; preview 8052 is now ready.


## 2026-09-06 8052 lateral composition correction

The 8052 real-mobile review confirmed clean sign rears and open A/B routes, but rejected the composition: Memory Garden still peeked into the main-board silhouette and Shadows read as a rear wall behind the destination signs. The correction keeps the signage pipeline and routes unchanged, moves Memory Garden farther west into a compact side pocket with a restrained path/light hint, and places each choice population laterally beside its destination using per-side spacing. A fresh real-mobile review is required before vote UAT resumes; isolated preview 8053 is ready.

## 2026-09-07 quiz-park pivot

SHADOW PARK now uses the question loop as the primary product hierarchy: read a curated trivia question, walk to A or B, receive a truthful correct/wrong result, advance the run, and leave a persistent Shadow Twin. The former Memory Garden language is retired from product copy in favor of **HALL OF SHADOWS**, a separate social-history area. Final UI work must keep the current prototype overlay lightweight: no permanent question duplication, no QA markers, and no developer vote-state text. Physical A/B destinations should carry the answer names and remain visually connected to the question landmark without narrowing the walking routes.
