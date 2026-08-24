import { Storage } from '@dcl/sdk/server'
import { room } from '../shared/messages'
import { applyVote, createInitialState, isChoice, ParkState, parseState, STATE_KEY } from '../shared/state'

let state: ParkState = createInitialState()
let mutationQueue: Promise<void> = Promise.resolve()
const activeVoters = new Set<string>()

function voterKey(questionId: string): string {
  return `shadow-park/voted/${questionId}`
}

function sendState(to?: string) {
  const options = to ? { to: [to] } : undefined
  return room.send('stateChanged', { stateJson: JSON.stringify(state) }, options)
}

function queueMutation(work: () => Promise<void>) {
  mutationQueue = mutationQueue.then(work).catch((error) => {
    console.error('SHADOW PARK mutation failed', error)
  })
}

async function handleVote(choiceValue: string, playerId: string) {
  if (!isChoice(choiceValue)) {
    await room.send('voteResult', { accepted: false, message: 'Choose A or B.' }, { to: [playerId] })
    return
  }

  if (activeVoters.has(playerId)) {
    await room.send('voteResult', { accepted: false, message: 'Your Shadow is already here.' }, { to: [playerId] })
    await sendState(playerId)
    return
  }

  activeVoters.add(playerId)
  try {
    const alreadyVoted = await Storage.player.get<boolean>(playerId, voterKey(state.questionId), { fresh: true })
    if (alreadyVoted) {
      await room.send('voteResult', { accepted: false, message: 'Your Shadow is already here.' }, { to: [playerId] })
      await sendState(playerId)
      return
    }

    const previousState = state
    const nextState = applyVote(state, choiceValue, `shadow-${Date.now()}-${state.countA + state.countB}`)
    const stateStored = await Storage.set(STATE_KEY, nextState)

    if (!stateStored) {
      await room.send('voteResult', { accepted: false, message: 'The park could not remember that vote. Try again.' }, { to: [playerId] })
      return
    }

    const playerStored = await Storage.player.set(playerId, voterKey(nextState.questionId), true)
    if (!playerStored) {
      await Storage.set(STATE_KEY, previousState)
      await room.send('voteResult', { accepted: false, message: 'The park could not lock that vote. Try again.' }, { to: [playerId] })
      return
    }

    state = nextState
    await room.send('voteResult', { accepted: true, message: 'You left a Shadow behind.' }, { to: [playerId] })
    await sendState()
  } finally {
    activeVoters.delete(playerId)
  }
}

export async function setupServer() {
  const stored = parseState(await Storage.get<ParkState>(STATE_KEY, { fresh: true }))
  if (stored) {
    state = stored
  } else {
    const created = await Storage.set(STATE_KEY, state)
    if (!created) console.error('SHADOW PARK could not initialize persistent state')
  }

  room.onMessage('requestState', (_data, context) => {
    if (context?.from) void sendState(context.from)
  })

  room.onMessage('castVote', (data, context) => {
    if (!context?.from) return
    queueMutation(() => handleVote(data.choice, context.from))
  })

  console.log(`SHADOW PARK server ready with ${state.countA + state.countB} persisted vote(s)`)
}
