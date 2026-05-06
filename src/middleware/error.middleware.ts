import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

const CTX = 'ErrorHandler';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';

  // Handle Multer errors (like File too large)
  if (err.name === 'MulterError') {
    statusCode = 400;
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'File too large. Maximum size is 25MB.';
    }
  }

  logger.error(CTX, `Unhandled error: ${message}`, {
    statusCode,
    method: req.method,
    path: req.path,
    stack: err.stack,
  });

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
