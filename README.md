# Orthogonal Interactive — Portfolio Site

Vue 3 + Vite の1ページ構成のポートフォリオサイト。配色は組織アイコン
`public/org-icon.png` から採ったダークスレート × シアンで、同じアイコンを
ページ全体の固定背景にウォーターマークとして敷いている。

構成は `About / Services` の2セクションのみ。屋号 `Orthogonal Interactive` を表の名義とし、
代表者名などの事業者情報は About セクションの定義リストに置いている。
メールアドレスも About の定義リストに含めている（GitHub はヘッダのみ）。
実績セクションは現時点では設けていない。

## AR ページ（`/xr/`）

名刺に印刷したロゴをカメラで認識し、その上に 3D オブジェクトを重ねる。
WebXR は使っていない（iOS Safari が WebXR を実装しておらず、Chrome の画像
トラッキングも incubation フラグ配下のため）。代わりに MindAR
（getUserMedia + WASM）を使うので iOS Safari / Android Chrome の双方で動く。

認識対象は `public/org-icon.png` そのもの。アートワークを変えたら必ず
ターゲットを作り直す:

```bash
npm run compile:target   # public/xr/targets.mind を再生成
```

`three` は **0.160.1 に固定**している。mind-ar 1.2.5 が three から
`sRGBEncoding` を import しており、0.166 以降では削除されているため。

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
xr/index.html                  AR ページ（Vite の第2エントリ → /xr/）
src/xr/main.js                 MindAR の起動と描画ループ
src/xr/brandObject.js          マーカー上に出す 3D オブジェクト
src/xr/support.js              カメラ／WebGL の事前判定
tools/compile-target.mjs       ロゴ → .mind ターゲットのコンパイル
src/App.vue                    セクションの組み立てと背景
src/style.css                  カラートークンと共通プリミティブ
src/components/SiteHeader.vue      屋号ロゴとナビゲーション
src/App.vue 内 .backdrop        ロゴのウォーターマーク背景
src/components/AboutSection.vue    経歴と事業者情報（Name / Principal / Founded /
                                   Based in / Email）
src/components/ServicesSection.vue 提供サービス4種
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
