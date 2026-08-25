import { Schemas } from '@dcl/sdk/ecs'
import { registerMessages } from '@dcl/sdk/network'

export const ShadowParkMessages = {
  requestState: Schemas.Map({ requestId: Schemas.String }),
  sessionCreated: Schemas.Map({ sessionId: Schemas.String }),
  neutralEntered: Schemas.Map({ sessionId: Schemas.String }),
  neutralExited: Schemas.Map({ sessionId: Schemas.String, towardChoices: Schemas.Boolean }),
  castVote: Schemas.Map({ choice: Schemas.String }),
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
  voteResult: Schemas.Map({ accepted: Schemas.Boolean, message: Schemas.String })
}

export const room = registerMessages(ShadowParkMessages)
