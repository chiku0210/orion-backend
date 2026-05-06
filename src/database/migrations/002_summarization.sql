-- ORION Backend: Summarization Schema Migration
-- Issue #5

-- ========================
-- CONVERSATION SUMMARIES TABLE
-- ========================
CREATE TABLE IF NOT EXISTS conversation_summaries (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  summary_text TEXT NOT NULL,
  start_message_id INTEGER NOT NULL,
  end_message_id INTEGER NOT NULL,
  tokens_used INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================
-- UPDATE MESSAGES TABLE
-- ========================
-- Add is_summarized flag to messages to track which ones are compressed
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_summarized BOOLEAN DEFAULT FALSE;

-- ========================
-- INDEXES
-- ========================
CREATE INDEX IF NOT EXISTS idx_summaries_user_id ON conversation_summaries(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_is_summarized ON messages(is_summarized);
