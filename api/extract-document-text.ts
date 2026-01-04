/**
 * API: 提取文档文本内容
 * 
 * 功能：
 * - 支持 PDF, TXT, MD, DOCX 格式
 * - 提取文档中的文本内容
 * - 返回纯文本用于AI处理
 * 
 * 方法: POST
 * 端点: /api/extract-document-text
 * 
 * 注意：由于Vercel serverless的限制，当前实现接受前端提取的文本内容
 * 对于PDF和DOCX，建议前端使用适当的库（如pdf.js）提取文本后发送
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, handleOptions } from './_shared/request-handler.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return handleOptions(res);
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Handle FormData (multipart/form-data)
    let fileContent: string = '';
    let filename: string = '';
    
    // Check if it's FormData (from file upload)
    if (req.headers['content-type']?.includes('multipart/form-data')) {
      // For Vercel, we need to parse FormData manually
      // Since Vercel doesn't support multipart parsing out of the box,
      // we'll accept the file as base64 or text content
      // Frontend should send file content as text/plain or base64
      return res.status(400).json({ 
        error: 'Please send file content as text in request body',
        hint: 'Frontend should extract text from file and send as JSON: { filename, content }'
      });
    }

    // Handle JSON body (file content already extracted by frontend)
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    
    if (!body || typeof body !== 'object') {
      return res.status(400).json({ error: 'Invalid request body' });
    }

    // Accept pre-extracted text from frontend
    // Frontend should extract text using appropriate methods:
    // - TXT/MD: file.text()
    // - PDF: pdf.js or similar
    // - DOCX: mammoth.js or similar
    fileContent = body.content || '';
    filename = body.filename || 'document';

    if (!fileContent || typeof fileContent !== 'string') {
      return res.status(400).json({ error: 'No content provided' });
    }

    // Clean up the text (remove excessive whitespace)
    let extractedText = fileContent
      .replace(/\s+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    // Limit content length to prevent token overflow (keep first 50000 chars)
    if (extractedText.length > 50000) {
      extractedText = extractedText.substring(0, 50000) + '...';
    }

    if (extractedText.length < 10) {
      return res.status(400).json({ 
        error: 'Extracted text is too short',
        hint: 'The document may be empty or text extraction failed'
      });
    }

    return res.status(200).json({
      success: true,
      content: extractedText,
      length: extractedText.length,
    });
  } catch (error: any) {
    console.error('[extract-document-text] Error:', error);
    return res.status(500).json({
      error: 'Failed to extract document text',
      details: error.message,
    });
  }
}

