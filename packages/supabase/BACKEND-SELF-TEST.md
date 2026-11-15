# Socrates 后端自测说明（Supabase Edge Functions）

> 项目：`ai for Climate 黑客松` · Supabase project ref `eaarnvyzcrpjhvrghmal`（Southeast Asia / Singapore）
> Base URL：`https://eaarnvyzcrpjhvrghmal.supabase.co/functions/v1`
> 运行时：Supabase Edge Runtime（Deno 2）；实测时间 2026-11-15（UTC+8）
> 自测方式：真实 HTTP 请求（匿名角色，publishable key），原始请求/响应证据存于 `test-evidence/`。

## 1. 交付物与复用关系

`packages/supabase/supabase/functions/` 下 6 个已部署函数，全部由 esbuild 从 `build/entries/` 打包为自包含 ESM：

| 函数 | 路径 | 职责 |
| --- | --- | --- |
| `chat` | `POST /chat` | MI 编排 + SSE 流式；守卫、状态机、LLM 适配器来自 `@socrates/core` |
| `tts` | `POST /tts` | 文本转语音； resilient 适配器来自 `@socrates/core`，无密钥时字幕降级 |
| `product` | `GET/POST /product` | 条码/关键词/品类查询；OFF 代理 + 本地快照 |
| `lca` | `POST /lca` | 确定性碳足迹核算；引擎来自 `@socrates/data` |
| `compare` | `POST /compare` | 同功能单位对比 + 区间重叠判定；引擎来自 `@socrates/data` |
| `commitment` | `POST /commitment` | 承诺登记（含 consent 记录） |

**复用纪律（硬约束已遵守）**：

- 编排器 `MiOrchestrator`、LLM/TTS 工厂、守卫（敏感词、来源白名单、回复校验）、7 工具 schema 与状态机矩阵全部来自 `packages/core`，函数内未重写。
- 碳足迹点值/区间/阶段拆分/DQ 等级、对比与重叠判定全部来自 `packages/data` 纯函数引擎，函数内未重算或新造因子。
- esbuild 别名直接指向两个包的源码入口，产物内无 `@socrates/*` 外部导入（已 grep 验证）；函数目录只含传输层胶水（CORS、错误封装、REST 调用、工具适配）。
- 未执行 `pnpm install/add`，未修改 `pnpm-lock.yaml`，未执行 `git commit`；源码中无硬编码密钥。

## 2. 环境变量

云端由平台自动注入：`SUPABASE_URL`、`SUPABASE_ANON_KEY`、`SUPABASE_SERVICE_ROLE_KEY`。

可选外部供应商变量（当前均未配置，走离线 Mock/降级）：

| 变量 | 用途 | 缺失时行为 |
| --- | --- | --- |
| `LLM_PROVIDER` / `LLM_BASE_URL` / `LLM_API_KEY` / `LLM_MODEL` | OpenAI 兼容 LLM | 工厂回退 `MockLlm`，脚本化离线对话 |
| `TTS_PROVIDER` / `VOLC_TTS_APP_ID` / `VOLC_TTS_ACCESS_TOKEN` / `VOLC_TTS_CLUSTER` / `VOLC_TTS_VOICE_TYPE` | 火山 TTS | `createResilientTts` 回退 `NoTTS`，仅保留字幕 |

## 3. 端点实测结果总表

| # | 端点 | 方法 | 用例 | 实测状态 | 证据文件 |
| --- | --- | --- | --- | --- | --- |
| 1 | `/chat` | POST | 牛肉 vs 素食对比（demo，Mock LLM） | 200 `text/event-stream` | `chat_valid.json` |
| 2 | `/chat` | POST | 空 message | 400 `INVALID_PAYLOAD` | `chat_invalid.json` |
| 3 | `/chat` | POST | 硬敏感话题（政治/领导人） | 200 SSE，`done.finish_reason=blocked`，状态 `GUARDED` | `chat_guarded.json` |
| 4 | `/tts` | POST | 正常文本（无 TTS 密钥） | 200 SSE，`tts_done` `available=false` + 字幕 | `tts_valid.json` |
| 5 | `/tts` | POST | 空 text | 400 `INVALID_PAYLOAD` | `tts_invalid.json` |
| 6 | `/product` | GET | 未知条码 `0000000000000` | 404 `PRODUCT_NOT_FOUND` | `product_barcode_miss.json` |
| 7 | `/product` | GET | 关键词 `chocolate`（OFF 代理） | 200 `matched=true, source=open_food_facts` | `product_query.json` |
| 8 | `/product` | GET | 品类 `snack`（本地快照） | 200 `matched=false` + 引导文案 | `product_category.json` |
| 9 | `/lca` | POST | `meal_beef`，1 份 350 g | 200 完整数据卡 | `lca_valid.json` |
| 10 | `/lca` | POST | 非法品类码 `nope` | 400 `INVALID_PAYLOAD` | `lca_bad_category.json` |
| 11 | `/lca` | POST | 非法单位 `foot` | 400 `INVALID_PAYLOAD` | `lca_bad_unit.json` |
| 12 | `/compare` | POST | 牛肉 vs 素食 | 200，`overlap=false`，含 ranking 与 five_r | `compare_valid.json` |
| 13 | `/compare` | POST | 仅 1 项 | 400 `INVALID_PAYLOAD` | `compare_invalid.json` |
| 14 | `/commitment` | POST | 有效承诺，`consent=true` | 200，`consent_recorded=true` | `commitment_consented.json` |
| 15 | `/commitment` | POST | 有效承诺，未传 consent | 200，`consent_recorded=false` | `commitment_no_consent.json` |
| 16 | `/commitment` | POST | `self_efficacy=9` | 400 `INVALID_PAYLOAD` | `commitment_invalid.json` |

## 4. 逐端点契约与响应证据

### 4.1 POST /chat（SSE）

请求体（§3.4）：

```json
{
  "session_id": "sess_...",
  "message": "今天食堂牛肉套餐和素套餐哪个碳排放更低？",
  "locale": "zh-CN",
  "mode": "demo",
  "context": { "entry_scene": "canteen", "product_hint": null }
}
```

实测事件顺序（`chat_valid.json`）：

```
state → tool_call(calculate_footprint) → tool_result → tool_call(compare_alternatives)
→ tool_result → compare → token ×3 → done(stop)
```

- 首帧 `state`：`session_id`、`mi_state=DECISION`、`turn=1`。
- `compare` 事件载荷与 `/compare` 同构；`token` 为自然语言分段；`done.finish_reason=stop`。
- 硬敏感话题用例（`chat_guarded.json`）：`state(WELCOME) → state(GUARDED) → token(中性转回话术) → done(blocked)`，不展开敏感主题。
- 连接建立前的非法请求返回 JSON 错误体（400）；流内错误走 `error` 事件，`done` 仍发出。

### 4.2 POST /tts（SSE，字幕降级）

请求体：`{ "session_id", "text", "voice", "locale", "format": "audio/mp3" | "audio/wav" }`。

无 TTS 密钥时 resilient 工厂选择 `NoTTS`，实测 200 SSE（`tts_valid.json`）：

```
event: tts_done
data: {"seq_total":0,"characters":25,"voice":"none","provider":"none",
       "available":false,"subtitle":"我们先看看两份套餐的差异，再聊你愿意尝试的小改变。","format":"audio/mp3"}
```

- 有密钥且适配器可用时：先 `viseme` 事件，再 `audio` base64 分块，最后 `tts_done`（`seq_total/characters/voice`）。
- 上游不可用/超时/限流映射为 `SPEECH_UNAVAILABLE(503)` / `UPSTREAM_TIMEOUT(504)` / `RATE_LIMITED(429)`。

### 4.3 GET/POST /product

查询参数三选一：`barcode`（优先）、`query`、`category`。

- 条码命中 OFF：`matched=true, source=open_food_facts`，产品字段含 `barcode/name/brands/categories/ingredients/image_url/quantity/serving_size/off_source_url/data_quality`。
- 关键词 `chocolate` 实测命中 OFF（`product_query.json`）：首条 `8052575090230` Nocciolata，250 g，来源 `https://world.openfoodfacts.org/product/8052575090230`。
- 未知条码：404 `PRODUCT_NOT_FOUND`（`product_barcode_miss.json`）。
- 关键词/品类未命中：200 `matched=false, source=none/local_snapshot` + 引导文案，不编造产品。
- OFF 仅提供属性线索；排放因子不由此接口产出。

### 4.4 POST /lca

请求体：`{ "category_id", "attributes", "quantity", "unit", "baseline" }`。

实测 `meal_beef / 1 份 350 g`（`lca_valid.json`）：

- 功能单位：`1 份标准食堂套餐（350 g）`
- 总量：`10.8685 kgCO2e`，区间 `[13.6256, 15.8093]`，置信度 `low`，DQ 总体 `D`
- 阶段：`agriculture 10.6685 [13.3356, 15.4693]`、`cooking 0.15 [0.2175, 0.255]`、`packaging 0.05 [0.0725, 0.085]`
- 因子引用含 `factor_id/stage/source_name/source_url/license/dq/valid_from/valid_to`，附口径说明与免责声明。

错误：400 `INVALID_PAYLOAD`（品类码/单位非法）；404 `FACTOR_NOT_FOUND`（无可用因子，不给估算）；503 `LCA_ENGINE_ERROR`。

### 4.5 POST /compare

请求体：`{ "items": [{ "label", "category_id", "attributes", "quantity", "unit" }], "alternatives" }`。

实测牛肉 vs 素食（`compare_valid.json`）：

| index | label | 足迹 kgCO2e | 区间 | DQ |
| --- | --- | --- | --- | --- |
| 0 | 牛肉套餐 | 10.8685 | [13.6256, 15.8093] | D |
| 1 | 素食套餐 | 1.1839 | [1.5199, 1.7667] | D |

- `overlap=false`：区间不重叠；引擎在重叠时置 `true`，caveats 强制「区间存在重叠时不宣称绝对优劣」。
- `ranking` 按足迹升序（素食 `score=0.8911`）；`five_r` 返回 Refuse/Reduce/Reuse/Recycle/Rot 适用项与建议；`alternatives` 透传。
- 少于 2 项：400 `INVALID_PAYLOAD`；因子缺失：404 `FACTOR_NOT_FOUND`；上游错误：502 `UPSTREAM_ERROR`。

### 4.6 POST /commitment

请求体：`session_id, commitment_text(≤300), category_id, alternative, barrier, plan, self_efficacy(1–5), follow_up_days(1–90), consent`。

- 同意（`consent=true`，`commitment_consented.json`）：返回 `commitment_id`、`created_at`、`follow_up_due`（+7 天）、`status=active`、`consent_recorded=true`。
- 未传同意（`commitment_no_consent.json`）：本地登记，`consent_recorded=false`，不上报试点研究库；`follow_up_days=14` 对应 +14 天截止日。
- `self_efficacy=9`：400 `INVALID_PAYLOAD`（`commitment_invalid.json`）。

## 5. 错误码与 HTTP 映射（§3.2）

| HTTP | code | 触发 |
| --- | --- | --- |
| 400 | `INVALID_PAYLOAD` | 请求体/schema 非法 |
| 401 | `SESSION_REQUIRED` | 会话令牌缺失/失效（网关层缺 Authorization 头返回 `UNAUTHORIZED_NO_AUTH_HEADER`） |
| 403 | `TOPIC_BLOCKED` | 命中硬敏感话题守卫 |
| 404 | `PRODUCT_NOT_FOUND` / `FACTOR_NOT_FOUND` | 产品无匹配；品类无因子 |
| 429 | `RATE_LIMITED` | 限流（带 `retry_after`） |
| 502 | `UPSTREAM_ERROR` | 外部源错误 |
| 503 | `LLM_UNAVAILABLE` / `SPEECH_UNAVAILABLE` / `LCA_ENGINE_ERROR` | 上游不可达 |
| 504 | `UPSTREAM_TIMEOUT` | 外部源超时 |
| 500 | `INTERNAL` | 未捕获异常 |

统一错误体：

```json
{ "error": { "code": "INVALID_PAYLOAD", "message": "...", "details": [{ "field": "...", "reason": "..." }], "retry_after": null } }
```

## 6. CORS 验证

对 6 个函数分别发送 `OPTIONS` 预检（带 apikey + Bearer publishable key），实测均为 **204**，响应头：

- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type, x-session-id`
- `Access-Control-Allow-Methods: GET, POST, OPTIONS`

POST/GET 正常响应同样携带 `Access-Control-Allow-Origin: *`。

## 7. RLS 验证结论（匿名角色）

迁移 `0001_init.sql` 已在云端生效；匿名角色实测（publishable key，未登录用户）：

| 表 | 策略 | 匿名 SELECT 实测 | 结论 |
| --- | --- | --- | --- |
| `products` | 公开读 | 200 `[]`（本地快照当前为空） | 参考表匿名可读 ✔ |
| `emission_factors` | 公开读 | 200 `[]`（因子随代码包发布，DB 快照为空） | 参考表匿名可读 ✔ |
| `commitments` | `auth.uid() = profile_id` | 200 `[]` | 个人表匿名读为空集 ✔ |
| `footprint_events` | `auth.uid() = profile_id` | 200 `[]` | 个人表匿名读为空集 ✔ |
| `reflection_diary` / `conversation_logs` | 同个人表策略 | 策略已启用 | 与上述个人表一致 ✔ |

匿名直连 REST 写入被 RLS 拒绝（`rls_commitments_anon_write.json`）：

- HTTP 401，Postgres 错误 `42501 new row violates row-level security policy for table "commitments"`。

函数侧写入路径：Edge Function 使用平台注入的 service role 在服务端插入（`profile_id=null` 的离线演示记录）；这些记录对匿名 REST 仍不可见（实测 `commitments` 匿名 SELECT 为 `[]`，与函数写入两条演示承诺不冲突）。

## 8. Mock / 离线模式说明（无 LLM/TTS 密钥完整跑通）

- **LLM**：`createLlmAdapter({}, env)` 在 `LLM_PROVIDER` 为空时返回 `MockLlm`。`/chat` 的 demo 脚本按消息意图声明工具调用（对比餐食 → `calculate_footprint` + `compare_alternatives`），由真实数据引擎出结果；无网络、无密钥。
- **TTS**：`createResilientTts({}, env)` 在火山凭证不全时返回 `NoTTS`；`/tts` 返回 `available=false` 与字幕文本，前端隐藏语音控制、保留字幕与振幅口型降级。
- **产品**：OFF 不可达时函数回退本地快照；本地为空则返回结构化未命中引导，不阻塞对话。
- **LCA/对比**：纯本地纯函数，离线可重复计算。

## 9. 已知限制与遗留

1. **chat 内 `calculate_footprint` 工具结果被来源白名单守卫拦截**：`packages/data` 首批食品因子来源域名（ourworldindata.org、nems.nih.gov、oregon.gov）不在 `packages/core` 冻结的 `SOURCE_DOMAIN_WHITELIST` 内，`validateToolResult` 判定 `INVALID_PAYLOAD`（实测 `chat_valid.json` 中该工具 `ok=false`）。守卫属冻结契约，本次未改动；直接调用 `/lca` 绕过工具结果守卫，返回完整数据卡。后续需在 core 白名单补登这些来源域名，或将因子来源替换为已登记域。
2. **DB 参考快照为空**：`products` / `emission_factors` 表当前无种子行；因子库随 `@socrates/data` 代码包发布，OFF 代理在线可用。
3. **对比 caveats 重复**：`compareFootprints` 对每个 item 追加阶段备注，两端点响应中同一备注出现两次；为 data 包既有行为，未在函数层去重。
4. **网关鉴权**：Edge Runtime 开启 JWT 校验，无 Authorization 头访问返回 401 `UNAUTHORIZED_NO_AUTH_HEADER`；匿名演示使用 publishable（anon）角色头，不要求登录用户 JWT。
5. `/product` 本地快照为品类文本匹配；`packaging_reusable` 等非代码品类码仅作为对比备选标签透传，不参与因子计算。

## 10. 复现步骤

```powershell
# 1. 打包 core/data 为 Deno ESM（产物写入 supabase/functions/<name>/index.ts）
pnpm --filter @socrates/supabase functions:bundle

# 2. 部署（CLI v3.1.0；token 通过环境变量，不写入源码）
$env:SUPABASE_ACCESS_TOKEN = "<personal access token>"
supabase functions deploy chat tts product lca compare commitment --workdir packages/supabase --yes

# 3. 匿名真实 HTTP 自测（结果写入 test-evidence/）
pnpm --filter @socrates/supabase test:http
```

CLI 可执行文件：`C:\Users\biyyl234\devtools\supabase\supabase.exe`；本地 esbuild 0.21.5（仓库 `node_modules/.pnpm` 内，未新增依赖）。
