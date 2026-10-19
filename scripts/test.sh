#!/bin/bash
set -euo pipefail
repo_dir="$(cd "$(dirname "$0")/.." && pwd)"
PYTHONPATH="$repo_dir/widgets/cosmo-combo/lib${PYTHONPATH:+:$PYTHONPATH}" \
  /usr/bin/python3 -m unittest discover -s "$repo_dir/tests" -v
/usr/bin/python3 -m compileall -q "$repo_dir/widgets/cosmo-combo/lib"
bash -n "$repo_dir/scripts/install.sh"
