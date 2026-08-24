import { isServer } from '@dcl/sdk/network'
import { setupClient } from './client/setup'
import { setupServer } from './server/setup'

export function main() {
  if (isServer()) {
    return setupServer()
  }

  setupClient()
}
