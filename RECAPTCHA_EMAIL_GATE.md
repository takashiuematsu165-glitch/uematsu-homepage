# reCAPTCHAメール保護の実装メモ

## 安全設計

GitHub Pagesは静的ホスティングのため、メールアドレスやGoogle Cloud APIキーをサイトのJavaScript、初期HTML、GitHubリポジトリへ配置しない。ユーザー側のページではreCAPTCHA Enterprise v3の公開サイトキーだけを使い、「メールアドレスをコピー」を押した時に `grecaptcha.enterprise.execute()` で `email_reveal` アクションのトークンを取得する。

Cloudflare Workerは、Cloudflareの暗号化シークレットとして保持するGoogle CloudプロジェクトID、reCAPTCHA Enterprise APIキー、サイトキー、署名用シークレットを利用して、Google CloudのCreateAssessment APIへトークンを送る。Workerはトークンの有効性、ホスト名、アクション名、リスクスコア（0.5以上）を確認した場合だけ、短時間有効な署名付き公開トークンを発行する。

認証が成功した場合だけ、Workerは短時間のみ有効な署名付き公開トークンを返す。Contactページはそのトークンを使ってメールアドレスを取得・表示し、同じカード内の「メールアドレスをコピー」操作でクリップボードへコピーする。メールアドレスは初期HTML・JavaScript・GitHubリポジトリには含めない。

## Cloudflare確認状況

Cloudflareのユーザーセッションはログイン済みであり、Workers & Pagesの画面にアクセスできることを確認した。独立したメール保護用Worker `uematsu-email-gate` を作成し、メールアドレス、reCAPTCHAサイトキー、署名用シークレット、Google CloudプロジェクトID、Google Cloud APIキーをすべてCloudflare Secretとして設定した。

## 参考

- reCAPTCHA Enterprise v3では、クライアントで得たアクショントークンをバックエンドからCreateAssessment APIへ送信して評価する。トークンは1回だけ使用でき、2分で失効する。https://docs.cloud.google.com/recaptcha/docs/create-assessment-website
- Google Cloud APIキーはreCAPTCHA Enterprise APIだけに制限し、Cloudflare Secretとして安全に保管する。https://docs.cloud.google.com/recaptcha/docs/create-key-website
