import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

// MapLibre 6's ESM worker imports its sibling shared module. Next's asset loader
// does not emit that sibling; use the upstream documented same-origin setup.
const packageFile = createRequire(import.meta.url).resolve("maplibre-gl/package.json");
const { version } = JSON.parse(readFileSync(packageFile, "utf8"));
if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error("Unexpected MapLibre release version");
const root = dirname(packageFile);
const destination = join(process.cwd(), "public", "maplibre", version);
mkdirSync(destination, { recursive: true });
for (const file of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) {
  copyFileSync(join(root, "dist", file), join(destination, file));
}
copyFileSync(join(root, "LICENSE.txt"), join(destination, "LICENSE.txt"));
console.log(`Prepared same-origin MapLibre ${version} worker and license`);
