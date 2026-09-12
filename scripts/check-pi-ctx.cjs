#!/usr/bin/env node
/**
 * pi CLI 集群上下文校验（防 1M 复发回 128K）
 *
 * 背景：2026-09-12 某外部写入把 C:\Users\Administrator\.pi\agent\models.json
 * 整体重写成 tuan 全模型 contextWindow=128000（带 BOM），pi 回落默认 128K。
 * 修复：全局 + 7 个 agent 镜像 .pi-agent/models.json 的 Tuan → 1000000，
 *       需重启 MunderDifflin 让 pi worker 重读。
 *
 * 本脚本只read 检测、不改 C 盘：打印全局 + 全部 agent 镜像的 Tuan contextWindow，
 * 任一不是 1000000 时 exit 1（供巡检抓包）。修复动作留给人/agent 决定。
 */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function readTuanCtx(p) {
  try {
    const raw = fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, '');
    const d = JSON.parse(raw);
    const t = d.providers?.tuan?.models?.find((m) => m.id === 'Tuan');
    return t ? t.contextWindow : 'NO-TUAN';
  } catch (e) {
    return `PARSE-ERR ${e.message.slice(0, 40)}`;
  }
}

const rows = [];
const globalPath = path.join(os.homedir(), '.pi', 'agent', 'models.json');
rows.push(['GLOBAL .../.pi/agent/models.json', globalPath]);

const agentsDir = 'D:/MunderDifflin/hive/agents';
for (const a of fs.readdirSync(agentsDir)) {
  const mp = path.join(agentsDir, a, '.pi-agent', 'models.json');
  if (fs.existsSync(mp)) rows.push([`agent/${a}/.pi-agent`, mp]);
}

let bad = 0;
for (const [label, p] of rows) {
  const v = readTuanCtx(p);
  const ok = v === 1000000;
  if (!ok) bad++;
  console.log(`${ok ? 'OK ' : 'BAD'}  ${label.padEnd(30)} Tuan.ctx=${v}`);
}
console.log(bad === 0 ? 'ALL 1M' : `${bad} BAD (need: rewrite Tuan.contextWindow=1000000 + restart app)`);
process.exit(bad === 0 ? 0 : 1);