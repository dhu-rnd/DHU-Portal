# デジキャン ログインフロー解析

出典HAR: `ref/デジキャン - ログイン.har`
対象システム: DHU Portal / デジキャン (デジタルキャンパス)
バックエンド: JSF (Mojarra) + PrimeFaces

## 概要

- **ホスト**: `portal.dhw.ac.jp`
- **パス基点**: `/uprx/...`
- **HARエントリ総数**: 89件 / うち主要通信は **3件**
- **要約**: ログインページに資格情報POSTしたら、レスポンスbodyにポータルホーム (`Bsa00101`) がそのまま返ってくるワンショット方式。**リダイレクト0回、Set-Cookie 0件**。セッション状態は全部hidden fieldでHTMLに埋め込まれて返却される

## フロー順

| # | Method | Path | 役割 |
|---|--------|------|------|
| 0 | (GET) | `Pky00101.xhtml` | (HAR未収録) ログインフォーム取得 / ViewState=`stateless` |
| 1 | POST | `Pky00101.xhtml` | 学籍番号・パスワード送信 → 200 text/html でポータルホーム全体 |
| 2 | POST | `Bsa00101.xhtml` (PrimeFaces ajax) | headerForm `asyncResultNoticeArea` 更新(通知エリア初期化) |
| 3 | POST | `Bsa00101.xhtml` (ajax) | funcForm 側のスケジュール/授業メモを月表示で描画 |

## 主要リクエスト詳細

### [1] POST `/uprx/up/pk/pky001/Pky00101.xhtml` — ログイン送信

- **Content-Type**: `application/x-www-form-urlencoded`
- **Cookieヘッダ**: なし
- **Referer**: 自身
- **Body**:
  ```
  loginForm=loginForm
  loginForm:userId=<学籍番号>          (例: A25DC017)
  loginForm:password=<パスワード>       (percent-encode必須)
  loginForm:loginButton=              (空値)
  javax.faces.ViewState=stateless
  ```
- **Response**: 200 `text/html`, **Set-Cookieなし**、`Bsa00101` ポータルHTML本体を丸ごと返却。中に発行済みの `rx-token`, `rx-loginKey`, 実IDの `ViewState` が hidden input として埋まる

### [2][3] POST `/uprx/up/bs/bsa001/Bsa00101.xhtml` (PrimeFaces partial ajax)

- **ヘッダ**: `Faces-Request: partial/ajax`, `Content-Type: application/x-www-form-urlencoded; charset=UTF-8`
- **共通フィールド**: `rx-token`, `rx-loginKey`, `rx-deviceKbn=1`, `rx-loginType=Gakuen`, `javax.faces.ViewState`
- **Response**: `text/xml` (PrimeFaces `<partial-response>`)

## 認証トークン発行タイミング

- **JSESSIONID等のCookieは一切発行されん** (HAR全89件で `Set-Cookie` ゼロ、`Cookie` ヘッダもゼロ)
- 以下の hidden field はすべて **ログインPOSTのレスポンスHTML内**に初出:
  - `rx-token` (例: `D1F9D73E...`)
  - `rx-loginKey` (例: `ARk1MRqkS6jC...`)
  - `rx-deviceKbn=1`
  - `rx-loginType=Gakuen`
- **セッション確立 = POST `Pky00101.xhtml` の200レスポンス**
- `javax.faces.ViewState` は初回GETでは `stateless`、ログイン成功後のレスポンスから実IDペア (`長い数値:長い数値`) に切り替わる

## ラッパー実装の指針

1. **GET** `https://portal.dhw.ac.jp/uprx/up/pk/pky001/Pky00101.xhtml`
   - HTMLパースして hidden `javax.faces.ViewState` を確認 (`stateless` のはず)
2. **POST** 同URL に `application/x-www-form-urlencoded` で送信:
   ```
   loginForm=loginForm
   loginForm:userId=<学籍番号>
   loginForm:password=<パスワード>
   loginForm:loginButton=
   javax.faces.ViewState=stateless
   ```
   - ヘッダ: `Referer` を同URL、`Origin: https://portal.dhw.ac.jp` を付与
3. レスポンスHTMLから以下を抽出し、以降のリクエストに毎回添付:
   - `name="rx-token"` の value
   - `name="rx-loginKey"` の value
   - `name="rx-deviceKbn"` の value (=`1`)
   - `name="rx-loginType"` の value (=`Gakuen`)
   - `name="javax.faces.ViewState"` の value
4. 以降の画面遷移は `POST Bsa00101.xhtml` 等に `javax.faces.partial.ajax=true` + `Faces-Request: partial/ajax` ヘッダ + 上記5トークンで叩けばOK
5. **Cookie jar実装は不要** (完全にhidden field駆動)

## 注意点

- **Cookieセッション無し**: HTTPクライアントのcookie-jarに頼らず、ラッパー側で hidden field 値を状態として持ち回す必要あり
- **ViewStateは遷移ごとに更新される可能性大**: partial-response の `<update id="j_id1:javax.faces.ViewState:0">` を毎回パースして最新値で上書き
- **CSRFトークン別立ては無し**: `rx-token` がそれ相当。ただしOriginチェックしてる可能性あるからヘッダは付ける
- **リダイレクト無し**: ログイン失敗時も同じ `Pky00101.xhtml` にエラーmessageを描画して200で返す可能性が高い。**ステータスコードではなく、レスポンスHTMLに `Bsa00101` (ホーム) の要素が含まれるかで成否判定**するのが確実
- **パスワード特殊文字**: 本HARには `%` (`%25`エンコード済) や `*` が含まれていた。`application/x-www-form-urlencoded` で必ず percent-encode すること
- **HARに初回GETが記録されてない**: ブラウザキャッシュ的理由と思われるが、実装では必ずGETしてViewState=stateless確認しとくと安全
