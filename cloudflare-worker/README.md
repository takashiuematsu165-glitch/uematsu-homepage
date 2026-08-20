# Cloudflare Worker: `uematsu-email-gate`

このWorkerは、GitHub PagesのContactページから送られるreCAPTCHA応答をサーバー側で検証し、成功した場合だけ短時間有効なメール公開トークンを発行する。

## 必須シークレット

Cloudflare Dashboardの **Workers & Pages → uematsu-email-gate → 設定 → 変数とシークレット** で、次の3項目をすべて **Secret** として登録する。

| 名前 | 内容 |
|---|---|
| `RECAPTCHA_SITE_KEY` | reCAPTCHA管理画面のサイトキー。クライアントへ返す公開可能な値。 |
| `RECAPTCHA_SECRET` | reCAPTCHA管理画面のシークレットキー。Cloudflare外やGitHubコードへ保存しない。 |
| `CONTACT_EMAIL` | 保護対象のメールアドレス。 |

Cloudflare Dashboardのブラウザエディタでは、`uematsu-email-gate.js` の内容で `worker.js` を置き換える。`uematsu-email-gate.ts` は型情報付きの参照用であり、ブラウザエディタへ直接貼り付けない。APIの公開URLは `https://uematsu-email-gate.takashiuematsu165.workers.dev` とする。
