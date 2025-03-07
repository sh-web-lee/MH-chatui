const express = require('express');
const axios = require('axios');

require('dotenv').config();

const app = express();
const port = 3000;

// DeepSeek 的 API 端点（假设为流式 API）
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1';
const API_KEY = process.env.OPENAI_API_KEY; // 替换为你的 DeepSeek API 密钥

// 允许跨域请求
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// 流式内容接口
app.get('/chat', async (req, res) => {
  const prompt = req.query.message || '你好，DeepSeek！'; // 从查询参数中获取提示

  try {
    // 发起流式请求到 DeepSeek
    const response = await axios({
      method: 'post',
      url: DEEPSEEK_API_URL,
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      data: {
        prompt: prompt,
        stream: true, // 启用流式响应
      },
      responseType: 'stream', // 重要：确保响应是流式的
    });

    // 设置响应头，告诉前端这是一个流式响应
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Transfer-Encoding', 'chunked');

    // 将 DeepSeek 的流式响应转发给前端
    response.data.on('data', (chunk) => {
      res.write(chunk); // 将数据块发送给前端
    });

    response.data.on('end', () => {
      res.end(); // 流式响应结束
    });

    response.data.on('error', (err) => {
      console.error('Stream error:', err);
      res.status(500).end('Stream error');
    });
  } catch (error) {
    console.error('Error making request to DeepSeek API:', error);
    res.status(500).send('Internal Server Error');
  }
});

// 启动服务器
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});