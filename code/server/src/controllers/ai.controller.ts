/**
 * AI 控制器
 *
 * 处理 AI 相关的 HTTP 请求：
 * - POST /api/v1/ai/complete - 同步 AI 完成
 * - POST /api/v1/ai/stream - 流式 AI 响应（SSE）
 * - GET /api/v1/ai/history - 获取操作历史
 * - GET /api/v1/ai/cost - 获取月度成本
 */

import { Request, Response } from 'express';
import { aiService } from '../services/ai.service';
import { AIRequest } from '../types';

export class AIController {
  async complete(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const request: AIRequest = req.body;
      
      // Validate request
      if (!request.operation || !request.text) {
        return res.status(400).json({
          error: {
            code: 'INVALID_REQUEST',
            message: 'operation and text are required'
          }
        });
      }
      
      const response = await aiService.complete(request, userId);
      res.json(response);
    } catch (error: any) {
      if (error.message.includes('RATE_LIMIT_EXCEEDED') || 
          error.message.includes('COST_LIMIT_REACHED')) {
        const parsed = JSON.parse(error.message);
        return res.status(429).json(parsed);
      }
      
      console.error('AI complete error:', error);
      res.status(500).json({
        error: {
          code: 'AI_TIMEOUT',
          message: 'AI request failed. Please try again.'
        }
      });
    }
  }
  
  async stream(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const request: AIRequest = req.body;
      
      // Validate request
      if (!request.operation || !request.text) {
        return res.status(400).json({
          error: {
            code: 'INVALID_REQUEST',
            message: 'operation and text are required'
          }
        });
      }
      
      // Set SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      // Stream response
      for await (const chunk of aiService.stream(request, userId)) {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      }
      
      res.end();
    } catch (error: any) {
      if (error.message.includes('RATE_LIMIT_EXCEEDED') || 
          error.message.includes('COST_LIMIT_REACHED')) {
        const parsed = JSON.parse(error.message);
        return res.status(429).json(parsed);
      }
      
      console.error('AI stream error:', error);
      res.write(`data: ${JSON.stringify({ error: 'Stream failed' })}\n\n`);
      res.end();
    }
  }
  
  async getHistory(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      
      const history = await aiService.getHistory(userId, limit, offset);
      res.json({ history, limit, offset });
    } catch (error) {
      console.error('Get AI history error:', error);
      res.status(500).json({
        error: { code: 'SERVER_ERROR', message: 'Failed to get AI history' }
      });
    }
  }
  
  async getMonthlyCost(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const cost = await aiService.getMonthlyCost(userId);
      res.json({ monthlyCost: cost });
    } catch (error) {
      console.error('Get monthly cost error:', error);
      res.status(500).json({
        error: { code: 'SERVER_ERROR', message: 'Failed to get monthly cost' }
      });
    }
  }
}

export const aiController = new AIController();
