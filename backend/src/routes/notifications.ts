import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import attachUser from '../middleware/attachUser.js';
import { db } from '../db/index.js';
import { notifications } from '../db/schema.js';
import { eq, and, desc } from 'drizzle-orm';

const router = Router();

// 1. GET /api/notifications -> Get last 20 notifications for current user
router.get('/', requireAuth(), attachUser, async (req: Request, res: Response) => {
  const dbUser = req.user;

  if (!dbUser) {
    return res.status(401).json({ error: 'Profile required' });
  }

  try {
    const list = await db.query.notifications.findMany({
      where: eq(notifications.userId, dbUser.id),
      orderBy: [desc(notifications.createdAt)],
      limit: 20
    });

    return res.json({ notifications: list });
  } catch (error: any) {
    console.error('Fetch notifications error:', error);
    return res.status(500).json({ error: 'Internal server error fetching notifications.', details: error.message });
  }
});

// 2. PATCH /api/notifications/:id/read -> Mark a notification as read
router.patch('/:id/read', requireAuth(), attachUser, async (req: Request, res: Response) => {
  const { id } = req.params;
  const dbUser = req.user;

  if (!dbUser) {
    return res.status(401).json({ error: 'Profile required' });
  }

  try {
    const updated = await db
      .update(notifications)
      .set({ isRead: true })
      .where(
        and(
          eq(notifications.id, id),
          eq(notifications.userId, dbUser.id)
        )
      )
      .returning();

    if (updated.length === 0) {
      return res.status(404).json({ error: 'Notification not found or access denied.' });
    }

    return res.json({ success: true, notification: updated[0] });
  } catch (error: any) {
    console.error('Mark notification read error:', error);
    return res.status(500).json({ error: 'Internal server error updating notification.', details: error.message });
  }
});

// 3. PATCH /api/notifications/read-all -> Mark all notifications as read
router.patch('/read-all', requireAuth(), attachUser, async (req: Request, res: Response) => {
  const dbUser = req.user;

  if (!dbUser) {
    return res.status(401).json({ error: 'Profile required' });
  }

  try {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, dbUser.id));

    return res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (error: any) {
    console.error('Mark all notifications read error:', error);
    return res.status(500).json({ error: 'Internal server error updating notifications.', details: error.message });
  }
});

export default router;
