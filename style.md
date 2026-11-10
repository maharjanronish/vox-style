# STYLE

## Look
- Warm paper, one ink color, two accents (tomato, cobalt), one highlight (marker yellow). Defined ONLY in core/theme.js.
- Fonts: Anton (display) + Inter (text). Special Elite / Libre Baskerville only inside document props.
- Motion: ease-out entrances 150-400 ms; overshoot only on stamps/pins; the camera always moves slowly.
- Pace: a new visual or cue every 2-3 s; at most 2 text-heavy props on screen.
- Handmade: wobble in marks, torn edges seeded per prop, soft shadows, grain overlay.

## Engineering rules
- core/ and props never touch the DOM (no document/window/new Image). Draw through ctx only.
- Props are pure: output depends on (o, env). Use env.rng(label), never Math.random/Date.now.
- Sprite caches live on env.sprites and are keyed by everything that affects the pixels.
- Backgrounds should be drawn at depth <= 0.3 and with bleed so camera moves never expose edges.

## QA pitfalls (append every issue found)
- (none yet)
