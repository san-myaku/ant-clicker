# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクトの形

単一ファイルのブラウザゲーム（アリコロニーのクリッカー/放置シム「Ant Colony V23」）。`index.html`（約26,000行）が**唯一のランタイムファイル**で、HTML・CSS（冒頭付近の `<style>` ブロック）・JavaScript（IIFE で包まれた1つの巨大な `<script>` ブロック）をすべて含む。ビルドシステム・package.json・テストフレームワーク・リンターは存在しない。

- GitHub Pages で公開: https://san-myaku.github.io/ant-clicker/ （公開だが低プロファイル運用。`robots.txt` でクロール拒否）
- セーブはブラウザオリジンごとの `localStorage` に保存されるため、ローカルとオンラインのセーブは別物
- コードコメントとドキュメントの多くは日本語、コミットメッセージは英語

## コマンド

ビルドやインストールの手順はない。よく使うワークフロー:

```bash
# 編集後にインラインスクリプトを構文チェック
sed -n '/^<script>$/,/^<\/script>/p' index.html | sed '1d;$d' > /tmp/game.js && node --check /tmp/game.js

# ブラウザ検証用にローカル配信（?dev=1 でdevモード）
python3 -m http.server 8765
# その後 http://localhost:8765/?dev=1&cb=<timestamp> を開く（cb= はキャッシュバスト用）
```

ユニットテストはない。検証は実ブラウザでページを操作して行う（プリインストールの Chromium + Playwright が使える。`file://` URL + `?dev=1` も可）。コンソールエラー / pageerror の確認とスクリーンショット撮影が基本。`MEMORY.md` の注意点:

- UI・モバイル幅・コンソールエラーの検証には headless Chrome/CDP を優先する。静的チェックで足りる場合、不安定なブラウザ接続のリトライに時間をかけない。
- ブラウザ検証を必須にするのは、見た目のレイアウト・インタラクション・ランタイムのコンソール挙動が関わる変更のみ。
- headless の「プレビュー」タブは `visibilityState: hidden` に固着することがあり、`requestAnimationFrame` が止まって描画/スクショが壊れる。実ブラウザか、フレーム描画を強制する CDP スクリーンショットを使うこと。

QA スクリーンショットは `qa_screenshots/` にコミットする。UI コンセプトボードは `design_concepts/` にある。

## ドキュメント運用（重要）

意味のあるゲーム更新のたびに、コード変更と**同じコミットで**以下の両方を更新する:

- `DEVELOPMENT_LOG.md` — 時系列の変更ログ（新しいエントリが上）
- `CURRENT_SYSTEM_OVERVIEW.md` — 現行システムの source-of-truth 概要。常に `index.html` と整合させる

挙動・セーブ形式・UI・AI・描画・アンロック・公開デプロイ前提・既知TODO のいずれかが変わったら適用する。その他のドキュメント: `MEMORY.md`（検証/ワークフローのメモ）、`HANDOFF_mesh_nest.md`（メッシュ巣リライトの引き継ぎ）、`NEST_REALISM_ROADMAP.md` と `NEST_STRUCTURE_REDESIGN_PLAN.md`（機能計画）。

## アーキテクチャ

すべてが `index.html` 内の単一 IIFE に入っている。グローバルに公開されるのは `G`・`S`・`window._dbg`（デバッグフック: `generateMeshNest`、`findNodePath`、`getPath`、`getPathDebugStats`、`initLegacyWorld`、builder/掘削の内部関数など）の3つだけ。ファイル内の検索は**行番号ではなく関数名で**行うこと — 行番号は常にドリフトする。

### 状態オブジェクト

- **`G`** — 永続化される進行状態: 資源（`food`、`cookie`、`eggs`、`larvae`、golden系）、アップグレードレベル（`qLv`、`nLv`、`bLv`、`sLv`、`wLv`）、役割ごとのアリ数（`worker`、`nurse`、`builder`、`soldier`、`fermenter`）、caps、リサーチ状態、major、特殊部屋の建設予約。
- **`S`** — ワールド/ランタイム状態: 生成された巣グラフ `S.full`（`nodes`、`edges`、`byNode`、入口 `eid`、女王房 `qid`）、シミュレーション中のアリ、エフェクト、敵/侵略者、季節/天候/バフ、カメラ `S.cam`、レンダー設定、ランタイム限定の生成地形/テクスチャキャッシュ（保存されない）。

### セーブ/ロード

`G.save()` は `{ g: G.toSave(), world: S.serializeWorld(), last: timestamp }` を `localStorage` に書く。キー: `SAVE_KEY = "antSimV23_0"`、`SAVE_KEY_OLD = "antSimV22_2"`、`RENDER_SETTINGS_KEY = "ant_render_settings_v1"`。ロードは修復/互換コードを通る（欠損キーの補完、廃止システムの変換、ワールド幅の現行ベースへの圧縮）。**セーブ互換性を守ること**: 保存される状態を変えるときは、旧セーブを壊すのではなくロード修復パスを拡張する。見た目だけの変更はセーブ形式に触れないこと — 過去の変更の多くが「ゲームロジック/セーブ形式は未変更」を明示的に守っている。

### ワールド: メッシュ巣

メッシュ成長巣が新規ゲームのデフォルト: `initWorld()` は `generateMeshNest({ growth:true, production:true, ... })` へ委譲する。旧ジェネレーターは `initLegacyWorld()`（dev専用）として残る。チューニング値は `MESH_GEN_DEFAULTS` に集約。`S._meshNest` フラグで共有描画コードがメッシュ専用の部屋/エッジ形状に切り替わる。経路探索（`findNodePath()` / `getPath()`）は完成済みトンネルのみを対象とした重み付き探索（ベジェ長＋混雑＋小さな揺らぎ）。成長モード（`S._meshGrowth`）では、旧 `expandMap()` の木構造成長の代わりに、建築AIが事前生成済みの未開通エッジを段階的に掘る。詳細は `HANDOFF_mesh_nest.md` を参照。

### 描画

Canvas 描画＋重いキャッシュ: 静的な土/地形レイヤーは毎フレームではなく一度だけ焼く（`buildBackgroundAssets()`、`drawBackgroundDetails()`）。プロシージャルパターン（`soilPatternCanvas`、`cavityPatternCanvas`）と `assets/textures/` の画像テクスチャを併用。アリは少数のフル シミュレーション「action」アリと軽量な「crowd」アリに分かれる（代表アクターモデル — 概要 §7–8 参照）。レンダー設定（vector/sprite/dot モード）はセーブとは別に永続化される。

### UI

右側のコントロールパネルに Ants / Rooms / Research タブとアップグレードドック。モバイル（max-width 959px）ではパネルがボトムシートになり、HUD がコンパクト化する。dev モードは URL パラメータ `?dev=1`、またはバージョンボタンの5秒長押しで有効化。メッシュ巣の実験ボタンとデバッグトグルが追加される。

## 慣習

- `.gitignore` は `.claude/`、`ant_colony_v22_*.html` バックアップ、`__tmp*.js` スクラッチファイルを除外している — インラインスクリプトの抽出物をコミットしないこと。
- dev ボタン / `window._dbg.generateMeshNest()` の手動実験は `transient` 扱いで、通常セーブを上書きしてはならない（セーブガード）。
- メッシュ生成のチューニングは、コンソールで `generateMeshNest({...userOpts})` をライブ実行して試し、良い値を `MESH_GEN_DEFAULTS` に焼く。
- `CURRENT_SYSTEM_OVERVIEW.md` §24 が既知の問題/TODO を管理している — 新しいバグだと判断する前に確認すること。
