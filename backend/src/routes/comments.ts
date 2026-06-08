import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import attachUser from '../middleware/attachUser.js';
import { db } from '../db/index.js';
import { comments, users, materials, notifications } from '../db/schema.js';
import { eq, and, sql, isNull, asc } from 'drizzle-orm';

const router = Router();

// 1. GET /api/materials/:id/comments -> Get comments (threaded 1 level deep)
router.get('/materials/:id/comments', requireAuth(), attachUser, async (req: Request, res: Response) => {
  const { id: materialId } = req.params;

  try {
    // Check if material exists
    const material = await db.query.materials.findFirst({
      where: eq(materials.id, materialId)
    });

    if (!material) {
      return res.status(404).json({ error: 'Material not found.' });
    }

    // Fetch all comments with author details
    // We join with the users table to get the name, role, photoUrl
    const allComments = await db
      .select({
        id: comments.id,
        materialId: comments.materialId,
        text: comments.text,
        parentCommentId: comments.parentCommentId,
        isDeleted: comments.isDeleted,
        createdAt: comments.createdAt,
        author: {
          id: users.id,
          name: users.name,
          supabaseUserId: users.supabaseUserId,
          photoUrl: users.photoUrl,
          role: users.role
        }
      })
      .from(comments)
      .innerJoin(users, eq(comments.authorId, users.id))
      .where(
        and(
          eq(comments.materialId, materialId),
          eq(comments.isDeleted, false)
        )
      )
      .orderBy(asc(comments.createdAt));

    // Structure into threads: top-level comments and their replies
    const topLevelComments = allComments.filter(c => !c.parentCommentId);
    const replies = allComments.filter(c => c.parentCommentId);

    const threaded = topLevelComments.map(parent => {
      const parentReplies = replies.filter(r => r.parentCommentId === parent.id);
      return {
        ...parent,
        replies: parentReplies
      };
    });

    return res.json({ comments: threaded });
  } catch (error: any) {
    console.error('Fetch comments error:', error);
    return res.status(500).json({ error: 'Internal server error fetching comments.', details: error.message });
  }
});

// 2. POST /api/materials/:id/comments -> Add a new comment (or reply)
router.post('/materials/:id/comments', requireAuth(), attachUser, async (req: Request, res: Response) => {
  const { id: materialId } = req.params;
  const dbUser = req.user;
  const { text, parentCommentId } = req.body;

  if (!dbUser) {
    return res.status(401).json({ error: 'Profile required' });
  }

  if (!text || text.trim() === '') {
    return res.status(400).json({ error: 'Comment text cannot be empty.' });
  }

  try {
    const material = await db.query.materials.findFirst({
      where: eq(materials.id, materialId)
    });

    if (!material) {
      return res.status(404).json({ error: 'Material not found.' });
    }

    // If parentCommentId is provided, verify it exists and belongs to the same material
    if (parentCommentId) {
      const parent = await db.query.comments.findFirst({
        where: and(
          eq(comments.id, parentCommentId),
          eq(comments.materialId, materialId)
        )
      });
      if (!parent) {
        return res.status(400).json({ error: 'Invalid parent comment reference.' });
      }
    }

    // Insert comment
    const newCommentResult = await db.insert(comments).values({
      materialId,
      authorId: dbUser.id,
      text: text.trim(),
      parentCommentId: parentCommentId || null,
      isDeleted: false
    }).returning();

    const newComment = newCommentResult[0];

    // Notification trigger:
    if (parentCommentId) {
      // It's a reply: notify parent comment author
      const parent = await db.query.comments.findFirst({
        where: eq(comments.id, parentCommentId)
      });

      if (parent && parent.authorId !== dbUser.id) {
        await db.insert(notifications).values({
          userId: parent.authorId,
          type: 'comment_reply',
          message: `${dbUser.name} replied to your comment on "${material.title}".`,
          link: `/material/${materialId}`,
          isRead: false
        });
      }
    } else {
      // Top-level comment: notify material uploader (if different user)
      if (material.uploadedBy && material.uploadedBy !== dbUser.id) {
        await db.insert(notifications).values({
          userId: material.uploadedBy,
          type: 'comment',
          message: `${dbUser.name} commented on your material "${material.title}".`,
          link: `/material/${materialId}`,
          isRead: false
        });
      }
    }

    return res.status(201).json({
      message: 'Comment added successfully',
      comment: {
        ...newComment,
        author: {
          id: dbUser.id,
          name: dbUser.name,
          supabaseUserId: dbUser.supabaseUserId,
          photoUrl: dbUser.photoUrl,
          role: dbUser.role
        },
        replies: []
      }
    });

  } catch (error: any) {
    console.error('Create comment error:', error);
    return res.status(500).json({ error: 'Internal server error posting comment.', details: error.message });
  }
});

// 3. DELETE /api/comments/:id -> Soft delete comment (author or admin only)
router.delete('/comments/:id', requireAuth(), attachUser, async (req: Request, res: Response) => {
  const { id } = req.params;
  const dbUser = req.user;

  if (!dbUser) {
    return res.status(401).json({ error: 'Profile required' });
  }

  try {
    const comment = await db.query.comments.findFirst({
      where: eq(comments.id, id)
    });

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found.' });
    }

    // Authorization: owner or admin
    if (comment.authorId !== dbUser.id && dbUser.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: You cannot delete this comment.' });
    }

    // Hard delete: completely remove comment from database
    await db
      .delete(comments)
      .where(eq(comments.id, id));

    return res.json({ success: true, message: 'Comment deleted successfully.' });
  } catch (error: any) {
    console.error('Delete comment error:', error);
    return res.status(500).json({ error: 'Internal server error deleting comment.', details: error.message });
  }
});

export default router;
