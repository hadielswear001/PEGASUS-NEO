#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

pnpm install
pnpm build
pnpm electron-builder --mac --dir --universal

echo "Built PEGASUS NEO app at: $(pwd)/release/mac-universal/PEGASUS NEO.app"
