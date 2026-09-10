import { QUESTION_BANK, QUESTION_BANK_VERSION, type BankQuestion, type QuestionCategory, type QuestionDifficulty } from './question-bank.ts'

export type Choice = 'A' | 'B'
export type QuizQuestion = BankQuestion

export type CuratedQuestion = {
  question: string
  choiceA: string
  choiceB: string
  correctSide?: Choice
}

export type AvatarSnapshot = {
  userId?: string
  displayName?: string
  bodyShapeUrn?: string
  wearableUrns?: string[]
  emoteUrns?: string[]
  skinColor?: [number, number, number]
  eyeColor?: [number, number, number]
  hairColor?: [number, number, number]
}

export type ShadowRank = 'DORMANT' | 'AWAKENED' | 'SHADE' | 'WRAITH' | 'ECLIPSE' | 'MASTER'

export type ShadowRecord = {
  id: string
  choice: Choice
  slot: number
  resonances: number
  playerId?: string
  displayName?: string
  avatar?: AvatarSnapshot
  score?: number
  shadowScore?: number
  lifetimeCorrect?: number
  bestStreak?: number
  shadowRank?: ShadowRank
  masterStars?: number
  shadowLevel?: number
  completedAt?: string
  masteredAt?: string
  houseRank?: number
}

export type HouseMasterRecord = ShadowRecord & {
  playerId: string
  shadowScore: number
  lifetimeCorrect: number
  bestStreak: number
  shadowRank: 'MASTER'
  masterStars: number
  updatedAt: string
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

export type LastAnswer = {
  questionId: string
  choice: Choice
  correct: boolean
  correctAnswer: string
}

export type QuestionDisplayMapping = {
  questionId: string
  choiceA: string
  choiceB: string
  correctSide: Choice
}

export type PlayerRun = {
  runId: string
  questionIds: string[]
  currentQuestionIndex: number
  currentQuestionId: string
  questionDeckVersion: string
  questionCycle: number
  questionCursor: number
  score: number
  shadowScore: number
  lifetimeAnswered: number
  lifetimeCorrect: number
  currentStreak: number
  bestStreak: number
  shadowRank: ShadowRank
  masterStars: number
  masteredAt?: string
  houseRank?: number
  correctCount: number
  answeredQuestionIds: string[]
  shadowLevel: number
  completed: false
  lastChoice?: Choice
  lastAnswer?: LastAnswer
  appearanceSnapshot?: AvatarSnapshot
  currentDisplay?: QuestionDisplayMapping
  completedAt?: string
  updatedAt: string
}

export type ParkState = {
  version: 1 | 2 | 3
  questionId: string
  question: string
  choiceA: string
  choiceB: string
  countA: number
  countB: number
  shadows: ShadowRecord[]
  houseMasters: HouseMasterRecord[]
  questionDate: string
  history: HistoricalQuestion[]
  updatedAt: string
  quizId?: string
  totalCompletions?: number
  totalPlayers?: number
  run?: PlayerRun
}

export const STATE_KEY = 'shadow-park/state/quiz-park-v1'
export const RUN_KEY_PREFIX = 'shadow-park/run/quiz-v1/'
export const AVATAR_KEY_PREFIX = 'shadow-park/avatar/quiz-v1/'
export const MAX_PERSISTED_SHADOWS = 30
export const MAX_VISIBLE_SHADOWS = 20
export const MAX_PERSISTED_HOUSE_MASTERS = 200
export const QUIZ_ID = 'shadow-park-quiz-v2-endless'

export const QUIZ_QUESTIONS: QuizQuestion[] = QUESTION_BANK
export const CURATED_QUESTIONS: CuratedQuestion[] = QUIZ_QUESTIONS.map((question) => ({
  question: question.questionText,
  choiceA: question.answerA,
  choiceB: question.answerB,
  correctSide: question.correctSide
}))

export { QUESTION_BANK_VERSION }
export type { QuestionCategory, QuestionDifficulty }

export function isChoice(value: string): value is Choice {
  return value === 'A' || value === 'B'
}

export function questionById(questionId: string): QuizQuestion | undefined {
  return QUIZ_QUESTIONS.find((question) => question.questionId === questionId)
}

function hash(value: string): number {
  let result = 2166136261
  for (const character of value) result = Math.imul(result ^ character.charCodeAt(0), 16777619)
  return result >>> 0
}

function questionOrderFor(playerId: string, cycle: number, previousQuestionId?: string): string[] {
  const order = QUIZ_QUESTIONS
    .map((question) => ({ id: question.questionId, sort: hash(`${playerId}:${QUIZ_ID}:${QUESTION_BANK_VERSION}:${cycle}:${question.questionId}`) }))
    .sort((left, right) => left.sort - right.sort)
    .map(({ id }) => id)
  if (previousQuestionId && order.length > 1 && order[0] === previousQuestionId) [order[0], order[1]] = [order[1], order[0]]
  return order
}


export function displaySideScheduleFor(playerId: string, cycle: number, questionIds: string[] = QUIZ_QUESTIONS.map((question) => question.questionId)): Choice[] {
  let countA = 0
  let countB = 0
  let previous: Choice | null = null
  let runLength = 0
  return questionIds.map((questionId, index) => {
    const preferred: Choice = hash(playerId + ':' + QUIZ_ID + ':' + QUESTION_BANK_VERSION + ':display:' + cycle + ':' + index + ':' + questionId) % 2 === 0 ? 'A' : 'B'
    let side = preferred
    if (previous && runLength >= 2) side = previous === 'A' ? 'B' : 'A'
    else if (countA > countB) side = 'B'
    else if (countB > countA) side = 'A'
    else if (index === 2 && previous) side = previous
    if (side === 'A') countA += 1
    else countB += 1
    runLength = side === previous ? runLength + 1 : 1
    previous = side
    return side
  })
}

function computedDisplayMappingForRun(run: PlayerRun): QuestionDisplayMapping {
  const canonical = questionById(run.currentQuestionId) ?? QUIZ_QUESTIONS[0]
  const schedule = displaySideScheduleFor(run.runId, run.questionCycle, run.questionIds)
  const currentIndex = Math.max(0, run.questionIds.findIndex((questionId) => questionId === canonical.questionId))
  const correctSide = schedule[currentIndex] ?? 'A'
  return {
    questionId: canonical.questionId,
    choiceA: correctSide === 'A' ? canonical.answerA : canonical.answerB,
    choiceB: correctSide === 'A' ? canonical.answerB : canonical.answerA,
    correctSide
  }
}

function validDisplayMapping(value: unknown, questionId: string): value is QuestionDisplayMapping {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<QuestionDisplayMapping>
  return candidate.questionId === questionId && typeof candidate.choiceA === 'string' && typeof candidate.choiceB === 'string' && candidate.choiceA !== candidate.choiceB && isChoice(candidate.correctSide ?? '')
}

export function displayMappingForRun(run: PlayerRun): QuestionDisplayMapping {
  return validDisplayMapping(run.currentDisplay, run.currentQuestionId) ? run.currentDisplay : computedDisplayMappingForRun(run)
}

export function displayedQuestionForRun(run: PlayerRun): QuizQuestion | undefined {
  const canonical = questionById(run.currentQuestionId) ?? questionById(run.questionIds[run.currentQuestionIndex])
  if (!canonical) return undefined
  const mapping = displayMappingForRun(run)
  return { ...canonical, answerA: mapping.choiceA, answerB: mapping.choiceB, correctSide: mapping.correctSide }
}
export function rankForLifetimeCorrect(correctCount: number): ShadowRank {
  if (correctCount >= 30) return 'MASTER'
  if (correctCount >= 18) return 'ECLIPSE'
  if (correctCount >= 10) return 'WRAITH'
  if (correctCount >= 5) return 'SHADE'
  if (correctCount >= 1) return 'AWAKENED'
  return 'DORMANT'
}

export function masterStarsForLifetimeCorrect(correctCount: number): number {
  return correctCount < 30 ? 0 : Math.floor((correctCount - 30) / 10)
}

export function shadowLevelForCorrectCount(correctCount: number): number {
  return Math.max(0, Math.min(5, correctCount >= 30 ? 5 : correctCount >= 18 ? 4 : correctCount >= 10 ? 3 : correctCount >= 5 ? 2 : correctCount >= 1 ? 1 : 0))
}

export function milestoneBonus(streak: number): number {
  if (streak === 5) return 20
  if (streak === 10) return 50
  if (streak >= 20 && streak % 10 === 0) return 100
  if (streak > 10 && streak % 10 === 0) return 50
  return 0
}

export function createRunForPlayer(playerId: string, now = new Date()): PlayerRun {
  const questionIds = questionOrderFor(playerId, 0)
  const currentQuestionId = questionIds[0] ?? QUIZ_QUESTIONS[0].questionId
  const run: PlayerRun = {
    runId: `${QUIZ_ID}:${playerId}`,
    questionIds,
    currentQuestionIndex: 0,
    currentQuestionId,
    questionDeckVersion: QUESTION_BANK_VERSION,
    questionCycle: 0,
    questionCursor: 0,
    score: 0,
    shadowScore: 0,
    lifetimeAnswered: 0,
    lifetimeCorrect: 0,
    currentStreak: 0,
    bestStreak: 0,
    shadowRank: 'DORMANT',
    masterStars: 0,
    correctCount: 0,
    answeredQuestionIds: [],
    shadowLevel: 0,
    completed: false,
    updatedAt: now.toISOString()
  }
  run.currentDisplay = displayMappingForRun(run)
  return run
}

export function currentQuestionForRun(run: PlayerRun): QuizQuestion | undefined {
  return displayedQuestionForRun(run)
}

export type AnswerResult = {
  correct: boolean
  correctAnswer: string
  nextQuestion?: QuizQuestion
  run: PlayerRun
  milestoneBonus: number
  chainLost: boolean
  shadowAwakened: boolean
  becameMaster: boolean
  masterStarAwarded: boolean
  previousRank: ShadowRank
}

export function answerQuestion(run: PlayerRun, question: QuizQuestion, choice: Choice, now = new Date()): AnswerResult {
  const correctAnswer = question.correctSide === 'A' ? question.answerA : question.answerB
  if (run.currentQuestionId !== question.questionId || run.answeredQuestionIds.includes(question.questionId)) {
    return { correct: false, correctAnswer, run, milestoneBonus: 0, chainLost: false, shadowAwakened: false, becameMaster: false, masterStarAwarded: false, previousRank: run.shadowRank }
  }
  const correct = choice === question.correctSide
  const previousRank = run.shadowRank
  const previousStars = run.masterStars
  const currentStreak = correct ? run.currentStreak + 1 : 0
  const bonus = correct ? milestoneBonus(currentStreak) : 0
  const lifetimeCorrect = run.lifetimeCorrect + (correct ? 1 : 0)
  const nextCycle = run.questionCursor + 1 >= run.questionIds.length ? run.questionCycle + 1 : run.questionCycle
  const nextCursor = run.questionCursor + 1 >= run.questionIds.length ? 0 : run.questionCursor + 1
  const nextOrder = nextCycle !== run.questionCycle ? questionOrderFor(run.runId, nextCycle, question.questionId) : run.questionIds
  const nextQuestionId = nextOrder[nextCursor] ?? QUIZ_QUESTIONS[0].questionId
  const nextRank = rankForLifetimeCorrect(lifetimeCorrect)
  const nextStars = masterStarsForLifetimeCorrect(lifetimeCorrect)
  const nextRun: PlayerRun = {
    ...run,
    questionIds: nextOrder,
    currentQuestionIndex: nextCursor,
    currentQuestionId: nextQuestionId,
    questionDeckVersion: QUESTION_BANK_VERSION,
    questionCycle: nextCycle,
    questionCursor: nextCursor,
    score: run.shadowScore + (correct ? 10 + bonus : 0),
    shadowScore: run.shadowScore + (correct ? 10 + bonus : 0),
    lifetimeAnswered: run.lifetimeAnswered + 1,
    lifetimeCorrect,
    currentStreak,
    bestStreak: Math.max(run.bestStreak, currentStreak),
    shadowRank: nextRank,
    masterStars: nextStars,
    masteredAt: nextRank === 'MASTER' && run.masteredAt === undefined ? now.toISOString() : run.masteredAt,
    correctCount: lifetimeCorrect,
    answeredQuestionIds: [...run.answeredQuestionIds.slice(-49), question.questionId],
    shadowLevel: shadowLevelForCorrectCount(lifetimeCorrect),
    completed: false,
    lastChoice: choice,
    lastAnswer: { questionId: question.questionId, choice, correct, correctAnswer },
    appearanceSnapshot: run.appearanceSnapshot,
    currentDisplay: undefined,
    updatedAt: now.toISOString()
  }
  nextRun.currentDisplay = displayMappingForRun(nextRun)
  return {
    correct,
    correctAnswer,
    nextQuestion: currentQuestionForRun(nextRun),
    run: nextRun,
    milestoneBonus: bonus,
    chainLost: !correct && run.currentStreak > 0,
    shadowAwakened: run.lifetimeCorrect === 0 && correct,
    becameMaster: previousRank !== 'MASTER' && nextRank === 'MASTER',
    masterStarAwarded: nextStars > previousStars,
    previousRank
  }
}

export function createInitialState(now = new Date()): ParkState {
  const question = QUIZ_QUESTIONS[0]
  return {
    version: 3,
    quizId: QUIZ_ID,
    questionId: question.questionId,
    question: question.questionText,
    choiceA: question.answerA,
    choiceB: question.answerB,
    countA: 0,
    countB: 0,
    shadows: [],
    houseMasters: [],
    questionDate: utcDateKey(now),
    history: [],
    totalCompletions: 0,
    totalPlayers: 0,
    updatedAt: now.toISOString()
  }
}

export function createClientState(state: ParkState, run: PlayerRun): ParkState {
  const question = currentQuestionForRun(run) ?? QUIZ_QUESTIONS[0]
  return { ...state, version: 3, questionId: question.questionId, question: question.questionText, choiceA: question.answerA, choiceB: question.answerB, run }
}

function upsertHouseMaster(state: ParkState, run: PlayerRun, playerId: string, now: Date, avatar?: AvatarSnapshot): HouseMasterRecord[] {
  if (run.shadowRank !== 'MASTER') return state.houseMasters ?? []
  const existing = (state.houseMasters ?? []).filter((record) => record.playerId !== playerId)
  const record: HouseMasterRecord = {
    id: `master-${playerId}`,
    playerId,
    displayName: avatar?.displayName ?? run.appearanceSnapshot?.displayName,
    avatar: avatar ?? run.appearanceSnapshot,
    choice: run.lastChoice ?? 'A',
    slot: 0,
    resonances: 0,
    score: run.shadowScore,
    shadowScore: run.shadowScore,
    lifetimeCorrect: run.lifetimeCorrect,
    bestStreak: run.bestStreak,
    shadowRank: 'MASTER',
    masterStars: run.masterStars,
    shadowLevel: run.shadowLevel,
    masteredAt: run.masteredAt,
    updatedAt: now.toISOString()
  }
  return [...existing, record]
    .sort((left, right) => (right.shadowScore - left.shadowScore) || (right.bestStreak - left.bestStreak) || String(left.masteredAt ?? '').localeCompare(String(right.masteredAt ?? '')))
    .slice(0, MAX_PERSISTED_HOUSE_MASTERS)
    .map((entry, index) => ({ ...entry, slot: index, houseRank: index + 1 }))
}

export function applyQuizAnswer(state: ParkState, run: PlayerRun, choice: Choice, playerId: string, now = new Date(), avatar?: AvatarSnapshot): AnswerResult & { state: ParkState } {
  const question = currentQuestionForRun(run) ?? QUIZ_QUESTIONS[0]
  const result = answerQuestion(run, question, choice, now)
  if (result.run === run) return { ...result, state }
  const houseMasters = upsertHouseMaster(state, { ...result.run, appearanceSnapshot: avatar ?? result.run.appearanceSnapshot }, playerId, now, avatar)
  result.run.houseRank = houseMasters.find((record) => record.playerId === playerId)?.houseRank
  const nextState: ParkState = {
    ...state,
    version: 3,
    countA: state.countA + (choice === 'A' ? 1 : 0),
    countB: state.countB + (choice === 'B' ? 1 : 0),
    totalPlayers: (state.totalPlayers ?? 0) + (run.lifetimeAnswered === 0 ? 1 : 0),
    houseMasters,
    shadows: houseMasters,
    totalCompletions: state.totalCompletions ?? 0,
    updatedAt: now.toISOString()
  }
  result.run.appearanceSnapshot = avatar ?? result.run.appearanceSnapshot
  return { ...result, state: nextState }
}

export function utcDateKey(now: Date): string {
  return now.toISOString().slice(0, 10)
}

function dayNumber(dateKey: string): number {
  return Math.floor(Date.parse(`${dateKey}T00:00:00.000Z`) / 86_400_000)
}

export function questionForDate(now: Date): CuratedQuestion & { questionId: string; questionDate: string } {
  const questionDate = utcDateKey(now)
  const index = ((dayNumber(questionDate) % CURATED_QUESTIONS.length) + CURATED_QUESTIONS.length) % CURATED_QUESTIONS.length
  return { ...CURATED_QUESTIONS[index], questionId: `${questionDate}-question-${index + 1}`, questionDate }
}

export function rotateQuestion(state: ParkState, now = new Date()): ParkState {
  if (state.version >= 2) return state
  const next = questionForDate(now)
  if (state.questionDate === next.questionDate && state.questionId === next.questionId) return state
  const previous: HistoricalQuestion = { questionId: state.questionId, question: state.question, choiceA: state.choiceA, choiceB: state.choiceB, countA: state.countA, countB: state.countB, updatedAt: state.updatedAt }
  return { ...state, ...next, version: 3, countA: 0, countB: 0, shadows: [], houseMasters: [], history: [...state.history, previous].slice(-12), updatedAt: now.toISOString() }
}

export function applyVote(state: ParkState, choice: Choice, shadowId: string, now = new Date()): ParkState {
  const totalBefore = state.countA + state.countB
  const shadow: ShadowRecord = { id: shadowId, choice, slot: totalBefore, resonances: 0 }
  const shadows = [...state.shadows, shadow].slice(-MAX_PERSISTED_SHADOWS)
  return { ...state, shadows, houseMasters: state.houseMasters ?? [], countA: state.countA + (choice === 'A' ? 1 : 0), countB: state.countB + (choice === 'B' ? 1 : 0), updatedAt: now.toISOString() }
}

function parseRun(value: unknown): PlayerRun | null {
  if (!value || typeof value !== 'object') return null
  const candidate = value as Partial<PlayerRun> & { runId?: string }
  if (typeof candidate.runId !== 'string') return null
  const playerId = candidate.runId.split(':').slice(-1)[0] || 'returning-player'
  const migrated = createRunForPlayer(playerId)
  if (Array.isArray(candidate.questionIds) && candidate.questionIds.some((id) => questionById(id))) {
    migrated.questionIds = candidate.questionIds.filter((id): id is string => typeof id === 'string' && Boolean(questionById(id)))
  }
  const answeredQuestionIds = Array.isArray(candidate.answeredQuestionIds) ? candidate.answeredQuestionIds.filter((id): id is string => typeof id === 'string') : []
  const lifetimeCorrect = typeof candidate.lifetimeCorrect === 'number' ? candidate.lifetimeCorrect : typeof candidate.correctCount === 'number' ? candidate.correctCount : 0
  const lifetimeAnswered = typeof candidate.lifetimeAnswered === 'number' ? candidate.lifetimeAnswered : answeredQuestionIds.length
  const currentQuestionId = typeof candidate.currentQuestionId === 'string' && questionById(candidate.currentQuestionId) ? candidate.currentQuestionId : migrated.questionIds[Math.min(typeof candidate.currentQuestionIndex === 'number' ? candidate.currentQuestionIndex : 0, migrated.questionIds.length - 1)]
  const run: PlayerRun = {
    ...migrated,
    ...candidate,
    questionIds: migrated.questionIds,
    currentQuestionId: currentQuestionId ?? migrated.currentQuestionId,
    currentQuestionIndex: typeof candidate.currentQuestionIndex === 'number' ? Math.max(0, candidate.currentQuestionIndex) : 0,
    questionDeckVersion: QUESTION_BANK_VERSION,
    questionCycle: typeof candidate.questionCycle === 'number' ? candidate.questionCycle : 0,
    questionCursor: typeof candidate.questionCursor === 'number' ? candidate.questionCursor : 0,
    score: typeof candidate.shadowScore === 'number' ? candidate.shadowScore : typeof candidate.score === 'number' ? candidate.score : 0,
    shadowScore: typeof candidate.shadowScore === 'number' ? candidate.shadowScore : typeof candidate.score === 'number' ? candidate.score : 0,
    lifetimeAnswered,
    lifetimeCorrect,
    currentStreak: typeof candidate.currentStreak === 'number' ? candidate.currentStreak : 0,
    bestStreak: typeof candidate.bestStreak === 'number' ? candidate.bestStreak : 0,
    shadowRank: typeof candidate.shadowRank === 'string' ? candidate.shadowRank as ShadowRank : rankForLifetimeCorrect(lifetimeCorrect),
    masterStars: typeof candidate.masterStars === 'number' ? candidate.masterStars : masterStarsForLifetimeCorrect(lifetimeCorrect),
    correctCount: lifetimeCorrect,
    answeredQuestionIds,
    shadowLevel: typeof candidate.shadowLevel === 'number' ? candidate.shadowLevel : shadowLevelForCorrectCount(lifetimeCorrect),
    completed: false,
    currentDisplay: undefined,
    updatedAt: typeof candidate.updatedAt === 'string' ? candidate.updatedAt : new Date().toISOString()
  }
  run.currentDisplay = validDisplayMapping(candidate.currentDisplay, run.currentQuestionId) ? candidate.currentDisplay : displayMappingForRun(run)
  return run
}

export function parseState(value: unknown): ParkState | null {
  if (!value || typeof value !== 'object') return null
  const candidate = value as Partial<ParkState>
  if ((candidate.version !== 1 && candidate.version !== 2 && candidate.version !== 3) || typeof candidate.questionId !== 'string' || typeof candidate.question !== 'string' || typeof candidate.choiceA !== 'string' || typeof candidate.choiceB !== 'string' || typeof candidate.countA !== 'number' || typeof candidate.countB !== 'number' || !Array.isArray(candidate.shadows) || typeof candidate.updatedAt !== 'string') return null
  const houses = Array.isArray(candidate.houseMasters)
    ? candidate.houseMasters
    : candidate.version === 3
      ? []
      : (candidate.shadows as ShadowRecord[]).filter((shadow) => shadow.shadowRank === 'MASTER')
  const parsed: ParkState = {
    ...(candidate as ParkState),
    version: 3,
    questionDate: typeof candidate.questionDate === 'string' ? candidate.questionDate : '',
    history: Array.isArray(candidate.history) ? candidate.history as HistoricalQuestion[] : [],
    shadows: (candidate.shadows as ShadowRecord[]).slice(-MAX_PERSISTED_SHADOWS),
    houseMasters: (houses as HouseMasterRecord[]).slice(-MAX_PERSISTED_HOUSE_MASTERS),
    quizId: candidate.quizId ?? QUIZ_ID,
    totalCompletions: candidate.totalCompletions ?? 0,
    totalPlayers: candidate.totalPlayers ?? 0
  }
  const run = parseRun(candidate.run)
  if (run) parsed.run = run
  return parsed
}
