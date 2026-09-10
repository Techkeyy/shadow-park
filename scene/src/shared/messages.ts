import { Schemas } from '@dcl/sdk/ecs'
import { registerMessages } from '@dcl/sdk/network'

export const ShadowParkMessages = {
  requestState: Schemas.Map({ requestId: Schemas.String }),
  sessionCreated: Schemas.Map({ sessionId: Schemas.String }),
  neutralEntered: Schemas.Map({ sessionId: Schemas.String }),
  neutralExited: Schemas.Map({ sessionId: Schemas.String, towardChoices: Schemas.Boolean }),
  // Legacy vote message remains registered for old clients, but the quiz client uses answerQuestion.
  castVote: Schemas.Map({ choice: Schemas.String }),
  answerQuestion: Schemas.Map({ questionId: Schemas.String, choice: Schemas.String, avatarJson: Schemas.String }),
  readyForNextQuestion: Schemas.Map({ sessionId: Schemas.String, questionId: Schemas.String }),
  restartRun: Schemas.Map({ sessionId: Schemas.String }),
  resonate: Schemas.Map({ shadowId: Schemas.String }),
  stateChanged: Schemas.Map({
    stateJson: Schemas.String,
    requestId: Schemas.String,
    serverSentAtIso: Schemas.String
  }),
  timingReport: Schemas.Map({
    requestId: Schemas.String,
    serverSentAtIso: Schemas.String,
    clientReceivedAtIso: Schemas.String,
    clientRenderAtIso: Schemas.String,
    clientReceiveToRenderMs: Schemas.Number,
    serverToRenderMs: Schemas.Number
  }),
  timingReportV2: Schemas.Map({
    requestId: Schemas.String,
    requestSentAtIso: Schemas.String,
    serverSentAtIso: Schemas.String,
    clientReceivedAtIso: Schemas.String,
    clientRenderAtIso: Schemas.String,
    clientReceiveToRenderMs: Schemas.Number,
    serverToRenderMs: Schemas.Number
  }),
  // Bounded client diagnostics are used only during CORE-1 recovery. They
  // let the authoritative log prove where the mobile transition stops.
  clientTrace: Schemas.Map({ event: Schemas.String, details: Schemas.String }),
  voteResult: Schemas.Map({ accepted: Schemas.Boolean, message: Schemas.String }),
  answerResult: Schemas.Map({
    accepted: Schemas.Boolean,
    questionId: Schemas.String,
    correct: Schemas.Boolean,
    message: Schemas.String,
    correctAnswer: Schemas.String,
    score: Schemas.Number,
    shadowLevel: Schemas.Number,
    completed: Schemas.Boolean,
    nextQuestionId: Schemas.String,
    shadowScore: Schemas.Number,
    currentStreak: Schemas.Number,
    bestStreak: Schemas.Number,
    shadowRank: Schemas.String,
    masterStars: Schemas.Number,
    milestoneBonus: Schemas.Number,
    chainLost: Schemas.Boolean,
    shadowAwakened: Schemas.Boolean,
    becameMaster: Schemas.Boolean,
    masterStarAwarded: Schemas.Boolean,
    houseRank: Schemas.Number
  }),
  nextQuestionReady: Schemas.Map({ accepted: Schemas.Boolean, questionId: Schemas.String }),
  restartResult: Schemas.Map({ accepted: Schemas.Boolean, message: Schemas.String }),
  globalStateChanged: Schemas.Map({ stateJson: Schemas.String, serverSentAtIso: Schemas.String }),
  resonateResult: Schemas.Map({ accepted: Schemas.Boolean, message: Schemas.String, shadowId: Schemas.String }),
  liveMoment: Schemas.Map({ kind: Schemas.String, choice: Schemas.String })
}

export const room = registerMessages(ShadowParkMessages)
