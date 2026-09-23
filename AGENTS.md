# AGENTS.md

このファイルは本プロジェクトでClaude CodeとCodexが共有する正典である。

## Project

「Claude Code 始めました」— Claude MAXユーザーの実体験を中心にした日本語技術ブログ。Hugoで生成し、非root nginx containerをCaddyの`/blog*` path routingで配信する。記事相談、記事生成、公開までを一つの制作工程として扱う。

## 記事相談 — 会話が主役

記事はオーナーとベルが会話しながら一緒に作る。相談自体が主要な成果物であり、次を守る。

- オーナーの発言を捏造しない。作業許可が曖昧な時は、根拠にする前に発言を引用して確認する。
- 最初に、理解した目的と現時点の見立てを自然文で返す。
- 一度に掘る核心は一つにする。質問一覧、固定フォーム、案の大量列挙で会話を置き換えない。
- 合意した軸は短く言い直す。反論や修正を受けたら、該当する合意を更新してから続ける。
- 明示的な起稿許可を受けるまで、記事本文、構成、記事planをファイルへ書かない。チャット上で見立てや推奨構成を話すことはできる。
- 起稿許可後は同じ許可を聞き直さず、`draft: true`で初稿を作る。
- 返事に長い間を空けない。ツール作業へ入る前に、何をどこまで行うかを短く伝える。

記事状態は次の三つだけを使う。

1. **相談中**: 会話で動機、実体験、記事の主役、構成を詰める。ファイルへ起稿しない。
2. **起稿許可後**: 初稿、画像、オーナー確認、公開前監査を進める。軸や著者像を変える監査指摘はオーナー確認へ戻す。
3. **公開承認後**: オーナーが最終稿を承認した後、`draft: false`、Zenn同期、検査、commit/pushへ進む。

軸と構成に定型の承認段階を設けない。会話の中で自然に詰め、起稿と公開の二つだけ明示的な許可を受ける。

## Canonical Docs

- 全体地図: `docs/00_overview.md`
- 文体・著者像: `docs/writing-voice.md`
- 記事の公開手順: `docs/publishing.md`
- サイト・画像・広告の確定仕様: `docs/site-operations.md`
- 設計判断: `docs/adr/`
- 調査・研究の再利用棚: `rag/INDEX.md`
- 共有スキル: `.agents/skills/` と `skills-lock.json`
- 記事メタデータの正本: `content/post/*/index.md` のfrontmatter

同じ事実をこのファイルへ複製しない。詳細を変更した時は、上記の担当文書か実装近傍のREADMEを更新する。

## Build & Development

```bash
hugo server -D
hugo --minify
```

自前テーマは `layouts/` と `assets/` にある。mainへのpushでは
`.github/workflows/validate.yml`がcontent pipelineとHugo buildを検査する。本番は
`Dockerfile`で生成した非root nginx containerを`https://kitepon.dev/blog/`へ配信する。

## 公開の安全境界

- 公開工程の正本は`docs/publishing.md`。記事公開時は必ず読む。
- `draft: false`にする前に、オーナーの初稿確認と公開前監査を完了する。
- `date`は公開時刻より未来にしない。
- 内部リンクは`relref`を使う。
- `cover.png`、`cover-sm.png`、本文画像を用意し、参照と実在を突合する。
- Zennは`tools/zenn-sync/sync.mjs`で生成し、対象記事だけを選択addする。
- commit/pushの対象と、ユーザーが行うX投稿を同じ完了条件にしない。AIはX投稿文を引き渡し、投稿済み状態はユーザーからURLを受け取った時だけ記録する。
- push、force系、外部投稿はオーナーの明示指示がある時だけ行う。

## 公開前監査

公開前に次を確認する。

- 不要な逆接、同じ主張の重複、長すぎる一文、時系列の前後、タイトルの日本語
- `relref`、画像参照、frontmatter、未来日付
- オーナーの実体験と、AIの推測や外部情報が混ざっていないか
- 記事の主役が著者の動機・判断・設計になっているか
- 著者を受け身、無知、失敗から学んだ人物として作為的に描いていないか

誤字、重複、リンクなど意味を変えない修正は反映できる。事実、温度、記事の軸、著者像を変える修正は、理由を示してオーナーへ確認する。

## Repository Rules

- 記事は`content/post/<slug>/index.md`のPage Bundle形式で置く。
- frontmatterは`title`、`date`、`draft`、`description`、`tags`、`cover.image`を持つ。
- `tags`の先頭が一覧カードのカテゴリ、`description`が注目カードの説明に使われる。
- カバー生成は`tools/cover/README.md`、Zenn同期は`tools/zenn-sync/README.md`に従う。
- 記事一覧を正典へ手書きしない。必要な一覧はfrontmatterから導出する。
- `.claude/`、`.codex/`の端末固有設定をコミットしない。
- 旧`data/self_ads.yaml`、`data/gear_ads.yaml`は配信に使わない。広告追加はAd Studioで承認する。

## 公開ページの計測

- 新しい公開ページは`layouts/_default/baseof.html`を通し、共通page分類とevent adapterを受け取る。
- `page_type`、`content_group`、`language`、`content_id`はHugoのpage contextから与える。
- CTAは`data-kitepon-event`等の宣言的属性だけを使い、個別templateからanalytics providerを直接呼ばない。
- 標準eventで表せない特殊操作だけ、実装前にevent名、意味、allowlist属性、非発火条件を`docs/site-operations.md`へ追加する。
- 個人情報、入力値、任意query、fragment、認証情報をeventへ含めない。
- 新規route、記事、CTAを追加した時は`node tools/validate-content.mjs --rendered`で計測coverageを検査する。
- 本番公開後はRootSitePromotionの`npm run test:quality`でblog sitemap掲載pageと記事内linkを確認し、
  blog URL起点の失敗はこのprojectが修正する。
- 本番をブラウザで目視・自動検査する端末は、先に`https://kitepon.dev/analytics-optout/`を開き、
  `kitepon_analytics_optout=1` cookieを設定する。通常利用者の行動へ戻す検査だけを明示的な例外とする。
- 計測しない公開ページは、理由と期限を`docs/site-operations.md`へ明記した例外だけを許す。

## 報告

項目ごとに、実施／スキップと理由、変更ファイル、検証結果を報告する。できなかったことを成功扱いしない。
