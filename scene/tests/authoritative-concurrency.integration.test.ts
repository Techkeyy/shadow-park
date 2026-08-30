import assert from 'node:assert/strict'
import test from 'node:test'
import { setupServer } from '../src/server/setup.ts'
import { __room } from './fakes/network.ts'

function latestState(playerId: string) {
  const messages = __room.inboxes.get(playerId)?.filter((message) => message.eventType === 'stateChanged') ?? []
  return JSON.parse(messages.at(-1).data.stateJson)
}

async function flushQueue() {
  await new Promise((resolve) => setTimeout(resolve, 50))
}

test('near-concurrent opposing votes serialize without a lost update', async () => {
  __room.connect('client-a')
  __room.connect('client-b')
  await setupServer()

  __room.dispatch('sessionCreated', { sessionId: 'session-a' }, 'client-a')
  __room.dispatch('sessionCreated', { sessionId: 'session-b' }, 'client-b')
  for (const client of ['client-a', 'client-b']) {
    __room.dispatch('neutralEntered', { sessionId: client }, client)
    __room.dispatch('neutralExited', { sessionId: client, towardChoices: true }, client)
  }

  __room.dispatch('castVote', { choice: 'A' }, 'client-a')
  __room.dispatch('castVote', { choice: 'B' }, 'client-b')
  await flushQueue()

  const finalA = latestState('client-a')
  const finalB = latestState('client-b')
  assert.deepEqual(finalA, finalB)
  assert.deepEqual([finalA.countA, finalA.countB], [1, 1])
  assert.equal(finalA.shadows.length, 2)
  assert.equal(new Set(finalA.shadows.map((shadow: { id: string }) => shadow.id)).size, 2)
})
