import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const DIST_DIR = path.join(ROOT_DIR, "dist");

function copyDir(src, dest) {
  fs.cpSync(src, dest, {
    recursive: true,
    force: true,
    filter: (source) => !source.endsWith(".DS_Store"),
  });
}

fs.rmSync(DIST_DIR, { recursive: true, force: true });
fs.mkdirSync(DIST_DIR, { recursive: true });
copyDir(path.join(ROOT_DIR, "public"), DIST_DIR);
copyDir(path.join(ROOT_DIR, "images"), path.join(DIST_DIR, "images"));

console.log(`Built Netlify static site at ${path.relative(ROOT_DIR, DIST_DIR)}`);
