import assert from 'node:assert/strict'
import test from 'node:test'
import { applyVote, createInitialState } from '../src/shared/state.ts'
import { CHOICE_A_ZONE, CHOICE_B_ZONE, choiceForZone, zoneForChoice } from '../src/shared/zones.ts'

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
