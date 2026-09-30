// Copies MapLibre's web worker into public/, where the browser can load it.
// MapLibre 6 finds its worker next to its own file at runtime, which breaks once Next bundles it, so the
// map calls setWorkerUrl() with this copy instead. The folder is versioned so upgrades never mix files.
// Runs automatically before `npm run dev` and `npm run build`.
import { cpSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const pkgPath = require.resolve('maplibre-gl/package.json');
const { version } = JSON.parse(readFileSync(pkgPath, 'utf8'));
const dist = join(dirname(pkgPath), 'dist');
const out = join(process.cwd(), 'public', 'maplibre');

rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, version), { recursive: true });
// The worker imports the shared chunk by relative path, so both go in the same folder.
for (const file of ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']) {
  cpSync(join(dist, file), join(out, version, file));
}
console.log(`maplibre-gl ${version} worker copied to public/maplibre/${version}/`);
