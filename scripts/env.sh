#!/usr/bin/env bash
# Source this from WSL; do not modify the user's global tool selection.
export PATH="$HOME/.cargo/bin:$HOME/.local/share/solana/install/releases/3.1.10/solana-release/bin:$PATH"
source "$HOME/.nvm/nvm.sh"
# Direct binary avoids newer AVM's automatic Solana-version switching.
export ANCHOR_BIN="$HOME/.avm/bin/anchor-0.30.1"

# Keep high-volume compiler IO on the Linux filesystem.
export CARGO_TARGET_DIR="$HOME/.cache/hatchmind-target"
