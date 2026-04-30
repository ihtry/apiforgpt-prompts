const typeLabels = new Map([
  ["ad-creative", "广告创意"],
  ["character", "角色设计"],
  ["comparison", "对比案例"],
  ["ecommerce", "电商主图"],
  ["portrait", "人像摄影"],
  ["poster", "海报插画"],
  ["ui", "UI / 社媒"],
]);

const elements = {
  typeSelect: document.querySelector("#typeSelect"),
  randomButton: document.querySelector("#randomButton"),
  copyButton: document.querySelector("#copyButton"),
  copyApiButton: document.querySelector("#copyApiButton"),
  outputImage: document.querySelector("#outputImage"),
  imageFrame: document.querySelector(".image-frame"),
  imageLink: document.querySelector("#imageLink"),
  typeBadge: document.querySelector("#typeBadge"),
  caseId: document.querySelector("#caseId"),
  caseTitle: document.querySelector("#caseTitle"),
  promptLength: document.querySelector("#promptLength"),
  promptMeta: document.querySelector("#promptMeta"),
  sourceLink: document.querySelector("#sourceLink"),
  creatorLink: document.querySelector("#creatorLink"),
  promptBox: document.querySelector("#promptBox"),
  statusText: document.querySelector("#statusText"),
  countText: document.querySelector("#countText"),
  typeStats: document.querySelector("#typeStats"),
  apiExample: document.querySelector("#apiExample"),
  totalCount: document.querySelector("#totalCount"),
  categoryCount: document.querySelector("#categoryCount"),
  friendLinksSection: document.querySelector("#friendLinksSection"),
  friendLinksTitle: document.querySelector("#friendLinksTitle"),
  friendLinksDescription: document.querySelector("#friendLinksDescription"),
  friendLinksList: document.querySelector("#friendLinksList"),
};

let currentPrompt = "";
let currentApiUrl = "/api/random/poster";

async function requestJson(url) {
  const response = await fetch(url);
  const body = await response.json();

  if (!response.ok) {
    throw new Error(body.error || `Request failed: ${response.status}`);
  }

  return body;
}

function labelFor(type) {
  return typeLabels.get(type) || type;
}

function humanizeKey(key) {
  return String(key)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatPrimitive(value) {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (value === null) {
    return "null";
  }

  return "";
}

function formatPromptValue(value, depth = 0, label = "") {
  const indent = "  ".repeat(depth);
  const lines = [];

  if (Array.isArray(value)) {
    if (label) {
      lines.push(`${indent}${humanizeKey(label)}:`);
    }

    for (const item of value) {
      if (item && typeof item === "object") {
        lines.push(`${indent}-`);
        lines.push(formatPromptValue(item, depth + 1));
      } else {
        lines.push(`${indent}- ${formatPrimitive(item)}`);
      }
    }

    return lines.filter(Boolean).join("\n");
  }

  if (value && typeof value === "object") {
    if (label) {
      lines.push(`${indent}${humanizeKey(label)}:`);
    }

    for (const [key, child] of Object.entries(value)) {
      if (child && typeof child === "object") {
        lines.push(formatPromptValue(child, depth + (label ? 1 : 0), key));
      } else {
        const childIndent = "  ".repeat(depth + (label ? 1 : 0));
        lines.push(`${childIndent}${humanizeKey(key)}: ${formatPrimitive(child)}`);
      }
    }

    return lines.filter(Boolean).join("\n");
  }

  return label ? `${indent}${humanizeKey(label)}: ${formatPrimitive(value)}` : formatPrimitive(value);
}

function formatPromptForDisplay(prompt) {
  const trimmed = prompt.trim();

  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
    return prompt;
  }

  try {
    const parsed = JSON.parse(trimmed);
    return formatPromptValue(parsed);
  } catch {
    return prompt;
  }
}

function setBusy(isBusy) {
  elements.randomButton.disabled = isBusy;
  elements.typeSelect.disabled = isBusy;
  elements.randomButton.textContent = isBusy ? "获取中..." : "随机获取";
  elements.imageFrame.classList.toggle("is-loading", isBusy);
}

function setOptionalLink(link, label, url) {
  link.textContent = label;
  if (url) {
    link.href = url;
    link.hidden = false;
    return;
  }

  link.hidden = true;
  link.removeAttribute("href");
}

function updateSelectedStat(type) {
  for (const card of elements.typeStats.querySelectorAll(".stat-card")) {
    const isActive = card.dataset.type === type;
    card.classList.toggle("active", isActive);
    card.setAttribute("aria-pressed", String(isActive));
  }
}

function renderTypeStats(types) {
  elements.typeStats.innerHTML = "";

  for (const item of types) {
    const button = document.createElement("button");
    button.className = "stat-card";
    button.type = "button";
    button.dataset.type = item.type;
    button.setAttribute("aria-pressed", "false");
    button.setAttribute("aria-label", `随机获取${labelFor(item.type)}提示词`);
    button.innerHTML = `<strong>${labelFor(item.type)}</strong><span>${item.count} 条案例</span>`;
    button.addEventListener("click", () => {
      elements.typeSelect.value = item.type;
      loadRandom();
    });
    elements.typeStats.append(button);
  }
}

function renderPrompt(payload) {
  const item = payload.item;
  currentPrompt = item.prompt;
  currentApiUrl = `/api/random/${encodeURIComponent(payload.type)}`;

  elements.typeBadge.textContent = labelFor(payload.type);
  elements.caseId.textContent = `Case ${item.id}`;
  elements.caseTitle.textContent = item.title;
  elements.promptBox.textContent = formatPromptForDisplay(item.prompt);
  elements.apiExample.textContent = `GET ${currentApiUrl}`;
  elements.promptLength.textContent = `${item.prompt.length.toLocaleString("zh-CN")} chars`;
  elements.promptMeta.textContent = `${labelFor(payload.type)} / ${payload.total} 条`;
  elements.copyButton.disabled = false;
  elements.copyApiButton.disabled = false;
  elements.statusText.textContent = "已加载随机提示词";

  updateSelectedStat(payload.type);
  setOptionalLink(elements.sourceLink, "查看来源", item.sourceUrl);
  setOptionalLink(elements.creatorLink, item.creator?.name || "查看作者", item.creator?.url);

  if (item.imageUrl) {
    elements.outputImage.src = item.imageUrl;
    elements.outputImage.alt = `${item.title} 输出示例`;
    elements.imageLink.href = item.imageUrl;
    elements.imageLink.hidden = false;
    elements.imageFrame.classList.add("has-image");
  } else {
    elements.outputImage.removeAttribute("src");
    elements.imageLink.hidden = true;
    elements.imageLink.removeAttribute("href");
    elements.imageFrame.classList.remove("has-image");
  }
}

function normalizeFriendLinks(config) {
  if (!config || !Array.isArray(config.friendLinks)) {
    return [];
  }

  return config.friendLinks
    .filter((link) => link && link.title && link.url)
    .map((link) => ({
      title: String(link.title),
      url: String(link.url),
      description: link.description ? String(link.description) : "",
    }));
}

async function loadSiteConfig() {
  try {
    const config = await requestJson("/site-config.json");
    const links = normalizeFriendLinks(config);

    if (!links.length) {
      elements.friendLinksSection.hidden = true;
      return;
    }

    elements.friendLinksTitle.textContent = config.friendLinksTitle || "友情链接";
    elements.friendLinksDescription.textContent = config.friendLinksDescription || "相关工具和资源";
    elements.friendLinksList.innerHTML = "";

    for (const link of links) {
      const anchor = document.createElement("a");
      anchor.className = "friend-link-card";
      anchor.href = link.url;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      anchor.innerHTML = `<strong>${link.title}</strong>${link.description ? `<span>${link.description}</span>` : ""}`;
      elements.friendLinksList.append(anchor);
    }

    elements.friendLinksSection.hidden = false;
  } catch {
    elements.friendLinksSection.hidden = true;
  }
}

async function loadTypes() {
  const data = await requestJson("/api/types");
  elements.typeSelect.innerHTML = "";
  renderTypeStats(data.types);

  for (const item of data.types) {
    const option = document.createElement("option");
    option.value = item.type;
    option.textContent = `${labelFor(item.type)} (${item.count})`;
    elements.typeSelect.append(option);
  }

  const total = data.types.reduce((sum, item) => sum + item.count, 0);
  elements.totalCount.textContent = total.toLocaleString("zh-CN");
  elements.categoryCount.textContent = data.types.length.toLocaleString("zh-CN");
  elements.statusText.textContent = "类型已就绪";
  elements.countText.textContent = `${total} 条提示词`;
}

async function loadRandom() {
  const type = elements.typeSelect.value;

  if (!type) {
    return;
  }

  setBusy(true);
  elements.statusText.textContent = `正在获取 ${labelFor(type)}...`;

  try {
    const data = await requestJson(`/api/random/${encodeURIComponent(type)}`);
    renderPrompt(data);
  } catch (error) {
    elements.statusText.textContent = error.message;
  } finally {
    setBusy(false);
  }
}

async function copyText(value, message) {
  if (!value) {
    return;
  }

  await navigator.clipboard.writeText(value);
  elements.statusText.textContent = message;
}

elements.randomButton.addEventListener("click", loadRandom);
elements.typeSelect.addEventListener("change", loadRandom);
elements.copyButton.addEventListener("click", () => copyText(currentPrompt, "Prompt 已复制"));
elements.copyApiButton.addEventListener("click", () => copyText(`${window.location.origin}${currentApiUrl}`, "API 地址已复制"));
elements.outputImage.addEventListener("error", () => {
  elements.imageFrame.classList.remove("has-image");
  elements.statusText.textContent = "图片预览加载失败";
});

try {
  await loadSiteConfig();
  await loadTypes();
  await loadRandom();
} catch (error) {
  elements.statusText.textContent = error.message;
  elements.randomButton.disabled = true;
}
