# 引き継ぎ: メッシュ巣リライト（F1/F2/F3 + F4 dev成長/初期室 + Realism F1 済み → F5以降）

> Codex/次セッション向け。`NEST_STRUCTURE_REDESIGN_PLAN.md` の続き。コールドで読んで続行できるように。
> 作業ブランチ: **`claude/nest-structure-redesign-osdsa8`**（origin にプッシュ済みの基準は `1ca35b7`。その後のローカル差分は `git diff` 参照）。

## 今どこ
- 新しい「メッシュ巣」ジェネレーター `generateMeshNest()` を実装済み（index.html）。**devトグル限定**で、本番の通常生成は旧 `initWorld`/`expandMap` のまま。
- トリガー: dev mode（URL `?dev=1`）で出る 🕸️新メッシュ巣 ボタン（`#btn-dev-mesh-nest`）、🌱成長メッシュ ボタン（`#btn-dev-mesh-growth`）、または `window._dbg.generateMeshNest(opts)`。
- **F1（構造）+ F2（部屋の形・密度・横幅）はユーザーOK済み**。見た目: 女王（大）→蛇行シャフト→部屋の数珠つなぎクラスター（層内MST＋層間/女王はY字フォーク＋少数ループ）、レンズ/涙型・ラッパ口・不規則輪郭、71部屋・横幅81%・重なり4。
- **F3（蟻の経路）は実装済み**。`findNodePath()` / `getPath()` を BFS から重み付き探索へ変更し、完成済みトンネルだけを対象に、ベジェ長＋混雑＋小さな揺らぎでルートを選ぶ。既存タスク API は維持。
- **F4（建築AI/成長）は dev 成長モードとして実装済み**。`generateMeshNest({growth:true})` は全メッシュグラフを内部生成した上で、入口＋女王房＋初期育児室1＋初期餌室1を開通して始める。建築AIは既存の未開通エッジを掘って部屋を段階解放する。growth中は旧 `expandMap()` / `forceExpandRoom()` で木構造を追加しない。
- **Realism F1（写真風土断面の第一段）は実装済み**。`terrain-realism-hybrid-concept.png` の方向に寄せ、静的土キャッシュへ土塊/細根/陰影付き小石、部屋の厚い土リップ、通路口の崩れ粒を追加した。ゲームロジック/セーブ形式は未変更。

## 主要コード（関数名で探す。行番号はドリフトする）
- `generateMeshNest(userOpts)` … 本体。先頭で `S._meshNest=true`。`{growth:true}` または `{preview:false}` で `S._meshGrowth=true` の成長モード。
- `MESH_GEN_DEFAULTS` … 全チューニング値（`bands, roomsPerBand=12, widthUse=0.93, bandGap, firstBandTop, sideMargin=dp110, thinWall=dp8, extraLoops=4, interLayerLinks=2`。`bandHeight/intraLinks/interLinksPerBand/descents` はレガシー）。
- `meshRoomRadius(type)` … 種別ごとの部屋サイズ。`meshLensShape(n)` … 種別ごとの blobScale/floorFlat（涙型）。
- 接続: 層内 **MST**（部屋同士）＋ `forkConnect()` で女王→第0層・層間を **Y字ジャンクション**（中継shaftノード）。`extraLoops` で少数ループ。`addE` でシャフトを蛇行（短い枝は蛇行控えめ）。
- **`S._meshNest` フラグ**で共有描画を mesh 専用に切替（旧巣は非干渉）: `buildNodeBlobAndSlots`（14セグの不規則輪郭＋天井ドーム）、`buildEdgeStamps`（部屋接続部のラッパ口）。
- 経路: `findNodeRoute()`（内部）/ `findNodePath()` / `getPath()`。`S._pathCongestion` でフレーム単位に混雑カウントを持つ。`window._dbg.getPathDebugStats()` で確認可。
- 成長: `getDigTarget()` が growth中だけ事前生成済みの未可視ノードへ伸びる edge を掘削候補にし、可視済み同士の未開通ループは `mesh-loop` として掘る。初期は `getInitialGrowthRooms()` / `revealPath()` で育児室1・餌室1まで開通する。`isMeshGrowthMode()` / `canDigMeshGrowthHiddenType()` / `getMeshGrowthLoopDigTarget()` で分岐。
- 食料表示: `drawFoodSeedGrain()` を室内在庫と運搬中の食料で共用。`drawCarriedFoodGrain()` / `getAntFoodSeed()` 経由で、持ち運び中・口移し中も黄土〜琥珀寄りの明るい種粒にした。建築アリの土と混ざらないよう暗い茶には寄せない。UI の食料色は緑のまま。
- 部屋レイヤー/影: `drawRoomForegroundRims()` をアリ描画後に重ね、部屋の手前リムでアリのはみ出しを隠す。`getRoomVisualRadii()` で `blobScaleX/Y` を反映し、メッシュ部屋の内側影が丸くずれないようにした。
- Realism F1: `bgSoilClods` / `bgRootlets` を `buildBackgroundAssets()` で生成し、`drawBackgroundDetails()` で静的土キャッシュに焼く。`drawRoomSoilLip()` は部屋境界に薄い土リップと控えめな崩れ粒を描き、`drawTunnelMouthDetails()` は部屋接続口に接触影と小石を足す。メッシュ時の `roomTint()` はアルファを 35% に下げ、土色を優先。`bgSoilBands` の長い横ストロークは描画停止し、共通背景は大きめの `soilPatternCanvas` で画像レイヤー風に寄せている。さらに `cavityPatternCanvas` を追加し、部屋/通路の内側だけに共通の空洞床テクスチャをワールド座標で敷いた上から、既存の影/床ハイライトを半透明で重ねる。

## 次にやること（優先順）
1. **F4検証/調整**: 成長速度、バンド進行、builder数ごとの掘削分散、ループ完成タイミングを実機で詰める。
2. **F5 正式採用**: セーブ新形式 + 本番を mesh に置換 + devトグル撤去。旧 `expandMap`/`initWorld` を廃止。
3. **追加仕上げ（任意）**: 土テクスチャ強化、経路分散の実機チューニング（`PATH_CONGESTION_*`）。

## 検証のコツ（重要）
- **headless プレビュー（`mcp__Claude_Preview__*`）は使うな**: タブが `visibilityState:hidden` に固着 → rAF 停止 → 描画されず・スクショ timeout。
- **Claude in Chrome（実ブラウザ）を使う**: `select_browser` → `navigate('http://localhost:8765/?dev=1&cb=<ts>')`（cb= でキャッシュバスト必須）→ `javascript_tool` で `window._dbg.generateMeshNest(opts)` ＋ チュートリアル/モーダル除去 ＋ `S.cam.x/y/scale` を直接セットしてフィット → `computer{action:'screenshot'}`（CDPがフレーム強制描画）。
- **中身を見たいとき**: 部屋ノードに `n.invEgg/invLarva/invFood` を直接代入すると D描画（ブルードの山/食料）が出る。カラーモードOFFは `#btn-color-mode` クリックでクリーム色に。
- **チューニングは userOpts でライブ**: `generateMeshNest({widthUse:..., roomsPerBand:..., thinWall:dp(...)})` で試し、良ければ `MESH_GEN_DEFAULTS` に焼く。`window.dp` でdp換算可。
- 健全性: 生成後に BFS で全ノード連結を確認、重なり（中心間 < 0.82×(rA+rB)）を数える。重なりは ≤4〜5 を目安（14部屋/薄壁まで攻めると15に増える）。
- F3検証済み: Playwright（file URL `?dev=1`）で `generateMeshNest()` → 83ノード/92エッジ、30/30 経路成功、経路予約が59エッジへ分散、コンソール/pageerror 0。目視用 `qa_screenshots/mesh_f3_smoke_clean.png` は79ノード/87エッジ、食料入り部屋27、室内食料の種色表示を確認。
- F4基本検証: `git diff --check` と inline script `node --check` は成功。Playwright（file URL `?dev=1`）で `generateMeshNest({growth:true})` → 80ノード/88エッジ、初期可視2/開通1、掘削後もノード数80のまま可視9/開通8、`mesh-loop` 選択、保存ガード（localStorage未作成）、コンソール/pageerror 0を確認。目視用 `qa_screenshots/mesh_f4_growth_smoke.png`。
- F4初期室/表示検証: Playwright（file URL `?dev=1`）で `generateMeshNest({growth:true, roomsPerBand:12, widthUse:0.93})` → 79ノード/87エッジ、初期可視5/開通4、育児室1・餌室1が可視、どちらも女王房へ経路あり、caps food/pop/egg が 1200/200/200、保存ガード有効、コンソール/pageerror 0。目視用 `qa_screenshots/mesh_f4_initial_food_layer_smoke.png`。
- Realism F1検証: Playwright（file URL `?dev=1`）で `generateMeshNest({growth:true, roomsPerBand:12, widthUse:0.93})` → 75ノード/82エッジ、初期可視5/開通4、育児室1・餌室1と両経路を維持、保存ガード有効、土素材 clods/rootlets/pebbles/roots = 220/52/420/16、静的土キャッシュ作成、コンソール/pageerror 0。目視用 `qa_screenshots/mesh_realism_f1_smoke.png`。
- Cavity共通画像レイヤー検証: Playwright（file URL `?dev=1`）で `generateMeshNest({growth:true, roomsPerBand:12, widthUse:0.93})` → 初期可視5/開通4、育児室1・餌室1と両経路を維持、保存ガード有効、`soilPatternCanvas=260x260`、`cavityPatternCanvas=300x300`、静的土キャッシュ作成、コンソール/pageerror 0。目視用 `qa_screenshots/mesh_cavity_texture_smoke.png`。

## ルール
- 挙動/見た目変更時は `DEVELOPMENT_LOG.md` と `CURRENT_SYSTEM_OVERVIEW.md` を同じコミットで更新。
- コミットはするが push はユーザー指示まで…の運用だが、本ブランチは WIP なので都度 push してOK（ユーザーが githack で確認している）。
- 内部関数は IIFE スコープ（`G`/`S`/`window._dbg` のみ外から触れる）。
