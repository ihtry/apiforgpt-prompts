import fs from "node:fs";
import path from "node:path";
import { getIndex, resolvePromptApi } from "../../lib/prompt-index.js";

const PROMPT_DATA_CANDIDATES = [
  path.join(process.cwd(), "netlify", "functions", "prompt-data.json"),
  path.join(process.cwd(), "prompt-data.json"),
];

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};

let cachedFunctionIndex = null;

function loadFunctionIndex() {
  if (cachedFunctionIndex) {
    return cachedFunctionIndex;
  }

  const promptDataPath = PROMPT_DATA_CANDIDATES.find((candidate) => fs.existsSync(candidate));

  if (promptDataPath) {
    const data = JSON.parse(fs.readFileSync(promptDataPath, "utf8"));
    cachedFunctionIndex = {
      rootDir: "netlify-bundled-data",
      types: data.types,
      promptsByType: data.promptsByType,
      allPrompts: data.allPrompts || Object.values(data.promptsByType || {}).flat(),
    };
    return cachedFunctionIndex;
  }

  cachedFunctionIndex = getIndex();
  return cachedFunctionIndex;
}

export async function handler(event) {
  try {
    if (event.httpMethod === "OPTIONS") {
      return { statusCode: 204, headers, body: "" };
    }

    if (event.httpMethod !== "GET") {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: "Method not allowed" }, null, 2),
      };
    }

    const url = new URL(event.rawUrl || `https://example.netlify.app${event.path || "/"}`);
    const result = resolvePromptApi(event.path || url.pathname, url.searchParams, loadFunctionIndex());

    return {
      statusCode: result.status,
      headers,
      body: JSON.stringify(result.body, null, 2),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify(
        {
          error: "Function error",
          message: error instanceof Error ? error.message : String(error),
        },
        null,
        2,
      ),
    };
  }
}
