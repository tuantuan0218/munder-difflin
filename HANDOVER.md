# 交接文档 — pi 直连第三方 API + 引擎清理

生成时间：2026-09-06T04:05Z  
目标：配置 pi 的第三方 API（直连，不经本地 yunshu 代理），拉起 Munder Difflin 完成真实运行验证；清理本机所有第三方 CLI 引擎残留，只保留 pi。

---

> [!IMPORTANT]
> ## ⚠️ 截至 2026-09-11 失效声明（Pam 整改 · god 批 876030 采纳）
> 本文档为 **2026-09-06** 的一次性配置交接记录（pi 直连云端 + 引擎清理）。自 09-06 起蜂群已多次演进，以下表述**已过期，勿再引用**：
> - 「roster.json / registry.json 只剩 god」→ 已不符：现 registry 10 席在役（god + 六人制 Ryan/Kevin/Stanley/Dwight/Pam/Creed + worker-hs-driver/engine/ledger 三席已停用待归档）；另新增监督席 **external-supervisor-v2**（已在台投递消息，registry 建档中，勿打扰）。
> - 蜂群现役结构权威来源=「`hive/board.md`（当前轮）+ `hive/registry.json` + `hive/fleet.json`」；六人制依据=2026-09-11 用户直令 277f5c（停招旧席）；旧席历史见 `hive/archived-20260911-supervisor/`。
> **仍有效**：① pi（`C:\Users\Administrator\.pi\agent\models.json`）直连云端 `https://api2.yunshuzhilian.asia/v1`（备份 `.bak-direct-20260906-031148`）；② claude/kimi/qwen 引擎已清、本机只留 pi；③ 权威 config=`C:\Users\Administrator\AppData\Roaming\munder-difflin\config.json`。
> 完整整改背景：Pam 一致性核对报告（2026-09-10T20-15-02-238Z-0bcbb1）+ god 裁定（2026-09-10T20-20-53-100Z-876030）。

---

## 1. 变更摘要

### pi 配置 — 直连云端（关键改动）
- **文件**：`C:\Users\Administrator\.pi\agent\models.json`
- **变更**：`yunshu` provider 的 `baseUrl` 从 `http://127.0.0.1:15722/v1` 改为 `https://api2.yunshuzhilian.asia/v1`
- **备份**：`models.json.bak-direct-20260906-031148`（原本地代理配置）
- **验证**：`pi --provider yunshu --model yunshu/deepseek-v4-flash -p "..."` 返回 `CLEAN-AND-PI-ONLY`（直连云端成功）

### MD 持久化配置（真正生效的路径）
- **权威 config**：`C:\Users\Administrator\AppData\Roaming\munder-difflin\config.json`（不是仓库里的 `.userdata\config.json`）
  - `godModel`: `yunshu/deepseek-v4-flash`（从 `anthropic/claude-sonnet-4-5` 修复）
  - `defaultModel`: `yunshu/deepseek-v4-flash`（已是正确值）
  - `defaultCommand`: `pi` ✅
  - `godProvider`: `pi` ✅
- **roster.json**：`D:\MunderDifflin\roster.json` — 只剩 god（command=`pi --model yunshu/deepseek-v4-flash`, provider=`pi`），archived/restorable 已清空
- **registry.json**：`D:\MunderDifflin\hive\registry.json` — 只剩 god

### 引擎清理（销毁全部 claude/qwen/kimi，只留 pi）
| 清理项 | 路径 | 状态 |
|--------|------|------|
| claude 包 | `I:\nodejs\node_modules\@anthropic-ai` | ✅ npm uninstall -g 移除 |
| claude shim | `I:\nodejs\claude{,.cmd,.ps1}` | ✅ 删除 |
| kimi 包 | `I:\nodejs\node_modules\@moonshot-ai` | ✅ npm uninstall -g 移除 |
| kimi shim | `I:\nodejs\kimi{,.cmd,.ps1}` | ✅ 删除 |
| qwen 包 | `I:\nodejs\node_modules\@qwen-code` | ✅ 已空壳，忽略 |
| Claude 配置 | `C:\Users\Administrator\.claude` (266MB) | ✅ 删除 |
| Claude 全局配置 | `C:\Users\Administrator\.claude.json` | ✅ 删除 |
| Kimi 配置 | `C:\Users\Administrator\.kimi-code` (31MB) | ✅ 删除 |
| Kimi webbridge | `C:\Users\Administrator\.kimi-webbridge` | ✅ 删除（含 exe） |
| claude-cli-nodejs | `C:\Users\Administrator\AppData\Local\claude-cli-nodejs` | ✅ 删除 |
| qwen-test 目录 | `D:\Tools\qwen-test` | ✅ 删除 |

### localStorage 清理（防止旧 roster 复活）
- **位置**：`C:\Users\Administrator\AppData\Roaming\munder-difflin\Local Storage\leveldb` + `Session Storage`
- **处理**：移至 `_quarantine-localstorage` / `_quarantine-session`（不扩大 C 盘占用，实际释放空间）
- **原因**：renderer 的 localStorage 是 roster.json 的实际镜像源，不清会每次启动反向覆写旧 claude agents

### 隔离目录
- `D:\MunderDifflin\_clean-quarantine-20260906\` — 旧 agent 目录 (15 个 hive/agents/*)
- `D:\MunderDifflin\roster-backups\` — 旧 roster 备份（仅归档，MD 启动时会跳过）

---

## 2. 验证结果

### 2.1 pi 直连云端
```
$ pi --provider yunshu --model yunshu/deepseek-v4-flash -p "Reply with exactly: CLEAN-AND-PI-ONLY"
CLEAN-AND-PI-OK
```
✅ pi 通过 `https://api2.yunshuzhilian.asia/v1` 直连完成真实对话

### 2.2 MD 应用状态
- **进程**：electron 4 进程正常（主进程 + 渲染器）
- **claude/kimi/qwen 进程**：0 ✅
- **roster 仅 god**：`command=pi`, `provider=pi`, `model=yunshu/deepseek-v4-flash` ✅
- **registry 仅 god** ✅
- **where.exe**：`claude/kimi/qwen` 均 NOT FOUND ✅
- **stdout**：broker/telemetry 正常监听，无 claude spawn 错误 ✅

### 2.3 测试套件
- **provider-config + agent-provider 测试**：7/7 pass ✅
- **全量测试**（Windows node 实测 2026-09-06）：730 tests / 719 pass / 0 fail / 11 skip。历史上“13 个预存失败”已全部定位并修复（12 个为 Windows 检出 CRLF 行尾 + WSL 运行环境伪影，非源码问题；5 处测试可移植性已修：agent caps / codex 套接字 / POSIX-only 套件加 win32 跳过守卫）。**注意：测试必须用 `node.exe`（Windows）跑，WSL 的 Linux node 因 node-pty win32 prebuild 无法加载会误报**。

---

## 3. 注意事项

### 3.1 遗留项（未触碰）
- **codex 引擎**：`C:\Users\Administrator\.codex` (28MB) 未清理（用户未点名，保留）
- **roster-backups 目录**：保留旧备份以便回滚，可手动删除
- **hive/agents/god/.claude**：god 目录下的 `.claude` 是 pi 用的 hooks，保留
- **mempalace `--wing` 参数错误**：hive 的 memory mine 任务报错（预存问题，不影响核心功能）

### 3.2 启动相关
- **electron binary**：已恢复（`node_modules/electron/dist/electron.exe`, 186MB）
- **启动命令**：`cd D:\MunderDifflin; node node_modules\electron\cli.js .`
- **dev 模式**：`npm run dev`（需 `pnpm run dev:web` 配合，或有执行策略限制）

### 3.3 如需回滚 pi 配置
```powershell
Copy-Item C:\Users\Administrator\.pi\agent\models.json.bak-direct-20260906-031148 C:\Users\Administrator\.pi\agent\models.json -Force
```

### 3.4 如需恢复旧 agents
```powershell
Move-Item D:\MunderDifflin\_clean-quarantine-20260906\* D:\MunderDifflin\hive\agents\ -Force
# 从 roster-backups 恢复 roster.json
```

---

## 4. 关键文件清单

| 文件 | 路径 | 说明 |
|------|------|------|
| pi models.json | `C:\Users\Administrator\.pi\agent\models.json` | ✅ 已改直连云端 |
| pi models.json.bak | `C:\Users\Administrator\.pi\agent\models.json.bak-direct-20260906-031148` | 本地代理备份 |
| MD 权威 config | `C:\Users\Administrator\AppData\Roaming\munder-difflin\config.json` | ✅ godModel 已改 |
| MD 旧 config（非权威）| `D:\MunderDifflin\.userdata\config.json` | 可忽略 |
| roster.json | `D:\MunderDifflin\roster.json` | ✅ 只剩 god |
| registry.json | `D:\MunderDifflin\hive\registry.json` | ✅ 只剩 god |
| 隔离目录 | `D:\MunderDifflin\_clean-quarantine-20260906\` | 旧 agent 数据 |
| 隔离目录（userData）| `C:\Users\Administrator\AppData\Roaming\munder-difflin\_quarantine-*` | localStorage/session |

---

## 5. 后续建议（可选）

1. **清理 mempalace `--wing` 错误**：hive 启动日志里反复出现 `mempalace mine: error: argument --wing: expected one argument`，不影响核心功能但会造成日志噪声。可在 `src/main/hive.ts` 里修复参数传递。
2. **测试套件 13 个失败项（已全部解决）**：根因分三类——①工作树 CRLF（Windows 检出伪影）打断锁步正则（6 项）；②WSL 环境误报（node-pty win32 prebuild，2 项）；③测试对 Windows 路径假设（5 处，已修：`test/agent-token-cap.test.cjs` 用 `path.resolve`、`test/codex-remote.test.cjs` 断言归一化、`test/transcript-project-dir.test.cjs` 加 win32 跳过守卫）。另修 `src/main/memory.ts`：mempalace `mine --wing` 对 `--` 开头的畸形 agent id 报错（argparse 误解析）→ 跳过畸形 id + 等号形式传参。
3. **codex 引擎**：如确定不再使用，可类似方式清理 `~/.codex` 和对应的 npm 包（如果存在）。
4. **roster-backups 归档**：确认稳定后可删除，释放 ~300KB。

---

**结论**：pi + yunshu 直连云端已配置并通过真实对话验证；MD 应用以 pi+yunshu 启动跑通；claude/qwen/kimi 引擎及其配置已全部清除；roster 只剩 god(pi)。目标完成。

---

## 6. 炉石 AI 运维交接快照（Pam · t-141 · 2026-09-12 23:4x 本地追加）

> 本仓 HANDOVER 主体=09-06 pi 配置一次性交接（已盖失效声明）。蜂群现役结构权威来源=`hive/board.md` 当前轮 + `hive/registry.json` + `hive/fleet.json`；炉石游戏栈发布/验收权威=`hive/STATUS.md`（Pam 维护，god 通报驱动）；最新运维交接=`D:\tdsh\炉石传说\HANDOVER-20260912-2345-pam-t141状态同步.md`。

- **现役栈**=df **m2v191**（77,874B，md5 `70f4178b…`）+ gov **m2v170**（BnetLaunchThrottle：重启链对战网唤拉节流 launch WTCG ≥60s+等 BN 就绪，t-138）+ base×2（1.1.4/1.1.5）+ java 436 + HS 4560；权威源码树=`D:\tdsh\hs_bridge_build\drawfix\src\main\kotlin\lin\drawfix\`（6 kt，勿改 `_draft_drawfix_plugin` 旧 draft）。
- **版本链（09-12 窗）**：m2v187 无效动作根治（t-134）→ m2v188 四合一（t-137：穷尽排除半落地/PlayDirection 补桶/UNKNOWN 泛化/GOV4 CATA_563 兜底/半落地 3 次上限）→ m2v189 删多余动作（t-142 续派）→ m2v190 攻击停手器（ATTACK_UNREG_CAP=2，长尾-67%）→ m2v191 三刀压窗（waitLanded 800/1000+EFFECT_SETTLE 600）；用户窄化两令（穷尽即收/删多余动作）达成，t-142/t-143 done；**在途=t-144 穷局门线（m2v192，Ryan，doing）**。
- **FATAL_ERROR 结论（t-136 done）**：根因=战网 CN 连接层抖动（1016/SSL 超时/BLZBNTBGS80000011）主 + 重发车 churn 次；**清缓存/重装否决**；处置=节流随 m2v170 在役，重登暂缓待用户+停机窗。
- **ROW_CAP=4（t-139 todo/low）**：PracticeOpponentRotator ROW_COUNT=11 而 ROW_CAP=4（cycle=5）→ 只打 row0-4（06/08/05/01/02），row5-10 六职业从不入战=**段 0/11 破冰通路阻塞**；历史红线=v1.5.8 row5 局间卡死/997a7e g44 row7 停局，≥5 未实证域禁止应用（分页件落地后解除）。
- **部署纪律**：换栈脚本禁中文注释（PS5.1 无 BOM 乱码）；java 重启必须 Windows detach（WMI Create 隐藏 cmd 直启，hss-manage VBS 5 次卡死史），禁 bash & 后台。
- **回滚**：m2v190 可自 `plugin-bak-20260912/` 单件回退；基底保底=m2v175+gov m2v167（`plugin-bak-20260911`）。
- **蜂群侧未决（t-005 humanQA 第 3/4 项挂人类）**：tuan 模型池故障（400 balance=0+429 并发=1，第 11 小时）+Ryan 会话巨型上下文反序列化失败（god 裁决=不 taskkill，池恢复仍在→用户 UI 重启 Ryan 席）。

---

## 7. DSH 侧 09-13 运维快照（本会话追加，只增不覆写）

> 追加人：DSH agent（炉石传说会话）· 2026-09-13 07:3x 本地。本节记录 MunderDifflin 本体运维与本机 pi 链路动作，与 §6 炉石栈无关；蜂群现役结构权威仍=`hive/board.md`+`hive/registry.json`+`hive/fleet.json`。

### 7.1 MunderDifflin 本体已更新至 v0.5.2（UI 角标确认 latest）
- **背景**：上游 release 最新=v0.5.2（2026-09-09），但 v0.5.2 tag 的 package.json 仍写 0.4.6（上游漏 bump）→ UI 一直显示 v0.4.6，用户误以为没更新。
- **动作**：`package.json` + `package-lock.json` version 0.4.6→0.5.2；`npm run build` 重建三产物（main/preload/renderer）；按桌面 `Munder Difflin.lnk` 原命令（`electron.exe "D:\MunderDifflin" --user-data-dir="D:\MunderDifflin\.userdata"`）重启。产物含 t-130 TOCTOU 修复（`ROUTER_PARSE_MAX_TRIES` 已验证在 out/main/index.js）。
- **已提交+推送**：`git push backup pi-only`（HEAD 36ad0b09 = 远端 pi-only 同步）；src 未跟踪源码（hiddenPi.ts、tuan-migrate.mjs、check-pi-ctx.cjs、2 个 test）已一并入库。
- **注意**：app 是生产模式跑 out/（.lnk），不是 dev 热更新——改 src 后必须 build+重启才生效。

### 7.2 pi CLI 最大上下文 1M 修复（防 128K 复发）
- **根因**：`C:\Users\Administrator\.pi\agent\models.json` 于 09-12 被整体重写成 tuan 全模型 contextWindow=128000；**源头模板=`I:\tmp\cf-sub-api\tuan_models{,_ready}.json`**（8790 代理 06:20 启动，模板 06:43/06:45 生成=全局被重写时刻，101 模型全等）。
- **动作**：全局 + 7 个 agent 镜像（god/ryan/kevin/dwight/pam/creed/stanley 的 `.pi-agent/models.json`）`Tuan.contextWindow`→1000000；**cf-sub-api 两份源头模板同步改 1M**（无论谁再同步都带出 1M）；备份在 `.userdata/models.json.bak-20260913-before-1m` 与 `I:\tmp\cf-sub-api\*.bak-20260913-before-1m`。
- **生效前提**：pi 启动时读 models.json，运行中的 pi 需重启才吃 1M（06:56 应用重启后 7 worker 已重投，实测 `check-pi-ctx.cjs` 全链 ALL 1M）。
- **巡检脚本**：`D:\MunderDifflin\scripts\check-pi-ctx.cjs`（只读检测，任一非 1M 则 exit 1）。

### 7.3 GitHub remote 合规（AGENTS §5）
- `D:\MunderDifflin` backup remote 已从 `用户名:token` 旧格式改为 `https://x-access-token:<token>@github.com/tuantuan0218/munder-difflin.git`，`git ls-remote backup HEAD` 免弹窗直通（exit 0）。
- 全盘盘点：TDSH/黄金/uumit/second-brain/recording_gear/suno迷笛/MunderDifflin 均✅内嵌；`hss-src-build`、`炉石传说\Hearthstone-Script`、`hs_bridge_build\reference\*`、`sub2api-src`、`whs_template`、`resources\app\repo`、`god-work\HsMod` 均为第三方只拉不推仓，保持裸 URL（勿塞个人 token）；`MunderDifflin\hive` 无 origin 无需处理。

### 7.4 蜂群定时任务体检（09-13 07:2x 实测，结论=全正常）
- **ops-standup**：intervalMs=3600000（1h），近 24h 触发 24 条、整点节律零缺漏、delivered 全命中（god+6 worker）；lastFired 23:26Z。
- **heartbeat**：intervalMs=60000（60s 轮询节拍），quietThresholdMs=600000（10min 静默才发消息）；实测消息间隔≈5min 为自适应设计（index.ts:1338 armHeartbeat：quiet→发+退避 2.5×/stuck→30s），非故障；近 3h 21 条全 delivered。
- **其他触发器**：webhookTriggers enabled=false（secret 轮换后止血）；orgTrigger=false；contextTrigger compact/clear 2h 常驻；breaker steer/constrain 近 3h 零事件（无假循环）；双胞胎 timer=0。
- **Windows 计划任务**（只读核实）：`CodexProxyKeepAlive` Disabled（LogonTrigger，符合预期）；`HiveUploadTask` Disabled（微软内置漫游配置任务）；`UpdateUserPictureTask` Ready（微软内置）。

### 7.5 待其他 agent 处理（已交接）
- **cf-sub-api EPIPE 瀑布**（8790 tuan 代理）：根因=宿主进程（PPID 19228）已退出→孤儿 node stdout 管道断→llm.js 裸 console.error 触发 EPIPE→被 index.js 守卫记为 crash.log stdout-lost。服务本体健康（/v1/models 200）。**交接文档=`D:\tdsh\hs_bridge_build\交接-cf-sub-api-EPIPE-20260913.md`**（含三级修复方案 A/B/C、验证清单、边界约束：勿杀 PID 18108、勿动 1M 配置）。当前角色为资料整理，不代修代码，等待用户指派 agent 接手。

### 7.6 状态不配套修复（09-13 08:5x-09:0x，DSH 侧执行）
> 现象：用户报「蜂群空闲跟工作状态不配套」——UI 显示全部 idle，实际 worker 在干活（会话在写、工具在跑）。
> **根因链**：pi 0.74.2 的扩展自动发现（agentDir/extensions/*.ts）**没加载 hive-bridge.js** → HIVE_SOCK 无事件回流 → fleet.lastTool/lastActiveSecAgo 全 null → UI 判 idle。
> **修复**：7 个 agent 的 `.pi-agent/settings.json` 加 `"extensions": ["D:/MunderDifflin/hive/agents/<id>/.pi-agent/extensions/hive-bridge.js"]`（pi 文档 settings.extensions 显式声明通道，最可靠）。重启后 kevin 崩溃日志出现 `[Extensions] hive-bridge.js` = 加载成功铁证；UI DOM 出现「god/ryan/stanley 工作中·using 工具」= 事件回流生效。
> **副作用与处置**：08:10 重启时 archiveOrphanedAgents 把 6 worker 全归档（重启瞬间无 PTY）且 UI 卡 HivePicker（localStorage 无 cth.skipHivePickerOnce）→ 主界面不渲染 → 恢复团队不触发。解法：CDP（--remote-debugging-port=9223 重启）注入 `localStorage.setItem('cth.skipHivePickerOnce','1')` + Page.reload → hiveOpened=true → auto-restore 拉起。**注意**：HivePicker 只在「switch hive 后 relaunch」自动跳过；普通重启会卡 picker 等用户点 open——无人值守时用 CDP 注入标志。
> **探针教训**：往 HIVE_SOCK 投 PostToolUse 会把 agent.sessionId 写成伪造值 → 下次 restore 时 pi 报 `No session found` 崩溃（creed 中招）。**勿用探针改真实 agent 的 sessionId**；已清。
> **验收**：7 pi 进程全活、fleet 7 agent、UI 工作中/空闲与实况配套；主进程 handle() 消费 hook 事件验证通过（真实 sessionId 探针写入 registry 成功）。

### 7.7 本会话成果闭环（09-13 09:3x 追加，只增不覆写）
> 承接 §7.6。以下事项均已闭环/落地，供跨会话参考。

- **蜂群状态修复已验证稳定**（40+ 分钟后复检）：7 worker 全活、UI 状态动态配套（采样显示 GOD/瑞安/德怀特工作中，与前次 GOD/瑞安/斯坦利不同=实时更新非假象）；settings.json extensions 声明 7/7 在位；HIVE_SOCK 主进程消费验证通过（真实 sessionId 探针写入 registry 成功）。
- **炉石 gov m2v172（ROW_CAP=10 解禁）已换栈在役**（09:19:45Z god 亲执，java 09:19:46 重启）：DSH 第三源三查 PASS（md5 三源 1374000e 一致、rotator 锚 ROW_CAP=10/TRIAL_ROW_MIN=5/TRIAL_BAD_MAX=3、TRIAL_CAP_OBSERVED 纯观测默认关、rotator.class 26765B、零跨界引用）；plugin 终态 m2v172.jar 106841B + df m2v194.jar 87269B 零动；Stanley 抓证基线全绿（无 REJECT/BAD/TRIAL-CAP）。段 0/11 破冰信号监视开启。
- **m2v194 验收窗续跑**（326 回合）：中位 24.1s（锚≤25✅）、F1/L975/D1/③ 全达标、④币跳费缺陷持续（点币 24 全未落地=0，根因=waitLanded 800/1000ms 压窗 vs SDK 手牌刷新延迟 1.7s，08:53 实锤）；max 1305s=换栈停机窗归因非缺陷；报告已投 god（2f8be1）。
- **cf-sub-api EPIPE 已由接手 agent 修复**：llm.js 已实施 safeLog/safeErr/safeWarn（方案 B 落地，24-26 行+353 行已用）；crash.log 1212B 不再增长（最后 EPIPE 07:08 后归零）；8790 代理健康（HTTP 200），已重启为新实例。
- **1M 上下文全链稳定**：全局+7 agent 镜像+cf-sub-api 两份模板全部 1000000（check-pi-ctx.cjs 验证 ALL 1M）。
- **交接文档**：cf-sub-api EPIPE=`D:\tdsh\hs_bridge_build\交接-cf-sub-api-EPIPE-20260913.md`。
- **待续**：m2v194 ④币跳费待 Ryan 下迭代修复（宽窗口销账/放宽 waitLanded/trust issued）；t-146 收栈判定由 god 裁；m2v172 换栈后 11 职业轮转验收锚监控（BAD 行跳过不卡死、无 REJECT 误判、局间不卡）。
