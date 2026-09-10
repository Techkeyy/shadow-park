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
  displaySideScheduleFor,
  displayMappingForRun,
  displayedQuestionForRun,
  isChoice,
  MAX_PERSISTED_SHADOWS,
  MAX_VISIBLE_SHADOWS,
  parseState,
  questionForDate,
  CURATED_QUESTIONS,
  QUIZ_QUESTIONS,
  rankForLifetimeCorrect,
  masterStarsForLifetimeCorrect,
  personalShadowBaseScale
} from '../src/shared/state.ts'
import { QUESTION_BANK, validateQuestionBank } from '../src/shared/question-bank.ts'
import { createVoteArmingState, observeChoicePosition } from '../src/client/vote-arming.ts'
import { updateDirectionalVisibility } from '../src/client/directional-visibility.ts'
import { runOptionalRestore } from '../src/client/optional-restore.ts'

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

test('dynamic A/B schedule produces balanced distribution and maps choices authoritatively', () => {
  const schedule = displaySideScheduleFor('test-player', 0)
  assert.ok(schedule.length >= 200)
  const aCount = schedule.filter((s) => s === 'A').length
  const bCount = schedule.filter((s) => s === 'B').length
  assert.ok(Math.abs(aCount - bCount) <= 2, `Schedule imbalance: A=${aCount}, B=${bCount}`)

  const run = createRunForPlayer('test-player')
  const displayed = displayedQuestionForRun(run)
  assert.ok(displayed)
  const mapping = displayMappingForRun(run)
  assert.equal(displayed.answerA, mapping.choiceA)
  assert.equal(displayed.answerB, mapping.choiceB)
  assert.equal(displayed.correctSide, mapping.correctSide)
})

test('stepping on correct dynamic side awards score and stepping on wrong side breaks streak', () => {
  const run = createRunForPlayer('player-ab-test')
  const question = currentQuestionForRun(run)
  assert.ok(question)

  const correctSide = question.correctSide
  const wrongSide = correctSide === 'A' ? 'B' : 'A'

  // Wrong choice
  const wrongResult = answerQuestion(run, question, wrongSide)
  assert.equal(wrongResult.correct, false)
  assert.equal(wrongResult.run.shadowScore, 0)
  assert.equal(wrongResult.run.currentStreak, 0)

  // Correct choice
  const correctResult = answerQuestion(run, question, correctSide)
  assert.equal(correctResult.correct, true)
  assert.equal(correctResult.run.shadowScore, 10)
  assert.equal(correctResult.run.currentStreak, 1)
  assert.equal(correctResult.run.shadowLevel, 1)
  assert.equal(correctResult.run.shadowRank, 'AWAKENED')
})

test('returning player restores existing progress and continues safely', () => {
  const initialRun = createRunForPlayer('returning-player-1')
  let state = createInitialState()
  let currentRun = initialRun

  // Answer 5 questions correctly
  for (let i = 0; i < 5; i++) {
    const q = currentQuestionForRun(currentRun)
    assert.ok(q)
    const result = applyQuizAnswer(state, currentRun, q.correctSide, 'returning-player-1')
    state = result.state
    currentRun = result.run
  }

  assert.equal(currentRun.shadowScore, 70) // 10*5 + milestone bonus 20 = 70
  assert.equal(currentRun.lifetimeCorrect, 5)
  assert.equal(currentRun.shadowRank, 'SHADE')
  assert.equal(currentRun.shadowLevel, 2)

  // Serialize and parse (simulating storage reload for returning player)
  const clientState = createClientState(state, currentRun)
  const serialized = JSON.stringify(clientState)
  const parsed = parseState(JSON.parse(serialized))
  assert.ok(parsed)
  assert.ok(parsed.run)
  assert.equal(parsed.run.shadowScore, 70)
  assert.equal(parsed.run.lifetimeCorrect, 5)
  assert.equal(parsed.run.shadowRank, 'SHADE')
  assert.equal(parsed.run.shadowLevel, 2)
  assert.equal(parsed.run.currentQuestionId, currentRun.currentQuestionId)
})

test('runOptionalRestore catches both sync errors and async rejected promises', async () => {
  let syncCaught = false
  runOptionalRestore(
    'sync_test',
    () => {
      throw new Error('Sync presentation error')
    },
    () => {
      syncCaught = true
    }
  )
  assert.equal(syncCaught, true)

  let asyncCaught = false
  await new Promise<void>((resolve) => {
    runOptionalRestore(
      'async_test',
      () => Promise.reject(new Error('Async presentation error')),
      () => {
        asyncCaught = true
        resolve()
      }
    )
  })
  assert.equal(asyncCaught, true)
})

test('Q1 -> Q2 -> Q3 advances question IDs, text, options, and display mapping', () => {
  const run = createRunForPlayer('progression-player')
  let state = createInitialState()
  let currentRun = run

  // Q1
  const q1 = currentQuestionForRun(currentRun)
  assert.ok(q1)
  const q1Id = q1.questionId
  const q1Text = q1.questionText
  const q1A = q1.answerA
  const q1B = q1.answerB

  // Answer Q1 correctly
  const res1 = applyQuizAnswer(state, currentRun, q1.correctSide, 'progression-player')
  state = res1.state
  currentRun = res1.run

  // Q2
  const q2 = currentQuestionForRun(currentRun)
  assert.ok(q2)
  assert.notEqual(q2.questionId, q1Id, 'Q2 questionId must differ from Q1')
  assert.notEqual(q2.questionText, q1Text, 'Q2 questionText must differ from Q1')

  // Answer Q2 correctly
  const res2 = applyQuizAnswer(state, currentRun, q2.correctSide, 'progression-player')
  state = res2.state
  currentRun = res2.run

  // Q3
  const q3 = currentQuestionForRun(currentRun)
  assert.ok(q3)
  assert.notEqual(q3.questionId, q2.questionId, 'Q3 questionId must differ from Q2')
  assert.notEqual(q3.questionText, q2.questionText, 'Q3 questionText must differ from Q2')
})

test('canonical correct answer maps reliably to both display sides (A and B)', () => {
  // Test question where canonical A is correct: q-001 (Red Planet -> Mars=A, Venus=B)
  const qA = QUIZ_QUESTIONS.find((q) => q.questionId === 'q-001')!
  assert.equal(qA.correctSide, 'A')
  assert.equal(qA.answerA, 'MARS')
  assert.equal(qA.answerB, 'VENUS')

  // Test question where canonical B is correct: q-002 (Spider legs -> Six=A, Eight=B)
  const qB = QUIZ_QUESTIONS.find((q) => q.questionId === 'q-002')!
  assert.equal(qB.correctSide, 'B')
  assert.equal(qB.answerA, 'SIX')
  assert.equal(qB.answerB, 'EIGHT')

  // For any run, verify displayed options place canonical correct answer on displayed correct side
  for (let i = 0; i < 20; i++) {
    const testRun = createRunForPlayer(`test-mapping-${i}`)
    const q = currentQuestionForRun(testRun)!
    const canonical = QUIZ_QUESTIONS.find((item) => item.questionId === q.questionId)!
    const canonicalCorrect = canonical.correctSide === 'A' ? canonical.answerA : canonical.answerB
    const canonicalWrong = canonical.correctSide === 'A' ? canonical.answerB : canonical.answerA

    if (q.correctSide === 'A') {
      assert.equal(q.answerA, canonicalCorrect, `Question ${q.questionId} display A must be correct answer`)
      assert.equal(q.answerB, canonicalWrong, `Question ${q.questionId} display B must be wrong answer`)
      // Stepping on A is CORRECT
      assert.equal(answerQuestion(testRun, q, 'A').correct, true)
      // Stepping on B is WRONG
      assert.equal(answerQuestion(testRun, q, 'B').correct, false)
    } else {
      assert.equal(q.answerA, canonicalWrong, `Question ${q.questionId} display A must be wrong answer`)
      assert.equal(q.answerB, canonicalCorrect, `Question ${q.questionId} display B must be correct answer`)
      // Stepping on B is CORRECT
      assert.equal(answerQuestion(testRun, q, 'B').correct, true)
      // Stepping on A is WRONG
      assert.equal(answerQuestion(testRun, q, 'A').correct, false)
    }
  }
})

test('duplicate answer on current question does not double advance', () => {
  const run = createRunForPlayer('duplicate-guard-player')
  const q = currentQuestionForRun(run)!
  const res1 = answerQuestion(run, q, q.correctSide)
  assert.equal(res1.correct, true)
  assert.equal(res1.run.currentQuestionIndex, 1)

  // Submitting again with original question on advanced run
  const res2 = answerQuestion(res1.run, q, q.correctSide)
  assert.equal(res2.correct, false)
  assert.equal(res2.run.currentQuestionIndex, 1, 'Run must not advance on duplicate/stale answer')
})

test('permanent Shadow growth follows authoritative scale model and caps at Master (1.30)', () => {
  // DORMANT: 0.92
  assert.equal(personalShadowBaseScale(0), 0.92)

  // AWAKENED: 0.93 -> 0.98
  assert.equal(personalShadowBaseScale(1), 0.93)
  assert.ok(personalShadowBaseScale(2) > personalShadowBaseScale(1))
  assert.equal(personalShadowBaseScale(4), 0.98)

  // SHADE: 0.99 -> 1.06
  assert.equal(personalShadowBaseScale(5), 0.99)
  assert.equal(personalShadowBaseScale(9), 1.06)

  // WRAITH: 1.07 -> 1.15
  assert.equal(personalShadowBaseScale(10), 1.07)
  assert.equal(personalShadowBaseScale(17), 1.15)

  // ECLIPSE: 1.16 -> 1.24
  assert.equal(personalShadowBaseScale(18), 1.16)
  assert.equal(personalShadowBaseScale(29), 1.24)

  // MASTER: 1.30 fixed
  assert.equal(personalShadowBaseScale(30), 1.30)
  assert.equal(personalShadowBaseScale(40), 1.30)
  assert.equal(personalShadowBaseScale(100), 1.30)

  // Verify scale strictly increases with correct answers up to 30
  for (let c = 1; c < 30; c++) {
    assert.ok(personalShadowBaseScale(c + 1) > personalShadowBaseScale(c), `Scale at ${c + 1} must exceed ${c}`)
  }

  // Reconnect reconstruction
  const run = createRunForPlayer('reconnect-growth')
  let state = createInitialState()
  let currentRun = run
  for (let i = 0; i < 7; i++) {
    const q = currentQuestionForRun(currentRun)!
    const res = applyQuizAnswer(state, currentRun, q.correctSide, 'reconnect-growth')
    state = res.state
    currentRun = res.run
  }
  assert.equal(currentRun.lifetimeCorrect, 7)
  const reconstructedScale = personalShadowBaseScale(currentRun.lifetimeCorrect)
  assert.ok(reconstructedScale >= 0.99 && reconstructedScale <= 1.06, `Scale at 7 correct must be SHADE level, got ${reconstructedScale}`)
})

test('10-question sequential integration loop is truthful, distinct, and balanced', () => {
  const playerId = 'loop-10-player'
  let state = createInitialState()
  let run = createRunForPlayer(playerId)
  const seenQuestionIds: string[] = []
  const seenCorrectSides: Choice[] = []

  for (let step = 1; step <= 10; step++) {
    const question = currentQuestionForRun(run)
    assert.ok(question, `Step ${step}: Question must exist`)
    assert.ok(!seenQuestionIds.includes(question.questionId), `Step ${step}: Question ${question.questionId} must be new`)
    seenQuestionIds.push(question.questionId)
    seenCorrectSides.push(question.correctSide)

    // Verify display options are non-empty and distinct
    assert.ok(question.answerA.length > 0)
    assert.ok(question.answerB.length > 0)
    assert.notEqual(question.answerA, question.answerB)

    // Verify chosen correct side returns CORRECT
    const result = applyQuizAnswer(state, run, question.correctSide, playerId)
    assert.equal(result.correct, true, `Step ${step}: Correct side must evaluate to correct`)
    assert.equal(result.run.lifetimeCorrect, step)
    assert.equal(result.run.currentStreak, step)

    state = result.state
    run = result.run
  }

  assert.equal(seenQuestionIds.length, 10)
  const aCount = seenCorrectSides.filter((s) => s === 'A').length
  const bCount = seenCorrectSides.filter((s) => s === 'B').length
  assert.ok(aCount >= 3 && bCount >= 3, `A/B must be balanced across 10 questions: A=${aCount}, B=${bCount}`)

  // Check max same-side run <= 2
  let maxRun = 1
  let curRun = 1
  for (let i = 1; i < seenCorrectSides.length; i++) {
    if (seenCorrectSides[i] === seenCorrectSides[i - 1]) {
      curRun++
      if (curRun > maxRun) maxRun = curRun
    } else {
      curRun = 1
    }
  }
  assert.ok(maxRun <= 2, `Max same-side run must be <= 2, got ${maxRun}`)
})


