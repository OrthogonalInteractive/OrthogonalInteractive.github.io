/** The MediaPipe hand landmarks this project reads. */
export const LANDMARK = {
  WRIST: 0,
  THUMB_CMC: 1,
  THUMB_MCP: 2,
  THUMB_IP: 3,
  THUMB_TIP: 4,
  INDEX_MCP: 5,
  INDEX_PIP: 6,
  INDEX_DIP: 7,
  INDEX_TIP: 8,
}

/** The index finger, knuckle to tip — the only part that can touch the model. */
export const INDEX_FINGER = [
  LANDMARK.INDEX_MCP,
  LANDMARK.INDEX_PIP,
  LANDMARK.INDEX_DIP,
  LANDMARK.INDEX_TIP,
]

/** The thumb, drawn alongside the index so the pinch is readable. */
export const THUMB = [
  LANDMARK.THUMB_CMC,
  LANDMARK.THUMB_MCP,
  LANDMARK.THUMB_IP,
  LANDMARK.THUMB_TIP,
]
