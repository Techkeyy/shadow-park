import type { Choice } from './state.ts'

export type ZoneId = 'CHOICE_A_ZONE' | 'CHOICE_B_ZONE'

export type ChoiceZone = {
  id: ZoneId
  choice: Choice
  centerX: number
  centerY: number
  centerZ: number
  scaleX: number
  scaleY: number
  scaleZ: number
}

// The question landmark is the rear plaza backdrop. It has no collider, so
// the open A/B lanes remain unobstructed on mobile.
export const QUESTION_LANDMARK = {
  centerX: 8,
  centerY: 2.9,
  centerZ: 11.4,
  width: 6.2,
  height: 4.35,
  depth: 0.85
} as const

export const HALL_OF_SHADOWS_ZONE = {
  // The Hall is a rear-left side pocket. It is deliberately beyond the answer
  // loop so the social-history space reads as a destination, not as another
  // quiz prop beside A/B.
  centerX: 2.2,
  centerY: 0.8,
  centerZ: 13,
  scaleX: 4.8,
  scaleY: 2,
  scaleZ: 3.8
} as const

// Product-facing name for the same proven side-pocket footprint. The legacy
// export remains for migration and existing spatial regression coverage.
export const HOUSE_OF_MASTERS_ZONE = HALL_OF_SHADOWS_ZONE

// The player capsule reports its torso position, not the exact point where a
// phone user's feet appear on the pad. A small horizontal tolerance makes the
// capture footprint more forgiving than the visible pad while keeping a clear
// gap between A, B, and the neutral plaza.
export const ANSWER_CAPTURE_MARGIN = 0.45
export const ANSWER_CAPTURE_DEPTH_MARGIN = 0.25
export const CHOICE_SIGN_FRONT_OFFSET = 1.55

// Shadow positions are deliberately authored in world space rather than from
// camera-relative left/right assumptions. Four columns by four rows support the
// tested visible-count range while keeping every Shadow beside its destination.
export const SHADOW_GROUP_COLUMNS = [-2.3, -1.8, -1.3, -0.8] as const
export const SHADOW_GROUP_ROWS = [-1.8, -1.25, -0.7, -0.15] as const

export const DECISION_ROUTE_BOUNDS = {
  A: { minX: 2.88, maxX: 7.5, minZ: 5.27, maxZ: 8.51 },
  B: { minX: 8.5, maxX: 13.12, minZ: 5.27, maxZ: 8.51 }
} as const

// Stage 2 presentation layout. The board is intentionally front-left of the
// platform, rather than directly behind the avatar. The X-axis clearance keeps
// the avatar body and hair outside the board's rear slab while the whole
// platform remains south of the A/B decision routes.
export const PERSONAL_SHADOW_LAYOUT = {
  board: {
    centerX: 5.15,
    frontZ: 3.95,
    panelWidth: 1.5,
    panelHeight: 0.4,
    bodyWidth: 1.68,
    bodyDepth: 0.34,
    rearWidth: 1.84,
    rearDepth: 0.16,
    rearOffsetZ: 0.46
  },
  platform: {
    centerX: 7,
    centerZ: 4.35,
    width: 1.65,
    depth: 1.35
  },
  avatar: {
    centerX: 7,
    centerZ: 4.35,
    horizontalRadius: 0.45
  }
} as const

export function personalShadowBoardRightEdge(): number {
  return PERSONAL_SHADOW_LAYOUT.board.centerX + PERSONAL_SHADOW_LAYOUT.board.rearWidth / 2
}

export function personalShadowPlatformLeftEdge(): number {
  return PERSONAL_SHADOW_LAYOUT.platform.centerX - PERSONAL_SHADOW_LAYOUT.platform.width / 2
}

export function personalShadowMinimumVisualSeparation(): number {
  return PERSONAL_SHADOW_LAYOUT.avatar.centerX - PERSONAL_SHADOW_LAYOUT.avatar.horizontalRadius - personalShadowBoardRightEdge()
}

// Stable world-space identities. These are not camera-relative left/right.
// Every visual marker, trigger, tally, and Shadow placement uses these values.
export const CHOICE_A_ZONE: ChoiceZone = {
  id: 'CHOICE_A_ZONE',
  choice: 'A',
  centerX: 2.8,
  centerY: 0.15,
  centerZ: 6.8,
  scaleX: 4.4,
  scaleY: 2,
  scaleZ: 2.2
}

export const CHOICE_B_ZONE: ChoiceZone = {
  id: 'CHOICE_B_ZONE',
  choice: 'B',
  centerX: 13.2,
  centerY: 0.15,
  centerZ: 6.8,
  scaleX: 4.4,
  scaleY: 2,
  scaleZ: 2.2
}

export function zoneForChoice(choice: Choice): ChoiceZone {
  return choice === 'A' ? CHOICE_A_ZONE : CHOICE_B_ZONE
}

// The visible destination plinths use these same world-space extents. Keeping
// the footprint test independent of trigger-entry direction means a player can
// enter from any side and still choose the destination they are standing on.
export function isInsideChoiceFootprint(choice: Choice, x: number, z: number): boolean {
  const zone = zoneForChoice(choice)
  return (
    Math.abs(x - zone.centerX) <= zone.scaleX / 2 &&
    Math.abs(z - zone.centerZ) <= zone.scaleZ / 2
  )
}

export function choiceCaptureBounds(choice: Choice): { minX: number; maxX: number; minZ: number; maxZ: number } {
  const zone = zoneForChoice(choice)
  return {
    minX: zone.centerX - zone.scaleX / 2 - ANSWER_CAPTURE_MARGIN,
    maxX: zone.centerX + zone.scaleX / 2 + ANSWER_CAPTURE_MARGIN,
    minZ: zone.centerZ - zone.scaleZ / 2 - ANSWER_CAPTURE_DEPTH_MARGIN,
    maxZ: zone.centerZ + zone.scaleZ / 2 + ANSWER_CAPTURE_DEPTH_MARGIN
  }
}

export function isInsideChoiceCapture(choice: Choice, x: number, z: number): boolean {
  const bounds = choiceCaptureBounds(choice)
  return x >= bounds.minX && x <= bounds.maxX && z >= bounds.minZ && z <= bounds.maxZ
}

export function hallShadowGridForSlot(slot: number): { x: number; z: number } {
  const normalized = Math.max(0, slot) % 20
  const column = normalized % 4
  const row = Math.floor(normalized / 4)
  return {
    // Two staggered gallery rows remain readable at the tested 20-Shadow cap.
    x: HALL_OF_SHADOWS_ZONE.centerX + (column - 1.5) * 1.15 + (row % 2 === 0 ? -0.08 : 0.08),
    z: HALL_OF_SHADOWS_ZONE.centerZ - 1.48 + row * 0.76
  }
}

export function choiceForZone(zoneId: ZoneId): Choice {
  return zoneId === 'CHOICE_A_ZONE' ? 'A' : 'B'
}

export type ShadowBounds = {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
}

export function shadowBoundsForChoice(choice: Choice): ShadowBounds {
  const zone = zoneForChoice(choice)
  const side = choice === 'A' ? 1 : -1
  const xPositions = SHADOW_GROUP_COLUMNS.map((column) => zone.centerX + column * side)
  const zPositions = SHADOW_GROUP_ROWS.map((row) => zone.centerZ + row)
  return {
    minX: Math.min(...xPositions),
    maxX: Math.max(...xPositions),
    minZ: Math.min(...zPositions),
    maxZ: Math.max(...zPositions)
  }
}
