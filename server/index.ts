import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { generateKeywords, analyzeRankingProbability, generateDeepDiveStrategy, translatePromptToSystemInstruction, translateText } from './services/gemini.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// API Routes
app.post('/api/generate-keywords', async (req, res) => {
  try {
    const { seedKeyword, targetLanguage, systemInstruction, existingKeywords, roundIndex } = req.body;
    
    if (!seedKeyword || !targetLanguage || !systemInstruction) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const keywords = await generateKeywords(
      seedKeyword,
      targetLanguage,
      systemInstruction,
      existingKeywords || [],
      roundIndex || 1
    );

    res.json({ keywords });
  } catch (error: any) {
    console.error('Generate keywords error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate keywords' });
  }
});

app.post('/api/analyze-ranking', async (req, res) => {
  try {
    const { keywords, systemInstruction } = req.body;
    
    if (!keywords || !Array.isArray(keywords) || keywords.length === 0 || !systemInstruction) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const analyzedKeywords = await analyzeRankingProbability(keywords, systemInstruction);

    res.json({ keywords: analyzedKeywords });
  } catch (error: any) {
    console.error('Analyze ranking error:', error);
    res.status(500).json({ error: error.message || 'Failed to analyze ranking' });
  }
});

app.post('/api/deep-dive-strategy', async (req, res) => {
  try {
    const { keyword, uiLanguage, targetLanguage } = req.body;
    
    if (!keyword || !uiLanguage || !targetLanguage) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const report = await generateDeepDiveStrategy(keyword, uiLanguage, targetLanguage);

    res.json({ report });
  } catch (error: any) {
    console.error('Deep dive strategy error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate strategy report' });
  }
});

app.post('/api/translate-prompt', async (req, res) => {
  try {
    const { prompt } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Missing prompt field' });
    }

    const optimized = await translatePromptToSystemInstruction(prompt);

    res.json({ optimized });
  } catch (error: any) {
    console.error('Translate prompt error:', error);
    res.status(500).json({ error: error.message || 'Failed to translate prompt' });
  }
});

app.post('/api/translate-text', async (req, res) => {
  try {
    const { text, targetLanguage } = req.body;
    
    if (!text || !targetLanguage) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const translated = await translateText(text, targetLanguage);

    res.json({ translated });
  } catch (error: any) {
    console.error('Translate text error:', error);
    res.status(500).json({ error: error.message || 'Failed to translate text' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log(`📝 Health check: http://localhost:${PORT}/health`);
}).on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ 错误: 端口 ${PORT} 已被占用！`);
    console.error(`💡 解决方案:`);
    console.error(`   1. 关闭占用端口的进程: netstat -ano | findstr :${PORT}`);
    console.error(`   2. 或者修改 .env 文件中的 PORT 为其他端口（如 3002）`);
    console.error(`   3. 或者终止占用进程: taskkill /PID <进程ID> /F`);
    process.exit(1);
  } else {
    console.error('❌ 服务器启动失败:', err);
    process.exit(1);
  }
});

