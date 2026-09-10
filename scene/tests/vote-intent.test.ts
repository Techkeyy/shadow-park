import assert from 'node:assert/strict'
import test from 'node:test'
import {
  sendChoiceIntent,
  stateAfterAcceptedAnswer,
  stateAfterNextQuestionReady,
  stateAfterRecenter,
  type VoteState
} from '../src/client/vote-intent.ts'

function sentChoices(voteState: VoteState, votePending: boolean, choice: 'A' | 'B') {
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

test('non-armed transition states send zero requests while the client is moving to the next question', () => {
  for (const state of ['ANSWERED', 'TRANSITIONING', 'CENTERED', 'VOTED'] as const) {
    const { decision, sent } = sentChoices(state, false, 'A')
    assert.equal(decision.send, false)
    assert.equal(decision.reason, 'unarmed')
    assert.deepEqual(sent, [])
  }
})

test('accepted answer enters transition, recenter returns centered, and server-ready arms the next question', () => {
  assert.equal(stateAfterAcceptedAnswer(false), 'ANSWERED')
  assert.equal(stateAfterAcceptedAnswer(true), 'VOTED')
  assert.equal(stateAfterRecenter(), 'CENTERED')
  assert.equal(stateAfterNextQuestionReady(), 'ARMED')
})

test('duplicate or opposite re-entry never bypasses the client transition guard', () => {
  const { decision, sent } = sentChoices('VOTED', false, 'A')
  assert.equal(decision.send, false)
  assert.equal(decision.reason, 'unarmed')
  assert.deepEqual(sent, [])
})

test('ten consecutive accepted answers keep the transition state bounded and re-arm the next question', () => {
  let state: VoteState = 'ARMED'
  for (let answer = 1; answer <= 10; answer += 1) {
    const accepted = sentChoices(state, false, answer % 2 === 0 ? 'B' : 'A')
    assert.equal(accepted.decision.send, true)
    state = stateAfterAcceptedAnswer(false)
    assert.equal(state, 'ANSWERED')
    state = stateAfterRecenter()
    assert.equal(state, 'CENTERED')
    state = stateAfterNextQuestionReady()
    assert.equal(state, 'ARMED')
  }
})
