#!/usr/bin/env bash
# Build upstream XRoar in a developer-controlled work tree.
# Does not download firmware, include games, vendor binaries, or change the RetroVerse production bundle.
set -euo pipefail

for tool in git autoconf automake emconfigure emmake; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    printf 'Missing %s. Install autotools and activate the Emscripten SDK first.\n' "$tool" >&2
    exit 1
  fi
done

UPSTREAM="https://www.6809.org.uk/git/xroar.git"
SOURCE_DIR="${XROAR_SOURCE_DIR:-$(pwd)/.build/xroar}"
XROAR_REF="${XROAR_REF:-master}"
BUILD_JOBS="${BUILD_JOBS:-2}"
case "$BUILD_JOBS" in
  ''|*[!0-9]*) echo "BUILD_JOBS must be a positive integer" >&2; exit 1 ;;
esac
if [ "$BUILD_JOBS" -lt 1 ] || [ "$BUILD_JOBS" -gt 32 ]; then
  echo "BUILD_JOBS must be between 1 and 32" >&2
  exit 1
fi

if [ ! -d "$SOURCE_DIR/.git" ]; then
  if [ -e "$SOURCE_DIR" ]; then echo "Directory exists without Git checkout: $SOURCE_DIR" >&2; exit 1; fi
  mkdir -p "$(dirname "$SOURCE_DIR")"
  git clone --depth 1 --branch "$XROAR_REF" "$UPSTREAM" "$SOURCE_DIR"
fi

cd "$SOURCE_DIR"
echo "XRoar source: $SOURCE_DIR"
echo "XRoar commit: $(git rev-parse HEAD)"
echo "Ref: $(git branch --show-current)"
echo "Using the existing checkout as-is; updates must be performed explicitly."
if [ ! -x ./autogen.sh ]; then echo "XRoar autogen.sh not found" >&2; exit 1; fi

./autogen.sh
emconfigure ./configure --enable-wasm CFLAGS="-O3 -flto" LDFLAGS="-O3 -flto"
emmake make -j "$BUILD_JOBS"

echo "Built XRoar WebAssembly source tree; assets have NOT been published to RetroVerse."
echo "Upstream wasm/ includes the browser interface. Pair it with outputs from this exact build."
echo "Do not publish commercial firmware ROMs or copyrighted games."
echo "If distributing an XRoar binary, comply with GPLv3 source and license obligations."
echo "Candidate build files:"
find . -maxdepth 4 -type f \( -name '*.wasm' -o -name 'xroar-wasm*.js' -o -name 'xroar-wasm*.html' \) -print | head -60
