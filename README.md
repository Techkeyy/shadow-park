# SHADOW PARK

**Answer with your feet. Feed your Shadow. Become a Master.**

**[Play Live World](https://play.decentraland.org/?realm=TheShire.dcl.eth&position=0,0)** · **[GitHub Repository](https://github.com/Techkeyy/shadow-park)** · **[Decentraland Friendzone Hackathon](https://decentraland.beehiiv.com/p/a-new-way-to-shop-decentraland-is-here-1)**

SHADOW PARK is a mobile-first social quiz park built for Decentraland SDK7. Instead of clicking flat 2D buttons, players physically navigate the 3D world, stepping onto dedicated **A** or **B** answer pads to answer trivia questions.

Every correct answer feeds and evolves a persistent personal Shadow avatar, boosts your Shadow Score, and builds your Chain streak. Players who conquer 30 correct answers earn the rank of **MASTER** and secure an immortal place in the **House of Masters**, an asynchronous leaderboard of real Decentraland players.

---

## Why Shadow Park

Traditional metaverse trivia games rely on standard 2D pop-up UI windows and mouse clicks, reducing an immersive 3D world into a standard web quiz form.

SHADOW PARK transforms trivia into spatial gameplay:

- **Spatial interaction over UI clicks:** Players answer questions with their physical avatar movement, choosing direction A or B in real space.
- **Persistent visual identity:** Repeated play is rewarded by evolving a recognizable Personal Shadow avatar that grows as you master knowledge.
- **Asynchronous social competition:** The House of Masters preserves real player scores, streaks, and timestamps, creating a living monument to accomplished players without requiring everyone to be online simultaneously.
- **Engineered for mobile:** Built from the ground up for the Decentraland Mobile client, featuring high-contrast directional signage, automatic recentering, mobile-safe trigger volumes, and rock-solid ECS lifecycle safety.

```
       TRADITIONAL METAVERSE TRIVIA                 SHADOW PARK SPATIAL GAMEPLAY
   ┌───────────────────────────────────┐        ┌───────────────────────────────────┐
   │ Flat 2D Modal UI                  │   vs   │ Read Question on Monument         │
   │ Mouse click button A or B         │        │ Walk avatar onto Pad A or Pad B   │
   │ Ephemeral score resets on exit    │        │ Authoritative Server Verification │
   │ Isolated single-player experience │        │ Persistent Personal Shadow Evolves│
   └───────────────────────────────────┘        └───────────────────────────────────┘
```

---

## How It Works

```
  READ QUESTION ──> STEP ON A OR B ──> AUTHORITATIVE RESULT ──> SCORE & CHAIN
         │                                                            │
         └─────────────────── RECENTER <── SHADOW GROWS <─────────────┘
                                  │
                          NEXT QUESTION
                                  │
                     (30 Correct / 300 Score)
                                  │
                                  v
                        HOUSE OF MASTERS
```

1. **Read Question:** View the active trivia question on the central monument.
2. **Step on A or B:** Walk your avatar onto the physical pad corresponding to your choice.
3. **Authoritative Result:** The Decentraland authoritative multiplayer server evaluates the choice, emitting a clear visual and audio result (`+10` for correct, `+0` for wrong).
4. **Score & Chain:** Correct answers add +10 to lifetime Shadow Score and increment your Chain streak. Wrong answers reset the current Chain without deducting lifetime score.
5. **Shadow Grows:** Your Personal Shadow avatar reacts with an energy orb animation and permanently grows in scale.
6. **Recenter:** The scene smoothly recenters the player to the neutral entrance zone, re-arming the pads for the next question.
7. **House of Masters:** Reaching 30 correct answers (300 Shadow Score) inducts your avatar into the permanent House of Masters hall.

---

## Core Features

- **360 Curated Questions:** Hand-crafted, balanced questions across 10 categories (General, Science, Technology, Nature, Geography, History, Culture, Space, Everyday, and Sports).
- **Physical A/B Answer Pads:** Camera-independent spatial triggers with forgiving capture boundaries and entrance arming guards.
- **Authoritative Multiplayer Logic:** Server-authoritative validation prevents client tampering, double-scoring, or desync.
- **Persistent Personal Shadow:** Dynamic avatar representation that scales up from 0.90x to 1.30x as you progress through ranks.
- **No Demotions on Failure:** Wrong answers reset your active Chain streak but never reduce lifetime score or demote your unlocked rank.
- **House of Masters Registry:** Real leaderboard persisting up to 200 verified Masters, rendered in a dedicated park sanctuary. No fake or bot players.
- **Endless Progression:** Players can continue playing past Master to earn Master Stars (1 Star per 10 additional correct answers).
- **Mobile-First Sound and Visuals:** Atmospheric garden theme music (`shadow-garden-theme.mp3`), dedicated correct/wrong SFX, high-contrast typography, and readable sightlines.

---

## Rank and Evolution System

Progression is tracked authoritatively and persists across sessions via Decentraland Server Storage.

| Rank | Correct Answers | Shadow Score | Shadow Scale | Unlocks & Rewards |
|---|---|---|---|---|
| **DORMANT** | 0 | 0 | 0.90x | Initial park visitor |
| **AWAKENED** | 1 - 4 | 10 - 40 | 0.95x - 1.04x | Personal Shadow awakens |
| **SHADE** | 5 - 9 | 50 - 90 | 1.07x - 1.15x | Visible Shadow aura expansion |
| **WRAITH** | 10 - 17 | 100 - 170 | 1.17x - 1.22x | Intermediate mastery status |
| **ECLIPSE** | 18 - 29 | 180 - 290 | 1.23x - 1.29x | Pre-Master pinnacle |
| **MASTER** | 30+ | 300+ | 1.30x (Capped) | Permanent entry into House of Masters |

### Master Stars
After achieving **MASTER** rank, players can continue playing indefinitely. Every 10 additional correct answers awards **+1 Master Star** (`Math.floor((lifetimeCorrect - 30) / 10)`), displayed on the player HUD and in the House of Masters registry.

---

## House of Masters

The **House of Masters** is the asynchronous social center of Shadow Park:

- **Strict Qualification:** Only players with 30 lifetime correct answers (300+ Shadow Score) are recorded.
- **Truthful Historical Records:** No bots or synthetic entries are seeded into the leaderboard. Every entry represents a real player run.
- **Deterministic Ranking:** Masters are sorted by highest Shadow Score, then best streak, then earliest achievement timestamp.
- **Persistent Storage:** Master records and player run histories persist using Decentraland Server Storage (`Storage.get` / `Storage.set` and `Storage.player`).

---

## Architecture

SHADOW PARK runs on Decentraland SDK7 with authoritative server-side state evaluation.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      DECENTRALAND CLIENT (SDK7)                         │
│                                                                         │
│   ┌───────────────────┐  ┌───────────────────┐  ┌───────────────────┐   │
│   │   Vote Arming &   │  │   Presentation    │  │  Core Transition  │   │
│   │   Spatial Intent  │  │   & HUD System    │  │    & Recenter     │   │
│   └─────────┬─────────┘  └─────────▲─────────┘  └─────────▲─────────┘   │
└─────────────┼──────────────────────┼──────────────────────┼─────────────┘
              │ castVote             │ stateChanged         │ serverReady
              ▼                      │                      │
┌────────────────────────────────────┴──────────────────────┴─────────────┐
│                 AUTHORITATIVE MULTIPLAYER SERVER (SDK7)                 │
│                                                                         │
│   ┌───────────────────┐  ┌───────────────────┐  ┌───────────────────┐   │
│   │  Question Engine  │  │ State Validation  │  │  House of Masters │   │
│   │  (360 Questions)  │  │  & Mutation Queue │  │     Registry      │   │
│   └───────────────────┘  └─────────┬─────────┘  └───────────────────┘   │
│                                    │                                    │
│                                    ▼                                    │
│                      Decentraland Server Storage                        │
│                (Storage.player  /  Storage.set(STATE))                  │
└─────────────────────────────────────────────────────────────────────────┘
```

### Module Responsibilities

| Module | Job |
|---|---|
| `src/index.ts` | Entry point routing execution to client or authoritative server |
| `src/server/setup.ts` | Authoritative answer evaluation, mutation queue, room message handling, and storage |
| `src/client/setup.ts` | Scene initialization, environment geometry, park lighting, and audio source |
| `src/client/vote-intent.ts` | Player spatial trigger detection, choice debounce, and answer message emission |
| `src/client/vote-arming.ts` | Neutral zone arming and re-arming state machine |
| `src/client/recenter.ts` | Smooth post-answer player repositioning back to the neutral origin |
| `src/client/core-transition.ts` | Manages question transition timing and isolates feedback lifecycle |
| `src/client/presentation-v2.ts` | Personal Shadow avatar rendering, scaling model, and House of Masters display |
| `src/client/stage2-feedback.ts` | Energy orbs, visual trails, rank banners, and feedback pooling |
| `src/shared/question-bank.ts` | 360 validated trivia questions with category and difficulty metadata |
| `src/shared/state.ts` | Pure state transition functions, scoring math, and rank calculations |
| `src/shared/messages.ts` | Binary CRDT room message schema definitions |
| `src/shared/zones.ts` | World-space bounding coordinates for pads, signs, monuments, and spawn |

---

## Tech Stack

- **Decentraland SDK:** `@dcl/sdk` (7.26.1)
- **Decentraland Runtime:** `@dcl/js-runtime` (7.26.1)
- **Language:** TypeScript
- **Runtime Target:** Node.js 22+
- **Architecture:** ECS7 (Entity Component System) + Authoritative Server

---

## Project Structure

```
shadow-park/
├── docs/                        # Architecture, compliance, and design records
├── scene/
│   ├── assets/
│   │   ├── genesis/             # 3D monuments and park landmarks
│   │   ├── scene/               # Background theme audio and textures
│   │   └── signs/               # Pre-rendered question board textures
│   ├── scripts/
│   │   ├── doctor.mjs           # Project health and configuration check
│   │   └── run-integration-tests.mjs  # Multi-client authoritative integration runner
│   ├── src/
│   │   ├── client/              # Client presentation, input, and recenter logic
│   │   ├── server/              # Authoritative server logic and storage
│   │   ├── shared/              # Shared question bank, schemas, and state logic
│   │   └── index.ts             # Main entry point
│   ├── tests/                   # 70 automated unit, state, and spatial tests
│   ├── package.json             # Scene dependencies and scripts
│   ├── scene.json               # Decentraland World configuration and spawn metadata
│   └── tsconfig.json            # TypeScript compiler configuration
├── .gitignore                   # Repository exclusion rules
└── README.md                    # Project documentation
```

---

## Quickstart

Run the project locally using the Decentraland SDK:

```bash
# 1. Clone the repository
git clone https://github.com/Techkeyy/shadow-park.git
cd shadow-park/scene

# 2. Install dependencies
npm install

# 3. Run project diagnostics
npm run doctor

# 4. Start local Decentraland preview
npm start
```

---

## Testing & Verification

The project includes an automated test suite verifying state machines, scoring algorithms, question deck validity, and spatial trigger mappings.

```bash
cd scene
npm test
```

### Test Coverage (70/70 Pass)

- **State Transitions (`tests/state.test.ts`):** Verifies score updates, streak mechanics, deck cycling, rank thresholds, and duplicate prevention.
- **Spatial Zone Mapping (`tests/zone-mapping.test.ts`):** Confirms coordinate bounds for Choice A, Choice B, and the central neutral corridor.
- **Vote Arming & Intent (`tests/vote-intent.test.ts`):** Tests entry triggers, double-vote protection, and transition state guards.
- **Spawn Configuration (`tests/spawn-config.test.ts`):** Verifies spawn coordinates, sightlines, and monument offsets.
- **Core Transition & Recenter (`tests/core-transition.test.ts`):** Tests recenter helper resilience and isolated error boundaries.
- **Stage 2 Feedback & Growth (`tests/stage2.test.ts`):** Validates Shadow scaling math, feedback entity pooling, and audio failure safety.

```bash
# Run multi-client authoritative server integration tests
npm run test:integration
```

---

## How We Tested & Broke It (Adversarial Verification)

To guarantee stability on the physical Decentraland Mobile client, we tested edge cases and adversarial scenarios:

| Scenario / Edge Case | Expected Behavior | Verification Result |
|---|---|---|
| **Spawn directly inside Pad A** | Disarmed on spawn; must visit neutral zone before vote arms | PASS: Zero rogue votes emitted |
| **Rapid double-step across A & B** | Client transition guard locks immediately on first step | PASS: Exactly one vote processed |
| **Player disconnected mid-answer** | State persists in server storage; reconnect restores progress | PASS: Resumes on exact question |
| **Lagging move promise during recenter** | Recenter helper uses timeout fallback; never hangs | PASS: Game loop advances cleanly |
| **Audio failure on restricted client** | Audio playback error isolated; gameplay proceeds | PASS: Core loop never blocked |
| **30+ consecutive answers in one session** | Entity pool remains bounded; no ECS entity leaks | PASS: Stable memory footprint |

---

## Production Deployment

- **Decentraland World:** `TheShire.dcl.eth`
- **Live World URL:** [https://play.decentraland.org/?realm=TheShire.dcl.eth&position=0,0](https://play.decentraland.org/?realm=TheShire.dcl.eth&position=0,0)
- **Target Coordinates:** Parcel `0,0`

---

## Mobile-First Design

1. **Walk-to-Answer:** Large physical pads eliminate tiny mobile screen button taps.
2. **High-Contrast Monument:** Question text and answers are readable from anywhere in the park plaza.
3. **Dedicated Result Feedback:** Large, immediate feedback cards show `CORRECT +10` or `WRONG +0`.
4. **Smooth Recenter:** Automatically repositions the player after each question, keeping the game loop fluid on touch controls.
5. **Entity Lifecycle Safety:** Frame-safe ECS architecture tested against physical mobile device runs.

---

## Attribution & Assets

- **Background Music:** `CC0 - Mystery` by **PolygonDan** (Licensed under Creative Commons CC0 / Public Domain via [OpenGameArt](https://opengameart.org/content/cc0-mystery)).
- **Sound Effects:** Custom authored audio chimes and cues (`shadow-correct.wav`, `shadow-wrong.wav`, `shadow-master.wav`, `shadow-rank.wav`).
- **3D Environment:** Designed and constructed with Decentraland SDK7 core primitives and lightweight GLB park landmarks.

---

## Author

Created by **Techkeyy** for the Decentraland Friendzone Hackathon.

- **GitHub:** [https://github.com/Techkeyy](https://github.com/Techkeyy)
