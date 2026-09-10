import assert from 'node:assert/strict'
import test from 'node:test'
import { setupServer } from '../src/server/setup.ts'
import { currentQuestionForRun } from '../src/shared/state.ts'
import { __room } from './fakes/network.ts'

function statesFor(playerId: string) {
  return __room.inboxes.get(playerId)?.filter((message) => message.eventType === 'stateChanged').map((message) => JSON.parse(message.data.stateJson)) ?? []
}

function latestState(playerId: string) {
  const states = statesFor(playerId)
  return states.at(-1)
}

function globalStates() {
  return __room.sent.filter((message) => message.eventType === 'globalStateChanged').map((message) => JSON.parse(message.data.stateJson))
}

async function flushQueue() {
  await new Promise((resolve) => setTimeout(resolve, 30))
}

function answerCurrentQuestion(playerId: string) {
  const state = latestState(playerId)
  const question = currentQuestionForRun(state.run)
  assert.ok(question)
  __room.dispatch('answerQuestion', { questionId: question.questionId, choice: question.correctSide }, playerId)
}

function readyCurrentQuestion(playerId: string) {
  const state = latestState(playerId)
  const question = currentQuestionForRun(state.run)
  assert.ok(question)
  __room.dispatch('readyForNextQuestion', { sessionId: 'transition-' + playerId, questionId: question.questionId }, playerId)
}

test('two identities receive distinct deterministic runs and converge on global quiz history', async () => {
  __room.connect('client-a')
  __room.connect('client-b')
  await setupServer()
  for (const playerId of ['client-a', 'client-b']) {
    __room.dispatch('sessionCreated', { sessionId: 'session-' + playerId }, playerId)
    __room.dispatch('requestState', { requestId: 'initial-' + playerId }, playerId)
  }
  await flushQueue()

  const firstA = latestState('client-a')
  const firstB = latestState('client-b')
  assert.equal(firstA.run.currentQuestionIndex, 0)
  assert.equal(firstB.run.currentQuestionIndex, 0)
  assert.equal(firstA.shadows.length, 0)
  assert.notEqual(firstA.run.runId, firstB.run.runId)

  answerCurrentQuestion('client-a')
  await flushQueue()
  assert.equal(latestState('client-a').run.currentQuestionIndex, 1)
  assert.equal(latestState('client-a').run.score, 10)
  assert.ok(__room.inboxes.get('client-a')?.some((message) => message.eventType === 'answerResult' && message.data.accepted === true))
  assert.equal(globalStates().at(-1).countA + globalStates().at(-1).countB, 1)

  const stateBeforeDuplicate = JSON.stringify(latestState('client-a'))
  const answeredQuestion = firstA.run.questionIds[0]
  __room.dispatch('answerQuestion', { questionId: answeredQuestion, choice: 'A' }, 'client-a')
  await flushQueue()
  assert.equal(JSON.stringify(latestState('client-a')), stateBeforeDuplicate)
  assert.equal(globalStates().at(-1).countA + globalStates().at(-1).countB, 1)

  const transitionState = latestState('client-a')
  answerCurrentQuestion('client-a')
  await flushQueue()
  assert.equal(JSON.stringify(latestState('client-a')), JSON.stringify(transitionState))
  readyCurrentQuestion('client-a')
  await flushQueue()
  assert.ok(__room.inboxes.get('client-a')?.some((message) => message.eventType === 'nextQuestionReady' && message.data.accepted === true))

  __room.dispatch('sessionCreated', { sessionId: 'session-client-a-reconnect' }, 'client-a')
  __room.dispatch('requestState', { requestId: 'reconnect-a' }, 'client-a')
  await flushQueue()
  assert.equal(latestState('client-a').run.currentQuestionIndex, 1)
  assert.equal(latestState('client-a').run.score, 10)

  for (let index = 1; index < 5; index += 1) {
    if (index > 1) {
      readyCurrentQuestion('client-a')
      await flushQueue()
    }
    answerCurrentQuestion('client-a')
    await flushQueue()
  }
  assert.equal(latestState('client-a').run.completed, false)
  assert.equal(latestState('client-a').run.lifetimeAnswered, 5)
  assert.equal(latestState('client-a').run.score, 70)
  assert.equal(latestState('client-a').shadows.length, 0)

  __room.dispatch('restartRun', { sessionId: 'replay-client-a' }, 'client-a')
  await flushQueue()
  assert.equal(latestState('client-a').run.currentQuestionIndex, 5)
  assert.equal(latestState('client-a').run.completed, false)
  assert.ok(__room.inboxes.get('client-a')?.some((message) => message.eventType === 'restartResult' && message.data.accepted === false))
})
