export type RecenterPosition = {
  x: number
  y: number
  z: number
}

export type RecenterRequest = {
  newRelativePosition: RecenterPosition
  cameraTarget: RecenterPosition
  avatarTarget: RecenterPosition
}

export type RecenterMoveResult = {
  success?: boolean
}

export type RecenterOptions = {
  target: RecenterPosition
  tolerance: {
    x: number
    z: number
  }
  readPosition: () => RecenterPosition | null
  move: (request: RecenterRequest) => Promise<RecenterMoveResult> | RecenterMoveResult
  wait: (milliseconds: number) => Promise<void>
  onAttempt?: (attempt: number, position: RecenterPosition | null, moveResult?: RecenterMoveResult) => void
  maxAttempts?: number
}

export const RECENTER_POLL_DELAYS_MS = [0, 50, 100, 200, 350] as const

export function isInsideNeutralPosition(
  position: RecenterPosition | null,
  target: RecenterPosition,
  tolerance: { x: number; z: number },
): boolean {
  if (!position) return false
  return Math.abs(position.x - target.x) <= tolerance.x && Math.abs(position.z - target.z) <= tolerance.z
}

function neutralMoveRequest(target: RecenterPosition): RecenterRequest {
  return {
    newRelativePosition: target,
    cameraTarget: { x: target.x, y: target.y + 1.35, z: target.z + 6.5 },
    avatarTarget: { x: target.x, y: target.y + 1.35, z: target.z + 6.5 },
  }
}

/**
 * Move the player instantly and verify the actual Transform with a bounded poll.
 * The move promise is deliberately not part of the critical wait: a runtime or
 * transport that leaves it pending must not leave the quiz in TRANSITIONING.
 */
export async function recenterAndVerify(options: RecenterOptions): Promise<{
  verified: boolean
  attempts: number
  position: RecenterPosition | null
}> {
  const maxAttempts = Math.max(1, options.maxAttempts ?? 2)
  const request = neutralMoveRequest(options.target)

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    let moveResult: RecenterMoveResult | undefined

    // Start the runtime request, but do not await it. The authoritative check is
    // the actual player Transform below, not the SDK response promise.
    void Promise.resolve()
      .then(() => options.move(request))
      .then((result) => {
        moveResult = result
      })
      .catch(() => {
        // The bounded Transform verification below decides whether recovery worked.
      })

    let previousDelay = 0
    for (const delay of RECENTER_POLL_DELAYS_MS) {
      if (delay > previousDelay) await options.wait(delay - previousDelay)
      previousDelay = delay
      const position = options.readPosition()
      options.onAttempt?.(attempt, position, moveResult)
      if (isInsideNeutralPosition(position, options.target, options.tolerance)) {
        return { verified: true, attempts: attempt + 1, position }
      }
    }
  }

  const position = options.readPosition()
  return { verified: isInsideNeutralPosition(position, options.target, options.tolerance), attempts: maxAttempts, position }
}
