export type Choice = 'A' | 'B'

export type ShadowRecord = {
  id: string
  choice: Choice
  slot: number
  resonances: number
}

export type ParkState = {
  version: 1
  questionId: string
  question: string
  choiceA: string
  choiceB: string
  countA: number
  countB: number
  shadows: ShadowRecord[]
  updatedAt: string
}

export const STATE_KEY = 'shadow-park/state/v1'
export const MAX_PERSISTED_SHADOWS = 30

export function createInitialState(now = new Date()): ParkState {
  return {
    version: 1,
    questionId: '2026-08-space-ocean',
    question: 'Would you rather explore space or the deep ocean?',
    choiceA: 'EXPLORE SPACE',
    choiceB: 'DEEP OCEAN',
    countA: 0,
    countB: 0,
    shadows: [],
    updatedAt: now.toISOString()
  }
}

export function isChoice(value: string): value is Choice {
  return value === 'A' || value === 'B'
}

export function applyVote(state: ParkState, choice: Choice, shadowId: string, now = new Date()): ParkState {
  const totalBefore = state.countA + state.countB
  const shadow: ShadowRecord = { id: shadowId, choice, slot: totalBefore, resonances: 0 }

  return {
    ...state,
    countA: state.countA + (choice === 'A' ? 1 : 0),
    countB: state.countB + (choice === 'B' ? 1 : 0),
    shadows: [...state.shadows, shadow].slice(-MAX_PERSISTED_SHADOWS),
    updatedAt: now.toISOString()
  }
}

export function parseState(value: unknown): ParkState | null {
  if (!value || typeof value !== 'object') return null
  const candidate = value as Partial<ParkState>

  if (
    candidate.version !== 1 ||
    typeof candidate.questionId !== 'string' ||
    typeof candidate.question !== 'string' ||
    typeof candidate.choiceA !== 'string' ||
    typeof candidate.choiceB !== 'string' ||
    typeof candidate.countA !== 'number' ||
    typeof candidate.countB !== 'number' ||
    !Array.isArray(candidate.shadows) ||
    typeof candidate.updatedAt !== 'string'
  ) {
    return null
  }

  return candidate as ParkState
}
