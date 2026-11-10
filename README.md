# vox-studio

Code-drawn paper-craft explainer videos. Write a JSON script → get an MP4 with voiceover, synced captions, camera moves and sound design. No AI-generated imagery; all graphics are Canvas 2D, photos are yours.

## One-time setup (needs internet once)
    npm install
    npm run bundle          # fonts, map data, python packages, Whisper model → everything local after this
    npm run pack            # optional: dist/vox-studio-<os>-<arch>.tar.gz for another machine (same OS)

## Make a video
    npm run catalog                  # regenerates CATALOG.md — the only doc an AI needs to write scripts
    # write projects/<name>/script.json
    npm run validate -- <name>
    npm run export   -- <name>       # writes narration.txt
    # make audio anywhere → projects/<name>/audio/narration.wav (or one file per line: l1.wav …)
    npm run align    -- <name>       # Whisper word timing → words.json (gate on bad cue words)
    npm run make     -- <name> --draft
    npm run qa       -- <name>       # contact sheets + report: LOOK at them
    npm run make     -- <name>       # final out.mp4

Optional music: `projects/<name>/audio/music.mp3`. 16:9: add `--aspect 16:9`.

## Adding props
`npm run new-prop` → `props/<category>/<name>/index.js` (or `projects/<p>/props/<name>/`). It is auto-discovered, validated and added to CATALOG.md. See STYLE.md.

## Checks
    npm test        # core, director, renderer, props, match, determinism …
    npm run doctor  # environment
