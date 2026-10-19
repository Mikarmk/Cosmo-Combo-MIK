#!/bin/bash
set -euo pipefail

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "Cosmo Combo requires macOS." >&2
  exit 1
fi
if ! xcrun --find swiftc >/dev/null 2>&1; then
  echo "Install Apple's Command Line Tools first: xcode-select --install" >&2
  exit 1
fi

repo_dir="$(cd "$(dirname "$0")/.." && pwd)"
build_dir="$repo_dir/.build/FocusPerimeter.app/Contents"
widget_dir="${COSMO_INSTALL_DIR:-$HOME/Library/Application Support/Übersicht/widgets/cosmo-combo}"
mkdir -p "$build_dir/MacOS"
cp "$repo_dir/native/Info.plist" "$build_dir/Info.plist"
xcrun swiftc -O -framework AppKit -framework QuartzCore -framework CoreText \
  "$repo_dir/native/FocusPerimeter.swift" -o "$build_dir/MacOS/FocusPerimeter"

# Update shipped files without overwriting an existing configuration or timer state.
mkdir -p "$widget_dir/lib"
cp "$repo_dir/widgets/cosmo-combo/widget.jsx" "$widget_dir/widget.jsx"
shopt -s nullglob
for source in "$repo_dir"/widgets/cosmo-combo/lib/*.py "$repo_dir"/widgets/cosmo-combo/lib/*.ttf "$repo_dir"/widgets/cosmo-combo/lib/*.svg "$repo_dir"/widgets/cosmo-combo/lib/*.txt; do
  cp "$source" "$widget_dir/lib/"
done
if [[ ! -f "$widget_dir/config.json" ]]; then
  cp "$repo_dir/widgets/cosmo-combo/config.json" "$widget_dir/config.json"
fi
native_dir="$widget_dir/lib/FocusPerimeter.app/Contents"
mkdir -p "$native_dir/MacOS"
cp "$build_dir/Info.plist" "$native_dir/Info.plist"
cp "$build_dir/MacOS/FocusPerimeter" "$native_dir/MacOS/FocusPerimeter.next"
mv "$native_dir/MacOS/FocusPerimeter.next" "$native_dir/MacOS/FocusPerimeter"
printf 'Installed Cosmo Combo at:\n%s\n\nOpen Übersicht, then choose Refresh All Widgets.\n' "$widget_dir"
