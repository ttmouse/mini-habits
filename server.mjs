import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3456;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// AI 代理
app.post('/api/chat', async (req, res) => {
  const { text, apiKey } = req.body;
  if (!text || !apiKey) return res.status(400).json({ error: 'text and apiKey required' });

  const body = {
    model: 'MiniMax-M2.7-highspeed',
    max_tokens: 500,
    system: '你是一个微习惯教练。用户输入一个习惯名称，你需要返回 JSON，包含 times（建议频次）、prompt（具体触发时机，绑定日常生活动作）、action（微小到无法拒绝的动作）、next（进阶目标）。如果习惯不合适，返回合理的替代建议。用中文。只输出 JSON。',
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
