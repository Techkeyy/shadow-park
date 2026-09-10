import { Color4 } from '@dcl/sdk/math'
import ReactEcs, { Label, ReactEcsRenderer, UiEntity } from '@dcl/sdk/react-ecs'
import type { HouseMasterRecord, ParkState } from '../shared/state'
import { rankProgressForCorrectCount } from './stage2-feedback'

export type UiVoteState = 'UNARMED' | 'ARMED' | 'ANSWERED' | 'TRANSITIONING' | 'RECENTER_RECOVERY' | 'CENTERED' | 'VOTED'

type ParkUiState = {
  question: string
  choiceA: string
  choiceB: string
  countA: number
  countB: number
  status: string
  voteState: UiVoteState
  hydrated: boolean
  entryHintVisible: boolean
  pendingChoice: string
  shadowAwakened: boolean
  liveMoment: string
  resonateStatus: string
  score: number
  shadowScore: number
  currentStreak: number
  bestStreak: number
  shadowRank: string
  masterStars: number
  lifetimeAnswered: number
  lifetimeCorrect: number
  milestoneBonus: number
  chainLost: boolean
  becameMaster: boolean
  masterStarAwarded: boolean
  houseRank: number
  shadowLevel: number
  rankUpMessage: string
  completed: boolean
  answerFeedback: string
  correctAnswer: string
  nextQuestionId: string
  totalCompletions: number
  totalPlayers: number
  startupStage: string
  houseMasters: HouseMasterRecord[]
  housePanelVisible: boolean
}

const uiState: ParkUiState = {
  question: '',
  choiceA: '',
  choiceB: '',
  countA: 0,
  countB: 0,
  status: '',
  voteState: 'UNARMED',
  hydrated: false,
  entryHintVisible: false,
  pendingChoice: '',
  shadowAwakened: false,
  liveMoment: '',
  resonateStatus: '',
  score: 0,
  shadowScore: 0,
  currentStreak: 0,
  bestStreak: 0,
  shadowRank: 'DORMANT',
  masterStars: 0,
  lifetimeAnswered: 0,
  lifetimeCorrect: 0,
  milestoneBonus: 0,
  chainLost: false,
  becameMaster: false,
  masterStarAwarded: false,
  houseRank: 0,
  shadowLevel: 0,
  rankUpMessage: '',
  completed: false,
  answerFeedback: '',
  correctAnswer: '',
  nextQuestionId: '',
  totalCompletions: 0,
  totalPlayers: 0,
  startupStage: 'CONNECTING',
  houseMasters: [],
  housePanelVisible: false
}

const shadowPurple = Color4.create(0.74, 0.62, 1, 1)
const shadowBlue = Color4.create(0.58, 0.9, 1, 1)
const paleText = Color4.create(0.94, 0.96, 1, 1)
const mutedText = Color4.create(0.72, 0.78, 0.9, 1)
const warmText = Color4.create(1, 0.84, 0.46, 1)

function helperCopy() {
  if (!uiState.hydrated) return <Label value={uiState.startupStage || 'CONNECTING'} color={paleText} fontSize={15} textAlign="middle-center" />
  if (uiState.pendingChoice) {
    return (
      <UiEntity uiTransform={{ flexDirection: 'column', alignItems: 'center', margin: '2px 0 0' }}>
        <Label value="CHOICE LOCKED" color={shadowBlue} fontSize={15} textAlign="middle-center" />
        <Label value="ANSWERING..." color={paleText} fontSize={13} textAlign="middle-center" />
      </UiEntity>
    )
  }
  if (uiState.voteState !== 'ARMED' || !uiState.entryHintVisible) return null
  return <Label value="STEP ON A OR B TO ANSWER" color={shadowBlue} fontSize={14} textAlign="middle-center" />
}

function feedbackCopy() {
  const message = uiState.resonateStatus || uiState.liveMoment || uiState.status
  const hidden = new Set([
    '',
    'WALK TO A OR B',
    'NEXT QUESTION',
    'CHOICE LOCKED',
    'ANSWERING...',
    'CALLING BACK THE SHADOWS...',
    'Reconnecting to the park...'
  ])
  if (uiState.answerFeedback && message === uiState.answerFeedback) return null
  if (hidden.has(message)) return null
  return <Label value={message} color={mutedText} fontSize={13} textAlign="middle-center" textWrap="wrap" />
}

function resultCopy() {
  if (!uiState.hydrated || !uiState.answerFeedback) return null
  const correct = uiState.answerFeedback.startsWith('CORRECT')
  const headline = uiState.becameMaster ? 'MASTER' : correct ? 'CORRECT' : 'WRONG'
  const scoreDelta = correct ? `+${10 + uiState.milestoneBonus} SHADOW SCORE` : '+0 SHADOW SCORE'
  const chainLine = correct ? `SHADOW FED • CHAIN ${uiState.currentStreak}` : uiState.chainLost ? 'CHAIN LOST' : ''
  const rankProgress = rankProgressForCorrectCount(uiState.lifetimeCorrect)
  const progressLine = rankProgress.nextRank ? `${rankProgress.current} / ${rankProgress.target} TO ${rankProgress.nextRank}` : 'MASTER • KEEP FEEDING'
  return (
    <UiEntity uiTransform={{ flexDirection: 'column', alignItems: 'center', margin: '8px 0 0', padding: '8px 12px' }}>
      <Label value={headline} color={uiState.becameMaster ? shadowPurple : correct ? shadowBlue : warmText} fontSize={26} textAlign="middle-center" />
      <Label value={scoreDelta} color={correct ? shadowBlue : mutedText} fontSize={16} textAlign="middle-center" />
      {chainLine && <Label value={chainLine} color={warmText} fontSize={13} textAlign="middle-center" />}
      <Label value={`SHADOW SCORE ${uiState.shadowScore}`} color={paleText} fontSize={17} textAlign="middle-center" />
      <Label value={uiState.shadowRank} color={shadowPurple} fontSize={14} textAlign="middle-center" />
      <Label value={progressLine} color={mutedText} fontSize={12} textAlign="middle-center" />
      {uiState.answerFeedback.startsWith('NOT THIS TIME') && uiState.correctAnswer && <Label value={`CORRECT ANSWER: ${uiState.correctAnswer}`} color={paleText} fontSize={12} textAlign="middle-center" />}
      {uiState.shadowAwakened && <Label value="YOUR SHADOW AWAKENS" color={shadowPurple} fontSize={12} textAlign="middle-center" />}
      {uiState.becameMaster && <Label value="THE HOUSE REMEMBERS YOU" color={shadowPurple} fontSize={12} textAlign="middle-center" />}
      {uiState.masterStarAwarded && <Label value={`MASTER STAR ${uiState.masterStars}`} color={shadowPurple} fontSize={12} textAlign="middle-center" />}
    </UiEntity>
  )
}

function progressionHud() {
  if (!uiState.hydrated) return null
  const rankProgress = rankProgressForCorrectCount(uiState.lifetimeCorrect)
  const progressLine = rankProgress.nextRank ? `${rankProgress.current} / ${rankProgress.target} TO ${rankProgress.nextRank}` : 'MASTER • KEEP FEEDING'
  return (
    <UiEntity
      uiTransform={{
        positionType: 'absolute',
        position: { top: '3%', left: '4%' },
        padding: '5px 9px',
        borderRadius: 8,
        flexDirection: 'column',
        alignItems: 'flex-start'
      }}
      uiBackground={{ color: Color4.create(0.015, 0.02, 0.06, 0.5) }}
    >
      <Label value={`SHADOW SCORE ${uiState.shadowScore}`} color={paleText} fontSize={16} />
      <Label value={`CHAIN ${uiState.currentStreak}`} color={uiState.currentStreak >= 5 ? warmText : shadowBlue} fontSize={14} />
      <Label value={uiState.shadowRank} color={shadowPurple} fontSize={14} />
      <Label value={progressLine} color={mutedText} fontSize={11} />
      {uiState.bestStreak > 0 && <Label value={`BEST CHAIN ${uiState.bestStreak}`} color={mutedText} fontSize={11} />}
    </UiEntity>
  )
}

function rankUpPanel() {
  if (!uiState.rankUpMessage) return null
  return (
    <UiEntity
      uiTransform={{
        positionType: 'absolute',
        position: { top: '31%', left: '26%' },
        width: '48%',
        padding: '7px 10px',
        borderRadius: 8,
        flexDirection: 'column',
        alignItems: 'center'
      }}
      uiBackground={{ color: Color4.create(0.12, 0.04, 0.2, 0.78) }}
    >
      <Label value="RANK UP" color={warmText} fontSize={19} textAlign="middle-center" />
      <Label value={uiState.rankUpMessage} color={shadowPurple} fontSize={22} textAlign="middle-center" />
    </UiEntity>
  )
}

function helperPanel() {
  const feedback = feedbackCopy()
  const showLoading = !uiState.hydrated
  const showHint = uiState.hydrated && uiState.voteState === 'ARMED' && uiState.entryHintVisible
  const showResult = uiState.hydrated && Boolean(uiState.answerFeedback)
  if (!showLoading && !showHint && !showResult && !feedback && !uiState.resonateStatus && !uiState.liveMoment && !uiState.hydrated) return null
  return (
    <UiEntity
      uiTransform={{
        width: showResult ? '62%' : '34%',
        positionType: 'absolute',
        position: { top: showResult ? '10%' : '4%', left: showResult ? '19%' : '63%' },
        padding: showResult ? '10px 12px' : '5px 8px',
        borderRadius: 8,
        flexDirection: 'column',
        alignItems: 'center'
      }}
      uiBackground={{ color: Color4.create(0.015, 0.02, 0.06, 0.46) }}
    >
      {showLoading && <Label value="SHADOW PARK" color={shadowPurple} fontSize={16} textAlign="middle-center" />}
      {helperCopy()}
      {resultCopy()}
      {feedback}
    </UiEntity>
  )
}

function houseOfMastersPanel() {
  if (!uiState.housePanelVisible) return null
  const masters = (uiState.houseMasters || []).slice(0, 20)
  return (
    <UiEntity
      uiTransform={{
        positionType: 'absolute',
        position: { top: '12%', left: '16%' },
        width: '68%',
        padding: '14px 18px',
        borderRadius: 12,
        flexDirection: 'column',
        alignItems: 'center'
      }}
      uiBackground={{ color: Color4.create(0.04, 0.02, 0.09, 0.92) }}
    >
      <Label value="HOUSE OF MASTERS" color={shadowPurple} fontSize={20} textAlign="middle-center" />
      <Label value="THE SHADOWS REMEMBER" color={mutedText} fontSize={12} textAlign="middle-center" />
      
      {masters.length === 0 ? (
        <UiEntity uiTransform={{ flexDirection: 'column', alignItems: 'center', margin: '16px 0' }}>
          <Label value="NO MASTERS YET. BE THE FIRST." color={warmText} fontSize={15} textAlign="middle-center" />
          <Label value="Reach 30 correct answers to etch your name in the House." color={paleText} fontSize={12} textAlign="middle-center" />
        </UiEntity>
      ) : (
        <UiEntity uiTransform={{ flexDirection: 'column', width: '100%', margin: '10px 0 0' }}>
          {masters.map((master, index) => {
            const rankLabel = `#${index + 1}`
            const name = master.displayName || master.playerId.slice(0, 8)
            const starText = master.masterStars > 0 ? `★${master.masterStars}` : '★0'
            return (
              <UiEntity
                key={master.id || master.playerId}
                uiTransform={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '3px 8px',
                  margin: '2px 0'
                }}
                uiBackground={{ color: Color4.create(0.08, 0.05, 0.15, 0.6) }}
              >
                <Label value={`${rankLabel}  ${name}`} color={paleText} fontSize={12} />
                <Label value={`MASTER ${starText}  •  SCORE ${master.shadowScore}  •  CHAIN ${master.bestStreak}`} color={warmText} fontSize={12} />
              </UiEntity>
            )
          })}
        </UiEntity>
      )}
    </UiEntity>
  )
}

function ShadowParkUi() {
  return (
    <UiEntity uiTransform={{ width: '100%', height: '100%', pointerFilter: 'none' }}>
      {progressionHud()}
      {helperPanel()}
      {rankUpPanel()}
      {houseOfMastersPanel()}
    </UiEntity>
  )
}

export function setupUi() {
  ReactEcsRenderer.setUiRenderer(ShadowParkUi, { screenInset: 'interactable' })
}

export function updateUi(next: Partial<ParkUiState>) {
  Object.assign(uiState, next)
}

export function updateUiFromState(state: ParkState) {
  updateUi({
    question: state.question,
    choiceA: state.choiceA,
    choiceB: state.choiceB,
    countA: state.countA,
    countB: state.countB,
    hydrated: true,
    houseMasters: state.houseMasters ?? [],
    score: state.run?.score ?? uiState.score,
    shadowScore: state.run?.shadowScore ?? uiState.shadowScore,
    currentStreak: state.run?.currentStreak ?? uiState.currentStreak,
    bestStreak: state.run?.bestStreak ?? uiState.bestStreak,
    shadowRank: state.run?.shadowRank ?? uiState.shadowRank,
    masterStars: state.run?.masterStars ?? uiState.masterStars,
    lifetimeAnswered: state.run?.lifetimeAnswered ?? uiState.lifetimeAnswered,
    lifetimeCorrect: state.run?.lifetimeCorrect ?? uiState.lifetimeCorrect,
    shadowLevel: state.run?.shadowLevel ?? uiState.shadowLevel,
    completed: state.run?.completed ?? uiState.completed,
    totalCompletions: state.totalCompletions ?? uiState.totalCompletions,
    totalPlayers: state.totalPlayers ?? uiState.totalPlayers
  })
}
