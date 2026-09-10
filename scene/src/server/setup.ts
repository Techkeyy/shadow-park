import { Storage } from '@dcl/sdk/server'
import { room } from '../shared/messages'
import {
  applyQuizAnswer,
  AvatarSnapshot,
  createClientState,
  createInitialState,
  createRunForPlayer,
  currentQuestionForRun,
  isChoice,
  ParkState,
  parseState,
  PlayerRun,
  RUN_KEY_PREFIX,
  STATE_KEY,
  QUIZ_ID,
  rotateQuestion,
  utcDateKey
} from '../shared/state'

let state: ParkState = createInitialState()
let mutationQueue: Promise<void> = Promise.resolve()
const activeResonators = new Set<string>()
const sessionStates = new Map<string, 'UNARMED' | 'ARMED' | 'TRANSITIONING'>()
const playerRuns = new Map<string, PlayerRun>()
const answeredInFlight = new Set<string>()
const serverStartedAtMs = Date.now()
let hydrationReadyAtIso = ''

function trace(event: string, details: Record<string, unknown> = {}) {
  console.log(
    `[SHADOW_PARK_TIMING] ${JSON.stringify({
      side: 'server',
      event,
      atIso: new Date().toISOString(),
      elapsedMs: Date.now() - serverStartedAtMs,
      ...details
    })}`
  )
}

async function loadRun(playerId: string): Promise<PlayerRun> {
  const cached = playerRuns.get(playerId)
  if (cached) return cached
  const runKeys = [
    `${RUN_KEY_PREFIX}${state.quizId ?? 'shadow-park-quiz-v1'}`,
    `${RUN_KEY_PREFIX}${QUIZ_ID}`,
    `${RUN_KEY_PREFIX}shadow-park-quiz-v1`
  ].filter((key, index, keys) => keys.indexOf(key) === index)
  let stored: PlayerRun | null | undefined
  for (const key of runKeys) {
    stored = await Storage.player.get<PlayerRun>(playerId, key, { fresh: true })
    if (stored) break
  }
  const run = stored && Array.isArray(stored.questionIds) ? stored : createRunForPlayer(playerId)
  playerRuns.set(playerId, run)
  return run
}

async function sendState(to?: string, requestId = '') {
  const options = to ? { to: [to] } : undefined
  const startedAtMs = Date.now()
  const snapshot = to ? createClientState(state, await loadRun(to)) : state
  trace('state_send_started', { to: to ?? 'broadcast', requestId, total: state.countA + state.countB, completed: snapshot.run?.completed ?? false })
  await room.send('stateChanged', { stateJson: JSON.stringify(snapshot), requestId, serverSentAtIso: new Date().toISOString() }, options)
  trace('state_send_completed', { to: to ?? 'broadcast', requestId, durationMs: Date.now() - startedAtMs })
}

async function sendGlobalState() {
  await room.send('globalStateChanged', { stateJson: JSON.stringify(state), serverSentAtIso: new Date().toISOString() })
}

function queueMutation(work: () => Promise<void>) {
  mutationQueue = mutationQueue.then(work).catch((error) => {
    console.error('SHADOW PARK mutation failed', error)
  })
}

function parseAvatarSnapshot(value: string): AvatarSnapshot | undefined {
  if (!value) return undefined
  try {
    const candidate = JSON.parse(value) as AvatarSnapshot
    return candidate && typeof candidate === 'object' ? candidate : undefined
  } catch {
    return undefined
  }
}

function answerResultPayload(run: PlayerRun, fields: Record<string, unknown> = {}) {
  return {
    accepted: false,
    questionId: String(fields.questionId ?? run.lastAnswer?.questionId ?? currentQuestionForRun(run)?.questionId ?? ''),
    correct: false,
    message: '',
    correctAnswer: '',
    score: run.score,
    shadowLevel: run.shadowLevel,
    completed: false,
    nextQuestionId: currentQuestionForRun(run)?.questionId ?? '',
    shadowScore: run.shadowScore,
    currentStreak: run.currentStreak,
    bestStreak: run.bestStreak,
    shadowRank: run.shadowRank,
    masterStars: run.masterStars,
    milestoneBonus: 0,
    chainLost: false,
    shadowAwakened: false,
    becameMaster: false,
    masterStarAwarded: false,
    houseRank: run.houseRank ?? 0,
    ...fields
  }
}

async function handleAnswer(questionId: string, choiceValue: string, playerId: string, avatarJson: string) {
  const sessionState = sessionStates.get(playerId) ?? 'UNARMED'
  trace('answer_request_received', { playerId, questionId, choice: choiceValue, state: sessionState })
  if (sessionState !== 'ARMED') {
    trace('answer_rejected_not_armed', { playerId, questionId, choice: choiceValue, state: sessionState })
    const run = await loadRun(playerId)
    await room.send('answerResult', answerResultPayload(run, { message: 'That answer is not ready yet.' }), { to: [playerId] })
    return
  }
  if (!isChoice(choiceValue)) {
    await room.send('answerResult', answerResultPayload(await loadRun(playerId), { message: 'Choose A or B.' }), { to: [playerId] })
    return
  }
  const flightKey = `${playerId}:${questionId}`
  if (answeredInFlight.has(flightKey)) return
  answeredInFlight.add(flightKey)
  try {
    const run = await loadRun(playerId)
    const question = currentQuestionForRun(run)
    if (!question || question.questionId !== questionId || run.answeredQuestionIds.includes(questionId)) {
      trace('answer_rejected_duplicate_or_stale', { playerId, questionId, expectedQuestionId: question?.questionId ?? '' })
      await room.send('answerResult', answerResultPayload(run, { message: 'That question is already answered. Next question.' }), { to: [playerId] })
      await sendState(playerId)
      return
    }
    const previousState = state
    const avatar = parseAvatarSnapshot(avatarJson)
    const result = applyQuizAnswer(state, run, choiceValue, playerId, new Date(), avatar)
    if (!(await Storage.set(STATE_KEY, result.state))) {
      await room.send('answerResult', answerResultPayload(run, { message: 'The park could not remember that answer. Try again.', nextQuestionId: question.questionId }), { to: [playerId] })
      return
    }
    const runKey = `${RUN_KEY_PREFIX}${state.quizId ?? 'shadow-park-quiz-v1'}`
    if (!(await Storage.player.set(playerId, runKey, result.run))) {
      await Storage.set(STATE_KEY, previousState)
      await room.send('answerResult', answerResultPayload(run, { message: 'The park could not lock that answer. Try again.', nextQuestionId: question.questionId }), { to: [playerId] })
      return
    }
    state = result.state
    playerRuns.set(playerId, result.run)
    // A new quiz question is ready as soon as the previous answer is
    // accepted. The authoritative per-question run state remains the
    // duplicate-safety boundary; center arming is no longer required.
    sessionStates.set(playerId, 'TRANSITIONING')
    const chainCopy = result.correct && result.run.currentStreak > 0 ? ` CHAIN x${result.run.currentStreak}.` : result.chainLost ? ' CHAIN LOST.' : ''
    const milestoneCopy = result.milestoneBonus > 0 ? ` +${result.milestoneBonus} MILESTONE.` : ''
    const message = result.correct
      ? `CORRECT. +10 SHADOW SCORE.${milestoneCopy}${chainCopy}`
      : `NOT THIS TIME. Correct answer: ${result.correctAnswer}.${chainCopy}`
    trace('answer_accepted', { playerId, questionId, choice: choiceValue, correct: result.correct, score: result.run.score, shadowLevel: result.run.shadowLevel, rank: result.run.shadowRank, streak: result.run.currentStreak, becameMaster: result.becameMaster })
    await room.send('answerResult', answerResultPayload(result.run, {
      accepted: true,
      questionId: question.questionId,
      correct: result.correct,
      message,
      correctAnswer: result.correctAnswer,
      nextQuestionId: result.nextQuestion?.questionId ?? '',
      milestoneBonus: result.milestoneBonus,
      chainLost: result.chainLost,
      shadowAwakened: result.shadowAwakened,
      becameMaster: result.becameMaster,
      masterStarAwarded: result.masterStarAwarded,
      houseRank: result.run.houseRank ?? 0
    }), { to: [playerId] })
    await sendState(playerId)
    await sendGlobalState()
  } finally {
    answeredInFlight.delete(flightKey)
  }
}

async function handleRestart(playerId: string) {
  const currentRun = await loadRun(playerId)
  if (!currentRun.completed) {
    await room.send('restartResult', { accepted: false, message: 'Finish this run before starting another.' }, { to: [playerId] })
    return
  }
  const nextRun = createRunForPlayer(playerId, new Date())
  const runKey = `${RUN_KEY_PREFIX}${state.quizId ?? 'shadow-park-quiz-v1'}`
  if (!(await Storage.player.set(playerId, runKey, nextRun))) {
    await room.send('restartResult', { accepted: false, message: 'The park could not start a new run. Try again.' }, { to: [playerId] })
    return
  }
  playerRuns.set(playerId, nextRun)
  sessionStates.set(playerId, 'ARMED')
  trace('run_restarted', { playerId, runId: nextRun.runId })
  await room.send('restartResult', { accepted: true, message: 'A new run begins.' }, { to: [playerId] })
  await sendState(playerId)
}

function resonanceKey(questionId: string, shadowId: string): string {
  return `shadow-park/resonated/${questionId}/${shadowId}`
}

async function handleResonate(shadowId: string, playerId: string) {
  const shadowIndex = state.shadows.findIndex((shadow) => shadow.id === shadowId)
  trace('resonate_request_received', { playerId, shadowId, found: shadowIndex >= 0 })
  if (shadowIndex < 0) {
    await room.send('resonateResult', { accepted: false, message: 'That Shadow has faded from view.', shadowId }, { to: [playerId] })
    return
  }

  const activeKey = `${playerId}:${shadowId}`
  if (activeResonators.has(activeKey)) return
  activeResonators.add(activeKey)
  try {
    const alreadyResonated = await Storage.player.get<boolean>(playerId, resonanceKey(state.questionId, shadowId), { fresh: true })
    if (alreadyResonated) {
      trace('resonate_rejected_duplicate', { playerId, shadowId })
      await room.send('resonateResult', { accepted: false, message: 'You already resonated with this Shadow.', shadowId }, { to: [playerId] })
      return
    }

    const previousState = state
    const nextState: ParkState = {
      ...state,
      shadows: state.shadows.map((shadow, index) => (index === shadowIndex ? { ...shadow, resonances: shadow.resonances + 1 } : shadow)),
      updatedAt: new Date().toISOString()
    }
    if (!(await Storage.set(STATE_KEY, nextState))) {
      await room.send('resonateResult', { accepted: false, message: 'The park could not remember that resonance.', shadowId }, { to: [playerId] })
      return
    }
    if (!(await Storage.player.set(playerId, resonanceKey(nextState.questionId, shadowId), true))) {
      await Storage.set(STATE_KEY, previousState)
      await room.send('resonateResult', { accepted: false, message: 'The park could not lock that resonance.', shadowId }, { to: [playerId] })
      return
    }
    state = nextState
    trace('resonate_accepted', { playerId, shadowId, resonances: nextState.shadows[shadowIndex].resonances })
    await room.send('resonateResult', { accepted: true, message: 'The Shadow answered.', shadowId }, { to: [playerId] })
    await sendState(playerId)
    await sendGlobalState()
  } finally {
    activeResonators.delete(activeKey)
  }
}

export async function setupServer() {
  trace('server_setup_started')

  const hydrationPromise = (async () => {
    const readStartedAtMs = Date.now()
    trace('storage_read_started', { key: STATE_KEY })
    const stored = parseState(await Storage.get<ParkState>(STATE_KEY, { fresh: true }))
    trace('storage_read_completed', {
      durationMs: Date.now() - readStartedAtMs,
      found: Boolean(stored),
      total: stored ? stored.countA + stored.countB : 0
    })

    if (stored) {
      const migrated = { ...stored, version: 3 as const, quizId: QUIZ_ID, shadows: stored.houseMasters ?? [] }
      state = migrated
      if (stored.version !== 3 || stored.quizId !== QUIZ_ID) await Storage.set(STATE_KEY, state)
      if (state.questionDate && state.questionDate !== utcDateKey(new Date())) {
        const rotated = rotateQuestion(state)
        if (rotated !== state && (await Storage.set(STATE_KEY, rotated))) state = rotated
      }
      return
    }

    const writeStartedAtMs = Date.now()
    const created = await Storage.set(STATE_KEY, state)
    trace('storage_initialization_completed', { durationMs: Date.now() - writeStartedAtMs, created })
    if (!created) console.error('SHADOW PARK could not initialize persistent state')
  })()

  room.onMessage('sessionCreated', (data, context) => {
    if (!context?.from) return
    // The player is ready to answer from the normal spawn flow. Keep the
    // server-side guard for malformed/late requests, while duplicate and
    // stale-question checks remain authoritative in handleAnswer.
    sessionStates.set(context.from, 'ARMED')
    trace('session_created', { playerId: context.from, sessionId: data.sessionId })
    trace('initial_answer_state', { playerId: context.from, sessionId: data.sessionId, state: 'ARMED' })
  })

  room.onMessage('readyForNextQuestion', (data, context) => {
    if (!context?.from) return
    queueMutation(async () => {
      await hydrationPromise
      const playerId = context.from
      const current = sessionStates.get(playerId) ?? 'UNARMED'
      const run = await loadRun(playerId)
      const question = currentQuestionForRun(run)
      // A lost acknowledgement must be safely retryable for the same question.
      const accepted = (current === 'TRANSITIONING' || current === 'ARMED') && !run.completed && question?.questionId === data.questionId
      if (accepted) {
        sessionStates.set(playerId, 'ARMED')
        trace('next_question_ready', { playerId, sessionId: data.sessionId, questionId: data.questionId, state: 'ARMED' })
      } else {
        trace('next_question_ready_rejected', { playerId, sessionId: data.sessionId, questionId: data.questionId, expectedQuestionId: question?.questionId ?? '', state: current })
      }
      await room.send('nextQuestionReady', { accepted, questionId: accepted ? data.questionId : question?.questionId ?? '' }, { to: [playerId] })
    })
  })

  room.onMessage('restartRun', (data, context) => {
    if (!context?.from) return
    queueMutation(async () => {
      await hydrationPromise
      await handleRestart(context.from)
    })
  })

  room.onMessage('requestState', (data, context) => {
    if (!context?.from) return
    const playerId = context.from
    trace('state_request_received', { playerId, requestId: data.requestId })
    void hydrationPromise
      .then(() => sendState(playerId, data.requestId))
      .catch((error) => console.error('SHADOW PARK initial state request failed', error))
  })

  room.onMessage('answerQuestion', (data, context) => {
    if (!context?.from) return
    queueMutation(async () => {
      await hydrationPromise
      await handleAnswer(data.questionId, data.choice, context.from, data.avatarJson)
    })
  })

  room.onMessage('resonate', (data, context) => {
    if (!context?.from) return
    queueMutation(async () => {
      await hydrationPromise
      await handleResonate(data.shadowId, context.from)
    })
  })

  const recordTimingReport = (
    data: {
      requestId: string
      requestSentAtIso?: string
      serverSentAtIso: string
      clientReceivedAtIso: string
      clientRenderAtIso: string
      clientReceiveToRenderMs: number
      serverToRenderMs: number
    },
    context?: { from: string }
  ) => {
    if (!context?.from) return
    const hydrationReadyAtMs = Date.parse(hydrationReadyAtIso)
    const clientRenderAtMs = Date.parse(data.clientRenderAtIso)
    trace('client_timing_report', {
      playerId: context.from,
      requestId: data.requestId,
      requestSentAtIso: data.requestSentAtIso ?? '',
      serverSentAtIso: data.serverSentAtIso,
      clientReceivedAtIso: data.clientReceivedAtIso,
      clientRenderAtIso: data.clientRenderAtIso,
      clientReceiveToRenderMs: data.clientReceiveToRenderMs,
      serverToRenderMs: data.serverToRenderMs,
      hydrationToRenderMs:
        Number.isNaN(hydrationReadyAtMs) || Number.isNaN(clientRenderAtMs) ? null : clientRenderAtMs - hydrationReadyAtMs
    })
  }

  room.onMessage('timingReport', recordTimingReport)
  room.onMessage('timingReportV2', recordTimingReport)

  room.onMessage('clientTrace', (data, context) => {
    if (!context?.from) return
    trace('client_trace', { playerId: context.from, event: data.event, details: data.details })
  })

  await hydrationPromise
  hydrationReadyAtIso = new Date().toISOString()
  trace('hydration_ready', { total: state.countA + state.countB })
  await sendGlobalState()
  trace('initial_broadcast_completed')
  console.log(`SHADOW PARK server ready with quiz ${state.quizId ?? 'shadow-park-quiz-v1'} and ${state.shadows.length} historical Shadow(s)`)
}
