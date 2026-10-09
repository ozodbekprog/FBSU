#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

MODE="${1:-preview}"

case "$MODE" in
  preview)
    echo "▶ Preview deploy yuklanmoqda (prod'ga tegmaydi, sayt o'zgarmaydi)..."
    vercel deploy --yes
    echo "✅ Preview tayyor. Tekshirib ko'ring — yoqsa: bash scripts/deploy.sh prod"
    ;;
  prod|production)
    echo "▶ Production deploy yuklanmoqda (kesh bilan, ~1 daqiqa)..."
    vercel deploy --prod --yes
    echo "✅ fbsu.vercel.app yangilandi."
    ;;
  promote)
    TARGET="${2:-}"
    if [ -z "$TARGET" ]; then
      echo "Ishlatish: bash scripts/deploy.sh promote <deploy-url>"
      exit 1
    fi
    echo "▶ Promot qilinmoqda: $TARGET"
    vercel promote "$TARGET" --yes
    echo "✅ Promot tugadi."
    ;;
  *)
    echo "Ishlatish: bash scripts/deploy.sh [preview|prod|promote <deploy-url>]"
    exit 1
    ;;
esac
