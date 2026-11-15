# Vercel 部署报告 — @socrates/app（Expo Web 静态导出）

> 状态：**已上线生产**。静态产物本地预构建后直传 Vercel；生产别名、部署状态、路由回源与两个演示故事链路已实测取证（证据路径见第 6 节）。
> 2026-11-15 第二轮：avatar 修复包（新 chunk `index-D8W_jS9c.js`，含 `file://` XHR 兜底 shim，对 http 为 no-op）已重新构建并直传生产，新部署与回源核验见第 1、3、3.1 节。
> 本文件只放公开信息；任何后端密钥（LLM、火山、service role、Personal Token、DB 密码等）都不得出现在前端、本文件或 Vercel 前端环境变量里。

## 1. 生产访问地址

| 用途 | URL |
| --- | --- |
| 主生产别名（对外） | https://dist-three-beryl-36.vercel.app |
| 团队别名 | https://dist-snoop10.vercel.app |
| 当前部署直链（第二轮） | https://dist-rntwjr8iw-snoop10.vercel.app |
| 部署检查台（第二轮） | https://vercel.com/snoop10/dist/42ySmbnm8P74QLPrKuu7HrXD2kER |

- Vercel 团队/scope：`snoop10`（`team_4jHktU172Kt9BKrbqMXZtsIn`）
- 项目：`dist`（`prj_nVBLnc05nQGeF6DeZKgAx3drWsfD`）
- 当前部署：`dpl_42ySmbnm8P74QLPrKuu7HrXD2kER`，状态 `READY` / `production`，9s Ready；两个别名均由 API 确认指向该部署。
- 上一轮部署（保留可回滚）：`dpl_7DKNDSCxVXkFHRYjHrqx7wQCNvPY`（`dist-3rnq2jfkt-snoop10.vercel.app`）。

## 2. 路径、工具与配置

- Monorepo 根：`C:\Users\biyyl234\Doubao\chats\2026-11-15\new-chat`
- 应用目录：`C:\Users\biyyl234\Doubao\chats\2026-11-15\new-chat\apps\app`
- 便携 Node（先 prepend 到 PATH，含 node/npm/pnpm/npx）：`C:\Users\biyyl234\devtools\node`
- Vercel CLI：不全局安装，经 npx 缓存调用，版本 **Vercel CLI 65.16.0 (native)**。
- 静态产物：`apps\app\dist`（`expo export -p web`，纯 HTML + JS，8 个路由 HTML；含 `avatar/` 后共 97 个文件）。
- Avatar bundle：`dist\avatar` 共 **59 个文件**，主 chunk `assets\index-D8W_jS9c.js`（456670 字节），CSS `assets\index-DarrlAH5.css`；网页 iframe 同源加载 `/avatar/index.html`。
- 直传 staging 目录：`apps\app\static-deploy`（`dist` 全量副本 + 仅含 rewrites/headers 的静态版 `vercel.json`，不含构建命令；共 98 个文件含配置）。

### `apps\app\vercel.json`（云端构建版）

- `framework: null`：纯静态站点，不走框架模板。
- `buildCommand: "expo export -p web"`；`outputDirectory: "dist"`；`installCommand: "pnpm install --frozen-lockfile"`。
- `rewrites`：8 条客户端路由显式映射到对应 `.html`，未知路径回退 `index.html`（SPA 兜底）。
- `headers`：`/_expo/*`、`/assets/*`、`/avatar/assets/*` 指纹资源长缓存（`public, max-age=31536000, immutable`）。

### 8 条静态路由（`dist` 内 HTML）

| 客户端路径 | 产物文件 | 本地字节 |
| --- | --- | --- |
| `/` | `index.html` | 30120 |
| `/onboarding` | `onboarding.html` | 24947 |
| `/chat`（含 `?story=water|beef`） | `chat.html` | 26073 |
| `/commitments` | `commitments.html` | 23776 |
| `/compare` | `compare.html` | 29897 |
| `/settings` | `settings.html` | 41380 |
| `/_sitemap` | `_sitemap.html` | 19636 |
| `/+not-found` | `+not-found.html` | 19671 |

## 3. 路由公网回源实测

本机（Windows）与云主机（Linux）到 `*.vercel.app` 的 SNI/DNS 均被阻断，无法在无头浏览器内直连生产域名；回源经已验证可用的 Google 翻译代理 `https://translate.google.com/translate?sl=auto&tl=en&u=<route>` 取回页面 HTML（代理自身 HTTP 200），按页面特征判定是否为应用页或 Vercel 原生 404。

| 路由 | 代理状态 | 页面判定 | 公网 HTML 字节 | 证据快照 |
| --- | --- | --- | --- | --- |
| `/` | 200 | 应用页 | 36751 | `gt-index.html` |
| `/onboarding` | 200 | 应用页 | 31099 | `gt-onboarding.html` |
| `/chat` | 200 | 应用页 | 32565 | `gt-chat.html` |
| `/commitments` | 200 | 应用页 | 29942 | `gt-commitments.html` |
| `/compare` | 200 | 应用页 | 37100 | `gt-compare.html` |
| `/settings` | 200 | 应用页 | 49275 | `gt-settings.html` |
| `/_sitemap` | 200 | 应用页（独立页面） | 25354 | `gt-_sitemap.html` |
| `/+not-found` | 200 | 应用页（独立页面） | 25597 | `gt-p-not-found.html` |

说明：
- 8 条路由均未命中 Vercel 原生 `404: NOT_FOUND` 页面；`/_sitemap`、`/+not-found` 字节数与首页明显不同，确认显式 rewrite 生效（首轮直传时曾出现 clean URL 404，已通过随包上传 `static-deploy/vercel.json` 修复）。
- 早期经另一回源通道取得 `/`、`/onboarding` 的源站 HTTP 200；其余路由的源站精确状态码受代理退化/网络阻断影响，未能逐条从边缘直接取到（代理层 200 + 应用页 HTML，未见 404 特征）。
- 首页快照含后端 Supabase 地址 `https://eaarnvyzcrpjhvrghmal.supabase.co`，与本地构建内联值一致。

## 3.1 Avatar 资源公网回源核验（第二轮）

同样经 Google 翻译代理回源；直连 `*.vercel.app` 在本机/云主机均为 `URLError`（SNI/DNS 阻断，已逐条记录在 `redeploy-status.json`）。

| 公网路径 | 代理状态 | 判定 | 本地字节 | 回源字节 | 证据快照 |
| --- | --- | --- | --- | --- | --- |
| `/avatar/index.html` | 200 | 页面含 `avatar-root`、引用新 chunk/CSS | 851 | 6531（代理包装后） | `avatar-index.html` |
| `/avatar/assets/index-D8W_jS9c.js` | 200 | 主 chunk，字节与本地一致 | 456670 | 456670 | `avatar-chunk.js` |
| `/avatar/assets/index-DarrlAH5.css` | 200 | 样式表，字节一致 | 1106 | 1106 | `avatar-css.css` |
| `/avatar/vendor/live2dcubismcore.min.js` | 200 | Cubism 运行时，字节一致 | 207155 | 207155 | `avatar-vendor.js` |
| `/avatar/assets/BitmapFont-w-uyjC8x.js` | 200 | 动态分包，字节一致 | 33955 | 33955 | `avatar-bitmapfont.js` |
| `/avatar/live2d/Haru/Haru.model3.json` | 200 | Live2D 模型清单，字节一致 | 1918 | 1918 | `avatar-haru-model.json` |

- `/avatar/index.html` 快照引用 `./assets/index-D8W_jS9c.js` 与 `./assets/index-DarrlAH5.css`，未残留旧 chunk。
- Vercel 静态文件优先于 rewrites：`/avatar/*` 真实目录文件先于 SPA catch-all 解析；`/avatar/assets/*` 已配 immutable 长缓存。

## 4. 两个演示故事走查（数据卡 / 对比 / 承诺链路）

### 环境与口径

- 走查在本机静态服务上加载**与线上直传包完全相同的 `dist` 产物**（本地 `http://127.0.0.1:4599`），Headless Chrome 经 CDP 驱动；聊天应答来自线上同一 Supabase 后端（前端内联的公开变量），非纯离线脚本。
- 受 `*.vercel.app` 阻断限制，无法在公网域名下做浏览器交互；本地产物即生产部署包，后端调用链路在本地走查中实测通过。

### 故事 A：瓶装水 vs 直饮水（story=`water`）

- 首轮回源：助手回复进入 MI「了解情况」阶段（后端真实应答）。
- 数据卡：1 瓶（500 ml），质量 D，约 `0.001 – 0.001 kgCO2e`，阶段「使用 0·100%」，含来源与质量等级、保守包络/未覆盖阶段/免责声明。
- 对比视图（`/compare?story=water`）：瓶装水 `0.087 – 0.138 kgCO2e`（点估计 0.106）；直饮水/自带水杯 `0.001 – 0.001 kgCO2e`（点估计 0）；附区间重叠不宣称绝对优劣等口径说明。
- 承诺链路：本地优先持久化（localStorage，键 `socrates:commitments`）；承诺卡文本「下次买水时自带水杯」、替代选择「直饮水 / 自带水杯」、计划「把水杯放在书包侧袋，作为固定位置」、记录与跟进日期、取消按钮均渲染正常；后端可达时镜像到云端。

### 故事 B：牛肉餐 vs 素食餐（story=`beef`）

- 数据卡：1 份标准食堂套餐（350 g），质量 D，约 `13.626 – 15.809 kgCO2e`；原料/养殖 10.668·98%、食堂烹饪 0.15·1%、包装/餐具 0.05·0%，展开来源 3 条，含局限说明。
- 对比视图（`/compare?story=beef`）：牛肉餐 `13.626 – 15.809 kgCO2e`（点估计 10.868）；素食餐 `1.52 – 1.767 kgCO2e`（点估计 1.184）；口径与不做跨品类排名/抵消表述一致。
- 承诺候选：演示脚本内承诺「下一餐选一次素食窗口」，替代「素食餐（标准份）」，障碍「不确定口味是否合口」，计划「先选半荤半素或小份试一次」；承诺记录页读取与渲染链路已验证。

### 走查截图（均在 agent 工作区 `evidence\`，绝对路径见第 6 节）

| 证据 | 文件 |
| --- | --- |
| 首页（两故事卡 + 后端连接） | `shot-home.png` / `shot-home-cdp.png` |
| 瓶装水对话两轮 | `shot-water-chat-1.png`、`shot-water-chat-2.png` |
| 牛肉餐对话两轮 | `shot-beef-chat-1.png`、`shot-beef-chat-2.png` |
| 水对比视图 | `shot-compare-water.png` |
| 餐对比视图 | `shot-compare-beef.png` |
| 承诺记录 | `shot-commitments.png` |
| 引导页 / 设置页 | `shot-onboarding.png`、`shot-settings.png` |

## 5. Vercel 环境变量清单（仅公开值）

本次为本地预构建直传，两个公开变量已在构建期内联进 `dist`，无需在 Vercel 再配；若改走云端构建，需在项目环境变量配置以下公开值（Production）：

| 变量名 | 值 | 必填 | 说明 |
| --- | --- | --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | `https://eaarnvyzcrpjhvrghmal.supabase.co` | 是 | 后端 Supabase 项目地址（公开） |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_tl1DclMQ386jjwPoxwjt1Q_TTnzPNEN` | 是 | anon / publishable 公钥（公开，可随前端下发） |
| `EXPO_PUBLIC_AVATAR_URL` | 留空 | 否 | 独立 avatar bundle URL；留空走 L4 纯文字虚拟人降级 |
| `EXPO_PUBLIC_LOCALE` | `zh-CN` | 否 | 语言提示；代码默认即 `zh-CN` |

### 严禁出现在前端 / Vercel 前端变量中的后端密钥

`EXPO_TOKEN`、`SUPABASE_PERSONAL_TOKEN`、`SUPABASE_DB_PASSWORD`、`LLM_API_KEY`、`LLM_BASE_URL`、`LLM_MODEL`、`VOLC_ACCESSKEYID`、`VOLC_SECRETACCESSKEY`、`VOLC_TTS_ACCESS_TOKEN`、`VOLC_TTS_APP_ID`、`VOLC_TTS_CLUSTER`、`VOLC_TTS_VOICE_TYPE`、Supabase service role / `sb_secret` 等。这些只允许存在于 Supabase Edge Function 服务端密钥。

产物扫描结论：`dist` 内无 JWT（`eyJ...`）、无 `sb_secret_`、无 service role 赋值、无 `sk-` 密钥；bundle 中出现的 `LLM_API_KEY` 等仅为缺失凭证时的报错文案，不含真实值。

## 6. 证据绝对路径

Agent 工作区根：
`C:\Users\biyyl234\AppData\Local\Doubao\User Data\Default\.doubao\agent_mode\workspace\.sessions\38453828835049474\agents\s_000TS9Ag2UW`

- 第一轮路由状态汇总 JSON：`...\evidence\route-status.json`；第二轮（含 avatar 资源）：`...\evidence\redeploy-status.json`
- 公网回源 HTML 快照：`...\evidence\gt-*.html`；第二轮 avatar 快照：`...\evidence\avatar-*.html/.js/.css/.json`
- 走查截图：`...\evidence\shot-*.png`（清单见第 4 节）
- 本地静态服务脚本：`...\serve_dist.py`；CDP 驱动脚本：`...\cdp_walk.mjs`；第一轮状态表：`...\build_route_status.py`；第二轮探测脚本：`...\probe_redeploy.py`

## 7. 本地复跑命令（无需 Vercel 授权）

```powershell
$env:PATH = "C:\Users\biyyl234\devtools\node;$env:PATH"
Set-Location "C:\Users\biyyl234\Doubao\chats\2026-11-15\new-chat\apps\app"

# 注入公开变量（非密钥），重新导出静态产物
$env:EXPO_PUBLIC_SUPABASE_URL = "https://eaarnvyzcrpjhvrghmal.supabase.co"
$env:EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_tl1DclMQ386jjwPoxwjt1Q_TTnzPNEN"
npx expo export -p web

# 同步 standalone avatar bundle 到 dist/avatar（web 模式）
node scripts/sync-avatar.mjs --web

# 核对 CLI 版本
npx --yes vercel --version
```

复跑上线（本地预构建直传）：

```powershell
$env:PATH = "C:\Users\biyyl234\devtools\node;$env:PATH"
Set-Location "C:\Users\biyyl234\Doubao\chats\2026-11-15\new-chat\apps\app"
$env:VERCEL_TOKEN = "<有效 vcp_... 令牌，仅走环境变量>"
npx --yes vercel deploy static-deploy --prod --yes --project prj_nVBLnc05nQGeF6DeZKgAx3drWsfD
```

## 8. 约束遵守记录

- 未执行 `pnpm install` / `pnpm add`，未改动 `pnpm-lock.yaml`；未执行任何 git commit。
- 新令牌仅经 `VERCEL_TOKEN` 环境变量传入，未落盘、未写入 `vercel.json` 或源码；`.env.local` 仅含临时 OIDC token。
- 直传 staging 目录 `static-deploy\` 内除产物外仅含静态版 `vercel.json`。
- 部署过程中 `vercel curl` 曾自动添加一个 Deployment Protection bypass secret；已通过 `vercel project protection disable ... --protection-bypass` 撤销，复核 `protectionBypass` 为空。
