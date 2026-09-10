declare module '~system/RestrictedActions' {
  export type MovePlayerToBody = {
    newRelativePosition: { x: number; y: number; z: number }
    cameraTarget?: { x: number; y: number; z: number }
    avatarTarget?: { x: number; y: number; z: number }
    duration?: number
  }

  export function movePlayerTo(body: MovePlayerToBody): Promise<{ success?: boolean }>
}
