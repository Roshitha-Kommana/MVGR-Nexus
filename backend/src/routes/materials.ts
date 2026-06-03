import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import attachUser from '../middleware/attachUser.js';
import requireRole from '../middleware/requireRole.js';
import {
  getMaterials,
  getMaterialById,
  downloadMaterial,
  handleLocalDownload
} from '../controllers/materialsController.js';
import { db } from '../db/index.js';
import { materials } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { deleteFromStorage } from '../lib/supabaseStorage.js';

const router = Router();

// Local file serving route for fallback local development S3 downloads
// (No Auth required directly, or we can check credentials)
router.get('/local-download', handleLocalDownload);

// Browse and read actions (protected by Clerk JWT & profile attach)
router.get('/', requireAuth(), attachUser, getMaterials);
router.get('/:id', requireAuth(), attachUser, getMaterialById);
router.get('/:id/download', requireAuth(), attachUser, downloadMaterial);

// Deletion and Restoration routes (accessible by original uploader or admin)
router.delete('/:id', requireAuth(), attachUser, async (req, res) => {
  const { id } = req.params;
  const dbUser = req.user;

  if (!dbUser) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }

  try {
    const material = await db.query.materials.findFirst({
      where: eq(materials.id, id),
    });

    if (!material) {
      return res.status(404).json({ error: 'Material not found.' });
    }

    const isOwner = dbUser.id === material.uploadedBy;
    const isAdmin = dbUser.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Forbidden: You can only delete your own uploads.' });
    }

    // Soft delete
    await db
      .update(materials)
      .set({ isDeleted: true, deletedAt: new Date() })
      .where(eq(materials.id, id));

    return res.json({ success: true, message: 'Material moved to Trash successfully.' });
  } catch (error: any) {
    console.error('Error soft-deleting material:', error);
    return res.status(500).json({ error: 'Internal server error moving material to Trash.' });
  }
});

router.post('/:id/restore', requireAuth(), attachUser, async (req, res) => {
  const { id } = req.params;
  const dbUser = req.user;

  if (!dbUser) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }

  try {
    const material = await db.query.materials.findFirst({
      where: eq(materials.id, id),
    });

    if (!material) {
      return res.status(404).json({ error: 'Material not found.' });
    }

    const isOwner = dbUser.id === material.uploadedBy;
    const isAdmin = dbUser.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Forbidden: You can only restore your own uploads.' });
    }

    // Restore file
    await db
      .update(materials)
      .set({ isDeleted: false, deletedAt: null })
      .where(eq(materials.id, id));

    return res.json({ success: true, message: 'Material restored successfully.' });
  } catch (error: any) {
    console.error('Error restoring material:', error);
    return res.status(500).json({ error: 'Internal server error restoring material.' });
  }
});

router.delete('/:id/permanent', requireAuth(), attachUser, async (req, res) => {
  const { id } = req.params;
  const dbUser = req.user;

  if (!dbUser) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }

  try {
    const material = await db.query.materials.findFirst({
      where: eq(materials.id, id),
    });

    if (!material) {
      return res.status(404).json({ error: 'Material not found.' });
    }

    const isOwner = dbUser.id === material.uploadedBy;
    const isAdmin = dbUser.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Forbidden: You can only permanently delete your own uploads.' });
    }

    // Delete from Supabase S3
    try {
      await deleteFromStorage(material.s3Key);
    } catch (err) {
      console.error(`S3 delete failed for key ${material.s3Key}:`, err);
    }

    // Hard delete database record
    await db.delete(materials).where(eq(materials.id, id));

    return res.json({ success: true, message: 'Material permanently deleted.' });
  } catch (error: any) {
    console.error('Error permanently deleting material:', error);
    return res.status(500).json({ error: 'Internal server error permanently deleting material.' });
  }
});

router.patch('/:id/feature', requireAuth(), attachUser, requireRole(['admin']), async (req, res) => {
  const { id } = req.params;
  const { isFeatured } = req.body;

  if (isFeatured === undefined || typeof isFeatured !== 'boolean') {
    return res.status(400).json({ error: 'isFeatured must be a boolean.' });
  }

  try {
    const updated = await db
      .update(materials)
      .set({ isFeatured })
      .where(eq(materials.id, id))
      .returning();

    if (updated.length === 0) {
      return res.status(404).json({ error: 'Material not found.' });
    }

    return res.json({ 
      success: true, 
      message: `Material is now ${isFeatured ? 'featured' : 'unfeatured'}`, 
      material: updated[0] 
    });
  } catch (error) {
    console.error('Error toggling featured status:', error);
    return res.status(500).json({ error: 'Internal server error toggling featured status.' });
  }
});

export default router;
