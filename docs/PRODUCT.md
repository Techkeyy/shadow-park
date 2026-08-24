# SHADOW PARK Product Source of Truth

Status: discovery and technical verification in progress.

## One sentence

SHADOW PARK helps a solo Decentraland visitor feel other people were here by turning one physical daily choice into a persistent human-shaped trace.

## Product promise

The Shadows are the product. The daily question is the reason visitors leave one.

## Problem and before/after

A visitor entering a quiet World alone normally experiences an empty room. SHADOW PARK makes earlier participation visible, so an empty live room still communicates real human presence.

Before: the visitor arrives alone and sees no social proof. After: the visitor immediately sees how earlier people divided, chooses by walking, and adds a visible Shadow for whoever comes next.

## Actors

| Actor | Provides or wants | Direct interaction |
| --- | --- | --- |
| Visitor | A quick, legible social choice | Yes |
| Past visitor | A stored vote and Shadow trace | Through their Shadow |
| Live visitor | Optional same-side or opposing presence | Yes, bonus only |
| Decentraland client | Movement, rendering, touch controls, identity | Yes |
| Authoritative scene server | Serializes votes and broadcasts shared state | No |
| Server Side Storage | Persists question, votes, Shadows, and Resonances | No |
| World owner/organizer | Grants collaborator deployment access | No |

## Primary journey

| Step | Visitor | System |
| --- | --- | --- |
| Arrive | Sees one question and two paths | Loads persisted state and renders Shadows |
| Understand | Reads A on the left and B on the right | Uses spatial layout and large labels |
| Act | Walks into one choice zone | Sends one vote request to the authoritative server |
| Feedback | Sees the tally and a new Shadow | Validates, persists, and broadcasts the committed state |
| Result | Understands that they joined earlier visitors | Keeps the Shadow for later sessions |
| Next | May approach a past Shadow to Resonate | Records and broadcasts a lightweight reaction |

## Magic moment and core loop

Magic moment: the visitor's vote becomes a new Shadow among traces left by people who are no longer online.

`Arrive -> choose by walking -> server commits once -> Shadow appears -> future visitor sees it`

## State and data

| Data | Scope | Creator | Persistence target | Privacy |
| --- | --- | --- | --- | --- |
| Daily question | World | Builder/rotation logic | Scene storage | Public |
| Counts | World | Authoritative vote handler | Scene storage | Public |
| Shadow record | World | Authoritative vote handler | Scene storage | Public, pseudonymous/minimized |
| Resonance record/count | World | Authoritative interaction handler | Scene storage | Public aggregate by default |
| Per-question summary | World | Rotation logic | Scene storage | Public |
| Live presence | Session | Decentraland comms | Ephemeral | Public in scene |

Wallet ownership is not required to vote. Guest participation must work. The MVP must not promise a guest a durable personal history.

## Technology necessity

| Technology | Classification | What breaks if removed |
| --- | --- | --- |
| Decentraland SDK/ECS | Load-bearing | No World, movement zones, rendering, or touch-compatible client |
| Authoritative scene server | Load-bearing | Concurrent clients can disagree and duplicate votes become easier |
| Server Side Storage | Load-bearing | Empty-room social traces vanish after restart |
| Registered room messages/synced state | Load-bearing | Active clients do not receive authoritative updates |
| Blockchain transactions/NFTs/tokens | Removed | Nothing in the product promise breaks |
| AI | Removed | Nothing in the product promise breaks |

## Trust model

Visitors trust the deployed scene code, Decentraland's authoritative runtime, and its Server Side Storage service to record and return votes honestly. The data is not an on-chain ballot and is not presented as immutable or trustless. The World owner can redeploy the scene. The server must validate a player's one-vote rule, but a guest identifier is not assumed to survive a new device or session.

## Load-bearing assumption

Decentraland's authoritative World runtime can persist scene-scoped JSON state across server restart and broadcast the resulting state to multiple clients. Verification requires an exact pinned SDK build, a write/read test, a server restart, a fresh read, and a second client observing the same result.

## MVP

Must have: daily question, two physical zones, one accepted vote per current player identity, tally, lightweight Shadow, server-side persistence, restart recovery, and solo clarity.

Useful next: Resonate, previous-question summary, lightweight live-player acknowledgement.

Future: richer Shadow reactions and a small Memory Garden.

## Non-goals

No tokens, NFTs, smart-contract voting, AI question generation, profiles, chat system, inventory, levels, quests, giant map, multiple modes, paid assets, or paid hosting.

## Competitive edge

The lane is asynchronous social presence. Most social Worlds become empty when concurrent attendance drops. SHADOW PARK turns prior attendance into the main visual material, so solitude is a designed state rather than a failure state. Its proof is not a leaderboard: it is walking into a quiet garden and immediately seeing a human distribution of earlier choices.

## Comprehension checks

1. If no one else is online, what is social? The persisted Shadows.
2. Is the question the product? No, it is the repeatable reason to leave a Shadow.
3. Why is authoritative persistence load-bearing? Without it, clients can disagree and the park becomes empty after restart.
4. Must a guest connect a wallet? No.
5. Is this an on-chain vote? No.
