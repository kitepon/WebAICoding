# サイト・画像・広告の運用仕様

サイト実装の確定値と、変更時に維持する条件をまとめる。記事公開の手順は`docs/publishing.md`を参照する。

## サイト構成

- サイト名: 「Claude Code 始めました」
- URL: `https://kitepon.dev/blog/`
- 旧URL: `https://blog.kitepon.dev/`（Cloudflareで新URLへ301）
- SSG: Hugo extended 0.164.0（`Dockerfile`と`.github/workflows/validate.yml`で同じ版を使う）
- ホスティング: 非root nginx container。Caddyが`/blog*`をcontainerの8080へrouteする。nginxは`absolute_redirect off`でLocationを相対パスにする
- 本番build: `Dockerfile`で`/out/blog`へ生成し、nginxのdocument rootへcopyする
- healthcheck: `/healthz`
- テーマ: `layouts/`と`assets/`にある自前テーマ
- 記事: `content/post/<slug>/index.md`のPage Bundle
- CSS: `assets/css/main.css`をHugo Pipesでfingerprintして配信
- 統計: `claudecode-blog.goatcounter.com`
- デザイン: Warm Terminal Editorial。クリーム、珊瑚色、ターミナルとコードの意匠

旧`themes/paper`のgitlinkと`.gitmodules`は残っているが、現在のテンプレート実装は利用していない。撤去は基準構成の変更になるため、オーナー承認を得た別作業で行う。

## 本番更新

`main`の検査対象pathへのpushは`.github/workflows/validate.yml`の検証だけを起動し、自動デプロイはしない。
本番は検証成功後、運用側で次の順序を守って更新する。

1. 本番repoがcleanな`main`であることを確認し、`git pull --ff-only`で対象commitを取得する
2. 対象commitが`origin/main`の祖先であることを確認する
3. commit SHAを`KITEPON_BLOG_TAG`へ渡して`blog` serviceをbuildする
4. 同じtagで`blog` serviceを再作成し、containerが`healthy`になるまで確認する
5. `/healthz`、blog index、変更対象ページをLANと公開URLの順でsmokeする

imageは`kitepon-blog:<commit SHA>`で追跡し、`latest`だけを本番反映の根拠にしない。
本番ホストでは次の形で実行する。

```bash
cd /home/kite/Developer/WebAICoding
git pull --ff-only origin main
blog_release_sha="$(git rev-parse HEAD)"
git merge-base --is-ancestor "$blog_release_sha" origin/main
sudo -n env KITEPON_BLOG_TAG="$blog_release_sha" docker compose build blog
sudo -n env KITEPON_BLOG_TAG="$blog_release_sha" docker compose up -d blog
sudo -n docker inspect --format '{{.Config.Image}} {{.State.Health.Status}}' kitepon-blog
```

更新前に直前tagを記録する。

```bash
blog_previous_image="$(sudo -n docker inspect --format '{{.Config.Image}}' kitepon-blog)"
blog_previous_sha="${blog_previous_image#kitepon-blog:}"
sudo -n docker image inspect "kitepon-blog:$blog_previous_sha"
```

rollback時は記録した値を使い、次の形で再作成して同じhealth／公開smokeを行う。

```bash
sudo -n env KITEPON_BLOG_TAG="$blog_previous_sha" docker compose up -d --no-build blog
sudo -n docker inspect --format '{{.Config.Image}} {{.State.Health.Status}}' kitepon-blog
```

## レイアウト

- `layouts/_default/baseof.html`: head、上部バー、フッター、GoatCounter
- `layouts/_default/list.html`: ホーム、タグ、section一覧
- `layouts/_default/single.html`: 記事ページ
- `layouts/_default/_markup/render-image.html`: 本文画像を`figure`と`figcaption`へ変換
- `layouts/shortcodes/linkcard.html`: OGP風リンクカード

フォントは見出しがNoto Serif JP、本文がZen Kaku Gothic New、コードがJetBrains Mono。

## サイト全体計測

ブログは`kitepon.dev`配下の一つのcontent groupとして扱う。`layouts/_default/baseof.html`が全ページへ
`page_type`、`content_group=blog`、`language=ja`、`content_id`、配信commitを付ける。GoatCounterはpage view、
referrer、campaignを集計し、`/analytics/v1.js`はルートサイトが所有する共通event adapterとして、
engaged view、content complete、内部・外部遷移、404復帰等を同じ契約で送る。

scrollや滞在は注意・到達の代理指標であり、理解や満足とは呼ばない。任意query、fragment、入力値、
メールアドレス、秘密、error stackは送らない。記事固有templateからGoatCounterを直接呼ばず、特殊eventは
宣言的`data-kitepon-*`属性と共通契約を先に追加する。生成HTMLのcoverageは
`node tools/validate-content.mjs --rendered`が検査する。

クオ本人と開発時のブラウザ確認は、`https://kitepon.dev/analytics-optout/`で設定する
`kitepon_analytics_optout=1` cookieによりGoatCounterとCloudflare Web Analyticsの両方から除外する。
共通adapterはGoatCounterより先に読み、cookieがある時は`no_onload`を設定してpage view・eventを送らない。
本番目視や自動ブラウザ検査では先に除外設定を行う。過去の集計は個人識別情報を持たないため、
推測で遡及控除しない。

## カバー画像

生成器は`tools/cover/generate-cover.js`、詳細は`tools/cover/README.md`を正本とする。

- PC: `cover.png`、1250×500、2.5:1
- モバイル: `cover-sm.png`、1080×1080、1:1
- 色: 左上`#c4603a`から右下`#e89f6f`
- モバイルの短い見出し: `tools/cover/mobile-covers.json`

モバイル一覧カードの確定値:

```css
@media(max-width:600px) {
  .card { flex-direction:row; border:1px solid var(--line); border-radius:14px; align-items:stretch; height:116px; }
  .card .chrome { display:none; }
  .card .thumb { flex:0 0 116px; width:116px; align-self:stretch; }
  .c-body { flex:1; justify-content:center; }
}
```

コーラルの左装飾線を追加しない。`.thumb`へ固定`height:116px`を追加しない。

## 本文画像

- 記事を主、画像を補助として扱う
- 実スクリーンショット、実データから作った図、ブランド図版、linkcardを使う
- 文字、UI、図表、実機画面を画像生成モデルに描かせない
- フル画質PNGを使い、圧縮、縮小、WebP化をしない
- 実機由来の画面は実コードを動かして作る
- 既存画像を差し替える時はファイル名を変える

図版は`~/Developer/blog-figmaker/`、スクリーンショットは実ブラウザまたは実アプリ、雰囲気カットだけ画像生成を利用できる。これらはローカル外部ツールなので、利用できない環境では無断の代替画像を作らず状況を報告する。

## OGP

- 記事: Page Bundleの`cover.png`
- coverを持たないページ: `static/og-card.png`、1200×630
- `twitter:card`: `summary_large_image`
- `og-card.png`の再生成: `node tools/cover/gen-og-hero.js`

OG画像を差し替える時はファイル名を変える。記事公開直後の確認は記事ページのデプロイ完了後に行い、画像URLへキャッシュバスターを付けて一度だけ取得する。

Cloudflareは実レスポンスのキャッシュに関与している。DNS onlyを前提にせず、本文画像とOG画像の同一URL差し替えを避ける。

## 記事レール広告

PC記事ページの左右ガターに、自作プロダクトを一つずつ表示する。左右で同じ製品を出さない。
フッター退避の設計判断は[ADR 0003](adr/0003-keep-fixed-ad-rails-above-footer.md)を参照する。

- 表示幅: viewport 1100px以上
- 配置: `position:fixed`、左右ガター中央。初期表示からフッター1個分だけ上へ置き、スクロール中も同じ高さに固定する
- ローダ: `layouts/partials/ad-rail.html`
- 配信: `https://studio.kitepon.dev/serve`
- 左を取得し、左の`data-kp-id`を`exclude`へ渡して右を取得する
- Ad Studio停止時は空表示。静的YAMLへ戻さない
- クラスは`kp-*`、画像公開パスは`/store/`を維持する

CSS変数:

- `--rail-w: 160px`
- `--post-w: 44rem`
- `--rail-bottom: 1.25rem`
- `--rail-footer-offset: 6.875rem`（初期値。DOM構築後とresize時に実際のフッター高へ補正）
- `--rail-img: 280px`
- `--flag-skew: 16px`
- `--flag-inset: 4px`

幅計算へ`100vw`を使わない。`.post__body`や祖先へ`transform`、`filter`、`will-change`、`contain`を追加しない。fixed配置の基準が変わる。

Amazonアフィリエイトと第三者gear配信は2026-06に廃止済み。左右ともAd Studioの`published`なselfプールから配信する。`data/self_ads.yaml`、`data/gear_ads.yaml`、`static/store/`の旧データは配信元ではない。広告追加はAd Studioで承認する。

Ad Studio側の構造を変更する場合は、外部リポジトリ`~/Developer/ad-studio/docs/ARCHITECTURE.md`を確認する。このブログ側だけで配信契約を変更しない。
