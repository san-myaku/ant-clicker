# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Shape

This is a single-file browser game: an ant colony clicker/idle sim ("Ant Colony V23"). `index.html` (~26k lines) is the **only runtime file** and contains all HTML, CSS (`<style>` block near the top), and JavaScript (one large `<script>` block wrapped in an IIFE). There is no build system, no package.json, no test framework, and no linter.

- Deployed via GitHub Pages: https://san-myaku.github.io/ant-clicker/ (public but low-profile; `robots.txt` disallows crawling)
- Saves live in each browser origin's `localStorage`, so local and online saves are separate
- Code comments and much of the documentation are in Japanese; commit messages are in English

## Commands

No build or install step. Common workflows:

```bash
# Syntax-check the inline script after editing
sed -n '/^<script>$/,/^<\/script>/p' index.html | sed '1d;$d' > /tmp/game.js && node --check /tmp/game.js

# Serve locally for browser verification (dev mode via ?dev=1)
python3 -m http.server 8765
# then open http://localhost:8765/?dev=1&cb=<timestamp>   (cb= busts cache)
```

There are no unit tests. Verification is done by driving the page in a real browser (Playwright with the pre-installed Chromium works, including `file://` URLs with `?dev=1`), checking for console errors / pageerrors, and taking screenshots. Notes from `MEMORY.md`:

- Prefer headless Chrome/CDP for UI, mobile-width, and console-error verification; don't waste time retrying flaky browser connections when static checks suffice.
- Only require browser verification when visual layout, interaction, or runtime console behavior matters.
- Headless "preview" tabs can stick at `visibilityState: hidden`, which stops `requestAnimationFrame` and breaks rendering/screenshots — use a real browser or CDP screenshots that force frame drawing.

QA screenshots are committed under `qa_screenshots/`; UI concept boards live in `design_concepts/`.

## Documentation Discipline (critical)

For every meaningful game update, update **both** of these in the same commit as the code change:

- `DEVELOPMENT_LOG.md` — chronological change log (newest entries at top)
- `CURRENT_SYSTEM_OVERVIEW.md` — the current source-of-truth system overview; keep it aligned with `index.html`

This applies whenever behavior, save shape, UI, AI, rendering, unlocks, public deployment assumptions, or known TODOs change. Other docs: `MEMORY.md` (verification/workflow notes), `HANDOFF_mesh_nest.md` (mesh-nest rewrite handoff), `NEST_REALISM_ROADMAP.md` and `NEST_STRUCTURE_REDESIGN_PLAN.md` (feature plans).

## Architecture

Everything lives in the single IIFE inside `index.html`. Only three things are exposed globally: `G`, `S`, and `window._dbg` (debug hooks: `generateMeshNest`, `findNodePath`, `getPath`, `getPathDebugStats`, `initLegacyWorld`, builder/dig internals, etc.). Search the file **by function name, not line number** — line numbers drift constantly.

### State objects

- **`G`** — persisted progression: resources (`food`, `cookie`, `eggs`, `larvae`, golden variants), upgrade levels (`qLv`, `nLv`, `bLv`, `sLv`, `wLv`), ant counts by role (`worker`, `nurse`, `builder`, `soldier`, `fermenter`), caps, research state, majors, special-room build reservations.
- **`S`** — world/runtime state: the generated nest graph `S.full` (`nodes`, `edges`, `byNode`, entrance `eid`, queen room `qid`), simulated ants, effects, enemies/invaders, season/weather/buffs, camera `S.cam`, render settings, and runtime-only generated terrain/texture caches (never saved).

### Save/load

`G.save()` writes `{ g: G.toSave(), world: S.serializeWorld(), last: timestamp }` to `localStorage`. Keys: `SAVE_KEY = "antSimV23_0"`, `SAVE_KEY_OLD = "antSimV22_2"`, `RENDER_SETTINGS_KEY = "ant_render_settings_v1"`. Load goes through repair/compatibility code (missing keys completed, removed systems converted, world width compressed to the current base). **Preserve save compatibility**: when changing saved state, extend the load-repair path rather than breaking old saves. Purely visual changes should not touch the save format — many past changes explicitly kept "game logic / save shape unchanged."

### World: mesh nest

The mesh-growth nest is the default for new games: `initWorld()` delegates to `generateMeshNest({ growth:true, production:true, ... })`. The legacy generator survives as `initLegacyWorld()` (dev-only). Tuning constants live in `MESH_GEN_DEFAULTS`; the `S._meshNest` flag switches shared drawing code to mesh-specific room/edge shapes. Pathfinding (`findNodePath()` / `getPath()`) is weighted search over completed tunnels only (bezier length + congestion + jitter). Growth mode (`S._meshGrowth`) has builder AI progressively dig pre-generated hidden edges instead of the old `expandMap()` tree growth. See `HANDOFF_mesh_nest.md` for the full handoff.

### Rendering

Canvas rendering with heavy caching: static soil/terrain layers are baked once (`buildBackgroundAssets()`, `drawBackgroundDetails()`) rather than drawn per frame; procedural patterns (`soilPatternCanvas`, `cavityPatternCanvas`) plus image textures from `assets/textures/`. Ants split into a small number of fully-simulated "action" ants and cheap "crowd" ants (representative-actor model — see overview §7–8). Render settings (vector/sprite/dot modes) persist separately from the save.

### UI

Right-side control panel with Ants / Rooms / Research tabs and an upgrade dock; on mobile (max-width 959px) the panel becomes a bottom sheet and the HUD compacts. Dev mode is activated with URL param `?dev=1` or a 5-second long-press on the version button; it adds mesh-nest experiment buttons and debug toggles.

## Conventions

- `.gitignore` excludes `.claude/`, `ant_colony_v22_*.html` backups, and `__tmp*.js` scratch files — don't commit scratch extractions of the inline script.
- Dev-button / `window._dbg.generateMeshNest()` manual experiments are `transient` and must not overwrite normal saves (save guard).
- When tuning mesh generation, experiment live via `generateMeshNest({...userOpts})` in the console, then bake good values into `MESH_GEN_DEFAULTS`.
- `CURRENT_SYSTEM_OVERVIEW.md` §24 tracks current known issues/TODOs — check it before assuming something is a new bug.
