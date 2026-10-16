import fs from 'fs';
import Database from 'better-sqlite3';

const [cmd, src, dest] = process.argv.slice(2);

if (cmd === 'backup') {
  if (!src || !dest) {
    console.error('usage: db-maint.mjs backup <src> <dest>');
    process.exit(2);
  }
  const db = new Database(src, { fileMustExist: true });
  try {
    await db.backup(dest);
  } finally {
    db.close();
  }
  const copy = new Database(dest, { fileMustExist: true });
  try {
    const integrity = copy.pragma('integrity_check', { simple: true });
    if (integrity !== 'ok') {
      console.error(integrity);
      process.exit(1);
    }
    copy.pragma('wal_checkpoint(TRUNCATE)');
  } finally {
    copy.close();
  }
  fs.rmSync(`${dest}-wal`, { force: true });
  fs.rmSync(`${dest}-shm`, { force: true });
} else if (cmd === 'count') {
  if (!src) {
    console.error('usage: db-maint.mjs count <src>');
    process.exit(2);
  }
  const db = new Database(src, { readonly: true, fileMustExist: true });
  try {
    console.log(db.prepare('SELECT count(*) FROM shops').pluck().get());
  } finally {
    db.close();
  }
} else {
  console.error('usage: db-maint.mjs backup|count ...');
  process.exit(2);
}
