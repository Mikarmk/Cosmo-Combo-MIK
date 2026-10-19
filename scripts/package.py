#!/usr/bin/env python3
"""Build the gallery archive from tracked source files, excluding local caches."""
from pathlib import Path
import subprocess
import zipfile

ROOT = Path(__file__).resolve().parent.parent
FOLDER = 'Cosmo-Combo-MIK.widget'
ARCHIVE = ROOT / (FOLDER + '.zip')
WIDGET = Path('widgets/cosmo-combo')

INSTRUCTIONS = '''COSMO COMBO MIK — GALLERY PACKAGE

1. Install and open Übersicht. For music controls, install media-control:
   brew install media-control
2. Move this entire Cosmo-Combo-MIK.widget folder into your Übersicht widgets folder.
3. Build the desktop perimeter locally. Open Terminal and run:
   bash "$HOME/Library/Application Support/Übersicht/widgets/Cosmo-Combo-MIK.widget/setup.command"
   This needs Apple's Command Line Tools (xcode-select --install).
4. In Übersicht, choose Refresh All Widgets and enable Show on All Screens if needed.

The clock, player UI and timer countdown can load before step 3, but the native
perimeter requires that build step. No prebuilt executable is bundled.
The timer offers 15/30/45/60 minutes and a separate five-minute break.
The contour stays at desktop level, underneath app windows.

Codex integration is off by default. To enable it, install/sign in to the Codex CLI
and set "codex_enabled": true in config.json. Task titles remain local.

Custom widgets folder: update ROOT in widget.jsx and adjust the command above.

Full documentation and source:
https://github.com/Mikarmk/Cosmo-Combo-MIK
'''

def build():
    tracked = subprocess.check_output(['git', 'ls-files', '--', str(WIDGET)], cwd=ROOT, text=True).splitlines()
    assert tracked, 'No tracked widget files found'
    with zipfile.ZipFile(ARCHIVE, 'w', zipfile.ZIP_DEFLATED) as archive:
        for name in sorted(tracked):
            source = ROOT / name
            relative = Path(name).relative_to(WIDGET)
            if relative.name == 'widget.jsx':
                data = source.read_text().replace('cosmo-combo', FOLDER).encode()
                archive.writestr(FOLDER + '/' + relative.as_posix(), data)
            else:
                archive.write(source, FOLDER + '/' + relative.as_posix())
        for name in ['FocusPerimeter.swift', 'Info.plist']:
            archive.write(ROOT/'native'/name, FOLDER+'/lib/native/'+name)
        archive.write(ROOT/'packaging/setup.command', FOLDER+'/setup.command')
        archive.write(ROOT/'LICENSE', FOLDER+'/LICENSE')
        archive.write(ROOT/'THIRD_PARTY.md', FOLDER+'/THIRD_PARTY.md')
        archive.writestr(FOLDER+'/README.txt', INSTRUCTIONS)
    print(ARCHIVE.name)

if __name__ == '__main__':
    build()
