import { Color4 } from '@dcl/sdk/math'
import ReactEcs, { Label, ReactEcsRenderer, UiEntity } from '@dcl/sdk/react-ecs'

export type UiVoteState = 'UNARMED' | 'ARMED' | 'VOTED'

type ParkUiState = {
  question: string
  choiceA: string
  choiceB: string
  countA: number
  countB: number
  status: string
  voteState: UiVoteState
  hydrated: boolean
  buildMarker: string
}

const uiState: ParkUiState = {
  question: 'Calling back the Shadows…',
  choiceA: 'EXPLORE SPACE',
  choiceB: 'DEEP OCEAN',
  countA: 0,
  countB: 0,
  status: 'Calling back the Shadows…',
  voteState: 'UNARMED',
  hydrated: false,
  // TEMPORARY cache/freshness marker. Remove after the controlled mobile gate.
  buildMarker: 'MOBILE BUILD 8007-UI'
}

const shadowPurple = Color4.create(0.55, 0.4, 0.9, 1)
const shadowBlue = Color4.create(0.3, 0.82, 1, 1)
const paleText = Color4.create(0.9, 0.93, 1, 1)
const mutedText = Color4.create(0.68, 0.74, 0.9, 1)

function card() {
  return (
    <UiEntity
      uiTransform={{
        width: '86%',
        maxWidth: 880,
        padding: '18px 24px',
        positionType: 'absolute',
        position: { top: '6%', left: '7%' },
        flexDirection: 'column',
        alignItems: 'center'
      }}
      uiBackground={{ color: Color4.create(0.015, 0.02, 0.06, 0.9) }}
    >
      <Label value="SHADOW PARK" color={shadowPurple} fontSize={30} textAlign="middle-center" />
      <Label value={uiState.question} color={paleText} fontSize={25} textAlign="middle-center" textWrap="wrap" />
      <Label
        value={`A  ·  ${uiState.choiceA}       B  ·  ${uiState.choiceB}`}
        color={shadowBlue}
        fontSize={17}
        textAlign="middle-center"
        textWrap="wrap"
      />
      <Label
        value={`${uiState.countA} A SHADOWS     ${uiState.countB} B SHADOWS`}
        color={paleText}
        fontSize={17}
        textAlign="middle-center"
      />
      <Label value={uiState.status} color={mutedText} fontSize={16} textAlign="middle-center" textWrap="wrap" />
      <Label value={`Vote state: ${uiState.voteState}`} color={mutedText} fontSize={14} textAlign="middle-center" />
      {!uiState.hydrated && <Label value="Historical state is still arriving — this is not 0–0." color={mutedText} fontSize={14} textAlign="middle-center" textWrap="wrap" />}
      <Label value={uiState.buildMarker} color={Color4.create(1, 0.82, 0.25, 1)} fontSize={13} textAlign="middle-center" />
    </UiEntity>
  )
}

function ShadowParkUi() {
  return (
    <UiEntity uiTransform={{ width: '100%', height: '100%', alignItems: 'center', pointerFilter: 'none' }}>
      {card()}
    </UiEntity>
  )
}

export function setupUi() {
  ReactEcsRenderer.setUiRenderer(ShadowParkUi)
}

export function updateUi(next: Partial<ParkUiState>) {
  Object.assign(uiState, next)
}

export function updateUiFromState(state: {
  question: string
  choiceA: string
  choiceB: string
  countA: number
  countB: number
}) {
  updateUi({
    question: state.question,
    choiceA: state.choiceA,
    choiceB: state.choiceB,
    countA: state.countA,
    countB: state.countB,
    hydrated: true
  })
}
