import {
  ColliderLayer,
  engine,
  Entity,
  Material,
  MeshRenderer,
  Transform,
  TriggerArea,
  triggerAreaEventsSystem
} from '@dcl/sdk/ecs'
import { Color4, Vector3 } from '@dcl/sdk/math'
import { room } from '../shared/messages'
import { Choice, ParkState, parseState, ShadowRecord } from '../shared/state'
import { setupUi, UiVoteState, updateUi, updateUiFromState } from './ui'

const NEUTRAL_CENTER = Vector3.create(8, 0.15, 6)
const NEUTRAL_SCALE = Vector3.create(6, 1.5, 4)
const CHOICE_A_CENTER = Vector3.create(4, 0.15, 12.5)
const CHOICE_B_CENTER = Vector3.create(12, 0.15, 12.5)
const CHOICE_SCALE = Vector3.create(6.75, 2, 6)
const CHOICES_START_Z = 8
const clientStartedAtMs = Date.now()

let parkState: ParkState | null = null
let votePending = false
let voteState: UiVoteState = 'UNARMED'
let sessionId = ''
let sessionSequence = 0
let requestSequence = 0
const pendingStateRequests = new Map<string, { sentAtMs: number; sentAtIso: string }>()
const renderedShadows: Entity[] = []

type StateTiming = {
  requestId: string
  requestSentAtIso: string
  serverSentAtIso: string
  receivedAtMs: number
  receivedAtIso: string
}

function trace(event: string, details: Record<string, unknown> = {}) {
  console.log(
    `[SHADOW_PARK_TIMING] ${JSON.stringify({
      side: 'client',
      event,
      atIso: new Date().toISOString(),
      elapsedMs: Date.now() - clientStartedAtMs,
      ...details
    })}`
  )
}

function makeBox(position: Vector3, scale: Vector3, color: Color4) {
  const entity = engine.addEntity()
  Transform.create(entity, { position, scale })
  MeshRenderer.setBox(entity)
  Material.setPbrMaterial(entity, { albedoColor: color, roughness: 0.9, metallic: 0 })
  return entity
}

function createStaticScene() {
  makeBox(Vector3.create(8, -0.15, 8), Vector3.create(16, 0.3, 16), Color4.create(0.025, 0.035, 0.07, 1))
  makeBox(Vector3.create(4, 0.02, 12.5), Vector3.create(6.5, 0.04, 6), Color4.create(0.12, 0.08, 0.24, 1))
  makeBox(Vector3.create(12, 0.02, 12.5), Vector3.create(6.5, 0.04, 6), Color4.create(0.03, 0.18, 0.24, 1))

  // The board is intentionally a solid, text-free monument. Dynamic question,
  // choice and status copy is rendered only through the official 2D UI.
  makeBox(Vector3.create(8, 2.6, 7), Vector3.create(10.5, 4.8, 0.6), Color4.create(0.02, 0.025, 0.05, 1))
  makeBox(Vector3.create(8, 2.6, 6.65), Vector3.create(9.5, 0.12, 0.12), Color4.create(0.18, 0.1, 0.42, 1))
  makeBox(Vector3.create(8, 2.6, 7.35), Vector3.create(9.5, 0.12, 0.12), Color4.create(0.06, 0.28, 0.4, 1))
  // Separate opaque rear surface: no reverse face can expose text because the
  // board contains no world-space text at all.
  makeBox(Vector3.create(8, 2.6, 7.48), Vector3.create(10.5, 4.8, 0.2), Color4.create(0.02, 0.025, 0.05, 1))
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
      if (voteState === 'UNARMED') setStatus('Neutral pad: leave toward A or B to arm your choice.')
    },
    () => {
      const player = Transform.getOrNull(engine.PlayerEntity)
      const towardChoices = Boolean(player && player.position.z > CHOICES_START_Z)
      trace('neutral_exit', { sessionId, towardChoices })
      void room.send('neutralExited', { sessionId, towardChoices })
      if (voteState !== 'UNARMED' || !towardChoices) {
        if (voteState === 'UNARMED' && !towardChoices) setStatus('Return to the neutral pad, then leave toward A or B.')
        return
      }
      voteState = 'ARMED'
      updateUi({ voteState })
      trace('vote_armed', { sessionId, state: voteState })
      setStatus('Choice armed — enter A or B to leave one Shadow.')
    }
  )

  createTriggerArea(
    CHOICE_A_CENTER,
    CHOICE_SCALE,
    () => handleChoiceTrigger('A'),
    () => trace('choice_trigger_exit', { sessionId, choice: 'A' })
  )
  createTriggerArea(
    CHOICE_B_CENTER,
    CHOICE_SCALE,
    () => handleChoiceTrigger('B'),
    () => trace('choice_trigger_exit', { sessionId, choice: 'B' })
  )
}

function shadowPosition(shadow: ShadowRecord): Vector3 {
  const sideIndex = shadow.slot % 15
  const column = sideIndex % 5
  const row = Math.floor(sideIndex / 5)
  const xBase = shadow.choice === 'A' ? 1.9 : 9.9
  return Vector3.create(xBase + column * 1.05, 0.1, 11 + row * 1.3)
}

function createShadow(shadow: ShadowRecord) {
  const root = engine.addEntity()
  const color = shadow.choice === 'A' ? Color4.create(0.52, 0.32, 0.85, 0.78) : Color4.create(0.12, 0.62, 0.78, 0.78)
  Transform.create(root, { position: shadowPosition(shadow) })

  const body = engine.addEntity()
  Transform.create(body, { parent: root, position: Vector3.create(0, 0.72, 0), scale: Vector3.create(0.34, 0.9, 0.2) })
  MeshRenderer.setCylinder(body, 0.55, 0.32)
  Material.setPbrMaterial(body, {
    albedoColor: color,
    emissiveColor: Color4.create(color.r * 0.45, color.g * 0.45, color.b * 0.45, 1),
    emissiveIntensity: 2
  })

  const head = engine.addEntity()
  Transform.create(head, { parent: root, position: Vector3.create(0, 1.48, 0), scale: Vector3.create(0.38, 0.38, 0.25) })
  MeshRenderer.setSphere(head)
  Material.setPbrMaterial(head, {
    albedoColor: color,
    emissiveColor: Color4.create(color.r * 0.45, color.g * 0.45, color.b * 0.45, 1),
    emissiveIntensity: 2
  })

  renderedShadows.push(root, body, head)
}

function clearShadows() {
  while (renderedShadows.length) {
    const entity = renderedShadows.pop()
    if (entity) engine.removeEntity(entity)
  }
}

function renderState(state: ParkState, timing: StateTiming) {
  const renderStartedAtMs = Date.now()
  parkState = state
  updateUiFromState(state)
  clearShadows()
  for (const shadow of state.shadows) createShadow(shadow)
  if (!votePending && voteState !== 'VOTED') setStatus('Walk to the neutral pad, then leave toward A or B to answer.')
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
    shadowEntities: state.shadows.length * 3
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
  trace('choice_trigger_enter', { sessionId, choice, state: voteState })
  if (votePending) return

  trace('vote_intent_created', { sessionId, choice, state: voteState })
  votePending = true
  if (voteState === 'UNARMED') {
    setStatus('That choice is not armed — return to the neutral pad first.')
  } else if (voteState === 'ARMED') {
    setStatus('Leaving your Shadow…')
  } else {
    setStatus('Checking your existing Shadow…')
  }
  void room.send('castVote', { choice })
}

export function setupClient() {
  trace('client_setup_started')
  setupUi()
  createStaticScene()
  createInteractionAreas()
  trace('static_scene_created', { worldText: false, triggerAreas: 3, ui: '2d' })

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
      if (nextState)
        renderState(nextState, {
          requestId,
          requestSentAtIso: requestTiming?.sentAtIso ?? '',
          serverSentAtIso,
          receivedAtMs,
          receivedAtIso
        })
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
    setStatus(message)
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

    sessionId = `session-${Date.now()}-${sessionSequence++}`
    votePending = false
    voteState = 'UNARMED'
    updateUi({ voteState, hydrated: Boolean(parkState) })
    trace('session_created', { sessionId })
    trace('initial_vote_state', { sessionId, state: voteState })
    void room.send('sessionCreated', { sessionId })
    if (!parkState) setStatus('Calling back the Shadows…')
    const requestId = `initial-${Date.now()}-${requestSequence++}`
    const sentAtMs = Date.now()
    const sentAtIso = new Date(sentAtMs).toISOString()
    pendingStateRequests.set(requestId, { sentAtMs, sentAtIso })
    trace('state_request_sent', { requestId, requestSentAtIso: sentAtIso })
    void room.send('requestState', { requestId })
  })

}
