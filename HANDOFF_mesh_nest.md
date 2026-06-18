# 引き継ぎ: メッシュ巣リライト（F1/F2 済み → F3以降）

> Codex/次セッション向け。`NEST_STRUCTURE_REDESIGN_PLAN.md` の続き。コールドで読んで続行できるように。
> 作業ブランチ: **`claude/nest-structure-redesign-osdsa8`**（origin にプッシュ済み、最新 `0ef760a`）。

## 今どこ
- 新しい「メッシュ巣」ジェネレーター `generateMeshNest()` を実装済み（index.html）。**devトグル限定のプレビュー**で、**本番の生成・セーブには未接続**（本番は旧 `initWorld`/`expandMap` のまま）。
- トリガー: dev mode（URL `?dev=1`）で出る 🕸️新メッシュ巣 ボタン（`#btn-dev-mesh-nest`）、または `window._dbg.generateMeshNest(opts)`。
- **F1（構造）+ F2（部屋の形・密度・横幅）はユーザーOK済み**。見た目: 女王（大）→蛇行シャフト→部屋の数珠つなぎクラスター（層内MST＋層間/女王はY字フォーク＋少数ループ）、レンズ/涙型・ラッパ口・不規則輪郭、71部屋・横幅81%・重なり4。

## 主要コード（関数名で探す。行番号はドリフトする）
- `generateMeshNest(userOpts)` … 本体。先頭で `S._meshNest=true`。
- `MESH_GEN_DEFAULTS` … 全チューニング値（`bands, roomsPerBand=12, widthUse=0.93, bandGap, firstBandTop, sideMargin=dp110, thinWall=dp8, extraLoops=4, interLayerLinks=2`。`bandHeight/intraLinks/interLinksPerBand/descents` はレガシー）。
- `meshRoomRadius(type)` … 種別ごとの部屋サイズ。`meshLensShape(n)` … 種別ごとの blobScale/floorFlat（涙型）。
- 接続: 層内 **MST**（部屋同士）＋ `forkConnect()` で女王→第0層・層間を **Y字ジャンクション**（中継shaftノード）。`extraLoops` で少数ループ。`addE` でシャフトを蛇行（短い枝は蛇行控えめ）。
- **`S._meshNest` フラグ**で共有描画を mesh 専用に切替（旧巣は非干渉）: `buildNodeBlobAndSlots`（14セグの不規則輪郭＋天井ドーム）、`buildEdgeStamps`（部屋接続部のラッパ口）。

## 次にやること（優先順）
1. **F2 仕上げ（軽い・任意）**: 食料の緑(#4ade80)が参考画像（種＝茶）と乖離 → チャンバー内の食料を種色に。土テクスチャ強化。
2. **F3 蟻の経路（本命）**: 現状の蟻移動は旧前提。メッシュ＝ループ対応の経路探索（最短/混雑回避）にする。`move()` と移動タスク（`go_q`/`go_n` 等）を確認。これが無いと正式採用できない。
3. **F4 建築AI・成長**: 新トポロジーで部屋が増えるロジック（`getDigTarget`/`rebuildBuilderAssignments`/`S.band`）。
4. **F5 正式採用**: セーブ新形式 + 本番を mesh に置換 + devトグル撤去。旧 `expandMap`/`initWorld` を廃止。

## 検証のコツ（重要）
- **headless プレビュー（`mcp__Claude_Preview__*`）は使うな**: タブが `visibilityState:hidden` に固着 → rAF 停止 → 描画されず・スクショ timeout。
- **Claude in Chrome（実ブラウザ）を使う**: `select_browser` → `navigate('http://localhost:8765/?dev=1&cb=<ts>')`（cb= でキャッシュバスト必須）→ `javascript_tool` で `window._dbg.generateMeshNest(opts)` ＋ チュートリアル/モーダル除去 ＋ `S.cam.x/y/scale` を直接セットしてフィット → `computer{action:'screenshot'}`（CDPがフレーム強制描画）。
- **中身を見たいとき**: 部屋ノードに `n.invEgg/invLarva/invFood` を直接代入すると D描画（ブルードの山/食料）が出る。カラーモードOFFは `#btn-color-mode` クリックでクリーム色に。
- **チューニングは userOpts でライブ**: `generateMeshNest({widthUse:..., roomsPerBand:..., thinWall:dp(...)})` で試し、良ければ `MESH_GEN_DEFAULTS` に焼く。`window.dp` でdp換算可。
- 健全性: 生成後に BFS で全ノード連結を確認、重なり（中心間 < 0.82×(rA+rB)）を数える。重なりは ≤4〜5 を目安（14部屋/薄壁まで攻めると15に増える）。

## ルール
- 挙動/見た目変更時は `DEVELOPMENT_LOG.md` と `CURRENT_SYSTEM_OVERVIEW.md` を同じコミットで更新。
- コミットはするが push はユーザー指示まで…の運用だが、本ブランチは WIP なので都度 push してOK（ユーザーが githack で確認している）。
- 内部関数は IIFE スコープ（`G`/`S`/`window._dbg` のみ外から触れる）。
