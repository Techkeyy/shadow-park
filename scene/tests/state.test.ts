import assert from 'node:assert/strict'
import test from 'node:test'
import {
  applyVote,
  createInitialState,
  isChoice,
  MAX_PERSISTED_SHADOWS,
  parseState
} from '../src/shared/state.ts'
import { createVoteArmingState, observeChoicePosition } from '../src/client/vote-arming.ts'
import { updateDirectionalVisibility } from '../src/client/directional-visibility.ts'

test('initial state is a valid empty park', () => {
  const state = createInitialState(new Date('2026-08-24T00:00:00.000Z'))
  assert.equal(state.countA, 0)
  assert.equal(state.countB, 0)
  assert.deepEqual(state.shadows, [])
  assert.equal(parseState(state), state)
})

test('applying votes updates the correct count and appends Shadows', () => {
  const initial = createInitialState(new Date('2026-08-24T00:00:00.000Z'))
  const afterA = applyVote(initial, 'A', 'shadow-a', new Date('2026-08-24T00:00:01.000Z'))
  const afterB = applyVote(afterA, 'B', 'shadow-b', new Date('2026-08-24T00:00:02.000Z'))

  assert.deepEqual([afterB.countA, afterB.countB], [1, 1])
  assert.deepEqual(afterB.shadows.map((shadow) => shadow.choice), ['A', 'B'])
  assert.deepEqual(afterB.shadows.map((shadow) => shadow.slot), [0, 1])
  assert.equal(initial.countA, 0)
})

test('visible persisted Shadows are bounded while tallies continue growing', () => {
  let state = createInitialState()
  for (let index = 0; index < MAX_PERSISTED_SHADOWS + 5; index += 1) {
    state = applyVote(state, index % 2 === 0 ? 'A' : 'B', `shadow-${index}`)
  }

  assert.equal(state.countA + state.countB, MAX_PERSISTED_SHADOWS + 5)
  assert.equal(state.shadows.length, MAX_PERSISTED_SHADOWS)
  assert.equal(state.shadows[0].id, 'shadow-5')
})

test('invalid choices and malformed stored state are rejected', () => {
  assert.equal(isChoice('A'), true)
  assert.equal(isChoice('B'), true)
  assert.equal(isChoice('LEFT'), false)
  assert.equal(parseState({ version: 1, questionId: 'missing-fields' }), null)
  assert.equal(parseState(null), null)
})

test('neutral spawn arms, then intentional A entry is accepted once', () => {
  let arming = createVoteArmingState()
  let result = observeChoicePosition(arming, false)
  arming = result.state
  assert.equal(result.enteredChoice, false)
  result = observeChoicePosition(arming, true)
  assert.equal(result.enteredChoice, true)
  result = observeChoicePosition(result.state, true)
  assert.equal(result.enteredChoice, false)
})

test('spawn inside A stays disarmed until neutral, then A entry arms once', () => {
  let result = observeChoicePosition(createVoteArmingState(), true)
  assert.equal(result.enteredChoice, false)
  result = observeChoicePosition(result.state, true)
  assert.equal(result.enteredChoice, false)
  result = observeChoicePosition(result.state, false)
  result = observeChoicePosition(result.state, true)
  assert.equal(result.enteredChoice, true)
})

test('spawn inside A then neutral then B accepts B, not the spawn location', () => {
  let result = observeChoicePosition(createVoteArmingState(), true)
  result = observeChoicePosition(result.state, false)
  result = observeChoicePosition(result.state, true)
  assert.equal(result.enteredChoice, true)
})

test('resetting arming on reconnect prevents a repeat vote inside a zone', () => {
  let result = observeChoicePosition(createVoteArmingState(), false)
  result = observeChoicePosition(result.state, true)
  assert.equal(result.enteredChoice, true)
  result = observeChoicePosition(createVoteArmingState(), true)
  assert.equal(result.enteredChoice, false)
})

test('front-only text hides after the rear threshold and stays stable in the hysteresis band', () => {
  assert.equal(updateDirectionalVisibility(true, 7.29), true)
  assert.equal(updateDirectionalVisibility(true, 7.3), false)
  assert.equal(updateDirectionalVisibility(false, 7.0), false)
  assert.equal(updateDirectionalVisibility(false, 6.7), true)
})
