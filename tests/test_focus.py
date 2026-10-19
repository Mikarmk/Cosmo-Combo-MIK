import tempfile
import unittest
from pathlib import Path
from focus import read, snapshot, mutate

class FocusTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.path=Path(self.tmp.name)/'timer.json'
    def tearDown(self):self.tmp.cleanup()
    def test_all_presets_and_stop(self):
        for minutes in (15,30,45,60):
            mutate('select',minutes,self.path,now=100)
            state=mutate('start',path=self.path,now=100)
            self.assertEqual(state['remaining'],minutes*60)
            self.assertEqual(state['phase'],'focus')
            self.assertEqual(mutate('stop',path=self.path,now=120)['phase'],'idle')
    def test_sleep_reload_and_two_displays_share_end(self):
        mutate('start',15,self.path,now=100)
        one=read(self.path);two=read(self.path)
        self.assertEqual(snapshot(one,550)['remaining'],450)
        self.assertEqual(snapshot(one,550),snapshot(two,550))
        self.assertEqual(snapshot(read(self.path),1000)['phase'],'breakReady')
        self.assertEqual(snapshot(read(self.path),50000)['phase'],'breakReady')
    def test_break_can_stop_and_finish(self):
        mutate('start',30,self.path,now=100)
        self.assertEqual(mutate('break',path=self.path,now=200)['remaining'],300)
        self.assertEqual(snapshot(read(self.path),500)['phase'],'complete')
        self.assertEqual(mutate('stop',path=self.path,now=501)['phase'],'idle')
    def test_invalid_and_malformed_state(self):
        with self.assertRaises(ValueError):mutate('start',1,self.path)
        self.path.write_text('{bad')
        self.assertEqual(snapshot(read(self.path))['phase'],'idle')
        self.assertEqual(snapshot({'mode':'focus','duration':-5},100)['phase'],'idle')
    def test_cannot_change_duration_during_focus(self):
        mutate('start',30,self.path,now=100)
        mutate('select',60,self.path,now=101)
        self.assertEqual(snapshot(read(self.path),101)['remaining'],1799)
        self.assertEqual(read(self.path)['minutes'],30)

if __name__=='__main__':unittest.main()
