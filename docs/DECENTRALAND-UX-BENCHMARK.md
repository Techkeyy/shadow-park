# Decentraland UX benchmark

Reviewed 2026-09-08. This is a reference/source review, not a claim these scenes were played on this machine.

| Source | Useful principle | SHADOW PARK application |
|---|---|---|
| [Official UX/UI](https://docs.decentraland.org/creator/scenes-sdk7/designing-the-experience/ux-ui-guide) | Reactive input; minimal hierarchy; visual plus optional audio; mobile safe area | Immediate pending pulse, truthful server result, small safe-area feedback |
| [Design Games](https://docs.decentraland.org/creator/scenes-sdk7/designing-the-experience/design-games) | Visitors can leave/rejoin at any point; persistence and network latency matter | Recover transitions from authoritative state, never strand a run |
| [Team Hub SDK7](https://github.com/decentraland-scenes/teamhub-library) | Physical zone-based participation; presentation and activity control separated | Keep pad-based A/B input; do not import its survey/admin product |
| [Studios resources](https://studios.decentraland.org/resources) | Current SDK7 examples; distinguish from legacy SDK6 repository | Verify template versions before borrowing patterns |
| [Stream Studio](https://github.com/decentraland-scenes/stream-studio-template) | One primary screen and purposeful gathering space; static editor scene | Question dominates, secondary social area does not compete |
| [Spooky House](https://github.com/decentraland-scenes/Spooky-House-Template) | Coherent environment, restrained ambient sound and intentional interaction | Twilight identity, no scattered mechanic props |
| [Genesis Plaza](https://github.com/decentraland-scenes/Genesis-Plaza) | Purposeful landmarks and discoverable distinct interactions | Composition inspiration only; the linked legacy code is not the pinned SDK API authority |
| [Official sdk-skills](https://github.com/decentraland/sdk-skills) | Composite-first static authoring; inspect exact API; object lifecycle and optimization | Preserve verified dynamic SDK signage; inventory before any static migration |

## Compatibility proof

Installed pinned @dcl/js-runtime/apis.d.ts defines MovePlayerToResponse.success as boolean and describes interruption by movement. Existing client ignores this return value. Installed @dcl/react-ecs supports screenInset: interactable. No upgrade is required to use either.

## Still required

Eye-level rendered comparison and internal full-run walkthrough; full current template/composite visual inspection; mobile/avatar performance validation. Reference-reading is not rendered acceptance.
