import assert from 'node:assert/strict'
import test from 'node:test'
import { sendChoiceIntent } from '../src/client/vote-intent.ts'

function sentChoices(voteState: 'UNARMED' | 'ARMED' | 'VOTED', votePending: boolean, choice: 'A' | 'B') {
  const sent: string[] = []
  const decision = sendChoiceIntent(voteState, votePending, choice, (intent) => sent.push(intent))
  return { decision, sent }
}

test('unarmed A trigger sends zero castVote messages', () => {
  const { decision, sent } = sentChoices('UNARMED', false, 'A')
  assert.equal(decision.send, false)
  assert.equal(decision.reason, 'unarmed')
  assert.deepEqual(sent, [])
})

test('unarmed B trigger sends zero castVote messages', () => {
  const { decision, sent } = sentChoices('UNARMED', false, 'B')
  assert.equal(decision.send, false)
  assert.equal(decision.reason, 'unarmed')
  assert.deepEqual(sent, [])
})

test('arming then entering A sends exactly one A request', () => {
  const { decision, sent } = sentChoices('ARMED', false, 'A')
  assert.equal(decision.send, true)
  assert.equal(decision.reason, 'armed')
  assert.deepEqual(sent, ['A'])
})

test('arming then entering B sends exactly one B request', () => {
  const { decision, sent } = sentChoices('ARMED', false, 'B')
  assert.equal(decision.send, true)
  assert.equal(decision.reason, 'armed')
  assert.deepEqual(sent, ['B'])
})

test('pending trigger sends no second request', () => {
  const { decision, sent } = sentChoices('ARMED', true, 'B')
  assert.equal(decision.send, false)
  assert.equal(decision.reason, 'already_pending')
  assert.deepEqual(sent, [])
})

test('VOTED re-entry still sends one request for authoritative duplicate rejection', () => {
  const { decision, sent } = sentChoices('VOTED', false, 'A')
  assert.equal(decision.send, true)
  assert.equal(decision.reason, 'already_voted')
  assert.deepEqual(sent, ['A'])
})
