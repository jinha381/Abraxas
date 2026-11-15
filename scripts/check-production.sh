#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
source scripts/env.sh
export CARGO_TARGET_DIR="$HOME/.cache/hatchmind-production-target"
mkdir -p .local/production/deploy
"$ANCHOR_BIN" build -- --sbf-out-dir "$PWD/.local/production/deploy" 2>&1 | tee .local/production-build.log
if grep -q 'Stack offset' .local/production-build.log; then exit 1; fi
echo '5b4dacdae4af476d3c9d8aa6712883f559ba0e13705f9b244d96d1fd0dd56ce5  vendor/mpl_core.so' | sha256sum -c -
node scripts/production-fixtures.cjs
accounts=()
while IFS=$'\t' read -r address file; do accounts+=(--account "$address" "$file"); done < .local/production-fixtures/accounts.tsv
ledger="$PWD/.local/production/ledger-$(date -u +%Y%m%dT%H%M%S)-$$"
solana-test-validator --ledger "$ledger" --rpc-port 18999 --bind-address 127.0.0.1 --faucet-port 19001 --gossip-port 19100 --dynamic-port-range 19101-19200 \
  --mint "$(solana-keygen pubkey .local/provider.json)" \
  --bpf-program CaAnbZJBkbZSGFgpi6W1oxxeuKeFFz9PvZJxGoTMxmRy .local/production/deploy/hatchmind.so \
  --bpf-program CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d vendor/mpl_core.so \
  "${accounts[@]}" > .local/production-validator.log 2>&1 &
validator_pid=$!
trap 'kill "$validator_pid" 2>/dev/null || true; wait "$validator_pid" 2>/dev/null || true' EXIT
rpc=http://127.0.0.1:18999
online=0
for attempt in {1..120}; do
  if ! kill -0 "$validator_pid" 2>/dev/null; then cat .local/production-validator.log; exit 1; fi
  if solana cluster-version --url "$rpc" >/dev/null 2>&1; then online=1; break; fi
  sleep 0.5
done
[ "$online" = 1 ] || { cat .local/production-validator.log; exit 1; }
export ANCHOR_PROVIDER_URL="$rpc" ANCHOR_WALLET="$PWD/.local/provider.json"
export HATCHMIND_RESULTS=.local/production-results.json NODE_OPTIONS=--no-experimental-strip-types
yarn mocha --require ts-node/register/transpile-only --extension ts -t 120000 validation/production.ts --reporter ./scripts/reporter.cjs 2>&1 | tee .local/production-test.log
sha256sum .local/production/deploy/hatchmind.so > .local/production-binary.sha256
