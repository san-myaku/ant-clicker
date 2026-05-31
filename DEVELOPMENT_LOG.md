# Development Log

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
