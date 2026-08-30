export type TestContext = { from?: string }
export type TestHandler = (data: any, context?: TestContext) => void

export type SentMessage = {
  eventType: string
  data: any
  to?: string[]
}

class TestRoom {
  readonly handlers = new Map<string, TestHandler[]>()
  readonly sent: SentMessage[] = []
  readonly inboxes = new Map<string, SentMessage[]>()

  onMessage(eventType: string, handler: TestHandler) {
    const listeners = this.handlers.get(eventType) ?? []
    listeners.push(handler)
    this.handlers.set(eventType, listeners)
    return () => this.handlers.set(eventType, listeners.filter((item) => item !== handler))
  }

  async send(eventType: string, data: any, options?: { to?: string[] }) {
    const message = { eventType, data, to: options?.to }
    this.sent.push(message)
    const recipients = options?.to ?? [...this.inboxes.keys()]
    for (const recipient of recipients) this.inboxes.get(recipient)?.push(message)
  }

  dispatch(eventType: string, data: any, from: string) {
    for (const handler of this.handlers.get(eventType) ?? []) handler(data, { from })
  }

  connect(playerId: string) {
    this.inboxes.set(playerId, [])
  }

  reset() {
    this.handlers.clear()
    this.sent.length = 0
    this.inboxes.clear()
  }
}

export const __room = new TestRoom()

export function registerMessages<T>(_messages: T) {
  return __room
}
