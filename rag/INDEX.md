# RAG Index

| Topic | Status | Location | Notes |
| --- | --- | --- | --- |
| AI監査・多エージェントレビュー | raw | rag/ai-audit/raw/refute-or-promote.md | arXiv 2604.19049 "Refute-or-Promote"（2026-04）。PDF→markitdown（2026-07-11 取得・105KB）。一次ソース・確度高。#37 の裏取りに使用（80体OpenSSL幻覚事例の出典） |
| Forem API・dev.to転載回復 | compiled | rag/forem-api-crosspost-recovery.md | Forem公式API v1（2026-07-17取得）。canonical_url、認証記事一覧、idempotency key不在を確認。確度高。 |
| GoatCounter privacy | raw | rag/raw/goatcounter-privacy-2026-07-30.md | GoatCounter公式Privacy（2026-07-30取得）。集計項目、最大8時間のIP・User-Agent memory処理、Cookieなしを確認。確度高。 |
| Google Fonts privacy | raw | rag/raw/google-fonts-privacy-2026-07-30.md | Google Fonts公式FAQ（2026-07-30取得）。JS描画のためbrowser renderで取得。request情報とCookieなしを確認。確度高。 |
| ブログ解析・font配信とPrivacy | compiled | rag/blog-analytics-privacy-boundary-2026-07-30.md | 公開HTML実測と公式資料を照合。GoatCounterとGoogle Fontsを公開Privacyへ明記する判断。確度高。 |
| Jevの複数判定・ブラウザ操作 | compiled | rag/jev-system-one-2026-09-28.md | TypeSafe公式のモデル説明・評価例とjev-ultrafastの公開READMEを確認。2026-09-28取得。 |

## 運用規則

- 外部仕様を調べた時は、出典、取得日、確度を記録する。
- 一次資料の保存が必要な時は`raw/`、判断と実測をまとめる時はcompiled文書へ分ける。
- 新しい文書を追加したら、このINDEXへ一行追加する。
- 既存の同一調査を確認してから外部調査を始める。
