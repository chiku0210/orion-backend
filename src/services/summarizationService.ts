import { groqService } from './groqService.js';
import { messageRepository } from '../repositories/index.js';
import { logger } from '../utils/logger.js';

const CTX = 'SummarizationService';
const TOKEN_THRESHOLD = 4000;
const BLOCK_SIZE = 50;

export const summarizationService = {
  async checkAndSummarize(userId: number): Promise<void> {
    try {
      const unsummarizedTokens = await messageRepository.getUnsummarizedTokens(userId);
      
      if (unsummarizedTokens < TOKEN_THRESHOLD) {
        return;
      }

      logger.info(CTX, 'Summarization threshold exceeded', { userId, unsummarizedTokens });

      // Fetch oldest unsummarized block
      const messages = await messageRepository.findOldestUnsummarized(userId, BLOCK_SIZE);
      if (messages.length < 10) {
        logger.debug(CTX, 'Not enough messages to summarize yet', { userId, count: messages.length });
        return;
      }

      const startId = messages[0].id;
      const endId = messages[messages.length - 1].id;

      // Prepare text for summarization
      const conversationText = messages
        .map((m: any) => `${m.role.toUpperCase()}: ${m.content}`)
        .join('\n');

      const prompt = `Summarize the following part of a conversation between a user and an AI assistant into a single, highly dense paragraph. Focus on key decisions, facts, and context that must be remembered. Do not use filler. \n\nCONVERSATION:\n${conversationText}`;

      logger.debug(CTX, 'Calling LLM for summarization', { userId, messageCount: messages.length });
      
      const { content, tokensUsed } = await groqService.chat([], prompt);

      // Save summary and mark messages as summarized
      await messageRepository.createSummary(userId, content, startId, endId, tokensUsed);
      await messageRepository.markAsSummarized(userId, endId);

      logger.info(CTX, 'Summarization completed successfully', { userId, endId, summaryLength: content.length });
    } catch (error: any) {
      logger.error(CTX, 'Summarization failed', { userId, error: error.message });
    }
  },

  async getContextPrefix(userId: number): Promise<string> {
    const latestSummary = await messageRepository.getLatestSummary(userId);
    if (!latestSummary) return '';
    return `SUMMARY OF PREVIOUS CONVERSATION: ${latestSummary.summary_text}\n\n`;
  }
};
