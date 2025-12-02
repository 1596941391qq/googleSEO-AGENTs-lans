// EdgeOne Functions 入口文件 (TypeScript版本)
import { handleRequest } from './api';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return handleRequest(request, env);
  },
};

export interface Env {
  GEMINI_API_KEY: string;
  GEMINI_PROXY_URL?: string;
  GEMINI_MODEL?: string;
}
