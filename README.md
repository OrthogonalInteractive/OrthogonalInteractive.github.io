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

mind-ar は node-canvas を引き連れてくるが、これを使うのは上の
`compile:target` だけ。CI ではネイティブビルドが通らないので
`npm ci --ignore-scripts` でインストールしている（ビルドにもテストにも
node-canvas は不要）。

### ハンド操作（任意ロード）

名刺を認識したあとに出る「Enable hand control」を押した人だけが、
MediaPipe HandLandmarker（WASM 11 MB ＋ モデル 7.5 MB）を読み込む。
押さなければ表示とスワイプ操作のみ。

ボタンはトグルで、有効化後は「Turn hand control off」になる。切ると毎フレームの
手検出をやめ、スワイプ操作に戻る。読み込んだトラッカーは破棄せず保持するので、
再度オンにするのは即座（毎フレームの計算だけを止めている）。

アセットは `public/xr/mediapipe/` に同梱している（第三者ホストに依存しない）。
ダウンロード済みかどうかの表示・キャッシュ削除・再ダウンロードのために
Cache Storage に保存し、`public/xr/sw.js`（スコープ `/xr/`）がそこから
MediaPipe に返す。MediaPipe は自前のローダー内で URL を fetch するので、
Service Worker を挟まないとページが持っているキャッシュに当たらない。
GitHub Pages の HTTP キャッシュは `max-age=600` しか付けられず、
iOS Safari では 11 MB が残る保証もないため、保存を自前の制御下に置いている。

更新するとき:

```bash
npm run fetch:hand-assets
```

SIMD 版 WASM のみを置いている。非SIMD版とESモジュール版は合わせて 21 MB あるが、
Safari 16.4+ / Chrome 91+ はすべて SIMD 対応なので要求されない。

**遮蔽対策**: 手が名刺を覆うと画像トラッキングがロストする。対策は2つ。

1. **オブジェクトをアンカーの子にしない。** MindAR はロスト時に
   `group.visible = false` にするだけでなく **`group.matrix` をゼロ行列で
   潰す**（`three.js` 177行目）。したがってアンカーに親子付けしていると
   姿勢の保持ができない。自前の `holder` グループを scene に置き、
   追跡が生きている間だけアンカーの行列を写し取る。見失っても
   最後の姿勢のまま残る。
2. **マーカー検出は止めず、指が触れている間だけ姿勢の写し取りを凍結する。**
   完全に覆われればロストして静止するだけだが、**半分だけ覆われた状態**では
   特徴点が減ったまま追跡が成立して姿勢が暴れる。触れている間だけ凍結すれば
   それを避けつつ、それ以外の時間は名刺に追従し続けられる。
   なお MindAR のトラッカーは自前の非同期ループで回っており、外から
   フレーム間引きはできない（`processVideo()` は呼ぶたびに追跡状態を
   作り直すため、停止・再開の繰り返しは再取得のちらつきを招く）。
   負荷を下げるなら手側の `DETECT_EVERY` を上げる。

**表示するモデル**: `public/xr/cat.glb`。ロゴと同じローポリ猫（2,558三角形）。
24ボーンのリグ付きで、**5秒ループのアイドルアニメーション `Idle_Sleep`** が入っている
（呼吸2回・尻尾のうねり・頭の傾ぎ）。`AnimationMixer` で再生している。

丸まって寝ている姿勢がレストポーズなので、起き上がりや歩行は入れられない。
折り畳まれた状態で造形されているため脚の体積が胴の中に無く、ウェイトも
その配置に合わせて焼かれているので、伸ばすとメッシュが破綻する（実際に試して確認済み）。
それをやるなら立ち姿勢でモデルを作り直す必要がある。

`restBounds()` で大きさを測っている点に注意。`Box3.setFromObject` は
SkinnedMesh に対して `object.boundingBox`（＝現在のポーズから計算した箱）を
優先するため、読み込み直後のスケルトン未更新の状態では潰れた箱が返り、
モデルが数倍の大きさで描画される。
Meshy の書き出しは 2048² のテクスチャで 3.7 MB あったので、1024² に落として
**412 KB** にしてある（見た目の差は、この描画サイズでは分からない）。

```bash
node tools/optimise-model.mjs <source.glb>   # public/xr/cat.glb を作り直す
```

法線マップと金属度粗さマップは Blender 側でマテリアルから外してから書き出している
（この描画サイズでは視認できず、2枚で 4 MB あるため）。残る base_color 1枚を
1024² に縮小して 455 KB。

発光はテクスチャに焼き込まれているため、同じ画像を `emissiveMap` にも割り当てて
自己発光させている。そうしないとシーンのライトに従って暗く沈む。
glTF は Y-up、マーカーは Z-up なので X 軸に +90° 回し、バウンディングボックスから
名刺幅に合わせて自動スケールする（`src/xr/fit.js`）。

**登場と退出**: マーカーを認識したとき、モデルが名刺の中からせり上がる
（1.4秒、ease-out）。見失うと 2 秒の猶予のあとフェードアウトして消え、
再取得時に向きと大きさをリセットして最初から再生する。

「手で名刺を覆った」と「カメラを名刺から外した」はトラッカーからは区別できない
（どちらも `onTargetLost`）ので、**手がフレームに映っている間は消さない**ことで
分けている。手は名刺を覆いながら入ってくるので、指が触れているかではなく
手が見えているかで判定する。猶予の 2 秒は、追跡の一瞬のちらつきで消えたり出たりしないためのもの。
実使用では手の影・手ブレ・浅い角度で追跡は頻繁に途切れる。ハンド操作が
無効なときは手という手掛かりが無いので、短い猶予だとモデルが点滅し、
そのたびにせり出しがやり直しになる。スワイプ中も同様に消さない。名刺の平面にクリッピング平面を張り、まだ面の下にある部分を描かない
ことで「中から出てくる」ように見せている。平面はマーカーの姿勢から毎フレーム
作り直す（`renderer.localClippingEnabled`）。

**操作**: 人差し指の先端だけで触れて、なでると回る。回転はモデル自身の
上方向の軸（グループのローカル Z、モデルを立てたあとの glTF の Y）に固定する。
three の `rotateOnWorldAxis` は「親が回転していないこと」を前提としており
（ソースにその旨のコメントがある）、ここでは親がマーカー姿勢を持つので
使えない。ローカル回転にすれば親の姿勢に影響されない。
判定は
指がオブジェクトの周りをどれだけ回ったか（画面上の掃引角）だけを見る。
1フレームで四分の一回転を超える報告は、指が中心を跨いで方位が反転しただけなので
棄却する。指を離しても慣性で回り続け、減衰して止まる。
**ハンド操作を有効にしていない間は、画面のタッチで操作する。**
1本指でオブジェクトの上から始めたドラッグで回転、2本指のピンチで拡大
（1.0〜2.5倍）。2本目の指が触れた時点で回転はキャンセルする。

画面のピンチは、手のジェスチャと違って**開始時点からの相対倍率**で、
指を離してもその大きさを保つ（タッチスクリーンで期待される挙動）。
手のジェスチャのほうは「閉じた指＝等倍の原点」という絶対的な対応づけ。
つまむ判定・持ち上げ・落下は廃止した。オブジェクトはマーカー平面から
垂直に少し浮かせて表示する。

**大きさ**: 親指と人差し指の開き具合でモデルを 1.0〜2.5 倍に拡大する。
**閉じた指が原点**で、そこが等倍。開くと連続的に大きくなる。一度も指を
閉じるまでは何も起きず、手がフレームから消えると等倍に戻って待機状態に返る
（手が無ければ基準が無いため）。

**指の動きが速いときは反応しない。** マウスを持ち上げて置き直すのと同じで、
速い動きの間は大きさを保ち、動きが落ち着いた時点の指の間隔を新しい原点として
そのときの大きさから続ける。これにより、拡大した状態で指を素早く閉じても
大きさが保たれ、指を握り直せる。ゆっくり閉じれば従来どおり等倍まで戻る。閉じ／開きの判定は 2 閾値のヒステリシスで、
拡大の起点は「開いた」と判定する閾値に置く（0 から比例させると閾値を
跨いだ瞬間にサイズが飛ぶ）。

**手の可視化と接触**: 描くのは人差し指と親指（付け根〜先端）だけ。
**指が閉じている間は両方とも黄色**、開いていれば通常色で、人差し指は
モデルに触れていれば赤。
座標変換は 21 点のうち必要な数点だけを `#overlay` の 2D キャンバスに写す。
ランドマークは映像に対する正規化座標なので、MindAR が `video` に書き込む
インラインの `width/height/top/left` から表示矩形を読んで写す。
接触判定は画面座標での円と点の距離で行う（ランドマークの z は手の中心からの
相対値で、カメラからの距離ではないため、前後関係は判定できない）。
触れている間はオブジェクト側も強調する（リングと稜線の不透明度、発光、わずかな拡大）。

`/xr/?debug=1` で、手の検出・接触・なで量・オブジェクトの画面位置と半径を表示する。
iOS では開発者ツールが使えないので、実機調整はこれを見て行う。

同じく `?debug=1` のとき、右上にモデルの向き（マーカー法線まわり）を 15° 刻みで
回す操作が出る。値は localStorage に残るのでリロードしても維持される。
印刷した名刺と3Dモデルを並べて見られるのは実機だけなので、そこで合わせた角度を
`src/xr/catModel.js` の `HEADING` に書き込む。

名刺は「常時のマーカー」ではなく「座標を決めるアンカー」として使っている。
副次的に、掴んでいる間は CV パイプラインが1本になるので
ハンドトラッキングの計算予算が空く。

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
