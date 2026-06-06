# Ant Colony V23 Current System Overview

Last updated: 2026-06-06 (22)
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
- `fermentRoomPending`, `cookieRoomPending`, `barracksPending` (special-room build reservations; all saved)

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
- `w`, `h`: world size. Current base width is `WORLD_W_BASE = dp(1800)`, reduced from the older `dp(2400)`.

When loading a saved world wider than the current base width, `deserializeWorld()` compresses all node X positions and edge control-point X positions toward the world center. This applies the narrower cross-section to existing saves as well as new games.

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
- The gear menu is available on desktop and contains save, export, load, diary, goals, stats, overview, and error details.
- The desktop growth-factor line uses compact chips while preserving the same underlying support/penalty/blocker conditions.

Top/right HUD resource boxes stay visible from the start. Discovery and unlocks change values and related gameplay, but they no longer remove cookie, larvae, rate, rest, season, or depth boxes from the layout.

Stats modal:

- `btn-stats` opens `modal-stats`.
- The modal is read-only and generated on open from current `G` / `S` state and existing helper calculations; it does not add save data.
- Sections summarize resources, ant roles, growth multipliers, rooms/pending rooms, raid defense, and environment/render/build status.

## 5. Upgrade Dock

Upgrade cards are grouped into the current tab area.

Tab grouping:

- **Ants tab**: Queen level, Worker upgrade, Nurse level, Builder level, Soldier level, Golden Finger, Big carry
- **Rooms tab**: Waste room unlock, Ferment room build, Cookie room build, Barracks blueprint
- **Common (always visible)**: Queen level up button

Important upgrades/actions:

- Queen level
- Worker upgrade
- Nurse level
- Builder level (moved to Ants tab; was previously in Rooms tab)
- Soldier level
- Waste room unlock
- Ferment room build
- Cookie room build (Rooms tab; blueprint -> pending -> build, power-scaling cookie cost; see section 15)
- Golden Finger
- Big carry (large food carry unlock; requires worker Lv 5 + cookie 5; gates `maybeSpawnLargeFood`)
- Barracks blueprint (moved back from research to the Rooms tab dock; requires builder Lv 3; first cost cookie 25 then power-scaling via `getBarracksCost()`; repeat purchase adds `G.barracksPending`. First purchase sets `G.major.barracks` and saves immediately, then builder AI prioritizes the first barracks. See section 16.)

Cookie rooms, ferment rooms, and barracks now share one unified blueprint flow: press the Rooms tab button -> cost is deducted -> a `*Pending` reservation is incremented (saved) -> builder AI places and digs the room. Costs scale by a power of the room count, and the old hard caps were removed (the growing cost is the natural limit).

`クッキー出現 x2` and `兵隊攻撃 x2` are no longer normal dock purchases. Their old buttons remain in the DOM for compatibility, but are hidden and redirect to the research tab if triggered directly.

The old standalone golden boost system is not active. Golden progression is now handled by Golden Finger and golden egg/larva lineage.

`major_act_cookie` remains as the cookie boost lucky-target system. The cookie boost button UI is not a normal dock button, but the runtime system still exists through `S.majorActives.cookie` and related lucky target state.

Depth II and Depth III are no longer normal dock purchases. Their old buttons remain in the DOM for compatibility, but are hidden and redirect to the research tab if triggered directly.

The barracks blueprint was moved back OUT of research to the Rooms tab dock. It is removed from `RESEARCH_NODE_DEFS` (no longer shown in the research tree), but the `BARRACKS_BLUEPRINT_NODE` constant, `G.major.barracks` flag, and `ensureResearchState()` sync are kept for save compatibility. `hasBarracksBlueprint()` still reads either the old research-node flag or `G.major.barracks`.

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
- `cookieroom` — クッキー発見率を部屋数に応じて×1.5^N倍（旧: 最大3部屋で×3.375。設計図統一で部屋数の上限は撤廃され、コスト増が自然な制限に）。ワーカーがクッキー室に納品した際に20%でボーナス+1。建築Lv3で解放。
- `ferment`
- `shaft`
- `entrance`

Room generation is handled mainly by:

- `expandMap()`
- `forceExpandRoom()`
- `ensureBandReady()`
- `maybeShiftBand()`

Parent selection spreads new rooms to avoid clustering at one origin: `expandMap`'s `weightShaft` favors shafts with fewer existing children (`degScore`) and downweights pure center bias, and a room can also branch off another room (`PARENT_ROOM_PROB` ≈ 0.5) for a more tree-like nest. `forceExpandRoom` tries the least-connected shaft first instead of always the main-shaft tip (`S.mainTipId`). The depth/band system still controls which layer is dug.

Generation guards prevent rooms from being created above the surface:

- `getUndergroundMinY(x, roomRadius)`
- `isNodeAboveGround(n)`
- `isDigTargetAboveGround(digT)`

Tunnel crossing is prevented during generation: `edgeIntersectsExisting(newEdge, skipU, skipV)` tests a candidate tunnel's bezier against existing edges before the node/edge is committed. `queueMainShaftEdge`, the `expandMap` non-branch loop, and `forceExpandRoom` each skip a placement that would cross an existing tunnel.

`S.band` controls the active dig layer. It is saved and restored. If missing or invalid, it is repaired before builder target selection.

## 7. Ant Counts, Rendering, And Current Separation

There are two different ant count concepts:

- Logical population: `G.ants.*`
- Visual/action ants: `S.ants`

`ANT_ROLES = ['worker','nurse','builder','soldier']`

`fermenter` exists in population and effects, but is not drawn as an individual ant and is not included in `ANT_ROLES`.

Hiring costs use `BASE_COSTS[role] * growth^currentRoleCount`, floored. Default hiring growth is `COST_GROWTH = 1.15`; role-specific overrides live in `ROLE_COST_GROWTH`. Soldier ants currently use `ROLE_COST_GROWTH.soldier = 1.075` so only soldier hiring scales at +7.5% per existing soldier, while nurse/builder/fermenter hiring keeps the shared +15% growth.

Render settings:

- `RENDER_CAP_OPTIONS = [1000, 3000, 6000, 10000]`
- Default cap is `10000`
- `VISUAL_ANT_HARD_CAP = 10000`
- `ACTION_ANT_CAP = 1000`
- `ACTION_ANT_MEDIUM_COLONY_CAP = 650`
- `ACTION_ANT_LARGE_COLONY_CAP = 420`
- Saved render settings in `localStorage` override the default
- Render modes are `auto`, `vector`, `sprite`, `crowdSprite`, and internal fallback `dot`.
- Auto LOD currently selects:
  - `crowdSprite` for at least 180 logical ants or camera zoom below 0.88
  - `sprite` for at least 80 logical ants
  - `vector` for close/low-count views

Crowd rendering:

- `S.antCrowd` is a runtime-only visual crowd layer generated from `G.ants.*`.
- Up to 10,000 logical ants can be represented as individual ant-shaped sprites, not dots.
- `crowdSprite` uses a pre-rendered Canvas atlas: 4 role colors, 32 directions, 6 walk frames.
- The atlas frames include abdomen, thorax, head, legs, and antennae. Leg motion is baked into walk frames and offset by each ant's `gaitPhase`.
- `S.antCrowd` uses typed-array style fields (`x`, `y`, `rot`, `role`, `gaitPhase`, `speed`, `routeKind`, `nodeId`, `edgeId`, `t`) and is not saved.
- `S.antCrowd` handles lightweight room wandering and completed-edge travel only. It does not run cargo, construction, feeding, waste, combat, or reward logic.
- Important action ants from `S.ants` (cargo, golden, panic, rest, large food, waste/feed jobs, surface gathering, builder work, invader-response soldiers) are drawn on top of the crowd and subtracted from crowd role counts to avoid duplicate bodies where possible.
- During raid attack/result phases, underground soldier crowd/actors are hidden; `S.raidSoldiers` remains the surface raid representation.

Current state:

- Builder construction progress has been separated from visible builder count.
- `S.buildAssignments` computes construction work from `G.ants.builder`, so visual display cap no longer directly controls builder dig progress.
- Visible builder ants remain in `S.ants` as representative animation.
- Other per-frame task roles still use `S.ants` more directly, but `S.ants` is now capped separately by `getActionAntCap()` rather than the 10,000 visual display cap.
- `getActionAntCap()` lowers the representative action-actor cap on very large nests: medium colonies can cap at 650 and large/very-larva-heavy colonies can cap at 420. This keeps heavy saves from updating 1000 action actors while `S.antCrowd` preserves the visual population.
- Numeric systems that directly use `G.ants.*`, such as base food production and egg/larva progression, are less affected.
- Ant path heading uses forward/backward samples on the current tunnel curve so endpoint/junction frames keep the travel direction instead of snapping to 0 degrees.
- Phase 4 Perf-1 keeps `S.ants` but lightens it:
  - high-count visual ants move to `S.antCrowd` / `crowdSprite`
  - dot-mode rendering remains only as an internal fallback
  - low-priority idle/rest/wander AI updates are throttled
  - transport, construction, combat, cargo, raid, invader-response, and golden ants remain full-update

Future phases should continue separating non-builder simulation work from visual representative ants.

## 8. Phase 4 Perf-1 Rendering, Crowd Sprites, And AI Throttling

Perf-1 started as a conservative lightweight pass on the existing Canvas 2D and `S.ants` architecture. The current high-count path adds `S.antCrowd` so visual scale can reach 10,000 bodies without turning ants into dots.

Rendering:

- `drawAntCrowd()` is used for `crowdSprite` mode.
- `ensureCrowdAntAtlas()` builds the role/direction/walk-frame atlas at the current DPR and rebuilds it after resize.
- `drawAntDotsBatched()` still exists for internal `dot` fallback, but auto LOD no longer selects it.
- Dot rendering groups ants by base color and draws grouped paths for normal role colors, carry markers, golden glow, and panic rings when forced.
- Sprite and vector modes remain individual ant renderers.
- The static underground soil/tunnel layer is cached in `S._soilLayerCvs` and rebuilt only when camera/screen/world visibility signatures change.
- The fog-of-war layer is cached in `S._fogCvs` with the same screen/world signature approach. This avoids redoing hundreds of radial gradients every frame on large visible nests.
- Perf counters track `drawCrowd`, `visibleCrowd`, `culledCrowd`, `crowdAtlasFrames`, `drawDot`, `drawSprite`, `drawVector`, and `drawBatches`.

AI update throttling:

- `S.frameCount` increments once per `updateAnts(dt)`.
- `shouldFullUpdateAnt(a, idx, raidActive)` decides whether the ant receives full role/task processing this frame.
- `lightweightUpdateAnt(a, dt)` handles low-priority rest/wander continuation when full role processing is skipped.
- Always-full categories include cargo/transport ants, construction movement, raid/combat, invader response, golden ants, and active non-idle task flows.
- Throttled categories are mainly idle, rest, and non-critical room wandering.

Perf debug:

- The debug overlay reports FPS, update/render time, action actors, logical population, render cap, crowd count, visible/culled crowd count, atlas frame count, selected/used render mode, LOD usage, full/light/skipped AI counts, draw counts by mode, draw batch count, and builder real/visible/work/target stats.

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
- Construction speed decreases with distance from the entrance. `getBuilderLogicChunkSec(target)` adds a travel-time penalty of `min(2.5, distanceFromEntrance / dp(360))` seconds (halved from the original `min(5.0, d/dp(180))`), then multiplies by 0.35 before adding to the base chunk duration. This means deep or far-flung sites take noticeably longer per dig unit than sites near the entrance, simulating the round-trip cost of hauling soil.

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
- Waste room unlock also unlocks the `hygiene_3` / `お掃除はおまかせ` research condition.
- `hygiene_3` improves cleaner thresholds, cleaner share, and haul amount.
- After `hygiene_3`, some workers also join low-priority waste cleanup: `8%` of workers, capped at `8` simultaneous worker cleaners.

Important functions:

- `getWasteCleanerJobFraction()`
- `getWastePickThreshold()`
- `getWasteUrgentThreshold()`
- `getWasteHaulPerTrip()`
- `getWasteHaulAmount()`
- `hasWorkerWasteCleanup()`
- `getWorkerWasteCleanerJobFraction()`
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

Research UI:

- The Research tab shows overview cards for total progress, currently affordable research, and next candidate.
- Each branch renders as a lane with icon, accent color, branch description, progress bar, and ready/done counts.
- Nodes render with status marks, breakthrough tags, prerequisite tags, condition tags, cost, node id, and action state.
- Same-branch prerequisites are visualized with indentation and connector lines; progression data still comes from `RESEARCH_NODE_DEFS.prereq`.

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
- `hygiene_3`: `お掃除はおまかせ` / requires waste room unlock; improves cleaning and lets some workers help with waste cleanup
- `ferment_unlock`: Ferment room unlock
- `ferment_1`: Ferment speed I
- `ferment_2`: Sweet concentration
- `ferment_3`: Ingredient saving
- `ferment_worker_unlock`: Fermenter ant unlock
- `cookie_find_2x`: Sweet scouting / cookie appearance x2 passive
- `geo_depth_2`: Depth II unlock
- `geo_depth_3`: Depth III unlock
- `soldier_jaw_2x`: Jaw strengthening / soldier attack x2 passive

`military_barracks_blueprint` was removed from the research tree (the barracks blueprint is now a Rooms tab dock purchase). Its constant and `G.major.barracks` compatibility plumbing are kept, so old saves that researched it stay valid. The defense branch now contains only `soldier_jaw_2x`.

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
- Build cost: power-scaling `getFermentRoomCost()` = `FERMENT_ROOM_COST (2000) * FERMENT_ROOM_COST_GROWTH (2.0)^(built + pending)` food. First room 2000, each further room costs more.
- No hard room cap (unified special-room blueprint system). `FERMENT_ROOM_MAX (2)` is kept only as a legacy reference; the buy check no longer enforces it, so the growing cost is the natural limit.
- Build action: player presses the button → food is deducted → `G.fermentRoomPending` increments (reservation). The pending count is saved and survives reload.
- `getDigTarget()` ferment reservation logic (A/B):
  - A) If any placed-but-undug ferment edge exists, dig it at high priority (score 9800, just below first barracks) regardless of pending.
  - B) If `pending > 0` and no undug ferment edge exists, call `forceExpandRoom('ferment')` to place a new room; on success decrement pending by 1.
  - `pending` therefore only counts ferment rooms not yet placed, so a 2nd reservation still builds even when one ferment room already exists.
- `forceExpandRoom` uses multiple shaft parents and progressive collision-distance relaxation (`collFactor` 1.0 → 0.72 → 0.5) so dense colonies (40+ rooms) can still place the room.
- `G.fermentRoomPending`: saved integer. `canBuy` is just `isFermentRoomUnlocked() && food >= getFermentRoomCost()` (no max-count gate).

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

Worker cookie chance:

- Worker cookie acquisition is rolled when a worker returns from surface gathering and switches from `surf` to `ret`.
- Base chance is `0.005` (`0.5%`) per returning worker.
- Effective chance is `clamp((0.005 * workerCookieMul + globalCookieAdd) * cookieFind2x * activeCookieBoost * cookieRoomMul, 0, 1)`.
- `workerCookieMul` comes from worker level (`G.getWorkerCookieMul()`).
- `globalCookieAdd` comes from the active golden/global buff (`getGlobalCookieAdd()`).
- `cookieFind2x` is `2` after research node `cookie_find_2x`, otherwise `1`.
- `activeCookieBoost` is `100` while the cookie boost active major is active, otherwise `1`.
- `cookieRoomMul` is `S.cookieRoomMul`, currently `1.5 ^ cookieRoomCount`.
- If the worker delivers to a cookie room, delivery storage uses `invCookie` and separately has a `20%` chance to add one extra cookie.

Cookie room:

- Unlock condition: builder level `3`
- Built via the unified blueprint flow (Rooms tab `クッキー室建設` button → `G.cookieRoomPending` reservation → builder AI places and digs it), NOT auto-built; the old `canAddCookieRoom` auto-build was removed. No hard room cap; cost is power-scaling `getCookieRoomCost()` = `COOKIE_ROOM_COST_BASE (30 cookie) * COOKIE_ROOM_COST_GROWTH (2.5)^(built + pending)`.
- Each room contributes to `S.cookieRoomMul` = `COOKIE_ROOM_MUL_PER_ROOM (1.5)^cookieRoomCount` (no longer capped at 3 rooms).
- Workers prefer delivering cookies to cookie rooms, then queen room, then food rooms.
- Delivery to a cookie room stores `invCookie` and has a bonus chance to add an extra cookie.
- Current drawing uses normal room slots with gold cookie dots. Old large cookie background and `+N` overlay drawing were removed.

## 16. Soldiers, Barracks, Invaders, And Raids

Soldier unlock requires:

- Barracks blueprint
- First barracks room actually built

Barracks blueprint / barracks rooms:

- Repeat purchase via the unified blueprint flow: cost is power-scaling `getBarracksCost()` = `MAJOR_BARRACKS_COST (25 cookie) * BARRACKS_COST_GROWTH (2.5)^(built + pending)`. The first purchase still sets `G.major.barracks` (kept for compatibility); each purchase adds a `G.barracksPending` reservation.
- Requires builder level `3`.
- Builder AI places/digs barracks rooms from the pending count (same pattern as cookie/ferment). `S.barracksCount` is recomputed from built soldier rooms; each barracks raises the soldier population cap (+20/room).
- Builder AI prioritizes first barracks construction after the blueprint is first purchased.

Soldiers:

- Defend entrance during raids.
- Return to barracks or guard normally after raid.
- Contribute to raid resolution.

Invaders:

- Underground invaders can target food rooms and nursery rooms.
- Surface raid system uses `S.raidVis` and `resolveRaid()`.
- Raid phases are warning/countdown -> attack -> result.

Raid outcome timing (Phase 7A):

- The win/lose outcome is decided at the END of combat, when `resolveRaid()` runs, not when the attack starts.
- `beginRaidAttack()` only sets up the attack phase (close result modal, `state="attack"`, reset timer, spawn enemies, screen shake, alert UI). It does NOT call `computeRaidOutcome()` and clears any stale `S.raidVis._pendingOutcome`.
- `resolveRaid()` first asks `computeRaidOutcomeFromSurfaceCombat()` for a finished surface-combat result. If an attack is still unresolved, it returns without applying any outcome; otherwise it uses `surfaceOut || S.raidVis._pendingOutcome || computeRaidOutcome()`. After Phase 7B-3/4 the surface-combat result is used for normal raids; `computeRaidOutcome()` remains only as a fallback (no enemies / broken state / stale in-flight). It then applies rewards/damage, updates `G.raidWins`/`G.raidTotal`, and shows the result modal.
- `computeRaidOutcome()` (the probability formula) is kept unchanged as a fallback. `RAID_CFG`, `getColonyCombatPower()`, `getEnemyPower()`, `getRaidWinProb()` are unchanged.
Raid enemy HP and counts (Phase 7B-1, reworked in Phase 7.5):

- Each raid enemy spawned by `spawnEnemies()` has `hp`, `maxHp`, `dead`, `hitFlash`, and a unique `id`.
- Enemy *render count* (bodies drawn, for a two-sided melee) is `clamp(enemyPower / RAID_ENEMY_RENDER_UNIT_POWER (12), enemyCountMin (6), RAID_ENEMY_RENDER_COUNT_MAX (80))` — intentionally many.
- Enemy *difficulty is decoupled from render count*: a total HP budget is computed on the old count basis (`getRaidEnemyBaseHp(enemyPower, nBudget) * nBudget`, `nBudget = clamp(enemyPower / RAID_CFG.enemyUnitPower (25), 6, RAID_CFG.enemyCountMax (36))`) and split evenly across the rendered bodies. Adding bodies changes the look but not total HP / fight length; breach-loss is ratio-based (30%), so it is body-count agnostic.
- Per-enemy base HP (`getRaidEnemyBaseHp`) follows the player's *logical* army strength (not the render cap): `(RAID_ENEMY_BASE_HP + perEnemyPower * RAID_ENEMY_HP_PER_POWER) * playerScale^RAID_ENEMY_HP_PLAYER_EXP (0.7) * RAID_ENEMY_HP_DURATION_MUL (2.0)`, where `playerScale = max(1, (G.ants.soldier * getRaidSurfaceSoldierDamage()) / (RAID_ENEMY_HP_REF_SOLDIERS (24) * RAID_SURFACE_SOLDIER_DAMAGE_BASE))`. The `<1` exponent dampens scaling so a bigger army still wins faster; `_DURATION_MUL` tunes fight length; `_REF_SOLDIERS` keeps it independent of how many bodies are drawn. (`makeRaidEnemyHp()` is the legacy per-enemy helper; spawn now inlines budget-based HP with the same `RAID_ENEMY_HP_RANDOM_MIN/MAX` variance. `RAID_CFG` values themselves are unchanged.)
- A small HP bar is drawn above each living enemy (`drawRaidEnemyHpBar()`), reflecting `hp/maxHp` and the enemy `fade`.
- `damageRaidEnemy(en, amount)` reduces HP; at 0 the enemy becomes `dead` / `phase="dead"` / `killedBySoldier=true`, stops moving, and fades out. As of Phase 7B-3 it is connected to normal play (surface soldiers call it).

Soldier surface sortie (Phase 7B-2):

- During the attack phase, soldier ants sortie from the entrance onto the surface as a display layer (`S.raidSoldiers`, independent from `S.ants`, runtime-only, not saved).
- Rendered soldier count is `clamp(G.ants.soldier, 0, RAID_SURFACE_SOLDIER_RENDER_MAX=300)` — the *visible* army IS the *real* fighting army (a cosmetic crowd layer was tried and reverted as "meaningless animation"). Each rendered soldier carries `weight = G.ants.soldier / renderedCount` (`getRaidSurfaceSoldierWeight()`): armies <=300 are shown 1:1 (weight 1), beyond that each body represents several (weight is a safety net for extreme late-game counts). Logical combat power is still `G.ants.soldier` / `getColonyCombatPower()`.
- Scaling to large counts: soldier-soldier separation in `updateRaidSoldiers` uses a spatial grid (cell = separation distance; check own + 8 neighbor cells) so it is O(n), not O(n^2). Enemy targeting stays linear since enemies are capped (<=80). Rendering uses an LOD: above `RAID_SURFACE_SOLDIER_LOD_COUNT` (120), soldiers are drawn as two batched fills (body + head, oriented by the head offset) instead of per-ant detailed vector, so hundreds of soldiers cost ~0 extra render. (Measured: 300 soldiers ≈ +3ms update, ~0ms render; the dominant render cost is the nest itself, not the raid.)
- Each surface soldier has a `preferSide` (alternating left/right by slot index) and seeks the nearest living enemy on that side first (`findNearestLivingRaidEnemy(x,y,side,ex)`), falling back to the nearest living enemy anywhere if its side is empty. This makes soldiers split to both sides when enemies attack from both. It also checks `findNearestLivingRaidEnemyInRange()` each update; if a living enemy enters `RAID_SURFACE_SOLDIER_INTERCEPT_RANGE` (52px), that nearby enemy overrides the locked target so soldiers fight the front/contact enemy instead of walking through it toward a previously chosen rear target. It advances toward the target and slows to "engage" within `RAID_SURFACE_SOLDIER_ENGAGE_RADIUS` (30px). If its target dies or disappears it re-targets; if no enemies remain it returns to / idles near the entrance. Phases: `emerge -> advance -> engage -> return -> idle`. Movement is straight-line (no pathfinding). Surface soldiers are clamped near the same surface line used by raid enemies (`S.full.sy`, within 3 px plus a small walk bob) so they read as walking on the ground instead of floating above it.
- Surface soldiers are drawn in the soldier blue (`#3b82f6`) to match the soldier identity. During the raid `attack`/`result` phases, the underground `S.ants` soldiers are excluded from the ant draw (the surface soldiers represent them), so there is no duplicate blue cluster at the entrance. The `S.ants` soldier defend/guard logic itself is unchanged; only their rendering is suppressed during the raid.
- Enemies carry a unique `id` (for targeting). Soldiers are spawned in `beginRaidAttack()` via `ensureRaidSoldiers()`, updated by `updateRaidSoldiers()`, drawn by `drawRaidSoldiers()`, and cleared/faded on `result`/`none` via `clearRaidSoldiers()`.
Surface combat and outcome (Phase 7B-3/4):

- Surface soldiers attack: when within `RAID_SURFACE_SOLDIER_ATTACK_RANGE` of their target and off cooldown (`RAID_SURFACE_SOLDIER_ATTACK_COOLDOWN`), they call `damageRaidEnemy()` for `getRaidSurfaceSoldierDamage() * soldier.weight` (base = `RAID_SURFACE_SOLDIER_DAMAGE_BASE * getSoldierPowerMul(G.sLv)`, already including jaw2x x2; the `weight` factor makes total surface DPS scale linearly with `G.ants.soldier` regardless of the render cap). On a kill the soldier re-targets.
- Enemy death: HP 0 -> `dead`, stops, fades out, excluded from targeting and from the living count.
- Engagement slowdown (standoff): `updateRaidSoldiers()` runs before enemy movement during the attack phase, so the current frame's `engagedBy` count immediately affects enemy movement. After soldier movement and separation, `refreshRaidEnemyEngagement()` recomputes `engagedBy` from physical proximity: each soldier near a living enemy within `RAID_SURFACE_SOLDIER_BLOCK_RADIUS` (36px) contributes one body-blocking count, even if that enemy is not the soldier's locked target. Enemy forward advance is slowed with `holdFactor = max(RAID_ENEMY_ENGAGED_MIN_FACTOR 0.01, 1 - engagedBy * RAID_ENEMY_ENGAGED_SLOW_PER 0.94)`. One nearby soldier slows the enemy to a crawl; two or more pin it at the minimum crawl speed. Enemies that are not body-blocked still advance at full speed and can slip through to breach.
- Enemy breach: when an enemy gets close enough to the entrance it is marked `breached` once and counted; breached enemies sink in and fade, and are excluded from combat.
- The attack phase has no time limit. It runs until the battle is actually decided: all enemies have been resolved (`living count <= 0`) or breached enemies reach the loss threshold. Once decided, it waits `RAID_FINISH_DELAY` (0.6 s) before resolving.
- Outcome: `computeRaidOutcomeFromSurfaceCombat()` returns win if all enemies were killed, win if all remaining enemies are resolved below the breach-loss threshold, and loss if breached enemies reach `getRaidBreachLoseThreshold(total)` (= `ceil(total * RAID_BREACH_LOSE_RATIO 0.30)`, min 1). If enemies are still alive and the breach threshold has not been reached, it returns `null` and the raid keeps running. It is converted to the existing out format by `buildRaidOutcomeFromSurfaceResult()` (food/cookie reward on win with a small all-killed bonus; worker loss and food/egg multipliers scaled by breach ratio on loss), so `resolveRaid()` applies rewards/damage exactly once via its existing path.
- The result modal shows a surface-combat breakdown (撃破 / 突破 / 残存 / 判定 reason).
- Counters live on `S.raidVis` (`totalEnemies`, `killedEnemies`, `breachedEnemies`, `finishDelay`). Debug: `window.__debugRaidCombat()`.

NOT implemented: soldier death, per-soldier HP, enemy attacks against soldiers, extra enemy types, defense lines / formations / traps, boss fights, and a full reward-balance redesign.

Debug raid trigger (test only, not exposed in normal UI):

- `debugForceRaid()` starts a raid with a 10s warning when `state==='none'` and at least one soldier exists (the update loop cancels raids without soldiers).
- Triggers: key `R` (desktop), long-press (~0.9s) on the population HUD box `#pop-box` (mobile), or `window.__forceRaid()` (console).

## 17. Large Food Carry Event

A lightweight surface event (MVP). A single large food appears on the surface, idle workers gather, escort it to the nest entrance, and the colony gains food.

State:

- Runtime-only `S.largeFood` (one event at a time) and `S.largeFoodTimer`. Neither is saved or restored.
- `S.largeFood` fields: `id`, `x`, `y`, `state`, `requiredWorkers`, `assignedWorkers`, `arrivedWorkers`, `rewardFood`, `progress`, `rewarded`, `r`, `sizeFactor`, `carrySpeed`, `seed`, `shape`, `life`, `carryStartX`, `t`, `doneT`, `spawnTime`.
- `state` machine: `waiting -> gathering -> carrying -> done`.

Spawn conditions (`maybeSpawnLargeFood`):

- **`G.major.workerBigCarry === true`** (unlock by purchasing the "大物運搬" dock card; requires worker Lv 5 + cookie 5).
- No active event (single slot).
- Not during a raid.
- `G.ants.worker >= LARGE_FOOD_MIN_WORKERS` (20).
- `S.largeFoodTimer` counts down; on expiry, a low-probability roll spawns the event and reschedules 60-120s, otherwise retries after a short interval.
- Debug: key `L` or `window.__spawnLargeFood()` force-spawns one.

Gather / carry / complete (`updateLargeFood`, called before `updateAnts`):

- Idle workers are assigned in the worker idle branch at highest priority, capped at `requiredWorkers`. Only idle workers join; nurse/builder/soldier and busy/cargo workers never do.
- Assigned workers walk to the entrance, then across the surface to the food (`go_large_food`), then mill around it (`large_food_wait`).
- When arrived workers reach `requiredWorkers`, state becomes `carrying`; the food moves toward the entrance and workers follow as presentation (`large_food_carry`). The food movement is driven by `updateLargeFood`, not by the ants.
- On reaching the entrance, the food reward is granted once (`G.food += rewardFood`, clamped to cap), with a toast and `fx`, then the event clears after a short linger.
- If workers cannot gather in time (`life` timeout) or a raid starts, the event aborts and the workers return inside via the existing `ret` flow.

Reward:

- Food only. Each event rolls a random `sizeFactor` (log-uniform ~0.5x-3.0x) that scales required workers, food reward, carry speed, draw radius, and the spawn toast label. `rewardFood = floor((LARGE_FOOD_REWARD_BASE + LARGE_FOOD_REWARD_PER_WORKER * rewardWorkers) * sizeFactor)`; required workers scale with size (capped near half the current workers); larger food is carried more slowly (`carrySpeed = LARGE_FOOD_CARRY_SPEED / sizeFactor`).

Rendering (`drawLargeFood`, before the raid-enemy draw):

- Carrying bob amplitude is intentionally subtle: `dp(1.5)` while carrying, `dp(1.2)` while waiting/gathering.
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

Cookie x100 boost (`S.majorActives.cookie`):

- Runtime state machine is `hunting -> available -> active -> cooldown`.
- While `hunting`, it rolls once every `MAJOR_ACT_ROLL_INTERVAL = 3` seconds.
- First roll chance is `MAJOR_ACT_COOKIE_BASE = 0.06` (`6%`).
- Each miss adds `MAJOR_ACT_COOKIE_INC = 0.015` (`+1.5%`) pity.
- Roll chance is capped at `MAJOR_ACT_COOKIE_MAX = 0.30` (`30%`).
- When a roll succeeds, a sugar/cookie lucky target becomes `available` for `MAJOR_ACT_COOKIE_WIN = 15` seconds.
- Tapping the target activates the boost for `MAJOR_ACT_COOKIE_ACTIVE = 10` seconds.
- While active, worker cookie chance uses `MAJOR_ACT_COOKIE_MUL = 100`.
- After activation, or after missing the available target, cooldown is `MAJOR_ACT_COOKIE_CD = 12000` seconds (`3h 20m`).
- Expected time from entering `hunting` until target appearance is about `23` seconds.
- Probability of seeing the target within the first `15` seconds of hunting is about `37.7%`.

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
- Queen whispers are suppressed during raid `countdown`, `attack`, and `result` states; new whispers are ignored and any visible whisper is cleared.

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

Sky and camera headroom:

- The sky is a vertical gradient (season / day-night colors) drawn from `-SKY_HEADROOM` (dp(340) above the surface) down to `S.full.sy`. `SKY_HEADROOM` adds open-sky space above the colony so the above-ground reads as sky, not a thin strip.
- `getCamBounds()` treats the world top as `-SKY_HEADROOM` (not 0), so the camera can pan up into the sky and the default/centered view shows it. `S.full.sy` and the nest layout are unchanged, so existing saves get the wider sky too.
- Sun and moon are positioned within the expanded sky band.

Render modes:

- `auto`
- `vector`
- `sprite`
- `crowdSprite`
- `dot` (internal fallback, not selected by normal auto LOD)

Crowd sprite mode uses a pre-rendered ant atlas and `S.antCrowd` typed-array style state so large populations remain ant-shaped instead of falling back to dots. Dot mode still exists as a grouped-path fallback via `drawAntDotsBatched()`.

Large-nest static layer caching:

- `drawCachedStaticNestLayer()` renders underground soil, tunnel stamps, room cutouts, cave fill, and static background details into `S._soilLayerCvs`.
- `drawCachedFogLayer()` renders fog-of-war into `S._fogCvs`.
- Both caches use camera/screen/world signatures (`getNestScreenCacheKey()` / `getNestVisualSignature()`) and are reused while the camera and visible nest geometry are stable.
- The cache canvas is larger than the visible screen (`NEST_LAYER_CACHE_PAD_RATIO`, min/max pad) so normal panning can be served from cached pixels.
- `panByScreen()` and `zoomAtScreen()` call `markCameraInteraction()`. During this short interaction window, stale static/fog caches are transformed to the current camera instead of being rebuilt.
- If the current view is still covered and the zoom ratio is close enough, `canKeepTransformedNestLayerCache()` keeps using the transformed cache even after the interaction window, avoiding a post-drag rebuild hitch.
- If the camera moves beyond cache coverage during interaction, `drawCheapSoilFallback()` fills exposed soil cheaply until a full static cache rebuild is needed.
- Soil/fog cache rebuilds are staggered with `noteNestLayerRebuildThisFrame()` so they do not both rebuild in the same render frame when possible.
- Room inventory, larvae, waste dots, ants, queen, large food, enemies, trails, and effects remain dynamic and are drawn on top.

Render settings:

- `S.renderSettings`
- Render settings modal
- LOD toggle
- Larva wiggle toggle
- Display cap selector (`1000 / 3000 / 6000 / 10000`)

Color mode (`_colorMode`, default on; toggled by the 🎨 top-bar button):

- ON: ant role color-coding, room tints, and pheromone trails (the normal look).
- OFF: all ants drawn black, no room tints, no trails — a cleaner / low-distraction view.
- Gated in `getAntBaseColor`, the room-tint apply path, and the trail-draw block. The button shows a purple glow when on and is semi-transparent when off. `_colorMode` is a runtime toggle (not saved).

Debug/performance:

- `buildGameDebugText()`
- `buildPerfDebugText()`
- `updateDebugOverlay()`
- `toggleDebugOverlay()`
- Performance overlay shows FPS, update/render time, action actors/logical ants, ants drawn, render cap, crowd count, visible/culled crowd count, atlas frame count, selected/used mode, LOD, full/light/skipped AI counts, draw counts by mode, dot batch count, builder stats, and graph stats.

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

### Non-Builder Task Throughput Still Uses Representative Actors

Builder construction progress has been moved to `G.ants.builder` based work slots, and high-count visuals now use `S.antCrowd` instead of making `S.ants` scale to 10,000. However, `S.ants` is still both a representative actor list and an action list for several non-builder tasks. Some nurse/worker/soldier transport/task throughput can still be tied to the dynamic `getActionAntCap()` representative actors.

Recommended fix:

- Create separate simulation counts/work slots based on `G.ants.*`.
- Use `S.ants` only for representative visuals where possible.
- Continue with nurse/worker/soldier roles in a later phase if needed.

### Perf-1 Is Not A Full Scheduler

Phase 4 now has typed-array style crowd visuals and throttles low-priority AI, but it does not introduce web workers, flow fields, or a separate logical task scheduler for every role.

Remaining limitations:

- Sprite/vector drawing still renders individual action actors.
- Moving/transport/combat ants intentionally keep full updates for correctness.
- On very large nests, representative action actors can be capped at 420, while `S.antCrowd` preserves visual population. This is a performance tradeoff until non-builder task throughput is fully separated from representatives.

### Builder Target Parallelism

Builder targets now have runtime reservations and limited stack counts. Normal targets spread better across a small number of edges/rooms, while priority targets can still receive extra slots. The active target count is intentionally capped at 3 so construction usually runs in 2-3 places rather than scattering across the map.

Remaining limitations:

- Reservation state is deliberately rebuilt at runtime rather than saved.
- Distribution is intentionally simple and capped; it is not a full construction scheduler.
- If future systems add more construction types, their priority/stack limits should be reviewed.

### Cookie Boost UI

Cookie boost runtime exists as a lucky-target flow, not as a normal dock purchase/action.

- The dock/status button is informational. It reports whether the boost is hunting, available, active, or cooling down.
- It does not directly activate the boost.
- Actual activation requires tapping the on-screen sugar/cookie lucky target while `S.majorActives.cookie.state === 'available'`.

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
