# 256匹の実育成と全体検証

全24本合格（verification.json、full-run.txt）。別実行の自然256匹も同一ソース/入力hashへ対応させた。新規→128匹と128→256匹はnatural-chain-link.jsonの同じ保存で接続する。

- browser-256-results.json: 256匹の通常保存/リセット/復旧/再読込と実行。旧キー併存のケースは検査用load直後の未保存状態であり、この段階では退避が収まる。
- persisted-capacity-results.json: 全体検証後、同じアプリソースで追加実行。実UIで256匹を永続化した後のリセットを検証。新規プロフィールは退避/復旧に成功。大きな旧キーも残る時は容量不足でリセットを拒否し現在/旧データを保持、実際の書き出しファイルも復元/照合に成功。スクリプトはqa/check-persisted-capacity.cjsで、同結果内に独立したソースhashを保持する。全24本には重複計上しない。
- visual-check.json: 320/393幅の研究と393/1440幅の実256匹画面を目視した記録。

証拠ファイルのhashはevidence-manifest.json。アプリ/入力はverification.jsonと追加結果のhashで照合する。実機Safari/実効10倍/512/1000匹の完了証拠ではない。次は保存容量の改善後に512匹へ進む。
