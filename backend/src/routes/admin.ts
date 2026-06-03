import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import attachUser from '../middleware/attachUser.js';
import requireRole from '../middleware/requireRole.js';
import { db } from '../db/index.js';
import { users, materials, reports, rejectedUploads, announcements, notifications } from '../db/schema.js';
import { eq, and, sql, desc, or, ilike } from 'drizzle-orm';

const router = Router();

// Ensure all /api/admin/* routes require Admin privileges
router.use(requireAuth(), attachUser, requireRole(['admin']));

// 1. GET /api/admin/stats -> Administrative metric summary card numbers
router.get('/stats', async (req: Request, res: Response) => {
  try {
    // Total users count
    const totalUsersResult = await db.select({ count: sql<number>`count(${users.id})` }).from(users);
    const totalUsers = totalUsersResult[0]?.count || 0;

    // Total materials count
    const totalMaterialsResult = await db.select({ count: sql<number>`count(${materials.id})` }).from(materials);
    const totalMaterials = totalMaterialsResult[0]?.count || 0;

    // Sum of downloads across all materials
    const totalDownloadsResult = await db.select({ sum: sql<number>`sum(${materials.downloadCount})` }).from(materials);
    const totalDownloads = totalDownloadsResult[0]?.sum || 0;

    // Pending reports count
    const pendingReportsResult = await db
      .select({ count: sql<number>`count(${reports.id})` })
      .from(reports)
      .where(eq(reports.status, 'pending'));
    const pendingReports = pendingReportsResult[0]?.count || 0;

    // Rejected uploads log count
    const rejectedCountResult = await db.select({ count: sql<number>`count(${rejectedUploads.id})` }).from(rejectedUploads);
    const rejectedCount = rejectedCountResult[0]?.count || 0;

    // Gather some simple analytics: uploads per branch
    const branchStats = await db
      .select({
        branch: materials.branch,
        count: sql<number>`count(${materials.id})`
      })
      .from(materials)
      .groupBy(materials.branch);

    // Uploads per regulation
    const regulationStats = await db
      .select({
        regulation: materials.regulation,
        count: sql<number>`count(${materials.id})`
      })
      .from(materials)
      .groupBy(materials.regulation);

    return res.json({
      stats: {
        totalUsers,
        totalMaterials,
        totalDownloads,
        pendingReports,
        rejectedCount
      },
      analytics: {
        branchStats,
        regulationStats
      }
    });

  } catch (error: any) {
    console.error('Fetch admin stats error:', error);
    return res.status(500).json({ error: 'Internal server error compiling admin statistics.', details: error.message });
  }
});

// 2. GET /api/admin/users -> List all users with query filters
router.get('/users', async (req: Request, res: Response) => {
  const { search, branch, role } = req.query;
  const conditions: any[] = [];

  if (search && typeof search === 'string' && search.trim() !== '') {
    const pattern = `%${search.trim()}%`;
    conditions.push(
      or(
        ilike(users.name, pattern),
        ilike(users.email, pattern),
        ilike(users.rollNumber, pattern)
      )
    );
  }

  if (branch && typeof branch === 'string' && branch !== 'all') {
    conditions.push(eq(users.branch, branch));
  }

  if (role && typeof role === 'string' && role !== 'all') {
    conditions.push(eq(users.role, role as any));
  }

  try {
    const list = await db.query.users.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      orderBy: [desc(users.createdAt)]
    });

    return res.json({ users: list });
  } catch (error: any) {
    console.error('Fetch admin users error:', error);
    return res.status(500).json({ error: 'Internal server error loading users.', details: error.message });
  }
});

// 3. GET /api/admin/rejected-uploads -> Fetch rejected uploads log
router.get('/rejected-uploads', async (req: Request, res: Response) => {
  try {
    const list = await db.query.rejectedUploads.findMany({
      orderBy: [desc(rejectedUploads.rejectedAt)],
      limit: 100
    });

    return res.json({ rejectedUploads: list });
  } catch (error: any) {
    console.error('Fetch rejected logs error:', error);
    return res.status(500).json({ error: 'Internal server error loading rejection logs.', details: error.message });
  }
});

// 4. POST /api/admin/announcements -> Site-wide broadcasts + global push notification
router.post('/announcements', async (req: Request, res: Response) => {
  const { title, body } = req.body;
  const dbUser = req.user;

  if (!title || !body || title.trim() === '' || body.trim() === '') {
    return res.status(400).json({ error: 'Announcement title and body are required.' });
  }

  try {
    // Insert announcement
    const newAnnResult = await db.insert(announcements).values({
      title: title.trim(),
      body: body.trim(),
      createdBy: dbUser!.id,
      isActive: true
    }).returning();

    const newAnn = newAnnResult[0];

    // Query all non-banned users in database
    const allActiveUsers = await db.query.users.findMany({
      where: eq(users.isBanned, false)
    });

    if (allActiveUsers.length > 0) {
      const notificationRows = allActiveUsers.map(u => ({
        userId: u.id,
        type: 'announcement',
        message: `📢 ANNOUNCEMENT: "${title}" - ${body.substring(0, 80)}${body.length > 80 ? '...' : ''}`,
        link: '/',
        isRead: false
      }));

      // Bulk write notifications
      await db.insert(notifications).values(notificationRows);
    }

    return res.status(201).json({
      message: 'Announcement broadcasted successfully to all users.',
      announcement: newAnn
    });

  } catch (error: any) {
    console.error('Create announcement error:', error);
    return res.status(500).json({ error: 'Internal server error publishing announcement.', details: error.message });
  }
});

export default router;
