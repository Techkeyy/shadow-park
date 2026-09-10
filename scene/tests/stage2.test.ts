import assert from 'node:assert/strict'
import test from 'node:test'
import { runCriticalAnswerTransition } from '../src/client/core-transition.ts'
import {
  ENERGY_ARC_HEIGHT,
  ENERGY_FLIGHT_DURATION_MS,
  ENERGY_TRAIL_CAPACITY,
  createBoundedPool,
  createSingleton,
  energyArcPoint,
  rankProgressForCorrectCount,
  runNonBlockingPresentationSteps
} from '../src/client/stage2-feedback.ts'
import {
  applyQuizAnswer,
  createInitialState,
  createRunForPlayer,
  currentQuestionForRun,
  rankForLifetimeCorrect,
  shadowLevelForCorrectCount
} from '../src/shared/state.ts'
import {
  DECISION_ROUTE_BOUNDS,
  PERSONAL_SHADOW_LAYOUT,
  personalShadowMinimumVisualSeparation
} from '../src/shared/zones.ts'

test('audio failure does not block the CORE path', () => {
  const order: string[] = []
  let scheduled: (() => void) | undefined
  const failures: string[] = []

  runCriticalAnswerTransition({
    clearLockingUi: () => order.push('answer'),
    renderAuthoritativeResult: () => order.push('result'),
    startRecenter: () => order.push('recenter'),
    schedulePresentation: (task) => { scheduled = task },
    presentation: () => runNonBlockingPresentationSteps([{ name: 'audio', run: () => { throw new Error('audio') } }], (failure) => failures.push(failure.name))
  })

  assert.deepEqual(order, ['answer', 'result', 'recenter'])
  scheduled?.()
  assert.deepEqual(failures, ['audio'])
  assert.deepEqual(order, ['answer', 'result', 'recenter'])
})

test('energy, Shadow, and rank presentation failures are isolated independently', () => {
  const failures: string[] = []
  runNonBlockingPresentationSteps(
    [
      { name: 'energy', run: () => { throw new Error('energy') } },
      { name: 'shadow_reaction', run: () => { throw new Error('shadow') } },
      { name: 'rank_presentation', run: () => { throw new Error('rank') } }
    ],
    (failure) => failures.push(failure.name)
  )
  assert.deepEqual(failures, ['energy', 'shadow_reaction', 'rank_presentation'])
})

test('CHAIN increments on correct, resets on wrong, and preserves Best Chain', () => {
  let state = createInitialState()
  let run = createRunForPlayer('stage2-chain')
  const first = currentQuestionForRun(run)
  assert.ok(first)
  let result = applyQuizAnswer(state, run, first.correctSide, 'stage2-chain')
  state = result.state
  run = result.run
  assert.equal(run.currentStreak, 1)
  assert.equal(run.bestStreak, 1)

  const second = currentQuestionForRun(run)
  assert.ok(second)
  result = applyQuizAnswer(state, run, second.correctSide, 'stage2-chain')
  state = result.state
  run = result.run
  assert.equal(run.currentStreak, 2)
  assert.equal(run.bestStreak, 2)

  const third = currentQuestionForRun(run)
  assert.ok(third)
  const wrong = third.correctSide === 'A' ? 'B' : 'A'
  result = applyQuizAnswer(state, run, wrong, 'stage2-chain')
  run = result.run
  assert.equal(run.currentStreak, 0)
  assert.equal(run.bestStreak, 2)
  assert.equal(result.chainLost, true)
})

test('rank thresholds and visible Shadow evolution stay locked', () => {
  const thresholds = [
    [0, 'DORMANT', 0],
    [1, 'AWAKENED', 1],
    [5, 'SHADE', 2],
    [10, 'WRAITH', 3],
    [18, 'ECLIPSE', 4],
    [30, 'MASTER', 5]
  ] as const

  for (const [correct, rank, level] of thresholds) {
    assert.equal(rankForLifetimeCorrect(correct), rank)
    assert.equal(shadowLevelForCorrectCount(correct), level)
  }
})

test('Personal Shadow remains beside its board with measured mobile-safe clearance', () => {
  assert.ok(personalShadowMinimumVisualSeparation() >= 0.4)
  assert.ok(PERSONAL_SHADOW_LAYOUT.platform.centerZ + PERSONAL_SHADOW_LAYOUT.platform.depth / 2 < DECISION_ROUTE_BOUNDS.A.minZ)
  assert.equal(PERSONAL_SHADOW_LAYOUT.avatar.centerX, PERSONAL_SHADOW_LAYOUT.platform.centerX)
  assert.equal(PERSONAL_SHADOW_LAYOUT.avatar.centerZ, PERSONAL_SHADOW_LAYOUT.platform.centerZ)
})

test('bounded feedback pool stays bounded through 30 answers', () => {
  let created = 0
  const pool = createBoundedPool(2, () => ({ id: created++ }))
  const active: Array<{ id: number }> = []

  for (let answer = 0; answer < 30; answer += 1) {
    let effect = pool.acquire()
    if (!effect) {
      const released = active.shift()
      assert.ok(released)
      pool.release(released)
      effect = pool.acquire()
    }
    assert.ok(effect)
    active.push(effect)
    assert.ok(pool.size() <= 2)
    assert.ok(pool.inUse() <= 2)
  }

  assert.equal(created, 2)
})

test('Personal Shadow singleton reuses one root across repeated presentation requests', () => {
  const singleton = createSingleton<{ id: number }>()
  let creates = 0
  const first = singleton.getOrCreate(() => ({ id: creates++ }))
  const second = singleton.getOrCreate(() => ({ id: creates++ }))
  assert.equal(first, second)
  assert.equal(singleton.peek(), first)
  assert.equal(creates, 1)
})

test('Q30 reaches MASTER and Q31 remains READY/accepted', () => {
  let state = createInitialState()
  let run = createRunForPlayer('stage2-master')
  for (let answer = 0; answer < 30; answer += 1) {
    const question = currentQuestionForRun(run)
    assert.ok(question)
    const result = applyQuizAnswer(state, run, question.correctSide, 'stage2-master')
    state = result.state
    run = result.run
  }

  assert.equal(run.shadowRank, 'MASTER')
  assert.equal(run.completed, false)
  const q31 = currentQuestionForRun(run)
  assert.ok(q31)
  const afterMaster = applyQuizAnswer(state, run, q31.correctSide, 'stage2-master')
  assert.equal(afterMaster.correct, true)
  assert.equal(afterMaster.run.lifetimeCorrect, 31)
  assert.equal(afterMaster.run.completed, false)
  assert.ok(afterMaster.nextQuestion)
})


test('mobile energy arc has authored endpoints and a readable bounded lift', () => {
  const from = { x: 2.8, y: 0.28, z: 6.8 }
  const to = { x: 7, y: 1.37, z: 4.17 }
  const start = energyArcPoint(from, to, 0)
  const middle = energyArcPoint(from, to, 0.5)
  const end = energyArcPoint(from, to, 1)
  assert.deepEqual(start, from)
  assert.deepEqual(end, to)
  assert.ok(middle.y > Math.max(from.y, to.y))
  assert.equal(ENERGY_FLIGHT_DURATION_MS >= 650 && ENERGY_FLIGHT_DURATION_MS <= 900, true)
  assert.equal(ENERGY_TRAIL_CAPACITY, 4)
  assert.ok(ENERGY_ARC_HEIGHT > 0)
})

test('next-rank progress uses exact authoritative thresholds', () => {
  assert.deepEqual(rankProgressForCorrectCount(3), { current: 3, target: 5, nextRank: 'SHADE' })
  assert.deepEqual(rankProgressForCorrectCount(7), { current: 7, target: 10, nextRank: 'WRAITH' })
  assert.deepEqual(rankProgressForCorrectCount(14), { current: 14, target: 18, nextRank: 'ECLIPSE' })
  assert.deepEqual(rankProgressForCorrectCount(23), { current: 23, target: 30, nextRank: 'MASTER' })
  assert.deepEqual(rankProgressForCorrectCount(30), { current: 30, target: null, nextRank: null })
})

test('orb plus trail pools remain bounded after 30 feedback requests', () => {
  let orbCreated = 0
  let trailCreated = 0
  const orbPool = createBoundedPool(2, () => ({ id: orbCreated++ }))
  const trailPool = createBoundedPool(ENERGY_TRAIL_CAPACITY, () => ({ id: trailCreated++ }))
  for (let answer = 0; answer < 30; answer += 1) {
    const orb = orbPool.acquire()
    assert.ok(orb)
    const trails = Array.from({ length: ENERGY_TRAIL_CAPACITY }, () => trailPool.acquire()).filter(Boolean)
    assert.equal(trails.length, ENERGY_TRAIL_CAPACITY)
    orbPool.release(orb)
    for (const trail of trails) if (trail) trailPool.release(trail)
  }
  assert.equal(orbCreated, 1)
  assert.equal(trailCreated, ENERGY_TRAIL_CAPACITY)
  assert.equal(orbPool.size(), 1)
  assert.equal(trailPool.size(), ENERGY_TRAIL_CAPACITY)
})
