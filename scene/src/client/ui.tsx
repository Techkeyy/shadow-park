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
  memoryVisible: boolean
  memoryQuestion: string
  memoryCountA: number
  memoryCountB: number
  liveMoment: string
  resonateStatus: string
}

const uiState: ParkUiState = {
  question: '',
  choiceA: 'EXPLORE SPACE',
  choiceB: 'DEEP OCEAN',
  countA: 0,
  countB: 0,
  status: '',
  voteState: 'UNARMED',
  hydrated: false,
  memoryVisible: false,
  memoryQuestion: '',
  memoryCountA: 0,
  memoryCountB: 0,
  liveMoment: '',
  resonateStatus: ''
}

const shadowPurple = Color4.create(0.74, 0.62, 1, 1)
const shadowBlue = Color4.create(0.58, 0.9, 1, 1)
const paleText = Color4.create(0.94, 0.96, 1, 1)
const mutedText = Color4.create(0.72, 0.78, 0.9, 1)
const warmText = Color4.create(1, 0.84, 0.46, 1)

function helperCopy() {
  if (!uiState.hydrated) return <Label value="Calling back the Shadows..." color={paleText} fontSize={16} textAlign="middle-center" />
  if (uiState.voteState !== 'UNARMED') return null
  return (
    <UiEntity uiTransform={{ flexDirection: 'column', alignItems: 'center', margin: '2px 0 0' }}>
      <Label value="CHOOSE WITH YOUR FEET" color={shadowBlue} fontSize={15} textAlign="middle-center" />
      <Label value="Walk toward your answer." color={paleText} fontSize={14} textAlign="middle-center" />
    </UiEntity>
  )
}

function feedbackCopy() {
  const message = uiState.resonateStatus || uiState.liveMoment || uiState.status
  const hidden = new Set([
    '',
    'Start from the center, then choose a side.',
    'Choose a side: walk to A or B.',
    'Your Shadow joined the park.',
    'Calling back the Shadows...'
  ])
  if (hidden.has(message)) return null
  return <Label value={message} color={mutedText} fontSize={14} textAlign="middle-center" textWrap="wrap" />
}

function resultCopy() {
  if (!uiState.hydrated || uiState.voteState !== 'VOTED') return null
  return (
    <UiEntity uiTransform={{ flexDirection: 'column', alignItems: 'center', margin: '3px 0 0' }}>
      <Label value="Your Shadow joined the park." color={shadowBlue} fontSize={14} textAlign="middle-center" />
      <UiEntity uiTransform={{ flexDirection: 'row', justifyContent: 'space-around', width: '100%', margin: '4px 0 0' }}>
        <Label value={`A  ${uiState.countA}`} color={shadowPurple} fontSize={15} textAlign="middle-center" />
        <Label value={`B  ${uiState.countB}`} color={shadowBlue} fontSize={15} textAlign="middle-center" />
      </UiEntity>
    </UiEntity>
  )
}

function memoryPanel() {
  if (!uiState.memoryVisible || !uiState.memoryQuestion) return null
  return (
    <UiEntity
      uiTransform={{
        width: '42%',
        positionType: 'absolute',
        position: { bottom: '8%', left: '29%' },
        padding: '8px 12px',
        flexDirection: 'column',
        alignItems: 'center'
      }}
      uiBackground={{ color: Color4.create(0.03, 0.04, 0.1, 0.84) }}
    >
      <Label value="MEMORY GARDEN" color={warmText} fontSize={14} textAlign="middle-center" />
      <Label value={uiState.memoryQuestion} color={paleText} fontSize={14} textAlign="middle-center" textWrap="wrap" />
      <Label value={`A  ${uiState.memoryCountA}     B  ${uiState.memoryCountB}`} color={mutedText} fontSize={14} textAlign="middle-center" />
    </UiEntity>
  )
}

function helperPanel() {
  if (uiState.hydrated && uiState.voteState === 'ARMED' && !uiState.resonateStatus && !uiState.liveMoment) return null
  return (
    <UiEntity
      uiTransform={{
        width: '30%',
        positionType: 'absolute',
        position: { top: '3%', left: '35%' },
        padding: '4px 8px',
        borderRadius: 8,
        flexDirection: 'column',
        alignItems: 'center'
      }}
      uiBackground={{ color: Color4.create(0.015, 0.02, 0.06, 0.48) }}
    >
      {!uiState.hydrated && <Label value="SHADOW PARK" color={shadowPurple} fontSize={18} textAlign="middle-center" />}
      {helperCopy()}
      {resultCopy()}
      {feedbackCopy()}
    </UiEntity>
  )
}

function ShadowParkUi() {
  return <UiEntity uiTransform={{ width: '100%', height: '100%', pointerFilter: 'none' }}>{helperPanel()}{memoryPanel()}</UiEntity>
}

export function setupUi() {
  ReactEcsRenderer.setUiRenderer(ShadowParkUi, { virtualWidth: 1920, virtualHeight: 1080 })
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
  history?: Array<{ question: string; countA: number; countB: number }>
}) {
  const previous = state.history && state.history.length > 0 ? state.history[state.history.length - 1] : undefined
  updateUi({
    question: state.question,
    choiceA: state.choiceA,
    choiceB: state.choiceB,
    countA: state.countA,
    countB: state.countB,
    memoryQuestion: previous?.question ?? '',
    memoryCountA: previous?.countA ?? 0,
    memoryCountB: previous?.countB ?? 0,
    hydrated: true
  })
}
