#!/usr/bin/env bash
set -euo pipefail

# OpenCode models setup script
# - Reads OPEN_CODE_MODELS_DIR (default: ./opencode-models)
# - Reads OPEN_CODE_MODELS_URLS (comma-separated URLs) and downloads them

DIR="${OPEN_CODE_MODELS_DIR:-${RUNNER_WORKSPACE:-.}/opencode-models}"
mkdir -p "${DIR}"

URLS_CSV="${OPEN_CODE_MODELS_URLS:-}"
IFS=',' read -r -a URLs <<< "$URLS_CSV"

if [ ${#URLs[@]} -eq 0 ]; then
  echo "No OPEN_CODE_MODELS_URLS defined; skipping model fetch."
  exit 0
fi

TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

idx=0
for url in "${URLs[@]}"; do
  if [ -z "$url" ]; then
    continue
  fi
  idx=$((idx + 1))
  fname="$(basename "$url")"
  dest="${DIR}/$fname"
  echo "Downloading OpenCode model artifact from $url -> $dest"
  mkdir -p "${DIR}"
  if command -v curl >/dev/null 2>&1; then
    curl -L -sS -o "$dest" "$url"
  else
    echo "curl not available; cannot download models" >&2
    exit 1
  fi

  # Extract depending on archive type
  if [[ "$dest" == *.tar.gz || "$dest" == *.tgz ]]; then
    tar -xzf "$dest" -C "$DIR"
  elif [[ "$dest" == *.zip ]]; then
    if command -v unzip >/dev/null 2>&1; then
      unzip -q "$dest" -d "$DIR"
    else
      echo "unzip not installed; cannot extract $dest" >&2
      exit 1
    fi
  else
    echo "Unknown archive type for $dest; leaving file as-is"
  fi
done

echo "OpenCode models prepared in '${DIR}'"

