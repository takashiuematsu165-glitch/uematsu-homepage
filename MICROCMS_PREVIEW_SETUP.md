# microCMS News画面プレビュー設定

## 連携URL

microCMS管理画面でNews APIの「API設定」→「画面プレビュー」→「遷移先URL」に、次のURLを設定します。

```text
https://takashiuematsu165-glitch.github.io/uematsu-homepage/?contentId={CONTENT_ID}&draftKey={DRAFT_KEY}#/preview
```

このURLでは、microCMSが記事のコンテンツIDと下書き用の`draftKey`を動的に置き換えるため、管理画面の記事詳細から「画面プレビュー」を選ぶと、公開前の内容をサイトと同じレイアウトで確認できます。

## 実装方針

プレビュー画面は、URLクエリの`contentId`と`draftKey`を受け取り、News APIの個別記事取得に`draftKey`を付けて取得します。通常のNews記事URLとは別の`#/preview`ルートを使うことで、GitHub Pagesのハッシュルーティング環境でもクエリを維持します。

公開済み記事をプレビューする場合、microCMSが`draftKey`を空で渡すことがあります。この場合は`contentId`だけで公開済み記事を取得して表示し、下書き記事では渡された`draftKey`を使って未公開内容を取得します。

不正なURL、キーの期限切れ、取得不能な記事の場合は、本文を表示せず、プレビューを確認できない旨だけを安全に表示します。

## 公式資料

- [microCMS 画面プレビュー](https://document.microcms.io/manual/screen-preview)

## 管理画面での確認

microCMSサービス `1jzsnsr5i6` のNews API（お知らせ）管理画面へログイン済みの状態でアクセスできることを確認した。画面プレビューの設定は、News API画面右上の「API設定」から行う。

設定画面では、遷移先URL内の`{CONTENT_ID}`と`{DRAFT_KEY}`がそれぞれ記事IDと下書きキーに置換されることを確認した。記事編集画面に画面プレビューボタンを表示する設定も利用できる。

2026-08-21にNews APIの遷移先URLとして本書の連携URLを保存し、microCMS管理画面で「変更が完了しました」と表示されることを確認した。画面プレビューボタンの表示は有効になっている。

保存後、既存News記事の編集画面に「画面プレビュー」ボタンが表示されることを確認した。記事を下書き保存した場合も同じ操作からプレビューを開ける。
