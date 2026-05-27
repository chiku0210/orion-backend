# ORION Backend

> Personal AI assistant backend — Node.js · TypeScript · PostgreSQL (Neon) · Groq

The server powering **ORION** — a voice-first Android AI assistant. Handles JWT auth, chat persistence, and LLM inference via Groq's Llama3-70B. Built to be lean, typed, and production-ready.

--------------------------------------------------------------------------------------------

# Auth Model 

### 📝 Register API

The Register API enables users to create a new account by providing a **username, email, and password**. It ensures secure handling of user data and enforces validation rules before account creation.
 Features
- Enforces **unique email registration** to prevent duplicate accounts  
- Utilizes **bcrypt hashing** to securely store user passwords  
- Validates required fields and password constraints  
- Creates a new user account upon successful validation and Generate Jwt Token

📥 Request
**Endpoint:**
POST /api/auth/register
**Request Body:**
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "123456"
}
```
📤 Response

 ✅ Success Response (201 Created)

```json
{
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "username": "john_doe",
    "email": "john@example.com"
  }
}
```
 ❌ Error Responses
**400 Bad Request (Missing Fields / Invalid Input)**
```json
{
  "error": "username, email and password are required"
}
```
```json
{
  "error": "Password must be at least 6 characters"
}
```
**409 Conflict (Duplicate Email)**
```json
{
  "error": "Email already registered"
}
```



### 🔐 Login API

The Login API allows users to authenticate using their **email and password**. It verifies user credentials and returns a JWT token upon successful authentication.
 Features
- Validates required fields (**email and password**)  
- Checks if the user exists in the database  
- Verifies password using bcrypt hash comparison  
- Returns JWT token on successful login  
- Handles invalid credentials securely  

📥 Request
**Endpoint:**
POST /api/auth/login
**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "123456"
}
```
📤 Response
 ✅ Success Response (200 OK)

```json
{
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "username": "john_doe",
    "email": "john@example.com"
  }
}
```
 ❌ Error Responses
**400 Bad Request (Missing Fields)**
```json
{
  "error": "email and password are required"
}
```
**401 Unauthorized (Invalid Credentials)**
```json
{
  "error": "Invalid credentials"
}
```
---------------------------------------------------------------------------------------------

# Chat Module

 💬 Send Message API
The Send Message API allows authenticated users to send chat messages. It validates input, stores the message, processes it using an AI service, and returns the assistant's response.
 ⚙️ Features
- Requires authenticated user (JWT-based)  
- Validates message input (non-empty, string format)  
- Enforces maximum message length (4000 characters)  
- Supports message types (text, voice)  
- Stores user and assistant messages in the database  
- Fetches recent chat history for context  
- Integrates with AI service to generate responses  
- Returns assistant reply with metadata  

 📥 Request
**Endpoint:**
POST /api/chat/send

**Headers:**
Authorization: Bearer <token>

**Request Body:**
```json
{
  "text": "Hello, how are you?",
  "type": "text"
}
```

 📤 Response
 ✅ Success Response (200 OK)
```json
{
  "message": {
    "id": "message_id",
    "role": "assistant",
    "content": "I'm doing well! How can I help you?",
    "createdAt": "timestamp"
  },
  "metadata": {
    "tokensUsed": 120,
    "processingTime": 150,
    "model": "model_name"
  }
}
```
 ❌ Error Responses
**400 Bad Request (Invalid Input)**
```json
{
  "error": "text field is required and must be non-empty"
}
```
```json
{
  "error": "text exceeds maximum length of 4000 characters"
}
```
**401 Unauthorized**
```json
{
  "error": "Unauthorized access"
}
```


📜 Get Chat History API
The Get Chat History API allows authenticated users to retrieve their past chat messages. It supports pagination for efficient data fetching.
 ⚙️ Features
- Requires authenticated user (JWT-based)  
- Fetches user-specific chat history  
- Supports pagination using limit and offset  
- Returns total message count  
- Indicates if more messages are available  

 📥 Request
**Endpoint:**
GET /api/chat/history

**Headers:**
Authorization: Bearer <token>
**Query Params:**
- limit (optional, default: 50, max: 100)  
- offset (optional, default: 0)  
**Example:**
```
GET /api/chat/history?limit=20&offset=0
```
📤 Response
 ✅ Success Response (200 OK)

```json
{
  "messages": [
    {
      "id": "message_id",
      "role": "user",
      "content": "Hello",
      "createdAt": "timestamp"
    },
    {
      "id": "message_id",
      "role": "assistant",
      "content": "Hi! How can I help you?",
      "createdAt": "timestamp"
    }
  ],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "total": 100,
    "hasMore": true
  }
}
```
❌ Error Responses

**401 Unauthorized**
```json
{
  "error": "Unauthorized access"
}
```




🗑️ Delete Messages API
The Delete Messages API allows authenticated users to delete chat messages. Users can either delete specific messages by providing their IDs or clear all messages at once.
⚙️ Features
- Requires authenticated user (JWT-based)  
- Supports deleting multiple messages using message IDs  
- Option to delete all messages using `clearAll` flag  
- Ensures only user's own messages are deleted  
- Returns count of deleted messages  

📥 Request
**Endpoint:**
DELETE /api/chat/messages

**Headers:**
Authorization: Bearer <token>

**Request Body (Delete Specific Messages):**
```json
{
  "messageIds": [1, 2, 3]
}
```
**Request Body (Delete All Messages):**
```json
{
  "clearAll": true
}
```
  Response
 ✅ Success Response (200 OK)
**For deleting specific messages:**
```json
{
  "deleted": 3,
  "message": "Successfully deleted 3 message(s)"
}
```

**For deleting all messages:**
```json
{
  "deleted": 50,
  "message": "Successfully deleted all messages"
}
```

 ❌ Error Responses
**400 Bad Request (Invalid Input)**
```json
{
  "error": "messageIds array or clearAll: true is required"
}
```
**401 Unauthorized**
```json
{
  "error": "Unauthorized access"
}
```
--------------------------------------------------------------------------------------------

### 📌 Conclusion

This API system provides a complete backend solution for user authentication and chat functionality. It includes secure user registration and login, message handling with AI integration, chat history retrieval with pagination, and flexible message deletion options.

The architecture ensures data security through password hashing and JWT-based authentication, while maintaining scalability and clean separation of concerns.

Overall, this backend is designed to be reliable, secure, and production-ready for modern chat-based applications.