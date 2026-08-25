const DEFAULT_FRONT_THRESHOLD_Z = 6.7
const DEFAULT_REAR_THRESHOLD_Z = 7.3

/**
 * Keeps front-only text stable while a player crosses the board edge.
 * The two thresholds form a small hysteresis band around the board volume.
 */
export function updateDirectionalVisibility(
  currentlyVisible: boolean,
  playerZ: number,
  frontThresholdZ = DEFAULT_FRONT_THRESHOLD_Z,
  rearThresholdZ = DEFAULT_REAR_THRESHOLD_Z
): boolean {
  if (currentlyVisible) return playerZ >= rearThresholdZ ? false : true
  return playerZ <= frontThresholdZ ? true : false
}
