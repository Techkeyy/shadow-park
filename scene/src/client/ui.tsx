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
  shadowGrewActive: boolean
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
  housePanelVisible: false,
  shadowGrewActive: false
}

const shadowPurple = Color4.create(0.74, 0.62, 1, 1)
const shadowBlue = Color4.create(0.58, 0.9, 1, 1)
const paleText = Color4.create(0.94, 0.96, 1, 1)
const mutedText = Color4.create(0.72, 0.78, 0.9, 1)
const warmText = Color4.create(1, 0.84, 0.46, 1)

function instructionPanel() {
  if (!uiState.hydrated) {
    return (
      <UiEntity
        uiTransform={{
          positionType: 'absolute',
          position: { top: '3%', right: '4%' },
          width: '44%',
          padding: '10px 14px',
          borderRadius: 10,
          flexDirection: 'column',
          alignItems: 'center'
        }}
        uiBackground={{ color: Color4.create(0.02, 0.035, 0.08, 0.96) }}
      >
        <Label value="SHADOW PARK" color={shadowPurple} fontSize={18} textAlign="middle-center" />
        <UiEntity uiTransform={{ margin: { top: 4 } }}>
          <Label value={uiState.startupStage || 'CONNECTING...'} color={paleText} fontSize={14} textAlign="middle-center" />
        </UiEntity>
      </UiEntity>
    )
  }

  if (uiState.pendingChoice) {
    return (
      <UiEntity
        uiTransform={{
          positionType: 'absolute',
          position: { top: '3%', right: '4%' },
          width: '44%',
          padding: '10px 14px',
          borderRadius: 10,
          flexDirection: 'column',
          alignItems: 'center'
        }}
        uiBackground={{ color: Color4.create(0.04, 0.08, 0.16, 0.96) }}
      >
        <Label value="CHOICE LOCKED" color={shadowBlue} fontSize={20} textAlign="middle-center" />
        <UiEntity uiTransform={{ margin: { top: 4 } }}>
          <Label value="ANSWERING..." color={paleText} fontSize={15} textAlign="middle-center" />
        </UiEntity>
      </UiEntity>
    )
  }

  if (uiState.voteState !== 'ARMED') return null

  return (
    <UiEntity
      uiTransform={{
        positionType: 'absolute',
        position: { top: '3%', right: '4%' },
        width: '46%',
        padding: '12px 14px',
        borderRadius: 10,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}
      uiBackground={{ color: Color4.create(0.02, 0.035, 0.08, 0.96) }}
    >
      <Label value="ANSWER WITH YOUR FEET" color={Color4.create(0.88, 0.78, 1, 1)} fontSize={20} textAlign="middle-center" />
      <UiEntity uiTransform={{ margin: { top: 6 } }}>
        <Label value="STEP ON A OR B" color={Color4.create(0.35, 0.95, 1, 1)} fontSize={18} textAlign="middle-center" />
      </UiEntity>
    </UiEntity>
  )
}

function resultCard() {
  if (!uiState.hydrated || !uiState.answerFeedback) return null
  const correct = uiState.answerFeedback.startsWith('CORRECT')
  const headline = uiState.becameMaster ? 'MASTER' : correct ? 'CORRECT' : 'WRONG'
  const scoreDelta = correct ? `+${10 + uiState.milestoneBonus}` : '+0'
  const chainLine = correct ? `SHADOW FED • CHAIN ${uiState.currentStreak}` : uiState.chainLost ? 'CHAIN LOST' : ''
  const authoritativeCorrect = Math.max(uiState.lifetimeCorrect, Math.floor(uiState.shadowScore / 10))
  const rankProgress = rankProgressForCorrectCount(authoritativeCorrect)
  const progressLine = rankProgress.nextRank ? `${rankProgress.current} / ${rankProgress.target} TO ${rankProgress.nextRank}` : 'MASTER • KEEP FEEDING'

  return (
    <UiEntity
      uiTransform={{
        positionType: 'absolute',
        position: { top: '16%', left: '16%' },
        width: '68%',
        padding: '18px 22px',
        borderRadius: 14,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}
      uiBackground={{
        color: correct
          ? Color4.create(0.015, 0.14, 0.07, 0.97)
          : Color4.create(0.2, 0.025, 0.04, 0.97)
      }}
    >
      <Label
        value={headline}
        color={uiState.becameMaster ? shadowPurple : correct ? Color4.create(0.12, 1, 0.58, 1) : Color4.create(1, 0.25, 0.3, 1)}
        fontSize={44}
        textAlign="middle-center"
      />
      <UiEntity uiTransform={{ margin: { top: 4 } }}>
        <Label
          value={scoreDelta}
          color={correct ? Color4.create(1, 0.9, 0.38, 1) : Color4.create(1, 0.72, 0.72, 1)}
          fontSize={34}
          textAlign="middle-center"
        />
      </UiEntity>
      <UiEntity uiTransform={{ margin: { top: 2 } }}>
        <Label
          value={correct ? 'SHADOW SCORE +10' : 'NO SCORE ADDED'}
          color={correct ? Color4.create(0.75, 0.95, 1, 1) : Color4.create(0.9, 0.7, 0.7, 1)}
          fontSize={14}
          textAlign="middle-center"
        />
      </UiEntity>
      {correct && (
        <UiEntity uiTransform={{ margin: { top: 4 } }}>
          <Label value="✦ SHADOW GREW" color={warmText} fontSize={15} textAlign="middle-center" />
        </UiEntity>
      )}
      {chainLine && (
        <UiEntity uiTransform={{ margin: { top: 2 } }}>
          <Label value={chainLine} color={warmText} fontSize={14} textAlign="middle-center" />
        </UiEntity>
      )}
      <UiEntity uiTransform={{ margin: { top: 6 } }}>
        <Label value={`SHADOW SCORE ${uiState.shadowScore}  •  ${uiState.shadowRank}`} color={paleText} fontSize={15} textAlign="middle-center" />
      </UiEntity>
      <UiEntity uiTransform={{ margin: { top: 2 } }}>
        <Label value={progressLine} color={mutedText} fontSize={12} textAlign="middle-center" />
      </UiEntity>
      {uiState.answerFeedback.startsWith('NOT THIS TIME') && uiState.correctAnswer && (
        <UiEntity uiTransform={{ margin: { top: 4 } }}>
          <Label value={`CORRECT ANSWER: ${uiState.correctAnswer}`} color={paleText} fontSize={13} textAlign="middle-center" />
        </UiEntity>
      )}
      {uiState.shadowAwakened && <Label value="YOUR SHADOW AWAKENS" color={shadowPurple} fontSize={13} textAlign="middle-center" />}
      {uiState.becameMaster && <Label value="THE HOUSE REMEMBERS YOU" color={shadowPurple} fontSize={13} textAlign="middle-center" />}
      {uiState.masterStarAwarded && <Label value={`MASTER STAR ${uiState.masterStars}`} color={shadowPurple} fontSize={13} textAlign="middle-center" />}
    </UiEntity>
  )
}

function progressionHud() {
  if (!uiState.hydrated) return null
  const authoritativeCorrect = Math.max(uiState.lifetimeCorrect, Math.floor(uiState.shadowScore / 10))
  const rankProgress = rankProgressForCorrectCount(authoritativeCorrect)
  const progressLine = rankProgress.nextRank ? `${rankProgress.current} / ${rankProgress.target} TO ${rankProgress.nextRank}` : 'MASTER • KEEP FEEDING'
  return (
    <UiEntity
      uiTransform={{
        positionType: 'absolute',
        position: { top: '3%', left: '4%' },
        padding: '9px 13px',
        borderRadius: 10,
        flexDirection: 'column',
        alignItems: 'flex-start'
      }}
      uiBackground={{ color: Color4.create(0.015, 0.02, 0.06, 0.9) }}
    >
      <UiEntity uiTransform={{ margin: { bottom: 3 } }}>
        <Label value={`SHADOW SCORE ${uiState.shadowScore}`} color={paleText} fontSize={17} />
      </UiEntity>
      <UiEntity uiTransform={{ margin: { bottom: 3 } }}>
        <Label value={`CHAIN ${uiState.currentStreak}`} color={uiState.currentStreak >= 5 ? warmText : shadowBlue} fontSize={14} />
      </UiEntity>
      <UiEntity uiTransform={{ margin: { bottom: 3 } }}>
        <Label value={uiState.shadowRank} color={shadowPurple} fontSize={14} />
      </UiEntity>
      {uiState.shadowGrewActive && (
        <UiEntity uiTransform={{ margin: { bottom: 3 } }}>
          <Label value="✦ +SHADOW POWER" color={warmText} fontSize={12} />
        </UiEntity>
      )}
      <UiEntity uiTransform={{ margin: { bottom: 3 } }}>
        <Label value={progressLine} color={mutedText} fontSize={11} />
      </UiEntity>
      {uiState.bestStreak > 0 && (
        <UiEntity uiTransform={{ margin: { top: 1 } }}>
          <Label value={`BEST CHAIN ${uiState.bestStreak}`} color={mutedText} fontSize={11} />
        </UiEntity>
      )}
    </UiEntity>
  )
}

function rankUpPanel() {
  if (!uiState.rankUpMessage) return null
  return (
    <UiEntity
      uiTransform={{
        positionType: 'absolute',
        position: { top: '31%', left: '24%' },
        width: '52%',
        padding: '10px 14px',
        borderRadius: 10,
        flexDirection: 'column',
        alignItems: 'center'
      }}
      uiBackground={{ color: Color4.create(0.12, 0.04, 0.2, 0.94) }}
    >
      <Label value="RANK UP" color={warmText} fontSize={20} textAlign="middle-center" />
      <Label value={uiState.rankUpMessage} color={shadowPurple} fontSize={24} textAlign="middle-center" />
    </UiEntity>
  )
}

function houseOfMastersPanel() {
  if (!uiState.housePanelVisible) return null
  const masters = (uiState.houseMasters || []).slice(0, 20)
  const topScore = masters.length > 0 ? Math.max(...masters.map(m => m.shadowScore)) : 0
  return (
    <UiEntity
      uiTransform={{
        positionType: 'absolute',
        position: { top: '10%', left: '14%' },
        width: '72%',
        padding: '14px 18px',
        borderRadius: 12,
        flexDirection: 'column',
        alignItems: 'center'
      }}
      uiBackground={{ color: Color4.create(0.04, 0.02, 0.09, 0.94) }}
    >
      <Label value="HOUSE OF MASTERS" color={shadowPurple} fontSize={21} textAlign="middle-center" />
      <Label value="THE STRONGEST SHADOWS REMAIN" color={shadowBlue} fontSize={13} textAlign="middle-center" />
      <Label value="REACH 300. TAKE YOUR PLACE." color={warmText} fontSize={12} textAlign="middle-center" />
      {masters.length > 0 && (
        <Label value={`MASTERS: ${masters.length}  •  TOP SCORE: ${topScore}`} color={paleText} fontSize={11} textAlign="middle-center" />
      )}
      
      {masters.length === 0 ? (
        <UiEntity uiTransform={{ flexDirection: 'column', alignItems: 'center', margin: '16px 0' }}>
          <Label value="NO MASTERS YET." color={warmText} fontSize={16} textAlign="middle-center" />
          <Label value="BE THE FIRST." color={warmText} fontSize={14} textAlign="middle-center" />
          <Label value="Reach 300 Shadow Score (30 correct) to etch your name in the House." color={paleText} fontSize={12} textAlign="middle-center" />
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
      {instructionPanel()}
      {resultCard()}
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
