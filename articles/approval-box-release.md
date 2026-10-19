---
title: "AIの質問があちこちに散らばるので、スマホに決裁を集めるApproval Boxを作りました"
emoji: "📮"
type: "tech"
topics: ["claudecode", "ai", "ios", "mcp", "個人開発"]
published: true
---

:::message
この記事は [Claude Code 始めました](https://kitepon.dev/blog/) からの転載です。
:::

[Approval Box](https://kitepon.dev/products/approval-box/)というiPhoneアプリを[App Store](https://apps.apple.com/jp/app/approval-box/id6818175213)で公開しました。PCで動くAIから届く相談をスマホで受け取って、その場で答えるアプリです。

## 質問があちこちに散らばります

AIで仕事をしていると、セッションをたくさん開くことになります。AIを動かす道具（ハーネス）も複数使っています。長い開発になると、開発に限らずどの仕事でも、それぞれのセッションからAIが質問してきます。質問はあちこちに散らばって、答えるのも大変です。

私はパソコンの前を離れることも多いです。離れている間にAIが質問を出すと、そのセッションは答えを待って止まります。気づいた時には、いつのまにか仕事が止まっています。

それを解決するために作ったのがApproval Boxです。

## 多数のセッションから、決裁がスマホに集まります

AIは、人の判断や承認が要る時にApproval Boxへ申請を出します。申請はスマホのアプリに集まって、件名がプッシュ通知で届きます。アプリには、どのAIから来たか、何の仕事の相談か、急ぎか、期限はいつかが並びます。

![受信の画面。Claude Code、Codex、Grokからの相談が一つの一覧に並んでいます。](https://kitepon.dev/blog/post/approval-box-release/inbox.png)
*受信の画面。Claude Code、Codex、Grokからの相談が一つの一覧に並んでいます。*

相談を開くと、AIが書いた背景と選択肢が出ます。AIの推奨には印が付いているので、それを見ながら選んで送れます。選択肢のほかに文章で指示を書くこともできますし、画像や書類を添付して答えることもできます。すぐ決められない時は保留して、あとで答えられます。

![相談の画面。背景を読み、AIの推奨を見ながら選択肢を選んで回答を送ります。](https://kitepon.dev/blog/post/approval-box-release/detail.png)
*相談の画面。背景を読み、AIの推奨を見ながら選択肢を選んで回答を送ります。*

## 答えると、寝ているセッションも起きます

このアプリのすごいところは、答えを送ったら、寝ているセッションでも起きることです。答えは申請したAIの会話へそのまま戻ります。AIが作業中なら作業中のターンへ届き、止まっていれば新しいターンとして届いて、AIはそこから仕事を続けます。スマホから答えれば、その場で仕事が再開します。

もう一つ、AI自身が決裁を取り下げたり、更新したりできます。申請を出したあとで状況が変わったら、AIが内容を直したり、要らなくなった申請を取り下げたりします。アプリにはそれがそのまま反映されるので、一覧には今答えるべき相談が残ります。

履歴では、答えがAIに届いたかを確かめられます。会話を続けたい時のために「再開の一言」をコピーする機能も付けました。

![履歴の画面。答えた相談と、AIへ届いたかが並んでいます。](https://kitepon.dev/blog/post/approval-box-release/history.png)
*履歴の画面。答えた相談と、AIへ届いたかが並んでいます。*

## 使い方は簡単です

PCで次のコマンドを実行します。

```sh
npx -y approval-box@latest setup
```

PCにあるAIを見つけて、Approval Boxを登録してくれます。書き換えるファイルは先に見せて、控えを残してから書き換えます。あとは画面に出るQRコードをアプリで読み取れば、PCとスマホがつながります。

![端末を追加する画面。PCでコマンドを実行し、スマホでQRコードを読み取ります。](https://kitepon.dev/blog/post/approval-box-release/pairing.png)
*端末を追加する画面。PCでコマンドを実行し、スマホでQRコードを読み取ります。*

最後にAIへ「Approval Boxのsetup_testを実行して」と頼みます。テストの申請がスマホに届くので、それに答えて、答えがAIまで届けば準備完了です。

対応しているAIはClaude Code、Codex、Cursor、Grokで、PCはmacOS、Windows、Linuxのどれでも動きます。PC側にはNode.js 20以上が要ります。

アプリは無料でダウンロードできて、公式サービスの月額プランは日本で300円です。AIそのものの契約は別に要ります。ブラウザで使える[Web版](https://approval-box.kitepon.dev/)もあって、使い方は[サポートページ](https://approval-box.kitepon.dev/support)にまとめています。サーバーとWeb版のコードは[GitHub](https://github.com/kitepon/approval-box)で公開しているので、自分でサーバーを立てて使うこともできます。
