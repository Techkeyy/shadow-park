export type OptionalRestore = () => void | Promise<void>

export function runOptionalRestore(
  taskOrLabel: string | OptionalRestore,
  taskOrOnError?: OptionalRestore | ((error: unknown) => void),
  onError?: (error: unknown) => void
): void {
  const task: OptionalRestore =
    typeof taskOrLabel === 'function'
      ? taskOrLabel
      : typeof taskOrOnError === 'function'
        ? (taskOrOnError as OptionalRestore)
        : () => undefined
  const handler =
    typeof taskOrLabel === 'string' && typeof onError === 'function'
      ? onError
      : typeof taskOrOnError === 'function' && typeof taskOrLabel === 'function'
        ? (taskOrOnError as (error: unknown) => void)
        : (err: unknown) => console.error('[OPTIONAL_RESTORE_FAILED]', err)

  try {
    const result = task()
    if (result && typeof (result as Promise<void>).then === 'function') {
      ;(result as Promise<void>).catch(handler)
    }
  } catch (error) {
    handler(error)
  }
}


