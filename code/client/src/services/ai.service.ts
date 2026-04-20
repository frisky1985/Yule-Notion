/**
 * 前端 AI API 客户端
 *
 * 提供与后端 AI 服务通信的方法，包括同步和流式请求。
 */

import api from './api';
import { AIRequest, AIResponse, AIStreamChunk, AIOperationRecord } from '@/types/ai';

export class AIFrontendService {
  async complete(request: AIRequest): Promise<AIResponse> {
    const response = await api.post('/ai/complete', request);
    return response.data;
  }
  
  stream(request: AIRequest, onChunk: (chunk: AIStreamChunk) => void): AbortController {
    const controller = new AbortController();
    
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/v1/ai/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(request),
      signal: controller.signal
    }).then(async (response) => {
      const reader = response.body?.getReader();
      if (!reader) return;
      
      const decoder = new TextDecoder();
      let buffer = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const chunk: AIStreamChunk = JSON.parse(line.slice(6));
              onChunk(chunk);
            } catch (e) {
              console.error('Failed to parse SSE chunk:', e);
            }
          }
        }
      }
    }).catch((error) => {
      if (error.name !== 'AbortError') {
        console.error('AI stream error:', error);
        onChunk({ error: error.message });
      }
    });
    
    return controller;
  }
  
  async getHistory(limit = 50, offset = 0): Promise<{ history: AIOperationRecord[] }> {
    const response = await api.get('/ai/history', {
      params: { limit, offset }
    });
    return response.data;
  }
  
  async getMonthlyCost(): Promise<{ monthlyCost: number }> {
    const response = await api.get('/ai/cost');
    return response.data;
  }
}

export const aiFrontendService = new AIFrontendService();
