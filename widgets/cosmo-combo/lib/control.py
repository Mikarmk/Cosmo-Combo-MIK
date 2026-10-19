#!/usr/bin/env python3
"""A fixed-command wrapper; no shell interpolation for player actions."""
import argparse
import math
import subprocess
from common import executable

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('action', choices=['toggle-play-pause', 'previous-track', 'next-track', 'seek'])
    parser.add_argument('position', nargs='?', type=float)
    args = parser.parse_args()
    binary = executable('media-control')
    if not binary:
        parser.exit(1, 'Install media-control to enable playback controls.\n')
    command = [binary, args.action]
    if args.action == 'seek':
        if args.position is None or not math.isfinite(args.position) or args.position < 0:
            parser.error('seek requires a finite, non-negative position')
        command.append(str(args.position))
    try:
        result = subprocess.run(command, timeout=5, check=False, capture_output=True)
        raise SystemExit(result.returncode)
    except (OSError, subprocess.TimeoutExpired):
        parser.exit(1, 'Player action unavailable.\n')
