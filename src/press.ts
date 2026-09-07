import type { MouseEvent, PointerEvent } from 'react'

/** Ignore the compatibility click after a touch/pen press, including ghost
 *  clicks that land on a newly mounted button (e.g. Mula → number pad). */
const CLICK_SUPPRESS_MS = 450
let suppressClickUntil = 0

function suppressGhostClick() {
  suppressClickUntil = performance.now() + CLICK_SUPPRESS_MS
}

function isGhostClick() {
  return performance.now() < suppressClickUntil
}

/** Mouse: fire on click (release, can cancel by dragging off).
 *  Touch/pen: fire once on pointerdown so :active motion cannot swallow the
 *  tap, then ignore the synthetic click that would double-fire. */
export function usePress(onPress: () => void, disabled = false) {
  return {
    onPointerDown(event: PointerEvent<HTMLButtonElement>) {
      if (disabled) return
      if (event.pointerType === 'mouse') return
      // Fire first so AudioContext resume / BGM start stay in the user
      // gesture. preventDefault() after that still blocks the extra click.
      onPress()
      event.preventDefault()
      suppressGhostClick()
    },
    onClick(event: MouseEvent<HTMLButtonElement>) {
      if (disabled) return
      if (isGhostClick()) {
        event.preventDefault()
        return
      }
      onPress()
    },
  }
}
