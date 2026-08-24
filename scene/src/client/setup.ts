import { engine, Entity, Material, MeshRenderer, TextShape, Transform } from '@dcl/sdk/ecs'
import { Color4, Quaternion, Vector3 } from '@dcl/sdk/math'
import { room } from '../shared/messages'
import { Choice, ParkState, parseState, ShadowRecord } from '../shared/state'

const LEFT_ZONE = { minX: 0.5, maxX: 7.25, minZ: 9.5, maxZ: 15.5 }
const RIGHT_ZONE = { minX: 8.75, maxX: 15.5, minZ: 9.5, maxZ: 15.5 }

let parkState: ParkState | null = null
let votePending = false
let voteLocked = false
let statusEntity = engine.RootEntity
let tallyAEntity = engine.RootEntity
let tallyBEntity = engine.RootEntity
const renderedShadows: Entity[] = []

function makeBox(position: Vector3, scale: Vector3, color: Color4) {
  const entity = engine.addEntity()
  Transform.create(entity, { position, scale })
  MeshRenderer.setBox(entity)
  Material.setPbrMaterial(entity, { albedoColor: color, roughness: 0.9, metallic: 0 })
  return entity
}

function makeText(value: string, position: Vector3, fontSize: number, color = Color4.White(), width = 12) {
  const entity = engine.addEntity()
  Transform.create(entity, { position, rotation: Quaternion.fromEulerDegrees(0, 180, 0) })
  TextShape.create(entity, { text: value, fontSize, textColor: color, width, height: 4 })
  return entity
}

function createStaticScene() {
  makeBox(Vector3.create(8, -0.15, 8), Vector3.create(16, 0.3, 16), Color4.create(0.025, 0.035, 0.07, 1))
  makeBox(Vector3.create(4, 0.02, 12.5), Vector3.create(6.5, 0.04, 6), Color4.create(0.12, 0.08, 0.24, 1))
  makeBox(Vector3.create(12, 0.02, 12.5), Vector3.create(6.5, 0.04, 6), Color4.create(0.03, 0.18, 0.24, 1))
  makeBox(Vector3.create(8, 2.6, 7), Vector3.create(10.5, 4.8, 0.25), Color4.create(0.02, 0.025, 0.05, 1))

  makeText('SHADOW PARK', Vector3.create(8, 4.2, 6.8), 3, Color4.create(0.7, 0.76, 1, 1))
  makeText('Would you rather explore space\nor the deep ocean?', Vector3.create(8, 3.15, 6.8), 4, Color4.White(), 10)
  makeText('LEFT  A\nEXPLORE SPACE', Vector3.create(4, 1.25, 9.25), 3, Color4.create(0.77, 0.58, 1, 1), 6)
  makeText('RIGHT  B\nDEEP OCEAN', Vector3.create(12, 1.25, 9.25), 3, Color4.create(0.35, 0.86, 1, 1), 6)

  tallyAEntity = makeText('0 SHADOWS', Vector3.create(4, 0.65, 9.25), 2, Color4.White(), 6)
  tallyBEntity = makeText('0 SHADOWS', Vector3.create(12, 0.65, 9.25), 2, Color4.White(), 6)
  statusEntity = makeText('Connecting to the park...', Vector3.create(8, 1.2, 3.8), 2, Color4.create(0.78, 0.82, 0.95, 1), 9)
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

function renderState(state: ParkState) {
  parkState = state
  TextShape.getMutable(tallyAEntity).text = `${state.countA} SHADOW${state.countA === 1 ? '' : 'S'}`
  TextShape.getMutable(tallyBEntity).text = `${state.countB} SHADOW${state.countB === 1 ? '' : 'S'}`
  clearShadows()
  for (const shadow of state.shadows) createShadow(shadow)
}

function setStatus(value: string) {
  TextShape.getMutable(statusEntity).text = value
}

function inside(position: Vector3, zone: typeof LEFT_ZONE) {
  return position.x >= zone.minX && position.x <= zone.maxX && position.z >= zone.minZ && position.z <= zone.maxZ
}

function sendVote(choice: Choice) {
  if (votePending || voteLocked) return
  votePending = true
  setStatus('Leaving your Shadow...')
  void room.send('castVote', { choice })
}

function choiceSystem() {
  if (!parkState || votePending || voteLocked) return
  const player = Transform.getOrNull(engine.PlayerEntity)
  if (!player) return

  if (inside(player.position, LEFT_ZONE)) sendVote('A')
  else if (inside(player.position, RIGHT_ZONE)) sendVote('B')
}

export function setupClient() {
  createStaticScene()

  room.onMessage('stateChanged', ({ stateJson }) => {
    try {
      const nextState = parseState(JSON.parse(stateJson))
      if (nextState) renderState(nextState)
    } catch (error) {
      console.error('SHADOW PARK received invalid state', error)
    }
  })

  room.onMessage('voteResult', ({ accepted, message }) => {
    votePending = false
    voteLocked = accepted || message.includes('already')
    setStatus(message)
  })

  room.onReady((ready) => {
    setStatus(ready ? 'Walk left or right to answer' : 'Connecting to the park...')
    if (ready) void room.send('requestState', {})
  })

  engine.addSystem(choiceSystem)
}
