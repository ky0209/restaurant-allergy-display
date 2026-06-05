# 飲食店向けアレルギー表示ページ

店頭 POP の QR コードから開ける、静的なアレルギー表示ページです。  
GitHub Pages にそのまま置けるように、`HTML / CSS / JavaScript / CSV` だけで動く構成にしています。

## できること

- 商品一覧の表示
- 商品名、カテゴリ、備考、含まれるアレルゲン名での検索
- カテゴリ絞り込み
- アレルゲン絞り込み
- 並び替え
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

## 商品データの更新方法

商品情報を更新したい場合は、`data/allergy.csv` を編集してください。  
更新後に GitHub に反映すれば、公開ページの表示も更新されます。

店で新しく CSV を作るときは、`sample/allergy_sample.csv` をコピーして使うと分かりやすいです。

店名、説明文、注意書きを変えたい場合は、`config.js` を編集してください。

## CSV の書き方

ファイル名:

```text
data/allergy.csv
```

文字コード:

```text
UTF-8
```

1 行目はヘッダー行です。  
基本のカラムは次のとおりです。

```csv
id,category,name,egg,milk,wheat,buckwheat,peanut,shrimp,crab,walnut,cashew,almond,abalone,squid,salmon_roe,orange,beef,kiwi,sesame,salmon,mackerel,soybean,chicken,banana,pork,matsutake,peach,yam,apple,gelatin,macadamia,pistachio,image,image_alt,note,updated_at
```

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
- 説明文
- 上部メモ
- 注意書き
- CSV の読み込み先

## 更新時のポイント

- `id` は商品ごとに重複しない値にしてください。
- `name` は空欄にしないでください。
- `updated_at` は `YYYY-MM-DD` 形式がおすすめです。
- `note` には、お客様に見せてよい内容だけを書いてください。
- 原価、仕入先、社内メモ、レシピ詳細、個人情報は入れないでください。

## よくあるトラブル

### CSV を更新したのに画面が変わらない

- GitHub にアップロードできているか確認してください。
- GitHub Pages の反映に少し時間がかかることがあります。
- ブラウザを再読み込みしてください。

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
- 相対パスで読み込む作りなので、GitHub Pages のリポジトリ配下でもそのまま動きます。
