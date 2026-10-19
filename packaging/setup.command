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
widget_dir="$(cd "$(dirname "$0")" && pwd)"
app_dir="$widget_dir/lib/FocusPerimeter.app/Contents"
mkdir -p "$app_dir/MacOS"
cp "$widget_dir/lib/native/Info.plist" "$app_dir/Info.plist"
xcrun swiftc -O -framework AppKit -framework QuartzCore -framework CoreText \
  "$widget_dir/lib/native/FocusPerimeter.swift" -o "$app_dir/MacOS/FocusPerimeter.next"
mv "$app_dir/MacOS/FocusPerimeter.next" "$app_dir/MacOS/FocusPerimeter"
printf 'Desktop perimeter built successfully.\nRefresh the widget in Übersicht, then start a focus session.\n'
