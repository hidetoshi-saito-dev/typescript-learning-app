#!/bin/sh
# OGP カード画像（1200x630）を og.html から再生成する。
# 日本語フォントはシステムの Hiragino を使うため macOS + Chrome 前提。
# 文言・デザイン変更時は og.html を編集してから実行する。
set -eu
cd "$(dirname "$0")"
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
  --window-size=1200,630 \
  --screenshot=../../src/app/opengraph-image.png \
  "file://$(pwd)/og.html"
echo "generated: src/app/opengraph-image.png"
