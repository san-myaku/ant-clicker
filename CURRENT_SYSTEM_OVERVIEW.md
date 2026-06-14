# Ant Colony V23 Current System Overview

Last updated: 2026-06-08 (23)
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

Product Design refresh:

- `design_concepts/` contains the three generated UI concept boards used for the visual direction.
- The implemented direction is the refined current dark UI: deep colony panels, amber/green/blue state accents, clearer tab and dock affordances, and polished modal/menu surfaces.
- The refresh is CSS-centered and keeps the existing UI structure, save keys, localStorage payloads, `G` / `S` state, and canvas rendering unchanged.

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

Loop edges (extra cross-connections) are disabled: each new room gets exactly one tunnel. `maybeAddLoop()` still exists but its only call site (after a new room is created in `expandMap`) is commented out. It used to add a second pending edge from the brand-new (still hidden) room to a visible node; because both the parent edge and the loop edge are then "frontier" edges (one endpoint hidden), builders dug both at once — two routes converging on the same room (a repeated user complaint). The nest is now effectively a tree (`loops≈0`).

`S.band` controls the active dig layer. It is saved and restored. If missing or invalid, it is repaired before builder target selection.

## 7. Ant Counts, Rendering, And Current Separation

There are two different ant count concepts:

- Logical population: `G.ants.*`
- Visual/action ants: `S.ants`

`ANT_ROLES = ['worker','nurse','builder','soldier']`

`fermenter` exists in population and effects, but is not drawn as an individual ant and is not included in `ANT_ROLES`.

Hiring costs use `BASE_COSTS[role] * growth^currentRoleCount`, floored. Default hiring growth is `COST_GROWTH = 1.15`; role-specific overrides live in `ROLE_COST_GROWTH`. Soldier ants currently use a base cost of `500` food and `ROLE_COST_GROWTH.soldier = 1.075` so only soldier hiring scales at +7.5% per existing soldier, while nurse/builder/fermenter hiring keeps the shared +15% growth.

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
- ALL action ants from `S.ants` are drawn on top of the crowd at their real positions and subtracted from crowd role counts, so the overlay/crowd partition stays stable as ants change tasks. `shouldDrawActionAntOverlayInCrowd()` returns true for every action ant (it is used both as the crowd-overlay draw filter and as the `getCrowdOverlayRoleCounts()` subtraction set, so the two always match). Previously this predicate excluded `idle`/plain `wander` ants; that made the per-role overlay count oscillate every frame (a busy↔idle flip changed it by 1), which forced `syncAntCrowd()` to add/remove a crowd ant of that role each time. Newly added crowd ants are placed at a random in-room slot (`placeCrowdAntInNode(keepPosition=false)`), so the oscillation showed up as nurses/workers flickering at random coordinates inside rooms. Because the crowd only ever covers the headcount BEYOND `getActionAntCap()`, drawing the idle minority on top costs almost nothing.
- During raid attack/result phases, underground soldier crowd/actors are hidden; `S.raidSoldiers` remains the surface raid representation.

Current state:

- Builder construction progress has been separated from visible builder count.
- `S.buildAssignments` computes construction work from `G.ants.builder`, so visual display cap no longer directly controls builder dig progress.
- Visible builder ants remain in `S.ants` as representative animation.
- Other per-frame task roles still use `S.ants` more directly, but `S.ants` is now capped separately by `getActionAntCap()` rather than the 10,000 visual display cap.
- `getActionAntCap()` lowers the representative action-actor cap on very large nests: medium colonies can cap at 650 and large/very-larva-heavy colonies can cap at 420. This keeps heavy saves from updating 1000 action actors while `S.antCrowd` preserves the visual population.
- The cap tier is hysteretic. `getActionAntCap()` stores the chosen tier in `S._actionCapTier` and uses lower "keep" thresholds than the "up" thresholds (e.g. larvae enters the 420 tier at >8000 but only leaves it below 7200). This stops the cap from flip-flopping when a metric (visible node count, larvae, logical population) hovers near a threshold, which would otherwise mass-resize `S.ants` every frame and make ants vanish in place and respawn at the queen room.
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
- Transformed cache reuse is allowed only when the stored `visualSignature` still matches the current visible nest state. Dig progress or newly visible rooms/shafts force a real cache rebuild so tunnels and fog clear immediately.
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
  - reserved barracks, ferment rooms, and cookie rooms can accept modest stacking
- Reserved special rooms use hidden+visible room-node counts to resume already placed but unfinished rooms after load or assignment rebuild. `G.*Pending` tracks reservations that have not yet been placed.
- Target cap prevents large builder populations from opening unlimited pending construction edges at once. The simultaneous-construction-site cap is now **research-gated**: `calcBuilderTargetCap()` returns `min(1 + researchLevel('build_multitask'), workSlots, BUILDER_ASSIGNMENT_MAX_TARGETS=4)`. So with no research only **1** site is built at a time (no parallelism); the マルチタスク research (leveled max 3) raises it to 2→3→4. (Extra builders beyond the active sites stack onto a stackable target or idle.)
- Offline construction (research 鬼の居ぬ間も！/夜なべ建築): `runOfflineBuilding(sec)` is called at the end of `calcOffline()` when `hasResearchUnlock('offlineBuild')`. It steps the existing `updateBuilderLogic()` over `min(OFFLINE_BUILD_MAX_STEPS, offlineSec × eff / OFFLINE_BUILD_STEP_SEC)` iterations, where `eff = min(1.0, OFFLINE_BUILD_EFF_BASE(1/3) × getResearchBonus('offlineBuildSpeed'))`, advancing the dig band (with the realtime 2-second shift guard bypassed) between steps. Because it reuses the live builder logic, target cap / band fill / depth lock all apply, so offline building cannot runaway. `advanceDigEdge`/`maybeShiftBand` suppress toast/fx while `S._offlineBuilding`; a single summary toast reports the rooms built.
- Sticky target restore keeps unfinished previous builder targets reserved before new target selection, so ratio changes or early-game slot changes do not make builders abandon a partially dug edge mid-construction.
- Crew assist gives formally unassigned builder ants a small speed effect without changing `stackLimit` or `build_multitask`: `updateBuilderLogic()` shares extra builders across active dig targets and applies a saturated assist multiplier, capped at +150% (`BUILDER_CREW_ASSIST_MAX = 1.50`, half point = 7 extra builders/target). Normal rooms still accept only one formal slot, but more builders now make that one dig visibly faster.
- Duplicate-room prevention: `getDigTarget()` will not create a NEW room of `forcedType` while an unfinished (placed, `edgeFrac < 1`, underground) room of that same type already exists. Previously, because normal rooms have a stack limit of 1, a second/third work slot in the same `rebuildBuilderAssignments()` pass could not reserve the first new room and instead called `expandMap()`/`forceExpandRoom()` again, spawning 2-3 parallel rooms of the same type (the "multiple builders digging the same room" / multiple orange dashed tunnels bug). Now, if a same-type room is already under construction, `getDigTarget()` skips both the room expansion and the fallback shaft and returns `null` for that slot, so extra builders help other existing digs or idle instead of opening a duplicate. This limits concurrent under-construction rooms to 1 per non-shaft type; rooms of a type are built sequentially. Reserved special rooms (ferment/cookie/barracks) were already dedup-safe via their pending-count + "dig the unbuilt edge first" logic.
- Active construction highlights and partial unfinished tunnel drawing are also tied to `S.buildAssignments`, so stale visible-builder targets do not appear as extra parallel work.

Visible builder behavior loop:

- Choose a visible target from `S.buildAssignments`, falling back to `getDigTarget(G.bLv)` if needed
- Move to dig start, walking from the source room to the edge start instead of snapping from a room-center slot
- Dig at the frontier
- Carry soil out to the entrance
- Drop soil as presentation
- Return to the dig frontier

Visible builders prefer targets from `S.buildAssignments`. If render cap only leaves a few visible builders, they still act as representative animation for the logical construction work.

Tunnel ant rendering:

- Ant pathfinding and task positions stay on the edge centerline, but rendering applies a small per-ant lateral lane offset while an ant is visibly walking on an edge.
- The lane offset is visual-only and also applies to high-count `S.antCrowd` atlas rendering, preventing crowded tunnels from collapsing into one black/green line.
- `S.antCrowd` room movement is intentionally slow. When a crowd ant reaches a room from an edge, it keeps its arrival position and transitions into room movement from there instead of teleporting to a random slot.

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
- Wait/wander in room slots when idle so they do not visually stack into one ant.
- Idle nurse room wandering uses slower nursery-specific movement and longer target holds than worker room wandering.
- After placing eggs, feeding larvae, or moving larvae into a nursery, a nurse enters a short `nurse_tend` dwell in that nursery. This prevents immediate task reassignment from making a nurse look like it is darting around one room at high speed.
- If an idle nurse needs to wait in a nursery/queen room that is not its current node, it first walks there via completed tunnels (`go_room_wander`) and only then starts room-slot wandering. This keeps the visual room position and logical `a.node` aligned.
- When any action ant starts a tunnel path from a room slot, `move()` first eases the ant back to its current node center before entering the edge. This prevents slot-to-tunnel snaps when workers or nurses leave a room.
- Timed room-wander action actors are protected during representative actor trimming where possible, so ants do not pop out of rooms just because the visual actor cap is being rebalanced.

Egg and larva systems:

- Eggs are placed in the queen room by tap/manual egg laying and automatic laying.
- Nurses move eggs into nursery rooms.
- Eggs in queen room do not directly hatch.
- Egg and larva inventories are distributed across rooms rather than fixed to one room.
- Room inventory visuals keep runtime-only stable slot indices per room/item kind. Larvae, eggs, food, and cookie dots no longer redraw by simply packing from slot 0 each frame, so count changes do not make existing nursery contents jump to unrelated coordinates.
- Larvae require food before becoming adults.

Golden rearing priority (research 英才教育 / `goldenBrood`):

- `convertEggToLarvaInRooms` and `consumeLarvaeFromRooms` decide how much of each conversion is golden via `blendGoldenTake(take, haveGolden, haveTotal, p)` = `floor(prop + p×(full−prop))`, where `prop` = proportional (no priority) and `full` = `min(haveGolden, take)` (full golden-first). `p = getGoldenRearPriority()`.
- Base priority is `GOLDEN_REAR_BASE_PRIORITY = 1/3` (previously golden were always fully front-loaded; this is a deliberate baseline nerf so golden no longer monopolize conversion by default). These functions only change WHICH items convert, not the logical totals (`G.eggs/larvae` are decremented by the caller), so totals stay invariant.
- With 英才教育 (`goldenBrood`): `p = 1.0` (full priority) and rooms are processed golden-first globally; additionally `accelerateGoldenBrood(dt)` converts EXTRA golden eggs→larvae and larvae→adults at `GOLDEN_BROOD_ACCEL (0.5)` × the base brood rate (updating `G` totals before calling the conversion fns, so invariant-safe). Runs in live `update()` and once in `calcOffline`. Net effect: golden lineage advances faster → more golden adults / golden buffs.

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
- **B1 衛生の資源化** (two hygiene breakthroughs): `wasteRecycle` (`hygiene_recycle`) converts a fraction of each room's `invWaste` to food in the live waste-accumulation loop (`WASTE_RECYCLE_RATE 0.12`/s, food = waste × `WASTE_RECYCLE_FOOD 3`) and reduces the waste — so it doubles as cleaning and eases the larva-growth slowdown. `cleanBonus` (`hygiene_clean_bonus`) is a conditional global bonus: when the larva-room waste ratio is below `CLEAN_THRESHOLD (0.25)`, worker food production is ×`(1 + CLEAN_BONUS = 0.20)`, computed each tick into `S._cleanMul` and multiplied into `prodPerSec` (1-tick lag, default `|| 1`). Both apply in the live loop only (offline progression doesn't include them).

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
- Automatic egg laying does not create golden eggs by default. Exception: the Golden-branch research `golden_auto` (flag `goldenAutoLay`) makes queen auto-laying also roll golden eggs at `getGoldenFingerChance() × GOLDEN_AUTO_LAY_FACTOR (0.5)`, in both the live loop and offline progression.
- Golden eggs are tracked as a subset of normal eggs.
- Golden larvae are tracked as a subset of normal larvae.
- When a golden larva becomes an adult, it creates a golden worker/ant buff event.
- Golden egg and golden larva dots are drawn in rooms with gold coloring.

The legacy `G.major.golden2x` flag remains for save compatibility and UI grouping, but the actual progression is `goldenFingerLv`.

Golden-branch research effects (data-driven; see section 13 for the nodes):

- `goldenEggChance` (`golden_1`, `golden_shine_inf`): multiplies `getGoldenFingerChance()` (affects both tap and `goldenAutoLay`). Since the golden-finger base chance is 0 at Lv 0, the multiplier is a no-op until golden finger Lv 1 — which is also `golden_1`'s unlock condition.
- `goldenBuffPower` (`golden_blessing`, `golden_blessing_inf`): scales the active golden buff's strength in `getGlobalFoodMul()`/`getGlobalLayMul()` (`1 + (mul-1)×bonus`) and `getGlobalCookieAdd()` (`add×bonus`).
- `goldenAutoLay` (`golden_auto`): flag that enables auto-lay golden eggs (above). Auto-laid golden eggs are added to `G.goldenEggs` and the room `invGoldenEgg` via `addEggToQueenRoom(amount, golden)` (live) or reconciled by `normalizeInventories()` (offline).
- All three keys use the effUp-boosted `getResearchBonus` (beneficial production-style muls).

## 13. Research System

Research unlocks when the colony population (生体) reaches `200` living ants (`RESEARCH_UNLOCK_POP`, checked against `G.tot` in the live and offline loops). Changed from the old food-`10,000` gate (`RESEARCH_UNLOCK_FOOD` is kept but no longer gates the unlock). The lock note / overview "next" text / not-yet toast all read "生体が200匹…（あと N匹）". Developer mode — a 5 s long-press on the 描画設定 button (`#btn-render-settings-pub`) or `?dev=1` in the URL — also force-unlocks research (calls `unlockResearchSystem()`) alongside revealing `#dev-tools`, so the tab is openable without meeting the gate.

Research state lives in `G.research`.

### 13.0 Engine model (data-driven, leveled, repeatable)

The research system is the intended late-game engine, so effects are **data-driven** and nodes can be **repeatable / infinitely scaling** (fuel = cookie, with exponential cost). Design forks chosen: cookie fuel (exponential), one-time unlock nodes + infinite repeatable upgrades, effects = both multipliers and new-system unlocks, and (planned) prestige grants a meta currency.

- **Node schema** (`RESEARCH_NODE_DEFS`): besides `id, branch, name, desc, prereq, breakthrough, costCookie, costFood`, nodes may declare:
  - `max`: max level (`1`/omitted = one-time; `Infinity` or `repeatable:true` = infinite)
  - `costGrowth`: per-level cost multiplier for repeatables (e.g. `1.5`)
  - `effects: [...]`: data effects — `{kind:'mul', key, perLevel}` (additive into a multiplier accumulator), optional `{firstLevel}` for "old Lv1 effect + smaller repeat increments", or `{kind:'flag', flag}` (unlock).
- **Leveled state**: `G.research.unlockedNodes[id]` is now a **numeric level** (old boolean saves normalize to `1` in `ensureResearchState`). `researchLevel(id)` reads it; `hasResearchNode(id)` = level>0; `getResearchNodeMaxLevel(def)` resolves the cap.
- **Effect aggregation**: `recomputeResearchBonuses()` walks all nodes×levels into a cache (`_researchBonusCache = {muls, flags}`); read via `getResearchBonus(key)` (= `1 + Σ(effect add)`) and `hasResearchUnlock(flag)`. A mul effect normally adds `perLevel×level`; if `firstLevel` is present, Lv1 adds `firstLevel` and later levels add `perLevel` each. Cache is invalidated on purchase **and on save load** (`invalidateResearchBonuses()` from `buyResearchNode` / `buyMetaUpgrade` / `G.fromSave`) and lazily rebuilt. The load invalidation is required: without it, a cache built before the save was applied stuck empty (the cache only recomputes when null and load never nulled it), so `getResearchBonus` returned `×1.0` for **every** key after a reload — all owned research was silently inert until the next purchase. Existing multiplier helpers now read it: `getGatherResearchMul→getResearchBonus('gatherFood')`, `getBroodEggMul→'broodEgg'`, `getBroodLarvaMul→'broodLarva'`, `getWasteGenerationMul→'wasteGen'` (perLevel `-0.10`). Legacy 16 nodes were migrated to `effects` data with identical numbers, so behavior is unchanged.
- **Cost & purchase**: `getResearchNodeCost(def, level)` = `floor(costCookie × RESEARCH_GLOBAL_COST_MUL(8) × costGrowth^level)` (food likewise; one-time = base). It also applies an optional meta discount `getResearchCostMul()` if defined (prestige phase). Meta insight upgrade costs use the same global x8 multiplier. `buyResearchNode()` increments the level (not boolean), deducts the level-scaled cost, invalidates the bonus cache, and runs one-time-only side effects (queen whispers / `G.major.*` compat) only on the 0→1 step.
- **Status**: `getResearchStatus` returns `done` (one-time owned), `maxed` (finite repeatable at cap), `ready`, or `locked`. UI marks: `✓` done, `★` maxed.
- **Repeatable content so far**: `gather_inf` (gatherFood +5%/Lv), `brood_egg_inf` (broodEgg +4%/Lv), `brood_larva_inf` (broodLarva +3%/Lv) at `costGrowth:1.5`; `poison_conc` (poisonDmg +15%/Lv, `1.6`); `oshiai` (blockRadius +50% first Lv, then +20%/Lv, `1.6`); `numbers_win` (soldier cost/power tradeoff, first Lv old effect then smaller increments, `1.6`); `golden_shine_inf` (goldenEggChance +15%/Lv, `1.5`); `golden_blessing_inf` (goldenBuffPower +20%/Lv, `1.6`). All `max:Infinity`. More keys/branches and new-system unlock flags are added incrementally.
- **Milestone rewards (A2, 節目報酬)**: repeatable nodes get chunky payoffs at level thresholds so the infinite grind has goals. A central table `RESEARCH_MILESTONES` (node id → `[{lv, mul:{key,add}, flag?, label}]`, read via `getNodeMilestones(def)`; inline `def.milestones` also works) keeps node defs clean. `recomputeResearchBonuses` applies every milestone with `lv ≤ nodeLevel` **on top of** the per-level accumulation (same `muls[key] += add`, so effUp applies). Currently 8 core infinite nodes (gather / brood×2 / queen×2 / room / golden×2) have Lv10/25/50 boosts to their own key. `buyResearchNode` toasts `✨ 節目 LvN` when a purchase crosses a threshold; the tree tooltip and classic card show `getResearchMilestoneText(def)` (`★節目 done/total｜次 LvN: label（あと◯）`), and a fully-mastered node gets the `is-mastered` class (golden "極" glow on the dot + level badge). The `flag` reward type is wired but unused — reserved for qualitative milestones (small automation / conditional effects / hidden-node reveal) added later via the same engine.
- **Tree UI**: nodes show a `Lv N` badge (repeatables), the **next-level** cost as footer (`formatResearchCost` uses the current level), and `済`/`上限` for done/maxed.

### 13.0b Prestige meta currency "知見 (insight)" — second loop

Prestige (転生) now grants a permanent meta currency **insight** that funds a meta layer persisting across resets — the two-loop engine.

- **Permanent store**: a separate `localStorage` key `RESEARCH_META_KEY = 'antResearchMeta'` holds `{ insight, meta:{ costDown, effUp } }`. It is independent of the colony save (`SAVE_KEY`), so it survives both normal reloads and prestige resets. `loadResearchMeta()` restores it into `G.insight` / `G.researchMeta` at startup (called just before `applyPrestigeBonus()`); `saveResearchMeta()` writes it on every meta purchase; `addInsightPermanent()` does a read-modify-write straight to the store right before a prestige reset.
- **Earning**: on prestige, `computePrestigeInsight()` = `floor(sqrt(totalResearchLevels) + sqrt(G.tot/40))` (min 1). The prestige button adds it via `addInsightPermanent()` and passes `insightGain` through the existing `antPrestige` handoff so `applyPrestigeBonus()` can toast it after reload.
- **Meta upgrades** (`RESEARCH_META_DEFS`, bought with insight, exponential insight cost `getMetaCost`):
  - `costDown` (max 20): research cost `-3%/Lv` (floored at `-60%`) via `getResearchCostMul()`, which `getResearchNodeCost()` multiplies in.
  - `effUp` (infinite): research multiplier effects `+5%/Lv` via `getResearchEffMul()`, applied in `getResearchBonus(key)` = `1 + Σ(perLevel×level) × getResearchEffMul()`. Default 0 → ×1, so it is behavior-neutral until purchased.
- **UI**: a `#research-meta` panel (purple theme) sits above the research lock note (so it shows even before research is re-unlocked after a prestige). It shows the insight balance + per-upgrade rows with level and next insight cost (`renderResearchMeta`), is shown only once `prestigeCount>0` / `insight>0` / any meta level exists, and buys via `data-meta-buy` → `buyMetaUpgrade()`.

Not yet implemented (planned phases): new-system unlock nodes (auto-gather, auto-research, etc.) and their runtime, and large-tree UI scaling (era grouping / modal zoom).

Research UI:

- The Research tab shows overview cards for total progress, currently affordable research, and next candidate.
- The Research tab has two view modes, switchable via a toggle (`#research-view-toggle`, buttons `data-research-view="tree|classic"`). The choice is held in `S.researchView` and persisted to `localStorage` under `RESEARCH_VIEW_KEY = 'ant_research_view_v1'`. Default is `tree`. Both views render into the same `#research-branch-list` container, so the existing `data-research-buy` click delegation (and `buyResearchNode`'s own guards) work in either mode.
  - `tree` (default, new): a branch-lane skill-tree with an earthy/cave theme. `renderResearchTree()` + `computeResearchTreeLayout()` lay each branch out as a horizontal lane; nodes are placed in columns by `getResearchNodeDepth()` (prereq depth) and stacked into subrows when a depth has several nodes. Nodes are circular "chambers" (`.rtree-node`, branch accent rim, icon + name + cost + status mark) and same-branch prereqs are drawn as curved SVG "tunnel" connectors (`.rtree-link`, dim when locked, amber when the prereq is open, glowing when the node is done). States: `is-done` / `is-ready` (amber pulse) / `is-wait` (ready but unaffordable) / `is-locked`, plus `is-breakthrough` (double rim). The tree is horizontally scrollable (`.rtree-scroll`, on desktop `touch-action: pan-x` + `overscroll-behavior-x: contain` so vertical drags delegate to the `#control-panel` `pan-y` scroller). On mobile (`@media (max-width: 520px)`) that delegation was unreliable and vertical scrolling stalled over the tree (classic view, which has no nested scroller, was fine), so `.rtree-scroll` is overridden to a **self-contained 2D scroll box**: `overflow: auto`, `touch-action: pan-x pan-y`, `overscroll-behavior: contain`, `max-height: 46vh` — the tree owns both axes itself (no delegation), mirroring the expand modal's `.rtree-modal-body`. The rebuild scroll-preserve restores both `scrollLeft` and `scrollTop` of `.rtree-scroll` (on mobile it is the vertical scroller too; on desktop `scrollTop` is always 0). Because `touch-action` does not affect the mouse wheel, a `wheel` listener on `#control-panel` redirects vertical-wheel events that occur over `.rtree-scroll` to the nearest scrollable-Y ancestor (manually adjusting `scrollTop`), so wheel scrolling no longer stalls when the cursor is over the tree; horizontal-wheel intent is left to the tree. Scroll-vs-rebuild guard: because `updateResearchUI()` rebuilds the tree/overview/meta innerHTML whenever their HTML changes (affordability flips constantly; the tree re-renders many times/sec), mutating the scrolled subtree during an inertial (post-flick) scroll would kill the momentum on mobile ("scroll stops partway"). To prevent this, `S._researchInteracting` is armed not only on `pointerdown` (1.5 s safety) but also on every `scroll` event — a capture-phase `scroll` listener on `#control-panel` (which also catches the nested `.rtree-scroll`) and on `.rtree-modal-body` re-arms it for 450 ms; `pointerup`/`pointercancel` arm a 350 ms delay to bridge into momentum. While `S._researchInteracting` is true, all four innerHTML rebuilds in `updateResearchUI` (branch list, overview, meta, modal body) are skipped, so scrolling/momentum is never interrupted; rebuilds resume ~0.45 s after scrolling settles. Additionally, when the branch-list IS rebuilt, the tree's **horizontal** scroll position is preserved: `renderResearchTree` recreates the `.rtree-scroll` element (a fresh element starts at `scrollLeft = 0`), so `updateResearchUI` captures the old `.rtree-scroll.scrollLeft` before the swap and restores it onto the new one. (Vertical `#control-panel.scrollTop` is already preserved because `#control-panel` itself is not recreated.) Without this, every rebuild snapped the tree back to the left mid-scroll. Node descriptions/reasons plus an **effect delta preview** (`getResearchEffectPreviewText`) are shown via the button `title` tooltip; the same preview also renders inline on classic cards (`.research-node-effect`). The preview shows the affected stat's **current total → next-level total** (e.g. `採集効率 +13%→+19%`), computed from the effect data using the exact rules the game consumes (`firstLevel` only on the 0→1 step; `getResearchBonus` for effUp keys vs `getResearchBonusRaw` for trade-off keys `soldierCost`/`soldierPower`/`blockRadius`). Integer keys (`tapEggBonus`/`buildParallel`) show `1→2個`, flags show `解放`/`解放済`, owned/maxed shows `(最大)`; unknown keys are skipped so a misleading number is never shown. The core tree HTML is built by `buildResearchTreeInner(rs, columns)` (returns `{inner, width, height}`; `columns` defaults to 1 for the in-panel mini tree, while the expand modal passes a higher count — see below) and shared by the panel and the expand modal.
  - Expand modal (tree view only): a `⛶` button (`data-research-expand`) in the toggle bar opens `#modal-research-tree`, a large `.modal-overlay` (`94vw`, `max-width 1700px`, × `90vh`) that re-renders the same tree via `renderResearchTreeModal()`. Because the tree is tall and narrow, fitting a single column to both axes shrank it to the scale floor with huge horizontal margins (tiny/unreadable on a wide screen). Instead the modal **reflows the branch lanes into multiple columns** to use the width: `computeResearchTreeLayout(columns)` packs lanes greedily into N columns (each lane drops into the currently-shortest column, balancing column heights), and `renderResearchTreeModal` tries `columns = 1 … min(6, branchCount)`, computes the fit scale (`min(width-fit, height-fit)`, clamped `0.6–1.7×`) for each, and picks the column count that **maximizes the scale** (ties favor fewer columns / less whitespace). The winning layout is scaled with a CSS `transform: scale()` inside a `.rtree-modal-stage` sized to the scaled extent for correct two-axis scrolling. On a ~1600px screen this lands on **3 columns at ~0.88×** with the whole tree (all 9 branches / 40 nodes) visible and no scrolling; phones naturally fall back to 1 column (vertical scroll, as before). Each lane band carries an explicit `left`/`width` (overriding the CSS `left:0;right:0`) so columns are positioned; the single SVG link layer spans the full multi-column extent. While open (`S.researchTreeModalOpen`), `updateResearchUI()` keeps the modal body live; it closes on the close button, overlay click, `Escape`, or switching to classic, and re-fits on window resize. Buying delegates from the modal body the same way as the panel. The in-panel mini tree is kept unchanged.
  - `classic` (preserved fallback): the original vertical list. Each branch renders as a lane with icon, accent color, branch description, progress bar, and ready/done counts. Nodes render as cards with status marks, breakthrough tags, prerequisite tags, condition tags, cost, node id, and action state. Same-branch prerequisites are visualized with indentation and connector lines.
- All layout is derived at runtime from `RESEARCH_NODE_DEFS` (branch + `prereq`); nodes have no stored coordinates.

Current branches:

- Gather
- Brood
- Hygiene
- Ferment
- Geology
- Defense
- Golden (黄金枝, 👑, accent `#fbbf24`; default-unlocked; strengthens the golden finger / golden egg / golden buff lineage)
- Queen (女王枝, 👸, accent `#d946ef`; default-unlocked; egg-laying spine — auto-lay speed + per-tap egg count — plus colony-mother boosts (population cap, worker foraging) and a "majesty" season-resilience special)
- Expedition

Current implemented nodes:

- `gather_1`: Gather efficiency I
- `gather_2`: Gather efficiency II
- `brood_1`: Brood efficiency I
- `brood_2`: Larva feeding improvement
- `hygiene_1`: Hygiene basics
- `hygiene_2`: Cleaning efficiency I
- `hygiene_3`: `お掃除はおまかせ` / requires waste room unlock; improves cleaning and lets some workers help with waste cleanup
- `hygiene_clean_bonus`: 清潔なコロニー (hygiene; breakthrough; flag `cleanBonus`; conditional +20% worker food when the nest is clean — see B1 above)
- `hygiene_recycle`: 廃棄物リサイクル (hygiene; breakthrough; flag `wasteRecycle`; converts room waste into food while cleaning it — see B1 above)
- `ferment_unlock`: Ferment room unlock
- `ferment_1`: Ferment speed I
- `ferment_2`: Sweet concentration
- `ferment_3`: Ingredient saving
- `ferment_surplus`: 余り物の甘味 (ferment; breakthrough; flag `surplusCookie`; **cross-branch 採集×発酵** — when food production overflows the cap, the surplus becomes cookies (`× SURPLUS_COOKIE_RATE 0.02`, banked in `S._surplusAcc`) instead of being wasted)
- `ferment_worker_unlock`: Fermenter ant unlock
- `cookie_find_2x`: Sweet scouting / cookie appearance x2 passive
- `ferment_mature`: 熟成 (ferment; breakthrough; flag `cookieMature`; held cookies earn √-based passive interest — see B2 below)
- `ferment_offline`: 自動発酵 (ferment; breakthrough; flag `fermentOffline`; ferment rooms keep producing cookies offline — see B2 below)
- `geo_depth_2`: Depth II unlock
- `geo_depth_3`: Depth III unlock
- `geo_depth_4`: Depth IV unlock (breakthrough; prereq `geo_depth_3` + builder Lv 6; cost `MAJOR_DEPTH4_COST = 90`🍪). Lets `G.getDepthUnlocked()` reach 4 so the dig band can shift one layer deeper. No `G.major.depth4` legacy flag.
- `soldier_jaw_2x`: Jaw strengthening / soldier attack x2 passive
- `raid_spoils`: 戦果 (defense; infinite; `raidSpoils` +30%/Lv — multiplies raid-victory `rewardFood`/`rewardCookie`, turning successful defense into an income source)
- `early_warning`: 早期警戒 (defense; breakthrough; flag `earlyWarning` — reduces raid worker casualties by `EARLY_WARNING_REDUCE (40%)`; `out.loseWorkers` is cut before display/apply)
- `golden_1`: 黄金の輝きI (golden branch root; condition = golden finger Lv 1; `mul goldenEggChance +0.5`)
- `golden_shine_inf`: 黄金の輝き (infinite; goldenEggChance `+0.15`/Lv)
- `golden_blessing`: 黄金の祝福 (`mul goldenBuffPower +0.5`)
- `golden_blessing_inf`: 豊穣の祝福 (infinite; goldenBuffPower `+0.20`/Lv)
- `golden_auto`: 黄金の自動産卵 (breakthrough; `flag goldenAutoLay` — auto-laying also produces golden eggs)
- `golden_queen_synergy`: 黄金の女王 (golden; breakthrough; flag `queenGolden`; **cross-branch 女王×黄金** — golden-egg chance ×`1 + (layMul−1)×QUEEN_GOLDEN_SCALE(0.5)`, so queen-branch investment raises the golden rate at runtime)
- `queen_vitality`: 女王の活力 (queen branch root; `mul layMul +0.25` — auto-lay speed ×1.25)
- `queen_fertile`: 多産の系譜 (infinite; layMul `+0.06`/Lv)
- `queen_double_lay`: 重ね産み (leveled, max 3; `mul tapEggBonus +1`/Lv — +1 egg per manual tap per level)
- `queen_embrace`: 女王の包容力 (infinite; popCap `+0.08`/Lv — raises population cap)
- `queen_majesty`: 女王の威厳 (breakthrough; `flag queenAllSeasonLay` — seasonal auto-lay penalty floored at ×1)
- `queen_pheromone`: 女王フェロモン (breakthrough; `mul gatherFood +0.20` — reuses the gather key to boost worker foraging)
- `build_multitask`: マルチタスク (geology; leveled max 3; simultaneous construction sites = `1 + level`, i.e. base 1 → 2/3/4. Read directly via `researchLevel`, gates `calcBuilderTargetCap`)
- `offline_build`: 鬼の居ぬ間も！ (geology; breakthrough; `flag offlineBuild` — builders progress construction while the game is closed)
- `offline_build_speed`: 夜なべ建築 (geology; infinite; `offlineBuildSpeed` +20%/Lv — raises offline build efficiency, capped at online rate)
- `room_expand`: 増築 (geology; infinite; `roomCapacity` +5%/Lv — scales built food/nursery room capacity)
- `dig_speed`: 掘削促進 (geology; infinite; `digSpeed` +25%/Lv — multiplies the builder-logic accumulator `target.acc`, so digging/building is faster; applies offline too since `updateBuilderLogic` is shared)
- `mineral_vein`: 鉱脈 (geology; breakthrough; flag `mineralVein` — passive cookie trickle `G.getDepthUnlocked() × MINERAL_RATE (0.3)/s`, banked through `S._mineralAcc`; rewards deep nests)
- `golden_brood`: 英才教育 (brood; breakthrough; `flag goldenBrood` — full global golden-rearing priority + acceleration; also see section 11)

`military_barracks_blueprint` was removed from the research tree (the barracks blueprint is now a Rooms tab dock purchase). Its constant and `G.major.barracks` compatibility plumbing are kept, so old saves that researched it stay valid. The defense branch now contains only `soldier_jaw_2x`.

Expedition branch exists but its nodes are not implemented yet.

Queen-branch research effects (data-driven; default-unlocked branch):

- `layMul` (`queen_vitality`, `queen_fertile`): multiplies the auto-lay rate in both the live loop and offline progression (`layRate *= getResearchBonus('layMul')`), alongside the existing global/season lay multipliers.
- `tapEggBonus` (`queen_double_lay`): `getTapEggCount()` = `1 + floor(Σ tapEggBonus)` (raw accumulator, no effUp since eggs are integer). `tryLayEgg` lays that many eggs per manual tap, rolls a golden egg per egg, shows a `+n` float, and a "黄金の卵がN個産まれた！" toast when more than one golden lands.
- `popCap` (`queen_embrace`): multiplies `this.caps.pop` after the rest-room bonus, raising the population cap.
- `queenAllSeasonLay` (`queen_majesty`): flag; `getSeasonLayMul()` returns `max(1, seasonLayMul)`, so autumn/winter no longer slow auto-laying below ×1.
- `gatherFood` (`queen_pheromone`): reuses the Gather-branch key, stacking additively into worker foraging via the same `getResearchBonus('gatherFood')` path.

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
- `geo_depth_4` is the official unlock for Depth IV and depends on `geo_depth_3` (added 2026-06-08; research-only, no `G.major.depth4` legacy flag).
- `military_barracks_blueprint` is the official unlock for the barracks blueprint.
- Old save flags `G.major.depth2`, `G.major.depth3`, and `G.major.barracks` are still read. If present, `ensureResearchState()` marks the corresponding research nodes as unlocked.
- New research purchases also keep the old flags true so builder targeting, depth checks, and older compatibility paths keep working.
- Effect helpers:
  - `hasDepth2Unlock()` controls Depth II availability and depth display.
  - `hasDepth3Unlock()` controls Depth III availability and depth display.
  - `hasDepth4Unlock()` (= `hasDepth3Unlock() && hasResearchNode(GEO_DEPTH_4_NODE)`) controls Depth IV; `G.getDepthUnlocked()` returns `1 + d2 + d3 + d4` (max 4) so the dig band (`maybeShiftBand` / `requiredDepthForBand`) can descend one layer further.
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
- **B2 熟成** (`ferment_mature`, flag `cookieMature`): held cookies earn passive interest `+√(G.cookie) × COOKIE_MATURE_RATE (0.25)/s` — sub-linear, so it rewards banking but never runs away. `addCookie` floors, so the live loop banks the fraction in `S._cookieMatureAcc`; also applied in `calcOffline` (`× OFFLINE_EFF × sec`).
- **B2 自動発酵** (`ferment_offline`, flag `fermentOffline`): `calcOffline` runs fermenting analytically — `cycles = rooms × floor(sec × OFFLINE_EFF × speedMul / timeSec)`, clamped by `floor(G.food / foodCost)`, then deducts food and `addCookie(cycles × (1 + cookieBonusChance))` (no `fx`/`toast`, offline-safe).

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
- If a cookie room has already been placed but is still hidden, builder AI detects it from all room nodes and resumes it with reserved priority.
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
- If a barracks room has already been placed but is still hidden, builder AI detects it from all room nodes and resumes it with reserved priority. This recovery path is gated by the barracks blueprint.
- Builder AI prioritizes first barracks construction after the blueprint is first purchased.

Soldiers:

- Defend entrance during raids.
- Return to barracks or guard normally after raid.
- Contribute to raid resolution.

Invaders:

- Underground invaders can target food rooms and nursery rooms.
- Underground invaders only spawn once `S.band.index >= INVADER_MIN_DEPTH (3)` (and `visRooms >= 3`). The dig band reaches index 3 only at Depth IV (II→idx1, III→idx2, IV→idx3), so underground invaders effectively begin at Depth IV. Before the Depth IV node existed, `band.index` capped at 2 and this spawn path was unreachable.
- **モグラ (v3 underground boss #3)**: a rare boss-tier invader (real ecology: moles are subterranean predators of ants/brood). Stored in `S.invaders` with `isBoss:true` (so it inherits the pests' soldier-pathing + tap targeting), gated by `MOLE_MIN_ROOMS 6` / `MOLE_MIN_DEPTH 4` / `MOLE_MIN_WINS 1` on a `S.moleTimer` (`MOLE_SPAWN_MIN 240`–`480`s, `MOLE_CHANCE 0.6`), one at a time. `spawnMole()` erupts from the deepest visible nursery/food room; `hp = MOLE_HP_BASE 48 + soldiers × MOLE_HP_PER_SOLDIER 2.2` (scales with the army → ~flat kill-time). **Combat (soldiers + tap)**: soldiers reuse `hunt_invader` to reach it then switch to a new `engage_mole` task (cluster on it; idle soldiers prefer it 50%); damage is applied centrally in `updateMoleInvader` by counting soldiers within `dp(MOLE_ENGAGE_RADIUS 72)` × `MOLE_SOLDIER_DPS 1.6 × dt`; taps do `MOLE_TAP_DMG 3` (`hitInvader` `isBoss` branch). **Threat** (`moleEat`, every `MOLE_DMG_INTERVAL 2.4`s): eats `MOLE_EAT_ANTS 3` workers + `MOLE_EAT_EGGS 5` eggs + `MOLE_EAT_LARVAE 1` larva (+room food). **Resolve** (`updateMoleInvader` → splice): driven off (hp≤0) → `+MOLE_REWARD_FOOD 260`/`+MOLE_REWARD_COOKIE 22` + whisper; timeout (`lifeT ≥ MOLE_DURATION 28`s) → a `MOLE_ESCAPE_EAT_MUL 3`× final chomp + `normalizeInventories()` (recoverable loss). Drawn by `drawMoleInvader` (side-profile mole: fur body, pink snout, scratching digging claws, soil mound, danger aura, world-space boss HP bar + yellow time-left gauge). Runtime-only (`S.invaders` not serialized). Debug: dev-mode `🦫モグラ` button + `window.__forceMole()`. Tunables: `MOLE_*`. Next v3: 梅雨の浸水 (flood disaster).
- Surface raid system uses `S.raidVis` and `resolveRaid()`.
- Raid phases are warning/countdown -> attack -> result.

Raid overhaul (enemy variety / rally / soldier mortality):
- **Enemy kinds** (`RAID_ENEMY_KINDS`): worker / scout (fast, frail, small) / brute (slow, tanky, big) — rival-colony castes. `pickRaidEnemyKind()` is weighted; brute share scales with `G.raidWins` (+3/win, cap +40). `spawnEnemies` applies `spdMul`/`hpMul` and stores `kind`/`sizeMul`/`tint`; the enemy draw applies `ctx.scale(sizeMul)` + body `tint`.
- **応援フェロモン (rally)**: tapping during the attack phase (`tryLayEgg` → `addRaidRally`) extends `S.rallyT` (`+RAID_RALLY_PER_TAP 0.5`/tap, cap `RAID_RALLY_MAX 6`); `getRaidSurfaceSoldierDamage()` ×`(1+RAID_RALLY_BONUS 0.6)` while `S.rallyT>0`. Reset in `beginRaidAttack`, decays in the main loop.
- **Soldier HP bars**: `drawRaidSoldierHpBar(ctx, s)` (mirror of the enemy bar; blue, turns amber at low HP, shown only when wounded to avoid clutter) is drawn per soldier in `drawRaidSoldiers` (world coords). The LOD crowd path for huge armies keeps no individual bars.
- **Soldier mortality / stall (balance pass)**: surface soldiers have HP (`getRaidSurfaceSoldierHp` = `RAID_SOLDIER_BASE_HP 20` × lvMul × `weight`); engaging enemies deal `enemy.atk`/s (= `RAID_ENEMY_ATK_BASE 1.0` × kind atk: worker 1.0 / scout 0.6 / brute 2.4), a fallen soldier fades and its `weight` adds to `S.raidVis.casualtyWeight`, which reduces `G.ants.soldier` at resolve. Enemy kinds gained `atk` + `pushThrough`; stall weakened (`RAID_ENEMY_ENGAGED_SLOW_PER 0.94→0.6`, `MIN_FACTOR 0.01→0.12`) and `pushThrough` lets brutes bull through — so under-defended raids breach and even wins cost troops (no more free auto-win). Tunable via those constants. **(v2.1: attrition raised ~1.5× for tenser fights — HP 24→20, atk base 0.8→1.0.)**
- **波状攻撃 (v2 intra-raid waves)**: a single raid can arrive in multiple waves. `getRaidWaveCount()` = 1 (raidWins ≤1) / 2 (≥2) / 3 (≥6); `RAID_WAVE_SCALES` {1:[1.0], 2:[0.7,0.9], 3:[0.5,0.7,1.0]} sizes each wave as a fraction of `enemyPower` (final wave = full-size "main force"). `spawnEnemies({scale, extraBrute, append})` is now parameterized: wave 0 resets `S.enemies`, later waves **append** (so killed/breached tallies stay cumulative; `S.raidVis.totalEnemies` accumulates). When the field clears (`getLivingRaidEnemyCount()<=0`) the attack tick checks `S.raidVis.waveIndex` vs `waveCount`: if more remain it starts a `RAID_WAVE_LULL_SEC 2.6`s lull then `beginNextRaidWave()` (instead of `finishDelay`→`resolveRaid`); the final wave resolves as before. **Survivors carry over, dead stay dead** → attrition compounds across waves; a modest between-wave heal (`RAID_WAVE_REGROUP_HEAL 0.35` of maxHp to living soldiers) prevents an automatic death-spiral. Later waves are more brute-heavy (`extraBrute = idx × RAID_WAVE_BRUTE_STEP 14`). All tunable; needs device balance.
- Result modal shows the enemy-kind tally + 戦死 count + rally note + 波 count. (The post-defeat recovery buff was removed by request — defeat is just the loss now.) Cadence/interval stays owned by `getNextRaidIntervalSec` / `RAID_INTERVAL_*` (Codex's pacing).
- **サムライアリの奴隷狩り (v3 seasonal boss #1)**: a summer-only special raid (real ecology: Polyergus slave-makers steal host brood). `decideRaidBossType()` (called at `beginRaidAttack`, stored as `S.raidVis.bossType`) returns `'samurai'` when `getCurrentSeason().id==='summer'` && `G.raidWins ≥ RAID_SAMURAI_MIN_WINS 2` && `Math.random() < RAID_SAMURAI_CHANCE 0.35` (or when forced). It reuses the entire v1/v2 wave+combat pipeline; `spawnEnemies` swaps the whole enemy roster to `RAID_SAMURAI_KIND` (elite: spd 1.3 / hp 1.6 / atk 2.0 / pushThrough 0.4 / crimson, drawn with curved sickle mandibles). **Signature mechanic — brood theft**: at resolve, eggs stolen = `floor(G.eggs × clamp(breachRatio × RAID_SAMURAI_STEAL_MUL 1.1, 0, RAID_SAMURAI_STEAL_CAP 0.6))`, where `breachRatio = breachedEnemies/totalEnemies`. So you can win the battle and still lose brood; a 0-breach defense loses nothing. `out.eggMul` is forced to 1 for samurai raids so theft is the *only* egg loss (no double penalty). A win grants a cookie bonus (15–25) + queen whisper. Distinct intro/result text + `🥚 卵 -N` fx on each samurai breach. The result modal disambiguates outcomes: loss title is `卵を奪われた…` only when `eggsStolen>0` (else `突破された（卵の被害なし）`); the egg line separates a real defense (win/0-breach → `卵を完全に守り切った！`) from a breach that stole 0 because the colony held 0 eggs (`卵の被害なし（卵0個）`); the 戦死 line always shows (`-N` or `なし`). All runtime-only (`S.raidVis.bossType`/`eggsStolen`, `S._forceRaidKind`) — no save migration. Debug: `window.__forceRaid('samurai')`. Tunables: `RAID_SAMURAI_*`.
- **クモの大型ボス (v3 seasonal boss #2)**: a rare, any-season **single-boss** raid (real ecology: spiders are major surface predators of foraging ants). `decideRaidBossType()` returns `'spider'` first (before the samurai check) when `G.raidWins ≥ RAID_SPIDER_MIN_WINS 3` && `rand < RAID_SPIDER_CHANCE 0.12`. `beginRaidAttack` forces `waveCount=1`; `spawnEnemies` short-circuits to `spawnSpiderBoss()` — **one** enemy (`RAID_SPIDER_KIND`: spd 0.7 / **size 5.5** / pushThrough 0.45 / low continuous atk 0.35 / warm brown `#6b5038`, `isBoss:true`) with `hp = perEnemyHp × nBudget × RAID_SPIDER_HP_MUL 1.6` (≈1.6× a normal raid's total HP in one body, still army-scaled via `getRaidEnemyBaseHp`). Drawn as a **~3× side-profile wolf spider** (`drawRaidSpiderBody`: chevron-banded abdomen, cephalothorax, eyes/fangs/pedipalps, and 8 two-layer legs with arched knees + joint bands; gait via `sin(en.t*6+phase)`). The spider branch uses a **horizontal flip** (`scale(±sm,sm)`) instead of the generic `rotate(dir)`, so the asymmetric profile keeps its legs pointing down at both facings. Boss-scale HP bar widened/raised for the spider (`drawRaidEnemyHpBar`: w `dp(80)`, y `dp(94)`). Win/lose reuses the standard single-enemy logic (kill = all_killed win; breach = loss). **Signature mechanic — lunge bite** (`tickSpiderLunge`, called per-frame for the living spider in the attack tick): every `RAID_SPIDER_LUNGE_CD 3.5`s it bites up to `RAID_SPIDER_LUNGE_MAX_HITS 4` soldiers within `dp(RAID_SPIDER_LUNGE_RADIUS 34)` for `RAID_SPIDER_LUNGE_DMG 14` each (→ casualties via `casualtyWeight`), with `ガブッ!` fx + shake + a red `lungeFlash` pulse. Low continuous atk keeps the swarm alive between lunges; the burst is the threat. Win = big reward (food +50% of base, cookies +30–50) + whisper; loss = heavy worker loss flavored as the spider rampaging. Distinct intro/result text + titles. Runtime-only; debug `window.__forceRaid('spider')`. Tunables: `RAID_SPIDER_*`. Next v3 bosses: モグラ (underground), 梅雨の浸水 (flood disaster).

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
- 毒顎 (research): if `hasResearchUnlock('poisonJaw')`, the end of `updateRaidSoldiers()` applies a continuous DoT to every living enemy with `engagedBy>0` — `RAID_POISON_BASE_PCT(0.02) × getResearchBonus('poisonDmg') × maxHp × dt` per frame via `damageRaidEnemy` (plus an occasional purple ☠ `fx`, `#c084fc`). The `poisonDmg` mul key is fed by the infinite `poison_conc` research node, so poison strength scales with research. This is the first "new behavior" research (vs pure multipliers): a flag-gated runtime hook + a repeatable scaling key.
- おしあいへしあい (research `oshiai`, `mul 'blockRadius' +0.5`): `refreshRaidEnemyEngagement` engages an enemy within `RAID_SURFACE_SOLDIER_BLOCK_RADIUS × getResearchBonusRaw('blockRadius')`, so a wider hold radius marks more enemies as engaged (more get slowed/poisoned, fewer breach).
- 数は何にも勝る (research `numbers_win`, `mul 'soldierCost' -0.40` + `mul 'soldierPower' -0.20`): soldier hire cost (`G.getCost('soldier')`) ×0.60 and per-soldier power (`getSoldierPowerMul`, used by both `getColonyCombatPower` and `getRaidSurfaceSoldierDamage`) ×0.80 — quantity-over-quality.
- These fixed tradeoff effects use `getResearchBonusRaw(key)` = `1 + Σ(perLevel×level)` WITHOUT the effUp meta multiplier (so the prestige "知識の結晶" can't amplify a −40%/−20% into a broken value); production muls keep using effUp-boosted `getResearchBonus`.

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
- Engagement slowdown (standoff): `updateRaidSoldiers()` runs before enemy movement during the attack phase, so the current frame's `engagedBy` count immediately affects enemy movement. After soldier movement and separation, `refreshRaidEnemyEngagement()` recomputes `engagedBy` from physical proximity: each soldier contributes one body-blocking count to every living enemy within `RAID_SURFACE_SOLDIER_BLOCK_RADIUS` (36px), even if those enemies are not the soldier's locked target. Enemy forward advance is slowed with `holdFactor = max(RAID_ENEMY_ENGAGED_MIN_FACTOR 0.01, 1 - engagedBy * RAID_ENEMY_ENGAGED_SLOW_PER 0.94)`. One nearby soldier slows the enemy to a crawl; two or more pin it at the minimum crawl speed. Enemies outside the blocking radius still advance at full speed.
- Enemy breach: when an enemy gets close enough to the entrance it is marked `breached` once and counted; breached enemies sink in and fade, and are excluded from combat.
- The attack phase has no time limit. It runs until all enemies have been resolved (`living count <= 0`), so one side breaching early does not end the raid while enemies on the other side are still fighting. Once all enemies are killed or breached, it waits `RAID_FINISH_DELAY` (0.6 s) before resolving.
- Outcome: `computeRaidOutcomeFromSurfaceCombat()` returns `null` while any enemy is still alive. After all enemies are resolved, it returns win if all enemies were killed, loss if breached enemies reached `getRaidBreachLoseThreshold(total)` (= `ceil(total * RAID_BREACH_LOSE_RATIO 0.30)`, min 1), otherwise a minor-breach win. It is converted to the existing out format by `buildRaidOutcomeFromSurfaceResult()` (food/cookie reward on win with a small all-killed bonus; worker loss and food/egg multipliers scaled by breach ratio on loss), so `resolveRaid()` applies rewards/damage exactly once via its existing path.
- The result modal shows a surface-combat breakdown (撃破 / 突破 / 残存 / 判定 reason).
- Counters live on `S.raidVis` (`totalEnemies`, `killedEnemies`, `breachedEnemies`, `finishDelay`). Debug: `window.__debugRaidCombat()`.

NOT implemented: soldier death, per-soldier HP, enemy attacks against soldiers, extra enemy types, defense lines / formations / traps, boss fights, and a full reward-balance redesign.

Debug raid trigger (test only, not exposed in normal UI):

- `debugForceRaid(kind)` starts a raid with a 10s warning when `state==='none'` and at least one soldier exists (the update loop cancels raids without soldiers). `kind` ∈ `'normal'|'samurai'|'spider'` sets `S._forceRaidKind`, consumed once by `decideRaidBossType()`.
- Triggers: key `R` (desktop), long-press (~0.9s) on the population HUD box `#pop-box` (mobile), `window.__forceRaid(kind)` (console), or the **dev-mode raid row** `#dev-raid-tools` (🐜通常 / ⚔️奴隷狩り / 🕷️クモ buttons).
- **Dev mode** (long-press 描画設定 5s, or `?dev=1`) → `_activateDevMode()`: reveals `#dev-tools` + the boss-trigger row `#dev-raid-tools` (🐜通常 / ⚔️奴隷狩り / 🕷️クモ / 🦫モグラ buttons), unlocks research, sets `S._devMode`. While `S._devMode`, `render()` draws a live FPS readout (rolling `S.perf.fps`) top-right in screen space (green ≥55 / amber ≥30 / red below).

## 17. Large Food Carry Event

A lightweight surface event (MVP). A single large food appears on the surface, idle workers gather, escort it to the nest entrance, and the colony gains food.

State:

- Runtime-only `S.largeFood` (one event at a time) and `S.largeFoodTimer`. Neither is saved or restored.
- `S.largeFood` fields: `id`, `kind`, `label`, `x`, `y`, `state`, `requiredWorkers`, `assignedWorkers`, `arrivedWorkers`, `rewardFood`, `progress`, `rewarded`, `r`, `sizeFactor`, `carrySpeed`, `seed`, `shape`, `life`, `carryStartX`, `t`, `doneT`, `spawnTime`. (`kind`/`label` come from `LARGE_FOOD_TYPES`, picked at spawn.)
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
- Renders as one of 6 image sprites (`LARGE_FOOD_TYPES`: dead_fly / dead_beetle / caterpillar_piece / seed_cluster / bread_crumb / fruit_scrap), weighted-random per spawn (`S.largeFood.kind`), preloaded from `assets/large_food/*.png` via `preloadLargeFoodSprites()`. Shadow on the same surface line as workers, plus an `arrived/required` (e.g. `3/5`) or `搬送中` label; the spawn toast/label use the food's name. **Fallback:** if the sprite isn't loaded yet (or failed to load), draws the previous irregular polygon tinted per type (`tintFallback`), so the event always renders. Workers draw on top, so they appear to gather around and escort it.
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
- First roll chance is `MAJOR_ACT_COOKIE_BASE = 0.0006` (`0.06%`).
- Each miss adds `MAJOR_ACT_COOKIE_INC = 0.00015` (`+0.015%`) pity.
- Roll chance is capped at `MAJOR_ACT_COOKIE_MAX = 0.003` (`0.3%`).
- These three probabilities were reduced to 1/10 of their original values (2026-06-08) to lower the appearance frequency by ~10×. See the persistence note below for why the roll chance — not the cooldown — governs perceived frequency.
- When a roll succeeds, a sugar/cookie lucky target becomes `available` for `MAJOR_ACT_COOKIE_WIN = 15` seconds.
- Tapping the target activates the boost for `MAJOR_ACT_COOKIE_ACTIVE = 10` seconds.
- While active, worker cookie chance uses `MAJOR_ACT_COOKIE_MUL = 100`.
- After activation, or after missing the available target, cooldown is `MAJOR_ACT_COOKIE_CD = 12000` seconds (`3h 20m`).
- Expected time from entering `hunting` until target appearance is now about `1190` seconds (~20 min), ~10× the previous ~119 s.
- Probability of seeing the target within the first `15` seconds of hunting is now about `0.45%` (was ~4.4%).
- **Persistence note (important):** `S.majorActives` is **not** part of the save (`serializeWorld()`/`toSave()` do not include it). Every page load re-initializes `cookie` to `{ state:'hunting', cdUntil:0, pity:0, nextRollAt:0 }`, so the `MAJOR_ACT_COOKIE_CD` cooldown is effectively bypassed across sessions: a fresh hunt begins on each open. The perceived appearance frequency is therefore set by the per-session hunting roll (the `base`/`inc`/`max` curve), not by the cooldown. (The cooldown only applies within one continuous session after the boost fires/expires.) This is why lowering the roll chance — rather than raising the cooldown — is what reduces how often the player sees the 欠片.

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
- Run offline construction (`runOfflineBuilding(sec)`) if 鬼の居ぬ間も！ (`offlineBuild`) is researched: builders advance/expand rooms at `1/3 × offlineBuildSpeed` efficiency by stepping the live builder logic. See section 9.
- Run golden-rearing acceleration (`accelerateGoldenBrood(sec × OFFLINE_EFF)`) if 英才教育 (`goldenBrood`) is researched. See section 11.

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
- Depth II/III/IV
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
- That transformed-cache path is camera-only: if `getNestVisualSignature()` changes because `nodeVis`, `edgeFrac`, room/shaft count, or soil colors changed, the old soil/fog cache is not reused.
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
