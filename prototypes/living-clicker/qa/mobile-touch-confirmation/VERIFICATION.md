# 現行統合版のダブルタップ抑止を再確認

2026-10-24。ユーザーの「ちゃんとダブルタップで拡大しないようにしてる？」への現行実装の点検。ゲームHTML/JS、保存、挙動は今回変更していない。

- HTMLのviewport、html/bodyのtouch-action:pan-y、操作部のmanipulation、Canvasのnone、文字選択抑止、Safari向けgesturestart/gesturechangeの取消、非入力のdblclick取消が存在する。
- `verify-touch.cjs` / `touch-results.json`。Chrome headlessの393/320px・CDPのネイティブタッチで、25ms押下/70ms待機の4連打が全て配分へ反映。ページ倍率1、長押し選択なし。
- 研究の説明と巣でも短い間隔で2タップしページ倍率1を確認。巣のカメラ倍率もダブルタップでは変わらない。
- 巣は2指ピンチでカメラだけ拡大し、1指ドラッグで移動できる。通常ページの縦スワイプはスクロールする。ページ外のピンチでページ倍率は1のまま。
- 保存の種を入力可能、文字選択はtext、入力文字16px、速度10倍を選択可能。横はみ出し/実行時例外なし。
- Safari用のgesture取消と、入力欄のdblclickを取り消さない例外は合成イベントで確認。これは実機iPhone/Safariでのネイティブ拡大を検証した証拠ではない。
- `delivery-results.json`。PCとTailnetの実際の `/clicker/` と `view.js` がローカルと一致。女王描画後の現行ソースを確認した。

最初のピンチ検査は旧 `/play/` の初期倍率を前提とし、現行版は開始時から近いため上限4.5へ達して拡大比率の期待を満たさなかった。現行コードの倍率制限を確認し、実UIで2段縮小してからピンチする開始条件へ修正。ゲームの倍率や抑止は変更していない。初回結果は `initial-pinch-check-failed.json` へ保持した。

結果・ソースhashは `touch-results.json`、画面は `touch-393/320.png` と `settings-393/320.png`。実機iPhoneは未確認。
