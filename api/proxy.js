/**
 * Mini-Habits API 代理 — 绕过 CORS
 * 用法：node api/proxy.js
 * 前端请求 → http://localhost:3456/api/chat
 */
import { createServer } from 'http';

const PORT = 3456;
const API_KEY = process.env.MINIMAX_API_KEY || 'sk-cp-J6U3MURJsqkCzbXXXXXXXXXXXX'; // ⚠️ 替换成你的真实 key
const API_BASE = 'https://api.minimax.io/anthropic/v1/messages';

const server = createServer(async (req, res) => {
  // 处理 CORS 预检
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    });
    res.end();
    return;
  }

  // 只接受 POST /api/chat
  if (req.method !== 'POST' || !req.url.startsWith('/api/chat')) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', async () => {
    try {
      const payload = JSON.parse(body);
      const userMsg = payload.messages?.[0]?.content?.slice(0, 30) || '';
      console.log(`[${new Date().toLocaleTimeString()}] → ${userMsg}`);

      const response = await fetch(API_BASE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
        },
        body: JSON.stringify({
          model: payload.model || 'MiniMax-M2.7-highspeed',
          max_tokens: payload.max_tokens || 300,
          system: payload.system || '',
          messages: payload.messages || [],
        }),
      });

      const text = await response.text();

      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      });
      res.end(text);
    } catch (err) {
      console.error('代理错误:', err.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
  });
});

server.listen(PORT, () => {
  console.log(`✅ 代理已启动 → http://localhost:${PORT}/api/chat`);
  console.log(`   把这个地址填到 Mini-Habits 设置页的 API 地址栏即可`);
});
