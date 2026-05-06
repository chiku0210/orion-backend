import { Router } from 'express';
import { chatController, chatRateLimiter } from '../controllers/chat.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import multer from 'multer';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit (matches Groq limit)
});

const router = Router();

router.use(authenticateToken);

router.post('/send', chatRateLimiter, asyncHandler(chatController.send));
router.get('/history', asyncHandler(chatController.getHistory));
router.get('/search', asyncHandler(chatController.search));
router.delete('/delete', asyncHandler(chatController.deleteMessages));
router.post('/transcribe', upload.single('audio'), asyncHandler(chatController.transcribe));

export default router;
