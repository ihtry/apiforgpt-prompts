import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getIndex, resolvePromptApi } from "./lib/prompt-index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = __dirname;
const IMAGES_DIR = path.join(ROOT_DIR, "images");
const PUBLIC_DIR = path.join(ROOT_DIR, "public");
const PORT = Number.parseInt(process.env.PORT || "3000", 10);

const MIME_TYPES = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".txt", "text/plain; charset=utf-8"],
  [".webp", "image/webp"],
]);

const index = getIndex();

function sendJson(res, statusCode, body) {
  const json = JSON.stringify(body, null, 2);
  res.writeHead(statusCode, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json; charset=utf-8",
  });
  res.end(json);
}

function serveFile(req, res, absolutePath, allowedDir) {
  if (!absolutePath.startsWith(`${allowedDir}${path.sep}`)) {
    sendJson(res, 403, { error: "Forbidden" });
    return;
  }

  fs.stat(absolutePath, (statError, stats) => {
    if (statError || !stats.isFile()) {
      sendJson(res, 404, { error: "Not found" });
      return;
    }

    const contentType = MIME_TYPES.get(path.extname(absolutePath).toLowerCase()) || "application/octet-stream";
    res.writeHead(200, {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": contentType,
      "Content-Length": stats.size,
    });

    if (req.method === "HEAD") {
      res.end();
      return;
    }

    fs.createReadStream(absolutePath).pipe(res);
  });
}

function servePublicFile(req, res, pathname) {
  const publicPath = pathname === "/" ? "index.html" : pathname === "/docs" ? "docs.html" : pathname.replace(/^\/+/, "");
  const absolutePath = path.resolve(PUBLIC_DIR, publicPath);
  serveFile(req, res, absolutePath, PUBLIC_DIR);
}

const server = http.createServer((req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end();
    return;
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  const reqUrl = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const pathname = decodeURIComponent(reqUrl.pathname).replace(/\/+$/, "") || "/";

  if (pathname === "/health" || pathname.startsWith("/api/")) {
    const result = resolvePromptApi(pathname, reqUrl.searchParams, index);
    sendJson(res, result.status, result.body);
    return;
  }

  if (pathname.startsWith("/images/")) {
    const relativePath = pathname.replace(/^\/+/, "");
    const absolutePath = path.resolve(ROOT_DIR, relativePath);
    serveFile(req, res, absolutePath, IMAGES_DIR);
    return;
  }

  servePublicFile(req, res, pathname);
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Prompt API listening on http://127.0.0.1:${PORT}`);
  console.log(`Loaded ${index.allPrompts.length} prompts across ${index.types.length} types.`);
});
