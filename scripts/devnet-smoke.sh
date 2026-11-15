#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
# 사용자의 실행 승인 후에만 이 값을 명시합니다. 기본 실행은 네트워크 접근 전에 중단합니다.
[ "${HATCHMIND_DEVNET_APPROVED:-}" = "yes" ] || { echo '사용자 실행 승인 필요: HATCHMIND_DEVNET_APPROVED=yes'; exit 2; }
source scripts/env.sh
: "${DEVNET_WALLET:?미리 잔액을 준비한 배포 지갑 경로 필요}"
: "${DEVNET_PROGRAM_KEYPAIR:?기존 프로그램 ID와 일치하는 배포 키페어 경로 필요}"
rpc=https://api.devnet.solana.com
program=CaAnbZJBkbZSGFgpi6W1oxxeuKeFFz9PvZJxGoTMxmRy
core=CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d
[ "$(solana-keygen pubkey "$DEVNET_PROGRAM_KEYPAIR")" = "$program" ] || { echo '프로그램 ID 불일치'; exit 1; }
mkdir -p .local/devnet/deploy
if solana account "$program" --url "$rpc" >/dev/null 2>&1; then echo '기존 devnet 프로그램을 덮어쓰지 않습니다. 별도 판단이 필요합니다.'; exit 1; fi
solana program dump "$core" .local/devnet/core.so --url "$rpc"
echo '5b4dacdae4af476d3c9d8aa6712883f559ba0e13705f9b244d96d1fd0dd56ce5  .local/devnet/core.so' | sha256sum -c -
# 짧은 smoke 흐름을 위한 3초 테스트 설정입니다. 운영 빌드는 check-production.sh로 별도 검증합니다.
export CARGO_TARGET_DIR="$HOME/.cache/hatchmind-devnet-smoke-target"
"$ANCHOR_BIN" build -- --features local-testing --sbf-out-dir "$PWD/.local/devnet/deploy" 2>&1 | tee .local/devnet/build.log
solana program deploy .local/devnet/deploy/hatchmind.so --program-id "$DEVNET_PROGRAM_KEYPAIR" --keypair "$DEVNET_WALLET" --url "$rpc" --output json | tee .local/devnet/deploy.json
export ANCHOR_PROVIDER_URL="$rpc" ANCHOR_WALLET="$DEVNET_WALLET" NODE_OPTIONS=--no-experimental-strip-types
node -r ts-node/register/transpile-only validation/devnet-smoke.ts
