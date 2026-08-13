# 煩悩クリッカー (bonno-clicker)

Cookie Clicker の仏教パロディ版インクリメンタルゲーム。木魚（もくぎょ）を叩いて「煩悩」を稼ぎ、発生源（合掌・賽銭・お守り…須弥山）を購入して自動生産を伸ばし、節目で「転生」して永続強化を積み重ねていく。

## ファイル構成

保守運用のため、単一HTMLファイル構成（旧 `bonno-clicker_ver102.html`）から、ネイティブ ES Modules によるディレクトリ構成にリファクタリング済み（バンドラー等のビルドステップは導入していない。外部依存ライブラリ・外部アセットも引き続き一切なし）。バージョン管理はファイル名連番ではなく git のコミット履歴で行う。

```
index.html            骨格HTML（DOM構造・全id・inline SVGのみ。style/scriptは分離）
css/style.css          元<style>の中身をそのまま移動
js/
  main.js               エントリポイント。requestAnimationFrame の frame() ループと起動シーケンス（load()の呼び出し等）を統括
  data/                 静的データ配列（ゲームバランス定義）
    buildings.js          BUILDINGS, LOWIDS
    upgrades.js            UP
    perks.js                PERKS
    achievements.js         ACH
    content.js               RANKS, MOKTIERS, CHILL, NEWS, HEART
    sprite-data.js            PAL, GRID（ドット絵データ）
  core/                  状態・共通ロジック
    state.js               共有state オブジェクト（後述）, fresh(), KEY
    format.js               fmt/fmtRate/fmtTime, now()
    formulas.js              costOf/maxAff/computeUp/clickPower/baseMult/rebirthReq 等の判定関数群
    audio.js                 Web Audio（ac/pok/bong/chime/fanfare/critSfx/chant）
    sprites.js                makeSprite/makeSil/buildSprites
    save.js                   window.storage ラッパー（save/load/wipe/offlineWelcome）
  ui/                    DOM描画・イベント処理
    dom.js                  $ヘルパー, 要素キャッシュ, 建物/学び/特典/実績カードの初期構築, タブ/qty/soundイベント, ask()/toastEl()/shake()
    shop.js                  buyN/buyUpg, renderShop, updateAfford
    scenery.js                renderScenery, renderChill, applyMokTier/tierUp, ツールチップ
    rebirth.js                doRebirth, 極楽モーダル, buyPerk, リセット処理
    events.js                 御縁玉/フィーバー/連打/大法要
    click.js                  木魚クリック処理・コンボ・spawnSutra/popFloat
    stats.js                  setCount/updateRebirth/checkRankChange/実績check/renderStats/rotateNews
    rain.js                   canvasの雨演出
```

### state 共有の設計（重要）

元コードはIIFE内のモジュールスコープ変数（`s`/`up`/`combo`/`dirty` 等）をすべてのセクションから直接読み書きしていた。ES Modulesではimportした変数バインディングへの再代入ができない（プロパティのミューテーションのみ可能）ため、`js/core/state.js` の `state` という単一の共有オブジェクトに、元のモジュールスコープ変数をすべてプロパティとして集約している（`state.s`＝プレイヤー状態、`state.up`＝アップグレード集計値、`state.combo`/`state.dirty`/`state.curTier` 等）。他のモジュールはこれを `import { state } from ".../core/state.js"` して `state.s.bonno += x` のようにプロパティ経由で読み書きする。新しい状態を追加する場合もこの `state` オブジェクトに載せること（新たにモジュールスコープの `let` を増やさない）。

### 循環import時の注意

`ui/dom.js` は建物/学び/特典カードの初期構築時に `shop.js`/`rebirth.js`/`stats.js` の購入・描画関数を参照し、それらのモジュールも `dom.js` のDOM要素キャッシュを参照するため、意図的な循環importになっている箇所がある。安全に成立しているのは、`dom.js` の `$` ヘルパーや `toastEl`/`ask`/`shake` を **`function` 宣言**（ホイスティングされ、循環importの途中でも参照可能）にしているためと、他モジュール側の相互参照が**関数ボディ内（イベントハンドラ等）に限定**され、モジュールのトップレベルで即座には評価されないためである。新しいモジュールを追加する際、他モジュールからimportした値をトップレベルで即座に使う（例: `scenery.addEventListener(...)` をトップレベルに書く）と `Cannot access 'X' before initialization` で壊れる可能性があるため、そのような処理は関数化して呼び出し元（`main.js`の起動シーケンス等）から明示的に呼ぶこと。

## 画面レイアウト（3カラム、`.app` グリッド）

1. **左: 伽藍/因縁カラム**（`col-scene`）— タブ切り替えで「伽藍」（購入済み発生源のドット絵一覧）と「因縁」（統計・実績一覧）を表示。
2. **中央: 木魚カラム**（`col-mok`）— メインのクリック対象。SVGで描いた木魚（`#mokSvg`）を叩く。フィーバー中は鐘（`#bellSvg`）に切り替わる。ランク・所持数・秒間生産量・コンボ表示・転生ボタンもここ。
3. **右: 徳を積むカラム**（`col-shop`）— 発生源（建物）購入リストとアップグレード（「学び」）リスト。

背景装飾（`#bgfx`、`#motes`）や雨のように降るアイテム演出（`<canvas id="rain">`）は純粋な演出で、ゲームロジックには影響しない。

## ゲームシステム

### 資源
- **煩悩 (`s.bonno` / `s.total`)** — メイン通貨。`bonno` は所持数（購入で減る）、`total` は累計生産量（実績・木魚の見た目変化・ランク・転生条件の判定に使う）。
- **業 (`s.gou`)** — 実績解除で獲得。恒久倍率（`baseMult()`）に加算される。
- **功徳 (`s.kudoku`)** — 転生（後述）のたびに `+1`。恒久倍率に寄与し、転生特典（`PERKS`）の購入通貨にもなる。

### 発生源（`BUILDINGS`、12種）
`gassho`（合掌）→ `saisen`（賽銭）→ `omamori`（お守り）→ `juzu`（数珠）→ `nenbutsu`（念仏）→ `gaki`（餓鬼）→ `enma`（閻魔）→ `jigoku`（地獄）→ `mandara`（曼荼羅）→ `nehan`（涅槃）→ `rinne`（輪廻）→ `shumisen`（須弥山）の順で単価・生産量が指数的に上昇。価格は `costOf()` で等比級数（公比 `R=1.15`）。累計 `total` が一定額（`base*0.3`）に達すると「？？？？？」表示から開放される（`revealed()`）。
`LOWIDS`（合掌〜数珠）は「下位シナジー」の対象で、所持合計数が全体倍率を押し上げる特殊効果を持つ。

### クリック（木魚を叩く）
`zone` のクリックイベントで `clickPower()` 分の煩悩を獲得。連打間隔が一定範囲（190〜820ms）で安定していると「念仏コンボ」（`combo`）が伸び、クリック倍率が上がる。コンボ10以上で経文（`HEART` 配列からランダム表示）が飛ぶ演出。会心（クリティカル、`up.critChance`）判定もあり。

### アップグレード「学び」（`UP` 配列）
煩悩を消費して恒久的に購入する強化。効果タイプ（`eff.t`）は `click`/`global`/`bld`/`clickcps`/`feverdur`/`feverfreq`/`fevermul`/`gou`/`combo`/`combomax`/`crit`/`critmul`/`goldpow`/`offline`/`synergy`/`houyoup` など。`computeUp()` が毎フレーム再計算し `up` オブジェクトに集約される。

### 転生（`doRebirth()`）とこと極楽（`gokuraku` モーダル）
累計煩悩が `rebirthReq() = 1e6 * 4^rebirths` に達すると転生可能。転生すると `bonno`・所持発生源・学び（`upg`）がリセットされる代わりに功徳 `+1`。転生後に開く「極楽」モーダルで功徳を消費し `PERKS`（30種、恒久特典・重複取得不可）を選んで永続強化を積む。特典は取り消し可能（功徳を返却して未取得に戻せる、`buyPerk()`）。

### ランダムイベント「御縁玉」（`spawnGoen()`）
画面上にランダム出現する丸いオブジェクトをクリックすると4種の効果のいずれかが発動:
- `fever`（縁）— フィーバー開始。木魚が鐘に変わり一定時間生産倍率が跳ね上がる。
- `lucky`（福）— 即時大量の煩悩を獲得。
- `frenzy`（連打）— 一定時間クリック威力が激増。
- `houyou`（大法要）— 下位発生源の所持数に比例して倍率が上がる時間制イベント。

### 木魚の見た目変化（`MOKTIERS`）
累計煩悩 `total` の閾値で木魚のグラデーション・装飾（金装飾・炎・目・光輪）が段階的に変化する（素木→漆塗り→金装→百鬼→曼荼羅）。同時に周囲に佇む「まったり」キャラ（猫・狸・お坊さんなどのドット絵、`CHILL` 配列）の構成も切り替わる。

### 実績（`ACH`、約40種）・ランク（`RANKS`、9段階）
実績は条件関数 `c(s)` を毎フレーム間隔でチェックし、達成で「業」を付与。ランクは累計煩悩でしきい値昇格し、称号がヘッダーやニュースティッカーに反映される。

### ドット絵アセット
外部画像は使わず、`GRID` オブジェクト（12x12の文字グリッド、`PAL` パレットで色指定）から `<canvas>` に描画して `toDataURL()` した画像を使い回している（`makeSprite`/`makeSil`）。新しいキャラや発生源アイコンを追加する場合はこの記法に従う。

## セーブ / オフライン進行

- セーブは `localStorage` ではなく `window.storage`（`store`）という外部提供オブジェクトの `get`/`set` に依存している（`js/core/save.js`）。`window.storage` が存在しない環境（例: ローカルで直接ファイルを開いた場合）では `store` が `null` になり、**セーブ/ロードもオフライン進行報酬も一切動作しない**。動作確認する際はホスト環境が `window.storage.get(key, isJSON)` / `window.storage.set(key, value, isJSON)` 相当のAPIを注入しているか確認すること。
- セーブキーは `KEY = "bonno-clicker-save-v9"`。セーブデータ構造を変える破壊的変更をする場合はバージョン番号を上げて既存セーブとの非互換を明示する運用と推測される。
- オフライン進行は `offlineWelcome()` が担当。最終アクセス時刻との差分（最大4時間キャップ）から放置中の生産量を計算し、`up.offlineEff`（学びで強化可能）を掛けて帰還時に一括付与する。

## メインループ

`requestAnimationFrame` ベースの `frame()` 関数（`js/main.js`）が単一のゲームループ。フレームごとに: 秒間生産計算 → コンボ減衰 → フィーバー/御縁玉タイマー処理 → 木魚ティア/ランク判定 → 各種UI更新（0.15秒間隔）→ 実績チェック（0.3秒間隔）→ ショップ再描画（dirtyフラグ時）→ ニュースティッカー更新（6秒間隔）→ オートセーブ（5秒間隔）。UIは基本的に `dirty` フラグ + 間隔スロットリングで再描画コストを抑えている。

## 音声

外部音源ファイルは使わず、Web Audio API（`AudioContext` + `OscillatorNode`/`GainNode`）でクリック音・鐘の音・ファンファーレ・お経の合成音をその場で生成している（`ac()`/`pok()`/`bong()`/`chime()`/`fanfare()`/`critSfx()`/`chant()`）。ミュート状態は `s.muted` としてセーブデータに含まれる。

## 開発時の注意

- モジュール分割後もDOM ID 命名規則（`$("id")` ヘルパー経由でのアクセス、`js/ui/dom.js` の `$` 関数）に合わせること。新しいDOM要素を追加した場合、`index.html` に `id` を振り、参照する側は該当モジュールで `$("id")` する。
- 新しい発生源やアップグレードを追加する場合、`BUILDINGS`/`UP`/`PERKS`/`ACH`（いずれも `js/data/` 配下）はそれぞれ配列の並び順がそのままUI表示順になる。コストやしきい値は既存の指数カーブ（発生源は概ね20〜25倍刻み）に揃えると難易度バランスが崩れにくい。
- **ES Modules (`<script type="module">`) は `file://` で直接開くとCORSブロックされ起動しない。** 従来の「直接開くと `window.storage` 未定義でセーブだけ無効化される」から一歩進み、**ローカルサーバ経由での確認が必須**になった点に注意。ローカル確認は `php -S localhost:8000` を推奨（さくらのレンタルサーバでのPHP運用と揃えられるため）。PHPが手元にない場合は `python3 -m http.server 8000` でも代用できる。
- 新しいモジュールを追加する際、循環import下でのトップレベル即時評価に注意（上記「循環importの注意」参照）。他モジュールの値を使う副作用的な処理（`addEventListener` 登録など）は、モジュールのトップレベルに直書きせず関数化し、`main.js` の起動シーケンスから呼ぶのが安全。

## 今後の方向性（メモ）

陣営対戦要素（煩悩陣営 vs 仏教陣営）を見据え、さくらのレンタルサーバ/VPS + PHP/MySQL で「各プレイヤーの貢献値を定期的にサーバーへ送信・集計し、陣営スコアとして返す」薄いAPIを追加する方針で合意済み（2026-08-14時点）。今回のリファクタリングはその前段としてフロントエンドの保守性を上げる作業であり、バックエンド（`backend/` ディレクトリ等）はまだ着手していない。

## コミット運用

このアプリに対する更新作業（機能追加・修正・調整など）が一区切りついたら、都度ユーザーへの確認を挟まず `git commit` まで行うこと。ユーザーから明示的な承認取得を待たずに進めてよい（このCLAUDE.mdの記載自体を事前承認とする）。ただし `git push` は対象外で、従来どおり明示的な指示がない限り行わない。コミットメッセージは変更内容が分かるよう簡潔にまとめる。
