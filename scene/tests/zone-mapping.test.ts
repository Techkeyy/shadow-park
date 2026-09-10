import assert from 'node:assert/strict'
import test from 'node:test'
import { applyVote, createInitialState } from '../src/shared/state.ts'
import { ANSWER_CAPTURE_MARGIN, CHOICE_A_ZONE, CHOICE_B_ZONE, HALL_OF_SHADOWS_ZONE, choiceCaptureBounds, choiceForZone, hallShadowGridForSlot, isInsideChoiceCapture, isInsideChoiceFootprint, zoneForChoice } from '../src/shared/zones.ts'

test('visual Choice A zone maps to authoritative A and an A Shadow', () => {
  assert.equal(choiceForZone(CHOICE_A_ZONE.id), 'A')
  const state = applyVote(createInitialState(), choiceForZone(CHOICE_A_ZONE.id), 'zone-a')
  assert.deepEqual([state.countA, state.countB], [1, 0])
  assert.equal(state.shadows[0].choice, 'A')
})

test('visual Choice B zone maps to authoritative B and a B Shadow', () => {
  assert.equal(choiceForZone(CHOICE_B_ZONE.id), 'B')
  const state = applyVote(createInitialState(), choiceForZone(CHOICE_B_ZONE.id), 'zone-b')
  assert.deepEqual([state.countA, state.countB], [0, 1])
  assert.equal(state.shadows[0].choice, 'B')
})

test('zone identities are camera-independent world-space definitions', () => {
  assert.equal(zoneForChoice('A').id, CHOICE_A_ZONE.id)
  assert.equal(zoneForChoice('B').id, CHOICE_B_ZONE.id)
  assert.notEqual(CHOICE_A_ZONE.centerX, CHOICE_B_ZONE.centerX)
  assert.equal(CHOICE_A_ZONE.centerZ, CHOICE_B_ZONE.centerZ)
})

test('A and B trigger footprints leave a mobile-safe corridor', () => {
  const corridor = CHOICE_B_ZONE.centerX - CHOICE_B_ZONE.scaleX / 2 - (CHOICE_A_ZONE.centerX + CHOICE_A_ZONE.scaleX / 2)
  assert.ok(corridor >= 2.5)
})

test('any genuine entry path inside the visible A pad selects A', () => {
  assert.equal(isInsideChoiceFootprint('A', CHOICE_A_ZONE.centerX, CHOICE_A_ZONE.centerZ), true)
  assert.equal(isInsideChoiceFootprint('A', CHOICE_A_ZONE.centerX + 1.3, CHOICE_A_ZONE.centerZ - 0.8), true)
  assert.equal(isInsideChoiceFootprint('A', CHOICE_A_ZONE.centerX - 1.7, CHOICE_A_ZONE.centerZ + 0.4), true)
})

test('any genuine entry path inside the visible B pad selects B', () => {
  assert.equal(isInsideChoiceFootprint('B', CHOICE_B_ZONE.centerX, CHOICE_B_ZONE.centerZ), true)
  assert.equal(isInsideChoiceFootprint('B', CHOICE_B_ZONE.centerX - 1.3, CHOICE_B_ZONE.centerZ - 0.8), true)
  assert.equal(isInsideChoiceFootprint('B', CHOICE_B_ZONE.centerX + 1.7, CHOICE_B_ZONE.centerZ + 0.4), true)
})

test('positions outside the visible pad do not select either answer', () => {
  assert.equal(isInsideChoiceFootprint('A', CHOICE_A_ZONE.centerX, CHOICE_A_ZONE.centerZ + CHOICE_A_ZONE.scaleZ / 2 + 0.01), false)
  assert.equal(isInsideChoiceFootprint('B', CHOICE_B_ZONE.centerX, CHOICE_B_ZONE.centerZ - CHOICE_B_ZONE.scaleZ / 2 - 0.01), false)
})

test('forgiving capture contains every visible pad edge and corner', () => {
  for (const choice of ['A', 'B'] as const) {
    const zone = zoneForChoice(choice)
    const bounds = choiceCaptureBounds(choice)
    for (const x of [zone.centerX - zone.scaleX / 2, zone.centerX + zone.scaleX / 2]) {
      for (const z of [zone.centerZ - zone.scaleZ / 2, zone.centerZ + zone.scaleZ / 2]) {
        assert.equal(isInsideChoiceCapture(choice, x, z), true)
      }
    }
    assert.equal(isInsideChoiceCapture(choice, bounds.minX - 0.01, zone.centerZ), false)
    assert.equal(isInsideChoiceCapture(choice, bounds.maxX + 0.01, zone.centerZ), false)
    assert.equal(isInsideChoiceCapture(choice, zone.centerX, bounds.minZ - 0.01), false)
    assert.equal(isInsideChoiceCapture(choice, zone.centerX, bounds.maxZ + 0.01), false)
  }
  assert.equal(ANSWER_CAPTURE_MARGIN, 0.45)
})

test('historical Shadow slots stay inside the Hall footprint', () => {
  for (let slot = 0; slot < 20; slot += 1) {
    const position = hallShadowGridForSlot(slot)
    assert.ok(Math.abs(position.x - HALL_OF_SHADOWS_ZONE.centerX) <= HALL_OF_SHADOWS_ZONE.scaleX / 2)
    assert.ok(Math.abs(position.z - HALL_OF_SHADOWS_ZONE.centerZ) <= HALL_OF_SHADOWS_ZONE.scaleZ / 2)
  }
})
