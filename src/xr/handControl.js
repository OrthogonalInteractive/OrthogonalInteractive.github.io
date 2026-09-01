const ASSET_DIR = '/xr/mediapipe'

/**
 * Loads the MediaPipe hand tracker. Around 11 MB of WASM and model data comes
 * down here, which is why the AR page only reaches for it on request.
 *
 * The assets are vendored under public/xr/mediapipe (see
 * `npm run fetch:hand-assets`) so the page has no third-party runtime host.
 */
export async function loadHandTracker() {
  const { FilesetResolver, HandLandmarker } = await import('@mediapipe/tasks-vision')
  const fileset = await FilesetResolver.forVisionTasks(ASSET_DIR)

  const create = (delegate) =>
    HandLandmarker.createFromOptions(fileset, {
      baseOptions: {
        modelAssetPath: `${ASSET_DIR}/hand_landmarker.task`,
        delegate,
      },
      runningMode: 'VIDEO',
      numHands: 1,
    })

  // The GPU delegate shares the page's WebGL budget with three.js and the image
  // tracker, and some mobile drivers refuse it outright.
  let landmarker
  try {
    landmarker = await create('GPU')
  } catch {
    landmarker = await create('CPU')
  }

  return {
    /**
     * Landmarks for the first hand in frame, or null when there is none.
     * Takes a video or a canvas: one tracker reads the feed directly, the
     * other is handed frames the engine has already turned upright.
     */
    detect(source, timestamp) {
      if (!(source.videoWidth || source.width)) return null
      const result = landmarker.detectForVideo(source, timestamp)
      return result?.landmarks?.[0] ?? null
    },

    close() {
      landmarker.close()
    },
  }
}
