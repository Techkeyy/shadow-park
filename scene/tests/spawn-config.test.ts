import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { CHOICE_A_ZONE, QUESTION_LANDMARK } from '../src/shared/zones.ts'

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
  assert.equal(spawn.cameraTarget.z, 6.5)
})

test('question landmark remains a centered anchor before the decision split', () => {
  const landmarkFront = QUESTION_LANDMARK.centerZ + QUESTION_LANDMARK.depth / 2
  const choiceFront = CHOICE_A_ZONE.centerZ - CHOICE_A_ZONE.scaleZ / 2

  assert.equal(QUESTION_LANDMARK.centerX, 8)
  assert.ok(landmarkFront < choiceFront, 'landmark must not sit in front of the choice paths')
})
