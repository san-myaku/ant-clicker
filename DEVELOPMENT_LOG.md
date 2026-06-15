# Development Log

## 2026-06-15 遠征・研究・防衛 大型アップデート（複数フェーズ）

遠征MVPを軸に、研究・防衛システムと有機的に接続する大型拡張。設計判断: 解放条件は重め（研究=生体400匹＋女王Lv5 / 遠征枝=女王Lv8＋働き250匹）、放射状ツリーは別セッション、統合カースト制を採用。実在のアリ生態に準拠（カースト多型・ギ酸・捕食者素材）。

### Phase 1 — 解放条件と女王リンク

- 定数追加: `RESEARCH_UNLOCK_QLV 5`、`EXPED_BRANCH_QLV 8`、`EXPED_BRANCH_WORKERS 250`。
- 研究本体の自動解放(live/offline 両ループ)を `G.tot >= 400 && G.qLv >= 5` の AND 条件に変更。ロック文言・overview "next"・トーストを「生体400匹＋女王Lv5」表記に更新（進捗 `生体あとN匹 / 女王LvX/5` を表示）。
- 遠征枝(`unlockedBranches.expedition`、初期false)を `maybeUnlockExpeditionBranch()` で `G.qLv>=8 && G.ants.worker>=250` 到達時に一度だけ解放(トースト＋女王つぶやき)。`update()` 毎フレーム判定。
- `isExpeditionUnlocked()` を旧「兵隊5匹」判定から「遠征枝が解放済み」判定に変更。遠征モーダルのロック文言を女王Lv/働きアリ進捗表示に。遠征枝 `desc` を「外界への遠征」に更新。
- 検証(preview): 遠征枝フラグ false→モーダルにロック文言＋進捗、true→遠征カード4枚表示を確認。構文 `new Function` OK。

## 2026-06-14 モグラ v2: digging approach + realistic redraw + room-collapse on loss

User feedback on the mole: make it more realistic, have it **dig in** (kick up dust, advance steadily toward the room), fight hard, and **destroy the room** if you lose. All in `index.html`, runtime/visual only.

**Dig approach (two phases).** The mole now spawns **offset in the soil** (`MOLE_DIG_OFFSET 210`dp to the outer/queen-away side of the target room, clamped to world) in a new `phase:'dig'`, and tunnels toward the room at `MOLE_DIG_SPEED 34`dp/s — kicking up `dust()` (土埃) front+back each frame + a faint `shake` (地響き), facing its travel direction. On arrival it switches to `phase:'raid'` (resets `lifeT`/`dmgTimer`), bursts dust, "部屋に侵入！" toast + shake, and the in-room fight begins. The timeout clock (`lifeT`) only runs during `raid`, so the dig is free prep time to gather soldiers. Soldier DPS (`applyMoleSoldierDPS`, extracted helper) applies in both phases, so soldiers waiting at the room start biting as it breaches. `spawnMole` warning reworded to "地中から接近中".

**Realistic redraw** (`drawMoleInvader`): elongated cylindrical velvety body (radial-gradient volume + horizontal fur-flow highlights + rim fuzz), short tail + hind foot, conical head, **pointed pink snout** (gradient) with two nostrils + whiskers, vestigial eye, and **large pale spade-shaped digging paws** with 5 claws that scratch faster/harder while digging (`t*13` vs `t*7`). Faster body bob during dig. Time-left gauge only shows in `raid` phase.

**Room collapse on loss** (the big new penalty). On timeout, `collapseMoleRoom(room)`: subtracts the room's held eggs/larvae/food/cookie from the `G` totals (truly lost), zeroes its inventory, sets `_origType` + `type='rubble'` + `collapsed=true`, re-clamps golden eggs, `G.recalc()` + `normalizeInventories()`. `rubble` is excluded from `isCountedRoomType` (no caps/room-count contribution) and labeled 崩落跡 — the room stops functioning. **Passage is kept** (no node/edge removal) so the nest never strands. Rendered by `drawCollapsedRoom` (early-out in the node draw loop): the chamber is filled with dark dirt (`fillBlobPath`) + rubble dots + cracks over the cached cave, reading as caved-in.

**Critical fix found in testing.** Force-collapsing every room let the mole target & collapse the **queen room** → the worker-AI target query (`food||queen` visible rooms) went empty → `t.id` on undefined crashed `updateAnts` every frame. Fixes: (1) `spawnMole` fallback candidates now exclude `queen`/`rubble`; (2) `collapseMoleRoom` hard-guards `queen`/`entrance`/`shaft`; (3) defensive `if(t)` at the worker target site. Verified: a mole collapses a food/nursery room into rubble with the queen untouched and **no crash**; recovered the corrupted preview save via `_origType`.

Verification (preview): dig phase spawns offset and tunnels in with dust; realistic mole renders (snout/claws/fur clear); collapse turns the room to rubble, queen protected, `caps.food` drops on recalc, no console errors post-fix. Tunables: `MOLE_DIG_SPEED`/`_OFFSET`, collapse severity (it's a whole room — may be too harsh; dial via gating or by sparing the last food/nursery if needed). Device playtest for feel. Next v3: 梅雨の浸水 (flood disaster).

## 2026-06-14 Raid v3 boss #3: モグラ (mole — underground predator boss)

Third v3 boss, and the first **underground** one (spider/samurai are surface raids). Real ecology: moles are major subterranean predators that devour ants + brood and wreck chambers. Framing (user pick): an underground boss fought with **soldiers auto-swarming + player taps**. Built by extending the existing 地下侵入者 (centipede/mite) pipeline rather than the surface-raid pipeline — the mole lives in `S.invaders` with `isBoss:true`, which gives it the pests' soldier-pathing and tap-targeting for free.

Trigger / identity:
- Spawn roll in `updateInvaders`: when no boss is active and `visRooms ≥ MOLE_MIN_ROOMS 6` && `band.index ≥ MOLE_MIN_DEPTH 4` && `raidWins ≥ MOLE_MIN_WINS 1`, a `S.moleTimer` (`MOLE_SPAWN_MIN 240`–`MOLE_SPAWN_MAX 480`s) counts down; on fire, `Math.random() < MOLE_CHANCE 0.6` → `spawnMole()` (else re-roll). One mole at a time.
- `spawnMole(force)` erupts from the deepest visible nursery/food room (fallback any visible room). `hp = MOLE_HP_BASE 48 + soldiers × MOLE_HP_PER_SOLDIER 2.2` (HP scales with the army so kill-time stays ~flat regardless of size), `size 4`, faces the queen. Warning toast + queen whisper + big shake. Runtime-only (`S.invaders` isn't serialized) — no save migration.

Combat — **soldiers + tap** (hybrid the user chose):
- Soldiers: reuse the existing `hunt_invader` task to path to the mole's room; on arrival, if `inv.isBoss` they switch to a new `engage_mole` task that keeps them clustered on the mole (instead of the pests' hit-and-leave). `idle` soldiers now prefer the mole (50% vs the 15% pest hunt). Damage is applied **centrally** in `updateMoleInvader`: it counts soldiers within `dp(MOLE_ENGAGE_RADIUS 72)` and does `near × MOLE_SOLDIER_DPS 1.6 × dt` (+ occasional `ガジッ` fx). This avoids per-soldier attack plumbing and scales smoothly with the swarm.
- Tap: `hitInvader` branches on `isBoss` → `MOLE_TAP_DMG 3` per tap (vs 1 for pests) via the existing `tryHitInvaderAt` pointer path.

Threat (`moleEat`, every `MOLE_DMG_INTERVAL 2.4`s): devours `MOLE_EAT_ANTS 3` workers (+`clampGoldenCount`), `MOLE_EAT_EGGS 5` eggs, `MOLE_EAT_LARVAE 1` larva, and gnaws room food, with `アリ-N`/`卵-N` fx + shake.

Resolve (`updateMoleInvader` returns true → spliced from `S.invaders`):
- **Driven off** (hp ≤ 0): `+MOLE_REWARD_FOOD 260` / `+MOLE_REWARD_COOKIE 22`, queen whisper, burrows away in a dust burst.
- **Timeout** (`lifeT ≥ MOLE_DURATION 28`s): a final `MOLE_ESCAPE_EAT_MUL 3`× chomp, "巣を食い荒らして去った" toast/whisper + `normalizeInventories()`. Heavy but recoverable (not game-over).

Render: `drawMoleInvader` (early-out at the top of the invader draw loop) — side-profile mole (dark fur body, pink pointed snout + nostrils + whiskers, tiny eye, big pale scratching digging claws, soil mound, danger aura, hit flash), `ctx.scale(face,1)` for facing. Boss HP bar + a yellow **time-left** gauge drawn in world space above it.

Debug: dev-mode `🦫モグラ` button (`#dev-mole`, wired in `_activateDevMode`) + `window.__forceMole()` (both bypass gating). Verification: forced a mole in preview — renders correctly, soldiers stream in and swarm it, eat fx + HP/timer bars fire, and a 15–18-soldier army killed it in seconds (reward path ran). Note: `S.timeScale=0` does NOT freeze the game (`dtRaw * (S.timeScale || 1)` treats 0 as 1) — used huge HP to hold it for the screenshot instead. Numbers (`MOLE_*`) are first-pass; device playtest to tune HP/DPS/eat-rate/duration. Next v3: 梅雨の浸水 (flood disaster).

## 2026-06-14 Dev-mode raid triggers + FPS overlay, samurai result-text fixes, spider visual rework (3× side-profile)

Three polish passes (all `index.html`, runtime/visual only — no save migration):

**1. Dev-mode raid triggers + FPS overlay.** Dev mode (long-press 描画設定 5s, or `?dev=1`) now shows an in-game raid-trigger row (`#dev-raid-tools`: 🐜通常 / ⚔️奴隷狩り / 🕷️クモ) wired to `debugForceRaid('normal'|'samurai'|'spider')` — no more console-only `window.__forceRaid`. Activation refactored into `_activateDevMode(showToast)` (shared by `?dev=1` and the long-press) which also sets `S._devMode=true` and wires the buttons once (`btn._devWired` guard). FPS overlay: when `S._devMode`, `render()` draws `Math.round(S.perf.fps)` top-right in screen space (green ≥55 / amber ≥30 / red below) — reusing the rolling `S.perf.fps` already kept in the rAF loop.

**2. Samurai result-modal text fixes.** Playtest showed contradictory wording: title said "卵を奪われた…" even with 0 eggs stolen; body said "守り切った！" on a breach-loss that only stole 0 because the colony *had* 0 eggs; soldier deaths weren't shown when 0. Now — loss title is "❌ 卵を奪われた…" only when `eggsStolen>0`, else "❌ 突破された（卵の被害なし）"; the egg line distinguishes a real defense (win or 0-breach → "卵を完全に守り切った！") from a breach with 0 eggs on hand ("卵の被害なし（卵0個）"); the 戦死 line always shows ("-N" or "なし"). Logic only — `eggsStolen` math (breachRatio × steal mul/cap) unchanged.

**3. Spider visual rework — side-profile wolf spider, ~3× size** (user request w/ reference image). `RAID_SPIDER_KIND.sizeMul` 2.2 → 5.5 (+ slightly larger intrinsic geometry ≈ 3× on-screen); tint → warm brown `#6b5038`. `drawRaidSpiderBody` fully rewritten as a hairy side-profile コモリグモ: large abdomen with a forward chevron folium + highlight + edge fuzz, smaller cephalothorax with dorsal stripe, eyes (2 big + 4 small) + chelicerae/fangs + pedipalps, and **8 legs in two depth layers** (far = light/small-gait, near = dark/large-gait), each anchor→knee(arched above the back)→foot(ground)→tarsus with dark joint bands + bristles, animated via `sin(en.t*6 + phase)`. **Orientation fix**: the generic enemy transform uses `rotate(dir)`, which would flip the now-asymmetric profile upside-down when facing left — so the spider branch uses a horizontal flip (`scale(faceLeft?-sm:sm, sm)`) instead, keeping legs always pointing down (verified both facings). Body sits on the surface line with legs reaching the ground (center raised in local −y). Spider HP bar widened/raised (`drawRaidEnemyHpBar`: w `dp(80)`, y `dp(94)`) to clear the taller body; hit/lunge flashes moved into `drawRaidSpiderBody` (body-centered) so the generic 0,0 flash doesn't mis-place on the big sprite.

Verification: loads, no console errors; forced a spider raid in preview and screenshotted both facings — profile reads correctly, legs point down both ways, HP bar clears the body, lunge `ガブッ!` fires. Leg gait is rAF-driven (preview tab throttles to ~8fps headless → animation is device-confirmable). Tunables: `RAID_SPIDER_KIND.sizeMul`, the HP-bar offsets, leg `legDefs`.

## 2026-06-14 Raid v3 boss #2: クモの大型ボス (giant spider boss)

User idea: a rare **large surface boss** — a spider (real ecology: spiders are classic ant predators that ambush surface foragers). Chosen framing (user pick): a **special raid** reusing the bossType pipeline, but as a **single boss** rather than a swarm — contrast to the samurai horde.

Trigger / identity:
- `decideRaidBossType()` now checks spider FIRST: `'spider'` when `G.raidWins ≥ RAID_SPIDER_MIN_WINS 3` && `rand < RAID_SPIDER_CHANCE 0.12` (rare, any season), else the summer samurai check, else normal.
- `beginRaidAttack` forces `waveCount=1` for spider (no waves of one boss). `spawnEnemies` short-circuits: `if(isSpiderRaid()){ spawnSpiderBoss(); return 1; }`.
- `spawnSpiderBoss()`: ONE enemy, `RAID_SPIDER_KIND` (spd 0.7 / sizeMul 2.2 / pushThrough 0.45 / atk 0.35 / `#4a3528`, `isBoss:true`), `hp = perEnemyHp × nBudget × RAID_SPIDER_HP_MUL 1.6` (~1.6× a normal raid's total HP, in one body; still army-scaled through `getRaidEnemyBaseHp`).
- Drawn as an 8-leg spider (`drawRaidSpiderBody`: animated gait, cephalothorax+abdomen, fangs, eyes, red `lungeFlash` pulse) instead of the ant body. HP bar widens for `en.isBoss` (`drawRaidEnemyHpBar`) → a real boss bar.

Signature mechanic — lunge bite (`tickSpiderLunge`, called per-frame for the living spider in the attack tick):
- Every `RAID_SPIDER_LUNGE_CD 3.5`s, bites up to `RAID_SPIDER_LUNGE_MAX_HITS 4` soldiers within `dp(RAID_SPIDER_LUNGE_RADIUS 34)` for `RAID_SPIDER_LUNGE_DMG 14` each (dead soldiers → `casualtyWeight`), with `ガブッ!` fx + shake + red flash. Continuous atk is deliberately LOW (0.35) so the swarm survives between lunges — the telegraphed burst is the danger, not proximity. (A single high-atk boss engaged by the whole army would otherwise shred it instantly, since every engager takes its atk/s.)

Resolve: reuses standard single-enemy win/lose (kill = all_killed win; breach = loss → existing breach-ratio worker loss reads as the spider rampaging). Win = big reward (food +50% of base, cookies +30–50) + queen whisper; distinct intro/result/titles for both outcomes.

Runtime-only state (`S.raidVis.bossType`, spider enemy fields) — no save migration. Debug: `window.__forceRaid('spider')` (any season). Verification: loads, no console errors/warnings; G/S/canvas/`__forceRaid` present (full IIFE parsed — incl. the manual brace-wrap in the enemy draw). rAF can't run the raid loop headless → **device playtest required**; tune `RAID_SPIDER_HP_MUL` / `_KIND.atk` / `_LUNGE_*` (boss too tanky→lower HP mul; army melts→lower lunge dmg or raise CD). Next v3: モグラ (underground boss), 梅雨の浸水 (flood disaster).

## 2026-06-14 Raid v3 boss #1: サムライアリの奴隷狩り (Amazon-ant slave raid)

First of the v3 seasonal-predator bosses. Real ecology: サムライアリ (Polyergus) raid host-ant nests in summer and carry off brood (pupae/larvae) to raise as slaves. Game translation (2-layer rule): a summer special raid that **steals eggs** on breach. Reuses the whole v1/v2 raid+wave pipeline — additive, low new-surface.

Trigger / identity:
- `decideRaidBossType()` (called in `beginRaidAttack`, stored as `S.raidVis.bossType`): returns `'samurai'` when `getCurrentSeason().id==='summer'` && `G.raidWins ≥ RAID_SAMURAI_MIN_WINS 2` && `rand < RAID_SAMURAI_CHANCE 0.35`, OR when forced. Otherwise `'normal'`.
- `RAID_SAMURAI_KIND` (elite raider: spd 1.3 / hp 1.6 / atk 2.0 / pushThrough 0.4 / crimson `#9f1239`, `weight:0` so it never enters the normal weighted pool). `spawnEnemies` swaps the *entire* roster to it when `isSamuraiRaid()`, across all waves. Enemy draw gives `kind==='samurai'` curved **sickle mandibles**.

Signature mechanic — brood theft (`resolveRaid`):
- `eggsStolen = floor(G.eggs × clamp(breachRatio × RAID_SAMURAI_STEAL_MUL 1.1, 0, RAID_SAMURAI_STEAL_CAP 0.6))`, `breachRatio = breachedEnemies/totalEnemies`. **Independent of win/lose** — you can win the battle but still lose brood if any breached; a perfect (0-breach) defense loses zero eggs.
- `out.eggMul` forced to 1 for samurai raids so theft is the *only* egg loss (no double penalty with the normal lose-branch egg reduction). Food/worker losses on a loss still apply. `goldenEggs` re-clamped after theft.
- Win bonus: +15–25 cookies + queen whisper. Distinct intro (queen whisper "卵を奪いに来たわ…"), HUD "略奪", per-breach `🥚 卵を奪われる!` fx, result modal "⚔️ サムライアリの奴隷狩り" + `🥚 奪われた卵: N` (or "卵を完全に守り切った！"), samurai-specific result titles.

State is runtime-only (`S.raidVis.bossType`/`eggsStolen`, `S._forceRaidKind`) — no save migration. Debug: `window.__forceRaid('samurai')` (bypasses the summer/gating roll).

Verification: loads, no console errors/warnings; G/S/canvas/`__forceRaid` present (full IIFE parsed — a syntax error in any of the ~10 edits would've thrown). Currently winter in the test save, so a natural samurai raid won't fire — **device playtest required** (rAF doesn't run the raid loop headless). Tune `RAID_SAMURAI_CHANCE` (frequency), `RAID_SAMURAI_KIND` atk/hp (difficulty), `RAID_SAMURAI_STEAL_MUL`/`_CAP` (theft severity). Next v3: モグラ (underground boss), 梅雨の浸水 (flood disaster).

## 2026-06-13 Raid v2: intra-raid waves (波状攻撃)

Goal: make a single raid feel like a battle with momentum — probe → commit → main force — instead of one clash. Builds on v1 (variety/rally/result) + the v2.1 attrition pass.

Mechanic:
- **Wave count by progress** (`getRaidWaveCount`): 1 wave at raidWins ≤1 (early game unchanged), 2 at ≥2, 3 at ≥6. Surfaces by the 3rd win.
- **Per-wave scale** (`RAID_WAVE_SCALES` {1:[1.0], 2:[0.7,0.9], 3:[0.5,0.7,1.0]}): each wave is a fraction of `enemyPower`; final wave = full-size "main force" climax. Total enemy budget for a 3-wave raid ≈ 2.2× a single raid — a real step up, gated behind 6 wins.
- `spawnEnemies` refactored to `spawnEnemies({scale, extraBrute, append})` (backward-compatible — no-arg = old behavior). Wave 0 resets `S.enemies`; later waves **append**, so killed/breached tallies and `S.raidVis.totalEnemies` stay cumulative across the whole raid. Returns the spawned count.
- **Seam** (attack tick): when `getLivingRaidEnemyCount()<=0`, if more waves remain → set `S.raidVis.waveLull = RAID_WAVE_LULL_SEC 2.6`s, announce "🌊 第N波が来る…", then `beginNextRaidWave()` (NOT `resolveRaid`). Final wave → `finishDelay`→`resolveRaid` exactly as before. `waveLull` / `finishDelay` are mutually exclusive paths.
- **Attrition compounds**: `ensureRaidSoldiers` is NOT re-called between waves, so wounded soldiers stay wounded and the dead stay dead → the ひりひり the user asked for. A modest regroup heal (`RAID_WAVE_REGROUP_HEAL 0.35` of maxHp to living soldiers) in `beginNextRaidWave` keeps it from being an automatic death-spiral. Later waves more brute-heavy (`pickRaidEnemyKind(extraBrute)`, `extraBrute = idx × RAID_WAVE_BRUTE_STEP 14`).
- UI: wave badge in the raid HUD (`波 N/M`), inter-wave toast + shake, "最終波！" + queen whisper on the last wave, fx pop. Result modal gains a `🌊 波状攻撃: 全N波` line.

Win/lose math (cumulative breach ratio 30%, all-killed win, `computeRaidOutcome` fallback) is unchanged — it just evaluates over the grand total once the final wave clears.

Verification: loads, no console errors/warnings; G/S/canvas/`__forceRaid` present (full IIFE parsed). rAF doesn't run headless so the wave loop can't be exercised here — **device playtest required** to tune `RAID_WAVE_SCALES` / `RAID_WAVE_REGROUP_HEAL` / `RAID_WAVE_LULL_SEC` (lower scales or raise heal if too brutal; opposite if too soft). Next: v3 seasonal-predator bosses.

## 2026-06-13 Raid balance v2.1: more attrition (tenser fights)

- Playtest feedback: soldiers died too rarely — wanted more "ひりひり" tension. Raised soldier attrition ~1.5×:
  - `RAID_SOLDIER_BASE_HP` 24 → 20 (soldiers frailer; yellow low-HP bar shows sooner = more visible danger).
  - `RAID_ENEMY_ATK_BASE` 0.8 → 1.0 (engaged soldiers take more damage/s; brute at ×2.4 = 2.4/s now genuinely deadly).
- Combined effect on time-to-kill a soldier (HP/atk): ×(24/20)×(0.8/1.0) ≈ **0.66 → ~1.5× faster deaths**. Win/lose math (breach ratio, `computeRaidOutcome` fallback) and stall/`pushThrough` unchanged — this only dials per-soldier survivability.
- Headless: loads, no console errors. Death-rate *feel* is device-only (rAF combat can't run headless) — dial `RAID_ENEMY_ATK_BASE` up / `RAID_SOLDIER_BASE_HP` down for more, opposite for less.

## 2026-06-13 Large surface food → image sprites (assets/large_food)

- Large surface food now renders as one of 6 image sprites (`LARGE_FOOD_TYPES`: dead_fly / dead_beetle / caterpillar_piece / seed_cluster / bread_crumb / fruit_scrap), weighted-random per spawn, preloaded from `assets/large_food/*.png` via `preloadLargeFoodSprites()`. `S.largeFood` gains `kind`/`label`; the spawn toast and on-canvas label use the food's name. If a sprite isn't loaded/failed, `drawLargeFood` falls back to the previous procedural polygon tinted per type (`tintFallback`), so the event always renders.
- New binary assets: `assets/large_food/{dead_fly,dead_beetle,caterpillar_piece,seed_cluster,bread_crumb,fruit_scrap}.png` (~1.6 MB total).
- (Authored separately, not part of the raid work below; bundled into the same commit per request. Live sprite rendering is device-only to verify — headless can't run the rAF draw loop.)

## 2026-06-13 Raid tweaks: remove recovery buff + add soldier HP bars

- **Removed the post-defeat recovery system** (`S.recoveryT`, `RAID_RECOVERY_SEC`/`RAID_RECOVERY_MUL`, the food-production buff + main-loop decay + result/toast/UI notes) per request — defeat is just the loss now (toast/UI reverted to pre-overhaul wording). Verified by grep that **no `RAID_RECOVERY` / `recoveryT` / `.recovery` references remain** (a dangling ref would only throw at runtime in the rAF loop, which headless can't catch — so the grep is the real check).
- **Soldier HP bars**: added `drawRaidSoldierHpBar(ctx, s)` (mirror of the enemy bar; blue, amber at low HP, shown only when wounded to avoid clutter), called per soldier in `drawRaidSoldiers` after the body draw (world coords, unrotated). The LOD crowd path (huge armies) keeps no individual bars for perf.
- Loads with no console errors. Live combat still device-only to verify/tune.

## 2026-06-13 Raid balance: soldier mortality + weaker stall (fix "buy soldiers = always win")

Purpose:
- Playtest feedback: soldiers stalled enemies almost perfectly (`SLOW_PER 0.94`, min `0.01` ≈ frozen) and had no HP/death, so owning soldiers = a free guaranteed win with zero attrition. Make raids contested: soldiers can die, stall is imperfect, brutes push through.

Changes:
- **Soldier mortality**: surface soldiers now have HP (`getRaidSurfaceSoldierHp()` = `RAID_SOLDIER_BASE_HP 24` × soldier-level mul, × `weight` per representative unit). While engaging an enemy they take `enemy.atk`/s; at 0 HP the soldier falls (fades, stops engaging). Casualties accumulate as `S.raidVis.casualtyWeight` (logical) and reduce `G.ants.soldier` at resolve — even a win costs troops, and leveling soldiers now also buys survivability. (Per-display HP scales with `weight`, so the logical casualty *rate* is weight-independent.)
- **Enemy attack / push**: `RAID_ENEMY_KINDS` gain `atk` (worker 1.0 / scout 0.6 / brute 2.4, × `RAID_ENEMY_ATK_BASE 0.8`) and `pushThrough` (0 / 0.25 / 0.55), stored on each enemy at spawn.
- **Weaker stall**: `RAID_ENEMY_ENGAGED_SLOW_PER 0.94→0.6`, `RAID_ENEMY_ENGAGED_MIN_FACTOR 0.01→0.12` — engaged enemies creep forward instead of freezing; `pushThrough` blends `holdFactor` toward 1 so brutes bull through a block and reach the entrance unless killed fast → real breach pressure when under-defended.
- **Result modal** shows `戦死: 兵隊アリ -N`. `casualtyWeight` reset in `beginRaidAttack`.
- Net: a sufficient, leveled (or rallied) army still wins with modest losses; an under-prepared one is pushed through and loses soldiers — softened by the v1 recovery buff. Numbers are deliberately conservative and tunable.

Verification: loads, no console errors; `S.raidVis.casualtyWeight` undefined at rest (no-op until a raid). NOTE: headless can't run the battle — verified by inspection; **must be playtested + tuned on device** (raise `RAID_ENEMY_ATK_BASE` / lower `RAID_SOLDIER_BASE_HP` if soldiers die too rarely; opposite if too brutal; lower `RAID_ENEMY_ENGAGED_SLOW_PER` for even less stall).

## 2026-06-13 Raid overhaul v1: enemy variety + rally pheromone + recovery + richer result

Purpose:
- Make raids 本格的 / participatory (Notion analysis Part 2/3/4). Regular raids were 1 enemy type, watch-only, punishing on loss, thin result. v1 fixes variety + agency + anti-spiral + readability. (Intra-raid waves + seasonal-predator bosses = v2/v3.) Layered on Codex's "Adjust raid pacing and research unlock" (415460c); intentionally left the cadence/interval alone (Codex's area) to avoid conflict.

Changes:
- **Enemy variety** (`RAID_ENEMY_KINDS`): worker / scout (fast, frail, small) / brute (slow, tanky, big) — realism = rival-colony castes. `pickRaidEnemyKind()` weighted pick; brute share grows with `G.raidWins` (+3/win, cap +40). `spawnEnemies` applies spdMul/hpMul and stores kind/sizeMul/tint; the enemy draw applies `ctx.scale(sizeMul)` + body tint. Reuses all existing surface combat — just composition + per-enemy stats.
- **応援フェロモン (rally)**: during the attack phase, tapping (via `tryLayEgg`) calls `addRaidRally()` → extends `S.rallyT` (`+0.5s`/tap, cap `6s`); `getRaidSurfaceSoldierDamage()` ×`(1+RAID_RALLY_BONUS 0.6)` while active. First rally toasts, each tap floats a "応援!" fx. Reset in `beginRaidAttack`, decays in the main loop. Watching → participating.
- **復興 (recovery)**: on defeat, `S.recoveryT = RAID_RECOVERY_SEC (180)` and food production ×`RAID_RECOVERY_MUL (1.5)` while active (folded into `prodPerSec` beside `S._cleanMul`). Loss toast/modal reframed as a comeback, not a spiral. Decays in the main loop.
- **Richer result modal**: enemy composition tally (働き×N / 斥候×M / 大顎×K), rally-used note, recovery note.
- All new state defaults undefined → `>0` guards / `||1` make it a no-op until a raid; constants tunable.

Verification (preview): loads, no console errors; G/S healthy; `S.rallyT`/`S.recoveryT` undefined at rest (no behavior change). NOTE: headless preview doesn't run requestAnimationFrame, and raids need soldiers + pop≥50, so the live battle couldn't be exercised. Verified by inspection: all hooks default-safe, reuse the proven combat loop, pure arithmetic. **Must be playtested on device** (dev mode → recruit soldiers → raid; tap during the battle to rally; lose once to see recovery).

## 2026-06-10 Research C (first cross-branch interaction nodes): queen×golden + gather×ferment

Purpose:
- Roadmap slice **C (交差ノード)**, first pair — nodes whose effect makes two branches' *systems* actually interact at runtime (per Codex: a real interaction, not just a cross-branch prereq). Both breakthrough flags; the node lives in one branch but its effect reads another system's live state.

Changes:
- **女王×黄金「黄金の女王」** (`golden_queen_synergy`, golden, flag `queenGolden`): `getGoldenFingerChance()` is multiplied by `1 + (getResearchBonus('layMul') − 1) × QUEEN_GOLDEN_SCALE (0.5)` — the more you've invested in the queen branch's auto-lay (`layMul`), the higher the golden-egg rate. No queen investment → ×1 (no-op).
- **採集×発酵「余り物の甘味」** (`ferment_surplus`, ferment, flag `surplusCookie`): when food production would overflow the cap, the overflow is converted to cookies instead of wasted — `overflow × SURPLUS_COOKIE_RATE (0.02)`, banked in `S._surplusAcc`. Captures both the partial overflow (food reaching cap this tick) and steady-state at-cap production.
- These read live state (`layMul` bonus / food-vs-cap), which the cached mul system can't express, so they're applied at the consumption site behind a flag (not via `effects` muls). New tunable consts `QUEEN_GOLDEN_SCALE`, `SURPLUS_COOKIE_RATE`. (Remaining C ideas — 衛生×発酵 compost, 地質×防衛 — left for a follow-up.)

Verification (preview): loads, no console errors; tree now **50 nodes**; both nodes render with `効果: 解放`. Flags default-off → `getGoldenFingerChance` and the food-cap path are exactly the original behavior (verified by reading the guards). Runtime interaction verified by inspection (a single guarded multiplier / overflow capture, accumulator banks fractions); headless can't run the loop.

## 2026-06-10 Research B3 (part 2): mineral veins (depth income) + early warning (raid casualty cut)

Purpose:
- Finish **B3 (地質・防衛の濃縮)** with the two deferred nodes (地2 鉱脈 / 防1 早期警戒). Both breakthrough flags; kept simple (no new resource).

Changes:
- **地2 鉱脈** (`mineral_vein`, geology, breakthrough, flag `mineralVein`): a passive cookie trickle scaling with dig depth — `+G.getDepthUnlocked() × MINERAL_RATE (0.3) /s`, fraction banked in `S._mineralAcc` (`addCookie` floors). Rewards digging deep; pairs with 地1 (dig faster → reach depth → mine).
- **防1 早期警戒** (`early_warning`, defense, breakthrough, flag `earlyWarning`): cuts raid worker casualties by `EARLY_WARNING_REDUCE (0.4)` — `out.loseWorkers` is reduced right after the outcome is computed, so both the loss applied (`G.ants.worker -= …`) and the toast/modal show the smaller number.
- Both flags → A1 preview `効果: 解放`; default-off = no behavior change.

Verification (preview): loads, no console errors; tree now **48 nodes**; both nodes render with `効果: 解放`; `G.getDepthUnlocked` present (mineral hook valid). Runtime effect (depth trickle / reduced casualties) verified by inspection — flag-gated, accumulator banks fractions, no throw paths — since headless can't run the loop or a raid.

## 2026-06-10 Research B3 (part 1): geology dig-speed + defense raid-spoils

Purpose:
- Roadmap slice **B3 (地質・防衛の濃縮)**, first pair: speed up expansion and turn defense into income. Two new leveled-infinite nodes (one geology, one defense); no new branch. (地2 鉱脈 / 防1 早期警戒 deferred to a later B3 part — minerals add a new resource and early-warning needs raid-timing UI.)

Changes:
- **地1 掘削促進** (`dig_speed`, geology, infinite, `digSpeed +25%/Lv`): the builder-logic accumulator (`target.acc += dt × builders × assist.mul / chunkSec`) is multiplied by `getResearchBonus('digSpeed')`. Because offline building runs the same `updateBuilderLogic`, the boost applies online and offline automatically.
- **防5 戦果** (`raid_spoils`, defense, infinite, `raidSpoils +30%/Lv`): the raid-victory rewards (`out.rewardFood` / `out.rewardCookie`) are multiplied by `getResearchBonus('raidSpoils')` (floored), so repelling raids yields more food/cookies — defense becomes an income source. Builds on the existing win-reward path.
- Added `digSpeed` / `raidSpoils` labels to `RESEARCH_PREVIEW_KEY` so the A1 preview shows the real `+%` delta (both effUp production muls).

Verification (preview):
- Loads with no console errors; research tree now **46 nodes**; `dig_speed` shows `効果: 掘削速度 0%→+25%`, `raid_spoils` shows `効果: 戦果 0%→+30%` (preview deltas correct, confirming the key wiring). Default level-0 → `getResearchBonus` = 1, so build speed and raid rewards are unchanged.
- NOTE: headless preview can't run the live build loop or a raid, so the runtime effect is verified by inspection (a single `getResearchBonus` multiplier at each hook, safe ×1 default, all vars in scope). Observable in a running game (dev mode + a raid).

## 2026-06-10 Research B2: ferment branch — cookie maturation (interest) + offline fermenting

Purpose:
- Roadmap slice **B2 (発酵の自動化＆熟成)**: the ferment branch only sped up / cheapened cookie batches. Add a *saving* mechanic and let fermenting continue while away. Two new ferment breakthroughs; no new branch.

Changes:
- **発1 熟成** (`ferment_mature`, breakthrough, flag `cookieMature`): held cookies earn passive interest — `+√(G.cookie) × COOKIE_MATURE_RATE (0.25) / s`. The √ makes it **sub-linear** (doubling the stockpile only ~1.41× the interest), so it rewards banking but can never run away exponentially. `addCookie` floors, so the live loop accumulates the fractional amount in `S._cookieMatureAcc` and adds whole cookies; also applied in `calcOffline` (`× OFFLINE_EFF × sec`, from the starting stockpile = conservative).
- **発2 自動発酵** (`ferment_offline`, breakthrough, flag `fermentOffline`): `calcOffline` now runs fermenting analytically — `cyclesPerRoom = floor(sec × OFFLINE_EFF × speedMul / recipe.timeSec)`, total = `rooms × cyclesPerRoom` clamped by available food (`floor(G.food / foodCost)`), then `G.food -= cycles × foodCost` and `addCookie(cycles × (1 + cookieBonusChance))`. Uses the same `getFermentRecipe` / `getFermenterBonusRate` / visible-room count as the live `updateFermentRooms`, but no `fx`/`toast` (offline-safe).
- Both are `flag` effects → the A1 preview shows `効果: 解放`; no new bonus keys. `COOKIE_MATURE_RATE` is tunable.

Verification (preview):
- Loads with no console errors; research tree now **44 nodes**; both ferment nodes render with correct names + `効果: 解放`. Flags default-off → no behavior change (interest accumulator and offline blocks skipped).
- NOTE: as with B1, the headless preview doesn't run `requestAnimationFrame` / offline progression, so the runtime effect couldn't be observed. Verified by inspection: sub-linear interest can't run away, offline ferment is food-clamped and non-negative, all vars in scope, pure numeric ops. Observable once unlocked in a running game (dev mode makes that easy).

## 2026-06-10 Research unlock gate → population 200; dev mode force-unlocks research

- Research-center unlock condition changed from **food ≥ 10,000** to **population (生体) ≥ 200** (`RESEARCH_UNLOCK_POP = 200`, checked against `G.tot` in both the live and offline unlock checks). Updated the static lock note, the dynamic lock note (`研究未解放: 生体が200匹に達すると解放されます（あと N匹）`), the overview "next" text (`生体 G.tot/200`), and the not-yet toast (`研究は生体200匹で解放されます`). `RESEARCH_UNLOCK_FOOD` is kept but no longer gates the unlock.
- **Dev mode** (5 s long-press on 描画設定 `#btn-render-settings-pub`, or `?dev=1`) now also calls `unlockResearchSystem()` (+ `updateResearchUI()` on the long-press path) so the research tab is openable in dev mode regardless of the gate. Idempotent (no-op if already unlocked).
- Verified: loads with no console errors; at `G.tot = 8` the lock note reads `🔒 研究未解放: 生体が200匹に達すると解放されます（あと 192匹）。` (200−8). (Per request, no further gameplay testing.)

## 2026-06-10 Research B1: hygiene branch enrichment — waste recycling + cleanliness bonus

Purpose:
- Roadmap slice **B1 (衛生の資源化)**: the hygiene branch was the dullest (only reduced waste generation). Give waste a *use* and cleanliness a *payoff* so managing the nest matters. Two new breakthrough nodes; no new branch.

Existing context:
- Larvae generate waste per room (`n.invWaste += larvae × WASTE_RATE_PER_LARVA × wasteGenMul × dt`), and high waste already has a downside: it slows larva→adult growth (`wasteCoef = 1 − WASTE_SLOW_MAX × wasteRatio`, `wasteRatio = larvaWaste / (larva × WASTE_FULL_PER_LARVA)`). Workers haul waste to waste rooms.

Changes:
- **衛1 廃棄物リサイクル** (`hygiene_recycle`, breakthrough, flag `wasteRecycle`): in the live waste-accumulation loop, each room converts a fraction of its `invWaste` to food (`WASTE_RECYCLE_RATE 0.12`/s, food = waste × `WASTE_RECYCLE_FOOD 3`) and reduces the waste. The chore becomes income *and* gets cleaned (which also eases the growth slowdown — double win).
- **衛2 清潔なコロニー** (`hygiene_clean_bonus`, breakthrough, flag `cleanBonus`): conditional global bonus — when the colony's larva-room waste ratio is below `CLEAN_THRESHOLD 0.25` (clean), worker food production is ×`(1 + CLEAN_BONUS 0.20)`. Computed each tick into `S._cleanMul` from the already-computed `larvaTotal`/`larvaWasteTotal`, multiplied into `prodPerSec` (1-tick lag, default `|| 1`). Rewards keeping waste hauled/recycled, and pairs with 衛1.
- Both are `flag` effects → the A1 preview shows `効果: 解放`, no new bonus keys. Constants grouped with the other `WASTE_*` consts and tunable.

Verification (preview):
- Loads with no console errors; research tree now **42 nodes**; both hygiene nodes render with correct names + `効果: 解放`. Flags default-off → `S._cleanMul` is 1 and the recycle block is skipped, so existing behavior is unchanged.
- NOTE: the headless preview does not run `requestAnimationFrame`, so the live food/larva simulation (where these mechanics execute) is frozen and the runtime effect couldn't be observed here. Verified by inspection instead: additions are surgical, inside the existing proven loop sections, all referenced vars in scope, pure numeric ops with no throw path, and guarded so flag-off is a no-op. Effects are observable once the nodes are unlocked in a running game.

## 2026-06-10 Research A2: infinite-node milestone rewards (節目報酬)

Purpose:
- Roadmap slice **A2 (無限の節目報酬)**: repeatable `*_inf` nodes were flat `+x%/Lv` forever (thin). Add **milestone rewards** at Lv10/25/50 so the infinite grind has goals ("push to the next 節目"), a chunky payoff, achievement feedback, and a "極" look when fully mastered.

Changes:
- **Central table** `RESEARCH_MILESTONES` (keyed by node id) + accessor `getNodeMilestones(def)` (falls back to `def.milestones` if a node ever declares them inline). Keeps node defs clean. Milestone schema: `{lv, mul:{key,add}, flag?, label}` — `mul` adds to a bonus key, `flag` is reserved for future qualitative rewards (automation/conditional), so they slot into the same engine later.
- **Engine**: `recomputeResearchBonuses` applies, for each owned node, every milestone with `lv ≤ nodeLevel` (adds `mul.add` to `muls[key]`, sets `flag`). Layered on top of the per-level accumulation; goes through `getResearchBonus`, so effUp applies like everything else.
- **Content**: milestones on 8 core infinite nodes (gather/brood×2/queen×2/room/golden×2) at Lv10/25/50 with chunky boosts to their own key (e.g. `gather_inf` Lv10 +30%, Lv25 +50%, Lv50 +100%). Tunable.
- **UI**: new `getResearchMilestoneText(def)` shows `★節目 achieved/total｜次 LvN: label（あと◯）` (or `全達成（極）`), wired into the tree tooltip and a classic-card line. `isResearchMastered(def)` adds `is-mastered` → CSS golden glow on the node dot + level badge (the "見た目変化" reward).
- **Juice**: `buyResearchNode` toasts `✨ 節目 LvN: label！` when a purchase crosses a milestone level.

Verification (preview):
- Every milestone node shows both the A1 effect line and the `★節目` line; `gather_inf` (Lv0) `★節目 0/3｜次 Lv10: 採集+30%（あと10）`, `room_expand` (Lv5) `…（あと5）` — achieved count and remaining-Lv countdown correct. None mastered (no node at Lv50) → `is-mastered` off, as expected. No console errors; A1 effect previews still correct (`room_expand +31%→+38%`), confirming the milestone insertion didn't disturb the existing per-level aggregation. Milestone bonus + toast fire at `lv ≥ milestone` (no owned infinite node is past Lv10 in the test save, so not triggered live; logic mirrors the A1-verified accumulation path).

## 2026-06-10 Research A1: effect delta preview + fix stale research-bonus cache on load

Purpose:
- Roadmap slice **A1 (差分プレビュー)**: show each research node's effect as "current → next" so the player sees what a purchase actually does (e.g. `採集効率 +13%→+19%`), not just a flavor desc.

Changes:
- New data-driven helper `getResearchEffectPreviewText(def)` + key→label map `RESEARCH_PREVIEW_KEY`. For each `mul` effect it computes the **current total** (`getResearchBonus`/`getResearchBonusRaw`, matching how the game consumes each key) and the **next-level total** (current + the increment this purchase grants). The increment follows the exact aggregation rule (`firstLevel` only on the 0→1 step, else `perLevel`); effUp is applied only for keys the game reads through `getResearchBonus`. Integer keys (`tapEggBonus`, `buildParallel`) render as `1→2個/箇所` from a base of 1; flag nodes render `解放`/`解放済`; maxed/owned show `…(最大)`. Unknown keys are skipped (never a misleading number).
- Wired into both views: tree node `title` tooltip (`renderResearchTreeNode`) and a new inline `.research-node-effect` line on the classic card (`renderResearchNodeCard`).

Bug fix (surfaced by A1):
- **Research bonuses were not applied after loading a save.** `G.fromSave()` set `this.research = d.research` + `ensureResearchState(this)` but never called `invalidateResearchBonuses()`. If `getResearchBonuses()` ran at any point before the save was applied, the empty cache built then stuck (cache only recomputes when null, and load never nulled it). Result: `getResearchBonus(key)` returned `×1.0` for **every** key after a reload until the next research purchase — i.e. all owned research silently did nothing. Added `invalidateResearchBonuses()` right after `ensureResearchState(this)` in the load path. (Prestige goes through a reload, so it's covered by the same fix.)

Verification (preview, effUp Lv5 → ×1.25):
- Before fix: every owned node showed current `0%` (cache empty). After fix, reload → `gather_1` (owned) `採集効率 +13%(最大)`, `gather_inf` (shares key) `+13%→+19%`, `room_expand` (Lv5) `部屋容量 +31%→+38%`, `numbers_win` (firstLevel, raw) `兵隊コスト 0%→-40% / 兵力 0%→-20%`, `queen_double_lay` `タップ産卵 1→2個`, `golden_blessing` `黄金バフ 0%→+63%`. Classic inline line matches. 40 nodes render, no console errors/warnings. In-game brood multiplier now reflects research (e.g. `卵→幼虫 ×108`) confirming the cache fix applies to live gameplay, not just the tooltip.

## 2026-06-10 Research tree expand modal: multi-column layout (no longer tiny on wide screens)

Purpose:
- In the `⛶` expand modal the tree (a vertical stack of branch lanes) is tall and narrow. Fitting one column to both axes hit the scale floor (~0.55×) and rendered a tiny tree in a narrow centre strip with huge empty left/right margins — pointless on a large screen (user report).

Changes:
- `computeResearchTreeLayout(columns)` now takes a column count (default 1 = unchanged single column for the in-panel mini tree). For `columns > 1` it precomputes each lane's height, then packs lanes greedily into N equal-width columns (`LANE_COL_GAP = 20` between columns) — each lane drops into the currently-shortest column to balance heights. Node `cx` and the lane band gain the column's `left` offset; lane bands now carry explicit `left`/`width` (overriding the CSS `left:0;right:0`). The `columns = 1` output is byte-identical to before, so the panel mini tree is untouched.
- `buildResearchTreeInner(rs, columns)` threads the count through; `renderResearchTree` (panel) still calls it with 1.
- Replaced `getResearchTreeModalScale()` with column selection inside `renderResearchTreeModal()`: it tries `columns = 1 … min(6, branchCount)`, computes the fit scale (`min(width-fit, height-fit)`, clamped `0.6–1.7×`) for each, and picks the count that **maximizes the scale** (ties favour fewer columns / less whitespace). The chosen layout is transform-scaled in `.rtree-modal-stage` as before.
- Bumped `.rtree-modal-box` `max-width` 1500 → 1700px so very wide screens can reach ~1× instead of being width-capped.

Verification (preview):
- 1600×900 (modal body 1504×765): **3 columns** (lane lefts 0 / 550 / 1100), **scale 0.883** (was ~0.55), stage 1440px = **96% width fill**, **0px vertical & horizontal scroll** — all 9 lanes / 40 nodes visible at once. Tallest column bottom 742px < 765px body (nothing clipped). No console errors/warnings.
- In-panel mini tree: still **1 column** (lane lefts `[0]`), 9 lanes — unchanged.
- Mobile 375×812: falls back to **1 column**, scale 0.6, horizontal scroll 0, vertical scroll only (same UX as before) — no regression.

## 2026-06-09 Builder target stickiness and dig-start movement

Purpose:
- Builders could appear to switch digging locations mid-construction in the early game, and could snap from a room center to a tunnel edge when expanding from that room.

Changes:
- `rebuildBuilderAssignments()` now restores unfinished targets from the previous assignment frame before choosing new targets, so active digs stay reserved until completion.
- Added `moveBuilderToDigEdgeStart()` and use it before `dig_pick` starts moving along the dig edge, so a builder already inside the source room walks to the edge start instead of teleporting there.

## 2026-06-09 Raid combat: stronger body-blocking and no early breach resolve

Purpose:
- Foot-stopping felt weak because enemies could slip through a soldier cluster, and a raid could end as soon as one side breached enough even while the other side was still fighting.

Changes:
- `refreshRaidEnemyEngagement()` now marks every living enemy inside each surface soldier's block radius as engaged, instead of only the nearest one. This makes `oshiai` / `blockRadius` slow and poison the local enemy cluster, not just one body.
- Raid attack resolution now waits until `getLivingRaidEnemyCount() <= 0`; breach threshold still determines loss, but only after all enemies have either died or breached.

## 2026-06-09 Research balance: costs x8 and defense nodes leveled

Purpose:
- Research was too cheap overall, and the defense nodes `oshiai` / `numbers_win` should be levelable like poison concentration.

Changes:
- Added `RESEARCH_GLOBAL_COST_MUL = 8` and applied it to normal research node costs and meta insight upgrade costs.
- Made `oshiai` infinite with `costGrowth:1.6`: Lv1 keeps the old +50% block radius, later levels add +20%/Lv.
- Made `numbers_win` infinite with `costGrowth:1.6`: Lv1 keeps the old soldier cost -40% / power -20%, later levels add cost -10%/Lv and power -5%/Lv.
- Extended research `mul` effects with optional `firstLevel` so old saves at Lv1 keep their previous effect while repeatable levels can use a smaller incremental value.

## 2026-06-09 Builder crew assist: extra builders now modestly speed active digs

Purpose:
- Hiring more builder ants should feel useful even when normal construction keeps `stackLimit=1` and `build_multitask` has not opened more parallel sites yet.

Changes:
- Added a saturated crew-assist multiplier to `updateBuilderLogic()`: formally unassigned builder ants are shared across active dig targets and multiply progress by `1 + 1.50 * idleShare / (idleShare + 7)`.
- Kept the balance controls intact: normal rooms still have `stackLimit=1`, special reserved construction keeps its existing stacking rules, and `build_multitask` still only controls simultaneous construction sites.
- Debug/stat UI now reports `assist xN.NN`; the builder hire tooltip mentions that spare builders modestly help digging, capped at +150%.

Verification target:
- 1 builder = x1.00 assist, 2 builders on one normal dig = about x1.19, 5 builders = about x1.55, 10 builders = about x1.84, and the assist bonus never exceeds +150%.

## 2026-06-09 Research: 女王枝 (Queen branch) — egg-laying engine + colony-mother boosts

Purpose:
- New default-unlocked research branch focused on the queen: speed up auto-laying, lay multiple eggs per tap, raise the population cap, and add colony-wide "majesty" perks. Fills the slot between the Golden and (unimplemented) Expedition branches.

Changes:
- `RESEARCH_BRANCH_DEFS`: added `{ id:'queen', label:'女王枝', icon:'👸', accent:'#d946ef', desc:'産卵と女王の威厳' }` (before Expedition). `makeDefaultResearchState()` marks `queen:true`, so the branch is unlocked by default like Golden.
- Six new data-driven nodes (`RESEARCH_NODE_DEFS`):
  - `queen_vitality` (root): `mul layMul +0.25` — auto-lay ×1.25.
  - `queen_fertile` (infinite, `costGrowth 1.5`): `layMul +0.06`/Lv.
  - `queen_double_lay` (max 3, `costGrowth 2.2`): `mul tapEggBonus +1`/Lv.
  - `queen_embrace` (infinite, `costGrowth 1.6`): `mul popCap +0.08`/Lv.
  - `queen_majesty` (breakthrough): `flag queenAllSeasonLay`.
  - `queen_pheromone` (breakthrough): `mul gatherFood +0.20` (reuses the Gather-branch key).
- Wiring:
  - Auto-lay: both lay loops (live + offline) now multiply `layRate *= getResearchBonus('layMul')` ahead of the existing global/season multipliers.
  - Tap-lay: new `getTapEggCount()` = `1 + floor(Σ tapEggBonus)` (raw accumulator, no effUp since eggs are integer). `tryLayEgg()` lays `n` eggs at once, rolls a golden egg per egg, batches them into `G.eggs` / `addEggToQueenRoom(n, goldenCount)`, and the feedback shows `+n` (plus a "黄金の卵がN個産まれた！" toast when several goldens land).
  - Pop cap: `caps.pop` is multiplied by `getResearchBonus('popCap')` after the rest-room bonus.
  - Season resilience: `getSeasonLayMul()` returns `max(1, seasonLayMul)` when `queenAllSeasonLay` is set, so autumn/winter no longer drop auto-lay below ×1.
  - Worker foraging: `queen_pheromone` reuses `gatherFood`, so it stacks additively with the Gather branch through the existing `getResearchBonus('gatherFood')` path (no new wiring needed).

Verification (preview, served index.html):
- Reloaded; no console errors, game boots (V23.0). `G.research.unlockedBranches` includes `queen`.
- Research tree renders the 👸 女王枝 lane and all six nodes (`女王の活力 / 多産の系譜 / 重ね産み / 女王の包容力 / 女王の威厳 / 女王フェロモン`); overview total is `9/40` (six queen nodes added). Unbought, every new `mul` key defaults to ×1, so behavior is unchanged until a node is purchased.

Note:
- The index.html implementation landed in a prior session, but the matching CURRENT_SYSTEM_OVERVIEW.md / DEVELOPMENT_LOG.md updates failed at the time (an edit whose `old_string` didn't match the live text), so this commit catches the docs up alongside the code.

## 2026-06-08 Mobile fix (real root cause): vertical scroll stalls over the tree (nested pan-x scroller)

Purpose:
- Still reported after the horizontal-scroll fix: in the research tab the **vertical** scroll "stops partway", but **only in the 系統樹/tree view — classic view is fine**.

Findings:
- The only structural difference between tree and classic is the nested `.rtree-scroll` (a horizontal scroller, `touch-action: pan-x`, `overflow-x:auto / overflow-y:hidden`) that spans the full vertical extent of the tree. A vertical drag starting on it is supposed to delegate to `#control-panel`'s `pan-y`, but on a real device this delegation is unreliable — the vertical scroll stalls mid-gesture. (Classic view has no nested scroller, so `#control-panel` scrolls cleanly.) The previous horizontal `scrollLeft` fix was real but not the main complaint.
- Note: this is a real-device touch-action behavior; headless Chrome (mobile-emulated) can't reproduce the stall, so the structural change below is the diagnosis-driven fix, to be confirmed on a phone.

Changes (mobile only, `@media (max-width: 520px)`):
- Turned `.rtree-scroll` into a **self-contained 2D scroll box**: `overflow:auto` (was `overflow-y:hidden`), `touch-action: pan-x pan-y` (was `pan-x`), `overscroll-behavior: contain`, `max-height: 46vh`. Now the tree owns BOTH axes itself (no vertical delegation to `#control-panel`), exactly like the expand modal's `.rtree-modal-body` (which scrolls fine). This removes the nested-scroller conflict that stalled vertical scrolling. Desktop is untouched (keeps `pan-x` + the wheel-redirect handler).
- JS: the rebuild scroll-position preserve now restores BOTH `.rtree-scroll.scrollLeft` AND `.scrollTop` (the box is the vertical scroller on mobile now; on desktop `scrollTop` is always 0 so it's a no-op).

Verification (preview, mobile 375×812):
- `.rtree-scroll` computed `overflow-y:auto`, `touch-action:pan-x pan-y`, `overscroll:contain`, `max-height:373px` (46vh); content 1912px tall scrolls inside the 386px box (vertically scrollable) and 542px wide inside 338px (horizontally scrollable).
- Across 80 detected rebuilds, all 251 `scrollTop` samples stayed at 300 and all 251 `scrollLeft` stayed at 100 (0 resets) — both axes preserved.
- No console errors; syntax check passed (15,370 lines). Classic view and desktop unaffected.
- The actual touch stall must be confirmed on a real phone (not reproducible headless).

## 2026-06-08 Mobile fix (root cause): research tree horizontal scroll snapped back to left

Purpose:
- The previous scroll fix (deferring rebuilds during scroll) was not enough — the user still reported the research tab (especially the 系統樹/tree view) scroll "stops working partway".

Findings (reproduced on mobile 375×812, not synthetic this time):
- Real root cause: `updateResearchUI()` rebuilds `#research-branch-list` via `innerHTML = renderResearchTree(rs)`, which **recreates the `.rtree-scroll` element** every time the tree HTML changes (constantly in play). A fresh element starts at `scrollLeft = 0`, so the tree's **horizontal** scroll position is reset to the left on every rebuild. Scrolling right to reach deep nodes kept snapping back → "scroll doesn't work".
- Verified directly: `#control-panel.scrollTop` (vertical) is **preserved** across the rebuild (the scroller element isn't recreated, only its descendant is), but `.rtree-scroll.scrollLeft` (horizontal) went 120 → 0 on each `innerHTML` swap. With a `MutationObserver`, `.rtree-scroll` was recreated 77× during a rebuild storm.

Changes:
- In `updateResearchUI()`, around the branch-list `innerHTML` replacement: capture the old `.rtree-scroll`'s `scrollLeft` before, and restore it onto the new `.rtree-scroll` after. Vertical scroll needs nothing (already preserved). Classic view has no `.rtree-scroll` (`scrollLeft` 0 → no-op), so it's unaffected.

Verification (preview, mobile):
- With the fix, across **77 detected rebuilds** (each recreating `.rtree-scroll`), all 239 sampled `scrollLeft` values stayed at 140 (0 resets) — horizontal position is now preserved. No console errors; `new Function` syntax check passed (15,365 lines).
- The prior rebuild-deferral guard is kept (it preserves momentum during an active flick); this change fixes the post-settle snap-back that the guard didn't cover.

## 2026-06-08 Mobile fix: research tab scroll stalls mid-flick

Purpose:
- On mobile the research tab felt unstable — scrolling stopped partway.

Findings:
- `updateResearchUI()` runs every frame and replaces `#research-branch-list` (the tree), `#research-overview`, and the meta panel innerHTML whenever their HTML changes. The tree/overview HTML changes constantly in real play (affordability flips as cookies move; the tree even re-renders ~12×/sec). Mutating the scrolled subtree during an inertial (post-flick) scroll kills the momentum on mobile WebKit/Blink → "scroll stops partway".
- The existing `S._researchInteracting` guard only covered the active touch (`pointerdown`→`pointerup`). After `pointerup`, momentum scrolling continues but the guard was already cleared, so a rebuild lands mid-momentum. Also `#research-overview` was rebuilt with **no** guard at all.

Changes:
- Extended the guard to cover scrolling + momentum: a `scroll` listener (capture) on `#control-panel` (the persistent vertical scroller — capture also catches the nested `.rtree-scroll` horizontal scroller) and on `.rtree-modal-body` re-arms `S._researchInteracting` for 450 ms on every scroll event (touch-drag and inertia both fire scroll events continuously), so rebuilds are deferred until ~0.45 s after scrolling settles. `pointerup`/`pointercancel` now arm a 350 ms delay (instead of clearing instantly) to bridge the gap until the first momentum scroll event. Refactored the guard to a single `arm(ms)` helper.
- Added the `!S._researchInteracting` guard to the `#research-overview` rebuild (previously unguarded).

Verification (preview, mobile 375×812):
- Dispatching a `scroll` event on `.rtree-scroll` (descendant) and on `#control-panel` both set `S._researchInteracting=true` (capture listener catches descendant scrolls). 
- Simulated continuous scrolling on `#control-panel` while flipping affordability 55×: `#research-branch-list` was rebuilt only **1×** (the initial frame) and `interacting` stayed true — i.e. rebuilds are suppressed during scroll, so momentum is no longer interrupted. After stopping, the guard cleared (`interacting=false`) and per-frame rebuilds resumed (110× over the next ~8.6 s), so the UI still updates once scrolling settles.
- No console errors; `new Function` syntax check passed (15,356 lines).

## 2026-06-08 Research: builder branch ×4 (geology) + 英才教育 (brood, golden rearing)

Purpose:
- Five new data-driven research nodes: builder QoL/scaling in the geology branch, and a golden-rearing node in the brood branch.

Changes (geology, 表示名は「地質枝」のまま):
- `build_multitask` マルチタスク (leveled max3): `calcBuilderTargetCap()` now gates simultaneous construction sites on the research level — `min(1 + researchLevel('build_multitask'), workSlots, BUILDER_ASSIGNMENT_MAX_TARGETS=4)`. **Base = 1 site (no parallelism); research unlocks 2→3→4.** Old `2+√slots` formula removed.
- `offline_build` 鬼の居ぬ間も！ (breakthrough, flag `offlineBuild`) + `offline_build_speed` 夜なべ建築 (infinite, `offlineBuildSpeed` +20%/Lv): new `runOfflineBuilding(sec)` (called at the end of `calcOffline`) steps the existing `updateBuilderLogic()` at `OFFLINE_BUILD_EFF_BASE(1/3) × offlineBuildSpeed` (capped 1.0). Because it reuses the live builder logic, target cap / band fill / depth lock all apply, so it can't runaway (plus `OFFLINE_BUILD_MAX_STEPS=1500`). `advanceDigEdge`/`maybeShiftBand` suppress toast/fx while `S._offlineBuilding`; a single summary toast reports rooms built.
- `room_expand` 増築 (infinite, `roomCapacity` +5%/Lv): `G.recalc()` scales the per-room capacity contribution of food rooms (`+1000`) and nurseries (`+150 pop/egg`) by `getResearchBonus('roomCapacity')` (base/200·50·50 unchanged).

Changes (brood):
- `golden_brood` 英才教育 (breakthrough, flag `goldenBrood`, prereq brood_2): golden-rearing priority + acceleration.
  - **Baseline nerf**: the within-room golden-first bias (previously `takeGolden=min(haveGolden,take)` = full priority for everyone) is now blended toward proportional via `getGoldenRearPriority()` — base `GOLDEN_REAR_BASE_PRIORITY=1/3`. New helper `blendGoldenTake(take, haveGolden, haveTotal, p)` = `floor(prop + p*(full-prop))`, applied in `convertEggToLarvaInRooms`/`consumeLarvaeFromRooms` (logical totals unchanged → invariant-safe).
  - **英才教育**: `p=1.0` (full priority) + rooms processed golden-first globally + `accelerateGoldenBrood(dt)` (new) converts EXTRA golden eggs→larvae and larvae→adults at `GOLDEN_BROOD_ACCEL(0.5)`× the base brood rate (updates G totals before calling the conversion fns → invariant-safe). Called in live `update()` and in `calcOffline`.

Verification (preview, headless eval; globals `G`/`S` only):
- Syntax: `new Function` parse OK (15,350 lines, 0 errors). No console errors across all tests, including a real offline-calc reload.
- All 5 nodes render in the correct branches (⛏️/🥚), correct lock/breakthrough state, costs reflect meta costDown.
- マルチタスク: 30 builders, build_multitask Lv0 → `S.buildAssignments.targets` = 1 site; Lv3 → 4 sites (workSlots 12). (`researchLevel` is read directly, no cache.)
- 増築: room_expand Lv4 + effUp meta(5) → `roomCapacity` ×1.25; `G.caps.food`/`egg`/`pop` match `base + roomCount × floor(contrib×1.25)` exactly.
- オフライン建築: rewound the save timestamp 2h and reloaded → `calcOffline` ran `runOfflineBuilding`; visible rooms 42→50 (+8), completed edges 66→75, offline modal shown, no errors.
- 英才教育: a 30%-golden nursery — golden_brood OFF → 44% of converted eggs were golden (1/3 blend between proportional 0.30 and full 1.0); ON → 100% golden (full priority). Egg/larva totals conserved (invariant held).

Note: the offline test overwrote the preview's localStorage save with test state (the in-page backup was lost on reload). Players' own browser saves are unaffected; only this preview instance.

## 2026-06-08 Cookie boost (甘い香りの欠片): appearance frequency reduced to 1/10

Purpose:
- User reported the cookie-boost lucky target (`甘い香りの欠片`) appears far too often — "shows up every time I open the game".

Findings:
- The boost cycle is `hunting → available(15s) → active(10s)/cooldown(MAJOR_ACT_COOKIE_CD=12000s/3h20m)`. On paper the 3h20m cooldown dominates (~1 appearance / 3.4h), which contradicted the report.
- Root cause: **`S.majorActives` is not persisted.** It is initialized in the `S` literal (`cookie:{state:'hunting', cdUntil:0, pity:0, nextRollAt:0}`) and used at runtime, but `serializeWorld()`/`toSave()`/load never touch it (confirmed: the only references are the init + the runtime/UI sites). So every page load restarts a fresh hunt and the cooldown is effectively bypassed across sessions. The perceived frequency is governed by the **hunting roll**, not the cooldown — the target appears ~119 s (~2 min) after each open.
- Therefore the correct lever for "1/10 appearance frequency" is the roll chance, not the cooldown (raising `cd` would do almost nothing for someone who reopens the game).

Changes:
- Reduced the three hunting-roll probabilities to 1/10: `MAJOR_ACT_COOKIE_BASE 0.006→0.0006`, `MAJOR_ACT_COOKIE_INC 0.0015→0.00015`, `MAJOR_ACT_COOKIE_MAX 0.03→0.003`. Expected hunt time ~119 s → ~1190 s (~20 min); P(appear within first 15 s) ~4.4% → ~0.45%. Roll logic, cooldown, window, active duration, and the x100 multiplier are unchanged. Added a code comment explaining the non-persistence rationale.
- Did NOT change `MAJOR_ACT_COOKIE_CD` and did NOT add persistence (out of scope for this request; noted for a possible future decision).

Verification (preview):
- Reload: no console errors (constants parse/load fine).
- Empirical: reset `cookie` to a fresh hunt, ran ~60 rolls (timeScale-boosted). `pity` capped at exactly `0.0024` = the NEW `max-base` (0.003−0.0006), not the old `0.024` — confirms the new constants are live. After 60 rolls it was still `hunting` (no win), consistent with the ~10× lower chance (old ~3% cap would have won within 60 rolls ~84% of the time; new ~0.3% cap ~16%).

## 2026-06-08 Research tree: new 黄金枝 (Golden branch) + 地質枝 深度IV (Depth IV)

Purpose:
- Two research-tree expansions on the data-driven engine: a brand-new Golden branch (strengthens the existing golden finger / golden egg / golden buff lineage) and a 4th depth node in the Geology branch.

Changes (Depth IV):
- New `GEO_DEPTH_4_NODE = 'geo_depth_4'` (cost `MAJOR_DEPTH4_COST = 90`🍪), geology branch, breakthrough, prereq `geo_depth_3`. No `G.major.depth4` legacy plumbing (never a dock purchase).
- `hasDepth4Unlock()` = `hasDepth3Unlock() && hasResearchNode(GEO_DEPTH_4_NODE)`; `G.getDepthUnlocked()` now returns `1 + d2 + d3 + d4` (max 4). `requiredDepthForBand()` already returned `4` for band index 3+, and world height (`btm=max(H*3, dp(12000))`) easily clears band index 3's bottom (~dp(2220)) — so no band/world changes were needed; depth IV simply unlocks the next dig layer.
- Condition: prereq depth III + builder Lv 6 (escalation: II=Lv2, III=Lv4, IV=Lv6). Added condition-met/text, `ensureResearchState` chain-fill (`depth4⇒depth3⇒depth2`), purchase queen-whisper, and a `depth4` colony goal (reward 🍪400, after depth3).
- Emergent effect (intended, not a bug): underground invaders gate on `S.band.index >= INVADER_MIN_DEPTH (3)` ("第4層〜"). The band only reaches index 3 at depth IV (II→idx1, III→idx2, IV→idx3), so before this change `band.index` capped at 2 and that invader spawn path was unreachable. Depth IV is what finally activates underground invaders — a real payoff for the new node.

Changes (Golden branch — full set, 5 nodes; `id:'golden'`, 👑, accent `#fbbf24`, default-unlocked):
- `golden_1` 黄金の輝きI (one-time root, condition = 黄金の指 Lv1) `mul goldenEggChance +0.5`; `golden_shine_inf` 黄金の輝き (∞, growth1.5) `+0.15/Lv`; `golden_blessing` 黄金の祝福 (one-time) `mul goldenBuffPower +0.5`; `golden_blessing_inf` 豊穣の祝福 (∞, growth1.6) `+0.20/Lv`; `golden_auto` 黄金の自動産卵 (breakthrough, flag `goldenAutoLay`).
- Wiring (beneficial muls use effUp-boosted `getResearchBonus`):
  - `goldenEggChance`: `getGoldenFingerChance()` return ×`getResearchBonus('goldenEggChance')` (covers tap + auto;指Lv0 base=0 so no-op).
  - `goldenBuffPower`: `getGlobalFoodMul/LayMul` = `1 + (mul-1)×bonus`, `getGlobalCookieAdd` = `add×bonus`.
  - `goldenAutoLay` (new behavior): when unlocked, the live auto-lay (`update`) and offline auto-lay (`calcOffline`) roll golden eggs at `getGoldenFingerChance() × GOLDEN_AUTO_LAY_FACTOR(0.5)`; live rolls per-egg + `addEggToQueenRoom(addEgg, gold)`, offline adds the expected count to `G.goldenEggs` and lets the existing `normalizeInventories()` distribute it. Golden-finger tooltip's "自動産卵では黄金卵は生まれない" line flips to "…生まれる(50%)" once unlocked.

Verification (preview, headless eval per MEMORY.md):
- Syntax: inline-script `new Function` parse OK (15,228 lines, 0 errors). No console errors across load and all tests.
- Depth IV: seeding the depth chain, `G.getDepthUnlocked()` returns 1→2→3→4. `geo_depth_4` renders in the geology lane as a breakthrough node.
- Golden branch: all 5 nodes render with 👑 / gold accent / prereq connectors; `golden_1` ready at 指Lv1, others locked; `golden_auto` shows breakthrough double-rim; costs reflect meta costDown (15→🍪12, etc.).
- Buying via the real tree UI: `golden_1` then `golden_auto` both bought (level 1 each).
- `goldenAutoLay` end-to-end: with the flag owned and `golden_shine_inf` inflated (chance≫1), 283 auto-laid eggs (qLv=50, zero taps) were ALL golden (ratio 1.000) and distributed to room `invGoldenEgg` (283). Confirms the flag gate, `goldenEggChance` bonus, `getResearchBonus` aggregation, and room distribution together.
- `goldenBuffPower` is wired identically to the proven `getResearchBonus` pattern and runs every frame without error (construction-verified).

## 2026-06-08 Defense research: おしあいへしあい (stall) and 数は何にも勝る (quantity)

Purpose:
- Two more defense-branch nodes forking off 顎強化 (soldier_jaw_2x).

Changes:
- `oshiai` (おしあいへしあい): one-time, `mul 'blockRadius' +0.5`. Wired in `refreshRaidEnemyEngagement` — soldiers count an enemy as engaged within `RAID_SURFACE_SOLDIER_BLOCK_RADIUS × getResearchBonusRaw('blockRadius')`, so a wider hold radius engages more enemies (more enemies slowed/poisoned, fewer breach).
- `numbers_win` (数は何にも勝る): one-time breakthrough, `mul 'soldierCost' -0.40` + `mul 'soldierPower' -0.20`. Cost wired in `G.getCost('soldier')`; power wired in `getSoldierPowerMul()` (used by both `getColonyCombatPower` and `getRaidSurfaceSoldierDamage`).
- Added `getResearchBonusRaw(key)` = `1 + Σ(perLevel×level)` WITHOUT the effUp meta multiplier, used for these fixed tradeoff effects (soldierCost/soldierPower/blockRadius) so the prestige "知識の結晶" can't amplify a −40%/−20% into something broken (e.g. negative power). Production muls keep using `getResearchBonus` (effUp-boosted).
- Defense lane is now 顎強化 → { 毒顎 → 毒の濃度, おしあいへしあい, 数は何にも勝る }.

Verification (preview):
- Both nodes render/buy. After `numbers_win`: soldier hire cost 1030 → 618 (×0.60 = −40% exact); soldier DPS 166.7 → 133.3 and 防衛力 1K → 800 (×0.80 = −20% exact); effUp meta did not amplify them. `oshiai` buys and aggregates `blockRadius`. No console errors; syntax check passed.

## 2026-06-08 Research tree: fix intermittent tap loss; poison fx purple

Findings:
- Research from the tree worked "sometimes" (押せたり押せなかったり). Cause: `updateResearchUI()` runs every frame and replaces `#research-branch-list` innerHTML whenever the tree HTML changes — and it changes whenever a node's affordability flips (cookies are constantly earned/spent in real play). If that rebuild lands between a tap's pointerdown and pointerup, the node the finger is on is destroyed and the click never fires. (Earlier checks missed it because they ran with a fixed huge cookie balance, so the HTML was stable.)

Changes:
- Added an interaction guard `S._researchInteracting`: set on `pointerdown` over `#research-branch-list` / `#research-meta` / the expand modal body (with a 1.5 s safety timeout), cleared on window `pointerup` / `pointercancel`. The three innerHTML replacements in `updateResearchUI()` (branch list, meta panel, modal body) are skipped while it is true, so the element under the finger survives the whole tap. After pointerup the next frame rebuilds normally.
- Poison-jaw fx (☠ above engaged enemies) recolored green → purple (`#c084fc`).

Verification (preview):
- `pointerdown` on a node set the flag true; window `pointerup` cleared it. With the flag forced true, a marked node (`data-tm`) survived a frame where its affordability changed (no rebuild); after clearing the flag the next frame rebuilt (mark gone). Buying still works (real click on a ready node completes). No console errors.

## 2026-06-08 Research: first "new effect" node — 毒顎 (Poison Jaw) soldier DoT

Purpose:
- Demonstrate the data-driven engine's "new behavior" path (phase-4 style): a research node that unlocks a brand-new combat mechanic, plus an infinite repeatable that scales it.

Changes:
- New defense-branch nodes: `poison_jaw` (one-time breakthrough, prereq `soldier_jaw_2x`, `effects:[{kind:'flag',flag:'poisonJaw'}]`) and `poison_conc` (infinite, prereq `poison_jaw`, `effects:[{kind:'mul',key:'poisonDmg',perLevel:0.15}]`, costGrowth 1.6). Defense chain is now 顎強化 → 毒顎 → 毒の濃度.
- New runtime (the only new code, ~12 lines): at the end of `updateRaidSoldiers()` (after `refreshRaidEnemyEngagement`, so `engagedBy` is current), if `hasResearchUnlock('poisonJaw')`, each living enemy with `engagedBy>0` takes `RAID_POISON_BASE_PCT(0.02) × getResearchBonus('poisonDmg') × maxHp × dt` via `damageRaidEnemy`, with an occasional green ☠ `fx`. Added const `RAID_POISON_BASE_PCT`.
- Illustrates the boundary: multiplier research = data only; a new behavior (poison/lifesteal/AoE…) = one small runtime hook gated by a research flag, then scaled by a repeatable mul key.

Verification (preview):
- Data/UI fully verified: both nodes render in the defense lane; `poison_jaw` is a breakthrough buyable after `soldier_jaw_2x`; `poison_conc` is infinite with exponential cost (Lv1–3 paid 5/8/13 = floor(6×1.6^Lv×0.85), the 0.85 = the meta costDown discount also applying correctly), next-cost 🍪20.
- Raid runtime: forced raids ran countdown→attack→result repeatedly with `poison_jaw` owned and **no console errors** (the poison tick executes during the attack phase). Could not watch the per-second DoT live because the preview fast-forwards the whole raid in one render step; the tick is correct by construction (uses the verified `damageRaidEnemy` + flag/mul aggregation). Recommend confirming the poison feel in a real-time raid.

## 2026-06-07 Research tree: feedback when a tapped node can't be researched

Purpose:
- User reported research couldn't be completed from the skill-tree view ("the button doesn't work").

Findings:
- Tree nodes ARE clickable and DO complete research: verified in preview that a real click (via elementFromPoint at the node center → topmost element is the node's child) on a ready+affordable node buys it (in both the panel tree and the expand modal); no overlay intercept, no transform hit-test issue. Tree HTML is not rebuilt every frame in steady state (0 mutations observed), so taps aren't lost to a mid-tap innerHTML replace.
- Real cause of the "doesn't work" feeling: unlike the classic cards (whose button is `disabled` when not researchable), tree nodes are always tappable, but `buyResearchNode` returns silently for locked/done/maxed nodes (only ready-but-unaffordable toasts). Early game has few cookies and deeper nodes are locked, so most taps did nothing visible.

Changes:
- Added `tryBuyResearchFromTree(nodeId)` used by both tree click handlers (panel `#research-branch-list` and `#research-tree-modal-body`). On a failed buy it now toasts the reason: locked → `getResearchNodeReason` (e.g. "前提: 採集効率I" / "枝ロック中" / "研究センター未解放"), done → "研究済みです", maxed → "このノードは上限です". Ready-but-unaffordable still uses `buyResearchNode`'s existing "資源が不足しています" toast.

Verification (preview):
- Ready+affordable: clicking gather_1 (cookie 100) completed it. Locked: clicking gather_2 (prereq gather_1 missing) toasted "前提: 採集効率I" and did not buy. No console errors; syntax check passed.

## 2026-06-07 Fix duplicate room tunnels (loops) and mobile left-edge clipping

Purpose:
- Builders again dug two routes to the same room (recurring complaint), and the mobile UI's left edge was slightly clipped.

Findings:
- Duplicate room: the earlier guard (`forcedRoomUnderConstruction`) only stops two separate same-type rooms. The remaining cause is `maybeAddLoop(nid)` called right after a new room is created in `expandMap`: it adds a second pending edge from the brand-new (still hidden) room to a visible node. While the room is hidden, both the parent edge and the loop edge are "frontier" edges (one endpoint hidden), so builders dig both → two tunnels to the same room. That call is the only loop creator, so every loop manifests as this double-dig.
- Mobile left clip: `safe-area-inset` was applied only to top/bottom, never left/right. With `viewport-fit=cover`, full-bleed bars (`#top-bar`, `#control-panel`) sit flush to the physical edge, so on notched/curved phones the left content is clipped. Not reproducible in the emulator (insets=0), which is why earlier width checks looked full-width.

Changes:
- Disabled the loop call: commented out `maybeAddLoop(nid)` in `expandMap` so each new room gets exactly one tunnel (nest is now a tree, `loops≈0`).
- Added horizontal safe-area padding: `#top-bar` and `#control-panel` mobile padding now use `max(8px|10px, env(safe-area-inset-left|right))`; `#next-goal-box` and `#mobile-menu-sheet` edge offsets use `calc(8px + env(safe-area-inset-left|right))`.

Verification (preview):
- Builder: fresh colony with 8 builders / high pop ratio, 600-frame scan — max pending edges per hidden room = 1 (no double-route examples).
- Safe-area: at 375px (inset 0) computed padding is unchanged (8px / 10px) → no regression; `env()` insets only add space on real devices.
- No console errors; `new Function` syntax check passed.

## 2026-06-07 Research engine — phase 3 (prestige meta currency "insight")

Purpose:
- Add the second loop: prestige (転生) grants a permanent meta currency that funds research-strengthening upgrades persisting across resets.

Changes:
- Permanent store `localStorage['antResearchMeta'] = {insight, meta:{costDown, effUp}}`, independent of the colony save so it survives prestige resets and reloads. `loadResearchMeta()` (called before `applyPrestigeBonus()` at startup) restores it into `G.insight`/`G.researchMeta`; `saveResearchMeta()` writes on purchase; `addInsightPermanent()` is a pre-reset read-modify-write.
- Earning: `computePrestigeInsight()` = `floor(sqrt(totalResearchLevels)+sqrt(G.tot/40))` (min 1). The prestige button adds it and passes `insightGain` via the existing `antPrestige` handoff; `applyPrestigeBonus()` toasts it after reload.
- Meta upgrades (`RESEARCH_META_DEFS`, insight cost `getMetaCost`=base×growth^lv): `costDown` (max 20) → `getResearchCostMul()` (−3%/Lv, floor −60%) used by `getResearchNodeCost`; `effUp` (∞) → `getResearchEffMul()` applied in `getResearchBonus` (=1+Σ×effMul). Both default 0 → behavior-neutral until bought.
- UI: `#research-meta` panel (purple) above the research lock note, shown once `prestigeCount>0`/`insight>0`/any meta level; `renderResearchMeta()` lists balance + per-upgrade level/next-cost; buys via `data-meta-buy` → `buyMetaUpgrade()`.

Verification (preview):
- Seeded `antResearchMeta` insight=500 → on reload `G.insight`=500, panel visible (balance 500, costDown 🧠2 / effUp 🧠3).
- Bought costDown×5: ferment_unlock cost 🍪30+🍃4K → 🍪25+🍃3.4K (×0.85 = −15%). Bought effUp×5: 食料生産 rose (effMul into getResearchBonus). Insight 500→393 (−107 = exact sum of scaled costs). Store persisted `{insight:393, meta:{costDown:5, effUp:5}}`.
- No console errors; `new Function` syntax check passed (15099 lines).

Not yet done: new-system unlock nodes (auto-gather/auto-research) + runtime, large-tree UI scaling.

## 2026-06-07 Fix mobile: nest cross-section hidden by opaque HUD overlay

Purpose:
- On mobile the nest cross-section (canvas) was not visible, and the UI looked off — both regressions from the dark UI refresh.

Findings:
- `#side-pane` is the full-screen HUD overlay (`position:absolute; inset:0; pointer-events:none`) on mobile; on desktop (`min-width:960`) it is repositioned to a relative ~420px right column.
- The UI refresh's panel-background rule listed `#side-pane` alongside the real panels, giving it an opaque `var(--pd-panel)` (rgba(8,18,20,0.94)) background + `backdrop-filter: blur(12px)`. On mobile that opaque overlay covered the whole canvas, hiding the nest. Desktop was unaffected because its `#side-pane` is the side column (own background from base + the desktop media rule).
- The "UI width not optimized" report could not be reproduced at the DOM level: at 375px everything is full-width (wrap/layout/game-pane/top-bar/control-panel = 375, tabs/dock fill 355), no horizontal overflow, viewport meta `width=device-width, initial-scale=1`. Likely the same broken-overlay perception, resolved by the fix.

Changes:
- Removed `#side-pane` from the refresh's opaque panel-background selector list, so the mobile HUD overlay is transparent again and the canvas shows through. Real panels (`#control-panel`/`#upgradeDock`/`.tab-card`/`.mobile-menu-card`/`.modal-box`) keep the dark panel background.

Verification (preview):
- Mobile 375×812: `#side-pane` background transparent / no backdrop-filter; nest cross-section (sky, surface, rooms, tunnels) renders; full-width, no horizontal scroll.
- Desktop 1280: `#side-pane` is the relative ~421px right column with its gradient background; game-pane 859px with the canvas visible — no regression.
- `new Function` JS syntax check passed.

## 2026-06-07 Research engine — phase 1+2 (data-driven effects, leveled/infinite repeatable nodes)

Purpose:
- Begin turning research into the late-game engine (per approved plan): data-driven effects so nodes scale to "vast", plus infinite repeatable upgrades fueled by cookie with exponential cost.

Findings:
- Effects were hard-wired per node (`hasResearchNode('id')` inside each helper), and `unlockedNodes[id]` was a boolean — neither scales to many/repeatable nodes.

Changes (phase 1 — data-driven, behavior-preserving):
- `unlockedNodes[id]` is now a numeric **level**; `ensureResearchState` normalizes old boolean saves to `1`. Added `researchLevel(id)`, `getResearchNodeMaxLevel(def)`; `hasResearchNode` = level>0.
- Added effect aggregation: node `effects:[{kind:'mul',key,perLevel}|{kind:'flag',flag}]`, `recomputeResearchBonuses()` → `_researchBonusCache{muls,flags}`, `getResearchBonus(key)`=`1+Σ(perLevel×level)`, `hasResearchUnlock(flag)`, `invalidateResearchBonuses()`.
- Migrated the 16 legacy nodes to `effects` data (gather/brood = mul, hygiene_1 = mul -0.10) and repointed `getGatherResearchMul/getBroodEggMul/getBroodLarvaMul/getWasteGenerationMul` at the aggregation — identical numbers.

Changes (phase 2 — leveled cost/buy + infinite repeatables + UI):
- `getResearchNodeCost(def, level)` = `floor(costCookie × costGrowth^level)` (food too; one-time=base; optional `getResearchCostMul()` discount hook for the prestige phase).
- `getResearchStatus` adds `maxed` (finite repeatable at cap) vs `done` (one-time). `buyResearchNode` increments level, deducts level-scaled cost, runs one-time side effects only on 0→1.
- `formatResearchCost` shows the next-level cost; tree nodes show a `Lv N` badge and `済`/`上限`. Status marks `✓`/`★`. CSS for `.rtree-node-lv` and `.is-maxed`.
- Added repeatable content: `gather_inf` (+5%/Lv gatherFood), `brood_egg_inf` (+4%/Lv), `brood_larva_inf` (+3%/Lv), all `max:Infinity, costGrowth:1.5`.

Verification (python http.server + preview):
- Backward-compat: a boolean `unlockedNodes` normalized to `1` via `ensureResearchState`/`G.save`.
- Phase 1 equivalence: buying gather_1+gather_2 raised 食料生産 13.49→16.87 (×1.25 = old 1+0.10+0.15 exactly); cookie 1000→997.
- Phase 2 repeatable: buying `gather_inf` 5× gave levels 1–5 with costs 3,4,6,10,15 (=floor(3×1.5^Lv)), Lv5 badge, next-cost 🍪22 shown, never "done". No console errors; `new Function` syntax check passed.

Not yet done (next phases): prestige meta currency `G.insight` + meta layer (`getResearchCostMul`/effect boosts), new-system unlock nodes (auto-gather/auto-research) + runtime, large-tree UI scaling.

## 2026-06-07 Product Design-style UI concept pass and refined dark refresh

Purpose:
- Try the Product Design-style workflow on the existing single-file Ant Colony app: generate multiple visual directions, choose a direction, and implement a CSS-centered refresh without touching gameplay or save data.

Changes:
- Copied the three generated concept boards into `design_concepts/` and documented the selected direction in `design_concepts/README.md`.
- Implemented the selected "refined current dark UI" direction with a late CSS override block in `index.html`.
- Polished HUD resource chips, the right/bottom control panel, tabs, upgrade dock cards, menu sheet, buttons, modals, stats sections, and focus states.
- Kept the existing `#top-bar`, `#control-panel`, `#control-tabs`, and `#upgradeDock` structure. No save key, localStorage payload, `G` / `S` state, or canvas-rendering logic was changed.

Verification:
- Inline JS syntax check passed with `new Function(...)` (1 script, 14898 lines).
- `git diff --check` passed with only existing LF-to-CRLF working-copy warnings.
- Headless Chromium responsive checks passed at 1280x720 and 390x844: top HUD, control panel, TAP button, tabs, dock grid, and stats modal were visible/usable with no console errors. Screenshots were saved under `qa_screenshots/`.

## 2026-06-07 Research tree: fix scroll trap, add large-screen expand modal

Purpose:
- Research tab scrolling stuttered/stopped partway, and the tree was cramped in the narrow control panel on large screens.

Findings:
- `#control-panel` is the vertical scroller (`overflow-y:auto; touch-action: pan-y`). The new `.rtree-scroll` (horizontal, `overflow-x:auto`) had no `touch-action`, so on touch/trackpad the nested horizontal scroller fought the parent for the gesture and vertical scrolling got stuck.
- The tree had only the in-panel (~355px) view, forcing horizontal scrolling and leaving big screens underused.

Changes:
- Scroll fix: `.rtree-scroll` now sets `touch-action: pan-x` + `overscroll-behavior: contain`, so vertical drags delegate to `#control-panel` (`pan-y`) and only horizontal drags pan the tree.
- Extracted the tree body into `buildResearchTreeInner(rs)` shared by the panel and a new expand modal.
- Added a large-screen expand modal: a `⛶` button (`data-research-expand`) in the toggle bar opens `#modal-research-tree` (94vw × 90vh). `renderResearchTreeModal()` re-renders the same tree scaled with `transform: scale()` to fit the modal width (`getResearchTreeModalScale()`, ~0.66–2.4×) inside a `.rtree-modal-stage` sized to the scaled extent for two-axis scrolling. Live-updates while open; closes on button / overlay click / Escape / switching to classic; re-fits on resize. The in-panel mini tree is unchanged.

Verification:
- Inline JS syntax check passed with `new Function(...)` (14869 lines).
- In-browser (1280×820): `.rtree-scroll` computed `touch-action: pan-x` (parent `#control-panel` `pan-y`); expand button present. Modal opened at 1229×764 showing all 16 nodes scaled 2.25× to fill width (stage 1193×2396, vertical scroll). Buying a node from inside the modal worked (gather_2 → done, cookie 213→211); close button hid the modal and cleared the flag. No console errors.

Follow-up (same day):
- Mouse-wheel still stalled in the in-panel tree (touch-action does not affect the wheel; `overscroll-behavior: contain` also blocked chaining). Fixed: changed `.rtree-scroll` to `overscroll-behavior-x: contain` and added a non-passive `wheel` listener on `#control-panel` that redirects vertical-wheel over `.rtree-scroll` to the nearest scrollable-Y ancestor (manual `scrollTop`), leaving horizontal-wheel to the tree.
- Expand modal over-zoomed (2.25× via width-fit) so only ~2 lanes showed. Changed `getResearchTreeModalScale()` to fit BOTH axes (min of width/height fit, clamped ~0.55–1.6×) so the whole tree is visible at once.
- Verified in-browser: a synthetic vertical `wheel` over a tree node scrolled `#control-panel` 0→220 (default prevented), while horizontal wheel left the parent unmoved. Modal now renders at scale 0.64 with stage 340×681 ≤ body 693 (all 7 branches / 16 nodes visible without vertical scroll). No console errors.

## 2026-06-07 Prevent builder ants from building duplicate rooms

Purpose:
- Stop multiple builder ants from digging two/three parallel rooms of the same type at once (reported as several orange dashed tunnels going to "the same room").

Findings:
- `getDigTarget()` is the only room/shaft creator and is called repeatedly by `rebuildBuilderAssignments()` to fill `workSlots` (up to `targetCap`=3 distinct targets). Within one rebuild, `forcedType` (chosen from pop/food ratios) is constant.
- Normal rooms have a stack limit of 1, so after the first slot creates and reserves a new `forcedType` room, the next slot could not reserve it (`isDigTargetReservable` false) and fell through to `expandMap()`/`forceExpandRoom()` again, creating a second/third room of the same type. The `existing:` and section-3 expand paths repeated this.
- Reserved special rooms (ferment/cookie/barracks) were already safe because they dig the existing unbuilt edge first (stack limit 3) and only expand when `*Pending > 0`.

Changes:
- In `getDigTarget()`, the `forcedType` branch now tracks `forcedRoomUnderConstruction` (set when any unfinished underground edge has a hidden node of `forcedType`). When true, it does NOT call `expandMap()`/`forceExpandRoom()` for that type, and section 3 returns `null` (skipping both the duplicate room and the fallback shaft) so the slot is left for other existing work or idle.
- Net effect: at most 1 under-construction room per non-shaft type; same-type rooms build sequentially. Dig speed and reserved-room flows are unchanged.

Verification:
- Inline JS syntax check passed with `new Function(...)` (14803 lines).
- In-browser, fresh game forced into the duplicate-prone state (6 builders, pop ratio high so `forcedType`=nursery, then food): over 150+240+360 frames the max concurrent unfinished rooms was 1 for every type (nursery, then food); `workSlots`=6 but only 1 target was assigned (no fabricated duplicates or junk shafts).
- Confirmed construction still progresses: the nursery edge `acc` rose to ~0.62/chunk (chunkSec≈6.7s), `edgeFrac` advanced to 0.62, and a new nursery completed (visible 1→2) before the system moved on to a food room. No console errors.

## 2026-06-07 Research tree visual overhaul (branch skill-tree, earthy theme)

Purpose:
- Replace the research tab's vertical card list with a game-style skill tree (per reference images), while keeping the old list as a fallback.

Findings:
- The research UI was DOM/HTML based: `renderResearchBranch()` / `renderResearchNodeCard()` build branch sections + node cards into `#research-branch-list`, rebuilt every frame by `updateResearchUI()` with a string-equality guard to avoid clobbering taps.
- `RESEARCH_NODE_DEFS` carry `branch` + `prereq` (same-branch chains, depth 0-3 via `getResearchNodeDepth()`) but no coordinates, so a tree layout must be derived at runtime.
- Purchases are delegated from `#research-branch-list` via `data-research-buy`; `buyResearchNode()` already guards non-ready/ unaffordable nodes, so any view can reuse the same delegation safely.

Changes:
- Added a view toggle (`#research-view-toggle`, `data-research-view="tree|classic"`), stored in `S.researchView` and persisted to `localStorage` (`RESEARCH_VIEW_KEY='ant_research_view_v1'`, default `tree`).
- Added the new `tree` view: `computeResearchTreeLayout()` lays branches out as horizontal lanes (columns by prereq depth, subrow stacking for shared depths); `renderResearchTree()` / `renderResearchTreeNode()` emit circular chamber nodes (`.rtree-node`) and curved SVG tunnel connectors (`.rtree-link`) into the shared `#research-branch-list`.
- Earthy/cave CSS theme: soil-gradient scroller, dug-out lane bands, branch-accent node rims, amber "tunnel" links, states `is-done`/`is-ready`(pulse)/`is-wait`/`is-locked`, `is-breakthrough` double rim. Tree is horizontally scrollable; node desc/reason shown via `title`.
- `updateResearchUI()` now renders the toggle and branches between `renderResearchTree()` and the preserved classic card list based on `getResearchView()`.

Verification:
- Inline JS syntax check passed with `new Function(...)` (14789 lines).
- In-browser (python http.server + preview), research unlocked + all branches opened: tree rendered 16 nodes / 9 links / 7 lanes with correct state classes (done 2, ready 5, locked 9, breakthrough 4); toggle switched tree<->classic (16 cards <-> 16 nodes) and persisted to localStorage; no console errors. Screenshot confirmed the earthy branch-tree look.

## 2026-06-06 Review builder AI and room expansion recovery

Purpose:
- Check builder ant behavior and nest expansion for suspicious edge cases.

Findings:
- Logical builder work is driven by `G.ants.builder` through `S.buildAssignments`, so visible builder count/render cap is not the construction-speed limiter.
- Normal nest expansion, `forceExpandRoom()`, and `advanceDigEdge()` still preserve the intended pending-edge and collision-checked placement flow.
- Cookie room and barracks unfinished-room recovery was inconsistent with ferment rooms: it used visible room counts as the placed count, so already placed but still hidden rooms could lose reserved priority after assignment rebuild/load.
- The screenshot showed ants and carried items collapsing onto the exact tunnel centerline, making busy routes read like a black/green rope instead of individual ants moving through a tunnel.
- The static soil/tunnel and fog cache reuse from the large-save performance pass could keep transforming an old cache even after `nodeVis` or `edgeFrac` changed. That made newly built shafts/rooms exist in simulation while the visible tunnel cutout and fog clearing stayed stale.
- Nurse idle room wandering was too twitchy: slot targets were reselected very frequently, so nurses appeared to dart around inside nursery rooms.
- When a nurse was assigned to idle-wander in a nursery/queen room different from its logical `a.node`, the visual position could move into that room while `a.node` stayed behind. When the wander ended, the next path update snapped the ant back to the old node, reading as a sudden disappearance.
- The attached save is a 91-ant `sprite`-mode case, so the remaining fast/popping room ants were mainly normal `S.ants` action actors rather than `S.antCrowd`.
- Workers and nurses could still snap from a room slot to the tunnel center as soon as a path task started, making room ants appear/disappear.
- Nurse care tasks still returned directly to `idle` after egg placement, larva feeding, or larva transfer. In an active nursery this could immediately assign another nearby care task and make one nurse look like it was moving too fast inside a single room.
- Nursery contents were drawn by packing larvae, eggs, and food from the first room slots every frame. When counts changed, existing dots could jump to different coordinates, which could read as a nurse or nursery object briefly appearing in several places.
- Root cause of the random-coordinate room flicker (dominant in `crowdSprite` mode): the crowd/overlay partition was unstable. `shouldDrawActionAntOverlayInCrowd()` excluded `idle` and plain `wander` action ants, and that same predicate is BOTH the crowd-overlay draw filter and the `getCrowdOverlayRoleCounts()` subtraction set. So every time an action ant flipped busy↔idle, the per-role overlay count changed by 1, the crowd role target (`G.ants − overlay`) changed by 1, and `syncAntCrowd()` added or removed a crowd ant of that role. New crowd ants are placed at a random in-room slot, so nurses/workers flickered at random coordinates inside rooms even though the total headcount was correct.
- Measured in-browser (synthetic 2040-ant colony, 30 stable frames): the OLD nurse overlay count took 13 distinct values (129–144) and the OLD worker overlay swung across 27 distinct values (43–110) — i.e. dozens of crowd ants spawning/despawning at random spots per fraction of a second.
- Secondary cause of in-room appear/disappear: `getActionAntCap()` used hard thresholds, so a metric hovering near a threshold made the cap flip-flop, mass-resizing `S.ants` (ants vanish in place; replacements spawn at the queen room via `spawnAnt`).

Changes:
- Added `getRoomNodeCountByType(type, includeHidden)` and kept `getFermentRoomNodeCount()` as a wrapper.
- Changed cookie room and barracks recovery checks to compare all placed nodes against visible nodes.
- Added reserved priority/stacking for `barracks:reserved` and `cookieroom:reserved`, matching the existing ferment-room reservation pattern.
- Gated barracks recovery and `forceExpandRoom('soldier')` behind the barracks blueprint.
- Added a visual-only per-ant tunnel lane offset for normal ant drawing, dot/sprite drawing, and `S.antCrowd` atlas drawing.
- Updated builder edge movement to keep the active edge id while moving on a dig edge, so builder visuals can use the same lane system.
- Stored `visualSignature` on soil/fog cache metadata and blocked transformed-cache reuse when the current visible nest signature differs.
- Slowed nurse room-slot wandering, lengthened nurse target holds, and reduced slot jitter.
- Added `go_room_wander` so idle nurses walk through completed tunnels to the nursery/queen room before starting room-slot wandering.
- Protected timed room-wander action actors during visual actor trimming where possible, reducing room ants popping out during cap rebalancing.
- Further slowed worker room-slot wandering and made worker target holds longer.
- Added a room-exit easing step in `move()` so action ants walk from their current room-slot position back to the node center before entering a tunnel path.
- Slowed `S.antCrowd` room movement/edge-leave frequency and preserved arrival position when crowd ants enter rooms, preventing high-count room pops.
- Added `nurse_tend`, a short nursery dwell after egg placement, larva feeding, and larva transfer, with very low drift speed and actor-trimming protection.
- Added runtime-only stable room inventory slot indices for larvae, eggs, food, and cookie dots so nursery inventory count changes do not repack the whole room from slot 0.
- Protected the remaining nurse transit tasks (`go_q`, `go_n`, `go_larva_pick`, `go_larva_drop`) during visual actor trimming.
- Made `shouldDrawActionAntOverlayInCrowd()` return true for every action ant, so all `S.ants` are drawn on top at their real positions and subtracted from the crowd. This keeps the overlay/crowd partition stable across task changes and removes the random-coordinate room flicker at its source.
- Added hysteresis to `getActionAntCap()` via `S._actionCapTier` with lower "keep" thresholds than the "up" thresholds, so the action-actor cap no longer flip-flops when a metric hovers near a threshold.
- Updated `CURRENT_SYSTEM_OVERVIEW.md` with the reserved special-room recovery behavior, nurse care dwell behavior, stable room inventory slot behavior, the stable crowd/overlay partition, and the hysteretic action-ant cap.

Verification:
- Inline JavaScript syntax check passed with `new Function(...)` (14645 lines checked).
- In-browser runtime verification (python http.server + preview): no console errors; `S._actionCapTier` confirmed the new cap code is live.
- On a synthetic 2040-ant colony in `crowdSprite` mode, over 30 stable frames the fixed per-role overlay counts were constant (nurse 144 / worker 477, distinct=1) and `S.antCrowd.count` was constant (1391), versus the replicated OLD logic which oscillated (nurse 13 distinct values, worker 27) — confirming the flicker source is removed while idle ants were present (idle workers up to 434).
- `git diff --check` passed with only LF/CRLF warnings.

## 2026-06-06 Halve soldier hiring cost

Purpose:
- Make soldier ants easier to hire by halving their food cost curve.

Changes:
- Changed `BASE_COSTS.soldier` from `1000` to `500`.
- Updated the initial soldier button fallback text from `🍃 1000` to `🍃 500`.
- Kept the soldier-specific growth rate at `ROLE_COST_GROWTH.soldier = 1.075`, so every soldier hire cost is approximately half of the previous value.
- Updated `CURRENT_SYSTEM_OVERVIEW.md` to document the new soldier base cost.

Verification:
- Inline JavaScript syntax check passed with `new Function(...)`.
- `git diff --check` passed with only LF/CRLF warnings.
- Static grep confirmed the active soldier base cost and initial UI fallback text now use `500`.

## 2026-06-06 Reduce cookie x100 target appearance rate

Purpose:
- Make the cookie x100 lucky target much rarer while keeping the boost strength and cooldown unchanged.

Changes:
- Reduced the cookie x100 target roll chances to one tenth of the previous values:
  - `MAJOR_ACT_COOKIE_BASE`: `0.06 -> 0.006`
  - `MAJOR_ACT_COOKIE_INC`: `0.015 -> 0.0015`
  - `MAJOR_ACT_COOKIE_MAX`: `0.30 -> 0.03`
- Kept `MAJOR_ACT_COOKIE_MUL = 100`, active duration, target window, roll interval, and cooldown unchanged.
- Updated `CURRENT_SYSTEM_OVERVIEW.md` expected timing notes: expected hunting time is now about 119 seconds and first-15-second appearance chance is about 4.4%.

Verification:
- Inline JavaScript syntax check passed with `new Function(...)`.
- `git diff --check` passed with only LF/CRLF warnings.
- Static grep confirmed the active constants and overview notes use the new one-tenth probabilities.

## 2026-06-06 Ground surface soldiers and stronger raid stalling

Purpose:
- Make surface soldier ants look like they are walking on the same ground line as raid enemies.
- Strengthen the feeling that soldiers physically hold back attacking enemies.

Changes:
- Added `getRaidSurfaceSoldierGroundY()` and `clampRaidSurfaceSoldierToGround()` so `S.raidSoldiers` stay near `S.full.sy` with only a small walk bob.
- Changed surface soldier home/return/engage movement to use the ground line instead of hovering above the surface or orbiting with a large vertical offset.
- Re-clamps soldiers after separation so crowd pushback cannot lift them far off the ground.
- Increased engagement/intercept ranges: engage `28 -> 30`, intercept `44 -> 52`, block radius `30 -> 36`.
- Increased enemy slowdown per blocking soldier: `RAID_ENEMY_ENGAGED_SLOW_PER 0.88 -> 0.94`, keeping the minimum crawl factor at `0.01`.

Verification:
- Inline JavaScript syntax check passed with `new Function(...)`.
- `git diff --check` passed with only LF/CRLF warnings.
- Static grep confirmed the active constants and ground-clamp helpers are present in `index.html` and reflected in `CURRENT_SYSTEM_OVERVIEW.md`.
- Runtime visual playback was not completed in this pass because the in-app browser setup was already failing in this environment during the previous verification attempt.

## 2026-06-06 Remove raid attack time limit

Purpose:
- Make raids resolve by the actual battle state instead of a time limit.

Changes:
- Removed `RAID_ATTACK_MAX_SEC` from the raid attack-phase end condition.
- The attack phase now continues until either all enemies are resolved or breached enemies reach the loss threshold.
- Changed `computeRaidOutcomeFromSurfaceCombat()` so unresolved battles return `null` instead of applying a time judgement.
- Added a guard in `resolveRaid()` so an unresolved active surface battle cannot fall back to the old probability outcome.
- Added `minor_breach_win` result text for wins where a few enemies breached but stayed below the loss threshold.

Verification:
- Inline JavaScript syntax check passed with `new Function(...)`.
- `git diff --check` passed with only LF/CRLF warnings.
- Static grep confirmed the active `index.html` / overview no longer reference `RAID_ATTACK_MAX_SEC`, `time_judgement`, or time-limit result text.
- In-app browser verification was attempted twice, but the browser Node kernel exited during setup in this environment, so runtime raid playback was not completed in this pass.

## 2026-06-06 Camera pan/zoom cache reuse

Purpose:
- Remove drag and mouse-wheel zoom stutter on the previously attached heavy save.

Findings:
- The earlier static soil/fog cache used the exact camera position and zoom in its cache key. Dragging or wheel zooming changed the key every frame, so the heavy nest/fog layers could be rebuilt during camera interaction.

Changes:
- Added camera interaction marking from `panByScreen()` and `zoomAtScreen()`.
- Increased the static/fog cache to an overscanned screen cache so moderate panning can reuse existing cached pixels.
- During camera interaction, `drawCachedStaticNestLayer()` and `drawCachedFogLayer()` transform the existing cache to the current camera instead of rebuilding it.
- If the current view remains covered and the zoom ratio is close enough, the transformed cache can stay in use after the interaction window.
- Added a cheap soil fallback for exposed edges while dragging beyond cache coverage.
- Staggered soil and fog rebuilds so they do not both rebuild in the same render frame when an exact rebuild is required.

Verification:
- Extracted inline JavaScript from `index.html` and ran `node --check` successfully.
- `git diff --check` passed with only LF/CRLF warnings.
- Headless Playwright loaded the heavy attached save with no console/page errors.
- With the heavy save, drag sample: roughly `renderAvg 7.3ms`, `renderMax 9.2ms`, cache builds stayed at 1.
- With the heavy save, wheel sample: roughly `renderAvg 8.2ms`, `renderMax 14.8ms`, cache builds stayed at 1.

## 2026-06-06 Large-save nest rendering cache and dynamic action actor cap

Purpose:
- Reproduce the attached heavy exported save and reduce the cost of very large visible nests.

Findings:
- The attached save is not primarily a 10,000-ant case. It loads into a very large visible nest: about 203 nodes, 208 edges, 194 visible rooms, 193 completed visible edges, and more than 12,000 larvae.
- The dominant cost was repeated Canvas work for static nest visuals: soil/tunnel cutouts, fog radial gradients, room inventory/waste dots, and then 1000 `S.ants` action actors.

Changes:
- Added screen-space caching for the static underground soil/tunnel layer via `S._soilLayerCvs`.
- Added screen-space caching for fog-of-war via `S._fogCvs`.
- Added `getNestVisualSignature()` / `getNestScreenCacheKey()` so these caches rebuild when camera, screen size, visible nodes, edge progress, or soil colors change.
- Kept dynamic room contents, ants, queen, enemies, trails, and effects outside the cache.
- Added dynamic action-actor caps: medium large nests cap representative `S.ants` at 650; very large / larva-heavy nests cap at 420. The visual crowd remains handled by `S.antCrowd`.
- Preserved important action actors preferentially when trimming `S.ants`: golden/panic, cargo, large food, waste/feed, builder work, and invader-response actors are removed last.

Verification:
- Extracted inline JavaScript from `index.html` and ran `node --check` successfully.
- `git diff --check` passed with only LF/CRLF warnings.
- Headless Playwright loaded the attached base64 save through `localStorage['antSimV23_0']` with no console/page errors.
- Before the cache/cap pass on the attached save: roughly `fps 19`, `updateMs 17.8`, `renderMs 47.3`, `actionActors 1000`.
- After the cache/cap pass on the attached save: roughly `fps 29`, `updateMs 7.0`, `renderMs 9.9`, `actionActors 420`, `modeUsed crowdSprite`.

## 2026-06-05 1万匹向け crowdSprite ant rendering

Purpose:
- Keep ants ant-shaped instead of dot-shaped at 10,000-class populations while keeping mobile performance in mind.

Changes:
- Added `crowdSprite` render mode and changed auto LOD so high-count/low-zoom rendering uses crowd sprites instead of `dot`.
- Updated render caps to `1000 / 3000 / 6000 / 10000`, with default visual cap `10000` and separate action actor cap `ACTION_ANT_CAP = 1000`.
- Added runtime-only `S.antCrowd`, a typed-array style visual crowd layer generated from `G.ants.*` and capped by `VISUAL_ANT_HARD_CAP = 10000`.
- Added a pre-rendered Canvas ant atlas with 4 role colors, 32 directions, and 6 walk frames. Frames include body segments, legs, and antennae; leg motion is baked into the walk frames.
- `S.antCrowd` handles lightweight room wandering and completed-edge travel. Existing `S.ants` action actors remain for cargo, rest, golden/panic, large food, waste/feed jobs, surface gathering, builder work, and invader-response overlays.
- Updated render settings UI, statistics, perf debug text, and current system overview for crowd counts, culled counts, atlas frame count, and action actor cap.

Verification:
- Extracted inline JavaScript from `index.html` and ran `node --check` successfully.

## 2026-06-05 Nest cross-section width reduction

Purpose:
- Make the nest cross-section less horizontally wide by reducing world width to 3/4 of the previous value.

Changes:
- Changed `WORLD_W_BASE` from `dp(2400)` to `dp(1800)`.
- Added saved-world X migration in `deserializeWorld()` so old saves wider than the new base are compressed around the world center.
- The migration scales room node X positions and tunnel Bezier control-point X positions; Y positions, room state, inventory, and progression are unchanged.
- Updated current system overview with the new base width and load migration behavior.

Verification:
- `node --check` passed for extracted inline JavaScript.

## 2026-06-05 Large food carry bob reduction

Purpose:
- Reduce the vertical bob while workers carry large food back to the nest.

Changes:
- Changed carrying-state `drawLargeFood()` bob amplitude from `dp(3.0)` to `dp(1.5)`.
- Waiting/gathering bob remains `dp(1.2)`.
- Updated current system overview with the new carry bob amplitude.

Verification:
- `node --check` passed for extracted inline JavaScript.

## 2026-06-05 Research tree UI first pass

Purpose:
- Move the Research tab from a simple branch/card list toward a proper research-tree interface.

Changes:
- Added research overview cards for total progress, affordable research count, open branches, and next candidate.
- Added branch icons, accent colors, descriptions, progress bars, and ready/done counts.
- Reworked research nodes with status markers, breakthrough/prerequisite/condition tags, visible node ids, and clearer lock reasons.
- Added indentation and connector lines for same-branch prerequisites while keeping existing `RESEARCH_NODE_DEFS.prereq` as the source of truth.
- Updated current system overview with the new UI structure.

Verification:
- `node --check` passed for extracted inline JavaScript.

## 2026-06-05 ゴミ室連動の清掃研究と働きアリ清掃参加

目的:
- ゴミ室の効果が分かりづらいため、効果表示を具体化する。
- ゴミ室解放後に研究できる清掃研究を用意し、働きアリも一部ゴミ掃除に関与できるようにする。

変更:
- 衛生研究 `hygiene_3` を `お掃除はおまかせ` に変更し、研究条件に `G.unlockWasteRoom` を追加。
- `お掃除はおまかせ` 研究後、働きアリの `8%`、最大 `8` 匹までが低優先で幼虫室のゴミ清掃へ参加するようにした。
- 働きアリ清掃は既存の `go_waste_pick` / `go_waste_drop` タスクを使用し、レイド中は割り当てない。
- ゴミ室カード、モバイルインライン説明、ツールチップ、統計画面に「ゴミ搬入+1」「清掃研究解禁」「働き清掃ON/OFF」を表示。
- 現行仕様メモに、ゴミ室解放と `お掃除はおまかせ` の関係、働きアリ清掃枠を追記。

検証:
- `node --check` によるインライン JS 構文チェック OK。
- `git diff --check` OK。

## 2026-06-03 レイド足止めを近接判定ベースに強化

目的:
- レイド前線の足止めをさらに強め、敵が兵隊のそばを抜けにくくする。
- 地上兵隊に HP / 死亡処理があるか確認: 現状は未実装。兵隊は敵から攻撃されず、死亡もしない。

変更:
- `RAID_SURFACE_SOLDIER_ENGAGE_RADIUS` 24→28、`RAID_SURFACE_SOLDIER_INTERCEPT_RANGE` 36→44 に拡大。
- `RAID_SURFACE_SOLDIER_BLOCK_RADIUS` を追加。ターゲット状態に関係なく、兵隊の体が近い敵を足止め対象として数える。
- `refreshRaidEnemyEngagement()` を追加し、兵隊同士の押し合い後の最終位置から `en.engagedBy` を再集計。
- `RAID_ENEMY_ENGAGED_SLOW_PER` 0.75→0.88、`RAID_ENEMY_ENGAGED_MIN_FACTOR` 0.03→0.01 に変更。

検証:
- `node` によるインライン JS 構文チェック OK。
- `git diff --check` OK。

## 2026-06-03 レイド中の女王つぶやきを抑制

目的:
- レイド中に女王アリの吹き出しが重なって邪魔になるため、レイド中は喋らせない。

変更:
- `isQueenWhisperSuppressed()` を追加。
- レイド状態が `countdown` / `attack` / `result` の間は `addQueenWhisper()` を無効化。
- 同期間中は `updateQueenWhisper()` で既存の吹き出しも即座に消す。

検証:
- ユーザー指定により未実施。

## 2026-06-03 レイド前線の足止めを強化

目的:
- 敵スルーはかなり改善したが、前線での足止め感がまだ弱いため、兵隊と接触した敵がより明確に止まるよう調整。

変更:
- `RAID_SURFACE_SOLDIER_ENGAGE_RADIUS` 18→24、`RAID_SURFACE_SOLDIER_INTERCEPT_RANGE` 30→36 に拡大し、接触/交戦扱いを早めた。
- `RAID_ENEMY_ENGAGED_SLOW_PER` 0.6→0.75、`RAID_ENEMY_ENGAGED_MIN_FACTOR` 0.1→0.03 に変更し、交戦中の敵の前進をより強く抑える。
- 攻撃フェーズの更新順を調整し、`updateRaidSoldiers()` を敵移動より先に実行。現在フレームの `engagedBy` をそのまま敵移動へ反映し、足止めが1フレーム遅れないようにした。

検証:
- `node` によるインライン JS 構文チェック OK。
- `git diff --check` OK。

## 2026-06-03 設定メニューに統計ボタンを追加

目的:
- 設定/メニュー内から、現在のコロニー状態をまとめて確認できる統計画面を開けるようにする。

変更:
- `top-actions` に `btn-stats`（統計）を追加。モバイルでは既存の設定メニュー内へ自動的に移動する。
- `modal-stats` を追加し、資源・アリ・成長・部屋・防衛・環境/描画の要約を表示。
- 統計は開いた時点の `G` / `S` / 既存計算関数から生成し、保存データは増やさない。

検証:
- `node` によるインライン JS 構文チェック OK。
- `git diff --check` OK。

## 2026-06-03 兵隊アリ雇用コストの伸びを緩和

目的:
- 兵隊アリの雇用コストが `1.15^兵隊数` で重くなりすぎるため、増加ペースを約半分に緩和。

変更:
- 共有雇用倍率 `COST_GROWTH=1.15` は育児・建築・発酵アリ用に維持。
- `ROLE_COST_GROWTH` を追加し、兵隊アリだけ雇用倍率を `1.075` に変更（+15%/匹 → +7.5%/匹）。
- `G.getCost(role)` は役割別倍率があればそれを使い、なければ従来の共有倍率を使う。

検証:
- `node` によるインライン JS 構文チェック OK。
- `git diff --check` OK。

## 2026-06-03 レイド兵隊が手前の敵をすり抜ける問題を修正

目的:
- 兵隊アリが敵列の手前の敵と接触しても、最初にロックした奥側の敵へ向かい続けてすり抜けて見える問題を修正。

変更:
- `RAID_SURFACE_SOLDIER_INTERCEPT_RANGE` を追加。
- `findNearestLivingRaidEnemyInRange()` を追加し、兵隊の近距離に生存敵が入った場合は現在ターゲットより優先して即座にターゲットを切り替えるように変更。
- 担当サイド分散・通常の最寄りターゲット選択は維持しつつ、実際に接触しそうな敵を優先することで前線で戦う挙動にした。

検証:
- `node` によるインライン JS 構文チェック OK。
- `git diff --check` OK。

## 2026-06-03 巣の拡張: 新しい部屋の起点を分散（1点集中の緩和）

目的:
- 新しい部屋がいつも主竪坑の先端付近（深い中央）から放射状に生える「同じ起点に集中」を緩和。ユーザー指摘。

変更:
- `expandMap` の竪坑重み付け `weightShaft`: 中央偏重を下げ(center 1.1→0.5)、子の少なさ(degScore 0.3→1.1)を強める。深さ=層(band)システムは維持。→ 同じ層の別の竪坑へ分散。
- `forceExpandRoom`（特殊部屋）: 常に `mainTipId` を最初に試す方式をやめ、子の少ない竪坑から順に試すようソート。起点がローテーション。
- `PARENT_ROOM_PROB` 0.35→0.5: 部屋を親にする（部屋→部屋へ枝分かれ）確率を上げ、巣を木状に広げて起点を分散。

検証:
- ロード/コンソールエラーなし。散らばり具合は自動成長がスローなため実機プレイで確認・微調整する前提（観測時は竪坑2本に各8部屋=ほぼ満杯の密集状態だった）。

## 2026-06-03 地表兵隊を「全員・本物」に（空間グリッド＋上限300＋描画LOD）

目的:
- 「表示＝戦う本物の兵」を代表(weight)に頼らず本当の頭数で出す。100上限を実用上撤廃。

変更:
- `updateRaidSoldiers` の兵隊同士の押し合いを 総当たり O(n²) → 空間グリッド O(n) に（セル＝分離距離、同セル＋周囲8セルだけ調べる）。AIは1体ずつ簡易なまま大軍でも軽い。索敵は敵が最大80体なので線形のままで十分。
- 表示上限 `RAID_SURFACE_SOLDIER_RENDER_MAX` 100→300。300以下は weight=1（完全に本物）。weightは超大軍(数千)用の保険として維持。
- 描画LOD `RAID_SURFACE_SOLDIER_LOD_COUNT`(120)：超えたら兵隊を胴＋頭の2バッチ(fill 2回)で描く（向きは頭の位置オフセットで表現＝ドットより群れっぽい）。閾値は端末性能で調整可。

検証(preview, 兵300 vs 敵80):
- AI更新 +3ms（グリッド成功）。兵隊描画は切り分けで −0.46ms＝実質ゼロ（LODバッチ）。コンソールエラーなし。
- 参考: 描画の重さ(~64ms)は戦闘ではなく「育った巣そのもの」の多重描画が主因。戦闘スケーリングはボトルネックではない（詳細描画でも300体で+4ms程度）。今後の負荷対策は巣描画側が本丸。

メモ: さらに千単位/ズームアウトへ広げるなら、レイドを既存のドットLODに通すのが次段。

## 2026-06-03 空（地表より上）を広く見せる

変更:
- `SKY_HEADROOM=dp(340)` を追加し、地表(sy)より上に空の余白を確保。
- `getCamBounds` を空込みで再計算（デフォルト表示でも空が見え、上へパンするとさらに空）。地表・巣の配置(sy)は不変なので既存セーブでもそのまま反映。
- 空グラデーション・太陽・月を新しい空域へ拡張。

検証(preview): デフォルト表示で画面上部の約3割が青空に。コンソールエラーなし。

## 2026-06-03 地表レイドを「実本隊の乱戦」に（表示兵100体・敵増量）

経緯:
- 一度 `S.raidCrowd`（勝敗非関与の演出群衆）を試したが、実際に戦う24体と乖離して「入口で無関係なアニメが流れているだけ」に見えるため不採用（git revert）。
- vector描画は100体超でも +2ms 程度と軽いと判明 → 「見える兵＝戦う本隊」を大量描画する方針へ転換。

変更:
- 表示兵隊上限 `RAID_SURFACE_SOLDIER_RENDER_MAX` 24→100。weightで総DPSは不変。
- 敵HPの追従基準を表示体数から切り離し、論理軍力(兵隊数×Lv)基準に（`RAID_ENEMY_HP_REF_SOLDIERS=24`）。表示体数を変えても戦闘の長さ・難度は不変。
- 敵の描画体数を増量（`RAID_ENEMY_RENDER_UNIT_POWER=12` / `RAID_ENEMY_RENDER_COUNT_MAX=80`）。総敵HP予算は旧来の体数基準で算出して描画体数で割り分配 → 体数増でも難度据え置き。突破判定は割合(30%)なので体数非依存。
- 大軍の初期整列幅を画面内に収める調整。

検証(preview): soldier=200 → 表示兵100体(うち70体engage)・weight2・敵41体・総敵HP≈2076(旧来据え置き)。コンソールエラーなし。

## 2026-06-02 Phase 7.5A: 地表兵隊の代表ユニット化（weight）

目的:
- 表示兵隊は負荷対策で最大24体に制限(`RAID_SURFACE_SOLDIER_RENDER_MAX`)。一方、勝敗は地表戦闘の撃破/突破で決まる(`winProb`は表示専用)。このため兵隊が25匹以上いても地表DPSが頭打ちになり、「兵隊を増やしても防衛が強くならない」放置ゲームとして致命的なズレがあった。
- 表示24体のまま、論理兵隊数(`G.ants.soldier`)ぶんの戦力を地表DPSへ反映する。

変更:
- `getRaidSurfaceSoldierWeight()` を追加。`weight = 論理兵隊 / 表示兵隊`（soldier≤24なら1、120なら5）。
- `ensureRaidSoldiers()`: スポーン時に各兵隊へ `weight` を付与。
- 攻撃処理: `damageRaidEnemy(target, soldierDamage * s.weight)` に変更。総地表DPS = soldier × 1撃 ÷ CD で頭数に線形比例。
- デバッグ表示 `__debugRaidSoldiers` / `__debugRaidCombat` に `repWeight`・`estSurfaceDps` を追加。
- 結果モーダルに「兵隊 N匹 → 代表24体（1体=X匹ぶん）」を表示（weight>1のときのみ）。
- 敵HPをプレイヤーの実1撃地表ダメージに追従（`getRaidEnemyBaseHp` に `playerScale^RAID_ENEMY_HP_PLAYER_EXP` を乗算、指数0.7）。weight増で敵が瞬殺され戦闘が一瞬で終わる問題を解消。指数<1で鈍化させ兵隊/Lv増強は依然有利に保つ。`__debugRaidCombat` に `enemyCount`/`enemyAvgMaxHp`/`estHitsToKillAvg` を追加。
- 戦闘の長さ調整ノブ `RAID_ENEMY_HP_DURATION_MUL`(=2.0) を追加。指数(進行感の形)とは独立に敵HP全体へ乗算し、戦闘テンポだけを調整できる。プレイ感に合わせ「戦闘時間を約2倍」にするため 2.0 を採用。

検証（preview/8765で実機確認）:
- soldier=120 → repWeight=5、攻撃フェーズで24体全員 weight=5。
- 敵を射程固定して観測した実HP減少幅=70（=7撃×10）。1撃=base2×weight5=10 が適用されていることを確認（未加重なら14）。
- 推定総地表DPS=400（=120×2÷0.6、修正前の頭打ち80の5倍）。
- 敵HP追従＋長さ倍率(2.0)適用後: soldier=120で敵平均maxHp 71.8・撃破必要数7.18撃。soldier=20で20.8・10.42撃。いずれも倍率導入前(37.3/3.73, 10.2/5.08)の約2倍＝戦闘時間およそ2倍。大兵ほど撃破必要数が少ない（7.18<10.42）＝進行感は維持。コンソールエラーなし。
- 注: 長さ倍率は早期ゲームにも一律で効くため、早期の敵も約2倍硬くなる（兵隊20で1体10撃強）。早期だけ素のままにしたい場合は倍率を player-scaled 部分のみへ移す案あり。

メモ（次のゲート＝プレイ確認向け）:
- テンポ調整ノブは2つ: `RAID_ENEMY_HP_DURATION_MUL`(=2.0, 戦闘の長さ＝全体HP倍率) と `RAID_ENEMY_HP_PLAYER_EXP`(=0.7, 進行感の形＝火力追従の鈍化)。実プレイで「戦闘の長さ・勝率」を見て微調整。Phase 7.5B 監査で詰める。

## 2026-06-02 大餌サイズランダム化・建設予約パネル・ドック説明文

変更:
- **大きな餌のサイズランダム化**: 出現時にサイズ係数（ログ一様分布 0.5x〜3.0x）を決定。必要アリ数・食料報酬・運搬速度・描画半径がサイズに比例してスケール。出現トースト文言もサイズに応じて「小さめの/大きな/巨大な/超巨大な」に変化。
- **「建設予約中」パネル追加**: 部屋タブに予約中・掘削中の部屋（発酵室/クッキー室/兵舎）を一覧表示するパネルを追加。予約数・掘削中フラグが両方ゼロなら非表示。
- **ドックアイテムに説明文**: 兵舎設計図・ゴミ室・発酵室・クッキー室のドックアイテムに `.dock-desc` で効果の一言説明を追加。
- **クッキーブーストCD変更**: `MAJOR_ACT_COOKIE_CD` を 600秒 → 12000秒 に変更（約20倍）。
- **カラーモードのtint修正**: 部屋tintを `globalAlpha=0.20` の固定値から `roomTint` の rgba α値をそのまま使う方式に変更。

## 2026-06-02 カラーモードトグル追加

変更:
- `_colorMode` フラグ（デフォルト true）を追加。
- 上部バーに 🎨 ボタンを追加。ON/OFF で以下を切替:
  - **ON**: アリ種別色分け・部屋tint・フェロモントレイル（従来の見た目）
  - **OFF**: 全アリ黒・部屋tintなし・トレイルなし
- `getAntBaseColor` / roomTint 適用箇所 / トレイル描画ブロックを `_colorMode` でゲート。
- ボタンON時は紫グロー、OFF時は半透明で状態を視覚表示。

## 2026-06-02 特殊部屋の設計図購入システム統一

目的:
- クッキー室・発酵室・兵舎を「設計図購入→予約→建築アリ優先建設」方式に統一。
- 上限撤廃。コストがどんどん上がることで自然な制限に。

変更:
- 定数: `COOKIE_ROOM_COST_BASE=30`, `COOKIE_ROOM_COST_GROWTH=2.5`, `FERMENT_ROOM_COST_GROWTH=2.0`, `BARRACKS_COST_GROWTH=2.5` を追加。
- `getFermentRoomCost()` / `getCookieRoomCost()` / `getBarracksCost()` をべき乗スケールで追加。
- `G.cookieRoomPending` / `G.barracksPending` を追加（save/load対応）。
- `S.barracksCount` を recalc で計算。
- 建築アリのターゲット選択にクッキー室・兵舎の pending 処理ブロックを追加（発酵室と同構造）。
- `forceExpandRoom` からクッキー室・発酵室の上限ガードを削除。
- クッキー室の自動建設ロジック（`canAddCookieRoom`）を削除し予約制に統一。
- クッキー室購入ボタン `btn-build-cookieroom` を部屋タブに追加。
- 兵舎ボタンを繰り返し購入対応に変更（`G.major.barracks` は後方互換で維持）。
- `FERMENT_ROOM_MAX` の上限チェックを全箇所から削除。

## 2026-06-02 施設プレビューセクション削除

- 部屋タブの「施設プレビュー」カードを削除。
- サイドバーの「未解放プレビュー」（クッキー室・遠征ヒント）を削除。
- 関連 `bindTip` / `updateUI` ロジックも削除。

## 2026-06-02 トンネル交差防止

目的:
- 巣の拡張時に既存トンネルと新トンネルが交差するのを防ぐ。

変更:
- `queueMainShaftEdge`: ベジェ制御点をノード追加前に計算し `edgeIntersectsExisting` でチェック。交差する場合は次の試行へ。
- `expandMap` 内部ループ（非branchMode）: 同様に事前交差チェックを追加。
- `forceExpandRoom`: 同様に事前交差チェックを追加。
- `CURRENT_SYSTEM_OVERVIEW.md` にクッキー室の効果を追記。

## 2026-06-01 地表戦闘の膠着感: 交戦中の敵を減速

目的:

- ユーザー報告「敵と兵隊がぶつかっても膠着感がなく、敵が接近速度のまま巣へ到達する」を改善。兵隊が敵を足止めする手応えを出す。

変更:

- 定数 `RAID_ENEMY_ENGAGED_SLOW_PER=0.6` / `RAID_ENEMY_ENGAGED_MIN_FACTOR=0.1` を追加。
- `updateRaidSoldiers`: フレーム頭で全敵の `en.engagedBy` を 0 リセットし、engage 範囲内の兵隊ごとに対象敵の `engagedBy` を加算。
- 攻撃フェーズの敵移動: `holdFactor = max(0.1, 1 - engagedBy*0.6)` を前進速度に乗算。交戦兵1体で約0.4倍、2体でほぼ停止（0.1）。交戦されていない敵は通常速度で素通りするため、戦線が崩れると突破される緊張感も出る。

検証:

- `node --check`（OK）、`git diff --check`（クリーン）。
- ヘッドレスChrome/CDP: 兵隊24・敵8を入口手前で交戦させると、交戦中の敵は1.5秒で最大13pxしか前進せず（減速なしなら約120px）膠着を確認。敵HPを下げると従来通り戦闘が解決、コンソールエラー0。

## 2026-06-01 Phase 7B-3/4 兵隊攻撃・敵死亡・地表戦闘の勝敗接続

目的:

- 地表レイドを「見た目だけ」から「地表戦闘の結果で勝敗が決まる」状態へ進める。通常レイドの勝敗は原則として地表戦闘結果で決め、作れない場合のみ従来の `computeRaidOutcome()` にフォールバックする。

追加・変更した主な関数:

- `getRaidSurfaceSoldierDamage()`: 兵隊1撃のダメージ。`getSoldierPowerMul(G.sLv)`（jaw2x ×2 を内包）× 基本ダメージ。jaw2x を二重に掛けない。
- `updateRaidSoldiers(dt)`: 攻撃処理を接続。射程 `RAID_SURFACE_SOLDIER_ATTACK_RANGE` 内かつクールダウン明けで `damageRaidEnemy()` を呼び、撃破で `S.raidVis.killedEnemies++` ＆再ターゲット。engage は敵に張り付いて追従（0.9倍速）。突破済み敵はターゲット対象外。
- `damageRaidEnemy(en, amount)`: 突破済み・死亡済みガード、HP0で `dead`/`phase="dead"`/`killedBySoldier=true`、hitFlash を定数化。
- `getLivingRaidEnemyCount()` / `countKilledRaidEnemies()` / `countBreachedRaidEnemies()`: 残存・撃破・突破の集計。
- `getRaidBreachLoseThreshold(total)`: 敗北しきい値 = `max(1, ceil(total * RAID_BREACH_LOSE_RATIO(0.30)))`。
- `computeRaidOutcomeFromSurfaceCombat()`: 全滅→勝利(all_killed)、突破しきい値超→敗北(breached)、残存0＆突破0→勝利(no_living)、それ以外は時間判定（突破率<0.30 かつ 撃破率≥0.50 で勝利）。作れない（敵なし等）なら null。
- `buildRaidOutcomeFromSurfaceResult(result)`: 地表結果を既存形式の out（win/rewardFood/rewardCookie/loseWorkers/foodMul/eggMul/winProb/surfaceResult）に変換。報酬・被害は既存ロジックを大きく逸脱させず、敗北被害は突破率で増減。
- 敵移動更新: 入口に十分近づいたら `en.breached=true`＋`S.raidVis.breachedEnemies++`（1体1回）。突破済み敵は潜り込みフェードのみで戦闘対象外。
- 攻撃フェーズ終了判定: 固定6秒をやめ、「全滅 or 突破しきい値到達 or `RAID_ATTACK_MAX_SEC`(16秒)」で決着し、`RAID_FINISH_DELAY`(0.6秒)見せてから `resolveRaid()`。決着が早ければ早期終了する。
- `beginRaidAttack()`: `totalEnemies`/`killedEnemies`/`breachedEnemies`/`finishDelay` を初期化。
- `resolveRaid()`: 先頭で `computeRaidOutcomeFromSurfaceCombat()` を優先。`surfaceOut || _pendingOutcome || computeRaidOutcome()`。報酬・被害適用は既存処理を流用（二重適用なし）。
- `showRaidResultModal()`: 既存本文に「撃破 N/Total・突破 N・残存 N・判定（理由）」を追記。
- デバッグ: `window.__debugRaidCombat()`。

勝敗:

- 敵全滅で勝利、敵が一定数（30%以上、最低1）突破で敗北。攻撃時間上限到達時は時間判定。`computeRaidOutcome()` は削除せずフォールバック・比較用に残置（定数式の勝敗計算）。

検証:

- inline JS `node --check`（OK）、`git diff --check`（クリーン）、`computeRaidOutcome()` が1個残存・`resolveRaid` が地表結果優先・報酬被害は既存形式へ変換を確認。
- ヘッドレスChrome/CDP: 組織的戦闘で兵隊が自力で8体撃破（killedEnemies>0）し解決、結果モーダルに撃破/突破/残存/判定を表示。全敵を死亡させると all_killed 勝利＆食料報酬が一度だけ適用。しきい値以上の敵を突破させると breached 敗北＆働きアリ減少が一度だけ適用。予告→攻撃→結果→通常復帰、大物運搬の出現/中断に副作用なし、コンソールエラー0 を確認。

Phase 7B 以降の未対応: 兵隊死亡・兵隊個別HP・敵種追加・防衛ライン/陣形/トラップ・ボス戦・報酬バランス全面再設計は未実装。

## 2026-06-01 Phase 7B-2 調整: 兵隊の両側分散・青色化・地下兵隊の二重表示解消

ユーザー報告の3点を修正:

1. **両側から敵が来ても兵隊が片側にしか出ない** → 各地表兵隊に `preferSide`（slotIndex偶奇で左右交互）を付与。`findNearestLivingRaidEnemy(x,y,side,ex)` にサイド絞り込みを追加し、ターゲット未設定時は「担当サイドの最寄り敵」を優先、いなければ全体の最寄りへフォールバック。これで敵が両側にいると兵隊が左右へ分散する（検証: 12体が左6・右6）。
2. **地表兵隊の色が黒** → `drawRaidSoldiers` を兵隊アリの青 `#3b82f6`（頭部 `#1d4ed8`・大顎を淡青）に変更。地下の兵隊と色を統一し、地表敵の暗赤とも区別。
3. **戦闘中も入口付近に青い地下兵隊が残る（二重表示）** → render のアリ描画で、レイドが `attack`/`result` の間は `S.ants` の `role==='soldier'` を描画対象から除外（`drawAnts` フィルタ）。地表の `S.raidSoldiers` が代表として戦うため、入口での重複表示を解消。S.ants 兵隊のロジック（defend/guard）自体は変更せず、描画のみ抑制。

検証:

- inline JS `node --check`（OK）、`git diff --check`（クリーン）。
- ヘッドレスChrome/CDP: 敵を左右に配置し兵隊のターゲットを再取得させると兵隊が左6・右6に分散、レイド攻撃中は地下兵隊が描画リストから除外、従来通り resolve・通常復帰、コンソールエラー0 を確認。

## 2026-06-01 兵舎設計図を研究→部屋タブの購入カードへ戻す

目的:

- 兵舎設計図を研究タブ（Phase 5Bで移管済み）ではなく、部屋タブの通常購入カードから買えるようにする。

変更:

- CSS: `#btn-major-barracks` を強制非表示ルールから外す（深度II/IIIは引き続き非表示）。
- `upgradeDefs` の `major_barracks`: `unlocked = G.bLv>=3`、`canBuy = !hasBarracksBlueprint() && bLv>=3 && cookie>=25`、`order` を部屋枠に合わせて 4.5 に。タブ割当は既存の `upgradeTabGroupByKey.major_barracks='rooms'` を使用。
- onclick: 研究タブ誘導をやめ、実購入に変更（条件チェック→クッキー25消費→`G.major.barracks=true`→toast/女王つぶやき→`G.recalc()`→**`G.save()` 即セーブ**→`updateUI()`）。
- `updateUI` 内の旧ブロックが毎フレーム強制していた `display:none`/`disabled` をやめ、表示＋購入可否（未所持・建築Lv3・クッキー25）に応じた disabled 切替へ。コスト表示は所持時「建設待ち/入手済」、未所持時「25」。
- インライン効果 `getBarracksBlueprintInlineEffect()` を「研究タブへ移管」から「条件: 建築Lv3 / 🍪25 で入手 / 入手済み・建設待ち」に変更。
- `RESEARCH_NODE_DEFS` から `military_barracks_blueprint` を削除（研究ツリーに出さない）。互換のため定数 `BARRACKS_BLUEPRINT_NODE`・`G.major.barracks`・`ensureResearchState` の同期処理は維持。`hasBarracksBlueprint()` は従来通り（研究ノードフラグ or `G.major.barracks`）。

バランス・フロー不変:

- コスト（クッキー25）・建築Lv3条件・購入後の挙動（建築AIが兵舎を最優先建設、兵隊雇用は実建設後）は従来通り。`computeRaidOutcome` 等のレイド計算には無関係。

検証:

- inline JS `node --check`（OK）、`git diff --check`（クリーン）。
- ヘッドレスChrome/CDP: 兵舎カードが部屋タブのグリッドに配置・建築Lv3で非ロック表示、研究タブのノード一覧に「兵舎設計図」が無い、クリックで `G.major.barracks=true`＆クッキー25消費＆localStorage保存、購入後はカードが disabled で「建設待ち」表示、コンソールエラー0 を確認。

## 2026-06-01 Phase 7B-2 兵隊アリの地表出撃＋敵への接近

目的:

- 攻撃フェーズ中に兵隊アリを巣入口から地表へ出撃させ、最寄りの生存敵へ接近・追尾する「戦っているように見える」表示演出を追加する。
- この段階ではダメージ・敵HP減少・勝敗判定は変更しない（攻撃判定は Phase 7B-3、勝敗反映は 7B-4）。

追加した主な状態:

- `S.raidSoldiers`: 地表レイドの兵隊アリ配列（**`S.ants` とは完全に独立**・ランタイム専用・非保存）。各要素は `x,y,vx,vy,sp,fade,phase,targetEnemyId,homeX,homeY,slotIndex,wobble,rot,dead`。
- レイド敵に一意 `id`（`_raidEnemyIdSeq` 採番）を追加。兵隊の追尾ターゲット参照用。

追加した主な定数（dp使用のため dp 定義後に配置）:

- `RAID_SURFACE_SOLDIER_RENDER_MAX=24` / `RAID_SURFACE_SOLDIER_SPEED=dp(110)` / `RAID_SURFACE_SOLDIER_ENGAGE_RADIUS=dp(18)` / `RAID_SURFACE_SOLDIER_SEPARATION=dp(8)` / `RAID_SURFACE_SOLDIER_RETURN_RADIUS=dp(22)`

追加した主な関数:

- `getRaidSurfaceSoldierRenderCount()`: 表示兵隊数 = `clamp(G.ants.soldier, 0, 24)`。**論理戦力（G.ants.soldier / getColonyCombatPower）とは分離**。
- `ensureRaidSoldiers()` / `clearRaidSoldiers()`: 攻撃開始時に入口付近へ生成、終了時に後始末。
- `findNearestLivingRaidEnemy(x,y)` / `getRaidEnemyById(id)`: ターゲット探索。
- `moveToward(obj,tx,ty,speed,dt)`: 直線移動＋向き更新（経路探索なし）。
- `updateRaidSoldiers(dt)`: フェーズ機械 emerge→advance→engage→return→idle。ターゲットが死亡/消失したら再探索、生存敵が無ければ入口へ戻る。兵隊同士の重なりを軽く緩和。
- `drawRaidSoldiers(ctx)`: 黒〜濃茶の兵隊アリを地表敵より少し大きめに描画（大顎シルエット）。

結線:

- `beginRaidAttack()` で `spawnEnemies()` 直後に `ensureRaidSoldiers()`。
- 攻撃フェーズ更新で `updateRaidSoldiers(dt)`、結果フェーズで兵隊をフェードアウト、通常復帰/兵隊0での強制終了で `clearRaidSoldiers()`。
- render の敵描画直後に `drawRaidSoldiers(ctx)`。`shiftWorldX()` で兵隊座標も補正。
- デバッグ: `window.__debugRaidSoldiers()`（論理/表示兵隊数・生存敵数・フェーズ内訳）。

実装中に見つけて直したバグ:

- Phase 7B-2 定数を `dp()` 定義前の位置に置いてしまい、起動時に `ReferenceError: Cannot access 'dp' before initialization`（Temporal Dead Zone）。dp 定義後（移動定数付近）へ移動して解消。

勝敗・ダメージは未変更:

- 兵隊は敵にダメージを与えない。`damageRaidEnemy()` は通常更新ループに未接続。`computeRaidOutcome()` / `resolveRaid()` / `getColonyCombatPower()` / `getEnemyPower()` / `getRaidWinProb()` は無変更。勝敗は依然 `resolveRaid()` 時の `computeRaidOutcome()` で確定。

検証:

- inline JS `node --check`（OK）、`git diff --check`（クリーン）、`computeRaidOutcome`/`resolveRaid` 無変更・`S.ants` ではなく `S.raidSoldiers` 使用を確認。
- ヘッドレスChrome/CDP: 兵隊10体出撃（=min(soldier,24)）、`S.ants` と別配列、最寄り敵へ advance/engage、2秒交戦後も敵 totalHp=totalMax（兵隊はダメージなし）、敵半数撃破で兵隊は死亡敵を指さず生存敵へ再ターゲット、敵全滅で全兵隊 return/idle、その状態でも従来通り resolve（raidTotal +1・結果モーダル）、通常復帰で兵隊クリア、大物運搬に副作用なし、コンソールエラー0 を確認。

Phase 7B-3（未実装）: 兵隊→敵の攻撃判定・ダメージ接続。Phase 7B-4: 敵全滅勝利/突破敗北の勝敗反映。

## 2026-06-01 Phase 7B-1 レイド敵HPとHPバー

目的:

- 地表レイドの敵にHP状態を持たせ、頭上にHPバーを表示する。将来の兵隊地表迎撃（Phase 7B-2 以降）に接続できる土台を作る。
- この段階では HP は見た目と将来接続用のみ。勝敗判定には一切使わない。

追加した敵フィールド（`spawnEnemies()` の各敵）:

- `hp` / `maxHp`: 敵HP（`makeRaidEnemyHp` で算出）
- `dead`: 死亡フラグ
- `hitFlash`: 被弾閃光タイマー（将来の演出用）

追加した定数（`RAID_CFG` は変更せず別 const で追加）:

- `RAID_ENEMY_BASE_HP=10` / `RAID_ENEMY_HP_PER_POWER=0.08` / `RAID_ENEMY_HP_RANDOM_MIN=0.85` / `RAID_ENEMY_HP_RANDOM_MAX=1.15`

追加した主な関数:

- `getRaidEnemyBaseHp(enemyPower, enemyCount)`: 敵パワーを頭数で割った1体あたり基準HP。
- `makeRaidEnemyHp(enemyPower, enemyCount)`: 個体差込みのHP。
- `damageRaidEnemy(en, amount)`: 敵にダメージ（HP0で `dead=true`, `phase="dead"`）。**今は通常プレイの兵隊攻撃には未接続**。
- `drawRaidEnemyHpBar(ctx, en)`: 敵頭上のHPバー（ワールド座標、死亡敵には出さない、`fade` 反映）。

その他の変更:

- 攻撃フェーズの敵更新ループ: 死亡敵は移動せず `fade` を速めに下げる、`hitFlash` を毎フレーム減衰。
- 敵描画: 死亡敵は少し暗く、`hitFlash>0` の間は白フラッシュ、本体描画後にHPバーを描画。
- デバッグ: `window.__damageRaidEnemies(amount=5)` で全敵にダメージ（通常UIには非露出）。

勝敗判定は不変:

- レイド勝敗は従来通り Phase 7A の `resolveRaid()` 内 `computeRaidOutcome()` で確定。敵HPが0でも全滅でも勝敗には影響しない。`computeRaidOutcome()` の式・報酬・損害は無変更。

Phase 7B-2（未実装）:

- 兵隊アリの地表迎撃AI、ターゲット探索、攻撃処理、敵全滅勝利、突破数による敗北はまだ実装していない。

検証:

- inline JS `node --check`（OK）、`git diff --check`（クリーン）。`spawnEnemies` に `hp/maxHp/dead/hitFlash` があること、`computeRaidOutcome`/`resolveRaid` の勝敗ロジックが無変更であることを確認。
- ヘッドレスChrome/CDP: レイドを `__forceRaid()` で発生→攻撃中の敵8体すべてに `hp/maxHp`（totalHp 93=totalMax 93）、`__damageRaidEnemies(3)` でHP減少（93→69）、`__damageRaidEnemies(99999)` で全員 `dead`（minDeadFade 0 までフェード）、その状態でも従来通り resolve して `raidTotal` +1・結果モーダル表示・通常復帰、大物運搬の出現/中断に副作用なし、コンソールエラー0 を確認。

## 2026-06-01 テスト用レイド強制発生（デバッグ）

目的:

- レイド（予告→攻撃→結果）をテストしやすくするため、任意のタイミングで強制発生させる手段を追加する。

変更:

- `debugForceRaid()` を追加。`state==='none'` かつ兵隊アリありのとき、予告（10秒）でレイドを開始する（`G.raidTimer=10`, `state='countdown'`）。あとは既存の更新ループが 予告→攻撃→結果 を進める。
  - 兵隊アリ0だと更新ループがレイドを毎フレーム即キャンセルするため、兵隊が必要（無い場合はトーストで案内）。
  - 既にレイド進行中なら何もしない。
- トリガー手段（既存のデバッグキー流儀に合わせ、通常UIには露出しない）:
  - PC: キー `R`（入力欄フォーカス時・キーリピートは無視）
  - スマホ: 個体数ボックス `#pop-box` を約0.9秒 長押し（pointer イベント）
  - コンソール: `window.__forceRaid()`
- バランス・勝敗計算には一切手を加えていない（発生タイミングのみのテスト補助）。

検証:

- inline JS `node --check`（OK）。
- ヘッドレスChrome/CDP（timeScale=4）: 兵隊0でガード（発生しない）、`__forceRaid()` で `countdown→attack→result→none` の全フェーズを観測し `raidTotal` +1、`R` キーでも発生・解決、コンソールエラー0 を確認。
- スマホ長押しは同一の `debugForceRaid()` を呼ぶため、上記で論理的に等価。

## 2026-06-01 Phase 7A レイド結果を戦闘終了時に確定

目的:

- レイドの勝敗を「攻撃開始時（beginRaidAttack）」ではなく「戦闘終了時（resolveRaid）」で確定する構造に変更する。Phase 7B（敵HP・兵隊地表迎撃など）の土台。

変更した関数:

- `beginRaidAttack()`: `computeRaidOutcome()` の呼び出しと `S.raidVis._pendingOutcome` への保存を削除。攻撃フェーズの準備（結果モーダルを閉じる / `state="attack"` / `timer=0` / 敵出現 / 画面揺れ / 警報UI）だけを行う。誤判定防止のため開始時に古い `_pendingOutcome` を `delete` する。
- `resolveRaid()`: 先頭を `const out = S.raidVis._pendingOutcome || computeRaidOutcome();` に変更。通常レイドでは `_pendingOutcome` が無いので、この時点で勝敗を計算して確定する。`_pendingOutcome` は古い途中状態が残っていた場合の互換ガードとしてのみ機能（`S.raidVis` は非保存なので通常は発生しない）。

勝敗確定タイミングの変更:

- 旧: 攻撃開始（beginRaidAttack）で `computeRaidOutcome()` を実行し `_pendingOutcome` に保持 → 6秒後の resolveRaid で適用。
- 新: 攻撃開始では計算しない → 6秒後の resolveRaid で `computeRaidOutcome()` を実行し、その場で勝敗・報酬・被害を確定。

バランス不変:

- `RAID_CFG`、`getColonyCombatPower()`、`getEnemyPower()`、`getRaidWinProb()`、`computeRaidOutcome()` の式、報酬量、敗北損害、発生条件、予告秒数、敵の見た目/速度/数は一切変更なし。タイミングのみの変更。

検証:

- inline JS抽出 `node --check`（SYNTAX OK）。`git diff --check`（空白エラーなし）。
- 静的: `beginRaidAttack()` から `computeRaidOutcome()` 直接呼び出しが消え、呼び出しは `resolveRaid()` の1箇所のみであることを確認。
- 実機（ヘッドレスChrome/CDP, timeScale=2）: 兵隊2・働き80でレイドを誘発し、予告→攻撃→結果→通常 の遷移を確認。攻撃中の4サンプルで `_pendingOutcome` 無し・`raidTotal` 据え置き（=開始時未確定）。resolveRaid 時に `raidTotal` が +1、食料・働きアリが変化（この回は敗北: 食料100000→70182, 働き80→67）、結果モーダル表示。コンソールエラー0。
- 大物運搬の副作用なし: 解放→`__spawnLargeFood()` で出現→レイド誘発で `S.largeFood` が中断クリアされることを確認。

Phase 7B（未実装）:

- 敵HP、兵隊の地表迎撃、最寄り敵ターゲット、距離攻撃、突破数による勝敗判定などは未実装。次フェーズで対応予定。

## 2026-06-01 大物運搬解放バグ・発酵室予約バグの修正（実機検証で発見）

ヘッドレスChrome/CDPの総合検証で2つの実バグを発見し修正した。

**バグ1: 大物運搬がボタンで解放できない**

- 原因(1): 解放用onclickを定義した後（btn-major-worker-bigcarry）、すぐ下に**旧プレースホルダのonclick**（「📦 大物運搬は近日解放予定です」）が残っていて再代入で上書きしていた。実際にDOMに付いていたのは旧ハンドラで、押しても何も起きなかった。
- 原因(2): `updateUI()` 内の旧ブロックが毎フレーム `c-major-worker-bigcarry` を「将来実装」に戻し、ボタンへ無条件で `disabled` を付けていた。
- 修正: 旧プレースホルダonclickを削除。`updateUI()` のブロックをコスト表示「🍪5/解放済」・購入可否に応じた `disabled` 切り替えへ変更。
- 検証: 働き強化Lv5・クッキー10でボタン押下 → `G.major.workerBigCarry=true`、クッキー5消費、localStorage保存、その後地表に大物が出現することをCDPで確認。

**バグ2: 発酵室の2室目が予約しても建たない**

- 原因(A): 予約数 `G.fermentRoomPending` を「部屋配置時」に減算していたため、配置後の未掘削エッジが低優先の通常枠に落ち、掘られなかった（前回コミットの不完全修正）。さらに、既に1室ある状態で再予約すると `visibleFermentCount >= pending` が即成立して予約が消え、2室目が配置すらされなかった。
- 修正(A): 予約ロジックを A/B に再構成。A=「配置済み・未掘削の発酵室エッジがあれば pending と無関係に最優先で掘る」、B=「pending>0 かつ未掘削エッジ無しのとき新規配置し、配置成功で pending を1消費」。pending は「未配置の予約数」だけを表すようにした。
- 原因(B): `forceExpandRoom` がコロニー密集時（43部屋級）に衝突回避で配置位置を見つけられず null を返し続けていた。
- 修正(B): `forceExpandRoom` に衝突距離の段階緩和（`collFactor` = 1.0 → 0.72 → 0.5）を追加。通常距離で空きが無ければ詰め込み配置を許可する。
- 検証: 1室建設後に再予約 → 2室目が配置(placed=2)→ `ferment:reserved` 高優先で掘削 → 完成(visible=2)することをCDPで確認。

検証:

- inline JS抽出 `node --check`（SYNTAX OK）。
- ヘッドレスChrome/CDP総合テスト（実時間 + timeScale=12）で C1 起動 / C2 未解放時非出現 / C3 ボタン解放・消費・保存 / C4 解放後出現 / C5 発酵室0→1 / C6 発酵室1→2 / C7 実行中エラー0 を全てPASS。

## 2026-06-01 建築距離ペナルティ緩和・女王ヒント追加・吹き出し修正

目的:

- 出入口から遠いほど建設が遅くなる効果を半分に緩和し、深層建設をより快適にする。
- プレイヤーが距離ペナルティを知らないため、女王つぶやきでやんわり示唆する。
- 女王つぶやき吹き出しの三角形(テール)上辺の枠線が長方形と重なってカクついて見える問題を修正する。

変更:

- `getBuilderLogicChunkSec()` の距離ペナルティ: `Math.min(5.0, d/dp(180))` → `Math.min(2.5, d/dp(360))` に半減。
- `updateQueenWhisper()` に `deep_build` タイプのトリガーを追加。建築アリ3匹以上かつメイン縦坑先端が入口から `dp(400)` 以上離れているとき「深い場所の建設は時間がかかるわ。建築アリを増やすと少し助かるのだけど」とつぶやく（15秒クールダウン）。
- `drawQueenWhisperBubble()` のテール描画: `closePath` + `stroke` を廃止し、斜辺2本だけをオープンパスで stroke することで上辺（長方形底辺との接続部）の枠線を除去。塗りつぶしは維持。

## 2026-06-01 建築LvをAntsタブへ移動・大物運搬をアップグレード解放制に変更

目的:

- 建築アリのレベルアップが「蟻アップグレード」セクションにないと分かりにくいため、Antsタブへ移動する。
- 大物運搬イベントが解放なしで自動発生していたため、「大物運搬」アップグレードカードを購入した後にのみ発生するようにする。

変更:

- `upgradeTabGroupByKey` の `builder` を `'rooms'` → `'ants'` に変更。建築LvUPカードが蟻アップグレードに表示されるようになった。
- `MAJOR_WORKER_BIGCARRY_WLV` を 8 → **5** に変更（より早い段階で解放可能に）。
- `MAJOR_WORKER_BIGCARRY_COST_COOKIE = 5` を新たに定義。
- `btn-major-worker-bigcarry` カードを実際に購入可能に:
  - `unlocked: () => G.wLv >= 5`
  - `canBuy: () => !workerBigCarry && wLv >= 5 && cookie >= 5`
  - onclick で `G.major.workerBigCarry = true`、クッキー消費、toast / 女王つぶやき。
- `maybeSpawnLargeFood()` に `G.major.workerBigCarry` のゲートを追加。未解放なら大物は出現しない。
- ボタンのコスト表示を「将来実装」→「🍪 5」に更新。
- インラインエフェクトとチップテキストを解放状況に応じたわかりやすい内容に更新。

セーブ互換:

- `G.major.workerBigCarry` は既存フィールド（デフォルト false）のため、旧セーブでは未解放扱いになり大物が出なくなる（既プレイヤーは一度解放操作が必要）。

## 2026-05-31 レイド警戒バナーを画面最上部へ移動（47a0ce6）

目的:

- 警戒警報バナーが地面・巣入口付近に被って見えない問題を改善する。

変更:

- `#raid-banner` の `top` を `max(58px, calc(env(safe-area-inset-top) + 50px))` から `max(6px, calc(env(safe-area-inset-top) + 4px))` に変更。
- ノッチ付き端末でも safe-area 直下に収まり、ゲームキャンバスの地表・入口が見えるようになった。

## 2026-05-31 発酵室建設を予約方式に変更（1713c2f）

目的:

- ボタン押下時に `forceExpandRoom` を即時呼び出していたため、コロニーが密集していると「建設可能な位置が見つかりません」で失敗していた問題を根本的に解決する。
- 兵舎設計図と同じ「予約→建築AI優先建設」の考え方に統一する。

変更:

- `G.fermentRoomPending`（予約数・整数、デフォルト0）を追加。セーブ/ロード対象。
- ボタンクリック時: 条件チェック・食料消費 → `G.fermentRoomPending++` のみ。`forceExpandRoom` は呼ばない。
- `getDigTarget()` にメインシャフト・兵舎の直下（`score: 9800`）の高優先ブランチを追加。予約がある場合は毎フレーム `forceExpandRoom('ferment')` を試みる。成功したらカウントを減らす。今フレームが無理でも次フレーム以降で自動再挑戦。
- `canBuy`・`getFermentRoomInlineEffect`・`getFermentRoomTipText` に予約数を考慮。予約中は「🔨 建設予約中 (N/2室)」と表示。
- 上限チェック: 建設数＋予約数 ≥ `FERMENT_ROOM_MAX` でボタン無効化。

## 2026-05-31 forceExpandRoom の密集時失敗を修正（b16b125）

目的:

- コロニーが密集（部屋40個以上）していると `forceExpandRoom` が80回全て衝突して `null` を返し、発酵室建設が失敗していた問題を改善する。

変更:

- 親ノード候補を「mainTipId または ランダム1個の shaft」から「全 visible shaft（mainTipId 優先）」に拡張。
- 親1個あたり最低40回、合計200回以上の試行に増加。
- 配置距離の上限を旧 `baseLen * 1.25` から `baseLen * 1.45` に拡大し、密集部分を迂回できるようにした。
- ループを `for(parent) { for(t) { ... } }` のネスト構造に変更し、親を切り替えながら探索する。

備考:

- この修正は発酵室予約システムへの移行と組み合わせることで、「配置失敗でもエラーにならず次フレームで再試行」という動作を実現している。

## 2026-05-31 スマホで研究ボタンが押せない問題を修正（dd4bac2）

目的:

- 研究タブの「研究する」ボタンがスマホで反応しない問題を修正する。

原因:

- 親の `#control-panel` が `touch-action: pan-y`（縦スクロール専用）に設定されていたが、`.research-node-action` に `touch-action` が未設定だったため、ブラウザがタッチをスクロール操作か判定待ちし、`click` イベントの発火が不安定だった。
- さらに `updateResearchUI()` が毎フレーム `innerHTML` を置き換えていたため、タップ中に `e.target` の DOM 要素が破棄されるリスクがあった。

変更:

- `.research-node-action` に `touch-action: manipulation` を追加（`.dock-item` と同じ対策）。
- `updateResearchUI()` 内で `researchUI.branchList.innerHTML` を変更前の HTML と比較し、同一なら更新をスキップするようにした（毎フレームの不要な DOM 置き換えを防止）。

## 2026-05-31 大物運搬イベント バランス・外見調整まとめ

以下の調整を順次実施した。

**外見調整（fd09598）**
- 餌の描画半径を `dp(17)` → `dp(26)`（約1.5倍）に拡大
- 中央の十字模様（葉脈線）を削除
- 枠の不透明度を `0.92` → `0.25` に大幅低減
- 必要アリ数を 5 → 15 に増加、出現ゲートを 12 → 20 に引き上げ

**運搬速度・浮きアニメーション追加（2ce9bca）**
- 運搬速度を `dp(34)` → `dp(17)`（半速）に変更
- 運搬開始時に餌が `dp(26)` まで浮き上がるアニメーション（`lf.floatY`）を追加
- 運搬中の揺れ幅を `dp(1.2)` → `dp(4.5)`、頻度を 3 → 5.5 に増加
- 浮いている分だけ影が小さく薄くなる処理を追加

**浮き量・揺れ幅の調整（90a9d1e）**
- 浮きの上限を `dp(26)` → `dp(11)`（約42%）に削減
- 揺れ幅を `dp(4.5)` → `dp(3.0)` に削減

**建築ターゲット選択バグ修正（0f25af8 / ca59e35）**
- `forceShaft` の既存エッジ選択が配列順（＝古い順）で最初に見つかったものを採用していたため、
  入口から遠い右端の古いエッジが優先的に選ばれて変な場所を掘り続ける問題を修正。
- 修正①（forceShaft）：候補を全収集し「進捗が多い順→入口に近い順」でソートして選ぶように変更。
- 修正②（forcedType既存エッジ）：同様に配列先頭採用をやめ、入口に最も近い候補を選ぶように変更。
- 修正③（既存ペンディング全体スコア）：Y距離のみのスコアに入口からのX距離ペナルティ（`* 0.015`）を追加。
- 3か所すべての修正により、建築アリが巣の中心付近を優先して掘るようになった。

**大物出現率を半減（8822625）**
- 出現間隔を 60〜120秒 → 120〜240秒 に変更
- 抽選外れ時の再抽選間隔を 25秒 → 50秒 に変更

## 2026-05-31 Large food carry event MVP

Purpose:

- Add a minimal surface "large food" carry event without touching the existing systems.
- A big food appears on the surface, idle workers gather, escort it to the nest entrance, and the colony gains food.
- Intentionally scoped to the carry event only. No leaf/mushroom/cultivation/expedition/surface-combat systems.

Changes:

- Added a runtime-only event slot `S.largeFood` (single event at a time) and a `S.largeFoodTimer` countdown. Neither is saved.
- Added gameplay constants: min worker gate, required gather count, 60-120s spawn interval with a low-probability roll and short retry, gather timeout, carry speed, reward, and draw radius.
- Added system functions near the ant-update code:
  - `spawnLargeFood()` builds one event on the surface, offset from the entrance, with an irregular polygon shape, required worker count, and a worker-scaled food reward.
  - `maybeSpawnLargeFood(dt)` rolls the timer; only when there is no active event, no raid, and `G.ants.worker >= LARGE_FOOD_MIN_WORKERS`.
  - `updateLargeFood(dt)` runs the state machine `waiting -> gathering -> carrying -> done`, moves the food to the entrance during carry, grants the food reward once on arrival, and clears the event. Aborts on raid.
  - `tryAssignLargeFood(a)` / `releaseFromLargeFood(a)` assign an idle worker to the event and release them back inside via the existing `ret` flow.
  - `drawLargeFood(ctx, view)` draws the food as a shadowed irregular green polygon with a `arrived/required` or `搬送中` label, on the same surface line as workers.
  - `countLargeFoodWorkers()` counts assigned/arrived workers by scanning `S.ants` (no per-ant stable IDs needed).
- Added three worker tasks: `go_large_food`, `large_food_wait`, `large_food_carry`. Assignment happens in the worker idle branch (highest priority, capped at `requiredWorkers`); only idle workers join.
- Wired calls: `updateLargeFood(dt)` before `updateAnts(dt)` in `update`; `drawLargeFood(ctx, view)` before the raid-enemy draw in `render`; `S.largeFood.x` shift in `shiftWorldX(dx)`.
- Phase 4 integration: `getAntUpdateInterval()` returns 1 (full update every frame) for the three large-food tasks, so escorting workers never freeze under AI throttling. Workers escorting/gathering also abort to the entrance when a raid starts.
- Debug: key `L` and `window.__spawnLargeFood()` force-spawn one event.

Data shape (`S.largeFood`):

- `id, x, y, state, requiredWorkers, assignedWorkers, arrivedWorkers, rewardFood, progress, rewarded, r, seed, shape, life, carryStartX, t, doneT, spawnTime`

Reward:

- `rewardFood = LARGE_FOOD_REWARD_BASE(300) + 50 * min(G.ants.worker, 40)` food, added once on arrival, clamped to `G.caps.food`.

Save/Load/Offline:

- Not saved, not restored, not part of offline progression. The event simply disappears on reload, which is intentional for the MVP.

Verification:

- Extracted inline JavaScript and ran `node --check` (syntax OK).
- Ran `git diff --check` (no whitespace errors).
- Headless Chrome via CDP (real time + `S.timeScale=12`), main flow PASS: game initializes with no console errors; forced event reaches `gathering` (4 workers arrived for required 2), then `carrying`, food moves to the entrance, food reward `+1545` is granted once, the event becomes null, and a second `__spawnLargeFood()` call keeps a single slot. Existing `surf/ret/go_in` tasks and normal food production keep running; zero console errors during the run.
- Headless Chrome via CDP spawn-condition test PASS: no spawn at worker 5 (below gate), natural timer spawn at worker 24, and no spawn while a held `attack` raid is active.

Remaining notes / future hooks:

- Reward is food only. Cookie/other rewards, multiple simultaneous events, and a research node for the event are intentionally out of scope.
- The surface large-food slot and irregular-blob/escort presentation are designed to be extendable later toward leaf/mushroom carry or surface combat, but none of that is implemented now.
- Worker participation is idle-only and capped at `requiredWorkers`; nurse/builder/soldier and non-idle workers are never pulled in.

## 2026-05-30 Right HUD resource boxes always visible

Purpose:

- Stop hiding top/right HUD resource boxes such as cookie, larvae, rate, and rest room before their first unlock/discovery.

Changes:

- Changed `.res-box.ui-locked` so it no longer removes HUD resource boxes from layout.
- Changed progressive UI initialization/update to clear `ui-locked` from HUD boxes instead of hiding them.
- The values now remain visible as `0`, `0/s`, or the current default until the related system progresses.

Verification:

- Extracted inline JavaScript and ran `node --check`.

## 2026-05-30 Phase 5B depth and barracks research migration

Purpose:

- Move the remaining depth/geology and military buy-once major upgrades into the research system.
- Keep Phase 3 builder assignment logic, Phase 4 Perf-1, and Phase 5A passive research nodes intact.

Changes:

- Added research branch `geology`.
- Added research node `geo_depth_2` for Depth II unlock using the old cookie cost and builder Lv2 condition.
- Added research node `geo_depth_3` for Depth III unlock using the old cookie cost, `geo_depth_2` prerequisite, and builder Lv4 condition.
- Added research node `military_barracks_blueprint` for the barracks blueprint using the old cookie cost and builder Lv3 condition.
- Hid `btn-major-depth2`, `btn-major-depth3`, and `btn-major-barracks` from the normal upgrade dock and removed their dock purchase availability.
- Kept the old DOM IDs and old `G.major.depth2`, `G.major.depth3`, and `G.major.barracks` flags for compatibility.
- Added `hasDepth2Unlock()`, `hasDepth3Unlock()`, and `hasBarracksBlueprint()` and moved depth/barracks checks to those helpers.
- Existing old flags now mark the matching research nodes unlocked, while new research purchases keep old flags true for compatibility paths.
- Preserved the barracks flow: blueprint research unlocks `G.major.barracks`, then first barracks construction remains prioritized by builder target selection, and soldier hiring still waits for an actual barracks room.
- Updated colony goals for depth and barracks to use the new helper-based unlock checks.

Verification:

- Extracted inline JavaScript and ran `node --check`.
- Ran `git diff --check`.
- Ran headless Chrome `--dump-dom` with virtual time and checked output for `Uncaught`, `ReferenceError`, `TypeError`, and `SyntaxError` patterns.
- Static checks confirmed the new nodes, helpers, hidden old buttons, and research-tab redirects.
- In-app browser automation was unavailable in this environment because the browser connection failed during sandbox setup.

Remaining notes:

- Golden Finger, active cookie boost, and future big-carry flow remain outside research.

## 2026-05-30 Phase 5A passive major research migration

Purpose:

- Move the light buy-once passive major upgrades into the research system so research owns permanent ability unlocks and the upgrade dock stays focused on repeatable/structural actions.
- Keep Phase 3 builder logic and Phase 4 Perf-1 rendering/AI changes untouched.

Changes:

- Added research node `cookie_find_2x` (`甘味探索`) in the ferment branch with the old cookie x2 cost.
- Added research node `soldier_jaw_2x` (`顎強化`) in a new defense branch with the old soldier attack x2 cost.
- Hid the old `btn-major-cookie2x` and `btn-major-jaw2x` dock buttons with CSS and removed them from upgrade dock availability.
- Kept the old DOM IDs and old `G.major.cookie2x` / `G.major.jaw2x` flags for compatibility.
- Added compatibility helpers so old saves with those flags mark the corresponding research nodes as unlocked, and new research purchases keep the old flags true for remaining compatibility paths.
- Changed cookie find chance and soldier power calculations to use the new research-aware helpers.
- Redirected any direct old-button click path to the research tab instead of allowing a second purchase route.

Verification:

- Static checks confirmed the two old buttons are hidden and their upgrade definitions are not available.
- Static checks confirmed cookie chance uses `hasCookieFind2x()` and soldier power uses `hasSoldierJaw2x()`.

Remaining notes:

- Golden, depth, barracks, Golden Finger, cookie active boost, and other major upgrade flows were not migrated in this pass.

## 2026-05-30 Builder visual reservation cleanup

Purpose:

- Make the visible builder construction highlights match the Phase 3 target reservation cap.
- Hide abandoned partial dig slivers that are no longer assigned to active builder work.

Changes:

- Added helpers to detect whether an edge is currently assigned by `S.buildAssignments`.
- Cleared visible builder `digT` when it no longer belongs to the current assignment set.
- Changed partial tunnel rendering so unfinished edges are drawn only when completed enough for normal paths or currently assigned to builder work.
- Changed the active dig highlight to use `S.buildAssignments.targets` instead of stale visible-builder targets.

Verification:

- Extracted inline JavaScript and ran `node --check`.
- Ran `git diff --check -- index.html`.
- Ran headless Chrome `--dump-dom` with virtual time and checked output for `Uncaught`, `ReferenceError`, `TypeError`, and `SyntaxError` patterns.

## 2026-05-30 Phase 4 Perf-1 lightweight MVP

Purpose:

- Reduce Canvas 2D draw overhead and per-frame ant AI work before larger ant counts and future carry/combat systems.
- Keep the current `S.ants` structure, Canvas 2D renderer, and Phase 3 builder separation intact.

Changes:

- Added batched dot-mode ant rendering through `drawAntDotsBatched()`.
- Dot mode now groups base ant colors, carry markers, golden glow, and panic rings into a small number of Canvas path/fill calls instead of one full draw routine per ant.
- Kept sprite and vector renderers intact for closer/lower-count views.
- Strengthened auto LOD:
  - `dot` when visible ants are at least 500 or zoom is below 0.62.
  - `sprite` when visible ants are at least 180 or zoom is below 0.88.
  - `vector` remains the close/low-count mode.
- Added conservative AI throttling:
  - transport, construction, combat, cargo, golden ants, raid, and invader-response ants still full-update every frame.
  - idle, rest, and room-wander ants update at lower frequency by role/task.
  - light frames keep rest/wander motion alive without running full role reassignment logic.
- Added `S.frameCount` and expanded `S.perf` with `aiFull`, `aiLight`, `aiSkipped`, `drawDot`, `drawSprite`, `drawVector`, and `drawBatches`.
- Expanded the perf debug overlay with logical population, used render mode, LOD usage, AI update counts, and draw mode counts.

Verification:

- Extracted inline JavaScript and ran `node --check`.
- Ran `git diff --check`.
- Ran headless Chrome `--dump-dom` with virtual time and checked output for `Uncaught`, `ReferenceError`, `TypeError`, and `SyntaxError` patterns.
- Static path check confirmed render cap options remain `160 / 300 / 600 / 1000` and render modes remain `auto / vector / sprite / dot`.

Remaining notes:

- AI throttling is intentionally conservative. It reduces low-priority per-frame work but does not yet separate nurse/worker/soldier throughput from visible ants.
- Sprite/vector are not fully batched; dot mode is the main Perf-1 draw win.
- Browser screenshot/interactive mode cycling was not available in this environment, so verification focused on syntax, startup, and code-path checks.

## 2026-05-30 Ant junction heading and goal rewards

Purpose:

- Remove the brief sideways ant rotation seen at shaft junctions.
- Give colony goals small completion rewards so achievements have mechanical value.

Changes:

- Replaced endpoint-only ant heading sampling with forward/backward edge sampling through `getEdgeTravelAngle()`.
- Updated both path movement and edge movement to preserve travel direction at curve endpoints and junctions.
- Added per-goal reward definitions for food and/or cookies.
- Added goal reward application on first achievement completion and reward text in the goal tree.
- Existing completed goals do not re-grant rewards because `G.achievements` remains the single completion guard.

Verification:

- Extracted inline JavaScript and ran `node --check`.
- Ran `git diff --check`.
- Ran headless Chrome `--dump-dom` with virtual time and checked output for `Uncaught`, `ReferenceError`, `TypeError`, and `SyntaxError` patterns.

## 2026-05-30 Tutorial first-step tap gate fix

Purpose:

- Prevent the first tutorial step from advancing automatically when an existing save already has eggs or population.

Changes:

- Changed the first tutorial wait condition from total eggs/population to tutorial-session TAP count.
- Added `TUT.firstStepTapCount` and increment it only when the TAP button lays an egg during tutorial step 0.

Verification:

- Not run per request.

## 2026-05-30 Builder parallel target cap tuning

Purpose:

- Keep Phase 3 builder parallelism from spreading construction across too many simultaneous targets.
- Preserve parallel construction while making the colony feel more focused.

Changes:

- Reduced `BUILDER_ASSIGNMENT_MAX_TARGETS` from 8 to 3.
- Builder work slots still scale from `G.ants.builder`, but extra slots now stack onto priority/stackable targets once 2-3 active targets exist.

Verification:

- Extracted inline JavaScript and ran `node --check`.
- Ran `git diff --check`.
- Ran headless Chrome `--dump-dom` with virtual time and checked output for `Uncaught`, `ReferenceError`, `TypeError`, and `SyntaxError` patterns.

## 2026-05-30 Desktop right-panel HUD cleanup

Purpose:

- Reduce information density at the top of the desktop side panel without changing the mobile layout.
- Keep food, cookie, and population as the primary desktop HUD resources.
- Move always-visible action buttons, including the red error button, into the gear menu on desktop.

Changes:

- Added desktop-only `@media (min-width: 960px)` grid styling for `#top-bar`.
- Made food, cookie, and population span the primary row, with eggs, larvae, rate, rest, season, and depth as smaller secondary chips on one row.
- Enabled the existing `#btn-menu` / `#mobile-menu-sheet` menu path on desktop.
- Kept the desktop gear button as a compact square overlay so it does not consume a tall HUD column.
- Kept all existing action button IDs and moved `#top-actions` into the menu instead of removing or renaming buttons.
- Unified menu action button borders in the desktop menu so the warning action is no longer a persistent red outline in the HUD.
- Restyled the growth-factor line as desktop-only chips using the existing `.support`, `.penalty`, and `.blocker` spans.

Verification:

- Extracted inline JavaScript and ran `node --check`.
- Ran `git diff --check`.
- Ran headless Chrome `--dump-dom` with virtual time and checked output for `Uncaught`, `ReferenceError`, `TypeError`, and `SyntaxError` patterns.
- Confirmed the CSS changes for layout/chips are scoped to `@media (min-width: 960px)`; the existing `@media (max-width: 959px)` mobile rules were not changed.

## 2026-05-30 Save import load button

Purpose:

- Make save import/load discoverable without relying on long-pressing the export button.
- Keep the mobile menu layout stable after adding the extra action.

Changes:

- Added a dedicated `btn-save-import` top action with 📥 icon and `ロード` mobile label.
- Kept the existing export-button long-press import shortcut for compatibility.
- Reused the existing `doImport()` prompt-based load flow.
- Hid the new load button by default in CSS and enabled it alongside the export button in JS, matching the existing export behavior.

Verification:

- Extracted inline JavaScript and ran `node --check`.
- Ran `git diff --check`.
- Confirmed the mobile menu already uses a 2-column grid for `#top-actions`, so the added load action wraps into the menu without changing the bottom sheet controls.

## 2026-05-30 Phase 3 Builder real-count work power and target reservations

Purpose:

- Stop render cap / visible builder count from being the main driver of construction speed.
- Make builder work scale from `G.ants.builder` while keeping visible builders as representative animation.
- Add target reservations so multiple builder slots can spread across several dig targets instead of stacking everywhere.

Changes:

- Added runtime-only `S.buildAssignments` with active target reservations and debug stats.
- Added builder work-slot calculation from logical builder count:
  - 1 builder -> 1 work slot
  - 5 builders -> 5 work slots
  - 20 builders -> 10 work slots
  - 50 builders -> 15 work slots
  - hard cap: 18 work slots
- Added target caps so many builders can open several parallel targets without creating unlimited pending edges.
- Added stack limits for important work:
  - main shaft can stack several slots
  - first barracks after blueprint can stack several slots
  - force/priority construction can stack modestly
  - normal targets mostly stay one slot each
- Moved actual dig progress to `updateBuilderLogic(dt)`, which advances `edgeFrac` from logical builder assignments.
- Changed visible builder ants so their haul loop is presentation only; they no longer directly call `advanceDigEdge()`.
- Visible builder ants now prefer active assigned targets, so they still appear to travel to and work at real construction sites.
- Added perf/debug overlay line for builder real count, visible count, work slots, target count, and render cap.

Verification:

- Extracted inline JavaScript and ran `node --check`.
- Ran `git diff --check -- index.html`.
- Ran headless Chrome `--dump-dom` with virtual time and checked output for `Uncaught`, `ReferenceError`, `TypeError`, and `SyntaxError` patterns.
- Confirmed the builder work-slot formula is independent of render cap and scales with logical builder count.

Remaining notes:

- Phase 3 only separates builder construction progress. Nurse/worker/soldier per-frame task throughput can still depend on `S.ants` and remains a future cleanup item.
- Builder assignment reservations are runtime-only and are rebuilt after load, which is intentional.
- Construction speed is deliberately capped/softened to avoid making large builder populations linearly overpowered.

## 2026-05-30 Barracks unlock visibility and first-build priority

Purpose:

- Clarify the state where the barracks blueprint has already been bought but no barracks room has appeared yet.
- Make the first barracks room a real priority after buying the blueprint.

Changes:

- Kept the barracks blueprint card visible as a disabled "construction pending" status until the first barracks room exists.
- Changed the soldier level inline hint to show the current lock reason while soldiers are still locked.
- Changed the blueprint purchase toast so it says soldiers become hireable after the barracks is built.
- Changed builder target selection so the first barracks room wins over nursery/food/rest preferences and the temporary forced-shaft preference.

Verification:

- Extracted inline JavaScript and ran `node --check`.
- Ran `git diff --check`.
- Ran headless Chrome/Playwright against `index.html`; in a blueprint-bought/no-barracks state the barracks card stays visible as `建設待ち`, soldier hire/level hints show `兵舎の初建設が必要`, and `getDigTarget()` returns `expand:soldier` even while forced-shaft is active.

## 2026-05-30 クッキー室描画整理

目的:

- クッキー室の背景に大きく出ていたクッキー絵文字を消す
- クッキー室内の在庫省略表示 `+数字` を消す
- クッキー室に運ばれたクッキーを、通常の餌と同じ部屋内スロット配置で表示する

変更:

- クッキー室専用の背景絵文字・棚グリッド・`+N` 描画を削除
- `invCookie` をクッキー室だけ通常の `slots` 描画列に含め、餌と同じ配置ルールで金色の小粒として表示
- クッキー粒の見た目だけ、茶色の小点を少し足して食料と区別できるようにした

確認:

- `node --check` 実行済み
- `git diff --check` 実行済み
- ヘッドレスChrome/CDPで、クッキー室在庫59個でも `🍪` 背景と `+数字` がcanvasへ描画されないことを確認
- ヘッドレスChrome/CDPで、コンソールエラーが出ないことを確認

## 2026-05-30 黄金の指と黄金卵系統

目的:

- 黄金蟻を自動産卵からは生まれないようにし、タップ産卵の価値として整理する
- 旧「黄金出現 x2」を、レベル制スキル「黄金の指」へ置き換える
- 黄金蟻を一律成虫化抽選ではなく、黄金卵から育つ流れにする

変更:

- `goldenFingerLv` を追加し、Lv1〜5でタップ時の黄金卵率が上がるよう変更
- タップ/女王タップ時だけ黄金卵を抽選し、自動産卵とオフライン自動産卵では黄金卵を出さないよう変更
- `goldenEggs` / `goldenLarvae` と部屋在庫 `invGoldenEgg` / `invGoldenLarva` を追加
- 黄金卵→黄金幼虫→黄金成虫の系統を保持し、黄金幼虫が成虫化したときだけ黄金蟻バフを発動
- 旧 `btn-major-golden2x` はIDを残したまま「黄金の指」ボタンへ表示変更
- 黄金卵と黄金幼虫を部屋内で金色に描画するよう追加

確認:

- `node --check` 実行済み
- `git diff --check` 実行済み
- ヘッドレスChrome/CDPで、手動タップ時に黄金卵が生まれることを確認
- ヘッドレスChrome/CDPで、自動産卵では黄金卵が生まれないことを確認
- ヘッドレスChrome/CDPで、黄金幼虫が成虫化すると黄金蟻カウントと黄金バフが発動することを確認
- ヘッドレスChrome/CDPで、コンソールエラーが出ないことを確認

## 2026-05-30 育児蟻の待機散開とスマホ表示調整

目的:

- 育児蟻が暇なときに部屋中心へ重なり、一匹に見える問題を改善する
- 序盤の女王室で、タップ時に緑の食料点と卵点が入れ替わって見える問題を抑える
- スマホ版で女王蟻が小さく見える問題と、甘い香りの欠片の秒数表示を調整する

変更:

- 育児蟻の待機時に、現在いる部屋または育児室/女王室のスロットへ短時間ばらけて移動する処理を追加
- 働き蟻の部屋内待機処理を共通ヘルパー化し、短時間で仕事再判定へ戻るよう整理
- 女王室では見た目用の食料点を描かず、卵点の色がタップごとに入れ替わって見える状態を防止
- スマホ幅の女王蟻描画倍率を上げ、甘い香りの欠片はアイコンだけを表示

確認:

- `node --check` 実行済み
- `git diff --check` 実行済み
- ヘッドレスChromeのスマホ幅で、育児蟻8匹が部屋内の8か所へ分散することを確認
- ヘッドレスChromeのスマホ幅で、女王室に見た目用食料があっても緑点が描画されないことを確認
- ヘッドレスChromeのスマホ幅で、甘い香りの欠片の秒数DOMが出ないことと、コンソールエラーが出ないことを確認

## 2026-05-30 女王吹き出し位置とオフライン成長修正

目的:

- 女王のつぶやき吹き出しがスマホ画面で見づらい位置に出る問題を修正する
- 閉じていた間の自動産卵分が、同じオフライン時間中の孵化/成虫化にほぼ反映されない問題を修正する

変更:

- 女王の吹き出しをワールド座標固定から画面座標固定へ変更し、画面端とスマホUIに収まるようクランプ
- 吹き出しテキストを複数行に折り返し、長文でも画面外へ出にくくした
- オフライン計算を「産卵 → 卵在庫反映 → 幼虫化 → 給餌近似 → 成虫化」の順に整理
- オフライン中の幼虫化数と成虫化数を別々に表示

確認:

- `node --check` 実行済み
- `git diff --check` 実行済み
- ヘッドレスChromeのスマホ幅で、10分オフライン相当の自動産卵分が幼虫化し、さらに一部が成虫化することを確認
- ヘッドレスChromeのスマホ幅で、女王吹き出しが女王付近かつ画面内に表示されることを確認

## 2026-05-30 スマホ用アップグレード効果表示

目的:

- スマホでアップグレードDockの効果フロートが残りやすく、次の効果が読みづらい問題を改善する

変更:

- スマホ幅ではアップグレードボタン内に薄い「次効果」行を表示
- 蟻の雇用ボタンにも、増員時の主な効果を短く表示
- タッチ/ホバーなし環境では `hover-tip` を出さず、タップ後に残らないように調整
- スマホのアップグレードグリッドを3列寄りにし、効果文が潰れにくいサイズへ調整

確認:

- `node --check` 実行済み
- `git diff --check` 実行済み
- ヘッドレスChromeのスマホ幅で、ボタン内効果文が表示され、タッチ後に `hover-tip` が表示状態にならないことを確認
- ヘッドレスChromeのPC幅で、ボタン内効果文はDOMにあっても非表示で、PCメニュー表示が変わっていないことを確認

## 2026-05-29 建築アリ待機バグ修正

目的:

- 旧セーブ/現行セーブで掘削帯 `S.band` が復元されず、食料上限でも建築アリが掘削候補を失って待機する問題を修正する

変更:

- `world.band` をセーブ対象に追加
- ロード時に `savedWorld.band` を復元
- `band` が無い/壊れている旧セーブでは、可視ノードから掘削帯を再構築
- 建築AIの掘削対象選択前に `ensureBandReady()` を呼び、無効な掘削帯を自動補修

確認:

- `node --check` 実行済み
- 旧形式セーブ（bandなし、食料1200/1200、建築アリ1）で、ロード後に建築対象 `food` を取得し `搬出中` になることをChrome headless/CDPで確認

## 2026-05-29 スマホUIのボトムシート化

目的:

- スマホ縦画面で巣のcanvasを主役にし、常時UIを最小限にする

変更:

- 959px以下でトップバーを食料・クッキー・個体数・⚙の1段表示へ変更
- 卵、幼虫、増加速度、休憩室、季節、深度、各種ボタンをスマホトップバーから退避
- 💾/📤/👑/🗺️/🧭/⚠/描画設定を⚙メニューに集約
- `#control-panel` をスマホ時だけボトムシート化し、折りたたみ時はハンドル、成長バー、TAPボタンだけを常時表示
- ハンドルタップで強化パネル、タブ、各購入UIを展開/格納
- PC幅では既存ボタンを元の場所へ戻し、`@media (min-width: 960px)` の見た目を維持

確認:

- `node --check` 実行済み
- `git diff --check` 実行予定
- Chrome headless/CDPでスマホ390x844を確認: 折りたたみ時のcanvas相当表示比率 約0.77
- Chrome headless/CDPでPC幅を確認: `#btn-menu` 非表示、既存ボタン配置復元

## 2026-05-29 スマホ表示の省スペース化

目的:

- GitHub Pages をスマホで開いたとき、上部HUDと下部操作パネルが縦に詰まりすぎる状態を改善する

変更:

- 680px以下では上部HUDを4列グリッド化し、資源カードと操作アイコンの幅・高さを圧縮
- 季節/深度カードと次の目標カードをスマホ幅向けに調整
- 下部操作パネルの最大高さ、余白、成長バー、描画設定ボタン、TAPボタン、タブ、ドックカードを小さめに調整
- スマホではバージョンタグを非表示にし、ブラウザ下部バーやカードとの重なりを避ける

確認:

- `index.html` のHTML内JavaScriptを抽出して `node --check` 実行済み
- スマホ幅の実ブラウザ確認はローカル確認環境の制限で完走できず。CSS差分と構文チェックを優先して公開反映

このファイルは、仕様そのものではなく「なぜその判断にしたか」を残すための開発ログです。
最新仕様の一覧は `CURRENT_SYSTEM_OVERVIEW.md` を参照します。

## 2026-05-29 GitHub Pages公開完了

目的:

- スマホブラウザからURLで遊べる状態にする

公開情報:

- GitHubリポジトリ: `https://github.com/san-myaku/ant-clicker`
- GitHub Pages URL: `https://san-myaku.github.io/ant-clicker/`
- 公開ブランチ: `main`
- 公開フォルダ: `/ (root)`

判断:

- 当面はURL共有向けの仮公開として扱う
- 公開URLなのでアクセス制限ではないが、`robots.txt` と非拡散運用で見つかりにくくする

確認:

- ユーザー側でGitHub Pages有効化と公開完了を確認済み

## 2026-05-29 URL共有向け仮公開設定

目的:

- 誰でも検索で見つけやすい公開ではなく、URLを知っている人だけに近い形でテスト公開する

変更:

- `robots.txt` を追加し、検索エンジンにクロールしないよう依頼
- 現行仕様メモに、GitHub Pages はアクセス制限ではなく公開URLであることを明記

判断:

- GitHub Pages 単体では本当の限定公開にはならない
- 今回は簡単さを優先し、Public リポジトリ + GitHub Pages + URL共有運用で進める

確認:

- `robots.txt` の内容確認済み
- `index.html` のHTML内JavaScriptを抽出して `node --check` 実行済み

## 2026-05-29 `index.html` 正本化

目的:

- 更新時に `ant_colony_v23_improved.html` と `index.html` の2ファイルを同期する必要が出ないようにする
- オンライン公開時の入口である `index.html` をそのまま開発・公開の正本にする

変更:

- `index.html` と `ant_colony_v23_improved.html` が同一内容であることを確認
- 旧正本名 `ant_colony_v23_improved.html` を削除
- 現行仕様メモの対象ファイルを `index.html` に変更

確認:

- `index.html` のHTML内JavaScriptを抽出して `node --check` 実行済み

## 2026-05-29 オンライン公開準備

目的:

- スマホのブラウザから遊べるように、静的ホスティングへ載せやすい入口ファイルを用意する

変更:

- 現行版 `ant_colony_v23_improved.html` と同内容の `index.html` を追加
- `.gitignore` を追加し、`.claude/`、旧 `ant_colony_v22_*.html`、一時チェック用 `__tmp*.js` を除外
- 現行仕様メモに、公開用入口とセーブ同期なしの前提を追記

判断:

- ローカル保存データの移行は今回不要
- `localStorage` 保存は端末/ブラウザ/URLごとに分かれる前提で進める

確認:

- `ant_colony_v23_improved.html` と `index.html` のHTML内JavaScriptを抽出して `node --check` 実行済み
- `index.html` が現行版HTMLと同一内容であることをSHA256で確認済み

## 2026-05-29 クリックコンボ演出の削除

目的:

- コンボ表示は実効果がなく、プレイヤーにボーナスがあるように見えるため削除する

変更:

- コンボ文字表示 `.comboText` と `comboAnim` を削除
- `showComboText()` を削除
- コンボ専用SE `sfxCombo()` を削除
- 全画面タップ時の `_tapCombo` カウント処理を削除
- 通常のタップ産卵、リップル、卵パーティクルは維持

確認:

- HTML内JavaScriptを抽出して `node --check` 実行済み

## 2026-05-29 育児アリ人数の幼虫成長補助追加

目的:

- 育児アリを増やした価値を、卵→幼虫だけでなく幼虫→成虫にも少し反映する
- 幼虫側は給餌/ゴミ管理の意味を残すため、人数補正は卵→幼虫の半分に抑える

変更:

- `getNurseLarvaAdultCountMul()` を追加
- 幼虫→成虫に `1 + 育児アリ数 * 0.25` を乗せる
- オンライン進行、オフライン進行、UIの幼虫→成虫速度表示に同じ補正を適用
- 現行仕様メモに育児アリ人数補正を追記

確認:

- HTML内JavaScriptを抽出して `node --check` 実行済み

## 2026-05-29 育児Lvの幼虫成長倍率統一

目的:

- 育児Lvの効果を分かりやすくし、卵→幼虫と幼虫→成虫で倍率が違う違和感をなくす

変更:

- 幼虫→成虫に乗る育児Lv補正を、卵→幼虫と同じ `getNurseHatchMul(nLv)` に変更
- オンライン進行、オフライン進行、UIの幼虫→成虫速度表示を同じ倍率に統一
- 育児Lvツールチップを `孵化速度ボーナス` から `卵/幼虫成長ボーナス` に変更
- 現行仕様メモに育児アリLvの効果を追記

確認:

- HTML内JavaScriptを抽出して `node --check` 実行済み

## 2026-05-29 天気連続変更バグ修正

目的:

- 晴れ/雨などの天気が短時間に連続して切り替わる問題を直す

原因:

- 天気変更予定を `nextChangeAt` の24時間時計で管理していた
- 予定時刻が24時を跨いで小さい値に戻ると、現在時刻が夜の間ずっと `S.time >= nextChangeAt` になり、毎フレーム天気抽選されていた

変更:

- 天気変更判定を `S.weather.changeTimer` の残り時間方式に変更
- 旧セーブに `changeTimer` がない場合は、既存の `nextChangeAt` から残り時間を復元
- `nextChangeAt` は旧セーブ互換/状態確認用に残す

確認:

- HTML内JavaScriptを抽出して `node --check` 実行済み

## 2026-05-29 働きアリ強化コストの全体引き下げ

目的:

- 働きアリ強化を序盤から選びやすくし、食料生産の立ち上がりを軽くする

変更:

- 初回強化コストを食料 `100` から `50` に変更
- 2回目以降の基準コストを `200` から `100` に変更
- 伸び率 `1.35` は維持し、全体のコスト感だけをおおむね半分にする

確認:

- HTML内JavaScriptを抽出して `node --check` 実行済み

## 2026-05-28 現行安定化と育児/ゴミまわり調整

目的:

- 研究、発酵室、発酵アリ実装後の現行版を安定させる
- 次の大物運搬、葉っぱ、菌床などの大型追加に入る前に、現行UIと挙動の分かりにくさを減らす

主な変更:

- 通常UI側の描画設定ボタン `btn-render-settings-pub` を描画設定モーダルに接続
- `お掃除上手` の正式導線を研究ノード `hygiene_3` に一本化
- 旧major `G.major.workerClean` の実効参照と通常UI導線を削除
- 発酵アリ解放条件を「巣内に出現済みの発酵室 2室」と分かる表示に変更
- 発酵室パネルに自動投入、投入食料、稼働/待機ライン、処理時間、発酵アリ補正、予測クッキー/分を表示
- 幼虫→成虫バー付近に、給餌加速、ゴミ、収容上限の成長要因表示を追加
- クッキーブースト中の通常タップによるクッキー直接加算を削除
- 発酵室UIの残り時間を、発酵アリ速度補正込みの実時間表示に修正
- オンライン/オフライン進行の一部補正差を修正
- 育児アリの赤紫のお世話オーラを削除

ゴミ清掃の判断:

- ゴミは少量でも幼虫→成虫にデバフがあるため、通常清掃対象をゴミ `1` 以上に変更
- 給餌より優先する危険清掃ラインは通常 `3`、`hygiene_3` 後は `2`
- ゴミ室は「清掃解禁施設」ではなく「中盤以降の清掃効率アップ施設」として扱う
- ゴミ室がなくても、育児アリは入口へゴミを運んで廃棄する
- 危険清掃は卵/給餌より先、通常清掃は最低給餌枠の後、通常給餌の前に割り込む

お掃除上手の判断:

- 旧majorと研究ノードの二重管理は今後の研究ツリー拡張で混乱しやすいため、研究 `hygiene_3` に一本化
- 旧セーブ互換は不要という前提で、ロード時に `workerClean` は削除
- 掃除効果自体は `hasHygieneAdvancedClean()` 経由で維持し、研究取得後に効く

確認:

- HTML内JavaScriptを抽出して `node --check` 実行済み

## 2026-05-28 働きアリ初回強化コスト調整

目的:

- `未強化 -> 強化1/20` の初回コストが序盤に重く、働きアリ強化へ入りにくい問題を軽くする

変更:

- 働きアリ初回強化コストを食料 `200` から `100` に変更
- 2回目以降のコスト式は既存の `floor(200 * 1.35^現在強化値)` を維持

確認:

- HTML内JavaScriptを抽出して `node --check` 実行済み

## 2026-05-28 働きアリ強化表示の整理

目的:

- コスト支払い前の初期状態が `Lv.0` と見える違和感をなくす

変更:

- 内部値 `wLv = 0` とセーブ形式は維持
- 働きアリ強化の表示を `Lv.0` から `未強化` に変更
- 強化後は `強化1/20` のように表示
- ツールチップとトーストも `働きLvUP` ではなく `働き強化` / `働きアリ強化` に変更

確認:

- HTML内JavaScriptを抽出して `node --check` 実行済み

## 2026-05-28 幼虫成長表示の整理

目的:

- 給餌は「成長阻害」ではなく「成長加速」なので、`餌不足 -xx%` 表示による誤解を避ける

変更:

- 幼虫→成虫バー下の表示を `成長阻害` から `成長要因` に変更
- 給餌は `給餌加速 x0.xx` として表示し、ゴミや収容上限とは色と意味を分ける
- 現行仕様メモにも、給餌は加速要素、ゴミ/収容上限は阻害要素と明記

確認:

- HTML内JavaScriptを抽出して `node --check` 実行済み
- ローカルHTTP経由で `ant_colony_v23_improved.html` を読み込み、初期ロード時のコンソールエラーなし
- 旧 `workerClean` の実効参照が残っていないことを確認
- 育児アリのお世話オーラ描画の残参照がないことを確認

残課題:

- 実プレイでゴミ清掃頻度が強すぎないか確認
- 育児アリの待機が不自然に見える問題は、演出追加なしでいったん様子見
- クッキーブーストUIを残すか削除するか判断
- 発酵アリを個体として描画するかは未判断
- 遠征枝のMVP設計

## 2026-05-28 育児アリの最低給餌枠

目的:

- 序盤に育児アリが育児室で待機しているように見え、給餌している体感が弱い問題を減らす
- 幼虫がいるのに卵運び、幼虫運び、通常清掃へ偏りすぎる状態を避ける

変更:

- 給餌ジョブ検出を `findNurseFeedJob()` に切り出し
- 給餌開始処理を `tryStartNurseFeeding()` に切り出し
- 総アリ数 `6` 以上、育児アリあり、幼虫あり、食料庫あり、給餌不足ありの場合、最低 `1` 匹の育児アリを給餌へ優先的に回す
- 危険ゴミ清掃だけは給餌予約より優先
- 現行仕様メモの清掃優先順位も、最低給餌枠に合わせて更新

判断:

- 給餌は成長必須ではなく加速要素だが、序盤の見た目と理解に直結するため最低1匹だけ予約する
- 全育児アリを給餌優先にすると卵/幼虫搬送や清掃が詰まるため、予約枠は1匹に限定

確認:

- HTML内JavaScriptを抽出して `node --check` 実行済み
