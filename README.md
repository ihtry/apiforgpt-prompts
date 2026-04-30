# ApiForGPT-prompts

ApiForGPT-prompts 是一个基于 `awesome-gpt-image-2-prompts` 二次开发的提示词 API 与 Web 控制台项目。它会从仓库内现有的 Markdown 案例文件中解析提示词，并提供按类型随机获取 prompt 的 API、图片预览、API 文档页和可配置友情链接。

## 原项目与作者信息

本项目基于原仓库二次开发：

- 原项目：`awesome-gpt-image-2-prompts`
- 原仓库：https://github.com/EvoLinkAI/awesome-gpt-image-2-prompts
- 原项目内容：收集 GPT-Image-2 相关高质量提示词、案例来源和生成图片
- 原项目许可证：见 [LICENSE](LICENSE)

感谢原项目作者和社区贡献者整理的提示词案例。本项目保留原始 `cases/`、`images/`、多语言 README 等素材，并在此基础上增加 API 服务、Web UI、Netlify 部署配置和前端配置能力。

## 项目信息

主要能力：

- 按类型随机获取提示词
- 支持 `poster`、`portrait`、`ui`、`ecommerce`、`ad-creative`、`character`、`comparison`
- 支持中文类型别名，例如 `海报`、`电商`、`人像`
- Web 控制台展示标题、来源、作者、图片和 prompt
- JSON 格式 prompt 在页面中自动转成可读文本，复制时仍复制原始 prompt
- API 文档页：`/docs`
- 可配置友情链接：`public/site-config.json`
- 支持本地 Node.js 运行和 Netlify 部署

## 目录结构

```text
cases/                    原始提示词 Markdown 数据
images/                   案例输出图片
public/                   前端页面、样式、配置
lib/prompt-index.js       提示词解析与随机查询逻辑
netlify/functions/        Netlify Functions API
scripts/build-netlify.js  Netlify 静态构建脚本
server.js                 本地开发服务器
netlify.toml              Netlify 部署配置
```

## 本地开发

需要 Node.js 18 或更高版本。

```bash
npm install
npm start
```

启动后访问：

```text
http://127.0.0.1:3000
http://127.0.0.1:3000/docs
```

开发模式：

```bash
npm run dev
```

检查语法：

```bash
npm run check
```

构建 Netlify 静态产物：

```bash
npm run build
```

构建结果会输出到 `dist/`。

## API 使用

### 获取服务状态

```http
GET /health
```

### 获取类型列表

```http
GET /api/types
```

### 按类型随机获取提示词

```http
GET /api/random?type=poster
GET /api/random/poster
GET /api/random?type=海报
```

返回示例：

```json
{
  "type": "poster",
  "total": 101,
  "item": {
    "id": 130,
    "title": "Dance Movement Reference Sheet",
    "sourceUrl": "https://x.com/...",
    "creator": {
      "name": "@creator",
      "url": "https://x.com/creator"
    },
    "prompt": "...",
    "imagePath": "images/poster_case130/output.jpg",
    "imageUrl": "/images/poster_case130/output.jpg"
  }
}
```

## 友情链接配置

修改 [public/site-config.json](public/site-config.json)：

```json
{
  "friendLinksTitle": "友情链接",
  "friendLinksDescription": "相关工具和资源",
  "friendLinks": [
    {
      "title": "站点名称",
      "url": "https://example.com",
      "description": "简短描述"
    }
  ]
}
```

`friendLinks` 为空时，首页友情链接区块会自动隐藏。

## Netlify 部署

将仓库连接到 Netlify 后，使用以下配置：

```text
Build command: npm run build
Publish directory: dist
Functions directory: netlify/functions
```

项目已包含 [netlify.toml](netlify.toml)，通常 Netlify 会自动读取：

```toml
[build]
  command = "npm run build"
  publish = "dist"
  functions = "netlify/functions"
```

部署后可访问：

```text
/
/docs
/health
/api/types
/api/random/poster
```

当 GitHub 仓库更新并触发 Netlify 重新部署后，`cases/*.md` 和 `images/` 中的数据会随构建一起更新。

## 二次开发说明

本项目的 API 和 UI 是二次开发内容；提示词数据和图片素材主要来自原项目及其社区整理来源。使用、分发或继续二次开发时，请同时遵守原项目许可证和素材来源要求。
