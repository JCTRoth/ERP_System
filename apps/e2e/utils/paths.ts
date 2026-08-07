import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Directory of this util (works in both ESM and CJS contexts).
const here = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Absolute path to the shared auth storage state file produced by the
 * `setup` project (tests/auth.setup.ts) and consumed by every authenticated
 * test project. Using an absolute path keeps the file location consistent
 * regardless of the working directory the suite is launched from.
 */
export const AUTH_STORAGE_STATE = path.join(here, 'tests/.auth/user.json');
