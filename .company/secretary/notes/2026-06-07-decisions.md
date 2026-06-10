# 意思決定ログ 2026-06-07

## セキュリティ修正 PR #1 マージ＆本番反映（11:xx頃）

### 決定
`fix/security-hardening`（PR #1）を master にマージし、本番（ts-tonari.app）へデプロイ。

- マージコミット: `11a8a22`
- 実装コミット: `385c2a3`
- Vercel 本番デプロイ: Ready（2 checks passed）

### 対応した指摘（前回 /security-review より、コードで完結する3件）
- **① オープンリダイレクト**: `safeRedirectPath()` 新設。login/page・auth/callback の両経路に適用。`/^\/(?![/\\])/` で絶対URL・プロトコル相対(`//`)・バックスラッシュ(`/\`)を弾く。→ 完了・本番反映確認済み
- **③ セキュリティヘッダ**: `next.config.ts` で全パスに付与。X-Frame-Options=DENY / nosniff / Referrer-Policy / Permissions-Policy は即適用。CSP は Report-Only で先行導入。→ 完了・本番で全ヘッダ出力を実機確認済み
- **⑤ 判定ワーカー多重生成**: `inFlightRef` 同期ガード + `finally` で確実解除。二重クリック窓を封鎖。→ 完了・本番反映

### 本番ヘッダ実機確認（curl -I https://ts-tonari.app/）
全ヘッダ出力を確認。HSTS は Vercel が付与（max-age=63072000）。

## ④ 本番 RLS 確認 完了（クローズ）

Supabase ダッシュボード SQL Editor（読み取り専用 SELECT）で本番DBを点検。
マイグレーション正本（20260527000000_init.sql）と完全一致を確認。

- **RLS有効**: profiles=true / lesson_progress=true ✅
- **ポリシー6本一致**: profiles(SELECT/UPDATE using auth.uid()=id)、lesson_progress(SELECT/UPDATE/DELETE using auth.uid()=user_id、INSERT with check auth.uid()=user_id) ✅
  - 最重要: INSERT は using=NULL / with_check=auth.uid()=user_id。「他人のuser_id詐称INSERT」穴は塞がっている。
  - profiles に INSERT/DELETE ポリシー無し = トリガー経由のみ（正本通り）。
- **トリガー**: handle_new_user は security_definer=true / search_path=public 固定 ✅

→ **本番RLSは安全。指摘④クローズ。**

## ③+ CSP 強制適用 完了（PR #2 マージ・クローズ）

Report-Only を本番で実機検証 → 違反2件を解消し強制適用へ移行する PR を作成。

### 実機検証で観測された違反（重要な学び）
静的レビューでは「全依存をカバーしているはず」と判断したが、本番 Report-Only で実機確認したら2件の見落としが判明:
1. **inline script 多数ブロック**: Next.js のハイドレーション用 inline <script> を script-src が拒否（'unsafe-inline'/nonce/hash いずれも無し）。→ 強制適用していたら React がハイドレートできずアプリが死んでいた。
2. **Monaco CSS ブロック**: editor.main.css を jsdelivr から読込むが style-src に jsdelivr 未許可。

→ 学び: CSP は静的レビューだけで強制適用してはいけない。Report-Only での実機観測が必須。

### 対応（案A: unsafe-inline を採用）
- script-src に 'unsafe-inline' 追加 / style-src に jsdelivr 追加 / Report-Only → 強制。
- 設計判断: 'unsafe-eval'(Monaco必須) が既にある以上 'unsafe-inline' の追加で防御は実質減らない。frame-ancestors/base-uri/form-action/connect-src の制限は有効に保つ。
- 案B(nonce middleware・全ページ動的化)は ② Monaco セルフホストと合わせ将来検討。

### マージ・本番反映・実機検証（完了）
- PR #2 マージ（マージコミット b64c3d1）。Vercel 本番デプロイ Ready。
- 本番 curl: `content-security-policy`（強制）ヘッダ出力を確認、`-report-only` は消滅。
- 実機: ログイン状態でレッスン005（ログイン必須画面）を操作 → コンソールに実遮断エラー(`Refused to...`)なし。Monaco・判定worker・画面遷移すべて正常。
- → CSP 強制適用が機能を阻害しないことを確認。③+ クローズ。
- ロールバック手段: 万一に備え PR #2 Revert で Report-Only(PR #1) に戻せる。

### 残課題（別途タスク）
- **③+ CSP 強制適用**: 現状 CSP に report-uri/report-to が無く、Report-Only でも違反が自動集約されない。学習規模では「本番レッスンページをブラウザで開きコンソール目視 → 違反ゼロなら Content-Security-Policy へ昇格」の簡易フローで進める方針。
- **② Monaco セルフホスト**: 現状 cdn.jsdelivr.net 依存（CSP で許可中）。セルフホスト化できれば jsdelivr を CSP から削除可能。実機確認要。
