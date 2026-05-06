import { Response } from 'express';
import { AuthRequest } from '../types/auth.types.js';
import { groqService, summarizationService } from '../services/index.js';
import { messageRepository } from '../repositories/index.js';
import { logger } from '../utils/logger.js';
import rateLimit from 'express-rate-limit';

const CTX = 'ChatController';

const SYSTEM_PROMPT = `You are ORION (Operational Reasoning Intelligence Orchestration Node), Nielless Acharya's personal AI. You are direct, logical, and practical — a systems thinker. No hype, no fluff. Challenge bad assumptions, surface logical flaws. Keep responses concise unless detail is specifically requested.`;

export const chatRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 requests per minute per IP — stays under Groq's 30/min
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
});

const VALID_MESSAGE_TYPES = ['text', 'voice'] as const;
type MessageType = (typeof VALID_MESSAGE_TYPES)[number];

export const chatController = {
  async send(req: AuthRequest, res: Response): Promise<void> {
    const { text, type: rawType = 'text', stream = true } = req.body;
    const userId = req.user!.userId;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      logger.warn(CTX, 'Send failed — empty text', { userId });
      res.status(400).json({ error: 'text field is required and must be non-empty' });
      return;
    }

    const type: MessageType = VALID_MESSAGE_TYPES.includes(rawType) ? rawType : 'text';
    logger.info(CTX, 'Chat message received', { userId, type, textLength: text.trim().length, stream });

    const start = Date.now();

    // Save user message
    await messageRepository.create(userId, 'user', text.trim(), type);

    // Fetch context summary (Tier 2) and last 20 messages (Tier 1)
    const contextPrefix = await summarizationService.getContextPrefix(userId);
    const systemPromptOverride = contextPrefix ? `${contextPrefix}${SYSTEM_PROMPT}` : SYSTEM_PROMPT;

    const history = await messageRepository.findRecent(userId, 20);
    // Exclude the message we just saved for the history sent to LLM
    const llmHistory = history.slice(0, -1).map((m: any) => ({ role: m.role, content: m.content }));

    if (!stream) {
      // Fallback to non-streaming if explicitly requested
      const { content, tokensUsed, model } = await groqService.chat(llmHistory, text.trim(), systemPromptOverride);
      const processingTimeMs = Date.now() - start;
      const assistantMessage = await messageRepository.create(userId, 'assistant', content, 'text', tokensUsed, processingTimeMs);
      
      // Trigger async summarization check
      summarizationService.checkAndSummarize(userId).catch(e => logger.error(CTX, 'Async summarization trigger failed', { error: e.message }));

      res.json({
        message: { id: assistantMessage.id, role: 'assistant', content: assistantMessage.content, createdAt: assistantMessage.created_at },
        metadata: { tokensUsed, processingTime: processingTimeMs, model },
      });
      return;
    }

    // SSE Setup
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let fullContent = '';
    let metadata: any = null;

    try {
      const tokenStream = groqService.streamChat(llmHistory, text.trim(), systemPromptOverride);

      for await (const chunk of tokenStream) {
        if (chunk.type === 'token') {
          fullContent += chunk.content;
          logger.debug(CTX, 'Writing token to stream', { userId, token: chunk.content });
          res.write(`data: ${JSON.stringify({ token: chunk.content })}\n\n`);
        } else if (chunk.type === 'metadata') {
          metadata = chunk;
        }
      }

      const processingTimeMs = Date.now() - start;
      // Persist assistant message
      const assistantMessage = await messageRepository.create(
        userId,
        'assistant',
        fullContent,
        'text',
        metadata?.tokensUsed,
        processingTimeMs
      );

      // Trigger async summarization check
      summarizationService.checkAndSummarize(userId).catch(e => logger.error(CTX, 'Async summarization trigger failed', { error: e.message }));

      // Final event with full message info and metadata
      res.write(`data: ${JSON.stringify({
        done: true,
        messageId: assistantMessage.id,
        createdAt: assistantMessage.created_at,
        metadata: {
          tokensUsed: metadata?.tokensUsed,
          processingTime: processingTimeMs,
          model: metadata?.model || 'primary'
        }
      })}\n\n`);
      res.end();
    } catch (err: any) {
      logger.error(CTX, 'Streaming failed', { userId, error: err.message });
      res.write(`data: ${JSON.stringify({ error: 'Streaming failed' })}\n\n`);
      res.end();
    }
  },

  async getHistory(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 50, 1), 100);
    const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);

    logger.info(CTX, 'Chat history requested', { userId, limit, offset });

    const { messages, total } = await messageRepository.findPaginated(userId, limit, offset);

    logger.debug(CTX, 'Chat history returned', { userId, count: messages.length, total });

    res.json({
      messages,
      pagination: {
        limit,
        offset,
        total,
        hasMore: offset + limit < total,
      },
    });
  },

  async deleteMessages(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { messageIds, clearAll } = req.body;

    if (clearAll) {
      logger.warn(CTX, 'Clearing all messages for user', { userId });
      const { messages } = await messageRepository.findPaginated(userId, 1000, 0);
      await Promise.all(messages.map((m: any) => messageRepository.delete(m.id, userId)));
      logger.info(CTX, 'All messages deleted', { userId, count: messages.length });
      res.json({ deleted: messages.length, message: `Successfully deleted ${messages.length} message(s)` });
      return;
    }

    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      logger.warn(CTX, 'Delete failed — no messageIds provided', { userId });
      res.status(400).json({ error: 'messageIds array or clearAll: true is required' });
      return;
    }

    logger.info(CTX, 'Deleting specific messages', { userId, messageIds });
    const results = await Promise.all(
      messageIds.map((id: number) => messageRepository.delete(id, userId))
    );
    const deleted = results.filter(Boolean).length;
    logger.info(CTX, 'Messages deleted', { userId, requested: messageIds.length, deleted });
    res.json({ deleted, message: `Successfully deleted ${deleted} message(s)` });
  },

  async search(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const query = req.query.q as string;

    if (!query || query.trim().length === 0) {
      res.status(400).json({ error: 'Query parameter "q" is required' });
      return;
    }

    logger.info(CTX, 'Search requested', { userId, query });
    const messages = await messageRepository.search(userId, query.trim());
    res.json({ messages });
  },

  async transcribe(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const file = req.file;

    if (!file) {
      logger.warn(CTX, 'Transcription failed — no file uploaded', { userId });
      res.status(400).json({ error: 'No audio file provided' });
      return;
    }

    logger.info(CTX, 'Audio file received for transcription', { 
      userId, 
      filename: file.originalname, 
      size: file.size,
      mimetype: file.mimetype 
    });

    try {
      logger.debug(CTX, 'Calling Groq transcription service...', { userId });
      const text = await groqService.transcribe(file.buffer, file.originalname);
      logger.info(CTX, 'Transcription completed successfully', { userId, textLength: text.length });
      res.json({ text });
    } catch (err: any) {
      logger.error(CTX, 'Transcription error', { userId, error: err.message, stack: err.stack });
      res.status(500).json({ error: `Failed to transcribe audio: ${err.message}` });
    }
  },
};
