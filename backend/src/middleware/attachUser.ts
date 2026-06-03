import { Request, Response, NextFunction } from 'express';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string;
        claims?: any;
      };
      user?: typeof users.$inferSelect;
    }
  }
}

export const attachUser = async (req: Request, res: Response, next: NextFunction) => {
  const supabaseUserId = req.auth?.userId;

  if (!supabaseUserId) {
    return res.status(401).json({ error: 'Unauthorized: No active user session.' });
  }

  try {
    const dbUser = await db.query.users.findFirst({
      where: eq(users.supabaseUserId, supabaseUserId),
    });

    if (dbUser) {
      if (dbUser.isBanned) {
        return res.status(403).json({ error: 'Access Denied: This account is banned.' });
      }
      req.user = dbUser;
    }

    next();
  } catch (error) {
    console.error('Error attaching user to request:', error);
    res.status(500).json({ error: 'Database verification failed.' });
  }
};

export default attachUser;
