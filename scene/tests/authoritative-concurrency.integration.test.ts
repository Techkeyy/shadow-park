import assert from 'node:assert/strict'
import test from 'node:test'
import { setupServer } from '../src/server/setup.ts'
import { currentQuestionForRun } from '../src/shared/state.ts'
import { __room } from './fakes/network.ts'

function latestState(playerId: string) {
  const states = __room.inboxes.get(playerId)?.filter((message) => message.eventType === 'stateChanged') ?? []
  return JSON.parse(states.at(-1).data.stateJson)
}

async function flushQueue() {
  await new Promise((resolve) => setTimeout(resolve, 50))
}

test('near-concurrent answers serialize without a lost global update', async () => {
  __room.connect('client-a')
  __room.connect('client-b')
  await setupServer()
  for (const playerId of ['client-a', 'client-b']) {
    __room.dispatch('sessionCreated', { sessionId: playerId }, playerId)
    __room.dispatch('requestState', { requestId: playerId }, playerId)
  }
  await flushQueue()
  for (const playerId of ['client-a', 'client-b']) {
    const question = currentQuestionForRun(latestState(playerId).run)
    __room.dispatch('answerQuestion', { questionId: question.questionId, choice: question.correctSide }, playerId)
  }
  await flushQueue()
  const finalA = latestState('client-a')
  const finalB = latestState('client-b')
  assert.equal(finalA.run.currentQuestionIndex, 1)
  assert.equal(finalB.run.currentQuestionIndex, 1)
  const global = __room.sent.filter((message) => message.eventType === 'globalStateChanged').at(-1)
  const globalState = JSON.parse(global.data.stateJson)
  assert.equal(globalState.countA + globalState.countB, 2)
  assert.equal(globalState.shadows.length, 0)
})
