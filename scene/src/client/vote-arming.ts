export type VoteArmingState = {
  initialized: boolean
  armed: boolean
  wasInChoice: boolean
}

export function createVoteArmingState(): VoteArmingState {
  return { initialized: false, armed: false, wasInChoice: false }
}

export function observeChoicePosition(
  state: VoteArmingState,
  inChoice: boolean
): { state: VoteArmingState; enteredChoice: boolean } {
  if (!state.initialized) {
    return {
      state: { initialized: true, armed: !inChoice, wasInChoice: inChoice },
      enteredChoice: false
    }
  }

  if (!inChoice) {
    return {
      state: { initialized: true, armed: true, wasInChoice: false },
      enteredChoice: false
    }
  }

  const enteredChoice = state.armed && !state.wasInChoice
  return {
    state: { initialized: true, armed: enteredChoice ? false : state.armed, wasInChoice: true },
    enteredChoice
  }
}
