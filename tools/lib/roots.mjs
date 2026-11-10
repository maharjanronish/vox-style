// tools/lib/roots.mjs — STUDIO_ROOT (the package) vs WORKSPACE (the user's project folder).
// Today both are this repo. After packaging, set VOX_WORKSPACE or run from a folder containing studio.config.json or projects/.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const STUDIO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function findWorkspace() {
  if (process.env.VOX_WORKSPACE) return path.resolve(process.env.VOX_WORKSPACE);
  for (let d = process.cwd(), up; ; d = up) {
    if (fs.existsSync(path.join(d, 'studio.config.json')) || fs.existsSync(path.join(d, 'projects'))) return d;
    up = path.dirname(d);
    if (up === d) return STUDIO_ROOT;
  }
}
export const WORKSPACE = findWorkspace();
