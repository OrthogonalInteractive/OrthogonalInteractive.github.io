# Orthogonal Interactive — Portfolio Site

Vue 3 + Vite の1ページ構成のポートフォリオサイト。配色は組織アイコン
`public/org-icon.png` から採ったダークスレート × シアンで、同じアイコンを
ページ全体の固定背景にウォーターマークとして敷いている。

構成は `About / Services` の2セクションのみ。屋号 `Orthogonal Interactive` を表の名義とし、
代表者名などの事業者情報は About セクションの定義リストに置いている。
メールアドレスも About の定義リストに含めている（GitHub はヘッダのみ）。
実績セクションは現時点では設けていない。

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
src/App.vue                    セクションの組み立てと背景
src/style.css                  カラートークンと共通プリミティブ
src/App.vue 内 .backdrop        ロゴのウォーターマーク背景
src/components/AboutSection.vue    経歴と事業者情報（Name / Principal / Founded /
                                   Based in / Email）
src/components/ServicesSection.vue 提供サービス4種
src/components/SiteFooter.vue      屋号と著作権表示のみ
src/composables/useReveal.js   スクロール連動のフェードイン
public/org-icon.png            ロゴ／favicon
```

編集ポイント:

- コピー文言は各 `*Section.vue` の `<script setup>` 冒頭の配列
- 事業者情報は `AboutSection.vue` の `facts`
- 色は `src/style.css` の `:root`
- 連絡先も `AboutSection.vue` の `facts`（`href` を持つ行がリンクになる）

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
