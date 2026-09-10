import assert from 'node:assert/strict'
import test from 'node:test'
import {
  applyVote,
  applyQuizAnswer,
  answerQuestion,
  createRunForPlayer,
  currentQuestionForRun,
  createInitialState,
  createClientState,
  isChoice,
  MAX_PERSISTED_SHADOWS,
  MAX_VISIBLE_SHADOWS,
  parseState,
  questionForDate,
  CURATED_QUESTIONS,
  QUIZ_QUESTIONS,
  rankForLifetimeCorrect,
  masterStarsForLifetimeCorrect
} from '../src/shared/state.ts'
import { QUESTION_BANK, validateQuestionBank } from '../src/shared/question-bank.ts'
import { createVoteArmingState, observeChoicePosition } from '../src/client/vote-arming.ts'
import { updateDirectionalVisibility } from '../src/client/directional-visibility.ts'

test('initial state is a valid empty park', () => {
  const state = createInitialState(new Date('2026-08-24T00:00:00.000Z'))
  assert.equal(state.countA, 0)
  assert.equal(state.countB, 0)
  assert.deepEqual(state.shadows, [])
  assert.deepEqual(parseState(state), state)
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

test('production rendering budget is lower than the persisted history cap', () => {
  assert.equal(MAX_VISIBLE_SHADOWS, 20)
  assert.ok(MAX_VISIBLE_SHADOWS < MAX_PERSISTED_SHADOWS)
})

test('invalid choices and malformed stored state are rejected', () => {
  assert.equal(isChoice('A'), true)
  assert.equal(isChoice('B'), true)
  assert.equal(isChoice('LEFT'), false)
  assert.equal(parseState({ version: 1, questionId: 'missing-fields' }), null)
  assert.equal(parseState(null), null)
})

test('endless runs use a large deterministic deck and advance without a terminal state', () => {
  const run = createRunForPlayer('player-a', new Date('2026-08-24T00:00:00.000Z'))
  assert.ok(run.questionIds.length >= 200)
  assert.deepEqual(run.questionIds, createRunForPlayer('player-a').questionIds)
  const question = currentQuestionForRun(run)
  assert.ok(question)
  const result = answerQuestion(run, question, question.correctSide)
  assert.equal(result.correct, true)
  assert.equal(result.run.correctCount, 1)
  assert.equal(result.run.currentQuestionIndex, 1)
  assert.equal(result.run.answeredQuestionIds.length, 1)
  assert.equal(result.run.completed, false)
  assert.equal(result.run.shadowScore, 10)
  assert.equal(result.nextQuestion?.questionId, result.run.currentQuestionId)
})

test('quiz answers are authoritative for both correct and wrong A/B choices', () => {
  for (const question of QUIZ_QUESTIONS.slice(0, 4)) {
    const run = createRunForPlayer(`player-${question.questionId}`)
    const first = currentQuestionForRun(run)
    assert.ok(first)
    const wrong = first.correctSide === 'A' ? 'B' : 'A'
    assert.equal(answerQuestion(run, first, wrong).correct, false)
    assert.equal(answerQuestion(run, first, first.correctSide).correct, true)
    assert.equal(answerQuestion(run, first, wrong).run.lastAnswer?.correct, false)
    assert.equal(answerQuestion(run, first, wrong).run.lastAnswer?.correctAnswer, first.correctSide === 'A' ? first.answerA : first.answerB)
  }
})

test('main board and both destination signs share one authoritative answer definition', () => {
  assert.equal(CURATED_QUESTIONS.length, QUIZ_QUESTIONS.length)
  for (const [index, question] of QUIZ_QUESTIONS.entries()) {
    const presentation = CURATED_QUESTIONS[index]
    assert.equal(presentation.question, question.questionText)
    assert.equal(presentation.choiceA, question.answerA)
    assert.equal(presentation.choiceB, question.answerB)
    assert.equal(presentation.correctSide, question.correctSide)
  }
})

test('question bank is deterministic, validated, and large enough for endless play', () => {
  assert.equal(validateQuestionBank(QUESTION_BANK).length, 0)
  assert.ok(QUESTION_BANK.length >= 200)
  assert.equal(new Set(QUESTION_BANK.map((question) => question.questionId)).size, QUESTION_BANK.length)
})

test('rank and Master Star thresholds are stable at their boundaries', () => {
  assert.equal(rankForLifetimeCorrect(0), 'DORMANT')
  assert.equal(rankForLifetimeCorrect(1), 'AWAKENED')
  assert.equal(rankForLifetimeCorrect(5), 'SHADE')
  assert.equal(rankForLifetimeCorrect(10), 'WRAITH')
  assert.equal(rankForLifetimeCorrect(18), 'ECLIPSE')
  assert.equal(rankForLifetimeCorrect(30), 'MASTER')
  assert.equal(masterStarsForLifetimeCorrect(29), 0)
  assert.equal(masterStarsForLifetimeCorrect(40), 1)
  assert.equal(masterStarsForLifetimeCorrect(60), 3)
})

test('duplicate answers do not advance a question twice', () => {
  const run = createRunForPlayer('duplicate-player')
  const question = currentQuestionForRun(run)
  assert.ok(question)
  const answered = answerQuestion(run, question, question.correctSide)
  const duplicate = answerQuestion(answered.run, question, question.correctSide)
  assert.equal(duplicate.run.currentQuestionIndex, answered.run.currentQuestionIndex)
  assert.equal(duplicate.run.answeredQuestionIds.length, 1)
})

test('endless flow crosses a deck boundary and creates one House record at Master', () => {
  let state = createInitialState()
  const run = createRunForPlayer('master-player')
  let current = run
  for (let index = 0; index < 31; index += 1) {
    const question = currentQuestionForRun(current)
    assert.ok(question)
    const result = applyQuizAnswer(state, current, question.correctSide, 'master-player')
    state = result.state
    current = result.run
  }
  assert.equal(current.completed, false)
  assert.ok(current.questionCycle >= 0)
  assert.equal(current.shadowRank, 'MASTER')
  assert.equal(state.shadows.length, 1)
  assert.equal(state.houseMasters.length, 1)
  assert.equal(state.houseMasters[0].playerId, 'master-player')
  const nextClient = createClientState(state, current)
  assert.notEqual(nextClient.questionId, 'quiz-complete')
  assert.equal(nextClient.questionId, current.currentQuestionId)
})

test('wrong answers do not score and reset the chain without downgrading lifetime rank', () => {
  const run = createRunForPlayer('wrong-player')
  const first = currentQuestionForRun(run)
  assert.ok(first)
  const wrong = first.correctSide === 'A' ? 'B' : 'A'
  const result = answerQuestion(run, first, wrong)
  assert.equal(result.correct, false)
  assert.equal(result.run.shadowScore, 0)
  assert.equal(result.run.currentStreak, 0)
  assert.equal(result.run.chainLost, undefined)
})

test('fifty accepted answers continue without a hidden terminal question', () => {
  let state = createInitialState()
  let run = createRunForPlayer('fifty-player')
  for (let index = 0; index < 50; index += 1) {
    const question = currentQuestionForRun(run)
    assert.ok(question)
    const result = applyQuizAnswer(state, run, question.correctSide, 'fifty-player')
    state = result.state
    run = result.run
  }
  assert.equal(run.completed, false)
  assert.equal(run.lifetimeAnswered, 50)
  assert.equal(run.lifetimeCorrect, 50)
  assert.equal(run.shadowRank, 'MASTER')
  assert.equal(state.houseMasters.length, 1)
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
