# GitHub Pages 運用メモ

## 公開先

| 項目 | 内容 |
| --- | --- |
| ソースリポジトリ | `https://github.com/takashiuematsu165-glitch/uematsu-homepage` |
| 公開URL | `https://takashiuematsu165-glitch.github.io/uematsu-homepage/` |
| 編集対象ブランチ | `main` |
| 公開対象ブランチ | `gh-pages` |

## 今後の更新方針

このホームページの更新依頼では、**GitHubリポジトリの `main` を正本として編集**し、GitHub Pagesの公開内容へ反映する。`gh-pages` はビルド済みの静的ファイル専用のブランチであり、原則として直接編集しない。

## 更新手順

1. `main` 上でページ、スタイル、画像、CMS表示を更新する。
2. `GITHUB_ACTIONS=true pnpm build` でGitHub Pages用のビルドを作成する。
3. `dist/public` の内容を `gh-pages` ブランチのルートへ反映し、GitHubへプッシュする。
4. 公開URLでホーム、画像、ハッシュ形式のページ遷移、Cookie同意、Google アナリティクスを確認する。

> GitHub Pagesではプロジェクト配下で公開されるため、ビルド時にViteの公開パスを `/uematsu-homepage/` とする設定を維持する。

## 注意事項

公開用の画像は `client/public/assets/` に格納する。Google アナリティクスはCookie同意後にだけ読み込まれる実装を維持する。
