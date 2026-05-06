# ORION Backend

> Personal AI assistant backend — Node.js · TypeScript · PostgreSQL (Neon) · Groq

The server powering **ORION** — a voice-first Android AI assistant. This backend is designed for high-concurrency streaming and long-term conversation memory.

---

## 🚀 Key v1.0 Features

### 1. SSE Streaming Pipeline
The `/chat/send` endpoint implements **Server-Sent Events (SSE)**. It leverages Node.js `AsyncGenerators` to pipe tokens from Groq's Llama 3 models directly to the client as they are generated.

### 2. Two-Tier Hierarchical Memory
Implemented in `summarizationService.ts`:
- **Tier 1 (Recency):** Sliding window of the last 20 messages sent to the LLM.
- **Tier 2 (Summarization):** Automatic background compression of conversation blocks (>4000 tokens) into dense summaries, ensuring infinite context without performance degradation.

### 3. Voice Interaction Bridge
Integrated with **Groq Whisper** for high-speed transcription of uploaded audio buffers.

---

## 🛠 Stack

| Layer | Tech |
|---|---|
| Runtime | Node.js 20 |
| Language | TypeScript |
| Framework | Express |
| Database | PostgreSQL (Neon) |
| LLM | Groq Llama 3.3 70B |
| Transcription | Groq Whisper (v3-turbo) |
| Auth | JWT (Access + Refresh) |

---

## 📦 API Endpoints

### Auth
- `POST /auth/register` - New user registration
- `POST /auth/login` - Returns JWT access + refresh tokens

### Chat
- `POST /chat/send` - **Streaming (SSE)** LLM completion
- `GET /chat/history` - Paginated message retrieval
- `GET /chat/search` - Full-text search via `pg ILIKE`
- `DELETE /chat/delete` - Individual or bulk message deletion

### Voice
- `POST /chat/transcribe` - Audio upload -> Text transcript

---

## ⚙️ Environment Variables

```env
DATABASE_URL=postgresql://...
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
GROQ_API_KEY=...
GROQ_MODEL_PRIMARY=llama-3.3-70b-versatile
GROQ_MODEL_FALLBACK=llama3-70b-8192
```

---

<h3 align="center">Part of the <a href="../README.md">ORION Ecosystem</a></h3>
