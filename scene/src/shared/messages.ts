import { Schemas } from '@dcl/sdk/ecs'
import { registerMessages } from '@dcl/sdk/network'

export const ShadowParkMessages = {
  requestState: Schemas.Map({}),
  castVote: Schemas.Map({ choice: Schemas.String }),
  stateChanged: Schemas.Map({ stateJson: Schemas.String }),
  voteResult: Schemas.Map({ accepted: Schemas.Boolean, message: Schemas.String })
}

export const room = registerMessages(ShadowParkMessages)
