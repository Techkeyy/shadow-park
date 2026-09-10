import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  CHOICE_A_ZONE,
  CHOICE_B_ZONE,
  CHOICE_SIGN_FRONT_OFFSET,
  DECISION_ROUTE_BOUNDS,
  HALL_OF_SHADOWS_ZONE,
  QUESTION_LANDMARK,
  ANSWER_CAPTURE_DEPTH_MARGIN,
  shadowBoundsForChoice
} from '../src/shared/zones.ts'

const scene = JSON.parse(readFileSync(new URL('../scene.json', import.meta.url), 'utf8')) as {
  spawnPoints: Array<{
    default?: boolean
    position: { x: number[]; y: number[]; z: number[] }
    cameraTarget: { x: number; y: number; z: number }
  }>
}

test('default spawn is a neutral entrance outside choice triggers and faces into the park', () => {
  const spawn = scene.spawnPoints.find((candidate) => candidate.default)
  assert.ok(spawn, 'scene must define a default spawn point')

  const spawnZ = spawn.position.z[0]
  assert.equal(spawn.position.x[0], 8)
  assert.ok(spawnZ < 4, 'spawn must remain south of the neutral pad')
  assert.ok(spawn.cameraTarget.z > spawnZ, 'camera target must face into the park')
  assert.equal(spawn.cameraTarget.x, 8)
  assert.equal(spawn.cameraTarget.z, 8.0)
})

test('question landmark is a rear backdrop behind the decision destinations', () => {
  const landmarkFront = QUESTION_LANDMARK.centerZ - QUESTION_LANDMARK.depth / 2
  const choiceBack = CHOICE_A_ZONE.centerZ + CHOICE_A_ZONE.scaleZ / 2

  assert.equal(QUESTION_LANDMARK.centerX, 8)
  assert.ok(landmarkFront > choiceBack, 'landmark must sit behind both direct choice paths')
})

test('Hall of Shadows is a separate side destination, not a stacked board backdrop', () => {
  const boardHalfWidth = QUESTION_LANDMARK.width / 2
  const gardenToBoardX = Math.abs(HALL_OF_SHADOWS_ZONE.centerX - QUESTION_LANDMARK.centerX)
  assert.ok(gardenToBoardX > boardHalfWidth, 'garden must sit outside the question landmark footprint')
  assert.ok(HALL_OF_SHADOWS_ZONE.scaleZ >= 3.0, 'Hall pocket must have room for a readable Shadow gallery')
  assert.ok(HALL_OF_SHADOWS_ZONE.centerZ > CHOICE_A_ZONE.centerZ, 'Hall must remain a secondary pocket beyond the quiz route')
  assert.notEqual(HALL_OF_SHADOWS_ZONE.centerX, QUESTION_LANDMARK.centerX, 'Hall must remain spatially distinct from the main board')
})

test('answer pads are in front of their signs with capture ending before the sign body', () => {
  for (const choice of ['A', 'B'] as const) {
    const zone = choice === 'A' ? CHOICE_A_ZONE : CHOICE_B_ZONE
    const signFrontZ = zone.centerZ + CHOICE_SIGN_FRONT_OFFSET
    const padRearZ = zone.centerZ + zone.scaleZ / 2
    const captureRearZ = padRearZ + ANSWER_CAPTURE_DEPTH_MARGIN
    assert.ok(signFrontZ - padRearZ >= 0.4, choice + ' pad must be visibly in front of its sign')
    assert.ok(signFrontZ - captureRearZ >= 0.15, choice + ' capture must finish before the sign body')
  }
})

test('Shadow clusters stay in front of their signs and outside the decision routes', () => {
  const a = shadowBoundsForChoice('A')
  const b = shadowBoundsForChoice('B')

  assert.ok(a.maxZ <= 8.3, 'A Shadows must not occupy the deep/backdrop plane')
  assert.ok(b.maxZ <= 8.3, 'B Shadows must not occupy the deep/backdrop plane')
  assert.ok(a.maxX < DECISION_ROUTE_BOUNDS.A.minX, 'A Shadows must stay west of the A route')
  assert.ok(b.minX > DECISION_ROUTE_BOUNDS.B.maxX, 'B Shadows must stay east of the B route')

  const gardenBounds = {
    minX: HALL_OF_SHADOWS_ZONE.centerX - HALL_OF_SHADOWS_ZONE.scaleX / 2,
    maxX: HALL_OF_SHADOWS_ZONE.centerX + HALL_OF_SHADOWS_ZONE.scaleX / 2,
    minZ: HALL_OF_SHADOWS_ZONE.centerZ - HALL_OF_SHADOWS_ZONE.scaleZ / 2,
    maxZ: HALL_OF_SHADOWS_ZONE.centerZ + HALL_OF_SHADOWS_ZONE.scaleZ / 2
  }
  const overlapsARoute = gardenBounds.maxX >= DECISION_ROUTE_BOUNDS.A.minX && gardenBounds.minX <= DECISION_ROUTE_BOUNDS.A.maxX &&
    gardenBounds.maxZ >= DECISION_ROUTE_BOUNDS.A.minZ && gardenBounds.minZ <= DECISION_ROUTE_BOUNDS.A.maxZ
  const overlapsBoard = gardenBounds.maxX >= QUESTION_LANDMARK.centerX - QUESTION_LANDMARK.width / 2 &&
    gardenBounds.minX <= QUESTION_LANDMARK.centerX + QUESTION_LANDMARK.width / 2 &&
    gardenBounds.maxZ >= QUESTION_LANDMARK.centerZ - QUESTION_LANDMARK.depth / 2 &&
    gardenBounds.minZ <= QUESTION_LANDMARK.centerZ + QUESTION_LANDMARK.depth / 2
  assert.equal(overlapsARoute, false, 'Hall of Shadows must not intersect the A route')
  assert.equal(overlapsBoard, false, 'Hall of Shadows must not intersect the main board footprint')
})
