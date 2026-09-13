# AGENTS.md

## Project

SkyTween は Bluesky 向けの独立した Windows デスクトップクライアントです。
OpenTween の高密度なタイムライン閲覧体験に影響を受けていますが、OpenTween の fork ではなく、OpenTween のソースコードや素材は使っていません。

SkyTween は Bluesky Social PBC、OpenTween、または関連プロジェクトの公式・公認クライアントではありません。

## 作業方針

- 小さく焦点の合った変更を優先する。
- 既存の構成、命名、UI密度、実装パターンに合わせる。
- OpenTween 風の「上段タイムライン表 + 下段詳細ペイン + タブ運用」の体験を保つ。
- カード型のモダンSNS風レイアウトへ置き換えない。
- 設定項目が増える場合は、上部ツールバーへ詰め込まず、設定画面へ自然に追加する。
- 投稿一覧の更新では、既存投稿を不用意に消さない。タブごとの保持件数上限に従ってマージする。
- 検索タブ、通知タブ、Home など、タブごとの状態や通知設定を尊重する。
- キーボード操作、未読管理、OpenTween 的な操作感を壊さない。

## ブランドと公開時の注意

- アプリ名に `Bluesky` や `Bsky` を含めない。
- Bluesky / OpenTween の公式ロゴ、アイコン、画像素材を使わない。
- README などでは「independent」「not affiliated」「inspired by OpenTween」を明確にする。
- 「OpenTween の移植」「公式派生」「Bluesky 公式クライアント」のように誤解される表現を避ける。

## セキュリティと秘密情報

- 認証情報、app password、access token、refresh token、個人 handle、秘密鍵をハードコードしない。
- `指示書.txt`、`.env`、`release/`、`dist/`、`node_modules/`、`src-tauri/target/` は Git に含めない。
- 現状のセッション保持は Tauri WebView の `localStorage` を使う。将来的には Windows Credential Manager など安全な保存先へ移す。
- GitHub Releases やスクリーンショット公開時は、通知内容、個人情報、ログイン状態が写っていないか確認する。

## 検証

- TypeScript/UI 変更後は `npm run build` を実行する。
- EXE/installer を更新する場合は `scripts\tauri-build.cmd` を実行する。
- ビルド後のローカル配布物は `release/` にコピーしてよいが、`release/` はコミットしない。
- push 前に `git diff --check` と `git status --short` を確認する。

## アーキテクチャ

- Bluesky API 呼び出しは `src/services/skyClient.ts` に集約する。
- UI から直接 Bluesky API を呼ばず、`src/services/timelineService.ts` 経由にする。
- タイムラインの純粋ロジックは `src/domain/timelineUtils.ts` に置く。
- タブ状態管理は `src/hooks/useTimelineTabs.ts` に置く。
- アプリ全体の orchestration は `src/ui/App.tsx` に残す。
- 設定保存は `src/services/appSettingsStorage.ts` を通す。
- セッション保存は `src/services/sessionStorage.ts` を通す。

## UX 優先事項

- 高密度で一覧性の高いタイムラインを優先する。
- 起動中に取得した投稿は、タブごとの保持件数上限まで残す。
- 未読投稿は太字表示し、選択した投稿は既読扱いにする。
- Home のフォロー中アカウントのリプライ表示は設定で切り替える。デフォルトは非表示。
- 自動更新は全タブを対象にする。ただし多重実行は避ける。
- 入力欄では上下キーを奪わない。タイムライン閲覧中は上下キーで投稿選択を移動する。

## 現在の重要な未実装機能

- リプライ投稿。
- 引用投稿。
- スレッド表示。
- ユーザー投稿一覧タブ。
- プロフィールからのフォロー/フォロー解除。
- リストタブ。
- カスタムフィードタブ。
- 画像ビューア改善。
- Windows Credential Manager などによる安全な credential/session 保存。

## コミットと公開

- 変更は意味のある単位でコミットする。
- 生成物や依存フォルダはコミットしない。
- GitHub に push する前に、秘密情報や不要なローカルファイルが含まれていないか確認する。
