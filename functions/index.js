// EdgeOne Functions 入口文件
import { handleRequest } from './api.js';

addEventListener('fetch', (event) => {
  event.respondWith(handleRequest(event.request));
});
