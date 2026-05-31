# Ant Colony V23 Current System Overview

Last updated: 2026-05-31
Target file: `index.html`

This document is the current implementation overview for the single-file ant clicker game. When gameplay, UI, save data, AI behavior, or public deployment assumptions change, update this file together with `DEVELOPMENT_LOG.md`.

## 1. Project Shape

`index.html` is the only runtime game file. It contains HTML, CSS, and JavaScript in one static page.

- Public entry point: `index.html`
- GitHub repository: `https://github.com/san-myaku/ant-clicker`
- GitHub Pages URL: `https://san-myaku.github.io/ant-clicker/`
- Public operation is treated as low-profile sharing. The Pages URL is public, but `robots.txt` asks search engines not to crawl it.
- Local saves and online saves are separate because saves live in each browser origin's `localStorage`.

Important keys:

- `SAVE_KEY = "antSimV23_0"`
- `SAVE_KEY_OLD = "antSimV22_2"`
- `RENDER_SETTINGS_KEY = "ant_render_settings_v1"`
- `VERSION_STR = "V23.0 Season & Invaders"`

## 2. Main State Objects

### `G`

`G` holds persisted numeric/progression state.

Important fields:

- `food`, `cookie`
- `eggs`, `larvae`
- `goldenEggs`, `goldenLarvae`
- `qLv`, `nLv`, `bLv`, `sLv`, `wLv`
- `ants`
- `goldenCount`
- `goldenFingerLv`
- `eggToLarvaP`, `larvaToAdultP`, `layP`
- `caps`
- `unlockWasteRoom`
- `major`
- `research`
- `fermentFirstStarted`, `fermentFirstCompleted`, `fermenterFirstHired`
- `_fermentCookieMade`

Current ant roles in `G.ants`:

- `worker`: worker ants
- `nurse`: nurse ants
- `builder`: builder ants
- `soldier`: soldier ants
- `fermenter`: fermenter ants

`G.tot` includes all five roles, including `fermenter`.

### `S`

`S` holds world, simulation, visual, runtime, and UI helper state.

Important fields:

- `t`, `time`, `timeScale`
- `full`
- `nodeVis`, `edgeFrac`
- `ants`
- `effects`, `dust`, `trails`
- `enemies`, `invaders`
- `largeFood`, `largeFoodTimer` (runtime-only large food carry event; not saved)
- `season`, `weather`
- `globalBuffs`
- `majorActives`
- `majorLuckyTargets`
- `cam`
- `surfacePts`, `surfaceDebris`
- `band`
- `restCount`, `wasteCount`, `fermentCount`, `cookieRoomCount`
- `cookieRoomMul`
- `raidVis`
- `renderSettings`
- `perf`
- `buildAssignments`

`S.full` is the generated nest/world:

- `nodes`: room/tunnel nodes
- `edges`: tunnel edges
- `byNode`: adjacency list
- `sy`: surface baseline Y
- `eid`: entrance node ID
- `qid`: queen room node ID
- `w`, `h`: world size

## 3. Save And Load

`G.save()` writes to `localStorage`.

Saved payload:

- `g`: `G.toSave()`
- `world`: `S.serializeWorld()`
- `last`: save timestamp

`G.toSave()` stores progression, resources, ant counts, research state, golden egg/larva counters, queen log, achievements, raid stats, and related flags.

`S.serializeWorld()` stores world geometry and room state:

- `nodes`
- `edges`
- `nodeVis`
- `edgeFrac`
- `time`, `season`, `weather`
- `band`
- room inventories such as `invEgg`, `invGoldenEgg`, `invFood`, `invCookie`, `invLarva`, `invGoldenLarva`, `invLarvaFood`, `invWaste`
- room processing state such as `waste`, `fermentState`, `fermentProgress`, `fermentInputFood`
- room shape data such as `blobScaleX`, `blobScaleY`, `floorFlat`

Load repair/compatibility:

- Missing `ants` keys are completed.
- Old `major.workerLeaf` is removed.
- Old `mushroom` rooms are converted to `food`.
- Old mushroom-like wide room shape data is reset.
- Missing or invalid `band` data is rebuilt from visible nodes.
- Egg/larva/golden subset inventories are normalized after load and offline simulation.

## 4. UI Structure

The right/control UI is organized into tabs:

- Ants
- Rooms
- Research

On mobile, the control panel becomes a bottom sheet:

- Collapsed state keeps only the handle, growth bars, and TAP button visible.
- The handle opens/closes upgrade panels, tabs, and purchase UI.
- The top HUD is compacted.
- The gear menu contains save, export, load, diary, goals, overview, error details, and render settings.
- The version tag is hidden on small screens to avoid bottom-browser UI overlap.

On desktop, the right panel keeps its fixed side layout, but the top HUD is visually grouped:

- Food, cookie, and population are the primary resource boxes.
- Eggs, larvae, rate, rest rooms, season, and depth are secondary compact chips.
- The gear menu is available on desktop and contains save, export, load, diary, goals, overview, and error details.
- The desktop growth-factor line uses compact chips while preserving the same underlying support/penalty/blocker conditions.

Top/right HUD resource boxes stay visible from the start. Discovery and unlocks change values and related gameplay, but they no longer remove cookie, larvae, rate, rest, season, or depth boxes from the layout.

## 5. Upgrade Dock

Upgrade cards are grouped into the current tab area.

Important upgrades/actions:

- Queen level
- Worker upgrade
- Nurse level
- Builder level
- Soldier level
- Waste room unlock
- Ferment room build
- Golden Finger
- Big carry

`クッキー出現 x2` and `兵隊攻撃 x2` are no longer normal dock purchases. Their old buttons remain in the DOM for compatibility, but are hidden and redirect to the research tab if triggered directly.

The old standalone golden boost system is not active. Golden progression is now handled by Golden Finger and golden egg/larva lineage.

`major_act_cookie` remains as the cookie boost lucky-target system. The cookie boost button UI is not a normal dock button, but the runtime system still exists through `S.majorActives.cookie` and related lucky target state.

Depth II, Depth III, and barracks blueprint are also no longer normal dock purchases. Their old buttons remain in the DOM for compatibility, but are hidden and redirect to the research tab if triggered directly.

## 6. World Generation And Rooms

Initial visible world:

- Entrance
- Queen room
- Initial shaft/path
- Nursery room
- Food room

Room/tunnel node types:

- `queen`
- `nursery`
- `food`
- `rest`
- `soldier`
- `waste`
- `cookieroom`
- `ferment`
- `shaft`
- `entrance`

Room generation is handled mainly by:

- `expandMap()`
- `forceExpandRoom()`
- `ensureBandReady()`
- `maybeShiftBand()`

Generation guards prevent rooms from being created above the surface:

- `getUndergroundMinY(x, roomRadius)`
- `isNodeAboveGround(n)`
- `isDigTargetAboveGround(digT)`

`S.band` controls the active dig layer. It is saved and restored. If missing or invalid, it is repaired before builder target selection.

## 7. Ant Counts, Rendering, And Current Separation

There are two different ant count concepts:

- Logical population: `G.ants.*`
- Visual/action ants: `S.ants`

`ANT_ROLES = ['worker','nurse','builder','soldier']`

`fermenter` exists in population and effects, but is not drawn as an individual ant and is not included in `ANT_ROLES`.

Render settings:

- `RENDER_CAP_OPTIONS = [160, 300, 600, 1000]`
- Default cap is `160`
- Saved render settings in `localStorage` override the default
- Render modes are `auto`, `vector`, `sprite`, and `dot`.
- Auto LOD currently selects:
  - `dot` for at least 500 visible ants or camera zoom below 0.62
  - `sprite` for at least 180 visible ants or camera zoom below 0.88
  - `vector` for close/low-count views

Current state:

- Builder construction progress has been separated from visible builder count.
- `S.buildAssignments` computes construction work from `G.ants.builder`, so render cap no longer directly controls builder dig progress.
- Visible builder ants remain in `S.ants` as representative animation.
- Other per-frame task roles still use `S.ants` more directly. Nurse/worker/soldier task throughput can still be affected by render cap in some cases.
- Numeric systems that directly use `G.ants.*`, such as base food production and egg/larva progression, are less affected.
- Ant path heading uses forward/backward samples on the current tunnel curve so endpoint/junction frames keep the travel direction instead of snapping to 0 degrees.
- Phase 4 Perf-1 keeps `S.ants` but lightens it:
  - dot-mode rendering is batched by visual group
  - low-priority idle/rest/wander AI updates are throttled
  - transport, construction, combat, cargo, raid, invader-response, and golden ants remain full-update

Future phases should continue separating non-builder simulation work from visual representative ants.

## 8. Phase 4 Perf-1 Rendering And AI Throttling

Perf-1 is a conservative lightweight pass on the existing Canvas 2D and `S.ants` architecture.

Rendering:

- `drawAntDotsBatched()` is used for `dot` mode.
- Dot rendering groups ants by base color and draws grouped paths for normal role colors, carry markers, golden glow, and panic rings.
- Sprite and vector modes remain individual ant renderers.
- Perf counters track `drawDot`, `drawSprite`, `drawVector`, and `drawBatches`.

AI update throttling:

- `S.frameCount` increments once per `updateAnts(dt)`.
- `shouldFullUpdateAnt(a, idx, raidActive)` decides whether the ant receives full role/task processing this frame.
- `lightweightUpdateAnt(a, dt)` handles low-priority rest/wander continuation when full role processing is skipped.
- Always-full categories include cargo/transport ants, construction movement, raid/combat, invader response, golden ants, and active non-idle task flows.
- Throttled categories are mainly idle, rest, and non-critical room wandering.

Perf debug:

- The debug overlay reports FPS, update/render time, visual ants, logical population, render cap, selected/used render mode, LOD usage, full/light/skipped AI counts, draw counts by mode, draw batch count, and builder real/visible/work/target stats.

## 9. Builder Ants

Builder construction is now split into logical work and visible animation.

Logical builder work:

- `S.buildAssignments` is runtime-only and not saved.
- `updateBuilderLogic(dt)` rebuilds reservations from the current world state each frame.
- Work slots are calculated from `G.ants.builder`, not from visible builder count.
- Work slots are softened and capped:
  - 1 builder -> 1 slot
  - 5 builders -> 5 slots
  - 20 builders -> 10 slots
  - 50 builders -> 15 slots
  - hard cap: 18 slots
- Each assigned target accumulates dig progress over time and calls `advanceDigEdge()` when enough work has accumulated.
- Reservations are rebuilt after load; no old reservation state is stored in saves.

Target reservation:

- Targets are keyed by edge ID.
- Normal targets usually accept one work slot.
- Important targets allow limited stacking:
  - main shaft
  - first barracks after blueprint
  - forced/priority construction
  - ferment room can accept modest stacking
- Target cap prevents large builder populations from opening unlimited pending construction edges at once. The current cap is 3 simultaneous construction targets.
- Active construction highlights and partial unfinished tunnel drawing are also tied to `S.buildAssignments`, so stale visible-builder targets do not appear as extra parallel work.

Visible builder behavior loop:

- Choose a visible target from `S.buildAssignments`, falling back to `getDigTarget(G.bLv)` if needed
- Move to dig start
- Dig at the frontier
- Carry soil out to the entrance
- Drop soil as presentation
- Return to the dig frontier

Visible builders prefer targets from `S.buildAssignments`. If render cap only leaves a few visible builders, they still act as representative animation for the logical construction work.

Builder level affects pick time:

- `getBuilderPickTime()`
- Formula is based on `1 + bLv * 0.15`

Current target priorities include:

- Repair/prepare current dig band
- Main pending shaft edge
- First barracks room after barracks blueprint has been purchased
- Nursery / food / soldier / rest / waste / cookie room preferences based on state
- Existing pending allowed edges
- New expansion fallback

Debug overlay:

- Shows logical builder count
- Shows visible builder count
- Shows assigned work slots / available work slots
- Shows active construction target count
- Shows render cap

## 10. Worker Ants

Workers handle:

- Surface gathering
- Food/cookie return
- Rest room usage
- Room wandering
- Large food carry event participation (tasks `go_large_food`, `large_food_wait`, `large_food_carry`; see section 17)

Worker upgrade:

- Internal value: `wLv`
- Max level: `20`
- UI shows unpurchased state as `未強化`, then `強化N/20`
- First upgrade cost: food `50`
- Later costs: `floor(100 * 1.35^currentLevel)`
- Effects: food collection multiplier and cookie find multiplier

Rest rooms:

- Improve movement/productivity through `S.restMul`
- Add population cap
- Some workers can occupy rest slots

## 11. Nurse Ants, Eggs, Larvae, And Waste

Nurse behavior:

- Move eggs from queen room to nursery/egg rooms
- Move larvae to larva growth rooms
- Feed larvae
- Clean larva-room waste
- Wait/wander in room slots when idle so they do not visually stack into one ant

Egg and larva systems:

- Eggs are placed in the queen room by tap/manual egg laying and automatic laying.
- Nurses move eggs into nursery rooms.
- Eggs in queen room do not directly hatch.
- Egg and larva inventories are distributed across rooms rather than fixed to one room.
- Larvae require food before becoming adults.

Nurse upgrade:

- Internal value: `nLv`
- Max level: `20`
- Cost: `floor(300 * 1.33^currentLevel)`
- `getNurseHatchMul(nLv)` affects egg-to-larva and larva-to-adult rates.
- Nurse count affects egg-to-larva with `1 + nurse * 0.5`.
- Nurse count affects larva-to-adult with `1 + nurse * 0.25`.
- Level 2 or higher gives queen auto-laying `+10%`.

Waste:

- Larva rooms generate waste over time.
- Waste slows growth.
- Nurses can clean waste even without a waste room.
- Without waste room: waste is carried to the entrance and discarded.
- With waste room: waste is carried to the nearest waste room with larger haul amounts.
- `hygiene_3` improves cleaner thresholds, cleaner share, and haul amount.

Important functions:

- `getWasteCleanerJobFraction()`
- `getWastePickThreshold()`
- `getWasteUrgentThreshold()`
- `getWasteHaulPerTrip()`
- `getWasteHaulAmount()`
- `getWasteDropDestinationId()`
- `getWasteHaulAmountForDestination()`
- `tryStartWasteCleanup()`

## 12. Golden Finger And Golden Lineage

Golden Finger replaced the older simple "golden x2" framing.

Current fields:

- `G.goldenFingerLv`
- `G.goldenEggs`
- `G.goldenLarvae`
- room `invGoldenEgg`
- room `invGoldenLarva`

Behavior:

- Golden Finger levels increase the chance that manual tap laying creates a golden egg.
- Automatic egg laying does not create golden eggs.
- Golden eggs are tracked as a subset of normal eggs.
- Golden larvae are tracked as a subset of normal larvae.
- When a golden larva becomes an adult, it creates a golden worker/ant buff event.
- Golden egg and golden larva dots are drawn in rooms with gold coloring.

The legacy `G.major.golden2x` flag remains for save compatibility and UI grouping, but the actual progression is `goldenFingerLv`.

## 13. Research System

Research unlocks when food reaches `10,000`.

Research state lives in `G.research`.

Current branches:

- Gather
- Brood
- Hygiene
- Ferment
- Geology
- Defense
- Expedition

Current implemented nodes:

- `gather_1`: Gather efficiency I
- `gather_2`: Gather efficiency II
- `brood_1`: Brood efficiency I
- `brood_2`: Larva feeding improvement
- `hygiene_1`: Hygiene basics
- `hygiene_2`: Cleaning efficiency I
- `hygiene_3`: Better cleaning
- `ferment_unlock`: Ferment room unlock
- `ferment_1`: Ferment speed I
- `ferment_2`: Sweet concentration
- `ferment_3`: Ingredient saving
- `ferment_worker_unlock`: Fermenter ant unlock
- `cookie_find_2x`: Sweet scouting / cookie appearance x2 passive
- `geo_depth_2`: Depth II unlock
- `geo_depth_3`: Depth III unlock
- `military_barracks_blueprint`: Barracks blueprint unlock
- `soldier_jaw_2x`: Jaw strengthening / soldier attack x2 passive

Expedition branch exists but its nodes are not implemented yet.

Mushroom/leaf systems are removed or postponed.

Phase 5A migration state:

- `cookie_find_2x` is the official unlock for the old cookie appearance x2 effect.
- `soldier_jaw_2x` is the official unlock for the old jaw/soldier attack x2 effect.
- Old save flags `G.major.cookie2x` and `G.major.jaw2x` are still read. If present, `ensureResearchState()` marks the corresponding research node as unlocked.
- New research purchases also keep the old flags true so older compatibility paths do not break.
- Effect helpers:
  - `hasCookieFind2x()` controls worker cookie find chance.
  - `hasSoldierJaw2x()` controls soldier power / raid and pest combat power.
- Phase 5A migrated cookie appearance x2 and jaw/soldier attack x2.

Phase 5B migration state:

- `geo_depth_2` is the official unlock for Depth II.
- `geo_depth_3` is the official unlock for Depth III and depends on `geo_depth_2`.
- `military_barracks_blueprint` is the official unlock for the barracks blueprint.
- Old save flags `G.major.depth2`, `G.major.depth3`, and `G.major.barracks` are still read. If present, `ensureResearchState()` marks the corresponding research nodes as unlocked.
- New research purchases also keep the old flags true so builder targeting, depth checks, and older compatibility paths keep working.
- Effect helpers:
  - `hasDepth2Unlock()` controls Depth II availability and depth display.
  - `hasDepth3Unlock()` controls Depth III availability and depth display.
  - `hasBarracksBlueprint()` controls barracks blueprint state and first-barracks construction targeting.
- Soldier hiring still requires both the blueprint and an actually built barracks room through `isSoldierUnlocked()`.
- Remaining non-research major flows include Golden Finger, active cookie boost, and the future big-carry placeholder.

## 14. Ferment Rooms And Fermenter Ants

Ferment room:

- Unlock: research `ferment_unlock`
- Build cost: food `2000`
- Max rooms: `2`
- Build action uses `forceExpandRoom('ferment')`

Base recipe:

- Food cost: `100`
- Time: `45` seconds
- Output: cookie `1`

Research effects:

- `ferment_1`: time `45 -> 38` seconds
- `ferment_2`: completion has `10%` chance for cookie `+1`
- `ferment_3`: food cost `100 -> 90`

Ferment state per room:

- `fermentState`
- `fermentProgress`
- `fermentInputFood`

Fermenter ants:

- Unlock node: `ferment_worker_unlock`
- Requires `ferment_2`
- Requires 2 built/spawned ferment rooms
- Cost path includes cookie and food for the breakthrough, then ant hiring uses `BASE_COSTS.fermenter`
- Internal key: `G.ants.fermenter`
- 1 fermenter gives ferment speed `+8%`
- Max fermenter speed bonus is `+40%`
- Fermenters are not individual visual ants.

## 15. Cookies And Cookie Rooms

Cookie sources:

- Worker surface gathering at low chance
- Golden ants
- Ferment rooms
- Cookie rooms support cookie storage/bonus
- Cookie boost lucky target system

Cookie room:

- Unlock condition: builder level `3`
- Max automatic rooms: `3`
- Each room contributes to `S.cookieRoomMul`
- Workers prefer delivering cookies to cookie rooms, then queen room, then food rooms.
- Delivery to a cookie room stores `invCookie` and has a bonus chance to add an extra cookie.
- Current drawing uses normal room slots with gold cookie dots. Old large cookie background and `+N` overlay drawing were removed.

## 16. Soldiers, Barracks, Invaders, And Raids

Soldier unlock requires:

- Barracks blueprint
- First barracks room actually built

Barracks blueprint:

- Cost: cookie `25`
- Requires builder level `3`
- After purchase, the card stays visible as a construction-pending status until the first barracks exists.
- Builder AI prioritizes first barracks construction after blueprint purchase.

Soldiers:

- Defend entrance during raids.
- Return to barracks or guard normally after raid.
- Contribute to raid resolution.

Invaders:

- Underground invaders can target food rooms and nursery rooms.
- Surface raid system uses `S.raidVis` and `resolveRaid()`.
- Raid phases include warning/countdown, attack, and result.

## 17. Large Food Carry Event

A lightweight surface event (MVP). A single large food appears on the surface, idle workers gather, escort it to the nest entrance, and the colony gains food.

State:

- Runtime-only `S.largeFood` (one event at a time) and `S.largeFoodTimer`. Neither is saved or restored.
- `S.largeFood` fields: `id`, `x`, `y`, `state`, `requiredWorkers`, `assignedWorkers`, `arrivedWorkers`, `rewardFood`, `progress`, `rewarded`, `r`, `seed`, `shape`, `life`, `carryStartX`, `t`, `doneT`, `spawnTime`.
- `state` machine: `waiting -> gathering -> carrying -> done`.

Spawn conditions (`maybeSpawnLargeFood`):

- No active event (single slot).
- Not during a raid.
- `G.ants.worker >= LARGE_FOOD_MIN_WORKERS` (12).
- `S.largeFoodTimer` counts down; on expiry, a low-probability roll spawns the event and reschedules 60-120s, otherwise retries after a short interval.
- Debug: key `L` or `window.__spawnLargeFood()` force-spawns one.

Gather / carry / complete (`updateLargeFood`, called before `updateAnts`):

- Idle workers are assigned in the worker idle branch at highest priority, capped at `requiredWorkers`. Only idle workers join; nurse/builder/soldier and busy/cargo workers never do.
- Assigned workers walk to the entrance, then across the surface to the food (`go_large_food`), then mill around it (`large_food_wait`).
- When arrived workers reach `requiredWorkers`, state becomes `carrying`; the food moves toward the entrance and workers follow as presentation (`large_food_carry`). The food movement is driven by `updateLargeFood`, not by the ants.
- On reaching the entrance, the food reward is granted once (`G.food += rewardFood`, clamped to cap), with a toast and `fx`, then the event clears after a short linger.
- If workers cannot gather in time (`life` timeout) or a raid starts, the event aborts and the workers return inside via the existing `ret` flow.

Reward:

- Food only. `rewardFood = LARGE_FOOD_REWARD_BASE (300) + 50 * min(G.ants.worker, 40)`.

Rendering (`drawLargeFood`, before the raid-enemy draw):

- Irregular green polygon with a shadow on the same surface line as workers, plus an `arrived/required` (e.g. `3/5`) or `搬送中` label. Workers draw on top, so they appear to gather around and escort it.
- `shiftWorldX(dx)` also offsets `S.largeFood.x` so the event stays aligned when the world shifts.

Phase 4 integration:

- `getAntUpdateInterval()` returns 1 (full update) for `go_large_food`, `large_food_wait`, and `large_food_carry`, so escorting workers are not throttled.

Save / offline:

- Not saved, not part of offline progression. The event disappears on reload, which is intentional for the MVP.

Future hooks:

- The surface large-food slot and escort presentation can be extended later toward leaf/mushroom carry or surface combat, but none of that is implemented now. Cookie/other rewards, multiple simultaneous events, and a research node for the event are out of scope.

## 18. Season, Weather, Buffs, And Lucky Targets

Season/weather:

- `S.season`
- `S.weather`
- A remaining-time weather timer avoids repeated weather rerolls across midnight.
- Weather and season affect food production and visuals.

Golden/global buffs:

- `S.globalBuffs.activeId`
- Created by golden ant events.
- Can affect food, laying, cookie behavior, or special golden-cookie-only behavior.

Major lucky targets:

- `S.majorLuckyTargets`
- Cookie boost target appears around the surface and can trigger `S.majorActives.cookie`.
- On mobile, the sweet-fragrance countdown text is hidden and the icon-only target is used.

## 19. Offline Progression

Offline progression is applied after load if enough time has passed.

Current flow:

- Cap offline seconds.
- Add worker food production at offline efficiency.
- Apply queen auto-laying.
- Reflect offline eggs into room inventory.
- Convert eggs to larvae based on eligible room inventory.
- Apply simplified larva feeding.
- Convert larvae to adults.
- Apply cookie production approximation.

Important current correction:

- Offline egg/larva/adult progression now updates room inventories so closed-time growth is reflected more consistently.
- Golden egg/larva subset counts are normalized during inventory reconciliation.

## 20. Goals, Tutorial, Diary, Notifications

Goal tree includes:

- Population milestones
- Nurse hire
- Builder hire
- First cookie
- Research unlock
- Ferment room unlock/build
- First ferment cookie
- Fermenter unlock
- Barracks blueprint
- First barracks build
- Soldier hire
- Raid win
- Depth II/III
- First cookie room
- Queen level goals

Goal completion rewards:

- Goals can define a `reward` object with `food` and/or `cookie`.
- `completeGoal()` marks the achievement, applies the reward once, and shows the reward in the completion toast.
- `G.achievements` is the completion and reward guard, so already completed goals do not grant rewards again after load.
- The goal tree displays the reward line for each goal.

Tutorial:

- `TUTORIAL_STEPS`
- `TUT`

Diary and queen whispers:

- `DIARY_ENTRIES`
- `G.queenLog`
- `addQueenWhisper()`
- Whisper bubble position is screen-clamped so it stays visible on mobile and desktop.

Notifications:

- `toast(msg, warnOrOptions=false)`
- `fx()`
- `spawnFloatPlus()`
- Toasts appear in `#toast-area`, with max visible count and ARIA roles split between normal status and warnings.

Save transfer UI:

- `💾` saves to the current browser's `localStorage`.
- `📤` exports the current save string to the clipboard.
- `📥` loads an exported save string through a prompt and reloads the page.
- Long-pressing export still opens the import prompt as a compatibility shortcut.

## 21. Drawing And Performance

Canvas rendering draws:

- Surface
- Underground soil
- Rooms
- Tunnels
- Ants
- Queen
- Eggs, golden eggs, larvae, golden larvae
- Food, cookie dots, waste
- Ferment room bubbles/progress hints
- Weather/season effects
- Raid enemies
- Underground invaders
- Effects and trails

Render modes:

- `auto`
- `vector`
- `sprite`
- `dot`

Dot mode uses grouped path rendering via `drawAntDotsBatched()` to reduce Canvas API calls at large visible ant counts.

Render settings:

- `S.renderSettings`
- Render settings modal
- LOD toggle
- Larva wiggle toggle
- Display cap selector

Debug/performance:

- `buildGameDebugText()`
- `buildPerfDebugText()`
- `updateDebugOverlay()`
- `toggleDebugOverlay()`
- Performance overlay shows FPS, update/render time, visual/logical ants, ants drawn, render cap, selected/used mode, LOD, full/light/skipped AI counts, draw counts by mode, dot batch count, builder stats, and graph stats.

## 22. Error Handling

Global error handling records runtime errors and exposes them through the error modal.

Behavior:

- Error button opens details.
- Excessive repeated errors can pause the game loop to avoid browser lockups.
- Missing toast area falls back to console output.

## 23. Removed Or Deferred Systems

### Mushroom / Leaf System

Removed or postponed:

- Mushroom preview
- Mushroom branch
- Mushroom room
- Mushroom cultivation logic
- Leaf resource
- Leaf gathering improvement
- Mushroom goals
- Mushroom drawing
- Mushroom food multiplier

Remaining `mushroom` references are compatibility guards to convert old saves to `food`.

### Golden Boost

The old golden boost system is removed or replaced by Golden Finger/golden egg lineage.

Current golden-related systems:

- Normal golden ants
- Golden ant birth event
- Golden Finger
- Golden eggs
- Golden larvae
- Golden subset room inventory
- Golden room drawing

Old removed/deprecated concepts:

- `MAJOR_ACT_GOLDEN_*`
- `major_act_golden`
- Golden boost UI
- Golden boost lottery
- Golden boost activation
- Golden boost tap bonus
- Golden boost `x10` golden chance

## 24. Current Known Issues And TODO

### Render Cap Still Affects Some Non-Builder Simulation

Builder construction progress has been moved to `G.ants.builder` based work slots. Phase 4 also throttles low-priority visible-ant AI. However, `S.ants` is still both a visual list and an action list for several non-builder tasks. If render cap reduces the number of visible ants, some nurse/worker/soldier task throughput may still change.

Recommended fix:

- Create separate simulation counts/work slots based on `G.ants.*`.
- Use `S.ants` only for representative visuals where possible.
- Continue with nurse/worker/soldier roles in a later phase if needed.

### Perf-1 Is Not A Full Scheduler

Phase 4 batches dot rendering and throttles low-priority AI, but it does not introduce workers, typed arrays, flow fields, or a separate logical task scheduler for every role.

Remaining limitations:

- Sprite/vector drawing still renders individuals.
- Moving/transport/combat ants intentionally keep full updates for correctness.
- Nurse/worker/soldier task throughput can still be tied to visible representative ants.

### Builder Target Parallelism

Builder targets now have runtime reservations and limited stack counts. Normal targets spread better across a small number of edges/rooms, while priority targets can still receive extra slots. The active target count is intentionally capped at 3 so construction usually runs in 2-3 places rather than scattering across the map.

Remaining limitations:

- Reservation state is deliberately rebuilt at runtime rather than saved.
- Distribution is intentionally simple and capped; it is not a full construction scheduler.
- If future systems add more construction types, their priority/stack limits should be reviewed.

### Cookie Boost UI

Cookie boost runtime exists, but normal dock button UI is incomplete/no-op.

Decision needed:

- Restore an explicit UI, or
- Remove the remaining unused UI plumbing if the lucky-target-only flow is preferred.

### Phase 5B Major Migration Status

Phase 5A moved cookie appearance x2 and jaw/soldier attack x2 into research. Phase 5B moved Depth II, Depth III, and barracks blueprint into research. Golden Finger, active cookie boost, and future big-carry-related UI still remain outside research.

Recommended fix:

- Migrate or explicitly classify the remaining buy-once/active major flows in later Phase 5 work.
- Keep `G.major` as compatibility/legacy state until all remaining references are audited.

### Historical Major Migration Note

Phase 5A moved only `クッキー出現 x2` and `兵隊攻撃 x2` into research. Golden Finger, depth unlocks, barracks blueprint, and future big-carry-related UI still remain outside research.

Recommended fix:

- Migrate or explicitly classify the remaining buy-once major flows in later Phase 5 work.
- Keep `G.major` as compatibility/legacy state until all remaining references are audited.

### Waste Balance

Needs real-play balance checks:

- Does feeding stall too much when nurse count is low?
- Does dangerous waste get cleaned in time?
- Is the waste room too strong or too weak?
- Is the entrance-haul distance penalty meaningful?

### Fermenter Visuals

Fermenter ants affect population and ferment speed but are not visualized as individual ants. This is currently intentional, but can be revisited.

### Large Food Carry Event MVP Limitations

The large food carry event is intentionally minimal and needs real-play balance and polish checks:

- Reward (`300 + 50 * min(worker, 40)` food) and the 60-120s low-probability spawn cadence are untuned guesses.
- One event at a time, food-only reward, idle-only worker participation, and no research node are deliberate MVP scope, not final design.
- The event is runtime-only: it is not saved and is dropped on reload, so an in-progress carry is lost on refresh.
- Worker escort is presentation only; the food is moved by `updateLargeFood`, so escort visuals and food motion can desync slightly at very high `timeScale`.

## 25. Update Discipline

When changing the game:

- Update `DEVELOPMENT_LOG.md` with purpose, changes, and verification.
- Update this `CURRENT_SYSTEM_OVERVIEW.md` if the change affects current behavior, state shape, save data, UI, unlock flow, AI, rendering, deployment, or known TODOs.
- Keep this file as the current truth, not a historical changelog.
