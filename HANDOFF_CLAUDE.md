# Claudeクラウドへの引き継ぎ

2026-10-26。手元PCの未コミット実装は新しいcloneへ届かないため、現在のゲーム/生成基盤/必要fixture/資料を選んだ引き継ぎスナップショット。古い公開設定/PWAの2ブランチを現在の統合版とはみなさない。

## 読む順序

1. AGENTS.md。
2. handoff/PROJECT_CONTEXT.md（採用された方向、仕様、失敗、既知の限界）。
3. prototypes/living-clicker/README.md と DESIGN.md、CURRENT_SYSTEM_OVERVIEW.md の現行部分。
4. RELEASE_ROADMAP.md / RELEASE_ISSUE_COVERAGE.md。

ローカルのObsidianとWindowsパスはこの環境にはない。必要な知識は上のリポジトリ内に同梱した。以後の記録は handoff/PROJECT_LOG.md に追記する。

## 起動と検証

~~~sh
npm run build
npm run test:smoke
npm start
~~~

開くのは http://127.0.0.1:5189/clicker/ 。サーバーは prototypes/living-nest/server.cjs で、比較用の /、/play/、/clicker-previous/ も保持。ブラウザと保存はoriginごとに別で、ユーザーPCの進行はソース移送に含まれない。

ブラウザ試験は npm ci と npx playwright install chromium の後、npm run test:touch / npm run test:browser。既存の検証ライブラリ/ブラウザを使う場合はPLAYWRIGHT_MODULE/CHROME_PATHを指定する。ハードコードされたWindowsパスは使わない。

## 編集先と次の区切り

編集元は living-clicker/game.js、index.html、build.cjs、build-view.cjs、view-research.js、queen-art.js。core.js/lifecycle.js/view.jsは生成物。生成には比較版 colony-game/core.js / game.js / view.js が必要。

まず起動して現在の体験と保存を確認し、人口/在庫/仕事/交通が増えたときの測定へ進む。64/研究後128は途中の上限で、1万匹の目標を下げた決定ではない。残る研究/部屋用途/経済を段階的に結び、後半/放置/移行/実機/公開を完成させる。最新の指示を優先する。

長時間モデルを再確認する時は verify-world.cjs → verify-depth.cjs の順。6つの停止回帰と verify-touch.cjs/verify-queen.cjs もある。QAの入力保存を正常な別保存へ差し替えない。結果はソースhashに対応させ、既存結果を新ソースの完走とみなさない。

PCのサービス/プライベートURL/Obsidian本文/全画像アーカイブは送っていない。公開版の自動切替やmainへのマージも行わない。
