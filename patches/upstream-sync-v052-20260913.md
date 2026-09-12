# 上游同步 v0.5.2 + fork 备份通道 — 2026-09-13

## 目的
用户令「更新 munder difflin，它更新了」。本文件记录同步事实、备份通道变更、以及**是否需重启**的判定依据，供跨会话免重复调查。

## 同步事实（第一性原理核实，非猜测）
- 上游 `origin/main` 领先旧基线 26 个 commit，官方 GitHub latest release = **v0.5.2**（2026-09-09 发布，API 核实）。
- **这 26 个 commit 零触碰 `src/` / `package.json` / `out/`**（`git log pi-only..origin/main -- src/` 输出为空）——全部是 blog 文章、官网页面、CI 工作流、捐赠墙内容。
- 本地合并前基线 `3e4f9f62` 的 `src/` 与 `v0.5.2` tag 的 `src/` **逐字节一致**（`git diff 3e4f9f62 v0.5.2 -- src/` 为空）→ v0.5.2 的应用代码早就在本机运行。
- 版本号显示 `0.4.6` 是**上游自己的疏忽**：v0.5.2 tag 内的 `package.json` 也是 0.4.6（未 bump）。勿以版本号判断新旧。

## 操作序列（可复现）
```powershell
git -C D:\MunderDifflin fetch origin --tags
git -C D:\MunderDifflin merge origin/main --no-edit   # ort 策略，零冲突
git -C D:\MunderDifflin push backup pi-only:pi-only    # 静默，无弹窗
```
- 合并提交 `3d347130`；本机定制正式提交 `c28e583e`（`tuan/Tuan` reflect 兜底 + README 炉石运维指针）。
- 本机 3 个补丁（`2372d463` breaker/reflect、`f8b5b7ac` TOCTOU retry、`04c85bd0` 补丁注记）零丢失。
- 验证：`node test\breaker.test.cjs` 全绿；`git rev-list --left-right --count origin/main...HEAD` = `0 4`。

## 备份通道变更（修「每次备份弹认证框」）
- **病根**：`origin` = `chaitanyagiri/munder-difflin`（上游公共仓库），本机账号 `tuantuan0218` **无写权限（403）**；全局 `credential.helper=manager` 每次 push 弹认证框，认证完照样被拒。
- **修法**：新增 `backup` remote 指向用户自己的 fork `tuantuan0218/munder-difflin`，PAT 内嵌于**仓库本地** `.git/config`（D 盘，不写 C 盘），并设：
  - `remote.pushdefault=backup`
  - `branch.pi-only.remote=backup`
  - 仓库级 `credential.helper=""`（覆盖全局 manager → 不再弹窗）
- 以后备份一律 `git push backup <branch>`，静默直达。origin 仅保留 fetch 用途。

## 是否需重启？→ **不需要**
1. 本次同步对 `src/` 零改动（见上），无新代码可生效；
2. 运行中的应用加载的是构建产物 `out/main/index.js`（2026-09-12 04:12 构建，晚于全部 `src/*.ts` mtime），且产物中已含 `tuan/Tuan` 与 `runHiddenPi`（grep 证实）；
3. 合并后只读巡检：electron 4 进程存活、日志无错误、`roster.json` 持续新鲜写入 → 蜂群无感。
**规则**：判断要不要重启，看 merge 是否碰 `src/`（碰了才需 rebuild+重启，且须经用户点头，勿打断在跑回合）。

## 状态快照
| 项 | 值 |
|----|----|
| 分支 | `pi-only`（ahead origin/main 4 / behind 0） |
| HEAD | `c28e583e` |
| fork 备份 | `refs/heads/pi-only` = `c28e583e`（ls-remote 核实一致） |
| 工作树 | 干净（未跟踪项为蜂群运行时数据，勿提交） |
