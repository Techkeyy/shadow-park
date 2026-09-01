import { ColliderLayer, engine, Entity, Transform, TriggerArea, triggerAreaEventsSystem } from '@dcl/sdk/ecs'
import { Vector3 } from '@dcl/sdk/math'
import { room } from '../shared/messages'
import { Choice, MAX_VISIBLE_SHADOWS, ParkState, parseState, ShadowRecord } from '../shared/state'
import { CHOICE_A_ZONE, CHOICE_B_ZONE, ChoiceZone, MEMORY_GARDEN_ZONE, zoneForChoice } from '../shared/zones'
import { setupUi, UiVoteState, updateUi, updateUiFromState } from './ui'
import { sendChoiceIntent } from './vote-intent'
import {
  animateShadowVisuals,
  clearShadowVisuals,
  createPresentationV2,
  createShadowVisual,
  playMomentSound as playPresentationMomentSound,
  shadowPulseUntil,
  shadowRootsById,
  updateQuestionSurface
} from './presentation-v2'

const NEUTRAL_CENTER = Vector3.create(8, 0.15, 6)
const NEUTRAL_SCALE = Vector3.create(6, 1.5, 4)
const CHOICES_START_Z = 8
const clientStartedAtMs = Date.now()

let parkState: ParkState | null = null
let votePending = false
let voteState: UiVoteState = 'UNARMED'
let sessionId = ''
let sessionSequence = 0
let requestSequence = 0
const pendingStateRequests = new Map<string, { sentAtMs: number; sentAtIso: string }>()
const shadowTriggerEntities: Entity[] = []
const resonatedShadowIds = new Set<string>()
let momentAudioEntity: Entity | null = null

type StateTiming = {
  requestId: string
  requestSentAtIso: string
  serverSentAtIso: string
  receivedAtMs: number
  receivedAtIso: string
}

function trace(event: string, details: Record<string, unknown> = {}) {
  console.log(
    '[SHADOW_PARK_TIMING] ' +
      JSON.stringify({
        side: 'client',
        event,
        atIso: new Date().toISOString(),
        elapsedMs: Date.now() - clientStartedAtMs,
        ...details
      })
  )
}

function zoneCenter(zone: ChoiceZone) {
  return Vector3.create(zone.centerX, zone.centerY, zone.centerZ)
}

function zoneScale(zone: ChoiceZone) {
  return Vector3.create(zone.scaleX, zone.scaleY, zone.scaleZ)
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

function createInteractionAreas() {
  createTriggerArea(
    NEUTRAL_CENTER,
    NEUTRAL_SCALE,
    () => {
      trace('neutral_enter', { sessionId })
      void room.send('neutralEntered', { sessionId })
      if (voteState === 'UNARMED') setStatus('Center reached. Walk toward A or B.')
    },
    () => {
      const player = Transform.getOrNull(engine.PlayerEntity)
      const towardChoices = Boolean(player && player.position.z > CHOICES_START_Z)
      trace('neutral_exit', { sessionId, towardChoices })
      void room.send('neutralExited', { sessionId, towardChoices })
      if (voteState !== 'UNARMED' || !towardChoices) {
        if (voteState === 'UNARMED' && !towardChoices) setStatus('Start from the center, then choose a side.')
        return
      }
      voteState = 'ARMED'
      updateUi({ voteState })
      trace('vote_armed', { sessionId, state: voteState })
      setStatus('Choose a side: walk to A or B.')
    }
  )

  createTriggerArea(
    zoneCenter(CHOICE_A_ZONE),
    zoneScale(CHOICE_A_ZONE),
    () => handleChoiceTrigger(CHOICE_A_ZONE.choice),
    () => trace('choice_trigger_exit', { sessionId, choice: CHOICE_A_ZONE.choice, zoneId: CHOICE_A_ZONE.id })
  )
  createTriggerArea(
    zoneCenter(CHOICE_B_ZONE),
    zoneScale(CHOICE_B_ZONE),
    () => handleChoiceTrigger(CHOICE_B_ZONE.choice),
    () => trace('choice_trigger_exit', { sessionId, choice: CHOICE_B_ZONE.choice, zoneId: CHOICE_B_ZONE.id })
  )
  createTriggerArea(
    Vector3.create(MEMORY_GARDEN_ZONE.centerX, MEMORY_GARDEN_ZONE.centerY, MEMORY_GARDEN_ZONE.centerZ),
    Vector3.create(MEMORY_GARDEN_ZONE.scaleX, MEMORY_GARDEN_ZONE.scaleY, MEMORY_GARDEN_ZONE.scaleZ),
    () => updateUi({ memoryVisible: true }),
    () => updateUi({ memoryVisible: false })
  )
}

function createShadow(shadow: ShadowRecord) {
  const { position } = createShadowVisual(shadow)
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
  parkState = state
  updateQuestionSurface(state)
  updateUiFromState(state)
  const previousShadowIds = new Set(shadowRootsById.keys())
  clearShadows()
  const visibleShadows = state.shadows.slice(-MAX_VISIBLE_SHADOWS)
  for (const shadow of visibleShadows) createShadow(shadow)
  const newest = visibleShadows[visibleShadows.length - 1]
  if (newest && !previousShadowIds.has(newest.id)) {
    const root = shadowRootsById.get(newest.id)
    if (root) shadowPulseUntil.set(root, Date.now() + 900)
  }
  if (!votePending && voteState === 'UNARMED') setStatus('Start from the center, then choose a side.')
  if (!votePending && voteState === 'ARMED') setStatus('Choose a side: walk to A or B.')
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
  const decision = sendChoiceIntent(voteState, votePending, choice, (intent) => {
    void room.send('castVote', { choice: intent })
  })
  if (!decision.send) {
    if (decision.reason === 'unarmed') {
      trace('vote_intent_ignored_unarmed', { sessionId, choice, state: voteState })
      setStatus('Start from the center, then choose a side.')
    }
    return
  }

  trace('vote_intent_created', { sessionId, choice, state: voteState })
  votePending = decision.nextVotePending
  if (voteState === 'ARMED') {
    setStatus('Leaving your Shadow…')
  } else {
    setStatus('Checking your existing Shadow…')
  }
}

function playMomentSound() {
  playPresentationMomentSound(momentAudioEntity)
}

export function setupClient() {
  trace('client_setup_started')
  setupUi()
  momentAudioEntity = createPresentationV2()
  createInteractionAreas()
  engine.addSystem(animateShadowVisuals)
  trace('static_scene_created', { visual: 'v2', worldText: false, triggerAreas: 4, ui: '2d' })

  room.onMessage('stateChanged', ({ stateJson, requestId, serverSentAtIso }) => {
    const receivedAtMs = Date.now()
    const receivedAtIso = new Date(receivedAtMs).toISOString()
    const requestTiming = pendingStateRequests.get(requestId)
    trace('state_message_received', {
      requestId,
      serverSentAtIso,
      clientReceivedAtIso: receivedAtIso,
      requestSentAtIso: requestTiming?.sentAtIso ?? '',
      requestRoundTripMs: requestTiming === undefined ? null : receivedAtMs - requestTiming.sentAtMs
    })
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
    setTimeout(() => updateUi({ liveMoment: '' }), 2600)
  })

  room.onReady((ready) => {
    trace('room_ready_changed', { ready })
    if (!ready) {
      sessionId = ''
      votePending = false
      voteState = 'UNARMED'
      updateUi({ voteState })
      setStatus(parkState ? 'Reconnecting to the park…' : 'Calling back the Shadows…')
      return
    }

    sessionId = 'session-' + Date.now() + '-' + sessionSequence++
    votePending = false
    voteState = 'UNARMED'
    resonatedShadowIds.clear()
    updateUi({ voteState, memoryVisible: false, resonateStatus: '', liveMoment: '' })
    updateUi({ voteState, hydrated: Boolean(parkState) })
    trace('session_created', { sessionId })
    trace('initial_vote_state', { sessionId, state: voteState })
    void room.send('sessionCreated', { sessionId })
    if (!parkState) setStatus('Calling back the Shadows…')
    const requestId = 'initial-' + Date.now() + '-' + requestSequence++
    const sentAtMs = Date.now()
    const sentAtIso = new Date(sentAtMs).toISOString()
    pendingStateRequests.set(requestId, { sentAtMs, sentAtIso })
    trace('state_request_sent', { requestId, requestSentAtIso: sentAtIso })
    void room.send('requestState', { requestId })
  })
}
