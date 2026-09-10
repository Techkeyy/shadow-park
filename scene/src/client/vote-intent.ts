import type { Choice } from '../shared/state.ts'

export type VoteState = 'UNARMED' | 'ARMED' | 'ANSWERED' | 'TRANSITIONING' | 'RECENTER_RECOVERY' | 'CENTERED' | 'VOTED'

export type ChoiceIntentDecision = {
  send: boolean
  nextVotePending: boolean
  reason: 'already_pending' | 'unarmed' | 'armed' | 'already_voted'
}

export function resolveChoiceIntent(voteState: VoteState, votePending: boolean): ChoiceIntentDecision {
  if (votePending) return { send: false, nextVotePending: true, reason: 'already_pending' }
  if (voteState !== 'ARMED') return { send: false, nextVotePending: false, reason: 'unarmed' }
  return {
    send: true,
    nextVotePending: true,
    reason: voteState === 'ARMED' ? 'armed' : 'already_voted'
  }
}

export function stateAfterAcceptedAnswer(completed: boolean): VoteState {
  return completed ? 'VOTED' : 'ANSWERED'
}

export function stateAfterRecenter(): VoteState {
  return 'CENTERED'
}

export function stateAfterNextQuestionReady(): VoteState {
  return 'ARMED'
}

export function sendChoiceIntent(
  voteState: VoteState,
  votePending: boolean,
  choice: Choice,
  send: (choice: Choice) => void
): ChoiceIntentDecision {
  const decision = resolveChoiceIntent(voteState, votePending)
  if (decision.send) send(choice)
  return decision
}
