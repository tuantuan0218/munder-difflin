// 蜂群 API 迁移：yunshu -> tuan
// 1. 每个 agent 的 .pi-agent/models.json：providers 替换为 tuan
// 2. 全局 ~/.pi/agent/models.json：同上
// 3. MunderDifflin config.json：godModel/defaultModel -> tuan/Tuan
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import os from 'node:os';

const TUAN = {
  name: 'Tuan',
  baseUrl: 'http://192.168.1.3:8090/v1',
  api: 'openai-completions',
  apiKey: 'sk-d715fbcc419d64b41280b96aaca04ee8dc8543ee2d35ae265e3cfc1568100e21',
  compat: {
    supportsDeveloperRole: false,
    supportsReasoningEffort: true,
    thinkingFormat: 'deepseek',
    maxTokensField: 'max_tokens',
    requiresReasoningContentOnAssistantMessages: true,
  },
  models: [
    {
      id: 'Tuan',
      name: 'Tuan',
      reasoning: true,
      input: ['text'],
      contextWindow: 1000000,
      maxTokens: 8192,
    },
  ],
};

const agentsDir = 'D:/MunderDifflin/hive/agents';
const globalModels = join(os.homedir(), '.pi', 'agent', 'models.json');
const configPath = 'D:/MunderDifflin/.userdata/config.json';

const targets = [];
for (const name of ['god', 'ryan-mtvy0jjp', 'kevin-mtvy14qr', 'stanley-mtvy1opy', 'dwight-mtvy21wj', 'pam-mtvy2g52', 'creed-mtvy2us1']) {
  const p = join(agentsDir, name, '.pi-agent', 'models.json');
  if (existsSync(p)) targets.push(p);
}
targets.push(globalModels);

let ok = true;
for (const p of targets) {
  try {
    const doc = JSON.parse(readFileSync(p, 'utf8'));
    doc.providers = { tuan: TUAN };
    writeFileSync(p, JSON.stringify(doc, null, 1) + '\n', 'utf8');
    console.log('models OK  :', p);
  } catch (e) {
    ok = false;
    console.log('models FAIL:', p, e.message);
  }
}

try {
  const cfg = JSON.parse(readFileSync(configPath, 'utf8'));
  cfg.godModel = 'tuan/Tuan';
  cfg.defaultModel = 'tuan/Tuan';
  writeFileSync(configPath, JSON.stringify(cfg, null, 1) + '\n', 'utf8');
  console.log('config OK  :', configPath);
} catch (e) {
  ok = false;
  console.log('config FAIL:', configPath, e.message);
}

console.log(ok ? 'ALL OK' : 'SOME FAILED');
process.exit(ok ? 0 : 1);
