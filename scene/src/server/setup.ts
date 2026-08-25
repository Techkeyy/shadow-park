import { Storage } from '@dcl/sdk/server'
import { room } from '../shared/messages'
import { applyVote, createInitialState, isChoice, ParkState, parseState, STATE_KEY } from '../shared/state'

let state: ParkState = createInitialState()
let mutationQueue: Promise<void> = Promise.resolve()
const activeVoters = new Set<string>()
type VoteSessionState = 'UNARMED' | 'ARMED' | 'VOTED'
const sessionStates = new Map<string, VoteSessionState>()
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

function voterKey(questionId: string): string {
  return `shadow-park/voted/${questionId}`
}

async function sendState(to?: string, requestId = '') {
  const options = to ? { to: [to] } : undefined
  const startedAtMs = Date.now()
  trace('state_send_started', { to: to ?? 'broadcast', requestId, total: state.countA + state.countB })
  await room.send(
    'stateChanged',
    { stateJson: JSON.stringify(state), requestId, serverSentAtIso: new Date().toISOString() },
    options
  )
  trace('state_send_completed', { to: to ?? 'broadcast', requestId, durationMs: Date.now() - startedAtMs })
}

function queueMutation(work: () => Promise<void>) {
  mutationQueue = mutationQueue.then(work).catch((error) => {
    console.error('SHADOW PARK mutation failed', error)
  })
}

async function handleVote(choiceValue: string, playerId: string) {
  const sessionState = sessionStates.get(playerId) ?? 'UNARMED'
  trace('vote_request_received', { playerId, choice: choiceValue, state: sessionState })

  if (sessionState === 'UNARMED') {
    trace('vote_rejected_unarmed', { playerId, choice: choiceValue })
    await room.send('voteResult', { accepted: false, message: 'Return to the neutral pad before choosing A or B.' }, { to: [playerId] })
    return
  }

  if (sessionState === 'VOTED') {
    trace('vote_rejected_duplicate', { playerId, choice: choiceValue, reason: 'session_already_voted' })
    await room.send('voteResult', { accepted: false, message: 'Your Shadow is already here.' }, { to: [playerId] })
    await sendState(playerId)
    return
  }

  if (!isChoice(choiceValue)) {
    await room.send('voteResult', { accepted: false, message: 'Choose A or B.' }, { to: [playerId] })
    return
  }

  if (activeVoters.has(playerId)) {
    trace('vote_rejected_duplicate', { playerId, choice: choiceValue, reason: 'request_in_flight' })
    await room.send('voteResult', { accepted: false, message: 'Your Shadow is already here.' }, { to: [playerId] })
    await sendState(playerId)
    return
  }

  activeVoters.add(playerId)
  try {
    const alreadyVoted = await Storage.player.get<boolean>(playerId, voterKey(state.questionId), { fresh: true })
    if (alreadyVoted) {
      sessionStates.set(playerId, 'VOTED')
      trace('vote_rejected_duplicate', { playerId, choice: choiceValue, reason: 'persistent_player_lock' })
      await room.send('voteResult', { accepted: false, message: 'Your Shadow is already here.' }, { to: [playerId] })
      await sendState(playerId)
      return
    }

    const previousState = state
    const nextState = applyVote(state, choiceValue, `shadow-${Date.now()}-${state.countA + state.countB}`)
    const stateStored = await Storage.set(STATE_KEY, nextState)

    if (!stateStored) {
      await room.send('voteResult', { accepted: false, message: 'The park could not remember that vote. Try again.' }, { to: [playerId] })
      return
    }

    const playerStored = await Storage.player.set(playerId, voterKey(nextState.questionId), true)
    if (!playerStored) {
      await Storage.set(STATE_KEY, previousState)
      await room.send('voteResult', { accepted: false, message: 'The park could not lock that vote. Try again.' }, { to: [playerId] })
      return
    }

    state = nextState
    sessionStates.set(playerId, 'VOTED')
    trace('vote_accepted', { playerId, choice: choiceValue, total: state.countA + state.countB })
    trace('shadow_created', { playerId, choice: choiceValue, shadowId: nextState.shadows[nextState.shadows.length - 1]?.id ?? '' })
    await room.send('voteResult', { accepted: true, message: 'You left a Shadow behind.' }, { to: [playerId] })
    await sendState()
  } finally {
    activeVoters.delete(playerId)
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
      state = stored
      return
    }

    const writeStartedAtMs = Date.now()
    const created = await Storage.set(STATE_KEY, state)
    trace('storage_initialization_completed', { durationMs: Date.now() - writeStartedAtMs, created })
    if (!created) console.error('SHADOW PARK could not initialize persistent state')
  })()

  room.onMessage('sessionCreated', (data, context) => {
    if (!context?.from) return
    sessionStates.set(context.from, 'UNARMED')
    trace('session_created', { playerId: context.from, sessionId: data.sessionId })
    trace('initial_vote_state', { playerId: context.from, sessionId: data.sessionId, state: 'UNARMED' })
  })

  room.onMessage('neutralEntered', (data, context) => {
    if (!context?.from) return
    if (!sessionStates.has(context.from)) sessionStates.set(context.from, 'UNARMED')
    trace('neutral_enter', { playerId: context.from, sessionId: data.sessionId, state: sessionStates.get(context.from) })
  })

  room.onMessage('neutralExited', (data, context) => {
    if (!context?.from) return
    const current = sessionStates.get(context.from) ?? 'UNARMED'
    trace('neutral_exit', { playerId: context.from, sessionId: data.sessionId, towardChoices: data.towardChoices, state: current })
    if (current === 'UNARMED' && data.towardChoices) {
      sessionStates.set(context.from, 'ARMED')
      trace('vote_armed', { playerId: context.from, sessionId: data.sessionId, state: 'ARMED' })
    }
  })

  room.onMessage('requestState', (data, context) => {
    if (!context?.from) return
    const playerId = context.from
    trace('state_request_received', { playerId, requestId: data.requestId })
    void hydrationPromise
      .then(() => sendState(playerId, data.requestId))
      .catch((error) => console.error('SHADOW PARK initial state request failed', error))
  })

  room.onMessage('castVote', (data, context) => {
    if (!context?.from) return
    queueMutation(async () => {
      await hydrationPromise
      await handleVote(data.choice, context.from)
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

  await hydrationPromise
  hydrationReadyAtIso = new Date().toISOString()
  trace('hydration_ready', { total: state.countA + state.countB })
  await sendState()
  trace('initial_broadcast_completed')
  console.log(`SHADOW PARK server ready with ${state.countA + state.countB} persisted vote(s)`)
}
