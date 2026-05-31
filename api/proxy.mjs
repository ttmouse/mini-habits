// Vercel Serverless Function — AI 代理
// 环境变量：AI_API_KEY, AI_BASE_URL, AI_MODEL
export default async function handler(req, res) {
  // 允许跨域
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') return res.status(405).json({ error: 'only POST' });

  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'text required' });

  const apiKey = process.env.AI_API_KEY;
  const baseUrl = process.env.AI_BASE_URL || 'https://api.minimax.io/anthropic';
  const model = process.env.AI_MODEL || 'MiniMax-M2.7-highspeed';

  if (!apiKey) return res.status(500).json({ error: 'AI_API_KEY not configured' });

  try {
    const resp = await fetch(baseUrl + '/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 300,
        system: '你是一个儿童微习惯教练。用户输入一个习惯名称，你需要返回 JSON，包含 times（建议频次）、prompt（具体触发时机，绑定日常生活动作）、action（微小到无法拒绝的动作）、next（进阶目标）。用中文。只输出 JSON，不要其他文字。',
        messages: [{ role: 'user', content: text }],
      }),
    });

    const data = await resp.json();
    const content = data.content?.[0]?.text || data.content?.text || '';
    const match = content.match(/\{[\s\S]*\}/);
    if (match) {
      return res.status(200).json({ success: true, data: JSON.parse(match[0]) });
    }
    return res.status(500).json({ error: 'failed to parse AI response', raw: content });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
