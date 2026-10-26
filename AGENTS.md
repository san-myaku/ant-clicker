# ありクリッカー — 共通作業ルール

- 応答・記録は日本語。まず HANDOFF_CODEX.md（最新の引き継ぎ）と handoff/PROJECT_CONTEXT.md を読む。
- 最新は prototypes/living-clicker/。ルート index.html は旧公開本編であり、今回の移行で書き換えない。
- プロジェクト知識のローカル正本はObsidian Vault。クラウドにはそのWindowsパスが存在しないため、必要な事実・決定・失敗を handoff/PROJECT_CONTEXT.md に移した。存在しないローカルパスを探し続けない。追加の決定/失敗/検証/次工程は handoff/PROJECT_LOG.md に追記し、ローカルへ戻す際にVaultへ同期する。同期済みと推測しない。
- ユーザーの指示を優先。既存の作業を保護し、編集前に git status/diff を確認する。
- 意味のある変更では CURRENT_SYSTEM_OVERVIEW.md と DEVELOPMENT_LOG.md を同じセッションで更新する。
- 不要な補助見出し/説明を足さず、配置・余白・文字の強弱で役割を示す。利用者向け画面/設定/ツールチップ/通知に内部実装の説明を持ち込まない。必要な制約/警告は利用者の言葉で短く残す。
- 試作の良さは実物の採集/給餌/羽化/必要に応じた掘削と本人の運搬。完成形マスク/数値だけの増加/飾りの群れに戻さない。
- 根本原因を調べる。停止を隠すための瞬間移動/土の自動削除/無条件の待機解除を加えない。
- build.cjs/build-view.cjs の編集元から生成する。core.js/lifecycle.js/view.js を直接修正しない。
- 保存はoriginごと。別版の保存を無断変換/上書きせず、読込は検証してから採用する。試作互換を維持するためだけの層を追加しない。
- UI/入力/実行時を変えた時はHeadless Chrome/CDPを優先。実機iPhone Safariを確認したことにしない。ソース/入力hashと検証結果を対応させる。
- 公開サーバーは既存のファイル許可リストを維持し、QA/生成器/保存fixtureを配信しない。main/Pagesの更新は引き継ぎブランチの作業とは別。
