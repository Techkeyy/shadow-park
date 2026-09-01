import {
  ColliderLayer,
  AudioSource,
  engine,
  Entity,
  GltfContainer,
  Material,
  MeshRenderer,
  Transform,
  TriggerArea,
  triggerAreaEventsSystem
} from '@dcl/sdk/ecs'
import { Color4, Quaternion, Vector3 } from '@dcl/sdk/math'
import { room } from '../shared/messages'
import { Choice, CURATED_QUESTIONS, MAX_VISIBLE_SHADOWS, ParkState, parseState, ShadowRecord } from '../shared/state'
import { CHOICE_A_ZONE, CHOICE_B_ZONE, ChoiceZone, MEMORY_GARDEN_ZONE, QUESTION_LANDMARK, zoneForChoice } from '../shared/zones'
import { setupUi, UiVoteState, updateUi, updateUiFromState } from './ui'
import { sendChoiceIntent } from './vote-intent'

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
const renderedShadows: Entity[] = []
const shadowTriggerEntities: Entity[] = []
const shadowRootsById = new Map<string, Entity>()
const shadowMotion = new Map<Entity, { baseY: number; phase: number }>()
const shadowPulseUntil = new Map<Entity, number>()
const resonatedShadowIds = new Set<string>()
let motionClock = 0
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

function makeCylinder(position: Vector3, scale: Vector3, color: Color4, radiusBottom = 0.5, radiusTop = 0.5) {
  const entity = engine.addEntity()
  Transform.create(entity, { position, scale })
  MeshRenderer.setCylinder(entity, radiusBottom, radiusTop)
  Material.setPbrMaterial(entity, { albedoColor: color, roughness: 0.78, metallic: 0 })
  return entity
}

function makeGltf(src: string, position: Vector3, scale: Vector3, rotation?: Quaternion) {
  const entity = engine.addEntity()
  GltfContainer.create(entity, { src })
  Transform.create(entity, { position, scale, ...(rotation ? { rotation } : {}) })
  return entity
}

function zoneCenter(zone: ChoiceZone) {
  return Vector3.create(zone.centerX, zone.centerY, zone.centerZ)
}

function zoneScale(zone: ChoiceZone) {
  return Vector3.create(zone.scaleX, zone.scaleY, zone.scaleZ)
}

const boardQuestionTextures = CURATED_QUESTIONS.map((_, index) => `assets/scene/signs/board-question-${index + 1}.png`)
const choiceTextures = {
  A: 'assets/scene/signs/choice-a.png',
  B: 'assets/scene/signs/choice-b.png'
} as const

let questionSurface: Entity | null = null

function createSurface(position: Vector3, scale: Vector3, textureSrc: string) {
  const entity = engine.addEntity()
  // The front of each sign faces the south spawn. The opaque monument behind
  // it gives the rear a deliberate, non-text surface on mobile.
  Transform.create(entity, {
    position,
    scale,
    rotation: Quaternion.fromEulerDegrees(0, 180, 0)
  })
  MeshRenderer.setPlane(entity)
  Material.setBasicMaterial(entity, {
    texture: Material.Texture.Common({ src: textureSrc }),
    diffuseColor: Color4.create(1, 1, 1, 1),
    castShadows: false
  })
  return entity
}

function textureForState(state: ParkState) {
  const index = CURATED_QUESTIONS.findIndex((question) => question.question === state.question)
  return boardQuestionTextures[index >= 0 ? index : 0]
}

function updateQuestionSurface(state: ParkState) {
  if (!questionSurface) return
  Material.setBasicMaterial(questionSurface, {
    texture: Material.Texture.Common({ src: textureForState(state) }),
    diffuseColor: Color4.create(1, 1, 1, 1),
    castShadows: false
  })
}

function createStaticScene() {
  const world = Color4.create(0.018, 0.025, 0.06, 1)
  const plaza = Color4.create(0.035, 0.05, 0.11, 1)
  makeBox(Vector3.create(8, -0.15, 8), Vector3.create(16, 0.3, 16), world)
  makeBox(Vector3.create(8, 0.01, 7.6), Vector3.create(9.4, 0.04, 10.8), plaza)
  makeBox(Vector3.create(8, 0.03, 3.8), Vector3.create(4.8, 0.06, 2.6), Color4.create(0.05, 0.07, 0.14, 1))
  makeCylinder(Vector3.create(8, 0.08, 7.9), Vector3.create(1.3, 0.16, 1.3), Color4.create(0.07, 0.08, 0.18, 1), 0.62, 0.62)

  createQuestionLandmark()
  createChoicePavilion(CHOICE_A_ZONE, Color4.create(0.5, 0.28, 0.82, 1), 'A')
  createChoicePavilion(CHOICE_B_ZONE, Color4.create(0.14, 0.66, 0.76, 1), 'B')

  const pathA = Color4.create(0.46, 0.29, 0.78, 0.9)
  const pathB = Color4.create(0.15, 0.64, 0.74, 0.9)
  for (const z of [7.5, 8.35, 9.2, 10.05]) {
    makeBox(Vector3.create(4, 0.09, z), Vector3.create(1.35, 0.05, 0.12), pathA)
    makeBox(Vector3.create(12, 0.09, z), Vector3.create(1.35, 0.05, 0.12), pathB)
  }
  makeBox(Vector3.create(8, 0.08, 8.55), Vector3.create(0.08, 0.04, 2.2), Color4.create(0.2, 0.22, 0.35, 0.6))

  createMemoryGarden()
  createAtmosphere()
  momentAudioEntity = engine.addEntity()
  Transform.create(momentAudioEntity, { position: Vector3.create(8, 1.2, 8) })
  AudioSource.create(momentAudioEntity, {
    audioClipUrl: 'assets/scene/shadow-chime.wav',
    playing: false,
    loop: false,
    volume: 0.18,
    global: true
  })
}

function createQuestionLandmark() {
  const center = Vector3.create(QUESTION_LANDMARK.centerX, QUESTION_LANDMARK.centerY, QUESTION_LANDMARK.centerZ)
  const frame = Color4.create(0.16, 0.1, 0.32, 1)
  const face = Color4.create(0.03, 0.045, 0.1, 1)
  makeBox(Vector3.create(center.x, 0.28, center.z), Vector3.create(7.2, 0.5, 1.35), frame)
  makeBox(center, Vector3.create(QUESTION_LANDMARK.width, QUESTION_LANDMARK.height, QUESTION_LANDMARK.depth), face)
  makeBox(Vector3.create(center.x - 2.92, center.y, center.z - 0.48), Vector3.create(0.22, 3.9, 0.24), frame)
  makeBox(Vector3.create(center.x + 2.92, center.y, center.z - 0.48), Vector3.create(0.22, 3.9, 0.24), frame)
  makeBox(Vector3.create(center.x, center.y + 2.0, center.z - 0.48), Vector3.create(6.0, 0.22, 0.24), frame)
  makeBox(Vector3.create(center.x, center.y - 2.0, center.z - 0.48), Vector3.create(6.0, 0.22, 0.24), frame)
  makeBox(Vector3.create(center.x, center.y - 2.3, center.z - 0.05), Vector3.create(4.8, 0.16, 0.16), Color4.create(0.58, 0.36, 0.88, 1))
  makeBox(Vector3.create(center.x, center.y - 2.3, center.z + 0.3), Vector3.create(4.8, 0.16, 0.16), Color4.create(0.16, 0.62, 0.74, 1))
  makeGltf(
    'assets/scene/genesis/core-art.glb',
    Vector3.create(center.x, 0.5, center.z + 0.62),
    Vector3.create(0.055, 0.055, 0.055),
    Quaternion.fromEulerDegrees(0, 180, 0)
  )
  // The rear is a separate opaque face. No world-space text is placed there.
  makeBox(Vector3.create(center.x, center.y, center.z + 0.52), Vector3.create(QUESTION_LANDMARK.width, QUESTION_LANDMARK.height, 0.22), face)
  questionSurface = createSurface(
    Vector3.create(center.x, center.y, center.z - QUESTION_LANDMARK.depth / 2 - 0.035),
    Vector3.create(5.72, 3.86, 1),
    boardQuestionTextures[0]
  )
  const lamp = Color4.create(0.92, 0.78, 0.46, 1)
  for (const x of [5.15, 10.85]) {
    makeCylinder(Vector3.create(x, 1.0, center.z - 0.75), Vector3.create(0.12, 1.7, 0.12), frame, 0.5, 0.5)
    makeCylinder(Vector3.create(x, 1.92, center.z - 0.75), Vector3.create(0.22, 0.22, 0.22), lamp, 0.5, 0.5)
  }
}

function createChoicePavilion(zone: ChoiceZone, accent: Color4, choice: Choice) {
  const x = zone.centerX
  const z = zone.centerZ
  const pad = choice === 'A' ? Color4.create(0.1, 0.06, 0.2, 1) : Color4.create(0.03, 0.14, 0.18, 1)
  const dark = Color4.create(0.035, 0.045, 0.1, 1)
  makeBox(Vector3.create(x, 0.06, z), Vector3.create(zone.scaleX, 0.12, zone.scaleZ), pad)
  makeBox(Vector3.create(x - 1.65, 1.12, z + 0.85), Vector3.create(0.26, 2.25, 0.35), accent)
  makeBox(Vector3.create(x + 1.65, 1.12, z + 0.85), Vector3.create(0.26, 2.25, 0.35), accent)
  makeBox(Vector3.create(x, 2.22, z + 0.85), Vector3.create(3.55, 0.26, 0.35), accent)
  makeBox(Vector3.create(x, 0.42, z + 1.3), Vector3.create(3.15, 0.16, 0.22), dark)
  const sign = createSurface(Vector3.create(x, 1.2, z - 1.18), Vector3.create(2.85, 1.9, 1), choiceTextures[choice])
  void sign
  makeGltf(
    'assets/scene/genesis/message-booth.glb',
    Vector3.create(x, 0.08, z + 1.02),
    Vector3.create(0.04, 0.04, 0.04),
    Quaternion.fromEulerDegrees(0, 180, 0)
  )

  if (choice === 'A') {
    // Three ascending beacons make the space destination readable without a
    // perspective-distorted floor letter.
    for (const [offset, height] of [[-0.8, 0.55], [0, 0.95], [0.8, 1.35]]) {
      makeCylinder(Vector3.create(x + offset, height / 2, z - 0.1), Vector3.create(0.18, height, 0.18), accent, 0.55, 0.08)
    }
  } else {
    // Low parallel ripples give the ocean destination a grounded silhouette.
    for (const offset of [-0.7, 0, 0.7]) {
      makeBox(Vector3.create(x, 0.18, z - 0.15 + offset), Vector3.create(2.7, 0.08, 0.1), accent)
    }
  }
}

function createAtmosphere() {
  const trunk = Color4.create(0.1, 0.07, 0.14, 1)
  const canopy = Color4.create(0.06, 0.14, 0.18, 1)
  const lamp = Color4.create(0.72, 0.62, 0.9, 0.9)
  const placements = [
    [1.15, 0.85, 2.1],
    [14.85, 0.85, 2.1],
    [1.15, 0.85, 14.7],
    [14.85, 0.85, 14.7]
  ]
  for (const [x, y, z] of placements) {
    makeCylinder(Vector3.create(x, y, z), Vector3.create(0.28, 1.7, 0.28), trunk, 0.6, 0.42)
    makeCylinder(Vector3.create(x, y + 1.05, z), Vector3.create(0.9, 0.9, 0.9), canopy, 0.52, 0.18)
  }
  for (const [x, z] of [[6.3, 4.3], [9.7, 4.3], [6.0, 13.55], [10.0, 13.55]]) {
    makeCylinder(Vector3.create(x, 0.55, z), Vector3.create(0.07, 1.1, 0.07), trunk, 0.45, 0.45)
    makeCylinder(Vector3.create(x, 1.2, z), Vector3.create(0.16, 0.16, 0.16), lamp, 0.55, 0.55)
  }
  for (const [x, z, scale] of [[2.0, 6.3, 0.55], [14.0, 6.3, 0.55], [2.0, 11.9, 0.42], [14.0, 11.9, 0.42]]) {
    makeCylinder(Vector3.create(x, scale / 2, z), Vector3.create(scale, scale, scale), Color4.create(0.08, 0.1, 0.16, 1), 0.58, 0.28)
  }
}

function createMemoryGarden() {
  const center = Vector3.create(MEMORY_GARDEN_ZONE.centerX, 0.05, MEMORY_GARDEN_ZONE.centerZ)
  const frame = Color4.create(0.22, 0.16, 0.34, 1)
  makeBox(center, Vector3.create(5.2, 0.1, 2.1), Color4.create(0.035, 0.055, 0.1, 1))
  makeBox(Vector3.create(center.x - 2.15, 1.1, center.z), Vector3.create(0.28, 2.2, 0.3), frame)
  makeBox(Vector3.create(center.x + 2.15, 1.1, center.z), Vector3.create(0.28, 2.2, 0.3), frame)
  makeBox(Vector3.create(center.x, 2.15, center.z), Vector3.create(4.6, 0.24, 0.3), frame)
  for (const offset of [-1.45, -0.48, 0.48, 1.45]) {
    makeBox(Vector3.create(center.x + offset, 0.36, center.z + 0.3), Vector3.create(0.34, 0.58, 0.36), Color4.create(0.12, 0.22, 0.27, 1))
    makeGltf(
      'assets/scene/genesis/memory-stone.glb',
      Vector3.create(center.x + offset, 0.72, center.z + 0.3),
      Vector3.create(2.2, 2.2, 2.2)
    )
  }
  // Approved Genesis Plaza assets give the garden a recognizable architectural
  // kiosk and a quiet crystal focal point without inflating the mobile budget.
  makeGltf(
    'assets/scene/genesis/message-booth.glb',
    Vector3.create(center.x + 1.35, 0.1, center.z + 0.55),
    Vector3.create(0.06, 0.06, 0.06),
    Quaternion.fromEulerDegrees(0, 180, 0)
  )
  makeGltf(
    'assets/scene/genesis/core-art.glb',
    Vector3.create(center.x - 1.35, 0.58, center.z + 0.38),
    Vector3.create(0.12, 0.12, 0.12),
    Quaternion.fromEulerDegrees(0, 180, 0)
  )
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

function shadowPosition(shadow: ShadowRecord): Vector3 {
  const sideIndex = shadow.slot % 10
  const column = sideIndex % 5
  const row = Math.floor(sideIndex / 5)
  const zone = zoneForChoice(shadow.choice)
  const xBase = zone.centerX - 1.65
  const zBase = zone.centerZ - 0.15
  return Vector3.create(xBase + column * 0.82, 0.1, zBase + row * 0.82)
}

function createShadow(shadow: ShadowRecord) {
  const root = engine.addEntity()
  const color = shadow.choice === 'A' ? Color4.create(0.74, 0.62, 1, 0.84) : Color4.create(0.6, 0.9, 1, 0.84)
  Transform.create(root, { position: shadowPosition(shadow) })
  shadowRootsById.set(shadow.id, root)
  shadowMotion.set(root, { baseY: 0.1, phase: shadow.slot * 0.7 })

  const aura = engine.addEntity()
  Transform.create(aura, { parent: root, position: Vector3.create(0, 0.35, 0), scale: Vector3.create(0.62, 0.12, 0.62) })
  MeshRenderer.setCylinder(aura, 0.62, 0.45)
  Material.setPbrMaterial(aura, {
    albedoColor: Color4.create(color.r, color.g, color.b, 0.22),
    emissiveColor: Color4.create(color.r * 0.4, color.g * 0.4, color.b * 0.4, 1),
    emissiveIntensity: 1.5,
    transparencyMode: 2,
    roughness: 1,
    metallic: 0
  })

  const body = engine.addEntity()
  Transform.create(body, { parent: root, position: Vector3.create(0, 0.82, 0), scale: Vector3.create(0.34, 1.02, 0.2) })
  MeshRenderer.setCylinder(body, 0.55, 0.3)
  Material.setPbrMaterial(body, {
    albedoColor: color,
    emissiveColor: Color4.create(color.r * 0.45, color.g * 0.45, color.b * 0.45, 1),
    emissiveIntensity: 2,
    transparencyMode: 2,
    roughness: 1,
    metallic: 0
  })

  const head = engine.addEntity()
  Transform.create(head, { parent: root, position: Vector3.create(0, 1.62, 0), scale: Vector3.create(0.38, 0.38, 0.25) })
  MeshRenderer.setSphere(head)
  Material.setPbrMaterial(head, {
    albedoColor: color,
    emissiveColor: Color4.create(color.r * 0.45, color.g * 0.45, color.b * 0.45, 1),
    emissiveIntensity: 2,
    transparencyMode: 2,
    roughness: 1,
    metallic: 0
  })

  renderedShadows.push(root, aura, body, head)
  const trigger = createTriggerArea(
    shadowPosition(shadow),
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
  while (renderedShadows.length) {
    const entity = renderedShadows.pop()
    if (entity) engine.removeEntity(entity)
  }
  shadowRootsById.clear()
  shadowMotion.clear()
  shadowPulseUntil.clear()
}

function animateShadows(deltaTime: number) {
  motionClock += deltaTime
  const now = Date.now()
  for (const [root, motion] of shadowMotion) {
    const transform = Transform.getMutable(root)
    const pulse = shadowPulseUntil.get(root)
    const pulseStrength = pulse && pulse > now ? 0.12 : 0
    transform.position.y = motion.baseY + Math.sin(motionClock * 1.4 + motion.phase) * 0.035
    transform.scale = Vector3.create(1 + pulseStrength, 1 + pulseStrength, 1 + pulseStrength)
  }
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
    shadowEntities: visibleShadows.length * 3
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
    // Choice triggers can fire during connection/spawn before the player has
    // deliberately left the neutral pad. Never queue a vote in that state: a
    // delayed message must not become an accidental vote after arming.
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
  if (momentAudioEntity) AudioSource.playSound(momentAudioEntity, 'assets/scene/shadow-chime.wav', true)
}

export function setupClient() {
  trace('client_setup_started')
  setupUi()
  createStaticScene()
  createInteractionAreas()
  engine.addSystem(animateShadows)
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

    sessionId = `session-${Date.now()}-${sessionSequence++}`
    votePending = false
    voteState = 'UNARMED'
    resonatedShadowIds.clear()
    updateUi({ voteState, memoryVisible: false, resonateStatus: '', liveMoment: '' })
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
