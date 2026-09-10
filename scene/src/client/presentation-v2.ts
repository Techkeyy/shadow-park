import { AudioSource, AvatarShape, Entity, Material, MeshRenderer, Transform, VisibilityComponent, engine } from '@dcl/sdk/ecs'
import { Color4, Quaternion, Vector3 } from '@dcl/sdk/math'
import { AvatarSnapshot, Choice, CURATED_QUESTIONS, ParkState, QUIZ_QUESTIONS, ShadowRecord } from '../shared/state'
import {
  CHOICE_A_ZONE,
  CHOICE_B_ZONE,
  CHOICE_SIGN_FRONT_OFFSET,
  HOUSE_OF_MASTERS_ZONE,
  QUESTION_LANDMARK,
  SHADOW_GROUP_COLUMNS,
  SHADOW_GROUP_ROWS,
  zoneForChoice
} from '../shared/zones'

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

const renderedShadowEntities: Entity[] = []
let personalShadowRoot: Entity | null = null
let energyEntity: Entity | null = null
let energyFlight: { from: Vector3; to: Vector3; startedAt: number; durationMs: number } | null = null
export const shadowRootsById = new Map<string, Entity>()
export const shadowMotion = new Map<Entity, { baseY: number; phase: number }>()
export const shadowPulseUntil = new Map<Entity, number>()

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

function createHouseOfMasters() {
  const center = Vector3.create(HOUSE_OF_MASTERS_ZONE.centerX, 0.05, HOUSE_OF_MASTERS_ZONE.centerZ)
  const gardenBase = Color4.create(0.018, 0.035, 0.075, 1)
  const frame = Color4.create(0.12, 0.12, 0.25, 1)
  const trim = Color4.create(0.3, 0.14, 0.52, 1)
  box(center, Vector3.create(HOUSE_OF_MASTERS_ZONE.scaleX, 0.1, HOUSE_OF_MASTERS_ZONE.scaleZ), gardenBase)
  // A cool inset floor and low edge stones make this read as a small gallery
  // pocket rather than another board attached to the quiz plaza.
  box(Vector3.create(center.x, 0.105, center.z), Vector3.create(HOUSE_OF_MASTERS_ZONE.scaleX - 0.35, 0.025, HOUSE_OF_MASTERS_ZONE.scaleZ - 0.35), Color4.create(0.028, 0.05, 0.11, 1))
  // A small open pavilion gives the social history a real destination. The
  // front remains open for comfortable mobile entry and clear sightlines,
  // while the roof/back/side walls make it read as a building rather than a
  // second information board.
  box(Vector3.create(center.x, 2.65, center.z + 0.25), Vector3.create(4.45, 0.24, 3.0), frame)
  box(Vector3.create(center.x, 2.48, center.z + 0.25), Vector3.create(4.1, 0.08, 2.55), trim)
  box(Vector3.create(center.x, 1.3, center.z + 1.38), Vector3.create(4.2, 2.45, 0.24), frame)
  box(Vector3.create(center.x - 2.0, 1.3, center.z + 0.25), Vector3.create(0.24, 2.45, 2.55), frame)
  box(Vector3.create(center.x + 2.0, 1.3, center.z + 0.25), Vector3.create(0.24, 2.45, 2.55), frame)
  for (const x of [center.x - 1.9, center.x + 1.9]) {
    box(Vector3.create(x, 1.35, center.z - 1.05), Vector3.create(0.28, 2.65, 0.28), trim)
  }
  box(Vector3.create(center.x, 0.16, center.z - 1.3), Vector3.create(2.3, 0.06, 1.0), Color4.create(0.09, 0.12, 0.24, 1))
  const entranceGlow = cylinder(Vector3.create(center.x, 0.25, center.z - 1.25), Vector3.create(0.8, 0.24, 0.8), Color4.create(0.16, 0.58, 0.68, 1), 0.62, 0.5)
  Material.setPbrMaterial(entranceGlow, { albedoColor: Color4.create(0.16, 0.58, 0.68, 1), emissiveColor: Color4.create(0.16, 0.58, 0.68, 1), emissiveIntensity: 0.8, roughness: 0.75, metallic: 0 })
  // One restrained entrance marker; the historical Shadows are the content.
  texturedSign(
    'assets/scene/signs/house-of-masters.png',
    // Facade sign above the doorway: it identifies the building without ever
    // occupying the mobile walking entrance below.
    Vector3.create(center.x, 3.25, center.z - 1.28),
    Vector3.create(2.45, 0.82, 1),
    Vector3.create(2.72, 1.02, 1),
    frame,
    Color4.create(0.018, 0.024, 0.055, 1)
  )
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

  // The Hall path leaves the spawn plaza below both capture footprints, then
  // turns north along the parcel edge. A visitor can discover the Hall without
  // crossing either answer capture zone on the way there.
  for (const x of [7.35, 6.55, 5.75, 4.95, 4.15, 3.35, 2.55, 1.75, 0.95]) {
    box(Vector3.create(x, 0.055, 4.45), Vector3.create(0.62, 0.05, 0.62), Color4.create(0.045, 0.07, 0.12, 1))
  }
  for (const z of [5.55, 7.15, 8.75, 10.35, 11.95]) {
    box(Vector3.create(0, 0.055, z), Vector3.create(0.28, 0.05, 0.62), Color4.create(0.045, 0.07, 0.12, 1))
  }
  // Final turn into the House makes the secondary destination discoverable
  // without sending visitors through either answer footprint.
  for (const [x, z] of [[0.55, 12.45], [1.05, 12.75], [1.55, 12.95], [2.05, 13.05]] as Array<[number, number]>) {
    box(Vector3.create(x, 0.055, z), Vector3.create(0.62, 0.05, 0.62), Color4.create(0.055, 0.11, 0.18, 1))
  }

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

export const PERSONAL_SHADOW_POSITION = Vector3.create(6.35, 0.12, 4.65)

export function createPresentationV2() {
  choicePadEntities.A = []
  choicePadEntities.B = []
  choicePadBaseScales.clear()
  choicePadPulseUntil.clear()
  const world = Color4.create(0.012, 0.018, 0.05, 1)
  const plaza = Color4.create(0.028, 0.045, 0.1, 1)
  box(Vector3.create(8, -0.18, 8), Vector3.create(16, 0.36, 16), world)
  box(Vector3.create(8, 0.01, 7.8), Vector3.create(14.4, 0.08, 12.8), plaza)
  createQuestionLandmark()
  createDestination('A')
  createDestination('B')
  createHouseOfMasters()
  // A small dedicated pedestal keeps the current player's Shadow visible from
  // the quiz plaza without placing it in either answer route.
  box(Vector3.create(6.35, 0.06, 4.65), Vector3.create(1.65, 0.08, 1.35), Color4.create(0.08, 0.045, 0.18, 1))
  const personalPedestalGlow = cylinder(Vector3.create(6.35, 0.25, 4.65), Vector3.create(0.78, 0.35, 0.78), Color4.create(0.42, 0.16, 0.48, 1), 0.62, 0.5)
  Material.setPbrMaterial(personalPedestalGlow, { albedoColor: Color4.create(0.42, 0.16, 0.48, 1), emissiveColor: Color4.create(0.55, 0.2, 0.65, 1), emissiveIntensity: 1.2, roughness: 0.72, metallic: 0 })
  texturedSign(
    'assets/scene/signs/your-shadow.png',
    Vector3.create(6.35, 0.9, 4.18),
    Vector3.create(1.5, 0.4, 1),
    Vector3.create(1.68, 0.58, 0.28),
    Color4.create(0.12, 0.1, 0.22, 1),
    Color4.create(0.018, 0.024, 0.055, 1)
  )
  createLandscaping()

  const audioEntity = engine.addEntity()
  Transform.create(audioEntity, { position: Vector3.create(8, 1.1, 8) })
  AudioSource.create(audioEntity, {
    audioClipUrl: 'assets/scene/shadow-chime.wav',
    playing: false,
    loop: false,
    volume: 0.18,
    global: true
  })
  return audioEntity
}

export function triggerShadowEnergy(choice: Choice) {
  if (!energyEntity) {
    energyEntity = sphere(Vector3.create(8, 0.5, 5.5), Vector3.create(0.16, 0.16, 0.16), Color4.create(0.98, 0.86, 0.48, 1))
    Material.setPbrMaterial(energyEntity, {
      albedoColor: Color4.create(1, 0.86, 0.45, 1),
      emissiveColor: Color4.create(1, 0.7, 0.25, 1),
      emissiveIntensity: 2.2,
      roughness: 0.4,
      metallic: 0
    })
  }
  const pad = zoneForChoice(choice)
  Transform.getMutable(energyEntity).position = Vector3.create(pad.centerX, 0.52, pad.centerZ)
  VisibilityComponent.getMutable(energyEntity).visible = true
  energyFlight = { from: Vector3.create(pad.centerX, 0.52, pad.centerZ), to: Vector3.create(PERSONAL_SHADOW_POSITION.x, 1.28, PERSONAL_SHADOW_POSITION.z), startedAt: Date.now(), durationMs: 720 }
}

export function updateQuestionSurface(state: ParkState) {
  if (!questionSurface || !choiceSurfaces.A || !choiceSurfaces.B) return
  const indexById = QUIZ_QUESTIONS.findIndex((question) => question.questionId === state.questionId)
  const indexByContent = CURATED_QUESTIONS.findIndex((question) => question.question === state.question && question.choiceA === state.choiceA && question.choiceB === state.choiceB)
  const index = indexById >= 0 ? indexById : indexByContent
  const activeIndex = state.questionId === 'quiz-complete' ? BOARD_PANEL_TEXTURES.length - 1 : index >= 0 ? index : 0
  Material.setBasicMaterial(questionSurface, {
    texture: Material.Texture.Common({ src: BOARD_PANEL_TEXTURES[activeIndex] ?? BOARD_PANEL_TEXTURES[0] })
  })
  for (const choice of ['A', 'B'] as Choice[]) {
    const surface = choiceSurfaces[choice]
    if (!surface) continue
    Material.setBasicMaterial(surface, {
      texture: Material.Texture.Common({ src: choiceTexturePath(choice, activeIndex) })
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

export function createPersonalShadowVisual(shadowLevel: number, avatar?: AvatarSnapshot) {
  if (!personalShadowRoot) personalShadowRoot = engine.addEntity()
  return createShadowVisual(
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
    personalShadowRoot
  )
}

export function clearShadowVisuals() {
  while (renderedShadowEntities.length) {
    const entity = renderedShadowEntities.pop()
    if (entity) engine.removeEntity(entity)
  }
  shadowRootsById.clear()
  shadowMotion.clear()
  shadowPulseUntil.clear()
}

export function animateShadowVisuals(deltaTime: number) {
  const now = Date.now()
  if (energyEntity && energyFlight) {
    const progress = Math.min(1, (now - energyFlight.startedAt) / energyFlight.durationMs)
    const eased = progress * (2 - progress)
    const x = energyFlight.from.x + (energyFlight.to.x - energyFlight.from.x) * eased
    const y = energyFlight.from.y + (energyFlight.to.y - energyFlight.from.y) * eased + Math.sin(progress * Math.PI) * 0.42
    const z = energyFlight.from.z + (energyFlight.to.z - energyFlight.from.z) * eased
    Transform.getMutable(energyEntity).position = Vector3.create(x, y, z)
    Transform.getMutable(energyEntity).scale = Vector3.create(1 + Math.sin(progress * Math.PI) * 0.55, 1 + Math.sin(progress * Math.PI) * 0.55, 1 + Math.sin(progress * Math.PI) * 0.55)
    if (progress >= 1) {
      VisibilityComponent.getMutable(energyEntity).visible = false
      energyFlight = null
      if (personalShadowRoot) shadowPulseUntil.set(personalShadowRoot, now + 850)
    }
  }
  for (const [root, motion] of shadowMotion) {
    const transform = Transform.getMutable(root)
    const pulse = shadowPulseUntil.get(root)
    const pulseStrength = pulse && pulse > now ? 0.12 : 0
    transform.position.y = motion.baseY + Math.sin(deltaTime * 0 + now / 1000 * 1.35 + motion.phase) * 0.04
    transform.scale = Vector3.create(1 + pulseStrength, 1 + pulseStrength, 1 + pulseStrength)
  }
  for (const choice of ['A', 'B'] as Choice[]) {
    const active = (choicePadPulseUntil.get(choice) ?? 0) > now
    const pulse = active ? 1 + Math.sin(now / 70) * 0.035 : 1
    for (const entity of choicePadEntities[choice]) {
      const base = choicePadBaseScales.get(entity)
      if (!base) continue
      Transform.getMutable(entity).scale = Vector3.create(base.x * pulse, base.y, base.z * pulse)
    }
  }
}

export function pulseChoicePad(choice: Choice) {
  choicePadPulseUntil.set(choice, Date.now() + 800)
}

export function playMomentSound(audioEntity: Entity | null) {
  if (audioEntity) AudioSource.playSound(audioEntity, 'assets/scene/shadow-chime.wav', true)
}
