import assert from 'node:assert/strict'
import test from 'node:test'
import { setupServer } from '../src/server/setup.ts'
import { createInitialState } from '../src/shared/state.ts'
import { __room } from './fakes/network.ts'

const question = createInitialState().question

function statesFor(playerId: string) {
  return __room.inboxes
    .get(playerId)
    ?.filter((message) => message.eventType === 'stateChanged')
    .map((message) => JSON.parse(message.data.stateJson)) ?? []
}

function latestState(playerId: string) {
  const states = statesFor(playerId)
  return states.at(-1)
}

function stateBroadcasts() {
  return __room.sent
    .filter((message) => message.eventType === 'stateChanged' && !message.to)
    .map((message) => JSON.parse(message.data.stateJson))
}

async function flushQueue() {
  await new Promise((resolve) => setTimeout(resolve, 25))
}

test('two identities traverse the authoritative server/message path and converge', async () => {
  __room.connect('client-a')
  __room.connect('client-b')
  await setupServer()

  __room.dispatch('sessionCreated', { sessionId: 'session-a' }, 'client-a')
  __room.dispatch('sessionCreated', { sessionId: 'session-b' }, 'client-b')
  __room.dispatch('requestState', { requestId: 'initial-a' }, 'client-a')
  __room.dispatch('requestState', { requestId: 'initial-b' }, 'client-b')
  await flushQueue()

  assert.deepEqual(latestState('client-a'), latestState('client-b'))
  assert.equal(latestState('client-a').question, question)
  assert.deepEqual([latestState('client-a').countA, latestState('client-a').countB], [0, 0])
  assert.equal(latestState('client-a').shadows.length, 0)

  __room.dispatch('neutralEntered', { sessionId: 'session-a' }, 'client-a')
  __room.dispatch('neutralExited', { sessionId: 'session-a', towardChoices: true }, 'client-a')
  __room.dispatch('castVote', { choice: 'A' }, 'client-a')
  await flushQueue()

  assert.deepEqual([latestState('client-a').countA, latestState('client-a').countB], [1, 0])
  assert.deepEqual(latestState('client-a'), latestState('client-b'))
  assert.equal(latestState('client-a').shadows.length, 1)
  assert.equal(stateBroadcasts().at(-1).countA, 1)
  assert.equal(stateBroadcasts().at(-1).countB, 0)

  __room.dispatch('neutralEntered', { sessionId: 'session-b' }, 'client-b')
  __room.dispatch('neutralExited', { sessionId: 'session-b', towardChoices: true }, 'client-b')
  __room.dispatch('castVote', { choice: 'B' }, 'client-b')
  await flushQueue()

  assert.deepEqual([latestState('client-a').countA, latestState('client-a').countB], [1, 1])
  assert.deepEqual(latestState('client-a'), latestState('client-b'))
  assert.equal(latestState('client-a').shadows.length, 2)
  assert.equal(stateBroadcasts().at(-1).countA, 1)
  assert.equal(stateBroadcasts().at(-1).countB, 1)
  assert.ok(stateBroadcasts().length >= 3, 'initial plus one broadcast per accepted mutation')

  const stateBeforeDuplicates = JSON.stringify(latestState('client-a'))
  __room.dispatch('castVote', { choice: 'A' }, 'client-a')
  __room.dispatch('castVote', { choice: 'B' }, 'client-b')
  __room.dispatch('castVote', { choice: 'B' }, 'client-a')
  __room.dispatch('castVote', { choice: 'A' }, 'client-b')
  await flushQueue()

  assert.equal(JSON.stringify(latestState('client-a')), stateBeforeDuplicates)
  assert.equal(JSON.stringify(latestState('client-b')), stateBeforeDuplicates)
  assert.equal(latestState('client-a').shadows.length, 2)

  __room.dispatch('sessionCreated', { sessionId: 'session-b-reconnect' }, 'client-b')
  __room.dispatch('requestState', { requestId: 'reconnect-b' }, 'client-b')
  await flushQueue()
  assert.deepEqual(latestState('client-b'), latestState('client-a'))
  assert.equal(latestState('client-b').shadows.length, 2)

  __room.connect('client-c')
  __room.dispatch('sessionCreated', { sessionId: 'session-c' }, 'client-c')
  __room.dispatch('requestState', { requestId: 'late-c' }, 'client-c')
  await flushQueue()
  assert.deepEqual(latestState('client-c'), latestState('client-a'))

  const resonatedShadowId = latestState('client-c').shadows[0].id
  __room.dispatch('resonate', { shadowId: resonatedShadowId }, 'client-c')
  await flushQueue()
  assert.equal(__room.inboxes.get('client-c')?.at(-1)?.eventType, 'stateChanged')
  assert.equal(latestState('client-c').shadows[0].resonances, 1)
  const acceptedResonance = __room.inboxes
    .get('client-c')
    ?.find((message) => message.eventType === 'resonateResult' && message.data.accepted === true)
  assert.ok(acceptedResonance)

  const stateAfterResonance = JSON.stringify(latestState('client-c'))
  __room.dispatch('resonate', { shadowId: resonatedShadowId }, 'client-c')
  await flushQueue()
  assert.equal(JSON.stringify(latestState('client-c')), stateAfterResonance)
  const rejectedResonance = __room.inboxes
    .get('client-c')
    ?.find((message) => message.eventType === 'resonateResult' && message.data.accepted === false)
  assert.ok(rejectedResonance)
})
