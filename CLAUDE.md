# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

このリポジトリはWebアプリ学習用のプロジェクトです。

- アプリ本体: `typescript-learning-app/`
- 仮想組織（設計・PM・リサーチ等）: `.company/`

## セキュリティ原則（AI駆動開発共通）

「**分ける・残す・防ぐ**」の三原則を常に意識する。

### 機密情報
- `.env.local` / SSH鍵 / APIキーをコード・プロンプト・ログに含めない
- シークレットは環境変数で管理する（`.env.local.example` を参照）
- コミット前に `git status` で機密ファイルが含まれていないことを確認する

### 操作の安全性
- `rm -rf`・`git push --force`・`git reset --hard` などの破壊的操作はユーザーが明示した場合のみ実行する
- 本番環境（Supabase 本番 / Vercel 本番）への直接操作は確認を取ってから行う

### 追跡可能性
- 意思決定・変更は `.company/secretary/notes/` に記録する（AI駆動開発の「残す」）
- 設計変更を伴うコード修正は先にドキュメントを更新してから実装する

### アプリ固有のガードレール
- アプリ詳細: `typescript-learning-app/CLAUDE.md` を参照
- セキュリティ設計書: `.company/engineering/docs/security.md`
