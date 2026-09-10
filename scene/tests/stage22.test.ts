import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import {
  answerQuestion,
  createInitialState,
  createRunForPlayer,
  currentQuestionForRun,
  displaySideScheduleFor,
  parseState
} from '../src/shared/state.ts'
import { SAFE_PERSONAL_SHADOW_MAX_SCALE, shadowBaselineScaleForCorrectCount } from '../src/client/stage2-feedback.ts'

function longestRun(values: Array<'A' | 'B'>): number {
  let longest = 0
  let current = 0
  let previous: 'A' | 'B' | null = null
  for (const value of values) {
    current = value === previous ? current + 1 : 1
    longest = Math.max(longest, current)
    previous = value
  }
  return longest
}

test('display-side schedule is balanced, deterministic, and caps same-side runs at two', () => {
  const questionIds = Array.from({ length: 240 }, (_, index) => 'question-' + index)
  const first = displaySideScheduleFor('stage22-balance-player', 0, questionIds)
  const second = displaySideScheduleFor('stage22-balance-player', 0, questionIds)
  const countA = first.filter((side) => side === 'A').length
  const countB = first.filter((side) => side === 'B').length
  assert.deepEqual(first, second)
  assert.ok(Math.abs(countA - countB) <= 1)
  assert.ok(first.includes('A'))
  assert.ok(first.includes('B'))
  assert.ok(longestRun(first) <= 2)
  assert.ok(first.some((side, index) => index > 0 && side === first[index - 1]), 'schedule should not collapse into fixed alternation')
})

test('persisted display mapping keeps the same visible question and correct side after reconnect', () => {
  const run = createRunForPlayer('stage22-reconnect-player')
  const question = currentQuestionForRun(run)
  assert.ok(question)
  const state = createInitialState()
  state.run = run
  const parsed = parseState(JSON.parse(JSON.stringify(state)))
  assert.ok(parsed?.run)
  const rehydratedQuestion = currentQuestionForRun(parsed.run)
  assert.ok(rehydratedQuestion)
  assert.deepEqual(
    { questionId: question.questionId, answerA: question.answerA, answerB: question.answerB, correctSide: question.correctSide },
    { questionId: rehydratedQuestion.questionId, answerA: rehydratedQuestion.answerA, answerB: rehydratedQuestion.answerB, correctSide: rehydratedQuestion.correctSide }
  )
})

test('authoritative answers are accepted when the scheduled correct side is A and when it is B', () => {
  let sideA: ReturnType<typeof createRunForPlayer> | null = null
  let sideB: ReturnType<typeof createRunForPlayer> | null = null
  for (let index = 0; index < 200 && (!sideA || !sideB); index += 1) {
    const candidate = createRunForPlayer('stage22-side-player-' + index)
    const question = currentQuestionForRun(candidate)
    if (!question) continue
    if (question.correctSide === 'A') sideA = candidate
    else sideB = candidate
  }
  assert.ok(sideA)
  assert.ok(sideB)
  const questionA = currentQuestionForRun(sideA)
  const questionB = currentQuestionForRun(sideB)
  assert.ok(questionA)
  assert.ok(questionB)
  assert.equal(questionA.correctSide, 'A')
  assert.equal(questionB.correctSide, 'B')
  assert.equal(answerQuestion(sideA, questionA, 'A').correct, true)
  assert.equal(answerQuestion(sideB, questionB, 'B').correct, true)
  assert.equal(answerQuestion(sideA, questionA, 'B').correct, false)
  assert.equal(answerQuestion(sideB, questionB, 'A').correct, false)
})

test('permanent Shadow growth is monotonic, bounded, and stops at MASTER', () => {
  const counts = [0, 1, 4, 5, 9, 10, 17, 18, 29, 30, 31, 100]
  const scales = counts.map(shadowBaselineScaleForCorrectCount)
  for (let index = 1; index < scales.length; index += 1) assert.ok(scales[index] >= scales[index - 1])
  assert.equal(shadowBaselineScaleForCorrectCount(0), 0.92)
  assert.equal(shadowBaselineScaleForCorrectCount(30), SAFE_PERSONAL_SHADOW_MAX_SCALE)
  assert.equal(shadowBaselineScaleForCorrectCount(100), SAFE_PERSONAL_SHADOW_MAX_SCALE)
  assert.ok(scales.every((scale) => scale <= SAFE_PERSONAL_SHADOW_MAX_SCALE))
  const wrongRun = createRunForPlayer('stage22-wrong-growth')
  const wrongQuestion = currentQuestionForRun(wrongRun)
  assert.ok(wrongQuestion)
  const wrong = answerQuestion(wrongRun, wrongQuestion, wrongQuestion.correctSide === 'A' ? 'B' : 'A')
  assert.equal(wrong.run.lifetimeCorrect, 0)
  assert.equal(shadowBaselineScaleForCorrectCount(wrong.run.lifetimeCorrect), 0.92)
})

test('Stage 2.2 removes obsolete active-scene placeholders and duplicate score label', () => {
  const presentation = fs.readFileSync('src/client/presentation-v2.ts', 'utf8')
  const activeStart = presentation.indexOf('export function createPresentationV2()')
  const activeEnd = presentation.indexOf('function ensurePersonalShadowImpactVisuals', activeStart)
  const active = presentation.slice(activeStart, activeEnd)
  assert.ok(activeStart >= 0 && activeEnd > activeStart)
  assert.equal(active.includes('createHouseOfMasters()'), false)
  assert.equal(active.includes('your-shadow.png'), false)
  const ui = fs.readFileSync('src/client/ui.tsx', 'utf8')
  assert.equal(ui.includes('uiState.hydrated && !showResult && <Label value='), false)
})
