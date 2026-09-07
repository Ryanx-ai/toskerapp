// Reproducible static derivatives of the founder-supplied ToskerWeb concept.
// No generation, repainting, or toskerArt access. Run with the concept directory.
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const source = process.argv[2];
if (!source) throw new Error("Pass the landing-v1 concept directory.");
const target = resolve("public/landing");
await mkdir(target, { recursive: true });
for (const [name, width] of [["hero-room-concept", 1280], ["ending-world-concept", 1440]]) {
  await sharp(resolve(source, "assets", `${name}.png`)).resize({ width }).webp({ quality: 85 }).toFile(resolve(target, `${name}.webp`));
}
for (const surface of ["chat", "hall"]) {
  await sharp(resolve(source, "assets", `tokyo-${surface}-wide.png`))
    .extract({ left: 290, top: 0, width: 1150, height: 680 })
    .webp({ lossless: true }).toFile(resolve(target, `tokyo-${surface}.webp`));
}
