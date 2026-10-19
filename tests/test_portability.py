import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import common
import focus

class PortabilityTests(unittest.TestCase):
    def test_codex_requires_explicit_opt_in(self):
        with patch.object(common,'configuration',return_value={}):self.assertFalse(common.codex_enabled())
        with patch.object(common,'configuration',return_value={'codex_enabled':'true'}):self.assertFalse(common.codex_enabled())
        with patch.object(common,'configuration',return_value={'codex_enabled':True}):self.assertTrue(common.codex_enabled())
    def test_missing_tool_is_not_a_fake_path(self):
        with patch.object(common.shutil,'which',return_value=None), patch.object(Path,'is_file',return_value=False):
            self.assertIsNone(common.executable('not-installed'))
    def test_corrupt_state_object_recovers(self):
        with tempfile.TemporaryDirectory() as directory:
            path=Path(directory)/'state.json'
            path.write_text('[]')
            self.assertEqual(focus.read(path)['mode'],'idle')
            path.write_text(json.dumps({'mode':'idle','minutes':9}))
            self.assertEqual(focus.mutate('start',path=path,now=100)['remaining'],1800)
    def test_executable_in_user_install(self):
        with tempfile.TemporaryDirectory() as directory:
            home=Path(directory)
            executable=home/'.npm-global/bin/codex'
            executable.parent.mkdir(parents=True)
            executable.write_text('#!/bin/sh\nexit 0\n')
            executable.chmod(0o755)
            with patch.object(common.shutil,'which',return_value=None),patch.object(common.Path,'home',return_value=home):
                self.assertEqual(common.executable('codex'),str(executable))
