export type CriticalAnswerTransition = {
  clearLockingUi: () => void
  renderAuthoritativeResult: () => void
  startRecenter: () => void
  schedulePresentation: (presentation: () => void) => void
  presentation: () => void
}

/**
 * Keep the answer transition's correctness path independent from presentation.
 * Every critical callback runs synchronously in order; presentation is handed
 * to a scheduler only after result UI and recenter have been started.
 */
export function runCriticalAnswerTransition(transition: CriticalAnswerTransition): void {
  transition.clearLockingUi()
  transition.renderAuthoritativeResult()
  transition.startRecenter()
  transition.schedulePresentation(transition.presentation)
}
