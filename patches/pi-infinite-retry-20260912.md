# pi 无限重试补丁（tdsh 对齐）— 2026-09-12

## 目的
蜂群（MunderDifflin hive）的 pi agent 在模型 API 报错（401/403/400/配额/余额等）时默认最多重试 3 次就放弃，导致蜂群任务中断。DSH(tdsh) 侧已全改 `retryPolicy mode:always`（无限重试）。本补丁把 pi 改成同样语义：**任何报错无限重试**。

## 补丁位置（全局 npm 包，I 盘）
包：`I:\nodejs\node_modules\@earendil-works\pi-coding-agent`（v0.74.2）
备份：`dist\bundle\chunks\chunk-JVUZSMYM.js.bak-infinite-retry`（原始文件副本）

## 改动明细（bundle：chunk-JVUZSMYM.js，蜂群实际运行路径）
1. `NON_RETRYABLE_PROVIDER_LIMIT_ERROR_PATTERN=buildProviderErrorPattern([...配额/余额关键词...])`
   → `NON_RETRYABLE_PROVIDER_LIMIT_ERROR_PATTERN=/^(?!x)x$/`（永不匹配：配额/余额错误也重试）
2. `RETRYABLE_PROVIDER_ERROR_PATTERN=buildProviderErrorPattern([...白名单...])`
   → `RETRYABLE_PROVIDER_ERROR_PATTERN=/^/`（匹配一切：任何报错都重试）
   ⚠️ 坑：`/.^/` 是"永匹配失败"（字符后跟行首不可能），必须用 `/^/`（行首恒存在，匹配所有字符串包括空串）
3. `retryAssistantCall` 内 `let maxAttempts=policy?.enabled?policy.maxRetries:0`
   → `let maxAttempts=Infinity`（summarization 路径无限）+ delay `Math.min(...,6e4)` 封顶
4. `_prepareRetry`（会话层主重试）：删除 `this._retryAttempt>settings2.maxRetries` 上限分支；delay `Math.min(baseDelayMs*2**(n-1), 6e4)` 封顶 60s；`maxAttempts:Infinity`（JSON 序列化为 null，仅显示用）
5. `_willRetryAfterAgentEnd`：删除 `this._retryAttempt>=settings2.maxRetries` 闸门（保留 `!settings2.enabled` 检查）

## 改动明细（core：agent-session.js，SDK/RPC 路径，belt-and-braces）
- `_isRetryableError` 的正则白名单 → `return true; // tdsh-parity`
- `_handleRetryableError`：删除 maxRetries 超限分支，delay 封顶 60000ms
- `maxAttempts: settings.maxRetries` → `maxAttempts: Infinity`
- 保留：`isContextOverflow` 排除（上下文超限由 compaction 处理，重试无意义死循环）；成功后 `_retryAttempt` 复位逻辑不变

## 配置层（蜂群 7 个 agent 已写入）
`D:\MunderDifflin\hive\agents\*\.pi-agent\settings.json` 增加：
```json
"retry": { "enabled": true, "provider": { "maxRetries": 1000000, "maxRetryDelayMs": 60000 } }
```
- `retry.provider.maxRetries`：HTTP 层（retryProviderRequest，chunk-XNGRGP62.js）每次请求内重试上限，设 100 万（近无限；该层无 Infinity 处理，100 万次 × 60s 封顶已等效无限）
- 会话层上限已由源码补丁改 Infinity，无需配置
- settings 读取链：`getAgentDir()` ← `PI_CODING_AGENT_DIR`（hive.ts installPiHooks 设置为每 agent 的 `.pi-agent` 目录）→ merge(global settings.json, project settings.json)

## 实测证据（2026-09-12，tuan 端点 + 无效 key → 401）
- 旧行为：401 不在白名单正则 → 0 次重试直接失败
- 新行为（150 秒实测）：连续重试 7 次，进程 150s 仍存活继续重试
- 退避序列：2000→4000→8000→16000→32000→**60000→60000**（封顶正确生效）
- `node --check` 两个补丁文件语法均通过

## 生效边界
- 运行中的 7 个 pi 进程是旧代码（spawn 时已加载 bundle），补丁对**新 spawn** 生效
- 蜂群 worker 断线重连/新回合不重启进程 → 需要自然更替或用户重启应用后全部生效
- npm 升级 pi 包会覆盖补丁 → 重跑本文件中的替换（保留 bak 原件可 diff）

## 再生脚本（升级后重打补丁）
```powershell
$f='I:\nodejs\node_modules\@earendil-works\pi-coding-agent\dist\bundle\chunks\chunk-JVUZSMYM.js'
$c=[IO.File]::ReadAllText($f)
# P1+P2+P3a+P3b+P4+P5 替换（见上文 6 处字符串对），每处用 $c.Contains() 校验后 Replace
[IO.File]::WriteAllText($f,$c,[Text.UTF8Encoding]::new($false))
node --check $f
```
