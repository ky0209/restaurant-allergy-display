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

  // 運用方法は次の2択です。
  // 1. Googleスプレッドシートを使う: googleSheet を設定
  // 2. ローカルCSVを使う: dataSource を設定
  //
  // Googleスプレッドシート運用の例:
  // - シートを「リンクを知っている全員が閲覧可」にする
  // - URLの /d/ と /edit の間にある文字列が sheetId
  // - gid はシートURL末尾の gid=... の数字です
  googleSheet: {
    enabled: false,
    sheetId: "",
    gid: "0"
  },

  // Googleスプレッドシートを使わない場合の予備データ
  dataSource: "./data/allergy.csv"
};
