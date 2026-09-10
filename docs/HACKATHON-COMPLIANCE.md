# SHADOW PARK+�u���T Friendzone compliance record

This is an evidence record, not a submission claim. The pivot remains **24-hour product pivot"��y��y� building** until normal-user mobile UAT and deployment are complete.

## Official sources checked

- [Friendzone announcement and timeline](https://decentraland.beehiiv.com/p/a-new-way-to-shop-decentraland-is-here-1): build phase August 14September 4, 2026; submission deadline September 4; judging September 511; winner reveal September 13.
- [Decentraland Worlds](https://docs.decentraland.org/creator/worlds): Worlds are isolated spaces outside Genesis City; World ownership/name requirements apply.
- [Publish a Scene](https://docs.decentraland.org/creator/scene-editor/publish/publish-scene): World publishing, permissions, spawn position, and deployment stages.
- [SDK 7 publishing](https://docs.decentraland.org/creator/scenes-sdk7/publishing/publishing): `scene.json` World configuration, ACL/deploy permissions, and Places listing behavior.
- [Places FAQ](https://docs.decentraland.org/faqs/places): Place metadata comes from scene metadata; Worlds are discoverable subject to the documented World/NAME conditions.
- [NPC Avatars](https://docs.decentraland.org/creator/scenes-sdk7/interactivity/npc-avatars): supported `AvatarShape` fields and URN requirements.
- [User Data](https://docs.decentraland.org/creator/scenes-sdk7/interactivity/user-data): supported `getPlayer()` identity, base-avatar, wearable, and emote data.

## Current implementation alignment

- The scene continues to target a Decentraland World and retains preparation for `TheShire.dcl.eth`.
- Mobile is a primary target; the new loop uses the existing walk-to-answer triggers rather than answer buttons.
- Historical representation uses supported avatar snapshot fields and `AvatarShape`; it does not modify live wearables or mint NFTs.
- Places opt-out is not enabled in the current plan.
- No wallet transaction, token economy, NFT mint, or paid component is part of the pivot.

## Open evidence gates

- Clean first-time mobile UAT for the endless walk-to-answer journey, including
  repeated questions, Shadow progression, Master qualification, and House entry.
- Persistent completion/Shadow reconnect UAT on mobile.
- Public deployment to the organizer-authorized World, followed by deployed mobile QA.
- Public GitHub, README/audit, and DoraHacks submission materials.
