# Vox Studio
Code-drawn paper-craft explainer videos. script.json -> director -> camera -> props -> canvas -> MP4.

## Status
Phase 1A done: core math/theme/helpers/assets/camera. Run `npm test`.

## The env contract (every prop receives this)
env = {
  id,            // prop instance id (seed for rng)
  t, p,          // shot-local seconds, shot progress 0..1
  W, H, orientation,   // logical canvas size; 'portrait' | 'landscape'
  safe,          // {top,bottom,left,right} margins in px
  theme, assets, words,
  rng(label),    // fresh seeded generator per label: order-independent, stable across frames
  createCanvas(w,h), sprites: Map   // offscreen sprites, memoized by key
}

## Units
x/y/w/h/r accept px numbers, "50%", or {portrait:"50%", landscape:"30%"}.

# Recipes

A recipe is a named bundle of layers (and optionally sfx / a transition) that a script can copy into a shot.
Files starting with `_` are ignored. A recipe whose props don't exist yet is hidden from CATALOG.md.

Format (`recipes/<name>.json`):
- `name`, `use` (one sentence: when to choose it)
- `params`: `{ "key": "what to put here" }`; every `{{key}}` in `shot` must be replaced
- `shot`: `{ "layers": [...], "sfx"?: [...], "transition"?: {...} }`
