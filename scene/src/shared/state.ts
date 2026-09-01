export type Choice = 'A' | 'B'

export type ShadowRecord = {
  id: string
  choice: Choice
  slot: number
  resonances: number
}

export type HistoricalQuestion = {
  questionId: string
  question: string
  choiceA: string
  choiceB: string
  countA: number
  countB: number
  updatedAt: string
}

export type CuratedQuestion = {
  question: string
  choiceA: string
  choiceB: string
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
  questionDate: string
  history: HistoricalQuestion[]
  updatedAt: string
}

// TEMPORARY isolated QA namespace for the 8007 mobile verification. Restore v1
// before any production deployment; no production state is being reset.
export const STATE_KEY = 'shadow-park/state/qa-8007'
export const MAX_PERSISTED_SHADOWS = 30
// Keep the full persisted history bounded separately from what the client renders.
// The mobile performance gate supports 20 visible Shadows with 30 as a QA ceiling.
export const MAX_VISIBLE_SHADOWS = 20

export const CURATED_QUESTIONS: CuratedQuestion[] = [
  {
    question: 'Would you rather explore space or the deep ocean?',
    choiceA: 'EXPLORE SPACE',
    choiceB: 'DEEP OCEAN'
  },
  {
    question: 'Would you rather remember every dream or every song?',
    choiceA: 'EVERY DREAM',
    choiceB: 'EVERY SONG'
  },
  {
    question: 'Would you rather find a hidden garden or a hidden library?',
    choiceA: 'HIDDEN GARDEN',
    choiceB: 'HIDDEN LIBRARY'
  },
  {
    question: 'Would you rather live beside a quiet lake or a windy hill?',
    choiceA: 'QUIET LAKE',
    choiceB: 'WINDY HILL'
  },
  {
    question: 'Would you rather send a message to the past or the future?',
    choiceA: 'THE PAST',
    choiceB: 'THE FUTURE'
  }
]

export function utcDateKey(now: Date): string {
  return now.toISOString().slice(0, 10)
}

function dayNumber(dateKey: string): number {
  return Math.floor(Date.parse(`${dateKey}T00:00:00.000Z`) / 86_400_000)
}

export function questionForDate(now: Date): CuratedQuestion & { questionId: string; questionDate: string } {
  const questionDate = utcDateKey(now)
  const index = ((dayNumber(questionDate) % CURATED_QUESTIONS.length) + CURATED_QUESTIONS.length) % CURATED_QUESTIONS.length
  return {
    ...CURATED_QUESTIONS[index],
    questionId: `${questionDate}-question-${index + 1}`,
    questionDate
  }
}

export function rotateQuestion(state: ParkState, now = new Date()): ParkState {
  const next = questionForDate(now)
  if (state.questionDate === next.questionDate && state.questionId === next.questionId) return state

  const previous: HistoricalQuestion = {
    questionId: state.questionId,
    question: state.question,
    choiceA: state.choiceA,
    choiceB: state.choiceB,
    countA: state.countA,
    countB: state.countB,
    updatedAt: state.updatedAt
  }

  return {
    ...state,
    ...next,
    countA: 0,
    countB: 0,
    shadows: [],
    history: [...state.history, previous].slice(-12),
    updatedAt: now.toISOString()
  }
}

export function createInitialState(now = new Date()): ParkState {
  const question = questionForDate(now)
  return {
    version: 1,
    questionId: question.questionId,
    question: question.question,
    choiceA: question.choiceA,
    choiceB: question.choiceB,
    countA: 0,
    countB: 0,
    shadows: [],
    questionDate: question.questionDate,
    history: [],
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

  if (typeof candidate.questionDate === 'string' && Array.isArray(candidate.history)) return candidate as ParkState
  return {
    ...(candidate as ParkState),
    questionDate: typeof candidate.questionDate === 'string' ? candidate.questionDate : '',
    history: Array.isArray(candidate.history) ? (candidate.history as HistoricalQuestion[]) : []
  }
}
