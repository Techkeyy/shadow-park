import assert from 'node:assert/strict'
import test from 'node:test'
import { setupServer } from '../src/server/setup.ts'
import { currentQuestionForRun } from '../src/shared/state.ts'
import { __room } from './fakes/network.ts'

function latestState(playerId: string) {
  const states = __room.inboxes.get(playerId)?.filter((message) => message.eventType === 'stateChanged') ?? []
  const latest = states.at(-1)
  assert.ok(latest)
  return JSON.parse(latest.data.stateJson)
}

async function flushQueue() {
  await new Promise((resolve) => setTimeout(resolve, 35))
}

test('CORE-1 ten-answer pipeline delivers result, score truth, recenter acknowledgement, and next question', async () => {
  const playerId = 'core1-player'
  __room.connect(playerId)
  await setupServer()

  __room.dispatch('sessionCreated', { sessionId: 'core1-session' }, playerId)
  __room.dispatch('requestState', { requestId: 'core1-initial' }, playerId)
  await flushQueue()

  let expectedScore = 0
  for (let index = 0; index < 10; index += 1) {
    const before = latestState(playerId)
    const question = currentQuestionForRun(before.run)
    assert.ok(question)
    const correct = index % 3 !== 2
    const choice = correct ? question.correctSide : question.correctSide === 'A' ? 'B' : 'A'
    const inbox = __room.inboxes.get(playerId) ?? []
    const answerResultsBefore = inbox.filter((message) => message.eventType === 'answerResult').length
    const nextReadyBefore = inbox.filter((message) => message.eventType === 'nextQuestionReady').length

    // This dispatch is the same authoritative message production sends after
    // the client detects a valid answer-pad footprint.
    __room.dispatch('answerQuestion', {
      questionId: question.questionId,
      choice,
      avatarJson: ''
    }, playerId)
    await flushQueue()

    const answerResults = inbox.filter((message) => message.eventType === 'answerResult')
    assert.equal(answerResults.length, answerResultsBefore + 1)
    const result = answerResults.at(-1)?.data
    assert.equal(result.accepted, true)
    assert.equal(result.questionId, question.questionId)
    assert.equal(result.correct, correct)
    expectedScore += correct ? 10 : 0
    assert.equal(result.score, expectedScore)

    // The client recenter completion is represented by its production
    // readyForNextQuestion acknowledgement. The server must accept it once,
    // then make the next question answerable.
    __room.dispatch('readyForNextQuestion', {
      sessionId: 'core1-session',
      questionId: result.nextQuestionId
    }, playerId)
    await flushQueue()

    const nextReady = inbox.filter((message) => message.eventType === 'nextQuestionReady')
    assert.equal(nextReady.length, nextReadyBefore + 1)
    assert.equal(nextReady.at(-1)?.data.accepted, true)
    const after = latestState(playerId)
    assert.equal(after.run.currentQuestionIndex, index + 1)
    assert.equal(after.run.score, expectedScore)
  }
})
