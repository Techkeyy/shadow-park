import test from 'node:test'
import assert from 'node:assert/strict'
import { runCriticalAnswerTransition } from '../src/client/core-transition.ts'
import { RECENTER_POLL_DELAYS_MS, recenterAndVerify } from '../src/client/recenter.ts'
import type { RecenterPosition } from '../src/client/recenter.ts'

const target: RecenterPosition = { x: 8, y: 0.15, z: 1.5 }
const tolerance = { x: 1.6, z: 1.1 }

test('critical answer transition reaches recenter/ready before slow Shadow presentation', () => {
  const order: string[] = []
  let scheduledPresentation: (() => void) | undefined
  let ready = false

  runCriticalAnswerTransition({
    clearLockingUi: () => order.push('locking_ui_cleared'),
    renderAuthoritativeResult: () => order.push('result_ui_set'),
    startRecenter: () => {
      order.push('recenter_started')
      ready = true
    },
    schedulePresentation: (presentation) => {
      scheduledPresentation = presentation
    },
    presentation: () => {
      order.push('slow_personal_shadow_started')
      void new Promise<void>((resolve) => setTimeout(resolve, 2000))
    }
  })

  assert.deepEqual(order, ['locking_ui_cleared', 'result_ui_set', 'recenter_started'])
  assert.equal(ready, true)
  assert.equal(typeof scheduledPresentation, 'function')

  scheduledPresentation?.()
  assert.deepEqual(order, ['locking_ui_cleared', 'result_ui_set', 'recenter_started', 'slow_personal_shadow_started'])
})

test('presentation failure is isolated after the critical path is ready', () => {
  const order: string[] = []
  let scheduledPresentation: (() => void) | undefined
  let ready = false

  runCriticalAnswerTransition({
    clearLockingUi: () => order.push('locking_ui_cleared'),
    renderAuthoritativeResult: () => order.push('result_ui_set'),
    startRecenter: () => {
      order.push('recenter_started')
      ready = true
    },
    schedulePresentation: (presentation) => {
      scheduledPresentation = presentation
    },
    presentation: () => {
      throw new Error('AvatarShape unavailable')
    }
  })

  assert.equal(ready, true)
  assert.deepEqual(order, ['locking_ui_cleared', 'result_ui_set', 'recenter_started'])
  assert.throws(() => scheduledPresentation?.(), /AvatarShape unavailable/)
  assert.equal(ready, true)
})

test('recenter harness verifies the exact production helper from every decision-route position', async () => {
  const positions: RecenterPosition[] = [
    { x: 5.2, y: 0.15, z: 6.8 }, // A center
    { x: 2.88, y: 0.15, z: 5.27 }, // A edge
    { x: 10.8, y: 0.15, z: 6.8 }, // B center
    { x: 13.12, y: 0.15, z: 8.51 }, // B edge
    { x: 8, y: 0.15, z: 0.1 }, // behind / south
    { x: 15.2, y: 0.15, z: 14.8 }, // diagonal / far corner
  ]

  for (const initialPosition of positions) {
    let current = { ...initialPosition }
    const requests: Record<string, unknown>[] = []
    const result = await recenterAndVerify({
      target,
      tolerance,
      readPosition: () => current,
      move: (request) => {
        requests.push(request as unknown as Record<string, unknown>)
        current = { ...target }
        return { success: true }
      },
      wait: async () => undefined,
      maxAttempts: 3
    })

    assert.equal(result.verified, true, `failed from ${JSON.stringify(initialPosition)}`)
    assert.equal(Math.abs(current.x - target.x) <= tolerance.x, true)
    assert.equal(Math.abs(current.z - target.z) <= tolerance.z, true)
    assert.equal(requests.length, 1)
    assert.equal('duration' in requests[0], false)
  }
})

test('recenter does not wait for a permanently pending SDK move promise', async () => {
  let current: RecenterPosition = { x: 4, y: 0.15, z: 6.8 }
  let moveCalled = false
  const result = await recenterAndVerify({
    target,
    tolerance,
    readPosition: () => current,
    move: () => {
      moveCalled = true
      current = { ...target }
      return new Promise(() => undefined)
    },
    wait: async () => undefined,
    maxAttempts: 1
  })

  assert.equal(moveCalled, true)
  assert.equal(result.verified, true)
  assert.deepEqual(RECENTER_POLL_DELAYS_MS, [0, 50, 100, 200, 350])
})
