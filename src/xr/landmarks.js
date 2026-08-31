/** The MediaPipe hand landmarks this project reads. */
export const LANDMARK = {
  WRIST: 0,
  INDEX_MCP: 5,
  INDEX_PIP: 6,
  INDEX_DIP: 7,
  INDEX_TIP: 8,
}

/** The index finger, knuckle to tip — the only part drawn or used to touch. */
export const INDEX_FINGER = [
  LANDMARK.INDEX_MCP,
  LANDMARK.INDEX_PIP,
  LANDMARK.INDEX_DIP,
  LANDMARK.INDEX_TIP,
]
