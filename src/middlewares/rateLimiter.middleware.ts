import { Request, Response, NextFunction } from 'express';

interface RequestLog {
  timestamp: number;
}

const requestStore = new Map<string, RequestLog[]>();

export const rateLimiter = (windowMs: number, maxRequests: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Identifier: User ID if logged in, otherwise IP
    const identifier = req.user?.userId || req.ip || 'unknown';
    const now = Date.now();

    if (!requestStore.has(identifier)) {
      requestStore.set(identifier, []);
    }

    const logs = requestStore.get(identifier)!;
    
    // Sliding window logic: remove logs older than windowMs
    const validLogs = logs.filter((log) => now - log.timestamp < windowMs);
    
    if (validLogs.length >= maxRequests) {
      requestStore.set(identifier, validLogs); // Update store
      res.status(429).json({ success: false, message: 'Too many requests' });
      return;
    }

    validLogs.push({ timestamp: now });
    requestStore.set(identifier, validLogs);
    
    next();
  };
};
