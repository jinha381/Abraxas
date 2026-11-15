#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
source scripts/env.sh
mkdir -p .local
{
  rustc --version
  solana --version
  "$ANCHOR_BIN" --version
  node --version
  yarn --version
  cargo build-sbf --version
  uname -sr
  node -e 'const fs=require("node:fs"); for (const p of ["@coral-xyz/anchor", "@metaplex-foundation/mpl-core", "@metaplex-foundation/umi"]) console.log(p + " " + JSON.parse(fs.readFileSync("node_modules/" + p + "/package.json", "utf8")).version)'
} > .local/environment.txt
(cd logic && cargo test --locked) 2>&1 | tee .local/logic-test.log
python3 scripts/rust-timings.py
"$ANCHOR_BIN" keys sync
"$ANCHOR_BIN" build -- --features local-testing --sbf-out-dir "$PWD/target/deploy" 2>&1 | tee .local/anchor-build.log
if grep -q 'Stack offset' .local/anchor-build.log; then
  echo "SBF stack limit exceeded" >&2
  exit 1
fi
yarn typecheck 2>&1 | tee .local/typecheck.log
"$ANCHOR_BIN" test --skip-build 2>&1 | tee .local/anchor-test.log
node scripts/cost-report.cjs
python3 scripts/report.py
