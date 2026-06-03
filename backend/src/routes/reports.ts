import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import attachUser from '../middleware/attachUser.js';
import requireRole from '../middleware/requireRole.js';
import { db } from '../db/index.js';
import { reports, materials } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';

const router = Router();

// 1. POST /api/reports -> File a report against a material
router.post('/', requireAuth(), attachUser, async (req: Request, res: Response) => {
  const dbUser = req.user;
  const { materialId, reason } = req.body;

  if (!dbUser) {
    return res.status(401).json({ error: 'Profile required' });
  }

  if (!materialId || !reason || reason.trim() === '') {
    return res.status(400).json({ error: 'materialId and reason are required.' });
  }

  try {
    const material = await db.query.materials.findFirst({
      where: eq(materials.id, materialId)
    });

    if (!material) {
      return res.status(404).json({ error: 'Material not found.' });
    }

    // Insert report row
    await db.insert(reports).values({
      materialId,
      reportedBy: dbUser.id,
      reason: reason.trim(),
      status: 'pending'
    });

    // Mark material as reported
    await db
      .update(materials)
      .set({ isReported: true })
      .where(eq(materials.id, materialId));

    return res.status(201).json({ message: 'Material reported successfully. Administrators will review it shortly.' });

  } catch (error: any) {
    console.error('File report error:', error);
    return res.status(500).json({ error: 'Internal server error reporting material.', details: error.message });
  }
});

// 2. GET /api/reports -> Get all reports (Admin only)
router.get('/', requireAuth(), attachUser, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const allReports = await db.query.reports.findMany({
      orderBy: (reports, { desc }) => [desc(reports.createdAt)]
    });

    return res.json({ reports: allReports });
  } catch (error: any) {
    console.error('Fetch reports error:', error);
    return res.status(500).json({ error: 'Internal server error fetching reports.', details: error.message });
  }
});

// 3. PATCH /api/reports/:id -> Resolve a report status (Admin only)
router.patch('/:id', requireAuth(), attachUser, requireRole(['admin']), async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body; // 'resolved' or 'pending'

  if (!status || !['pending', 'resolved'].includes(status)) {
    return res.status(400).json({ error: 'Status must be pending or resolved.' });
  }

  try {
    const report = await db.query.reports.findFirst({
      where: eq(reports.id, id)
    });

    if (!report) {
      return res.status(404).json({ error: 'Report not found.' });
    }

    await db
      .update(reports)
      .set({ status })
      .where(eq(reports.id, id));

    // If resolved, check if there are other pending reports for the same material.
    // If none remain, clear the isReported flag from materials.
    if (status === 'resolved') {
      const remainingPending = await db.query.reports.findMany({
        where: and(
          eq(reports.materialId, report.materialId),
          eq(reports.status, 'pending')
        )
      });

      if (remainingPending.length === 0) {
        await db
          .update(materials)
          .set({ isReported: false })
          .where(eq(materials.id, report.materialId));
      }
    }

    return res.json({ message: `Report status updated to ${status}` });
  } catch (error: any) {
    console.error('Resolve report error:', error);
    return res.status(500).json({ error: 'Internal server error resolving report.', details: error.message });
  }
});

export default router;
