require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// DeepSeek API 配置
const DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions";
const API_KEY = process.env.OPENAI_API_KEY;

// 创建流式聊天接口
app.post('/chat', async (req, res) => {
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const response = await axios.post(
      DEEPSEEK_API_URL,
      {
        model: "deepseek-chat",  // 使用 DeepSeek Chat 模型
        messages: [{ role: "user", content: message }],
        stream: true,  // 启用流式返回
      },
      {
        headers: {
          "Authorization": `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
        responseType: 'stream',
      }
    );

    response.data.on("data", (chunk) => {
      // res.write(`data: ${chunk.toString()}\n\n`);
      const lines = chunk.toString().split("\n");

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const jsonStr = line.replace("data: ", "").trim();

          if (jsonStr === "[DONE]") {
            res.write("data: [DONE]\n\n");
            res.end();
            return;
          }

          try {
            const jsonData = JSON.parse(jsonStr);
            const content = jsonData.choices[0]?.delta?.content || "";
            if (content) {
              res.write(`data: ${content}\n\n`);
            }
          } catch (err) {
            console.error("JSON 解析错误:", err);
          }
        }
      }
    });

    response.data.on("end", () => {
      res.write("data: [DONE]\n\n");
      res.end();
    });

    response.data.on("error", (error) => {
      console.error("Stream error:", error);
      res.write("data: [ERROR]\n\n");
      res.end();
    });

  } catch (error) {
    console.error("DeepSeek API error:", error);
    res.status(500).json({ error: "Failed to fetch response from DeepSeek API" });
  }
});

// 启动服务器
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
