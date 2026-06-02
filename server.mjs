import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { randomBytes, randomInt } from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3456;

app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.static(__dirname));

// ================================================================
// SYNC DATA STORE (JSON file)
// ================================================================
const DATA_DIR = path.join(__dirname, 'data');
const SYNC_FILE = path.join(DATA_DIR, 'sync.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readStore() {
  ensureDataDir();
  try {
    const raw = fs.readFileSync(SYNC_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { players: {}, codes: {} };
  }
}

function writeStore(store) {
  ensureDataDir();
  fs.writeFileSync(SYNC_FILE, JSON.stringify(store, null, 2));
}

function genId(len = 12) {
  return randomBytes(len).toString('hex').slice(0, len);
}

function genToken() {
  return 'dt_' + genId(24);
}

function now() {
  return Date.now();
}

// ================================================================
// SYNC API
// ================================================================

// 用家庭码加入同步（6位数字，首次输入自动创建）
app.post('/api/sync/join', (req, res) => {
  const { familyCode } = req.body;
  if (!familyCode || !/^\d{6}$/.test(familyCode)) {
    return res.status(400).json({ error: '请输入 6 位数字家庭码' });
  }

  const store = readStore();
  // 使用 familyCodes 索引（兼容旧数据：没有则新建）
  if (!store.familyCodes) store.familyCodes = {};
  const existingPlayerId = store.familyCodes[familyCode];
  const deviceToken = genToken();

  if (existingPlayerId && store.players[existingPlayerId]) {
    // 已有这个家庭码 → 加入
    store.players[existingPlayerId].deviceTokens.push(deviceToken);
    writeStore(store);
    console.log(`[SYNC] 加入: ${existingPlayerId}, 设备数: ${store.players[existingPlayerId].deviceTokens.length}`);
    res.json({ playerId: existingPlayerId, deviceToken, isNew: false });
  } else {
    // 首次使用 → 创建新玩家
    const playerId = 'p_' + genId(16);
    store.players[playerId] = {
      playerId,
      familyCode,
      deviceTokens: [deviceToken],
      data: null,
      updatedAt: 0,
      createdAt: now(),
    };
    store.familyCodes[familyCode] = playerId;
    writeStore(store);
    console.log(`[SYNC] 创建: ${playerId}, 家庭码: ${familyCode}`);
    res.json({ playerId, deviceToken, isNew: true });
  }
});

// 推送数据（全量快照）
app.post('/api/sync/push', (req, res) => {
  const { playerId, deviceToken, data } = req.body;
  if (!playerId || !deviceToken || !data) {
    return res.status(400).json({ error: 'playerId, deviceToken, data required' });
  }

  const store = readStore();
  const player = store.players[playerId];
  if (!player) return res.status(404).json({ error: '玩家不存在' });

  // 验证 deviceToken
  if (!player.deviceTokens.includes(deviceToken)) {
    return res.status(403).json({ error: '设备未授权' });
  }

  const ts = now();
  player.data = data;
  player.updatedAt = ts;
  writeStore(store);

  console.log(`[SYNC] 数据已推送: ${playerId}, 设备数: ${player.deviceTokens.length}`);
  res.json({ ok: true, updatedAt: ts, deviceCount: player.deviceTokens.length });
});

// 拉取最新数据
app.get('/api/sync/pull', (req, res) => {
  const playerId = req.query.playerId;
  if (!playerId) return res.status(400).json({ error: 'playerId required' });

  const store = readStore();
  const player = store.players[playerId];
  if (!player) return res.status(404).json({ error: '玩家不存在' });

  res.json({
    data: player.data,
    updatedAt: player.updatedAt,
    deviceCount: player.deviceTokens.length,
  });
});

// 健康检查
app.get('/api/sync/health', (req, res) => {
  res.json({ ok: true, port: PORT });
});

// AI 代理
app.post('/api/chat', async (req, res) => {
  const { text, apiKey } = req.body;
  if (!text || !apiKey) return res.status(400).json({ error: 'text and apiKey required' });

  const body = {
    model: 'MiniMax-M2.7-highspeed',
    max_tokens: 500,
    system: '你严格按以下规则输出：用户输入一个习惯名称，你返回 JSON，只包含 4 个字段：times（建议频次）、prompt（具体触发时机，绑定日常生活动作）、action（微小到无法拒绝的动作）、next（进阶目标）。不要输出任何其他字段或解释。用中文。',
    messages: [{ role: 'user', content: text }]
  };

  try {
    console.log('[AI] 请求:', text);
    const resp = await fetch('https://api.minimax.io/anthropic/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });
    const data = await resp.json();
    console.log('[AI] 原始响应:', JSON.stringify(data, null, 2));
    const textBlock = data.content?.find(c => c.type === 'text');
    const c = textBlock?.text || '';
    console.log('[AI] 提取文本:', c);
    const m = c.match(/\{[\s\S]*\}/);
    console.log('[AI] 匹配结果:', m ? m[0] : '无');
    res.json({ success: true, data: m ? JSON.parse(m[0]) : null });
  } catch (e) {
    console.log('[AI] 错误:', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
