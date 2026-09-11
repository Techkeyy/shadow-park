import { ColliderLayer, engine, Entity, timers, Transform, TriggerArea, triggerAreaEventsSystem } from '@dcl/sdk/ecs'
import { InputModifier } from '@dcl/sdk/ecs'
import { Vector3 } from '@dcl/sdk/math'
import { getPlayer } from '@dcl/sdk/players'
import { movePlayerTo } from '~system/RestrictedActions'
import { room } from '../shared/messages'
import { AvatarSnapshot, Choice, CURATED_QUESTIONS, MAX_VISIBLE_SHADOWS, ParkState, parseState, ShadowRecord } from '../shared/state'
import { choiceCaptureBounds, hallShadowGridForSlot, isInsideChoiceCapture, zoneForChoice, HOUSE_OF_MASTERS_ZONE } from '../shared/zones'
import { setupUi, UiVoteState, updateUi, updateUiFromState } from './ui'
import { runCriticalAnswerTransition } from './core-transition'
import { recenterAndVerify } from './recenter'
import { runOptionalRestore } from './optional-restore'
import { runNonBlockingPresentationSteps } from './stage2-feedback'
import { sendChoiceIntent, stateAfterAcceptedAnswer, stateAfterNextQuestionReady, stateAfterRecenter } from './vote-intent'
import {
  animateShadowVisuals,
  clearShadowVisuals,
  createPresentationV2,
  createPersonalShadowVisual,
  createShadowVisual,
  pulseChoicePad,
  queuePersonalShadowReaction,
  triggerPersonalShadowReaction,
  triggerShadowEnergy,
  playMomentSound as playPresentationMomentSound,
  shadowPulseUntil,
  shadowRootsById,
  updateHouseMasterVisuals,
  updateQuestionSurface
} from './presentation-v2'

export const BUILD_MARKER = 'RESCUE-STARTUP-f9a2'
const NEUTRAL_CENTER = Vector3.create(8, 0.15, 1.5)
const NEUTRAL_TOLERANCE_X = 1.6
const NEUTRAL_TOLERANCE_Z = 1.1
const RECENTER_MAX_ATTEMPTS = 3
const clientStartedAtMs = Date.now()

let parkState: ParkState | null = null
let votePending = false
let voteState: UiVoteState = 'UNARMED'
let feedbackUntilMs = 0
let sessionId = ''
let sessionSequence = 0
let requestSequence = 0
let transitionSequence = 0
let transitioningQuestionId = ''
let footprintChoice: Choice | null = null
let lastAttemptedQuestionId = ''
let lastAttemptedChoice: Choice | null = null
let lastFootprintTraceMs = 0
let personalShadowVisible = false
let personalShadowPresentationPending = false
let recenterInFlightQuestionId = ''
let roomReady = false
let lastRoomReadyState: boolean | null = null
let answerLocked = false
let recenterRequested = false
let recenterCompleted = false
let recenterAttemptCount = 0
let activePad: Choice | null = null
let pendingResultQuestionId = ''
let currentQuestionId = ''
let inputDisabled = false
let neutralReady = false
let lastCompletedAnswerQuestionId = ''
const pendingStateRequests = new Map<string, { sentAtMs: number; sentAtIso: string }>()
const shadowTriggerEntities: Entity[] = []
const resonatedShadowIds = new Set<string>()
let momentAudioEntity: Entity | null = null

const RECOVERY_TRACE_EVENTS = new Set([
  'CLIENT_BOOT',
  'ROOM_READY_CALLBACK',
  'ROOM_IS_READY_SNAPSHOT',
  'ROOM_READY_POLL_DETECTED',
  'HANDLE_ROOM_READY',
  'SESSION_CREATED_SENT',
  'REQUEST_STATE_SENT',
  'STATE_CHANGED_RECEIVED',
  'PLAYER_STATE_APPLIED',
  'QUESTION_MAPPING_APPLIED',
  'GAMEPLAY_READY_TRUE',
  'PADS_ARMED',
  'CALLING_BACK_SHADOWS_CLEARED',
  'RECOVERY_REQUESTSTATE_GUARD',
  'room_ready_changed',
  'session_created',
  'state_request_sent',
  'state_message_received',
  'state_render_completed',
  'choice_footprint_enter',
  'choice_trigger_enter',
  'answer_request_sent',
  'locking_ui_set',
  'correctness_received',
  'score_received',
  'result_ui_set',
  'locking_ui_cleared',
  'recenter_started',
  'vote_intent_created',
  'choice_pulse_failed',
  'choice_sound_failed',
  'answer_result_received',
  'answer_result_rejected',
  'answer_result_duplicate_ignored',
  'result_ui_triggered',
  'result_sound_failed',
  'result_energy_failed',
  'recenter_request_created',
  'transition_started',
  'player_recenter_input_locked',
  'recenter_position_sample',
  'player_recenter_attempt',
  'player_recentered',
  'recenter_failed',
  'recenter_fallback_manual_required',
  'player_recenter_input_unlocked',
  'next_question_ready_rejected_client',
  'next_question_enabled',
  'question_transition_ready',
  'vote_intent_ignored_unarmed',
  'answer_request_failed'
])

type StateTiming = {
  requestId: string
  requestSentAtIso: string
  serverSentAtIso: string
  receivedAtMs: number
  receivedAtIso: string
}

function trace(event: string, details: Record<string, unknown> = {}) {
  const payload = { side: 'client', event, atIso: new Date().toISOString(), elapsedMs: Date.now() - clientStartedAtMs, ...details }
  console.log('[SHADOW_PARK_TIMING] ' + JSON.stringify(payload))
  if (roomReady && RECOVERY_TRACE_EVENTS.has(event)) {
    void room.send('clientTrace', { event, details: JSON.stringify(details).slice(0, 1800) }).catch(() => undefined)
  }
}

function transientState() {
  return {
    submitted: votePending,
    answerLocked,
    transitionInProgress: Boolean(recenterInFlightQuestionId) || voteState === 'TRANSITIONING',
    recenterRequested,
    recenterCompleted,
    recenterAttemptCount,
    activePad,
    pendingResult: Boolean(pendingResultQuestionId),
    lastAnsweredQuestionId: lastCompletedAnswerQuestionId,
    transitionToken: transitionSequence,
    currentQuestionId: currentQuestionId || parkState?.questionId || '',
    inputDisabled,
    neutralReady,
    voteState,
    votePending
  }
}

function traceTransition(event: string, details: Record<string, unknown> = {}) {
  trace(event, { ...details, transient: transientState() })
}

function isInsideNeutralPosition(x: number, z: number): boolean {
  return Math.abs(x - NEUTRAL_CENTER.x) <= NEUTRAL_TOLERANCE_X && Math.abs(z - NEUTRAL_CENTER.z) <= NEUTRAL_TOLERANCE_Z
}

function samplePlayerPosition(label: string, questionId: string) {
  const player = Transform.getOrNull(engine.PlayerEntity)
  traceTransition('recenter_position_sample', {
    sessionId,
    questionId,
    label,
    x: player?.position.x ?? null,
    y: player?.position.y ?? null,
    z: player?.position.z ?? null,
    insideNeutral: player ? isInsideNeutralPosition(player.position.x, player.position.z) : false
  })
}

function enableManualRecenterFallback(nextQuestionId: string) {
  recenterInFlightQuestionId = ''
  // Never leave the player in an unexplained permanent TRANSITIONING state.
  // This explicit recovery state blocks duplicate answers while allowing a
  // neutral-pad position check to complete the same transition safely.
  voteState = 'RECENTER_RECOVERY'
  inputDisabled = false
  updateUi({ voteState })
  setStatus('RETURN TO CENTER TO CONTINUE')
  traceTransition('recenter_fallback_manual_required', {
    sessionId,
    questionId: nextQuestionId,
    target: NEUTRAL_CENTER,
    tolerance: { x: NEUTRAL_TOLERANCE_X, z: NEUTRAL_TOLERANCE_Z }
  })
}

function createTriggerArea(position: Vector3, scale: Vector3, onEnter: () => void, onExit: () => void) {
  const entity = engine.addEntity()
  Transform.create(entity, { position, scale })
  TriggerArea.setBox(entity, ColliderLayer.CL_PLAYER)
  triggerAreaEventsSystem.onTriggerEnter(entity, (result) => {
    if (result.trigger?.entity !== engine.PlayerEntity) return
    onEnter()
  })
  triggerAreaEventsSystem.onTriggerExit(entity, (result) => {
    if (result.trigger?.entity !== engine.PlayerEntity) return
    onExit()
  })
  return entity
}

function scanChoiceFootprints() {
  const player = Transform.getOrNull(engine.PlayerEntity)
  if (!player) {
    footprintChoice = null
    return
  }
  const { x, y, z } = player.position
  if ((voteState === 'TRANSITIONING' || voteState === 'RECENTER_RECOVERY') && transitioningQuestionId && isInsideNeutralPosition(x, z) && !recenterInFlightQuestionId) {
    voteState = 'CENTERED'
    recenterCompleted = true
    neutralReady = true
    updateUi({ voteState })
    setStatus('NEXT QUESTION')
    traceTransition('manual_recenter_verified', { sessionId, questionId: transitioningQuestionId, x, y, z })
    sendReadyForNextQuestion(transitioningQuestionId)
    return
  }
  const insideA = isInsideChoiceCapture('A', x, z)
  const insideB = isInsideChoiceCapture('B', x, z)
  const nextChoice = insideA ? 'A' : insideB ? 'B' : null
  const nearChoice = insideA || insideB || isInsideChoiceCapture('A', x, z) || isInsideChoiceCapture('B', x, z)
  if (nearChoice && Date.now() - lastFootprintTraceMs > 250) {
    lastFootprintTraceMs = Date.now()
    trace('choice_footprint_sample', {
      sessionId,
      x,
      y,
      z,
      insideA,
      insideB,
      previousChoice: footprintChoice,
      state: voteState,
      votePending,
      questionId: parkState?.questionId ?? '',
      captureA: choiceCaptureBounds('A'),
      captureB: choiceCaptureBounds('B')
    })
  }
  const shouldAttempt = Boolean(nextChoice) && (
    nextChoice !== footprintChoice ||
    (voteState === 'ARMED' && !votePending && lastAttemptedQuestionId !== (parkState?.questionId ?? ''))
  )
  if (!shouldAttempt && nextChoice === footprintChoice) return
  if (nextChoice) {
    trace('choice_footprint_enter', { sessionId, choice: nextChoice, x, y, z, state: voteState, detection: 'forgiving-capture' })
    handleChoiceTrigger(nextChoice)
  } else if (footprintChoice) {
    trace('choice_footprint_exit', { sessionId, choice: footprintChoice, x, z })
  }
  footprintChoice = nextChoice
}

function createShadow(shadow: ShadowRecord, sideIndex: number) {
  const hallPosition = hallShadowGridForSlot(sideIndex)
  const { position } = createShadowVisual(shadow, sideIndex, Vector3.create(hallPosition.x, 0.12, hallPosition.z))
  const trigger = createTriggerArea(
    position,
    Vector3.create(1.4, 2.2, 1.4),
    () => {
      if (resonatedShadowIds.has(shadow.id)) return
      resonatedShadowIds.add(shadow.id)
      updateUi({ resonateStatus: 'Resonating with a Shadow...' })
      void room.send('resonate', { shadowId: shadow.id })
    },
    () => undefined
  )
  shadowTriggerEntities.push(trigger)
}

function clearShadows() {
  while (shadowTriggerEntities.length) {
    const entity = shadowTriggerEntities.pop()
    if (entity) engine.removeEntity(entity)
  }
  clearShadowVisuals()
}

function renderState(state: ParkState, timing: StateTiming) {
  const renderStartedAtMs = Date.now()
  trace('STATE_CHANGED_RECEIVED', {
    sessionId,
    requestId: timing.requestId,
    questionId: state.questionId,
    serverSentAtIso: timing.serverSentAtIso
  })
  if (parkState?.questionId !== state.questionId) lastAttemptedQuestionId = ''
  parkState = state
  currentQuestionId = state.questionId

  trace('PLAYER_STATE_APPLIED', {
    sessionId,
    questionId: state.questionId,
    lifetimeCorrect: state.run?.lifetimeCorrect ?? 0,
    shadowScore: state.run?.shadowScore ?? 0,
    shadowRank: state.run?.shadowRank ?? 'DORMANT'
  })
  updateUi({ startupStage: 'APPLYING QUESTION' })

  updateQuestionSurface(state)
  trace('QUESTION_MAPPING_APPLIED', {
    sessionId,
    questionId: state.questionId,
    choiceA: state.choiceA,
    choiceB: state.choiceB
  })

  updateUiFromState(state)
  updateUi({ startupStage: 'READY', hydrated: true })
  trace('CALLING_BACK_SHADOWS_CLEARED', { sessionId, questionId: state.questionId })

  if (voteState === 'UNARMED' && !votePending) {
    const player = Transform.getOrNull(engine.PlayerEntity)
    const insideChoice = player ? isInsideChoiceCapture('A', player.position.x, player.position.z) || isInsideChoiceCapture('B', player.position.x, player.position.z) : false
    if (insideChoice) {
      void beginRecenter(state.questionId)
    } else {
      voteState = 'ARMED'
      updateUi({ voteState })
      trace('PADS_ARMED', { sessionId, questionId: state.questionId, voteState: 'ARMED' })
      setStatus(state.run?.lifetimeAnswered ? `${state.run.shadowRank} • SHADOW SCORE ${state.run.shadowScore}` : 'WALK TO A OR B')
    }
  }

  const isGameplayReady = Boolean(
    state.run &&
    state.questionId &&
    state.choiceA &&
    state.choiceB &&
    !pendingResultQuestionId &&
    !answerLocked &&
    (voteState === 'ARMED' || voteState === 'UNARMED')
  )
  if (isGameplayReady) {
    trace('GAMEPLAY_READY_TRUE', { sessionId, questionId: state.questionId, voteState })
  }

  const previousShadowIds = new Set(shadowRootsById.keys())
  clearShadows()
  const visibleShadows = state.shadows.slice(-MAX_VISIBLE_SHADOWS)
  const hasAnswered = Boolean(state.run && state.run.lifetimeCorrect > 0)
  const personalShadowAwakened = hasAnswered && !personalShadowVisible
  if (personalShadowAwakened) trace('personal_shadow_materialized', { sessionId, shadowLevel: state.run?.shadowLevel ?? 0 })
  personalShadowVisible = hasAnswered
  if (hasAnswered && state.run && !personalShadowPresentationPending) {
    personalShadowPresentationPending = true
    const shadowLevel = state.run.shadowLevel
    const avatar = currentAvatarSnapshot()
    runOptionalRestore('personal_shadow_creation', () => {
      personalShadowPresentationPending = false
      try {
        trace('personal_shadow_presentation_started', { sessionId, shadowLevel })
        const personalShadow = createPersonalShadowVisual(shadowLevel, avatar, state.run?.lifetimeCorrect ?? 0)
        if (personalShadowAwakened) shadowPulseUntil.set(personalShadow.root, Date.now() + 1200)
        trace('personal_shadow_presentation_ready', { sessionId, shadowLevel })
      } catch (error) {
        trace('personal_shadow_presentation_failed', { sessionId, shadowLevel, error: String(error) })
      }
    })
  }
  updateHouseMasterVisuals(state.houseMasters ?? [])
  const newest = visibleShadows[visibleShadows.length - 1]
  if (newest && !previousShadowIds.has(newest.id)) {
    const root = shadowRootsById.get(newest.id)
    if (root) shadowPulseUntil.set(root, Date.now() + 900)
  }
  if (Date.now() >= feedbackUntilMs) {
    if (!votePending && voteState === 'ARMED') {
      setStatus(hasAnswered ? `${state.run?.shadowRank ?? 'AWAKENED'} • SHADOW SCORE ${state.run?.shadowScore ?? 0}` : 'WALK TO A OR B')
    }
  }
  const renderCompletedAtMs = Date.now()
  const serverSentAtMs = Date.parse(timing.serverSentAtIso)
  const timingPayload = {
    requestId: timing.requestId,
    requestSentAtIso: timing.requestSentAtIso,
    serverSentAtIso: timing.serverSentAtIso,
    clientReceivedAtIso: timing.receivedAtIso,
    clientRenderAtIso: new Date(renderCompletedAtMs).toISOString(),
    durationMs: renderCompletedAtMs - renderStartedAtMs,
    clientReceiveToRenderMs: renderCompletedAtMs - timing.receivedAtMs,
    serverToRenderMs: Number.isNaN(serverSentAtMs) ? 0 : renderCompletedAtMs - serverSentAtMs,
    total: state.countA + state.countB,
    shadowEntities: visibleShadows.length * 7
  }
  trace('state_render_completed', timingPayload)
  void room.send('timingReportV2', {
    requestId: timingPayload.requestId,
    requestSentAtIso: timingPayload.requestSentAtIso,
    serverSentAtIso: timingPayload.serverSentAtIso,
    clientReceivedAtIso: timingPayload.clientReceivedAtIso,
    clientRenderAtIso: timingPayload.clientRenderAtIso,
    clientReceiveToRenderMs: timingPayload.clientReceiveToRenderMs,
    serverToRenderMs: timingPayload.serverToRenderMs
  })
}

function setStatus(value: string) {
  updateUi({ status: value })
}

function requestStateSnapshot(reason: string) {
  if (!roomReady) return
  const requestId = reason + '-' + Date.now() + '-' + requestSequence++
  const sentAtMs = Date.now()
  const sentAtIso = new Date(sentAtMs).toISOString()
  pendingStateRequests.set(requestId, { sentAtMs, sentAtIso })
  trace('REQUEST_STATE_SENT', { requestId, requestSentAtIso: sentAtIso, reason })
  trace('state_request_sent', { requestId, requestSentAtIso: sentAtIso, reason })
  void room.send('requestState', { requestId }).catch((error) => {
    pendingStateRequests.delete(requestId)
    trace('state_request_failed', { requestId, reason, error: String(error) })
  })
}

let startupRecoveryScheduled = false
function scheduleStartupRecovery() {
  if (startupRecoveryScheduled) return
  startupRecoveryScheduled = true
  timers.setTimeout(() => {
    if (!roomReady || parkState) return
    trace('RECOVERY_REQUESTSTATE_GUARD', { reason: 'startup-recovery' })
    requestStateSnapshot('startup-recovery')
  }, 1800)
}

function sendReadyForNextQuestion(questionId: string) {
  void room.send('readyForNextQuestion', { sessionId, questionId }).catch((error) => {
    trace('next_question_ready_send_failed', { sessionId, questionId, error: String(error) })
  })
}

function currentAvatarSnapshot(): AvatarSnapshot | undefined {
  const raw = avatarSnapshotJson()
  if (!raw) return undefined
  try {
    return JSON.parse(raw) as AvatarSnapshot
  } catch {
    return undefined
  }
}

function avatarSnapshotJson(): string {
  const player = getPlayer()
  const avatar = player?.avatar
  if (!player) return ''
  const snapshot: AvatarSnapshot = {
    userId: player.userId,
    displayName: player.name,
    bodyShapeUrn: avatar?.bodyShapeUrn,
    wearableUrns: player.wearables,
    emoteUrns: player.emotes,
    skinColor: avatar?.skinColor ? [avatar.skinColor.r, avatar.skinColor.g, avatar.skinColor.b] : undefined,
    eyeColor: avatar?.eyesColor ? [avatar.eyesColor.r, avatar.eyesColor.g, avatar.eyesColor.b] : undefined,
    hairColor: avatar?.hairColor ? [avatar.hairColor.r, avatar.hairColor.g, avatar.hairColor.b] : undefined
  }
  return JSON.stringify(snapshot)
}

function handleChoiceTrigger(choice: Choice) {
  const player = Transform.getOrNull(engine.PlayerEntity)
  const zone = zoneForChoice(choice)
  trace('choice_trigger_enter', {
    sessionId,
    choice,
    zoneId: zone.id,
    state: voteState,
    x: player?.position.x ?? -1,
    y: player?.position.y ?? -1,
    z: player?.position.z ?? -1
  })
  const questionId = parkState?.questionId
  if (!questionId) {
    trace('choice_trigger_ignored_no_question_state', { sessionId, choice })
    setStatus('NEXT QUESTION')
    return
  }
  if (answerLocked || inputDisabled) {
    traceTransition('choice_footprint_ignored_locked', { sessionId, questionId, choice })
    return
  }
  const decision = sendChoiceIntent(voteState, votePending, choice, (intent) => {
    void room.send('answerQuestion', { questionId, choice: intent, avatarJson: avatarSnapshotJson() }).catch((error) => {
      votePending = false
      answerLocked = false
      activePad = null
      updateUi({ pendingChoice: '', answerFeedback: '' })
      setStatus('The park could not hear that choice. Try again.')
      traceTransition('answer_request_failed', { sessionId, questionId, choice: intent, error: String(error) })
    })
  })
  if (!decision.send) {
      if (decision.reason === 'unarmed') {
        trace('vote_intent_ignored_unarmed', { sessionId, choice, state: voteState })
      if (voteState === 'CENTERED' || voteState === 'TRANSITIONING' || voteState === 'RECENTER_RECOVERY' || voteState === 'ANSWERED') setStatus('NEXT QUESTION')
    }
    return
  }

  const requestSentAtIso = new Date().toISOString()
  lastAttemptedQuestionId = questionId
  lastAttemptedChoice = choice
  votePending = decision.nextVotePending
  answerLocked = true
  activePad = choice
  traceTransition('answer_request_sent', { sessionId, questionId, choice, requestSentAtIso })
  // Local acknowledgement is best-effort. It must never prevent the
  // authoritative answer request from completing.
  try {
    pulseChoicePad(choice)
  } catch (error) {
    trace('choice_pulse_failed', { sessionId, questionId, choice, error: String(error) })
  }
  try {
    playMomentSound()
  } catch (error) {
    trace('choice_sound_failed', { sessionId, questionId, choice, error: String(error) })
  }
  updateUi({ status: 'CHOICE LOCKED', pendingChoice: choice })
  traceTransition('locking_ui_set', { sessionId, questionId, choice, pendingChoice: choice })
  traceTransition('vote_intent_created', { sessionId, choice, state: voteState, requestSentAtIso, capture: choiceCaptureBounds(choice) })
  setStatus('ANSWERING...')
}

async function beginRecenter(nextQuestionId: string) {
  if (recenterRequested && transitioningQuestionId === nextQuestionId) {
    traceTransition('recenter_request_skipped', { sessionId, questionId: nextQuestionId, reason: 'same_question_already_in_flight', state: voteState })
    return
  }
  recenterRequested = true
  recenterCompleted = false
  recenterAttemptCount = 0
  inputDisabled = true
  neutralReady = false
  recenterInFlightQuestionId = nextQuestionId
  const sequence = ++transitionSequence
  transitioningQuestionId = nextQuestionId
  voteState = 'TRANSITIONING'
  updateUi({ voteState })
  traceTransition('transition_started', { sessionId, questionId: nextQuestionId, state: voteState })
  traceTransition('recenter_requested', { sessionId, questionId: nextQuestionId, target: NEUTRAL_CENTER, state: voteState })
  if (sequence !== transitionSequence || !sessionId) {
    recenterInFlightQuestionId = ''
    inputDisabled = false
    return
  }
  try {
    InputModifier.create(engine.PlayerEntity, {
      mode: InputModifier.Mode.Standard({ disableAll: true })
    })
    traceTransition('player_recenter_input_locked', { sessionId, questionId: nextQuestionId })
    samplePlayerPosition('before_move', nextQuestionId)
    const result = await recenterAndVerify({
      target: { x: NEUTRAL_CENTER.x, y: NEUTRAL_CENTER.y, z: NEUTRAL_CENTER.z },
      tolerance: { x: NEUTRAL_TOLERANCE_X, z: NEUTRAL_TOLERANCE_Z },
      readPosition: () => {
        const position = Transform.getOrNull(engine.PlayerEntity)?.position
        return position ? { x: position.x, y: position.y, z: position.z } : null
      },
      move: (request) => movePlayerTo(request),
      wait: (milliseconds) => new Promise<void>((resolve) => timers.setTimeout(resolve, milliseconds)),
      maxAttempts: RECENTER_MAX_ATTEMPTS,
      onAttempt: (attempt, position, moveResult) => {
        recenterAttemptCount = Math.max(recenterAttemptCount, attempt + 1)
        traceTransition('player_recenter_attempt', {
          sessionId,
          questionId: nextQuestionId,
          attempt: attempt + 1,
          apiSuccess: moveResult?.success ?? null,
          verified: Boolean(position && isInsideNeutralPosition(position.x, position.z)),
          actualX: position?.x ?? null,
          actualY: position?.y ?? null,
          actualZ: position?.z ?? null
        })
      }
    })
    const moved = result.verified
    samplePlayerPosition('after_bounded_poll', nextQuestionId)
    if (sequence !== transitionSequence) {
      recenterInFlightQuestionId = ''
      return
    }
    if (!moved) {
      enableManualRecenterFallback(nextQuestionId)
      return
    }
    voteState = stateAfterRecenter()
    recenterCompleted = true
    neutralReady = true
    updateUi({ voteState })
    traceTransition('player_recentered', { sessionId, questionId: nextQuestionId, state: voteState, attempts: result.attempts })
    sendReadyForNextQuestion(nextQuestionId)
    for (let retry = 1; retry <= 3; retry += 1) {
      timers.setTimeout(() => {
        if (voteState === 'CENTERED' && transitioningQuestionId === nextQuestionId) sendReadyForNextQuestion(nextQuestionId)
      }, retry * 800)
    }
  } catch (error) {
    traceTransition('player_recenter_failed', { sessionId, questionId: nextQuestionId, error: String(error) })
    enableManualRecenterFallback(nextQuestionId)
  } finally {
    try {
      InputModifier.deleteFrom(engine.PlayerEntity)
    } catch (error) {
      traceTransition('player_recenter_input_unlock_failed', { sessionId, questionId: nextQuestionId, error: String(error) })
    }
    traceTransition('player_recenter_input_unlocked', { sessionId, questionId: nextQuestionId })
    recenterInFlightQuestionId = ''
  }
}
function resetQuestionTransientState() {
  votePending = false
  answerLocked = false
  activePad = null
  pendingResultQuestionId = ''
  recenterRequested = false
  recenterCompleted = false
  recenterAttemptCount = 0
  inputDisabled = false
  neutralReady = true
  recenterInFlightQuestionId = ''
  lastAttemptedChoice = null
}

function completeAnswerTransition(result: {
  accepted: boolean
  questionId: string
  correct: boolean
  message: string
  correctAnswer: string
  score: number
  shadowLevel: number
  completed: boolean
  nextQuestionId: string
  shadowScore: number
  currentStreak: number
  bestStreak: number
  shadowRank: string
  masterStars: number
  milestoneBonus: number
  chainLost: boolean
  shadowAwakened: boolean
  becameMaster: boolean
  masterStarAwarded: boolean
  houseRank: number
  previousRank: string
  rankChanged: boolean
  lifetimeCorrect?: number
}) {
  const questionId = result.questionId || lastAttemptedQuestionId || parkState?.run?.lastAnswer?.questionId || ''
  if (!result.accepted) {
    votePending = false
    answerLocked = false
    activePad = null
    updateUi({ pendingChoice: '', answerFeedback: '' })
    setStatus(result.message)
    traceTransition('answer_result_rejected', { sessionId, questionId, message: result.message })
    return
  }
  if (lastCompletedAnswerQuestionId === questionId && (recenterRequested || Boolean(pendingResultQuestionId) || currentQuestionId !== questionId)) {
    traceTransition('answer_result_duplicate_ignored', { sessionId, questionId, nextQuestionId: result.nextQuestionId })
    return
  }

  lastCompletedAnswerQuestionId = questionId
  pendingResultQuestionId = questionId
  votePending = false
  answerLocked = true
  activePad = null
  inputDisabled = true
  recenterRequested = false
  recenterCompleted = false
  recenterAttemptCount = 0
  neutralReady = false
  feedbackUntilMs = Date.now() + 1800
  const scoreBefore = parkState?.run?.score ?? result.score
  voteState = stateAfterAcceptedAnswer(result.completed)
  traceTransition('answer_result_received', {
    accepted: true,
    correct: result.correct,
    message: result.message,
    scoreBefore,
    scoreAfter: result.score,
    nextQuestionId: result.nextQuestionId
  })

  const presentation = () => {
    const cue = result.becameMaster ? 'master' : result.rankChanged ? 'rank' : result.correct ? 'correct' : 'wrong'
    runNonBlockingPresentationSteps(
      [
        { name: 'audio', run: () => playPresentationMomentSound(momentAudioEntity, cue) },
        { name: 'energy', run: () => { if (result.correct) triggerShadowEnergy(lastAttemptedChoice ?? 'A', result.rankChanged || result.becameMaster) } },
        { name: 'shadow_reaction', run: () => { if (result.correct) queuePersonalShadowReaction() } },
        { name: 'rejection_flash', run: () => { if (!result.correct) pulseChoicePad(lastAttemptedChoice ?? 'A') } },
        { name: 'rank_presentation', run: () => { if (result.rankChanged) updateUi({ rankUpMessage: result.shadowRank }) } }
      ],
      (failure) => traceTransition('presentation_step_failed', { sessionId, step: failure.name, error: String(failure.error) })
    )
  }

  runCriticalAnswerTransition({
    clearLockingUi: () => {
      updateUi({ pendingChoice: '', status: 'RESULT RECEIVED' })
      traceTransition('locking_ui_cleared', { sessionId, questionId })
    },
    renderAuthoritativeResult: () => {
      updateUi({
        voteState,
        score: result.score,
        shadowScore: result.shadowScore,
        currentStreak: result.currentStreak,
        bestStreak: result.bestStreak,
        shadowRank: result.shadowRank,
        masterStars: result.masterStars,
        milestoneBonus: result.milestoneBonus,
        chainLost: result.chainLost,
        becameMaster: result.becameMaster,
        masterStarAwarded: result.masterStarAwarded,
        houseRank: result.houseRank,
        shadowLevel: result.shadowLevel,
        lifetimeCorrect: result.lifetimeCorrect ?? Math.floor((result.shadowScore ?? result.score) / 10),
        answerFeedback: result.message,
        correctAnswer: result.correctAnswer,
        nextQuestionId: result.nextQuestionId,
        pendingChoice: '',
        shadowAwakened: result.shadowAwakened
      })
      traceTransition('correctness_received', { sessionId, questionId, correct: result.correct, correctAnswer: result.correctAnswer })
      traceTransition('score_received', { sessionId, questionId, scoreBefore, scoreAfter: result.score, shadowScore: result.shadowScore })
      traceTransition('result_ui_set', { sessionId, questionId, correct: result.correct, feedback: result.message, nextQuestionId: result.nextQuestionId })
      setStatus(result.message)
      if (result.rankChanged) {
        updateUi({ rankUpMessage: result.shadowRank })
        timers.setTimeout(() => updateUi({ rankUpMessage: '' }), 1800)
      }
    },
    startRecenter: () => {
      if (result.nextQuestionId) {
        traceTransition('recenter_started', { sessionId, questionId: result.nextQuestionId, state: voteState })
        void beginRecenter(result.nextQuestionId).catch((error) => {
          traceTransition('recenter_failed', { sessionId, questionId: result.nextQuestionId, error: String(error) })
          enableManualRecenterFallback(result.nextQuestionId)
        })
      } else {
        traceTransition('recenter_missing_next_question', { sessionId, questionId })
        enableManualRecenterFallback(questionId)
      }
    },
    schedulePresentation: (task) => {
      timers.setTimeout(task, 0)
    },
    presentation
  })
}
function playMomentSound() {
  playPresentationMomentSound(momentAudioEntity)
}

export function setupClient() {
  trace('CLIENT_BOOT', { marker: BUILD_MARKER, atIso: new Date().toISOString() })
  trace('client_setup_started')
  setupUi()
  const presentationStartedAtMs = Date.now()
  trace('presentation_init_started', { expectedLiveSignPlanes: 3, endlessQuestionBankSize: CURATED_QUESTIONS.length })
  try {
    // Keep presentation startup bounded and observable. A visual initialization
    // problem must not prevent the room/session handlers below from registering.
    momentAudioEntity = createPresentationV2()
    trace('presentation_init_completed', {
      durationMs: Date.now() - presentationStartedAtMs,
      liveSignPlanes: 3
    })
  } catch (error) {
    momentAudioEntity = null
    trace('presentation_init_failed', { durationMs: Date.now() - presentationStartedAtMs, error: String(error) })
    console.error('SHADOW PARK presentation initialization failed', error)
  }
  engine.addSystem(scanChoiceFootprints)
  engine.addSystem(animateShadowVisuals)
  trace('static_scene_created', { visual: 'v2', worldText: false, triggerAreas: 0, choiceDetection: 'forgiving-visible-footprint-polling', ui: '2d' })

  room.onMessage('stateChanged', ({ stateJson, requestId, serverSentAtIso }) => {
    const receivedAtMs = Date.now()
    const receivedAtIso = new Date(receivedAtMs).toISOString()
    const requestTiming = pendingStateRequests.get(requestId)
    trace('STATE_CHANGED_RECEIVED', {
      sessionId,
      requestId,
      serverSentAtIso,
      clientReceivedAtIso: receivedAtIso,
      requestSentAtIso: requestTiming?.sentAtIso ?? '',
      requestRoundTripMs: requestTiming === undefined ? null : receivedAtMs - requestTiming.sentAtMs
    })
    trace('state_message_received', {
      requestId,
      serverSentAtIso,
      clientReceivedAtIso: receivedAtIso,
      requestSentAtIso: requestTiming?.sentAtIso ?? '',
      requestRoundTripMs: requestTiming === undefined ? null : receivedAtMs - requestTiming.sentAtMs
    })
    updateUi({ startupStage: 'STATE RECEIVED' })
    pendingStateRequests.delete(requestId)
    try {
      const nextState = parseState(JSON.parse(stateJson))
      if (nextState) {
        renderState(nextState, {
          requestId,
          requestSentAtIso: requestTiming?.sentAtIso ?? '',
          serverSentAtIso,
          receivedAtMs,
          receivedAtIso
        })
      }
    } catch (error) {
      console.error('SHADOW PARK received invalid state', error)
    }
  })

  room.onMessage('voteResult', ({ accepted, message }) => {
    votePending = false
    if (accepted || message.includes('already')) {
      voteState = 'VOTED'
      updateUi({ voteState })
    }
    if (accepted) playMomentSound()
    setStatus(message)
  })

  room.onMessage('answerResult', ({ accepted, questionId, correct, message, correctAnswer, score, shadowLevel, completed, nextQuestionId, shadowScore, currentStreak, bestStreak, shadowRank, previousRank, rankChanged, masterStars, milestoneBonus, chainLost, shadowAwakened, becameMaster, masterStarAwarded, houseRank }) => {
    completeAnswerTransition({
      accepted,
      questionId,
      correct,
      message,
      correctAnswer,
      score,
      shadowLevel,
      completed,
      nextQuestionId,
      shadowScore,
      currentStreak,
      bestStreak,
      shadowRank,
      masterStars,
      milestoneBonus,
      chainLost,
      shadowAwakened,
      becameMaster,
      masterStarAwarded,
      houseRank,
      previousRank,
      rankChanged
    })
  })

  room.onMessage('nextQuestionReady', ({ accepted, questionId }) => {
    if (!accepted || questionId !== transitioningQuestionId) {
      trace('next_question_ready_rejected_client', { sessionId, questionId, expectedQuestionId: transitioningQuestionId })
      if (questionId === transitioningQuestionId && voteState === 'CENTERED') sendReadyForNextQuestion(questionId)
      return
    }
    voteState = stateAfterNextQuestionReady()
    updateUi({ voteState, answerFeedback: '', correctAnswer: '', nextQuestionId: '', pendingChoice: '', shadowAwakened: false })
    feedbackUntilMs = 0
    setStatus('NEXT QUESTION')
    neutralReady = true
    traceTransition('next_question_enabled', { sessionId, questionId, state: voteState, padsEnabled: voteState === 'ARMED' })
    resetQuestionTransientState()
    traceTransition('question_transition_ready', { sessionId, questionId, finalState: 'READY', padsEnabled: true })
  })

  room.onMessage('restartResult', ({ accepted, message }) => {
    trace('restart_result_received', { sessionId, accepted, message })
    if (accepted) {
      personalShadowVisible = false
      resetQuestionTransientState()
      voteState = 'ARMED'
      updateUi({ voteState, completed: false, answerFeedback: '', correctAnswer: '', shadowAwakened: false, pendingChoice: '' })
    }
    setStatus(message)
  })

  room.onMessage('globalStateChanged', ({ stateJson }) => {
    try {
      const globalState = parseState(JSON.parse(stateJson))
      if (!globalState) return
      if (parkState) {
        parkState.countA = globalState.countA
        parkState.countB = globalState.countB
        parkState.totalPlayers = globalState.totalPlayers
        parkState.totalCompletions = globalState.totalCompletions
        parkState.houseMasters = globalState.houseMasters
      }
      updateUi({
        countA: globalState.countA,
        countB: globalState.countB,
        totalPlayers: globalState.totalPlayers,
        totalCompletions: globalState.totalCompletions,
        houseMasters: globalState.houseMasters ?? []
      })
      updateHouseMasterVisuals(globalState.houseMasters ?? [])
    } catch (error) {
      console.error('SHADOW PARK received invalid global state', error)
    }
  })

  room.onMessage('resonateResult', ({ accepted, message, shadowId }) => {
    updateUi({ resonateStatus: '', status: message })
    if (accepted) {
      playMomentSound()
      const root = shadowRootsById.get(shadowId)
      if (root) shadowPulseUntil.set(root, Date.now() + 900)
    }
  })

  room.onMessage('liveMoment', ({ kind }) => {
    updateUi({ liveMoment: kind === 'RESONATE' ? 'A shared choice echoes nearby.' : 'A different path crossed yours.' })
    timers.setTimeout(() => updateUi({ liveMoment: '' }), 2600)
  })

  function handleRoomReady(source: string, ready: boolean) {
    trace('HANDLE_ROOM_READY', { source, ready, alreadyReady: roomReady, lastRoomReadyState })
    if (lastRoomReadyState === ready) return
    lastRoomReadyState = ready
    trace('room_ready_changed', { source, ready })
    roomReady = ready
    if (!ready) {
      transitionSequence += 1
      transitioningQuestionId = ''
      sessionId = ''
      resetQuestionTransientState()
      currentQuestionId = ''
      lastCompletedAnswerQuestionId = ''
      neutralReady = false
      footprintChoice = null
      voteState = 'UNARMED'
      updateUi({ voteState, startupStage: 'CONNECTING' })
      setStatus(parkState ? 'Reconnecting to the park...' : 'Calling back the Shadows...')
      return
    }

    sessionId = 'session-' + Date.now() + '-' + sessionSequence++
    resetQuestionTransientState()
    lastCompletedAnswerQuestionId = ''
    neutralReady = false
    voteState = 'UNARMED'
    resonatedShadowIds.clear()
    updateUi({
      voteState,
      resonateStatus: '',
      liveMoment: '',
      entryHintVisible: true,
      pendingChoice: '',
      startupStage: 'WAITING FOR STATE'
    })
    updateUi({ voteState, hydrated: Boolean(parkState) })
    timers.setTimeout(() => updateUi({ entryHintVisible: false }), 8000)
    trace('SESSION_CREATED_SENT', { sessionId, source })
    trace('session_created', { sessionId })
    trace('initial_answer_state', { sessionId, state: voteState })
    void room.send('sessionCreated', { sessionId })
    if (!parkState) setStatus('Calling back the Shadows...')
    trace('REQUEST_STATE_SENT', { sessionId, reason: 'initial', source })
    requestStateSnapshot('initial')
    scheduleStartupRecovery()
  }

  room.onReady((ready) => {
    trace('ROOM_READY_CALLBACK', { ready })
    handleRoomReady('onReady', ready)
  })
  const isReadySnapshot = room.isReady()
  trace('ROOM_IS_READY_SNAPSHOT', { isReady: isReadySnapshot })
  if (isReadySnapshot) {
    handleRoomReady('isReadySnapshot', true)
  }

  let readyCheckTicks = 0
  const readyPollSystem = (dt: number) => {
    readyCheckTicks++
    if (!roomReady && room.isReady()) {
      trace('ROOM_READY_POLL_DETECTED', { readyCheckTicks })
      handleRoomReady('poll', true)
    }
    if (roomReady && parkState) {
      engine.removeSystem(readyPollSystem)
    }
  }
  engine.addSystem(readyPollSystem)

  createTriggerArea(
    Vector3.create(HOUSE_OF_MASTERS_ZONE.centerX, 1.2, HOUSE_OF_MASTERS_ZONE.centerZ),
    Vector3.create(HOUSE_OF_MASTERS_ZONE.scaleX, 2.5, HOUSE_OF_MASTERS_ZONE.scaleZ),
    () => {
      updateUi({ housePanelVisible: true })
    },
    () => {
      updateUi({ housePanelVisible: false })
    }
  )
}
