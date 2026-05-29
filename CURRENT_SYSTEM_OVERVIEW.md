# Ant Colony V23 Current System Overview

## 2026-05-29 追記: スマホ表示

- 公開版は `index.html` をGitHub Pagesで配信する
- 680px以下では上部HUDを4列グリッドにし、下部操作パネルを省スペース化する
- スマホではバージョンタグを非表示にし、ブラウザ下部UIとの重なりを避ける
- GitHub Pages URL: `https://san-myaku.github.io/ant-clicker/`

作成日: 2026-05-23  
対象ファイル: `index.html`

この文書は、現在の単一HTML版アリコロニーゲームのコード構造と実装済みシステムを整理したものです。開発中の確認用メモとして、実装済み、削除済み、注意点を分けて記録します。

## 1. 全体構成

`index.html` は、HTML/CSS/JavaScript を1ファイルに収めた単一HTMLゲームです。GitHub Pages などの静的ホスティングでは、このファイルを入口にします。

主な構成は以下です。

- HTML: キャンバス、トップバー、右側操作パネル、モーダル、チュートリアル、ゴール表示
- CSS: ダークで重厚なUI、タブUI、Upgrade Dock、研究カード、発酵室パネル、モーダル、描画設定
- JavaScript: ゲーム状態、ワールド生成、アリAI、研究、部屋、発酵、ゴミ、侵略者、レイド、保存/読込、描画

バージョン情報:

- `SAVE_KEY = "antSimV23_0"`
- `SAVE_KEY_OLD = "antSimV22_2"`
- `VERSION_STR = "V23.0 Season & Invaders"`

公開時のセーブはブラウザごとの `localStorage` に保存されます。ローカル版とオンライン版のセーブ同期は行いません。

公開運用:

- GitHubリポジトリ: `https://github.com/san-myaku/ant-clicker`
- GitHub Pages URL: `https://san-myaku.github.io/ant-clicker/`
- 当面は「URLを知っている人だけに近い」仮公開として扱う
- GitHub Pages のURL自体は公開URLなので、アクセス制限ではない
- `robots.txt` で検索エンジンにクロールしないよう依頼する
- SNSや公開プロフィールで大きく拡散しない運用にする

旧セーブ互換は設計要件としては不要でしたが、現コードには旧キーからの読み込み補助が一部残っています。また、過去に存在した `mushroom` 部屋はロード時に `food` 部屋へ変換されます。

## 2. 主要状態オブジェクト

### `G`

`G` はゲーム進行の数値状態を持つ中心オブジェクトです。

代表的な状態:

- `food`, `cookie`
- `eggs`, `larvae`
- `qLv`, `nLv`, `bLv`, `sLv`, `wLv`
- `ants`
- `goldenCount`
- `eggToLarvaP`, `larvaToAdultP`, `layP`
- `caps`
- `unlockWasteRoom`
- `major`
- `research`
- `fermentFirstStarted`, `fermentFirstCompleted`, `fermenterFirstHired`
- `_fermentCookieMade`

現在のアリ種:

- `worker`: 働きアリ
- `nurse`: 育児アリ
- `builder`: 建築アリ
- `soldier`: 兵隊アリ
- `fermenter`: 発酵アリ

`G.tot` は全アリ数を返します。発酵アリも総人口に含まれます。

注意点:

- `fermenter` は内部個体数としては存在しますが、画面上の個別アリ描画対象には含まれていません。
- 描画対象ロールは `ANT_ROLES = ['worker','nurse','builder','soldier']` です。

### `S`

`S` はシミュレーション、ワールド、描画の状態を持つオブジェクトです。

代表的な状態:

- `t`, `time`, `timeScale`
- `full`
- `nodeVis`, `edgeFrac`
- `ants`, `effects`, `dust`, `trails`
- `enemies`, `invaders`
- `season`, `weather`
- `globalBuffs`
- `majorActives`
- `majorLuckyTargets`
- `cam`
- `surfacePts`, `surfaceDebris`
- `band`
- `restCount`, `wasteCount`, `fermentCount`
- `raidVis`

`S.full` はワールド本体です。

- `nodes`: 部屋/通路ノード
- `edges`: ノード間通路
- `byNode`: 隣接リスト
- `sy`: 地表基準Y
- `eid`: 出入口ノードID
- `qid`: 女王の間ノードID
- `w`, `h`: ワールドサイズ

## 3. 保存/読込

保存は `G.save()` から実行され、`localStorage` に保存されます。

保存される主な内容:

- `g`: `G.toSave()` の結果
- `world`: `S.serializeWorld()` の結果

`G.toSave()` は、数値資源、アリ数、研究状態、発酵フラグ、日記ログ、実績などを保存します。

`S.serializeWorld()` は、ワールドのノード/エッジ、可視状態、掘削進捗、季節/天気、各部屋の在庫や進捗を保存します。

現在保存される重要な部屋状態:

- `invEgg`
- `invFood`
- `invCookie`
- `invLarva`
- `invLarvaFood`
- `invWaste`
- `waste`
- `fermentState`
- `fermentProgress`
- `fermentInputFood`
- `blobScaleX`
- `blobScaleY`
- `floorFlat`

ロード時の補正:

- `ants` は不足キーを補完します。
- `major.workerLeaf` は削除されます。
- 旧 `mushroom` 部屋は `food` 部屋として読み込まれます。
- 旧 `mushroom` 由来の横長形状パラメータはリセットされます。

## 4. UI構成

右側の操作パネルは、主に3タブです。

- `蟻`
- `部屋`
- `研究`

### 蟻タブ

表示されるアリ行:

- 働きアリ
- 育児アリ
- 建築アリ
- 兵隊アリ
- 発酵アリ

兵隊アリは兵舎設計図と兵舎建設が必要です。  
発酵アリは研究 `ferment_worker_unlock` が必要です。

### 部屋タブ

主要UI:

- 部屋状況
- 発酵室パネル
- 発酵室建設ボタン
- ゴミ室解禁ボタン

発酵室パネルは、発酵室解放後に以下を表示します。

- 部屋数
- 稼働中ライン数
- 待機中ライン数
- 自動投入ON
- 必要食料
- 処理時間
- 発酵アリ補正
- 甘味濃縮の追加クッキー確率
- 予測クッキー生産量
- 各ラインの進捗バー

### 研究タブ

食料が `10,000` に到達すると研究機能が解放されます。  
未解放時は研究タブがロックされ、選択しようとすると蟻タブに戻されます。

研究UIは枝ごとに縦並びで表示されます。

現在の枝:

- 採集枝
- 育児枝
- 衛生枝
- 発酵枝
- 遠征枝

菌床枝は削除済みです。

## 5. Upgrade Dock

Upgrade Dock は、各アップグレードボタンを現在タブに応じて再配置します。

代表的なアップグレード:

- 女王
- 働き
- 育児
- 建築
- 兵隊
- ゴミ室
- 発酵室建設
- 黄金出現 x2
- クッキー出現 x2
- 兵隊攻撃 x2
- 深度II/III
- 兵舎設計図
- 大物運搬

`お掃除上手` は旧major導線を通常UIから外し、研究ノード `hygiene_3` に一本化しています。

注意点:

- `major_act_cookie` はJS側の管理対象に残っています。
- ただし、HTML側には `btn-major-act-cookie` などの実体が見当たりません。
- そのため、Dock上の状態表示は現在 no-op です。
- クッキーブーストのラッキー対象生成自体は `S.majorActives.cookie` によって進行します。

黄金ブーストは削除済みです。通常の黄金アリと `黄金出現 x2` は残っています。

## 6. ワールド生成と部屋

初期ワールドは `initWorld()` で生成されます。

初期状態では以下が可視です。

- 出入口
- 女王の間
- 初期シャフト
- 育児室
- 食料庫

部屋や通路は `expandMap()` と `forceExpandRoom()` によって生成されます。

生成対象の部屋タイプ:

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

菌床の `mushroom` 部屋は削除済みです。

### 地表より上の部屋生成防止

地表より上に部屋を作らないために、以下のガードがあります。

- `getUndergroundMinY(x, roomRadius)`
- `isNodeAboveGround(n)`
- `isDigTargetAboveGround(digT)`

これらは、隠しノード掘削、強制部屋生成、通路分割などの複数箇所で使われています。

## 7. アリAI

メイン更新は `update(dt)` です。  
アリの行動更新は `updateAnts(dt)` です。

### 働きアリ

主な行動:

- 地表採集
- 食料/クッキー持ち帰り
- 休憩
- 部屋内徘徊

現在、働きアリの新規ゴミ清掃割当は外されています。

働きアリ強化:

- 内部値は `wLv` のまま `0` から開始
- UIでは `Lv.0` とは表示せず、未購入状態を `未強化` と表示
- 強化後は `強化1/20` のように表示
- 効果は食料収集倍率とクッキー入手倍率
- 初回強化 `未強化 -> 強化1/20` のコストは食料 `50`
- 2回目以降は `floor(100 * 1.35^現在強化値)` を使う

育児アリLv:

- 内部値は `nLv`
- 最大Lvは `20`
- コストは `floor(300 * 1.33^現在Lv)`
- `getNurseHatchMul(nLv)` が卵→幼虫と幼虫→成虫の両方に同倍率で乗る
- 育児アリ人数は卵→幼虫に `1 + 育児アリ数 * 0.5`、幼虫→成虫に半分の `1 + 育児アリ数 * 0.25` で乗る
- Lv2以上で女王の自動産卵に `+10%`

### 育児アリ

主な行動:

- 女王室の卵を卵室へ運ぶ
- 卵室に発生した幼虫を幼虫室へ移す
- 幼虫へ給餌する
- 幼虫室のゴミを掃除する

現在のゴミ掃除方針:

- ゴミ部屋なしでも掃除する
- ゴミ部屋なしの場合、入口へ運んで廃棄する
- ゴミ部屋ありの場合、最寄りのゴミ部屋へ運ぶ
- ゴミ部屋への運搬は搬送量が `+1`
- 通常清掃は最低給餌枠より後
- ゴミが危険域なら給餌前に割り込む

### 建築アリ

主な行動:

- 掘削ターゲットを選ぶ
- 掘削地点へ移動
- 土を掘る
- 土を入口へ運ぶ
- 掘削進捗 `edgeFrac` を進める

部屋生成は建築レベルや各施設の解放状態に依存します。

### 兵隊アリ

主な行動:

- レイド時に入口防衛へ向かう
- 通常時は兵舎へ戻る/警備する
- レイド結果計算に戦闘力として参加する

### 発酵アリ

発酵室専任の補助役です。

効果:

- 1匹ごとに発酵速度 `+8%`
- 最大 `+40%`
- 実装式は `getFermenterBonusRate()`

描画上の個別アリとしては出現しません。

## 8. 卵、幼虫、成虫化

成長の主な定数:

- `EGG_TO_LARVA_SEC`
- `LARVA_TO_ADULT_SEC`
- `LARVA_FOOD_NEED`
- `LARVA_FOOD_DELIVER`
- `LARVA_FOOD_BASE`
- `WASTE_RATE_PER_LARVA`
- `WASTE_FULL_PER_LARVA`
- `WASTE_SLOW_MAX`

育児室は、複数ある場合に卵室/幼虫室へ分担されます。

関連ヘルパー:

- `getNurseryIds()`
- `getEggNurseryIds()`
- `getLarvaNurseryIds()`
- `getLarvaGrowthRoomIds()`

`getLarvaGrowthRoomIds()` は、幼虫室に幼虫がいない場合に全育児室へフォールバックし、幼虫が成虫化しなくなる詰まりを避けます。

幼虫→成虫バー付近には、成長要因として給餌加速、ゴミ、収容上限を表示します。  
給餌は成長停止条件ではなく、幼虫の成長速度を上げる加速要素です。ゴミと収容上限は阻害要因として扱います。

給餌:

- 総アリ数 `6` 以上
- 育児アリが `1` 匹以上
- 幼虫がいて、食料庫があり、給餌不足の幼虫室がある

上記を満たす場合、危険ゴミ清掃を除き、最低 `1` 匹の育児アリを給餌へ優先的に回します。

## 9. ゴミシステム

幼虫がいる部屋には、時間経過で `invWaste` が溜まります。  
ゴミが多いほど幼虫から成虫への速度が遅くなります。

ゴミ発生:

- `WASTE_RATE_PER_LARVA`
- `getWasteGenerationMul()`

ゴミによる遅延:

- `WASTE_FULL_PER_LARVA`
- `WASTE_SLOW_MAX`

清掃関連:

- `getWasteCleanerJobFraction()`
- `getWastePickThreshold()`
- `getWasteUrgentThreshold()`
- `getWasteHaulPerTrip()`
- `getWasteHaulAmount()`
- `getWasteDropDestinationId()`
- `getWasteHaulAmountForDestination()`
- `tryStartWasteCleanup()`

清掃ライン:

- 通常清掃はゴミ `1` 以上で対象
- 給餌より優先する危険清掃は通常 `3` 以上
- `hygiene_3` 後は危険清掃ラインが `2` に下がり、清掃担当割合と運搬量も増える
- 危険清掃は卵/給餌より先、通常清掃は最低給餌枠の後、通常給餌の前に割り込む

現在の設計では、ゴミ部屋は「清掃解禁施設」ではなく「中盤以降の大幅効率アップ施設」です。

ゴミ部屋なし:

- 育児アリが入口へ運ぶ
- ゴミは入口で廃棄される
- 搬送距離が長くなりやすい

ゴミ部屋あり:

- 最寄りゴミ部屋へ運ぶ
- 搬送量が増える
- 巣が広がるほど強い

## 10. 研究システム

研究は `G.research` に保存されます。

構造:

```js
research: {
  unlocked: false,
  unlockedBranches: {
    gather: true,
    brood: true,
    hygiene: true,
    ferment: true,
    expedition: false
  },
  unlockedNodes: {}
}
```

研究解放条件:

- 食料 `10,000`

現在の研究ノード:

採集枝:

- `gather_1`: 採集効率I
- `gather_2`: 採集効率II

育児枝:

- `brood_1`: 育児効率I
- `brood_2`: 幼虫給餌改善

衛生枝:

- `hygiene_1`: 衛生基礎
- `hygiene_2`: 清掃効率I
- `hygiene_3`: お掃除上手

発酵枝:

- `ferment_unlock`: 発酵室解放
- `ferment_1`: 発酵短縮I
- `ferment_2`: 甘味濃縮
- `ferment_3`: 原料節約
- `ferment_worker_unlock`: 発酵アリ解放

遠征枝:

- 枝はありますが、ノードは未実装です。

削除済み:

- 菌床枝
- 菌床ノード
- 菌床部屋
- 葉っぱ資源
- 採葉上手

## 11. 発酵室

発酵室は研究 `ferment_unlock` で建設可能になります。

建設:

- コスト: 食料 `2000`
- 上限: `2`
- `forceExpandRoom('ferment')` で部屋生成

基本レシピ:

- 食料 `100`
- `45` 秒
- クッキー `1`

研究効果:

- `ferment_1`: 発酵時間 `45秒 -> 38秒`
- `ferment_2`: 完了時 `10%` でクッキー `+1`
- `ferment_3`: 必要食料 `100 -> 90`

発酵室ノードの状態:

- `fermentState`
- `fermentProgress`
- `fermentInputFood`

処理:

- `updateFermentRooms(dt)` で更新
- idle かつ食料が足りると自動開始
- 開始時に食料消費
- 完了時にクッキー加算
- 完了後、材料があれば次サイクル自動開始

発酵アリ補正:

- `getFermenterBonusRate()`
- `speedMul = 1 + fermenterBonus`
- 進捗は `dt * speedMul`

表示:

- 発酵室UIの残り時間表示は、発酵アリ補正込みの実時間として `(recipe.timeSec - fermentProgress) / speedMul` で計算されています。

## 12. 発酵アリ

解放研究:

- `ferment_worker_unlock`

条件:

- `ferment_2` 研究済み
- 巣内に出現済みの発酵室が `2` 室以上
- コスト: クッキー `20` + 食料 `3000`

雇用:

- 内部キー: `fermenter`
- 初期コスト: 食料 `800`
- 他アリと同じく雇用ごとに指数増加
- 働きアリを1匹消費して変換

効果:

- 1匹あたり発酵速度 `+8%`
- 最大 `+40%`

保存:

- `G.ants.fermenter`
- `G.fermenterFirstHired`
- 研究ノード解放状態

## 13. 季節、天気、バフ

季節と天気は食料生産や描画に影響します。

主な状態:

- `S.season`
- `S.weather`

天気の変更:

- `S.weather.changeTimer` がゲーム内時間で減少する
- `0` 以下になったときだけ天気を再抽選する
- `nextChangeAt` は表示/旧セーブ互換用に残す
- 24時跨ぎ後に `S.time >= nextChangeAt` が毎フレーム成立して天気が連続抽選される問題を避けるため、判定本体は残り時間方式にしている

黄金アリ誕生時のバフ:

- `S.globalBuffs.activeId`
- `G.goldenCount`

通常の黄金アリ、黄金誕生演出、`黄金出現 x2` は残っています。

削除済み:

- 黄金ブースト
- `MAJOR_ACT_GOLDEN_*`
- `major_act_golden`
- 黄金ブースト中の黄金出現率 `x10`
- 黄金ブースト中のタップ報酬

## 14. クッキーとクッキー室

クッキーは主に以下で得られます。

- 働きアリの地表採集による低確率入手
- 黄金アリ
- 発酵室
- クッキー室による補助

クッキー室:

- 建築Lv条件で解放
- クッキー収集倍率に影響
- クッキー納品時のボーナスを持つ

関連:

- `getWorkerCookieChance()`
- `S.cookieRoomMul`
- `getCookieRoomStoredCount()`

## 15. 侵略者とレイド

地下侵略者:

- `S.invaders`
- `spawnInvader()`
- `updateInvaders()`

出現対象:

- 食料庫
- 育児室

レイド:

- 兵隊アリがいる場合に発生
- カウントダウン、攻撃、結果表示のフェーズを持つ
- `S.raidVis` でUI状態を管理
- `resolveRaid()` で結果処理

今回の研究/発酵/ゴミ掃除変更では、レイド周りは基本的に触っていません。

## 16. 目標ツリー

`COLONY_GOALS` で目標が定義されています。

現在含まれる主な目標:

- 個体数10/50/100/500/1000/5000/10000
- 育児アリ雇用
- 建築アリ雇用
- 初クッキー
- 研究機能解放
- 発酵室解放
- 発酵室1室建設
- 初めて発酵でクッキー作成
- 発酵アリ解放
- 兵舎設計図
- 兵舎初建設
- 兵隊アリ雇用
- レイド勝利
- 深度II/III
- クッキー室初建設

削除済み:

- 菌床初収穫

## 17. チュートリアル、日記、通知

チュートリアル:

- `TUTORIAL_STEPS`
- `TUT`

女王の日記:

- `DIARY_ENTRIES`
- `G.queenLog`
- `addQueenWhisper()`

通知:

- `toast(msg, warnOrOptions=false)`
- `fx()`
- `spawnFloatPlus()`

トースト通知:

- 画面上部中央の `#toast-area` に最大4件まで表示
- 既定は `info`、警告は既存互換の `toast(msg, true)` で `warn`
- `toast(msg, { type: 'success' })` / `toast(msg, { type: 'info' })` / `toast(msg, { type: 'warn' })` も利用可能
- 表示時間は `TOAST.durationMs`、同時表示数は `TOAST.maxVisible`
- `warn` は `role="alert"`、通常通知は `role="status"` として読み上げ優先度を分離
- `#toast-area` が見つからない場合は `console.log('[toast]', msg)` にフォールバック

主要イベント通知:

- 研究解放
- 発酵室解放
- 初回発酵開始
- 初回発酵完了
- 発酵アリ解放
- 発酵アリ初雇用
- ゴミ警告
- レイド関連
- 黄金アリ誕生

## 18. 描画

描画は `<canvas id="c">` に対して行われます。

描画対象:

- 地表
- 地下土壌
- 部屋
- 通路
- アリ
- 幼虫/卵/ゴミ/クッキー/発酵室
- 天気/季節効果
- レイド敵
- 地下侵略者
- エフェクト

描画設定:

- `DEFAULT_RENDER_SETTINGS`
- `S.renderSettings`
- 描画設定モーダル

LOD:

- アリ数やズームに応じて描画モードを切り替えます。
- `getVisualAntTargets()` で描画数を制限します。

## 19. デバッグ機能

開発者/デバッグ用の仕組みがあります。

- エラー表示
- デバッグオーバーレイ
- パフォーマンス表示
- ゲーム状態表示
- ノード経路デバッグ

主な関数:

- `buildGameDebugText()`
- `buildPerfDebugText()`
- `updateDebugOverlay()`
- `toggleDebugOverlay()`

## 20. 現在の削除済み/延期システム

### 菌床

現在は削除済みです。

削除済み内容:

- 菌床プレビュー
- 菌床枝
- 菌床部屋
- キノコ栽培ロジック
- 葉っぱ資源
- 採葉上手
- 菌床目標
- 菌床描画
- 菌床による食料倍率

残っている `mushroom` 参照は、過去セーブを `food` 部屋へ変換するためのガードです。

### 黄金ブースト

現在は削除済みです。

残っている黄金関連:

- 通常の黄金アリ
- 黄金アリ誕生演出
- `黄金出現 x2`

削除済み内容:

- `MAJOR_ACT_GOLDEN_*`
- `major_act_golden`
- 黄金ブーストUI
- 黄金ブースト抽選
- 黄金ブースト発動
- 黄金ブースト中のタップ追加報酬
- 黄金ブースト中の黄金出現率 `x10`

## 21. 現在の注意点/TODO

### クッキーブーストUI

クッキーブーストのJS状態は残っていますが、DockボタンのHTML実体が見当たりません。  
機能として残すならUIを復元するか、不要ならJS側も削除すると整理されます。

### ゴミ清掃のバランス

育児アリが清掃も担当するようになったため、以下は実機で要確認です。

- 育児アリが少ない時に給餌が止まりすぎないか
- ゴミ危険域で清掃が十分に間に合うか
- ゴミ部屋が強すぎる/弱すぎるか
- 入口搬出の距離負荷が狙い通り効くか

### 発酵アリは視覚化されない

発酵アリは人口と効果には反映されますが、キャンバス上の個体としては描画されません。  
これは現在の実装上の選択です。見た目にも出したい場合は `ANT_ROLES` と行動AIに追加が必要です。

## 22. 次に触るなら

優先度順の候補:

1. クッキーブーストを残すか削除するか決める
2. ゴミ掃除の実機バランス確認
3. 発酵アリの見た目を追加するか判断
4. 遠征枝のMVP設計
5. 菌床を再導入する場合は研究ツリーが整ってから独立ブランチとして実装
