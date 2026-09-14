<script setup>
// One piece for now. The shape is a list so a second one only means another
// entry — the section already lays them out one under the other.
const pieces = [
  {
    index: '01',
    title: 'Business card AR',
    year: '2026',
    kind: 'Self-initiated',
    body:
      'Point a phone at the mark printed on the card and the work stands up out of it: a cat first, then a figure of the person whose card it is, each held in place on the desk rather than on the card. Pinch with a finger and thumb to pick one up and set it down somewhere else, and the next one climbs out of the card behind it.',
    notes: [
      'World tracking, so what is put down stays put down when the card leaves the frame.',
      'Hands are read from the camera feed on the phone itself — nothing is sent anywhere.',
      'A web page, not an app: it opens from the QR code on the card in Safari or Chrome.',
    ],
    tags: ['8th Wall', 'three.js', 'MediaPipe', 'WebAR'],
    video: '/work/namecard-ar.mp4',
    poster: '/work/namecard-ar.jpg',
    // The capture's own pixels, so the frame is held before the poster lands.
    width: 720,
    height: 1614,
  },
]
</script>

<template>
  <section id="work" class="section">
    <div class="shell">
      <div class="section__head reveal">
        <h2 class="section__title">Selected work</h2>
        <div class="rule" />
        <p class="section__lede">
          Pieces built end to end — modelling, tracking, interaction, and the
          page they are delivered on.
        </p>
      </div>

      <article v-for="piece in pieces" :key="piece.index" class="piece reveal">
        <div class="piece__screen">
          <!-- Nothing is fetched until the play button is pressed: the capture
               is 3.8 MB and most visitors will not watch it. -->
          <video
            class="piece__video"
            :src="piece.video"
            :poster="piece.poster"
            :width="piece.width"
            :height="piece.height"
            controls
            playsinline
            preload="none"
          />
          <p class="piece__caption">Recorded on the phone it runs on.</p>
        </div>

        <div class="piece__copy">
          <span class="piece__index">{{ piece.index }}</span>
          <h3 class="piece__title">{{ piece.title }}</h3>
          <p class="piece__meta">{{ piece.year }} — {{ piece.kind }}</p>
          <p class="piece__body">{{ piece.body }}</p>
          <ul class="piece__notes">
            <li v-for="note in piece.notes" :key="note">{{ note }}</li>
          </ul>
          <ul class="tags">
            <li v-for="tag in piece.tags" :key="tag" class="tags__item">{{ tag }}</li>
          </ul>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.piece {
  display: grid;
  grid-template-columns: minmax(0, 18rem) minmax(0, 1fr);
  gap: clamp(1.75rem, 4vw, 3.25rem);
  /* The capture is portrait and far taller than the copy beside it; centring
     the two keeps the leftover height off the bottom of the panel. */
  align-items: center;
  padding: clamp(1.5rem, 3vw, 2.25rem);
  border: 1px solid var(--line-soft);
  border-radius: 16px;
  background: var(--ink-800);
}

.piece__screen {
  display: grid;
  gap: 0.7rem;
}

.piece__video {
  width: 100%;
  height: auto;
  /* Held by the intrinsic width/height too; this keeps the box while the
     poster is still on its way. */
  aspect-ratio: 720 / 1614;
  display: block;
  background: var(--ink-900);
  border: 1px solid var(--line);
  border-radius: 12px;
}

.piece__caption {
  font-family: var(--font-mono);
  font-size: 0.63rem;
  letter-spacing: 0.1em;
  color: var(--fg-faint);
}

.piece__copy {
  display: grid;
  align-content: start;
  gap: 0.85rem;
  /* Holds the line length where the rest of the page keeps it, rather than
     letting the copy run the full width of a wide screen. */
  max-width: 42rem;
}

.piece__index {
  font-family: var(--font-mono);
  font-size: 0.68rem;
  letter-spacing: 0.2em;
  color: var(--steel);
}

.piece__title {
  font-size: 1.35rem;
}

.piece__meta {
  font-family: var(--font-mono);
  font-size: 0.68rem;
  letter-spacing: 0.1em;
  color: var(--fg-faint);
  margin-top: -0.45rem;
}

.piece__body {
  color: var(--fg-muted);
  font-weight: 300;
  font-size: 0.95rem;
}

.piece__notes {
  display: grid;
  gap: 0.5rem;
  margin: 0.15rem 0 0;
  padding: 0;
  list-style: none;
  color: var(--fg-muted);
  font-weight: 300;
  font-size: 0.88rem;
}

.piece__notes li {
  position: relative;
  padding-left: 1.1rem;
}

.piece__notes li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0.62em;
  width: 0.45rem;
  height: 1px;
  background: var(--cyan);
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin: 0.4rem 0 0;
  padding: 0;
  list-style: none;
}

.tags__item {
  font-family: var(--font-mono);
  font-size: 0.63rem;
  letter-spacing: 0.1em;
  padding: 0.25rem 0.55rem;
  border: 1px solid var(--line);
  border-radius: 4px;
  color: var(--fg-faint);
}

/* Narrow screens: the copy runs the full width and the capture sits above it,
   kept to a readable width rather than filling the column. The panel turns
   translucent so the fixed mark reads through, as the service cards do. */
@media (max-width: 880px) {
  .piece {
    grid-template-columns: minmax(0, 1fr);
    background: rgba(11, 18, 17, 0.55);
    border-color: rgba(37, 52, 48, 0.55);
    backdrop-filter: blur(2px);
  }

  .piece__screen {
    justify-self: center;
    width: min(100%, 16rem);
  }
}
</style>
