import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import attachUser from '../middleware/attachUser.js';
import { db } from '../db/index.js';
import { ratings, materials, notifications } from '../db/schema.js';
import { eq, and, sql } from 'drizzle-orm';

const router = Router();

// POST /api/materials/:id/rate -> Upsert user rating (1-5) and update average cache
router.post('/:id/rate', requireAuth(), attachUser, async (req: Request, res: Response) => {
  const { id: materialId } = req.params;
  const dbUser = req.user;

  if (!dbUser) {
    return res.status(401).json({ error: 'Profile required' });
  }

  const { rating } = req.body;
  const ratingVal = parseInt(rating);

  if (isNaN(ratingVal) || ratingVal < 1 || ratingVal > 5) {
    return res.status(400).json({ error: 'Rating must be an integer between 1 and 5.' });
  }

  try {
    const material = await db.query.materials.findFirst({
      where: eq(materials.id, materialId)
    });

    if (!material) {
      return res.status(404).json({ error: 'Material not found.' });
    }

    // Upsert rating
    const existingRating = await db.query.ratings.findFirst({
      where: and(
        eq(ratings.materialId, materialId),
        eq(ratings.userId, dbUser.id)
      )
    });

    if (existingRating) {
      await db
        .update(ratings)
        .set({ rating: ratingVal })
        .where(eq(ratings.id, existingRating.id));
    } else {
      await db.insert(ratings).values({
        materialId,
        userId: dbUser.id,
        rating: ratingVal
      });
    }

    // Recalculate average rating & total ratings
    const statsResult = await db
      .select({
        avgRating: sql<string>`avg(${ratings.rating})`,
        count: sql<number>`count(${ratings.id})`
      })
      .from(ratings)
      .where(eq(ratings.materialId, materialId));

    const avg = parseFloat(statsResult[0]?.avgRating || '0').toFixed(2);
    const count = Number(statsResult[0]?.count || 0);

    // Update material cache
    await db
      .update(materials)
      .set({
        averageRating: avg,
        totalRatings: count
      })
      .where(eq(materials.id, materialId));

    // Notify the uploader (if someone else rated their note)
    if (material.uploadedBy && material.uploadedBy !== dbUser.id) {
      await db.insert(notifications).values({
        userId: material.uploadedBy,
        type: 'rating',
        message: `Your material "${material.title}" received a new ${ratingVal}-star rating from ${dbUser.name}.`,
        link: `/material/${materialId}`,
        isRead: false
      });
    }

    return res.json({
      message: 'Rating recorded successfully',
      averageRating: avg,
      totalRatings: count
    });

  } catch (error: any) {
    console.error('Rating upsert error:', error);
    return res.status(500).json({ error: 'Internal server error recording rating.', details: error.message });
  }
});

export default router;
