# 飲食店向けアレルギー表示ページ

店頭 POP の QR コードから開ける、静的なアレルギー表示ページです。  
GitHub Pages にそのまま置けるように、`HTML / CSS / JavaScript / CSV` だけで動く構成にしています。

現在のおすすめ運用は、`Googleスプレッドシートを更新するだけ` の方法です。  
GitHub を毎回触らなくても、公開中のページ内容を更新できます。

## できること

- 商品一覧の表示
- 商品名、カテゴリ、備考、含まれるアレルゲン名での検索
- カテゴリ絞り込み
- アレルゲン絞り込み
- 最終更新日の表示
- CSV の不備があるときの警告表示

## ファイル構成

```text
/
├── index.html
├── config.js
├── style.css
├── script.js
├── data/
│   └── allergy.csv
├── images/
│   └── ...
├── sample/
│   └── allergy_sample.csv
└── README.md
```

## 公開方法

1. GitHub で新しいリポジトリを作成します。
2. このファイル一式をリポジトリにアップロードします。
3. GitHub の `Settings` を開きます。
4. 左メニューの `Pages` を開きます。
5. `Build and deployment` で `Source: Deploy from a branch` を選びます。
6. `Branch` を `main`、フォルダを `/root` にして `Save` します。
7. 数分後に表示される URL を開きます。
8. その URL を QR コード化して店頭 POP に貼ります。

公開 URL の例:

```text
https://<githubユーザー名>.github.io/<repository-name>/
```

## いちばん簡単な更新方法

1. Googleスプレッドシートを 1 つ作ります。
2. `sample/allergy_sample.csv` の内容をそのまま貼り付けます。
3. スプレッドシートの共有設定を `リンクを知っている全員が閲覧可` にします。
4. スプレッドシートの URL から `sheetId` と `gid` を確認します。
5. `config.js` の `googleSheet` を設定します。
6. 以後はスプレッドシートを編集するだけで、公開ページの内容を更新できます。

## config.js の設定例

```js
window.APP_CONFIG = {
  storeName: "テスト食堂",
  storeNameEn: "Test Shokudo",
  pageTitle: "テスト食堂 アレルギー表示",
  heroNote: "気になる点があれば、注文前にスタッフへご相談ください",
  noticeLines: [
    "このページは、お客様が商品選択時にアレルゲン情報を確認するためのものです。",
    "調理環境では、他の商品と共通の器具・設備を使用している場合があります。",
    "重度のアレルギーをお持ちのお客様は、必ずスタッフまでお申し出ください。"
  ],
  googleSheet: {
    enabled: true,
    sheetId: "1AbCdEfGhIjKlMnOpQrStUvWxYz1234567890",
    gid: "0"
  },
  dataSource: "./data/allergy.csv"
};
```

## sheetId と gid の見方

スプレッドシート URL の例:

```text
https://docs.google.com/spreadsheets/d/1AbCdEfGhIjKlMnOpQrStUvWxYz1234567890/edit#gid=0
```

- `sheetId`

```text
1AbCdEfGhIjKlMnOpQrStUvWxYz1234567890
```

- `gid`

```text
0
```

## 商品データの更新方法

Googleスプレッドシート運用にしたあとは、商品情報を更新したいときに GitHub を触る必要はありません。  
シートの内容を書き換えるだけで、公開ページの表示を更新できます。

最初にシートを作るときは、`sample/allergy_sample.csv` をコピーして使うと分かりやすいです。

店名や注意書きを変えたい場合だけ、`config.js` を編集してください。

## ローカルCSV運用に戻したい場合

Googleスプレッドシートを使わず、リポジトリ内の CSV を読みたい場合は `config.js` を次のようにします。

```js
googleSheet: {
  enabled: false,
  sheetId: "",
  gid: "0"
},
dataSource: "./data/allergy.csv"
```

## CSV の書き方

Googleスプレッドシートでは、日本語ヘッダーのまま使えます。  
このページ側で `商品名 / 卵 / 乳 / 小麦` のような日本語列名を読み取れるようにしています。

ファイル名:

```text
data/allergy.csv
```

文字コード:

```text
UTF-8
```

1 行目はヘッダー行です。  
おすすめの日本語ヘッダーは次のとおりです。

```csv
商品ID,カテゴリ,商品名,卵,乳,小麦,そば,落花生,えび,かに,くるみ,カシューナッツ,アーモンド,あわび,いか,いくら,オレンジ,牛肉,キウイフルーツ,ごま,さけ,さば,大豆,鶏肉,バナナ,豚肉,まつたけ,もも,やまいも,りんご,ゼラチン,マカダミアナッツ,ピスタチオ,画像,画像説明,備考,更新日
```

英語ヘッダーでも動きますが、運用しやすさの面では日本語ヘッダーがおすすめです。

## アレルゲン列で使える値

各アレルゲン列には、次のいずれかを入力してください。

```text
あり
なし
不明
```

表示上の意味:

- `あり` : 含む
- `なし` : 含まない想定
- `不明` : 要確認

空欄にすると、画面上では `要確認` として表示されます。  
安全のため、空欄を `なし` とは扱いません。

## 画像を表示したい場合

`image` 列に画像パスを入れると、商品カードの上に画像を表示できます。

例:

```text
./images/ramen-card.svg
```

`image_alt` 列には、読み上げ用の説明文を入れられます。  
画像が不要な商品は、`image` と `image_alt` を空欄にして大丈夫です。

画像ファイルは `images/` フォルダに置くと管理しやすいです。

## config.js で変えられること

- 店名
- 英語表記
- ページタイトル
- 上部メモ
- 注意書き
- Googleスプレッドシートの `sheetId` / `gid`
- ローカルCSVの読み込み先

## 更新時のポイント

- `商品ID` は商品ごとに重複しない値にしてください。
- `商品名` は空欄にしないでください。
- `更新日` は `YYYY-MM-DD` 形式がおすすめです。
- `note` には、お客様に見せてよい内容だけを書いてください。
- 原価、仕入先、社内メモ、レシピ詳細、個人情報は入れないでください。

## よくあるトラブル

### Googleスプレッドシートを更新したのに画面が変わらない

- スプレッドシートが `リンクを知っている全員が閲覧可` になっているか確認してください。
- `config.js` の `sheetId` と `gid` が正しいか確認してください。
- ブラウザを再読み込みしてください。
- Google 側の反映に少し時間がかかることがあります。

### 初回表示でエラーになる

- `googleSheet.enabled` が `true` のとき、`sheetId` が空欄だと読み込めません。
- スプレッドシート URL をそのまま `dataSource` に入れるのではなく、`googleSheet.sheetId` と `googleSheet.gid` を設定してください。

### GitHub にある CSV を更新しても変わらない

- `googleSheet.enabled` が `true` だと、ページは Googleスプレッドシートを優先して読み込みます。
- GitHub 内の `data/allergy.csv` を使いたい場合は、`googleSheet.enabled` を `false` にしてください。

### ページにエラーが出る

- `data/allergy.csv` という場所にファイルがあるか確認してください。
- ヘッダー名が変わっていないか確認してください。
- アレルゲン列の値が `あり / なし / 不明` になっているか確認してください。

### 商品が検索に出てこない

- 検索語、カテゴリ、アレルゲン絞り込みが同時にかかっていないか確認してください。
- `条件をリセット` ボタンを押して初期状態に戻してみてください。

## 補足

- このサイトは静的ページです。
- サーバー、データベース、ログイン機能は使っていません。
- Googleスプレッドシート運用でも、表示側は GitHub Pages の静的サイトのままです。
