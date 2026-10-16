import os from 'os';
import path from 'path';

/** Live SQLite file for `next start`. Kept outside the rsync deploy tree. */
export const PRODUCTION_DB_PATH = path.join(os.homedir(), 'xiaozhong-data', 'xiaozhong.db');

function configuredDbPath(env: NodeJS.ProcessEnv): string | undefined {
  const value = env['XIAOZHONG_DB_PATH'];
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? path.resolve(trimmed) : undefined;
}

/**
 * `next start` uses the production file. Dev, build, and tests stay on
 * `<cwd>/data/xiaozhong.db` so a build cannot open or create the live database.
 */
export function resolveDbPath(
  argv: readonly string[] = process.argv,
  env: NodeJS.ProcessEnv = process.env,
  cwd: string = process.cwd(),
): string {
  if (!argv.includes('start')) return path.join(cwd, 'data', 'xiaozhong.db');
  return configuredDbPath(env) ?? PRODUCTION_DB_PATH;
}

export function isProductionServer(argv: readonly string[] = process.argv): boolean {
  return argv.includes('start');
}
