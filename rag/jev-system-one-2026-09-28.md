# Jevの判定とブラウザ操作に関する一次資料

- 取得日: 2026-09-28
- 確度: TypeSafeによる製品仕様の説明と、jev-ultrafastの公開READMEを確認。個別環境での速度はここから推定しない。

## TypeSafe AI

[Introducing System One Models & Jev](https://typesafe.ai/blog/introducing-system-one-models-and-jev)は、Jevを状態から型付きの確率的判定を返すモデルとして説明する。一度の問い合わせで複数の判定を並列に返す設計にも言及している。

[Workflow evals](https://evals.typesafe.ai/)は、Choiceが候補ごとの確率分布を返し、Noulが二値判断の確率を返すと説明する。上位3候補をどう使うかは、利用するプログラムの設計に属する。

## jev-ultrafast

[browser-use/jev-ultrafast](https://github.com/browser-use/jev-ultrafast)のREADMEは、一つのブラウザ状態に対して操作と対象要素の複数の問いを一回のTypeSafeリクエストへまとめる構成を示す。記事ではこれを製品の仕組みとしてのみ扱い、著者自身の実測値として引用しない。
