export type PresentationStep = {
  name: string
  run: () => void
}

export type PresentationFailure = {
  name: string
  error: unknown
}

/**
 * Run optional feedback one step at a time. A broken cue must not prevent the
 * other cues from running, and none of these callbacks belong on the answer
 * critical path.
 */
export function runNonBlockingPresentationSteps(steps: PresentationStep[], onFailure: (failure: PresentationFailure) => void): void {
  for (const step of steps) {
    try {
      step.run()
    } catch (error) {
      onFailure({ name: step.name, error })
    }
  }
}

export type BoundedPool<T> = {
  acquire: () => T | null
  release: (value: T) => void
  size: () => number
  inUse: () => number
}

/**
 * A tiny reusable pool for mobile feedback effects. Once capacity is reached,
 * acquire returns null instead of allocating unbounded entities.
 */
export function createBoundedPool<T>(capacity: number, factory: () => T): BoundedPool<T> {
  const slots: Array<{ value: T; inUse: boolean }> = []
  const limit = Math.max(1, Math.floor(capacity))

  return {
    acquire() {
      const available = slots.find((slot) => !slot.inUse)
      if (available) {
        available.inUse = true
        return available.value
      }
      if (slots.length >= limit) return null
      const value = factory()
      slots.push({ value, inUse: true })
      return value
    },
    release(value) {
      const slot = slots.find((candidate) => candidate.value === value)
      if (slot) slot.inUse = false
    },
    size: () => slots.length,
    inUse: () => slots.filter((slot) => slot.inUse).length
  }
}

export type Singleton<T> = {
  getOrCreate: (factory: () => T) => T
  peek: () => T | null
}

export function createSingleton<T>(): Singleton<T> {
  let value: T | null = null
  return {
    getOrCreate(factory) {
      if (value === null) value = factory()
      return value
    },
    peek: () => value
  }
}

export const ENERGY_FLIGHT_DURATION_MS = 780
export const ENERGY_ARC_HEIGHT = 0.64
export const ENERGY_TRAIL_CAPACITY = 4

export type EnergyArcPoint = {
  x: number
  y: number
  z: number
}

/** Deterministic, bounded launch arc used by the mobile feedback effect. */
export function energyArcPoint(from: EnergyArcPoint, to: EnergyArcPoint, progress: number, arcHeight = ENERGY_ARC_HEIGHT): EnergyArcPoint {
  const t = Math.max(0, Math.min(1, progress))
  const eased = t * (2 - t)
  return {
    x: from.x + (to.x - from.x) * eased,
    y: from.y + (to.y - from.y) * eased + Math.sin(t * Math.PI) * arcHeight,
    z: from.z + (to.z - from.z) * eased
  }
}

export type RankProgress = {
  current: number
  target: number | null
  nextRank: string | null
}

/** Uses the authoritative rank thresholds without inventing percentage progress. */
export function rankProgressForCorrectCount(correctCount: number): RankProgress {
  const targets: Array<[number, string]> = [
    [1, 'AWAKENED'],
    [5, 'SHADE'],
    [10, 'WRAITH'],
    [18, 'ECLIPSE'],
    [30, 'MASTER']
  ]
  const next = targets.find(([threshold]) => correctCount < threshold)
  return { current: Math.max(0, correctCount), target: next?.[0] ?? null, nextRank: next?.[1] ?? null }
}
