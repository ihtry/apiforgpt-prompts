import fs from "node:fs";
import path from "node:path";

const DEFAULT_ROOT_DIR = process.cwd();

const TYPE_ALIASES = new Map([
  ["ad", "ad-creative"],
  ["ads", "ad-creative"],
  ["ad_creative", "ad-creative"],
  ["adcreative", "ad-creative"],
  ["ad-creative", "ad-creative"],
  ["广告", "ad-creative"],
  ["广告创意", "ad-creative"],
  ["character", "character"],
  ["characters", "character"],
  ["角色", "character"],
  ["角色设计", "character"],
  ["comparison", "comparison"],
  ["compare", "comparison"],
  ["对比", "comparison"],
  ["比较", "comparison"],
  ["ecommerce", "ecommerce"],
  ["e-commerce", "ecommerce"],
  ["电商", "ecommerce"],
  ["portrait", "portrait"],
  ["portraits", "portrait"],
  ["人像", "portrait"],
  ["摄影", "portrait"],
  ["poster", "poster"],
  ["posters", "poster"],
  ["海报", "poster"],
  ["ui", "ui"],
  ["界面", "ui"],
]);

let cachedIndex = null;

function resolveRootDir(rootDir) {
  const candidates = [rootDir, process.env.PROMPTS_ROOT, process.cwd(), DEFAULT_ROOT_DIR].filter(Boolean);

  for (const candidate of candidates) {
    const absolutePath = path.resolve(candidate);
    if (fs.existsSync(path.join(absolutePath, "cases"))) {
      return absolutePath;
    }
  }

  return DEFAULT_ROOT_DIR;
}

function listBaseTypes(casesDir) {
  return fs
    .readdirSync(casesDir)
    .filter((file) => file.endsWith(".md") && !file.includes("_"))
    .map((file) => path.basename(file, ".md"))
    .sort();
}

export function normalizeType(input) {
  if (!input) {
    return null;
  }

  const key = String(input).trim().toLowerCase();
  return TYPE_ALIASES.get(key) || key;
}

function normalizeImagePath(src) {
  if (!src) {
    return null;
  }

  if (/^https?:\/\//i.test(src)) {
    return src;
  }

  return src.replace(/^\.?\//, "");
}

function parseHeading(heading) {
  const match = heading.match(/^### Case\s+(\d+):\s+(.+)$/);
  if (!match) {
    return null;
  }

  const [, id, rest] = match;
  const linked = rest.match(/^\[(.*?)\]\((.*?)\)(?:\s+\(by\s+\[(.*?)\]\((.*?)\)\))?/);

  return {
    id: Number.parseInt(id, 10),
    title: linked ? linked[1] : rest,
    sourceUrl: linked ? linked[2] : null,
    creator: linked && linked[3] ? { name: linked[3], url: linked[4] || null } : null,
  };
}

function parseCases(casesDir, type) {
  const filePath = path.join(casesDir, `${type}.md`);
  const markdown = fs.readFileSync(filePath, "utf8");
  const headings = [...markdown.matchAll(/^### Case\s+\d+:/gm)].map((match) => match.index);
  const blocks = headings.map((start, index) => {
    const end = headings[index + 1] ?? markdown.length;
    return markdown.slice(start, end);
  });

  return blocks
    .map((block) => {
      const heading = block.split("\n", 1)[0];
      const meta = parseHeading(heading);
      const promptMatch = block.match(/\*\*Prompt:\*\*[\s\S]*?```[a-zA-Z0-9_-]*\n([\s\S]*?)\n```/);
      const imageMatch = block.match(/<img\s+[^>]*src=["']([^"']+)["']/i);

      if (!meta || !promptMatch) {
        return null;
      }

      const imagePath = normalizeImagePath(imageMatch?.[1] || null);

      return {
        ...meta,
        type,
        prompt: promptMatch[1].trim(),
        imagePath,
        imageUrl: imagePath && !/^https?:\/\//i.test(imagePath) ? `/${imagePath}` : imagePath,
      };
    })
    .filter(Boolean);
}

export function loadIndex(rootDir) {
  const resolvedRootDir = resolveRootDir(rootDir);
  const casesDir = path.join(resolvedRootDir, "cases");
  const types = listBaseTypes(casesDir);
  const promptsByType = Object.fromEntries(types.map((type) => [type, parseCases(casesDir, type)]));
  const allPrompts = Object.values(promptsByType).flat();

  return { rootDir: resolvedRootDir, types, promptsByType, allPrompts };
}

export function getIndex() {
  if (!cachedIndex) {
    cachedIndex = loadIndex();
  }

  return cachedIndex;
}

export function reloadIndex(rootDir) {
  cachedIndex = loadIndex(rootDir);
  return cachedIndex;
}

export function typeSummary(index = getIndex()) {
  return index.types.map((type) => ({
    type,
    count: index.promptsByType[type]?.length || 0,
  }));
}

export function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

export function normalizeApiPath(pathname) {
  const cleanPath = decodeURIComponent(pathname || "/").replace(/\/+$/, "") || "/";
  const functionPrefix = "/.netlify/functions/prompt-api";

  if (cleanPath === functionPrefix) {
    return "/";
  }

  if (cleanPath.startsWith(`${functionPrefix}/`)) {
    return cleanPath.slice(functionPrefix.length) || "/";
  }

  return cleanPath;
}

export function resolvePromptApi(pathname, searchParams = new URLSearchParams(), index = getIndex()) {
  const apiPath = normalizeApiPath(pathname);

  if (apiPath === "/" || apiPath === "/health") {
    return {
      status: 200,
      body: {
        ok: true,
        promptCount: index.allPrompts.length,
        types: typeSummary(index),
      },
    };
  }

  if (apiPath === "/api/types" || apiPath === "/types") {
    return {
      status: 200,
      body: { types: typeSummary(index) },
    };
  }

  if (
    apiPath === "/api/random" ||
    apiPath === "/api/prompts/random" ||
    apiPath === "/random" ||
    apiPath.startsWith("/api/random/") ||
    apiPath.startsWith("/api/prompts/random/") ||
    apiPath.startsWith("/random/")
  ) {
    const pathPrefixes = ["/api/random/", "/api/prompts/random/", "/random/"];
    const prefix = pathPrefixes.find((item) => apiPath.startsWith(item));
    const requestedType = prefix ? apiPath.slice(prefix.length) : searchParams.get("type");
    const type = normalizeType(requestedType);

    if (!type || !index.promptsByType[type]) {
      return {
        status: 400,
        body: {
          error: "Invalid or missing type",
          validTypes: typeSummary(index),
        },
      };
    }

    const prompts = index.promptsByType[type];
    return {
      status: 200,
      body: {
        type,
        total: prompts.length,
        item: randomItem(prompts),
      },
    };
  }

  return {
    status: 404,
    body: {
      error: "Not found",
      endpoints: ["/health", "/api/types", "/api/random?type=poster", "/api/random/poster"],
    },
  };
}
