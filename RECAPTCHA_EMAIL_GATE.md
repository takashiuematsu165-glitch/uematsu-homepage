# reCAPTCHAメール保護の実装メモ

## 安全設計

GitHub Pagesは静的ホスティングのため、reCAPTCHAのシークレットキーをサイトのJavaScriptやGitHubリポジトリへ配置しない。ユーザー側のページでは公開可能なサイトキーだけを使い、認証レスポンスをCloudflare Workerへ送る。WorkerはCloudflareの暗号化されたシークレットとして保持する検証キーを用い、Googleの`siteverify` APIで認証トークン、期限、利用済み状態、ホスト名を検証する。

認証が成功した場合だけ、Workerは短時間のみ有効な署名付き公開トークンを返す。Contactページはそのトークンを使ってメールアドレスを取得・表示し、同じカード内の「メールアドレスをコピー」操作でクリップボードへコピーする。メールアドレスは初期HTML・JavaScript・GitHubリポジトリには含めない。

## Cloudflare確認状況

Cloudflareのユーザーセッションはログイン済みであり、Workers & Pagesの画面にアクセスできることを確認した。独立したメール保護用Workerを作成し、公開前にユーザーへ作成・公開操作の確認を求める。

## 参考

- Google reCAPTCHA は、クライアントで得た応答トークンをバックエンドから `siteverify` APIへ送信して検証する方式である。各トークンは2分間かつ1回だけ有効である。https://developers.google.com/recaptcha/docs/verify
- シークレットキーはアプリケーションバックエンドとreCAPTCHAサーバー間の認可に使うため、安全に保管する必要がある。https://developers.google.com/recaptcha/intro
