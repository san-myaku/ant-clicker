この途中記録は履歴。全35本の再検証後の最終結果はRENDER_CACHE_20261028.mdとHANDOFF_CODEX追補12を参照。

# 描画軽量化の途中記録 — 未採用

2026-10-28。地形/照明/床の差分描画と部屋セル共有の候補を隔離コピーで作成。42ケースの画素/光/画面/全保存一致、8保存の全保存一致、512匹2入力の固定モデル+描画で19.48%/57.08%減を確認済み。ただし全体の初回はbrowser256が6秒/1ゲーム秒超の条件で不合格、browser512中にセッションを失い終了記録も無いため未完。単独再診断では旧版が約6.2秒で15ゲーム秒/候補30秒、両方合格し初回は再現しなかった。原因未確定で環境原因と断定しない。条件を緩めず、失敗時の数値ログだけを補って別コピーで全35本を再実行中。本体は05fb0e2のまま。最終採用/全体合格/公開/追加pushは未実施。詳細handoff/IN_PROGRESS_RENDER_20261028.md。

## 再開位置

- 実行器: audit/render-cache-20261028/full-check.cjs
- 現在の別コピー: C:\Users\yuhim\.codex\worktrees\ant-1000-handoff\ありクリッカー\audit\render-cache-20261028\full-repo-r3
- 開始時の117ソース/32入力: qa/render-cache-20261028/execution-start.json（これは開始記録で、合格結果ではない）
- 初回UI手順の失敗: qa/render-cache-20261028/r1-ui-failed/
- 初回全体の不合格/中断: qa/render-cache-20261028/r2-full-interrupted/
- 旧版/候補の単独診断: qa/render-cache-20261028/diagnosis-256/
- 再試行のブラウザ検証は元と同じ6秒/1秒超。256匹のassertに不合格時のbefore/after/errorsを表示するメッセージだけを追加。
- 終了したfull-verification.jsonを確認し、全35本が合格した時だけadopt.cjsを実行する。終了記録がない/不合格なら採用しない。
- native描画検証の出力フォルダはqa/render-pixels/README.mdを追跡して新規cloneでも存在させる。
- 採用後にframe.cjsで1xの画面観測、preview.cjsで公開5ファイル/非公開404、record.pyとseal.pyで結果を記録する。record.py/record-vault.pyは未実行の完成後用スクリプトであり、存在を完了の証拠にしない。

## 完了済み測定のソース

{
  "fixedBaseline": {
    "index.html": "1a377628c194d695ae92af706daf539686b262f3e0183633f225241b96181d46",
    "core.js": "c444427f4493d71fbff56f4f523a6720a3bea81cae4ffacb3ef0df608380f3ab",
    "lifecycle.js": "cea8f5aedd40dab851dd387e0802308d625c4a3452c1503f31361ad84764d8a0",
    "game.js": "a38fabdaf9c8b49fdef59094a03037c70c49b805a6053dd3f211d7b66174cd16",
    "view.js": "4bb44a8cf17b7af1a6ab6b2c09e18a56433e2b006a062b7a3a99eb9ec896fb8e"
  },
  "fixedCandidate": {
    "index.html": "1a377628c194d695ae92af706daf539686b262f3e0183633f225241b96181d46",
    "core.js": "081d5909faa962192b229942a87771665c60656d4f856133b775e72b36477f27",
    "lifecycle.js": "cea8f5aedd40dab851dd387e0802308d625c4a3452c1503f31361ad84764d8a0",
    "game.js": "a38fabdaf9c8b49fdef59094a03037c70c49b805a6053dd3f211d7b66174cd16",
    "view.js": "627297bb0907e010b23b9c6c2ebeb78e55c2cf07198cfd4f7197a059b43c29cf"
  },
  "modelBaseline": {
    "core.js": "c444427f4493d71fbff56f4f523a6720a3bea81cae4ffacb3ef0df608380f3ab",
    "lifecycle.js": "cea8f5aedd40dab851dd387e0802308d625c4a3452c1503f31361ad84764d8a0",
    "game.js": "a38fabdaf9c8b49fdef59094a03037c70c49b805a6053dd3f211d7b66174cd16",
    "build.cjs": "3dafbba8611498f2071616d0b72fc7217b0e6ef8cda846045c3691646e3583f2"
  },
  "modelCandidate": {
    "core.js": "081d5909faa962192b229942a87771665c60656d4f856133b775e72b36477f27",
    "lifecycle.js": "cea8f5aedd40dab851dd387e0802308d625c4a3452c1503f31361ad84764d8a0",
    "game.js": "a38fabdaf9c8b49fdef59094a03037c70c49b805a6053dd3f211d7b66174cd16",
    "build.cjs": "5f8b9ed490d78441a63dd40562f62988f0d85e9329605e7fba80445d99246a79"
  }
}
