# Orthogonal Interactive — Portfolio Site

Vue 3 + Vite の1ページ構成のポートフォリオサイト。ヒーローは Three.js の
リアルタイム 3D シーン（ポインタ追従・ドラッグ回転）。配色は組織アイコン
`public/org-icon.png` から採ったダークスレート × シアン。

コンテンツは現状プレースホルダー（Work セクションは "Coming soon" の枠のみ）。

## 開発

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # Vitest（jsdom）
npm run build    # dist/ を生成
npm run preview  # ビルド結果を確認
```

## 構成

```
index.html                     メタタグ／フォント読み込み
src/App.vue                    セクションの組み立て
src/style.css                  カラートークンと共通プリミティブ
src/components/HeroScene.vue   Three.js シーン（動的 import で遅延ロード）
src/components/*Section.vue    各セクション
src/composables/useReveal.js   スクロール連動のフェードイン
public/org-icon.png            ロゴ／favicon
```

編集ポイント:

- コピー文言は各 `*Section.vue` の `<script setup>` 冒頭の配列
- 色は `src/style.css` の `:root`、3D 側は `HeroScene.vue` の `PALETTE`
- 連絡先は `ContactSection.vue` の `channels`（メールアドレスは仮）

## デプロイ（GitHub Pages / 組織サイト）

`OrthogonalInteractive/OrthogonalInteractive.github.io` に push すると
`.github/workflows/deploy.yml` が build → test → Pages 公開まで実行する。
`vite.config.js` の `base` は `'/'`（組織サイト前提）。

初回のみ:

```bash
git init -b main
git add -A
git commit -m "Add portfolio site"
gh repo create OrthogonalInteractive/OrthogonalInteractive.github.io \
  --public --source=. --remote=origin --push
```

その後 GitHub の **Settings → Pages → Build and deployment → Source** を
**GitHub Actions** に切り替える。公開 URL は
<https://orthogonalinteractive.github.io/>。

プロジェクトサイト（`.../<repo>/`）に変える場合は `vite.config.js` の
`base` を `'/<repo>/'` にする。独自ドメインを使う場合は `public/CNAME` を
追加する。
