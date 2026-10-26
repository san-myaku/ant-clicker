# Codexへの引き継ぎ

2026-10-26、ブランチ `claude/confident-dirac-5va5rr`、この文書を足したコミット時点。Claudeクラウドでの作業をここで区切る。main/Pagesへのマージ・PRはしていない。

## 読む順序

1. AGENTS.md（共通ルール。必ず守る）。
2. この文書。
3. handoff/PROJECT_CONTEXT.md（採用された方向、戻してはいけない失敗1〜20）。
4. CURRENT_SYSTEM_OVERVIEW.md の「2026-10-26 クラウドでの継続（living-clicker）」節（現在の仕組みの要約）。
5. DEVELOPMENT_LOG.md の 2026-10-26 の各節（なぜそうしたか）。
6. prototypes/living-clicker/qa/VERIFICATION.md の先頭（最新の検証と訂正）。
7. 必要に応じて prototypes/living-clicker/README.md / DESIGN.md、handoff/PROJECT_LOG.md。

## ユーザーと決定事項

- 応答・記録は日本語。ユーザーは結果を短く知りたい。数値は実測だけを書く。
- 開発中は保存の互換を考えない（以前の保存の変換層は作らない。読込時の検証は残す）。
- 襲撃: 守り手は見張り役から、敵は隣の巣のアリ（捕食者は後）、失うものは卵・幼虫と餌、操作は割り振り＋警報タップ。
- 石: 案2（運べる小石）を採用。案3（平たい石の下の巣）・案4（収穫アリのように小石を集める）は未着手。
- 人口の目標は1000匹規模（1万匹の目標を下げた決定はない）。5000匹は今のマップ（96×90）では体が入らない。

## 現在のゲーム（prototypes/living-clicker/）

女王室から実採集→運搬→給餌→同じ卵の成長/羽化→増員→需要に応じた掘削/地表への搬出。そのうえにクラウドで以下を足した（詳細は OVERVIEW）。

- 研究: 元の61件を一覧に。接続は33件（衛生5、発酵4、防衛8を含む）。残り28件は未接続。
- 衛生: 実物のゴミ、ゴミ室、病気。発酵: 発酵室で餌→甘い粒→女王室でクッキー。
- 襲撃 段階1/2: 偵察→襲撃隊、見張り役、組み合い、持ち去り、倒した敵は餌に。警報タップで近くの働きアリを呼ぶ。防衛研究8件。
- 住む場所: 重なった働き手が6匹以上で居室（広さ36）を浅い層から掘り、層が埋まると深い層へ。
- 小石: 土の約1.5%（深い層2.5%）。1個ずつ0.7倍の速さで運び、土山に溜まる。
- 渋滞: 同じ流れの前後は平均の向きで判断し横並びは番号の小さい方が先、相互の譲りは荷/仕事を持つ方が先、正面の行き違いは下位が計画経路で開けた床へ譲る。
- 人口上限: 64、研究「女王の包容力」で128。

## 編集と生成

- 編集元: `game.js`、`index.html`、`build.cjs`、`build-view.cjs`、`view-research.js`、`queen-art.js`。
- `core.js` / `lifecycle.js` / `view.js` は生成物で直接編集しない。`npm run build` で生成（比較版 `prototypes/colony-game/` の core.js / game.js / view.js が元になる）。
- `build.cjs` の `replace(from,to,label)` は元の文字列がちょうど1回現れないと失敗する。新しい差し替えは `fs.writeFileSync(path.join(root,'core.js'),source);`（lifecycle も同様）の直前に足す。先の差し替えの結果を対象にしてよい。

## 検証

~~~sh
npm run build
node prototypes/living-clicker/verify-all.cjs                    # 検証14本を並列（約5分、4コア）
node prototypes/living-clicker/verify-all.cjs --browser          # smoke/touch/browser も
node prototypes/living-clicker/verify-all.cjs --browser --chain  # 通し確認も（約12分）
node prototypes/living-clicker/verify-all.cjs raid housing       # 名前で選ぶ
~~~

- 通し確認（`--chain`）: 一時コピー（/tmp/living-chain-*）で verify-world → verify-depth → verify-scale。新規地形→第2層→深い2室→128匹。結果はそのコピーに残る。
- `qa/*.json` の保存（world-900、before-depth、world-final など）は他の検証の入力。通し確認の保存で置き換えたら、他の検証を必ず再実行する（世界が変わると検証の前提が崩れることがある。今回も居室/掃除の前提が2件崩れた）。
- 結果はソースのhashと対応させて qa/VERIFICATION.md に書く。実行が終わる前に結果を書かない（前回これで「128匹で合格」と誤記し、実際は117匹で止まっていた）。
- ブラウザ検証は Playwright と Chromium が必要（`npm ci` と `npx playwright install chromium`、または CHROME_PATH / PLAYWRIGHT_MODULE）。実機iPhone Safariの確認ではない。
- 検証プロセスを止める時は `pkill -f` を使わずPIDで止める（パターンが自分のシェルにも当たる）。

最新の結果（最終ソース 63179c0）: 検証17本と通し確認が全合格。通し確認は第2層2096秒、深い2室3754秒、128匹6754秒。qa の入力保存は一つ前（579da37）の通し確認のもの。

## 次の作業（優先順）

1. **1000匹へ**（ユーザーに次の本線として伝えた）。測定は handoff/PROJECT_LOG.md の「1000体、5000体」の記録。128匹で1コマ約1.7ms。注入した計測では1024匹8.2ms・2048匹15.3ms（仕事探しの改善後）。上限だけ外した自然育成は約25匹/1000秒で、女王の産卵が律速。
   - 渋滞判定（`move` の追従/譲り）は全員を毎回調べている。近くの個体だけを格子で引く。
   - 経路の使い回し（シティーズ：スカイラインのように部屋と通路の網で一度計算した経路を保持し、通路が変わった時だけ作り直す）。
   - 保存形式と番号: アリ番号は1〜128（`freeAntId` で再利用、保存検査は128まで）、運び手は1バイト、襲撃隊は200〜249番で200匹を超えると衝突、部屋は254まで。上限研究（128の先）と一緒に広げる。
   - 産卵速度・部屋の容量・居室の数を、人口に見合うように設計する。
2. 読み込み時の1〜2秒の引っかかり。
3. 襲撃 段階3（大きな兵隊、捕食者）。
4. 石の案3/4。
5. 残り28件の研究、後半/放置/旧本編からの正式移行/実機/公開（RELEASE_ROADMAP.md、RELEASE_ISSUE_COVERAGE.md）。

## 記録

意味のある変更では CURRENT_SYSTEM_OVERVIEW.md と DEVELOPMENT_LOG.md を同じ作業で更新し、決定/失敗/検証/次工程を handoff/PROJECT_LOG.md に追記する。ObsidianのVaultへは未同期（自動で同期済みとみなさない）。
