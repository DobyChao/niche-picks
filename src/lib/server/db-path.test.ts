import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { PRODUCTION_DB_PATH, isProductionServer, resolveDbPath } from './db-path';

test('dev and build stay on the project data directory', () => {
  const cwd = '/tmp/xiaozhong-project';
  assert.equal(
    resolveDbPath(['node', 'next', 'dev'], {}, cwd),
    path.join(cwd, 'data', 'xiaozhong.db'),
  );
  assert.equal(
    resolveDbPath(['node', 'next', 'build'], { XIAOZHONG_DB_PATH: '/var/live/xiaozhong.db' }, cwd),
    path.join(cwd, 'data', 'xiaozhong.db'),
  );
  assert.equal(isProductionServer(['node', 'next', 'build']), false);
});

test('next start uses the external database path', () => {
  assert.equal(resolveDbPath(['node', 'next', 'start'], {}, '/tmp/app'), PRODUCTION_DB_PATH);
  assert.equal(
    resolveDbPath(['node', 'next', 'start', '-p', '8088'], { XIAOZHONG_DB_PATH: '  /srv/xiaozhong.db  ' }, '/tmp/app'),
    '/srv/xiaozhong.db',
  );
  assert.equal(isProductionServer(['node', 'next', 'start']), true);
});
