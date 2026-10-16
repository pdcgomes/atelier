// The LaunchAgent `atelier install` writes. Installing itself needs launchctl
// and your own login session, so it isn't run here.

import assert from 'node:assert/strict';
import { mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';

const root = realpathSync(mkdtempSync(join(tmpdir(), 'atelier-install-')));
process.env.ATELIER_HOME = join(root, 'home');
const { LABEL, launchAgent } = await import('../src/install.ts');
after(() => rmSync(root, { recursive: true, force: true }));

test('the LaunchAgent runs the daemon, keeps it running and logs where the daemon does', () => {
  const plist = launchAgent('/opt/homebrew/bin/node', ['/Users/me/src/atelier/packages/daemon/src/cli.ts', 'daemon'], { PATH: '/opt/homebrew/bin:/usr/bin', ATELIER_CLAUDE: '/usr/local/bin/claude' });
  assert.match(plist, new RegExp(`<key>Label</key><string>${LABEL.replace(/\./g, '\\.')}</string>`));
  assert.match(plist, /<array><string>\/opt\/homebrew\/bin\/node<\/string><string>\/Users\/me\/src\/atelier\/packages\/daemon\/src\/cli\.ts<\/string><string>daemon<\/string><\/array>/);
  assert.match(plist, /<key>PATH<\/key><string>\/opt\/homebrew\/bin:\/usr\/bin<\/string>/, 'your PATH, so it finds claude, node and your terminal');
  assert.match(plist, /<key>KeepAlive<\/key><true\/>/);
  assert.ok(plist.includes(`<string>${join(root, 'home', 'daemon.log')}</string>`));
});

test("a path that isn't plain XML can't change the LaunchAgent", () => {
  const plist = launchAgent('/Users/me/A & B/node', ['</string><string>--evil'], { PATH: '<x>' });
  assert.ok(plist.includes('/Users/me/A &amp; B/node'));
  assert.ok(plist.includes('&lt;/string&gt;&lt;string&gt;--evil'));
  assert.ok(!plist.includes('<string>--evil'));
  assert.ok(plist.includes('<string>&lt;x&gt;</string>'));
});
