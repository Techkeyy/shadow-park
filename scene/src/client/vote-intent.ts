import type { Choice } from '../shared/state.ts'

export type VoteState = 'UNARMED' | 'ARMED' | 'VOTED'

export type ChoiceIntentDecision = {
  send: boolean
  nextVotePending: boolean
  reason: 'already_pending' | 'unarmed' | 'armed' | 'already_voted'
}

export function resolveChoiceIntent(voteState: VoteState, votePending: boolean): ChoiceIntentDecision {
  if (votePending) return { send: false, nextVotePending: true, reason: 'already_pending' }
  if (voteState === 'UNARMED') return { send: false, nextVotePending: false, reason: 'unarmed' }
  return {
    send: true,
    nextVotePending: true,
    reason: voteState === 'ARMED' ? 'armed' : 'already_voted'
  }
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
