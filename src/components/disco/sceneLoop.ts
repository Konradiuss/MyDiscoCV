/**
 * Whether the room is worth drawing at all.
 *
 * Three things used to reach for the animation loop on their own — the tab
 * changing visibility, the motion preference changing, and anything covering
 * the scene — and the last one to speak won. Everything asks here instead.
 */

export interface SceneLoopConditions {
  /** `document.hidden`: the tab is in the background. */
  readonly hidden: boolean
  /** Something opaque is over the scene, so the frames would go nowhere. */
  readonly covered: boolean
}

export function shouldAnimateScene({ hidden, covered }: SceneLoopConditions) {
  return !hidden && !covered
}
