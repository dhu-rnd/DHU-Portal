# デジキャン 履修登録フロー解析

出典HAR: `ref/デジキャン - 履修登録 full.har`
対象システム: DHU Portal / デジキャン (デジタルキャンパス)
バックエンド: JSF (Mojarra) + PrimeFaces

## 概要

- **ホスト**: `portal.dhw.ac.jp` (単一)
- **パス基点**: `/uprx/...`
- **エンドポイント形式**: 全部 `.xhtml`、`javax.faces.partial.ajax=true` の AJAX POST
- **HARエントリ総数**: 159件 / うち意味のあるやつ **17本** (残りは PrimeFaces/JSF の静的リソース)
- **キャプチャ範囲**: 既ログイン状態から → メニューで Kmd004 (履修登録) に遷移 → 授業選択 → 最終チェック → 提出 → Xuk002 (抽選希望順位登録) → 希望順位設定 → 確定、っていう申請 2/4〜3/4 の一連

## フロー順

| # | Method | Path | 役割 |
|---|--------|------|------|
| 1 | POST | `Bsa00101.xhtml` | メニュー選択 (`menuForm:mainMenu_menuid=5_0_0_1`) で履修画面へ遷移 |
| 2 | POST | `Pkx00501.xhtml` (transitionForm) | 画面遷移確定、履修登録画面をレンダリング (291KB) |
| 3 | POST | `Kmd00401.xhtml` × 多数 | 授業マス選択 (チェックボックス選択、ダイアログ close、各種セル操作) |
| 4 | POST | `Kmd00401.xhtml` (`funcForm:ToFinalCheck`) | 最終チェック遷移、エラー判定 |
| 5 | POST | `Kmd00401.xhtml` (`funcForm:submit`) | **履修申請の提出 (2/4完了)** |
| 6 | POST | `Kmd00401.xhtml` (transitionForm) | 次画面 (希望順位) へ遷移 |
| 7 | POST | `Xuk00201.xhtml` | 抽選希望画面ロード & 順位入力POST |
| 8 | POST | `Xuk00201.xhtml` (`funcForm:j_idt241`) | **希望順位の一括送信** |
| 9 | POST | `Xuk00201.xhtml` (transitionForm) | 確定/次画面遷移 |

## 主要リクエスト詳細

### メニュー遷移 — POST `/uprx/up/bs/bsa001/Bsa00101.xhtml`

- **Payload**:
  ```
  menuForm:mainMenu_menuid=5_0_0_1
  rx-token=<...>
  rx-loginKey=<...>
  rx-deviceKbn=1
  rx-loginType=Gakuen
  javax.faces.ViewState=<...>
  ```
- **Response**: `text/html` 75KB (履修登録画面へのリダイレクト用HTML)

### 授業選択 — POST `/uprx/up/km/kmd004/Kmd00401.xhtml`

- **主要フィールド**:
  ```
  javax.faces.source=kmd00403:ch:jugyoList
  javax.faces.behavior.event=rowSelectCheckbox
  kmd00403:ch:jugyoList_selection=2026|36520001
  ```
  - `jugyoList_selection` は **`年度|科目コード`** の形式
- **Response**: `text/xml` (PrimeFaces partial-response)

### 履修申請の提出 — POST `Kmd00401.xhtml` (`funcForm:submit`)

- 最重要ミューテーション
- **主要フィールド**: `javax.faces.source=funcForm:submit`, `funcForm:noSendCheckbox` も execute
- タブ状態 (`gakkiT02:0:dispArea_collapsed`, `tabArea_activeIndex=1` 等) を丸ごと送る
- **Response**: 「申請(2/4)」完了メッセージを含む

### 抽選希望順位登録 — POST `/uprx/up/xu/xuk002/Xuk00201.xhtml` (`funcForm:j_idt241`)

- **超重要**。授業ごとの希望順位を一括で入れる
- **フィールド命名規則**:
  ```
  funcForm:chusenKiboArea:jugyo{科目コード}{分野index}:{行index}:jugyo{科目コード}_input={順位}
  ```
  - 例: `jugyo3123A0:0:jugyo3123A_input=2` (授業3123Aの1コマ目に順位2を割当)
- 6分野以上を1リクエストにまとめて送るタイプ

## 認証/セッション周り

- **Cookie**: 明示的な `Cookie` ヘッダは HAR に記録されてない (ブラウザ管理の JSESSIONID 相当が裏で動いてる可能性あり)。全リクエストで `rx-*` 隠しフィールドが本命の認証情報
- **rx-token**: 32文字hex (例: `137E768C6593B798AFB7CD6A1D393B45`) — CSRF風トークン、フロー中固定
- **rx-loginKey**: base64っぽい44文字 (例: `AWmYlNvjYC/TRmPaPDs+5OHUzn1/Y7zvCE4Qvgf+2EPH`) — セッションキー
- **rx-deviceKbn**: `1` (PC)
- **rx-loginType**: `Gakuen` (学園ログイン)
- **javax.faces.ViewState**: 例 `-4475298563506384220:5005426611561538289`。画面遷移するたびに後半IDが変わる (Pkx005系 → Kmd004系で `3648249191149579811` → `5005426611561538289`)。**毎リクエスト前レスポンスからパースして持ち回す必要あり**

## 履修登録の肝

### 申請フェーズ (2/4) — 3段階

1. `Kmd00401.xhtml` に `jugyoList_selection=年度|科目コード` を渡してチェックON (rowSelectCheckboxイベント)
2. `funcForm:ToFinalCheck` でエラーチェック
3. `funcForm:submit` で提出確定 ← **真のミューテーション**

### 希望順位フェーズ (3/4)

- `Xuk00201.xhtml` に `funcForm:chusenKiboArea:jugyo{科目コード}{分野index}:{行index}:jugyo{科目コード}_input={順位}` を全授業分まとめてPOSTして `funcForm:j_idt241` で確定

ラッパー実装なら以下4本を叩けばOK:
1. 科目コードの選択
2. ToFinalCheck
3. submit
4. 希望順位マップの送信

ボタンの `j_idt*` 系IDは自動採番なので、初回レンダリング結果から動的にパースが必要。

## 注意点/気づき

- **`j_idt###` は自動生成ID**: ハードコードしたら死ぬ。毎回ページ取得してDOMから抽出するのが正義
- **ViewStateは画面ごとに変わる**: 特に transitionForm を経由するタイミングで更新される。レスポンスXMLの `<update id="j_id1:javax.faces.ViewState">` を都度パース必須
- **CSRF相当は `rx-token`**: ヘッダではなくフォームフィールドで送る。レスポンスXMLに `<update id="headerForm:j_id16">` として毎回返ってくるから、レスポンスから抜き直す方が安全
- リクエストによっては **`rx-token`/`rx-loginKey` が2回重複**して送られてる場面あり (entry 115, 134)。JSFのフォーム二重包含のバグと思われるが、そのままリプレイしても問題なさそう
- **Content-Type**: 全て `application/x-www-form-urlencoded`
- **レスポンス**: `text/xml` の `<partial-response>` 形式 (**JSONではなくXML**)
- **Referer**: 初期メニュー画面 (`Bsa00101.xhtml`) のまま画面遷移しても変わってない場面あり — 厳格チェックはしてなさそう
- **タブ/展開状態も全部フォームフィールドとして送る必要あり** (`tabArea_activeIndex`, `dispArea_collapsed`, `_active=0` 等)。省くと ViewState と噛み合わずエラーの可能性あるから、初期ロードから拾ったやつを保持しといたほうが無難
- 静的リソースは全部 `.xhtml` 拡張子付きで返される (`javax.faces.resource/xxx.css.xhtml`)。ラッパー側では触らんでOK
