#!/usr/bin/env bash
# Starts the self-hosted Jev replacement (JEFF, GLiFormer) that the app talks to via JEV_BASE_URL.
# float16 + pad bucketing on Apple MPS: ~0.3s per routing call; verification (5 questions) ~12-25s.
set -euo pipefail
JEFF_DIR="${JEFF_DIR:-$HOME/Desktop/jeff}"
cd "$JEFF_DIR"
export JEFF_API_KEYS="${JEFF_API_KEYS:-devkey}" JEFF_DTYPE="${JEFF_DTYPE:-float16}" JEFF_PORT="${JEFF_PORT:-8000}"
# bucket sequence lengths + warm up so unseen payloads do not pay a per-shape MPS cost (14s -> 0.3s)
export JEFF_PAD_MULTIPLE="${JEFF_PAD_MULTIPLE:-128}" JEFF_WARMUP="${JEFF_WARMUP:-1}"
exec uv run jeff
