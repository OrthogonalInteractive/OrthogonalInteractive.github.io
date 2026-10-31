<script setup>
// One piece for now. The shape is a list so a second one only means another
// entry — the section already lays them out one under the other.
const pieces = [
  {
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
        <p class="section__lede">
          Pieces built end to end — modelling, tracking, interaction, and the
          page they are delivered on.
        </p>
      </div>

      <article v-for="piece in pieces" :key="piece.title" class="piece reveal">
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
          <div class="edge" aria-hidden="true" />
          <h3 class="piece__title">{{ piece.title }}</h3>
          <p class="piece__meta">{{ piece.kind }}, {{ piece.year }}</p>
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
  grid-template-columns: minmax(0, 17rem) minmax(0, 1fr);
  gap: clamp(2rem, 5vw, 4.5rem);
  /* The capture is portrait and far taller than the copy beside it. */
  align-items: center;
}

.piece__screen {
  display: grid;
  gap: 0.7rem;
}

/* The phone held up in the same light as the cat: a thin wire rim and a glow. */
.piece__video {
  width: 100%;
  height: auto;
  /* Held by the intrinsic width/height too; this keeps the box while the
     poster is still on its way. */
  aspect-ratio: 720 / 1614;
  display: block;
  background: var(--ground-deep);
  border: 1px solid var(--wire-glow);
  border-radius: 22px;
  box-shadow: 0 0 0 4px rgba(19, 27, 24, 0.9), 0 0 40px -6px var(--wire-glow);
}

.piece__caption {
  font-size: 0.8rem;
  color: var(--fg-faint);
  text-align: center;
}

.piece__copy {
  display: grid;
  align-content: start;
  gap: 0.85rem;
  /* Holds the line length where the rest of the page keeps it. */
  max-width: 38rem;
}

.piece__copy .edge {
  margin-bottom: 0.6rem;
}

.piece__title {
  font-size: clamp(1.6rem, 3vw, 2.1rem);
}

.piece__meta {
  font-size: 0.85rem;
  color: var(--fg-faint);
  margin-top: -0.35rem;
}

.piece__body {
  color: var(--fg-muted);
}

.piece__notes {
  display: grid;
  gap: 0.5rem;
  margin: 0.25rem 0 0.35rem;
  padding: 0;
  list-style: none;
  color: var(--fg-muted);
  font-size: 0.93rem;
}

.piece__notes li {
  position: relative;
  padding-left: 1.1rem;
}

/* Each note hangs off a vertex, as the edges do. */
.piece__notes li::before {
  content: '';
  position: absolute;
  left: 0.1rem;
  top: 0.62em;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--wire);
  box-shadow: 0 0 6px var(--wire-glow);
}

/* Narrow screens: the capture sits above the copy, kept to a readable width. */
@media (max-width: 880px) {
  .piece {
    grid-template-columns: minmax(0, 1fr);
  }

  .piece__screen {
    justify-self: center;
    width: min(100%, 16rem);
  }
}
</style>
