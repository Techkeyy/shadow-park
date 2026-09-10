import { AudioSource, AvatarShape, Entity, Material, MeshRenderer, Transform, VisibilityComponent, engine } from '@dcl/sdk/ecs'
import { Color4, Quaternion, Vector3 } from '@dcl/sdk/math'
import { AvatarSnapshot, Choice, CURATED_QUESTIONS, ParkState, QUIZ_QUESTIONS, ShadowRecord, personalShadowBaseScale, questionById } from '../shared/state'
import { updateUi } from './ui'
import {
  CHOICE_A_ZONE,
  CHOICE_B_ZONE,
  CHOICE_SIGN_FRONT_OFFSET,
  HOUSE_OF_MASTERS_ZONE,
  PERSONAL_SHADOW_LAYOUT,
  QUESTION_LANDMARK,
  SHADOW_GROUP_COLUMNS,
  SHADOW_GROUP_ROWS,
  zoneForChoice
} from '../shared/zones'
import {
  ENERGY_ARC_HEIGHT,
  ENERGY_FLIGHT_DURATION_MS,
  ENERGY_TRAIL_CAPACITY,
  createBoundedPool,
  createSingleton,
  energyArcPoint
} from './stage2-feedback'

// Production signage uses the pinned SDK's proven plane + Basic textured-material path.
// The old custom GLB panels remain as historical artifacts, but are not referenced by the live presentation.
const BOARD_PANEL_TEXTURES = CURATED_QUESTIONS.map((_, index) => 'assets/scene/signs/board-question-' + (index + 1) + '.png')
const choiceTexturePath = (choice: Choice, index: number) =>
  'assets/scene/signs/choice-' + choice.toLowerCase() + '-' + String(index + 1).padStart(2, '0') + '.png'

const QUESTION_CENTER = Vector3.create(QUESTION_LANDMARK.centerX, 3.15, QUESTION_LANDMARK.centerZ)
const QUESTION_BODY_DEPTH = 1.1
const QUESTION_FRONT_Z = QUESTION_LANDMARK.centerZ - QUESTION_BODY_DEPTH / 2 - 0.05

// Keep one reusable plane per live sign. The endless bank is data, not a
// reason to instantiate hundreds of textured entities during mobile startup.
let questionSurface: Entity | null = null
let choiceSurfaces: Record<Choice, Entity | null> = { A: null, B: null }
const choicePadEntities: Record<Choice, Entity[]> = { A: [], B: [] }
const choicePadBaseScales = new Map<Entity, Vector3>()
const choicePadPulseUntil = new Map<Choice, number>()
const choicePadFlashUntil = new Map<Choice, number>()

const renderedShadowEntities: Entity[] = []
const personalShadowRoot = createSingleton<Entity>()
let energyFlight: { entity: Entity; trails: Entity[]; from: Vector3; to: Vector3; startedAt: number; durationMs: number; impactScale: number } | null = null
let pendingPersonalShadowPulse = false
const shadowImpactByRoot = new Map<Entity, { startedAt: number; durationMs: number; maxScale: number }>()
let personalShadowImpactRing: Entity | null = null
let personalShadowImpactGlow: Entity | null = null
const ENERGY_POOL_CAPACITY = 2
export const ENERGY_ORIGIN_HEIGHT = 0.28
export const SHADOW_IMPACT_CHEST_OFFSET = 1.25
export const SHADOW_IMPACT_FRONT_OFFSET = -0.18

export type EnergyDiagnostics = {
  requested: number
  poolEntityAcquired: number
  originCalculated: number
  destinationCalculated: number
  entityEnabled: number
  firstVisibleFrame: number
  movementUpdates: number
  destinationReached: number
  poolEntityReleased: number
  lastChoice: Choice | null
  lastOrigin: Vector3 | null
  lastDestination: Vector3 | null
}

export const energyDiagnostics: EnergyDiagnostics = {
  requested: 0,
  poolEntityAcquired: 0,
  originCalculated: 0,
  destinationCalculated: 0,
  entityEnabled: 0,
  firstVisibleFrame: 0,
  movementUpdates: 0,
  destinationReached: 0,
  poolEntityReleased: 0,
  lastChoice: null,
  lastOrigin: null,
  lastDestination: null
}

export const shadowRootsById = new Map<string, Entity>()
export const shadowMotion = new Map<Entity, { baseY: number; phase: number }>()
export const shadowPulseUntil = new Map<Entity, number>()

export type PresentationAudioCue = 'select' | 'correct' | 'wrong' | 'rank' | 'master'

export const AUDIO_CUE_URLS: Record<PresentationAudioCue, string> = {
  select: 'assets/scene/shadow-chime.wav',
  correct: 'assets/scene/shadow-correct.wav',
  wrong: 'assets/scene/shadow-wrong.wav',
  rank: 'assets/scene/shadow-rank.wav',
  master: 'assets/scene/shadow-master.wav'
}

function warmShadowColor(choice: Choice) {
  return choice === 'A' ? Color4.create(0.96, 0.78, 0.38, 0.9) : Color4.create(0.45, 0.95, 0.96, 0.9)
}

function box(position: Vector3, scale: Vector3, color: Color4, rotation?: Quaternion) {
  const entity = engine.addEntity()
  Transform.create(entity, { position, scale, ...(rotation ? { rotation } : {}) })
  MeshRenderer.setBox(entity)
  Material.setPbrMaterial(entity, { albedoColor: color, roughness: 0.86, metallic: 0 })
  return entity
}

function cylinder(position: Vector3, scale: Vector3, color: Color4, radiusBottom = 0.5, radiusTop = 0.5, rotation?: Quaternion) {
  const entity = engine.addEntity()
  Transform.create(entity, { position, scale, ...(rotation ? { rotation } : {}) })
  MeshRenderer.setCylinder(entity, radiusBottom, radiusTop)
  Material.setPbrMaterial(entity, { albedoColor: color, roughness: 0.8, metallic: 0 })
  return entity
}

function sphere(position: Vector3, scale: Vector3, color: Color4) {
  const entity = engine.addEntity()
  Transform.create(entity, { position, scale })
  MeshRenderer.setSphere(entity)
  Material.setPbrMaterial(entity, { albedoColor: color, roughness: 0.9, metallic: 0 })
  return entity
}

const energyPool = createBoundedPool(ENERGY_POOL_CAPACITY, () => {
  const entity = sphere(Vector3.create(0, -20, 0), Vector3.create(0.3, 0.3, 0.3), Color4.create(0.98, 0.86, 0.48, 1))
  Material.setPbrMaterial(entity, {
    albedoColor: Color4.create(1, 0.86, 0.45, 1),
    emissiveColor: Color4.create(1, 0.7, 0.25, 1),
    emissiveIntensity: 3.6,
    roughness: 0.4,
    metallic: 0
  })
  VisibilityComponent.create(entity, { visible: false })
  return entity
})

const trailPool = createBoundedPool(ENERGY_TRAIL_CAPACITY, () => {
  const entity = engine.addEntity()
  Transform.create(entity, { position: Vector3.create(0, -20, 0), scale: Vector3.create(0.11, 0.11, 0.11) })
  MeshRenderer.setSphere(entity)
  Material.setBasicMaterial(entity, { diffuseColor: Color4.create(1, 0.86, 0.36, 1) })
  VisibilityComponent.create(entity, { visible: false })
  return entity
})

function texturedPlane(src: string, position: Vector3, scale: Vector3) {
  const entity = engine.addEntity()
  Transform.create(entity, { position, scale })
  MeshRenderer.setPlane(entity)
  Material.setBasicMaterial(entity, {
    texture: Material.Texture.Common({ src })
  })
  return entity
}

function texturedSign(src: string, frontPosition: Vector3, panelScale: Vector3, bodyScale: Vector3, bodyColor: Color4, rearColor: Color4) {
  // Proven SDK front plane plus opaque body and oversized blank rear.
  box(Vector3.create(frontPosition.x, frontPosition.y, frontPosition.z + 0.2), Vector3.create(bodyScale.x, bodyScale.y, 0.34), bodyColor)
  box(Vector3.create(frontPosition.x, frontPosition.y, frontPosition.z + 0.46), Vector3.create(bodyScale.x + 0.16, bodyScale.y + 0.16, 0.16), rearColor)
  return texturedPlane(src, frontPosition, panelScale)
}

function choiceColor(choice: Choice) {
  return choice === 'A' ? Color4.create(0.56, 0.32, 0.9, 1) : Color4.create(0.12, 0.7, 0.8, 1)
}

function createQuestionLandmark() {
  const frame = Color4.create(0.08, 0.1, 0.2, 1)
  const face = Color4.create(0.02, 0.03, 0.07, 1)

  // The board is the sole question landmark. Its body is opaque and text-free.
  box(Vector3.create(QUESTION_CENTER.x, 0.25, QUESTION_CENTER.z), Vector3.create(7.5, 0.42, 1.6), frame)
  box(Vector3.create(QUESTION_CENTER.x, QUESTION_CENTER.y, QUESTION_CENTER.z), Vector3.create(6.7, 4.1, QUESTION_BODY_DEPTH), face)
  // Keep the rear physically blank with a larger opaque slab behind the body.
  box(
    Vector3.create(QUESTION_CENTER.x, QUESTION_CENTER.y, QUESTION_LANDMARK.centerZ + QUESTION_BODY_DEPTH / 2 + 0.06),
    Vector3.create(6.95, 4.3, 0.18),
    face
  )
  questionSurface = texturedPlane(
    BOARD_PANEL_TEXTURES[0],
    Vector3.create(QUESTION_CENTER.x, QUESTION_CENTER.y, QUESTION_FRONT_Z),
    Vector3.create(5.9, 3.85, 1)
  )

}

function createDestination(choice: Choice) {
  const zone = choice === 'A' ? CHOICE_A_ZONE : CHOICE_B_ZONE
  const accent = choiceColor(choice)
  const base = choice === 'A' ? Color4.create(0.08, 0.04, 0.18, 1) : Color4.create(0.025, 0.12, 0.16, 1)
  const x = zone.centerX
  const z = zone.centerZ

  // Each destination is a readable endpoint: the visible pad is also the
  // interaction affordance, so there is no hidden corridor inside it.
  box(Vector3.create(x, 0.05, z), Vector3.create(zone.scaleX, 0.1, zone.scaleZ), base)
  const pad = box(Vector3.create(x, 0.12, z), Vector3.create(zone.scaleX - 0.18, 0.08, zone.scaleZ - 0.18), accent)
  const padGlow = box(Vector3.create(x, 0.18, z), Vector3.create(zone.scaleX - 0.48, 0.025, zone.scaleZ - 0.48), Color4.create(accent.r, accent.g, accent.b, 0.72))
  Material.setPbrMaterial(padGlow, { albedoColor: accent, emissiveColor: accent, emissiveIntensity: 0.7, transparencyMode: 2, roughness: 0.75, metallic: 0 })
  choicePadEntities[choice] = [pad, padGlow]
  choicePadBaseScales.set(pad, Vector3.create(zone.scaleX - 0.18, 0.08, zone.scaleZ - 0.18))
  choicePadBaseScales.set(padGlow, Vector3.create(zone.scaleX - 0.48, 0.025, zone.scaleZ - 0.48))
  const signFrame = Color4.create(0.12, 0.14, 0.24, 1)
  // The sign labels the destination from the rear edge; the pad is a full
  // 1.55m in front of it so the player clearly steps onto the answer affordance.
  const signPosition = Vector3.create(x, 1.55, z + CHOICE_SIGN_FRONT_OFFSET)
  const signScale = Vector3.create(2.9, 1.8, 1)
  // Keep one opaque body and blank rear, then swap only the proven front plane
  // as the authoritative quiz question advances.
  box(Vector3.create(signPosition.x, signPosition.y, signPosition.z + 0.2), Vector3.create(3.2, 2.05, 0.34), signFrame)
  box(Vector3.create(signPosition.x, signPosition.y, signPosition.z + 0.46), Vector3.create(3.36, 2.21, 0.16), Color4.create(0.018, 0.024, 0.055, 1))
  choiceSurfaces[choice] = texturedPlane(choiceTexturePath(choice, 0), signPosition, signScale)

  // The pad is intentionally the only interaction surface in this endpoint.
  // Paths and ambient dressing are authored separately, leaving the affordance
  // visually obvious from the central plaza.
}

function createLandscaping() {
  const violet = Color4.create(0.28, 0.18, 0.46, 1)
  const teal = Color4.create(0.08, 0.28, 0.34, 1)
  const path = Color4.create(0.055, 0.075, 0.14, 1)
  const moon = Color4.create(0.96, 0.84, 0.58, 1)

  // A restrained central promenade gives the scene a readable arrival rhythm.
  box(Vector3.create(8, 0.055, 3.55), Vector3.create(2.35, 0.05, 4.15), path)
  for (const z of [2.35, 3.55, 4.75]) {
    box(Vector3.create(8, 0.09, z), Vector3.create(1.18, 0.035, 0.2), Color4.create(0.2, 0.24, 0.38, 1))
  }

  // Two low branch paths make the choice legible from the stationary spawn.
  // They stop before the destination trigger footprints and never intersect the
  // rear question backdrop.
  const forkPath = (choice: Choice, endX: number) => {
    const startX = 8
    const startZ = 5.35
    const endZ = CHOICE_A_ZONE.centerZ
    const dx = endX - startX
    const dz = endZ - startZ
    const yaw = Math.atan2(dx, dz) * 180 / Math.PI
    const color = choice === 'A' ? Color4.create(0.24, 0.14, 0.46, 1) : Color4.create(0.06, 0.3, 0.38, 1)
    for (const t of [0.28, 0.54, 0.8]) {
      box(
        Vector3.create(startX + dx * t, 0.095, startZ + dz * t),
        Vector3.create(1.15, 0.04, 1.55),
        color,
        Quaternion.fromEulerDegrees(0, yaw, 0)
      )
    }
  }
  forkPath('A', CHOICE_A_ZONE.centerX)
  forkPath('B', CHOICE_B_ZONE.centerX)

  // A soft landscaping divider breaks the sightline from the Hall back to the
  // active quiz board without making the secondary space feel walled off.
  for (const [x, z, canopy] of [
    [3.55, 9.8, violet], [3.3, 11.3, teal], [3.65, 12.75, violet]
  ] as Array<[number, number, Color4]>) {
    cylinder(Vector3.create(x, 0.75, z), Vector3.create(0.24, 1.5, 0.24), Color4.create(0.07, 0.055, 0.11, 1), 0.55, 0.4)
    sphere(Vector3.create(x, 1.72, z), Vector3.create(0.78, 0.95, 0.78), canopy)
  }

  // Lightweight tree silhouettes add a haunted-garden canopy without heavy
  // assets or dense clutter on the mobile path.
  for (const [x, z, canopy] of [
    [2.0, 2.2, violet], [14.0, 2.2, teal], [2.0, 9.8, violet], [14.0, 9.8, teal]
  ] as Array<[number, number, Color4]>) {
    cylinder(Vector3.create(x, 0.7, z), Vector3.create(0.22, 1.4, 0.22), Color4.create(0.09, 0.07, 0.12, 1), 0.55, 0.38)
    sphere(Vector3.create(x, 1.65, z), Vector3.create(0.9, 1.05, 0.9), canopy)
    sphere(Vector3.create(x + 0.34, 1.92, z + 0.12), Vector3.create(0.48, 0.58, 0.48), Color4.create(canopy.r * 0.7, canopy.g * 0.7, canopy.b * 0.7, 1))
  }
}

function createHouseOfMastersPavilion() {
  const center = Vector3.create(HOUSE_OF_MASTERS_ZONE.centerX, 0.05, HOUSE_OF_MASTERS_ZONE.centerZ)
  const baseColor = Color4.create(0.02, 0.035, 0.07, 1)
  const stoneColor = Color4.create(0.08, 0.06, 0.16, 1)
  const goldTrim = Color4.create(0.65, 0.48, 0.15, 1)
  const purpleGlow = Color4.create(0.55, 0.2, 0.65, 0.8)

  // Foundation platform
  box(center, Vector3.create(HOUSE_OF_MASTERS_ZONE.scaleX, 0.1, HOUSE_OF_MASTERS_ZONE.scaleZ), baseColor)
  box(Vector3.create(center.x, 0.11, center.z), Vector3.create(HOUSE_OF_MASTERS_ZONE.scaleX - 0.4, 0.03, HOUSE_OF_MASTERS_ZONE.scaleZ - 0.4), stoneColor)

  // Pavilion Pillars & Roof
  const pillarHeight = 2.4
  const pillarPositions = [
    Vector3.create(center.x - 1.8, pillarHeight / 2 + 0.1, center.z - 1.4),
    Vector3.create(center.x + 1.8, pillarHeight / 2 + 0.1, center.z - 1.4),
    Vector3.create(center.x - 1.8, pillarHeight / 2 + 0.1, center.z + 1.4),
    Vector3.create(center.x + 1.8, pillarHeight / 2 + 0.1, center.z + 1.4)
  ]
  for (const pos of pillarPositions) {
    cylinder(pos, Vector3.create(0.24, pillarHeight, 0.24), stoneColor, 0.5, 0.45)
  }

  // Roof Slabs
  box(Vector3.create(center.x, 2.55, center.z), Vector3.create(4.2, 0.18, 3.4), stoneColor)
  box(Vector3.create(center.x, 2.68, center.z), Vector3.create(3.8, 0.12, 3.0), goldTrim)

  // Glowing Entrance Threshold
  const entranceThreshold = box(Vector3.create(center.x, 0.14, center.z - 1.45), Vector3.create(2.2, 0.04, 0.5), purpleGlow)
  Material.setPbrMaterial(entranceThreshold, { albedoColor: purpleGlow, emissiveColor: purpleGlow, emissiveIntensity: 1.4, roughness: 0.8, metallic: 0 })

  // Top 3 Master Pedestals inside the pavilion
  const pedestalOffsets = [-1.1, 0, 1.1]
  for (let i = 0; i < 3; i++) {
    const pX = center.x + pedestalOffsets[i]
    const pZ = center.z + 0.4
    const height = i === 1 ? 0.42 : 0.3
    cylinder(Vector3.create(pX, height / 2 + 0.1, pZ), Vector3.create(0.65, height, 0.65), stoneColor, 0.55, 0.5)
    const crown = sphere(Vector3.create(pX, height + 0.22, pZ), Vector3.create(0.22, 0.22, 0.22), goldTrim)
    Material.setPbrMaterial(crown, { albedoColor: goldTrim, emissiveColor: goldTrim, emissiveIntensity: 1.2, roughness: 0.4, metallic: 0.6 })
  }

  // House of Masters Facade Sign
  texturedSign(
    'assets/scene/signs/house-of-masters.png',
    Vector3.create(center.x, 2.3, center.z - 1.48),
    Vector3.create(2.4, 0.75, 1),
    Vector3.create(2.65, 0.95, 0.2),
    stoneColor,
    Color4.create(0.015, 0.02, 0.04, 1)
  )
}

export const PERSONAL_SHADOW_POSITION = Vector3.create(PERSONAL_SHADOW_LAYOUT.avatar.centerX, 0.12, PERSONAL_SHADOW_LAYOUT.avatar.centerZ)

export function createPresentationV2() {
  choicePadEntities.A = []
  choicePadEntities.B = []
  choicePadBaseScales.clear()
  choicePadPulseUntil.clear()
  choicePadFlashUntil.clear()
  const world = Color4.create(0.012, 0.018, 0.05, 1)
  const plaza = Color4.create(0.028, 0.045, 0.1, 1)
  box(Vector3.create(8, -0.18, 8), Vector3.create(16, 0.36, 16), world)
  box(Vector3.create(8, 0.01, 7.8), Vector3.create(14.4, 0.08, 12.8), plaza)
  createQuestionLandmark()
  createDestination('A')
  createDestination('B')
  createHouseOfMastersPavilion()
  // A small dedicated pedestal keeps the current player's Shadow visible from
  // the quiz plaza without placing it in either answer route.
  box(Vector3.create(PERSONAL_SHADOW_LAYOUT.platform.centerX, 0.06, PERSONAL_SHADOW_LAYOUT.platform.centerZ), Vector3.create(PERSONAL_SHADOW_LAYOUT.platform.width, 0.08, PERSONAL_SHADOW_LAYOUT.platform.depth), Color4.create(0.08, 0.045, 0.18, 1))
  const personalPedestalGlow = cylinder(Vector3.create(PERSONAL_SHADOW_LAYOUT.platform.centerX, 0.25, PERSONAL_SHADOW_LAYOUT.platform.centerZ), Vector3.create(0.78, 0.35, 0.78), Color4.create(0.42, 0.16, 0.48, 1), 0.62, 0.5)
  Material.setPbrMaterial(personalPedestalGlow, { albedoColor: Color4.create(0.42, 0.16, 0.48, 1), emissiveColor: Color4.create(0.55, 0.2, 0.65, 1), emissiveIntensity: 1.2, roughness: 0.72, metallic: 0 })
  createLandscaping()

  const audioEntity = engine.addEntity()
  Transform.create(audioEntity, { position: Vector3.create(8, 1.1, 8) })
  AudioSource.create(audioEntity, {
    audioClipUrl: 'assets/scene/shadow-correct.wav',
    playing: false,
    loop: false,
    volume: 0.52,
    global: true
  })
  return audioEntity
}

function ensurePersonalShadowImpactVisuals(root: Entity) {
  if (personalShadowImpactRing && personalShadowImpactGlow) return
  const ring = cylinder(Vector3.create(0, 1.12, 0), Vector3.create(0.58, 0.035, 0.58), Color4.create(1, 0.36, 0.86, 0.9), 0.62, 0.62)
  Transform.getMutable(ring).parent = root
  Material.setPbrMaterial(ring, {
    albedoColor: Color4.create(1, 0.3, 0.78, 0.78),
    emissiveColor: Color4.create(1, 0.24, 0.72, 1),
    emissiveIntensity: 2.8,
    transparencyMode: 2,
    roughness: 1,
    metallic: 0
  })
  VisibilityComponent.create(ring, { visible: false })
  const glow = sphere(Vector3.create(0, 1.25, -0.12), Vector3.create(0.46, 0.7, 0.46), Color4.create(1, 0.34, 0.82, 0.7))
  Transform.getMutable(glow).parent = root
  Material.setBasicMaterial(glow, { diffuseColor: Color4.create(1, 0.32, 0.82, 0.72) })
  VisibilityComponent.create(glow, { visible: false })
  personalShadowImpactRing = ring
  personalShadowImpactGlow = glow
  renderedShadowEntities.push(ring, glow)
}

function releaseEnergyFlight() {
  if (!energyFlight) return
  VisibilityComponent.getMutable(energyFlight.entity).visible = false
  energyPool.release(energyFlight.entity)
  for (const trail of energyFlight.trails) {
    VisibilityComponent.getMutable(trail).visible = false
    trailPool.release(trail)
  }
  energyDiagnostics.poolEntityReleased += 1
  energyFlight = null
}

function shadowImpactTarget(): Vector3 {
  const root = personalShadowRoot.peek()
  const rootPosition = root ? Transform.getOrNull(root)?.position : undefined
  const base = rootPosition ?? PERSONAL_SHADOW_POSITION
  return Vector3.create(base.x, base.y + SHADOW_IMPACT_CHEST_OFFSET, base.z + SHADOW_IMPACT_FRONT_OFFSET)
}

export function triggerShadowEnergy(choice: Choice, rankUp = false) {
  energyDiagnostics.requested += 1
  releaseEnergyFlight()
  const entity = energyPool.acquire()
  if (!entity) return
  const trails: Entity[] = []
  for (let index = 0; index < ENERGY_TRAIL_CAPACITY; index += 1) {
    const trail = trailPool.acquire()
    if (trail) trails.push(trail)
  }
  const pad = zoneForChoice(choice)
  const from = Vector3.create(pad.centerX, ENERGY_ORIGIN_HEIGHT, pad.centerZ)
  const to = shadowImpactTarget()
  energyDiagnostics.poolEntityAcquired += 1
  energyDiagnostics.originCalculated += 1
  energyDiagnostics.destinationCalculated += 1
  energyDiagnostics.lastChoice = choice
  energyDiagnostics.lastOrigin = from
  energyDiagnostics.lastDestination = to
  Transform.getMutable(entity).position = from
  Transform.getMutable(entity).scale = Vector3.create(1, 1, 1)
  VisibilityComponent.getMutable(entity).visible = true
  for (const trail of trails) {
    Transform.getMutable(trail).position = from
    Transform.getMutable(trail).scale = Vector3.create(1, 1, 1)
    VisibilityComponent.getMutable(trail).visible = true
  }
  energyDiagnostics.entityEnabled += 1
  energyFlight = { entity, trails, from, to, startedAt: Date.now(), durationMs: ENERGY_FLIGHT_DURATION_MS, impactScale: rankUp ? 1.25 : 1.18 }
}

export function triggerPersonalShadowReaction(durationMs = 600, maxScale = 1.18) {
  const root = personalShadowRoot.peek()
  if (root) {
    pendingPersonalShadowPulse = false
    ensurePersonalShadowImpactVisuals(root)
    const now = Date.now()
    shadowImpactByRoot.set(root, { startedAt: now, durationMs, maxScale })
    shadowPulseUntil.set(root, now + durationMs)
    if (personalShadowImpactRing) VisibilityComponent.getMutable(personalShadowImpactRing).visible = true
    if (personalShadowImpactGlow) VisibilityComponent.getMutable(personalShadowImpactGlow).visible = true
  } else pendingPersonalShadowPulse = true
}

export function queuePersonalShadowReaction() {
  pendingPersonalShadowPulse = true
}

export function updateQuestionSurface(state: ParkState) {
  if (!questionSurface || !choiceSurfaces.A || !choiceSurfaces.B) return
  const canonical = questionById(state.questionId) ?? QUIZ_QUESTIONS.find((q) => q.questionText === state.question) ?? QUIZ_QUESTIONS[0]
  const index = QUIZ_QUESTIONS.findIndex((q) => q.questionId === canonical.questionId)
  const activeIndex = state.questionId === 'quiz-complete' ? BOARD_PANEL_TEXTURES.length - 1 : index >= 0 ? index : 0

  const boardTexture = BOARD_PANEL_TEXTURES[activeIndex] ?? BOARD_PANEL_TEXTURES[0]
  Material.setBasicMaterial(questionSurface, {
    texture: Material.Texture.Common({ src: boardTexture })
  })

  for (const choice of ['A', 'B'] as Choice[]) {
    const surface = choiceSurfaces[choice]
    if (!surface) continue
    const displayedText = choice === 'A' ? state.choiceA : state.choiceB
    const contentChoice: Choice = displayedText === canonical.answerB ? 'B' : 'A'
    const choiceTexture = choiceTexturePath(contentChoice, activeIndex)
    Material.setBasicMaterial(surface, {
      texture: Material.Texture.Common({ src: choiceTexture })
    })
  }
}

export function createShadowVisual(shadow: ShadowRecord, sideIndex = shadow.slot, positionOverride?: Vector3, rootOverride?: Entity) {
  const zone = zoneForChoice(shadow.choice)
  // Historical Shadows are passed an explicit Hall-grid position by the
  // runtime; Personal Shadow uses its dedicated plaza pedestal position.
  const groupColumns = SHADOW_GROUP_COLUMNS
  const groupRows = SHADOW_GROUP_ROWS
  const slot = sideIndex % (groupColumns.length * groupRows.length)
  const column = slot % groupColumns.length
  const row = Math.floor(slot / groupColumns.length)
  const side = shadow.choice === 'A' ? 1 : -1
  const position = positionOverride ?? Vector3.create(
    zone.centerX + groupColumns[column] * side,
    0.12,
    zone.centerZ + groupRows[row]
  )
  const root = rootOverride ?? engine.addEntity()
  const isPersonal = shadow.id === 'personal-shadow'
  const rootRotation = isPersonal ? Quaternion.fromEulerDegrees(0, 0, 0) : Quaternion.fromEulerDegrees(0, 180, 0)
  // Personal progression is intentionally brighter than the Hall gallery.
  // Historical visitors are cooler, dimmer, and have no permanent nameplate.
  const tint = isPersonal
    ? Color4.create(1, 0.46, 0.86, 0.96)
    : shadow.choice === 'A'
      ? Color4.create(0.24, 0.28, 0.62, 0.34)
      : Color4.create(0.08, 0.38, 0.54, 0.34)
  // A personal root is created once and reused across state renders. The first
  // answer used to call getMutable() before that new entity had a Transform,
  // which can terminate the mobile client exactly when the first Shadow should
  // materialize. Create on first use, mutate on subsequent updates.
  const existingRootTransform = Transform.getOrNull(root)
  if (existingRootTransform) {
    const rootTransform = Transform.getMutable(root)
    rootTransform.position = position
    rootTransform.rotation = rootRotation
  } else {
    Transform.create(root, { position, rotation: rootRotation })
  }
  shadowRootsById.set(shadow.id, root)
  shadowMotion.set(root, { baseY: 0.12, phase: shadow.slot * 0.71 })

  let avatarEntity: Entity | undefined
  if (shadow.avatar?.bodyShapeUrn || shadow.avatar?.wearableUrns?.length) {
    avatarEntity = engine.addEntity()
    Transform.create(avatarEntity, { parent: root, position: Vector3.create(0, 0.12, 0), scale: Vector3.create(0.82, 0.82, 0.82) })
    AvatarShape.create(avatarEntity, {
      id: shadow.avatar.userId ?? shadow.id,
      // Floating nameplates are intentionally suppressed in the Hall. The
      // gallery itself communicates history; proximity UI can be added later.
      name: '',
      bodyShape: shadow.avatar.bodyShapeUrn,
      wearables: shadow.avatar.wearableUrns ?? [],
      emotes: shadow.avatar.emoteUrns ?? [],
      skinColor: shadow.avatar.skinColor ? { r: shadow.avatar.skinColor[0], g: shadow.avatar.skinColor[1], b: shadow.avatar.skinColor[2] } : undefined,
      eyeColor: shadow.avatar.eyeColor ? { r: shadow.avatar.eyeColor[0], g: shadow.avatar.eyeColor[1], b: shadow.avatar.eyeColor[2] } : undefined,
      hairColor: shadow.avatar.hairColor ? { r: shadow.avatar.hairColor[0], g: shadow.avatar.hairColor[1], b: shadow.avatar.hairColor[2] } : undefined,
      talking: false
    })
  }

  const primitiveEntities: Entity[] = []
  if (!avatarEntity) {
  const aura = cylinder(Vector3.create(0, 0.08, 0), Vector3.create(0.68, 0.14, 0.68), Color4.create(tint.r, tint.g, tint.b, 0.2), 0.62, 0.38)
  Transform.getMutable(aura).parent = root
  Material.setPbrMaterial(aura, {
    albedoColor: Color4.create(tint.r, tint.g, tint.b, 0.18),
    emissiveColor: Color4.create(tint.r * 0.45, tint.g * 0.45, tint.b * 0.45, 1),
    emissiveIntensity: 1.5,
    transparencyMode: 2,
    roughness: 1,
    metallic: 0
  })

  const cloak = cylinder(Vector3.create(0, 0.8, 0), Vector3.create(0.7, 1.35, 0.46), tint, 0.62, 0.16)
  Transform.getMutable(cloak).parent = root
  Material.setPbrMaterial(cloak, {
    albedoColor: tint,
    emissiveColor: Color4.create(tint.r * 0.35, tint.g * 0.35, tint.b * 0.35, 1),
    emissiveIntensity: 1.1,
    transparencyMode: 2,
    roughness: 1,
    metallic: 0
  })

  const halo = sphere(Vector3.create(0, 2.08, 0), Vector3.create(0.62, 0.12, 0.62), Color4.create(tint.r, tint.g, tint.b, 0.18))
  Transform.getMutable(halo).parent = root
  Material.setPbrMaterial(halo, {
    albedoColor: Color4.create(tint.r, tint.g, tint.b, 0.12),
    emissiveColor: Color4.create(tint.r * 0.5, tint.g * 0.5, tint.b * 0.5, 1),
    emissiveIntensity: 0.8,
    transparencyMode: 2,
    roughness: 1,
    metallic: 0
  })

  const progressionPieces: Entity[] = []
  const level = shadow.shadowLevel ?? 0
  if (level >= 1) {
    const boots = cylinder(Vector3.create(0, 0.3, 0), Vector3.create(0.45, 0.16, 0.42), warmShadowColor(shadow.choice), 0.5, 0.38)
    Transform.getMutable(boots).parent = root
    progressionPieces.push(boots)
  }
  if (level >= 2) {
    const mantle = cylinder(Vector3.create(0, 1.08, 0), Vector3.create(0.78, 0.18, 0.52), Color4.create(tint.r * 0.9, tint.g * 0.9, tint.b * 0.9, 0.7), 0.5, 0.42)
    Transform.getMutable(mantle).parent = root
    progressionPieces.push(mantle)
  }
  if (level >= 3) {
    const crown = cylinder(Vector3.create(0, 2.16, 0), Vector3.create(0.3, 0.18, 0.3), warmShadowColor(shadow.choice), 0.75, 0.2)
    Transform.getMutable(crown).parent = root
    progressionPieces.push(crown)
  }
  if (level >= 4) {
    const auraRing = cylinder(Vector3.create(0, 1.18, 0), Vector3.create(1.05, 0.035, 1.05), Color4.create(tint.r, tint.g, tint.b, 0.32), 0.62, 0.62)
    Transform.getMutable(auraRing).parent = root
    Material.setPbrMaterial(auraRing, { albedoColor: Color4.create(tint.r, tint.g, tint.b, 0.22), emissiveColor: tint, emissiveIntensity: 1.4, transparencyMode: 2, roughness: 1, metallic: 0 })
    progressionPieces.push(auraRing)
  }
  if (level >= 5) {
    const fullSet = sphere(Vector3.create(0, 1.18, 0), Vector3.create(1.18, 1.55, 0.72), Color4.create(tint.r, tint.g, tint.b, 0.18))
    Transform.getMutable(fullSet).parent = root
    Material.setPbrMaterial(fullSet, { albedoColor: Color4.create(tint.r, tint.g, tint.b, 0.16), emissiveColor: tint, emissiveIntensity: 1.8, transparencyMode: 2, roughness: 1, metallic: 0 })
    progressionPieces.push(fullSet)
  }

  const shoulder = engine.addEntity()
  Transform.create(shoulder, { parent: root, position: Vector3.create(0, 1.3, 0), scale: Vector3.create(0.72, 0.32, 0.32) })
  MeshRenderer.setSphere(shoulder)
  Material.setPbrMaterial(shoulder, { albedoColor: tint, emissiveColor: tint, emissiveIntensity: 1.35, transparencyMode: 2, roughness: 1, metallic: 0 })

  const head = engine.addEntity()
  Transform.create(head, { parent: root, position: Vector3.create(0, 1.78, 0), scale: Vector3.create(0.38, 0.42, 0.3) })
  MeshRenderer.setSphere(head)
  Material.setPbrMaterial(head, { albedoColor: tint, emissiveColor: Color4.create(tint.r * 0.8, tint.g * 0.8, tint.b * 0.8, 1), emissiveIntensity: 1.05, transparencyMode: 2, roughness: 1, metallic: 0 })

  const leftArm = cylinder(Vector3.create(-0.34, 1.02, 0), Vector3.create(0.16, 0.68, 0.16), tint, 0.4, 0.28, Quaternion.fromEulerDegrees(0, 0, -18))
  Transform.getMutable(leftArm).parent = root
  const rightArm = cylinder(Vector3.create(0.34, 1.02, 0), Vector3.create(0.16, 0.68, 0.16), tint, 0.4, 0.28, Quaternion.fromEulerDegrees(0, 0, 18))
  Transform.getMutable(rightArm).parent = root
  primitiveEntities.push(aura, cloak, halo, shoulder, head, leftArm, rightArm, ...progressionPieces)
  }

  // AvatarShape supplies the recognizable silhouette; keep the progression
  // accents scene-controlled so the same avatar visibly advances by level.
  if (avatarEntity) {
    // AvatarShape supplies the recognizable silhouette, while this restrained
    // shell makes historical visitors read as ghosts on mobile. It is not a
    // second mannequin and never creates another gameplay entity.
    const ghostRing = cylinder(Vector3.create(0, 0.08, 0), Vector3.create(isPersonal ? 1.1 : 0.7, 0.035, isPersonal ? 1.1 : 0.7), Color4.create(tint.r, tint.g, tint.b, isPersonal ? 0.48 : 0.12), 0.62, 0.62)
    Transform.getMutable(ghostRing).parent = root
    Material.setPbrMaterial(ghostRing, {
      albedoColor: Color4.create(tint.r, tint.g, tint.b, isPersonal ? 0.3 : 0.14),
      emissiveColor: Color4.create(tint.r * 0.45, tint.g * 0.45, tint.b * 0.45, 1),
      emissiveIntensity: isPersonal ? 2.1 : 0.45,
      transparencyMode: 2,
      roughness: 1,
      metallic: 0
    })
    primitiveEntities.push(ghostRing)
    const avatarLevel = shadow.shadowLevel ?? 0
    if (avatarLevel >= 1) {
      const bootsAccent = cylinder(Vector3.create(0, 0.25, 0), Vector3.create(0.5, 0.06, 0.5), warmShadowColor(shadow.choice), 0.6, 0.6)
      Transform.getMutable(bootsAccent).parent = root
      primitiveEntities.push(bootsAccent)
    }
    if (avatarLevel >= 2) {
      const mantleAccent = cylinder(Vector3.create(0, 1.18, 0), Vector3.create(0.82, 0.05, 0.82), tint, 0.6, 0.6)
      Transform.getMutable(mantleAccent).parent = root
      primitiveEntities.push(mantleAccent)
    }
    if (avatarLevel >= 3) {
      const crownAccent = sphere(Vector3.create(0, 2.25, 0), Vector3.create(0.18, 0.18, 0.18), warmShadowColor(shadow.choice))
      Transform.getMutable(crownAccent).parent = root
      primitiveEntities.push(crownAccent)
    }
    if (avatarLevel >= 4) {
      const auraAccent = cylinder(Vector3.create(0, 1.08, 0), Vector3.create(1.02, 0.035, 1.02), Color4.create(tint.r, tint.g, tint.b, 0.3), 0.6, 0.6)
      Transform.getMutable(auraAccent).parent = root
      primitiveEntities.push(auraAccent)
    }
  }

  if (!rootOverride) renderedShadowEntities.push(root)
  renderedShadowEntities.push(...primitiveEntities)
  if (avatarEntity) renderedShadowEntities.push(avatarEntity)
  return { root, position }
}

export { personalShadowBaseScale }

let currentPersonalShadowScale = 0.92

export function getPersonalShadowScale(): number {
  return currentPersonalShadowScale
}

export function createPersonalShadowVisual(shadowLevel: number, avatar?: AvatarSnapshot, lifetimeCorrect = 0) {
  currentPersonalShadowScale = personalShadowBaseScale(lifetimeCorrect)
  const root = personalShadowRoot.getOrCreate(() => engine.addEntity())
  const visual = createShadowVisual(
    {
      id: 'personal-shadow',
      choice: 'A',
      slot: 0,
      resonances: 0,
      displayName: 'Your Shadow',
      shadowLevel,
      avatar
    },
    0,
    PERSONAL_SHADOW_POSITION,
    root
  )
  const existingTransform = Transform.getOrNull(root)
  if (existingTransform) {
    Transform.getMutable(root).scale = Vector3.create(currentPersonalShadowScale, currentPersonalShadowScale, currentPersonalShadowScale)
  }
  ensurePersonalShadowImpactVisuals(visual.root)
  if (pendingPersonalShadowPulse) {
    pendingPersonalShadowPulse = false
    triggerPersonalShadowReaction(850, 1.16)
  }
  return visual
}

export function clearShadowVisuals() {
  releaseEnergyFlight()
  while (renderedShadowEntities.length) {
    const entity = renderedShadowEntities.pop()
    if (entity) engine.removeEntity(entity)
  }
  personalShadowImpactRing = null
  personalShadowImpactGlow = null
  shadowImpactByRoot.clear()
  shadowRootsById.clear()
  shadowMotion.clear()
  shadowPulseUntil.clear()
}

export function animateShadowVisuals(deltaTime: number) {
  const now = Date.now()
  if (energyFlight) {
    const flight = energyFlight
    const progress = Math.min(1, (now - flight.startedAt) / flight.durationMs)
    const point = energyArcPoint(flight.from, flight.to, progress, ENERGY_ARC_HEIGHT)
    Transform.getMutable(flight.entity).position = Vector3.create(point.x, point.y, point.z)
    const orbScale = 1 + Math.sin(progress * Math.PI) * 0.45
    Transform.getMutable(flight.entity).scale = Vector3.create(orbScale, orbScale, orbScale)
    for (const [index, trail] of flight.trails.entries()) {
      const trailProgress = Math.max(0, progress - (index + 1) * 0.08)
      const trailPoint = energyArcPoint(flight.from, flight.to, trailProgress, ENERGY_ARC_HEIGHT)
      const trailScale = Math.max(0.42, 0.9 - index * 0.13)
      Transform.getMutable(trail).position = Vector3.create(trailPoint.x, trailPoint.y, trailPoint.z)
      Transform.getMutable(trail).scale = Vector3.create(trailScale, trailScale, trailScale)
    }
    energyDiagnostics.firstVisibleFrame += 1
    energyDiagnostics.movementUpdates += 1
    if (progress >= 1) {
      energyDiagnostics.destinationReached += 1
      const impactScale = flight.impactScale
      releaseEnergyFlight()
      triggerPersonalShadowReaction(impactScale > 1.2 ? 650 : 580, impactScale)
    }
  }
  for (const [root, motion] of shadowMotion) {
    const transform = Transform.getMutable(root)
    const pulse = shadowPulseUntil.get(root)
    const impact = shadowImpactByRoot.get(root)
    const isPersonal = root === personalShadowRoot.peek()
    const baseScale = isPersonal ? currentPersonalShadowScale : 1
    transform.position.y = motion.baseY + Math.sin(deltaTime * 0 + now / 1000 * 1.35 + motion.phase) * 0.04
    if (impact) {
      const progress = Math.min(1, (now - impact.startedAt) / impact.durationMs)
      const envelope = progress < 0.28 ? progress / 0.28 : (1 - progress) / 0.72
      const surge = Math.max(0, envelope) * (impact.maxScale - 1)
      transform.scale = Vector3.create(baseScale * (1 + surge), baseScale * (1 + surge), baseScale * (1 + surge))
      if (personalShadowImpactRing) {
        const ringScale = 0.72 + Math.max(0, envelope) * 0.85
        Transform.getMutable(personalShadowImpactRing).scale = Vector3.create(ringScale, 1, ringScale)
      }
      if (personalShadowImpactGlow) {
        const glowScale = 0.72 + Math.max(0, envelope) * 0.45
        Transform.getMutable(personalShadowImpactGlow).scale = Vector3.create(glowScale, glowScale, glowScale)
      }
      if (progress >= 1) {
        shadowImpactByRoot.delete(root)
        if (personalShadowImpactRing) VisibilityComponent.getMutable(personalShadowImpactRing).visible = false
        if (personalShadowImpactGlow) VisibilityComponent.getMutable(personalShadowImpactGlow).visible = false
        if (isPersonal) {
          updateUi({ shadowGrewActive: true })
          // Settle cue for ~850ms
          const cueTimeout = 850
          let timer = 0
          const settleSystem = (dt: number) => {
            timer += dt * 1000
            if (timer >= cueTimeout) {
              updateUi({ shadowGrewActive: false })
              engine.removeSystem(settleSystem)
            }
          }
          engine.addSystem(settleSystem)
        }
      }
    } else {
      const pulseStrength = pulse && pulse > now ? 0.06 : 0
      transform.scale = Vector3.create(baseScale * (1 + pulseStrength), baseScale * (1 + pulseStrength), baseScale * (1 + pulseStrength))
    }
  }
  for (const choice of ['A', 'B'] as Choice[]) {
    const active = (choicePadPulseUntil.get(choice) ?? 0) > now
    const flash = (choicePadFlashUntil.get(choice) ?? 0) > now
    const pulse = active ? 1.07 + Math.sin(now / 70) * 0.045 : 1
    const flashBoost = flash ? 1.16 : 1
    for (const entity of choicePadEntities[choice]) {
      const base = choicePadBaseScales.get(entity)
      if (!base) continue
      Transform.getMutable(entity).scale = Vector3.create(base.x * pulse * flashBoost, base.y * (flash ? 1.2 : 1), base.z * pulse * flashBoost)
    }
  }
}

export function pulseChoicePad(choice: Choice) {
  const now = Date.now()
  choicePadPulseUntil.set(choice, now + 850)
  choicePadFlashUntil.set(choice, now + 210)
}

export function playMomentSound(audioEntity: Entity | null, cue: PresentationAudioCue = 'select') {
  if (audioEntity) AudioSource.playSound(audioEntity, AUDIO_CUE_URLS[cue], true)
}
