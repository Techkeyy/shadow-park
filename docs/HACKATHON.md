# Friendzone Buildathon Source of Truth

Last checked: 2026-08-24.

Evidence labels used here:

- **OFFICIAL-DOC CONFIRMED**: stated by DoraHacks, Decentraland documentation, or an organizer-controlled Decentraland channel.
- **RUNTIME CONFIRMED**: personally exercised on this machine.
- **INFERRED**: reasonable conclusion not explicitly stated.
- **UNKNOWN**: not verified.

## Confirmed requirements

| Requirement | Status | Evidence |
| --- | --- | --- |
| Build a mobile-first social game, multiplayer experience, or hangout | OFFICIAL-DOC CONFIRMED | Friendzone DoraHacks listing and Regenesis Labs forum recap |
| Deploy in a Decentraland World | OFFICIAL-DOC CONFIRMED | Friendzone listing/organizer recap |
| Meaningful social interaction | OFFICIAL-DOC CONFIRMED | Friendzone submission requirements |
| Persistent standalone experience, no required event/host/moderator | OFFICIAL-DOC CONFIRMED | Friendzone submission requirements |
| Public during judging | OFFICIAL-DOC CONFIRMED | Friendzone submission requirements |
| Mobile/touch/small-screen design and testing | OFFICIAL-DOC CONFIRMED | Friendzone submission requirements |
| Public open-source GitHub repository | OFFICIAL-DOC CONFIRMED | Friendzone submission requirements |
| Submit through DoraHacks | OFFICIAL-DOC CONFIRMED | Friendzone submission requirements |
| Original, not reused in past Decentraland competitions | OFFICIAL-DOC CONFIRMED | Friendzone submission requirements |
| Build phase | OFFICIAL-DOC CONFIRMED | 2026-08-14 through 2026-09-04 |
| Judging | OFFICIAL-DOC CONFIRMED | 2026-09-05 through 2026-09-11 |
| Winner reveal | OFFICIAL-DOC CONFIRMED | 2026-09-13 |
| Exact submission cutoff time/timezone | UNKNOWN / NEEDS ORGANIZER CONFIRMATION | Public sources found specify September 4 but not an exact time/timezone |
| World access offered by organizers | USER-PROVIDED ORGANIZER MESSAGE | Do not purchase a NAME, LAND, MANA, World, hosting, or assets |

## Judging criteria

Organizer recap confirms focus on mobile-first design, social value, mobile UX, performance, creativity, retention, and overall execution. Exact criterion weights are **UNKNOWN / NEEDS ORGANIZER OR DORAHACKS CONFIRMATION**.

## Submission gates

- Working public World URL using organizer-granted access.
- Public GitHub repository.
- DoraHacks project submitted before the exact cutoff.
- Real mobile test evidence.
- Original assets/code or clearly licensed dependencies.
- No dependency on scheduled attendance.

## Ecosystem in plain language

Decentraland is a networked virtual world platform. Creators build TypeScript-driven 3D scenes with the SDK, preview them locally, and publish them to LAND or isolated Worlds. For SHADOW PARK, the platform supplies movement, avatars, mobile controls, identity, rendering, communications, a headless authoritative scene runtime, and server-side storage. The buildathon is asking creators to make short, return-worthy social experiences that work intentionally on mobile.

## Relevant stack

`Visitor -> Decentraland mobile/desktop client -> SDK 7 ECS scene -> authoritative headless scene server -> Server Side Storage -> shared state rendered back to visitors`

No custom blockchain contract, token, or paid product is required for the MVP.

## Sources

- DoraHacks event: https://dorahacks.io/hackathon/friendzone/detail
- Regenesis Labs forum recap: https://forum.decentraland.org/t/dcl-regenesis-labs-bi-weekly-community-meet-up/25052/18
- Decentraland CLI: https://docs.decentraland.org/creator/scenes-sdk7/getting-started/using-the-cli
- Mobile preview: https://docs.decentraland.org/creator/sdk7/building-for-mobile/preview-on-mobile
- Publishing: https://docs.decentraland.org/creator/scenes-sdk7/publishing/publishing
- World management/collaborators: https://github.com/decentraland/docs/blob/main/creator/scene-editor/publish/publish-scene.md
- Authoritative servers: https://docs.decentraland.org/creator/scenes-sdk7/networking/authoritative-servers
- Scene limits: https://github.com/decentraland/docs/blob/main/creator/sdk7/optimizing/scene-limitations.md
