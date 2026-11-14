#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
source scripts/env.sh
mkdir -p .local vendor
rustc --version
solana --version
"$ANCHOR_BIN" --version
node --version
yarn --version
if [ ! -f .local/provider.json ]; then
  solana-keygen new --no-bip39-passphrase --silent --outfile .local/provider.json >/dev/null
  chmod 600 .local/provider.json
fi
yarn install --non-interactive
if [ ! -f vendor/mpl_core.so ]; then
  curl --proto '=https' --tlsv1.2 -sSfL 'https://github.com/metaplex-foundation/mpl-core/releases/download/release/core%400.15.3/mpl_core_program.so' -o vendor/mpl_core.so
fi
echo '5b4dacdae4af476d3c9d8aa6712883f559ba0e13705f9b244d96d1fd0dd56ce5  vendor/mpl_core.so' | sha256sum -c -
