import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import attachUser from '../middleware/attachUser.js';
import { db } from '../db/index.js';
import { savedMaterials, materials, notifications } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';

const router = Router();

// 1. GET /api/bookmarks -> Get saved materials for current user
router.get('/', requireAuth(), attachUser, async (req: Request, res: Response) => {
  const dbUser = req.user;

  if (!dbUser) {
    return res.status(401).json({ error: 'Profile required' });
  }

  try {
    const list = await db
      .select({
        material: materials
      })
      .from(savedMaterials)
      .innerJoin(materials, eq(savedMaterials.materialId, materials.id))
      .where(eq(savedMaterials.userId, dbUser.id));

    const result = list.map(item => item.material);
    return res.json({ saved: result });
  } catch (error: any) {
    console.error('Fetch bookmarks error:', error);
    return res.status(500).json({ error: 'Internal server error fetching bookmarks.', details: error.message });
  }
});

// 2. POST /api/bookmarks/:materialId -> Bookmark a material
router.post('/:materialId', requireAuth(), attachUser, async (req: Request, res: Response) => {
  const { materialId } = req.params;
  const dbUser = req.user;

  if (!dbUser) {
    return res.status(401).json({ error: 'Profile required' });
  }

  try {
    const material = await db.query.materials.findFirst({
      where: eq(materials.id, materialId)
    });

    if (!material) {
      return res.status(404).json({ error: 'Material not found.' });
    }

    // Check if already bookmarked
    const existing = await db.query.savedMaterials.findFirst({
      where: and(
        eq(savedMaterials.userId, dbUser.id),
        eq(savedMaterials.materialId, materialId)
      )
    });

    if (existing) {
      return res.json({ message: 'Material already bookmarked.' });
    }

    await db.insert(savedMaterials).values({
      userId: dbUser.id,
      materialId
    });

    // Notify uploader if someone else bookmarked
    if (material.uploadedBy && material.uploadedBy !== dbUser.id) {
      await db.insert(notifications).values({
        userId: material.uploadedBy,
        type: 'bookmark',
        message: `${dbUser.name} bookmarked your material "${material.title}".`,
        link: `/material/${materialId}`,
        isRead: false
      });
    }

    return res.json({ message: 'Material bookmarked successfully.' });
  } catch (error: any) {
    console.error('Bookmark error:', error);
    return res.status(500).json({ error: 'Internal server error bookmarking material.', details: error.message });
  }
});

// 3. DELETE /api/bookmarks/:materialId -> Remove bookmark
router.delete('/:materialId', requireAuth(), attachUser, async (req: Request, res: Response) => {
  const { materialId } = req.params;
  const dbUser = req.user;

  if (!dbUser) {
    return res.status(401).json({ error: 'Profile required' });
  }

  try {
    await db
      .delete(savedMaterials)
      .where(
        and(
          eq(savedMaterials.userId, dbUser.id),
          eq(savedMaterials.materialId, materialId)
        )
      );

    return res.json({ message: 'Material bookmark removed.' });
  } catch (error: any) {
    console.error('Unbookmark error:', error);
    return res.status(500).json({ error: 'Internal server error removing bookmark.', details: error.message });
  }
});

export default router;
