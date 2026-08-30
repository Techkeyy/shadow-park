const sceneStore = new Map<string, unknown>()
const playerStore = new Map<string, Map<string, unknown>>()

export const Storage = {
  async get<T>(key: string): Promise<T | null> {
    return (sceneStore.get(key) as T | undefined) ?? null
  },
  async set<T>(key: string, value: T): Promise<boolean> {
    sceneStore.set(key, value)
    return true
  },
  player: {
    async get<T>(address: string, key: string): Promise<T | null> {
      return (playerStore.get(address)?.get(key) as T | undefined) ?? null
    },
    async set<T>(address: string, key: string, value: T): Promise<boolean> {
      const values = playerStore.get(address) ?? new Map<string, unknown>()
      values.set(key, value)
      playerStore.set(address, values)
      return true
    }
  }
}
