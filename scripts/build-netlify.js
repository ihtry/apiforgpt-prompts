import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadIndex } from "../lib/prompt-index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const DIST_DIR = path.join(ROOT_DIR, "dist");
const PROMPT_DATA_PATH = path.join(ROOT_DIR, "netlify", "functions", "prompt-data.json");
const ROOT_PROMPT_DATA_PATH = path.join(ROOT_DIR, "prompt-data.json");

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

const index = loadIndex(ROOT_DIR);
fs.writeFileSync(
  PROMPT_DATA_PATH,
  JSON.stringify(
    {
      types: index.types,
      promptsByType: index.promptsByType,
      allPrompts: index.allPrompts,
    },
    null,
    2,
  ),
  "utf8",
);
fs.copyFileSync(PROMPT_DATA_PATH, ROOT_PROMPT_DATA_PATH);

console.log(`Built Netlify static site at ${path.relative(ROOT_DIR, DIST_DIR)}`);
console.log(`Built Netlify prompt data at ${path.relative(ROOT_DIR, PROMPT_DATA_PATH)}`);
