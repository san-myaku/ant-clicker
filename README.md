# ありクリッカー — 生きた巣の統合確認版

最新の開発対象は prototypes/living-clicker/。元の公開版 index.html と比較版を保持している。最初に [引き継ぎ](HANDOFF_CLAUDE.md) と [作業ルール](AGENTS.md) を読む。

Node.js 20以降。ゲームと生成器はNode標準機能だけで動く。

~~~sh
npm run build
npm run test:smoke
npm start
~~~

最新の画面: http://127.0.0.1:5189/clicker/ 。ルートの / は観察比較版。

ブラウザ検証が必要なら npm ci、npx playwright install chromium の後に npm run test:touch。既存Chromeを使う場合はCHROME_PATH、別のPlaywright環境を使う場合はPLAYWRIGHT_MODULEを明示する。OS上の不足依存はエラー内容を確認して準備する。
