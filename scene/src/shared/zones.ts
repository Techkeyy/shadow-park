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

// The question landmark is the compact plaza anchor. It has no collider, so
// the open A/B lanes remain unobstructed on mobile.
export const QUESTION_LANDMARK = {
  centerX: 8,
  centerY: 2.9,
  centerZ: 6.85,
  width: 6.2,
  height: 4.35,
  depth: 0.85
} as const

export const MEMORY_GARDEN_ZONE = {
  centerX: 8,
  centerY: 0.8,
  centerZ: 14.35,
  scaleX: 5.2,
  scaleY: 2,
  scaleZ: 2.1
} as const

// Stable world-space identities. These are not camera-relative left/right.
// Every visual marker, trigger, tally, and Shadow placement uses these values.
export const CHOICE_A_ZONE: ChoiceZone = {
  id: 'CHOICE_A_ZONE',
  choice: 'A',
  centerX: 4,
  centerY: 0.15,
  centerZ: 11.35,
  // Leave a deliberate mobile-safe corridor between A and B. Trigger
  // colliders are narrower than the visible pavilion floors so diagonal
  // joystick drift cannot enter A while approaching B (or vice versa).
  scaleX: 4.4,
  scaleY: 2,
  scaleZ: 4.3
}

export const CHOICE_B_ZONE: ChoiceZone = {
  id: 'CHOICE_B_ZONE',
  choice: 'B',
  centerX: 12,
  centerY: 0.15,
  centerZ: 11.35,
  scaleX: 4.4,
  scaleY: 2,
  scaleZ: 4.3
}

export function zoneForChoice(choice: Choice): ChoiceZone {
  return choice === 'A' ? CHOICE_A_ZONE : CHOICE_B_ZONE
}

export function choiceForZone(zoneId: ZoneId): Choice {
  return zoneId === 'CHOICE_A_ZONE' ? 'A' : 'B'
}
