import { getIndex, resolvePromptApi } from "../../lib/prompt-index.js";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};

export async function handler(event) {
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
  const result = resolvePromptApi(event.path || url.pathname, url.searchParams, getIndex());

  return {
    statusCode: result.status,
    headers,
    body: JSON.stringify(result.body, null, 2),
  };
}
