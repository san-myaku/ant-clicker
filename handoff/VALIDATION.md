# クラウド引き継ぎ候補の確認

2026-10-26。手元の作業フォルダから選んだコード/生成基盤/合成保存/資料を分離した候補で実施。Linux実機での動作確認ではない。

- npmの固定版Playwright 1.62.1を通常のpackage.json/package-lock.jsonからインストール。検証スクリプトはCHROME_PATH/PLAYWRIGHT_MODULEまたはnpmパッケージを明示的に使い、個人PCの絶対パスを持たない。
- 再生成後も最新の公開5ファイルは現在のゲームとSHA256一致。ルートindex.htmlも元の公開本編のまま。
- `npm run test:smoke`: 実際の30ゲーム秒の初仕事/搬出、台帳、全保存復元、固定停止保存の復元、一時HTTPサーバーの新旧ページ/非公開パス404を確認。
- `verify-browser.cjs`（LIVING_GROWN=world-900.json）: PC1440/393/320幅、実在庫を使う研究/役割/速度、保存/復旧/不正入力/容量不足/旧キー保護、実アニメーションを確認。
- `verify-touch.cjs`: 393/320幅のCDP実タッチで連打/選択/ダブルタップ抑止/巣だけのピンチ/ドラッグ/スクロール/入力を確認。Safari用イベントは合成確認で、実機iPhoneの証拠ではない。
- `verify-previous.cjs`: 同梱した合成の旧統合版保存で600匹/5957粒、同じ地形/仕事/荷物を復元。新版キーの保護を確認。
- Windowsの個人プロファイル/プライベートTailnetホスト/添付パス/典型的な認証キーの文字列チェックで対象なし。Vault全体/個人ノート/全画像アーカイブ/ローカル記録スクリプトは同梱しない。

Node.js 20以降。まずREADMEとHANDOFF_CLAUDE.mdを読み、クラウド上でも生成とsmokeを実行する。ブラウザ検証は `npm ci` と `npx playwright install chromium` で用意する。自然育成保存を使う研究確認はLinuxなら `LIVING_GROWN=world-900.json npm run test:browser`。

既存の55ゲーム内分の通し育成結果はゲームコードのhashが同じ過去の証拠として保持。今回その全時間を再実行したものではない。main/Pagesの公開切替、既存の古い2ブランチとのマージは行わない。
