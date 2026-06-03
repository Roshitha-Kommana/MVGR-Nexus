import { Request, Response } from 'express';
import { db } from '../db/index.js';
import { materials, users, ratings, comments } from '../db/schema.js';
import { eq, and, or, sql, desc, asc, lte, lt, gte, inArray, ilike } from 'drizzle-orm';
import { getSignedUrlForDownload, getLocalFileBuffer, deleteFromStorage } from '../lib/supabaseStorage.js';
import path from 'path';

// Helper to permanently delete soft-deleted files older than 30 days
const cleanExpiredTrash = async () => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const expiredMaterials = await db.query.materials.findMany({
      where: and(
        eq(materials.isDeleted, true),
        sql`${materials.deletedAt} < ${thirtyDaysAgo}`
      )
    });

    for (const mat of expiredMaterials) {
      console.log(`Auto-cleaning expired trash material: ${mat.id} (${mat.title})`);
      try {
        await deleteFromStorage(mat.s3Key);
      } catch (err) {
        console.error(`S3 delete failed for key ${mat.s3Key}:`, err);
      }
      await db.delete(materials).where(eq(materials.id, mat.id));
    }
  } catch (err) {
    console.error('Error during auto-cleanup of trash:', err);
  }
};

// GET /api/materials -> Browse with filters & cursor-based pagination
export const getMaterials = async (req: Request, res: Response) => {
  // Trigger cleanup in background
  cleanExpiredTrash().catch(err => console.error('Trash cleanup background error:', err));

  const {
    regulation, // comma-separated or array
    branch,     // comma-separated or array
    sem,        // comma-separated or array
    type,       // comma-separated or array
    rating,     // minimum rating (e.g. 4)
    subject,
    search,     // search query
    sort,       // newest / most_downloaded / highest_rated
    cursor,     // cursor timestamp for pagination
    uploadedBy, // filter by uploader ID
    limit = '8'
  } = req.query;

  const pageSize = parseInt(limit as string) || 8;
  const whereClauses: any[] = [];

  // Exclude deleted files by default, or only show deleted ones if showDeleted is true
  if (req.query.showDeleted === 'true') {
    whereClauses.push(eq(materials.isDeleted, true));
  } else {
    whereClauses.push(eq(materials.isDeleted, false));
  }

  // UploadedBy filter
  if (uploadedBy && typeof uploadedBy === 'string' && uploadedBy.trim() !== '') {
    whereClauses.push(eq(materials.uploadedBy, uploadedBy));
  }

  // Search filter
  if (search && typeof search === 'string' && search.trim() !== '') {
    const searchPattern = `%${search.trim()}%`;
    whereClauses.push(
      or(
        ilike(materials.title, searchPattern),
        ilike(materials.subject, searchPattern),
        ilike(materials.regulation, searchPattern),
        sql`${materials.tags}::text ilike ${searchPattern}`
      )
    );
  }

  // Regulation filter
  if (regulation && typeof regulation === 'string') {
    const regs = regulation.split(',').map(r => r.trim().toUpperCase());
    whereClauses.push(inArray(materials.regulation, regs));
  }

  // Branch filter
  if (branch && typeof branch === 'string') {
    const branches = branch.split(',').map(b => b.trim());
    whereClauses.push(inArray(materials.branch, branches));
  }

  // Semester filter
  if (sem && typeof sem === 'string') {
    const semesters = sem.split(',').map(s => parseInt(s.trim())).filter(s => !isNaN(s));
    if (semesters.length > 0) {
      whereClauses.push(inArray(materials.semester, semesters));
    }
  }

  // Material Type filter
  if (type && typeof type === 'string') {
    const types = type.split(',').map(t => t.trim());
    whereClauses.push(inArray(materials.materialType, types));
  }

  // Subject filter
  if (subject && typeof subject === 'string' && subject.trim() !== '') {
    whereClauses.push(eq(materials.subject, subject.trim()));
  }

  // Min Rating filter
  if (rating && typeof rating === 'string') {
    const minRating = parseFloat(rating);
    if (!isNaN(minRating)) {
      whereClauses.push(gte(materials.averageRating, sql`${minRating}::numeric`));
    }
  }

  // Cursor pagination clause
  if (cursor && typeof cursor === 'string') {
    const cursorDate = new Date(cursor);
    if (!isNaN(cursorDate.getTime())) {
      if (sort === 'most_downloaded') {
        // Standard sort cursor fallback or simpler: created_at limit
        whereClauses.push(lt(materials.createdAt, cursorDate));
      } else if (sort === 'highest_rated') {
        whereClauses.push(lt(materials.createdAt, cursorDate));
      } else {
        // Default newest
        whereClauses.push(lt(materials.createdAt, cursorDate));
      }
    }
  }

  // Sorting logic
  let orderByClause = desc(materials.createdAt);
  if (sort === 'most_downloaded') {
    orderByClause = desc(materials.downloadCount);
  } else if (sort === 'highest_rated') {
    orderByClause = desc(materials.averageRating);
  }

  try {
    const items = await db.query.materials.findMany({
      where: whereClauses.length > 0 ? and(...whereClauses) : undefined,
      orderBy: [orderByClause, desc(materials.id)],
      limit: pageSize + 1, // Get 1 extra to check if there is a next page
      with: {
        uploader: {
          columns: {
            name: true,
            photoUrl: true,
            role: true
          }
        }
      }
    });

    const hasMore = items.length > pageSize;
    const results = hasMore ? items.slice(0, pageSize) : items;
    const nextCursor = hasMore && results.length > 0 
      ? results[results.length - 1].createdAt.toISOString() 
      : null;

    return res.json({
      materials: results,
      nextCursor,
      hasMore
    });
  } catch (error: any) {
    console.error('Error fetching materials list:', error);
    return res.status(500).json({ error: 'Internal server error browsing materials.', details: error.message });
  }
};

// GET /api/materials/:id -> Single material detail
export const getMaterialById = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const material = await db.query.materials.findFirst({
      where: eq(materials.id, id),
    });

    if (!material) {
      return res.status(404).json({ error: 'Material not found.' });
    }

    if (material.isDeleted) {
      const dbUser = req.user;
      const isOwner = dbUser && dbUser.id === material.uploadedBy;
      const isAdmin = dbUser && dbUser.role === 'admin';
      if (!isOwner && !isAdmin) {
        return res.status(404).json({ error: 'Material has been deleted.' });
      }
    }

    // Load uploader stats
    let uploaderStats = null;
    if (material.uploadedBy) {
      const uploader = await db.query.users.findFirst({
        where: eq(users.id, material.uploadedBy),
      });
      if (uploader) {
        uploaderStats = {
          name: uploader.name,
          supabaseUserId: uploader.supabaseUserId,
          photoUrl: uploader.photoUrl,
          totalUploads: uploader.totalUploads,
          role: uploader.role
        };
      }
    }

    return res.json({
      material,
      uploader: uploaderStats
    });
  } catch (error) {
    console.error('Error fetching material by ID:', error);
    return res.status(500).json({ error: 'Internal server error fetching material details.' });
  }
};

// GET /api/materials/:id/download -> Secure signed S3 URL + download increment
export const downloadMaterial = async (req: Request, res: Response) => {
  const { id } = req.params;
  const clerkUserId = req.auth?.userId;

  if (!clerkUserId) {
    return res.status(401).json({ error: 'Unauthorized: User authentication is required to download files.' });
  }

  try {
    const material = await db.query.materials.findFirst({
      where: eq(materials.id, id),
    });

    if (!material) {
      return res.status(404).json({ error: 'Material not found.' });
    }

    // Increment download count
    await db
      .update(materials)
      .set({ downloadCount: material.downloadCount + 1 })
      .where(eq(materials.id, id));

    // Generate pre-signed URL (or local download link)
    const downloadUrl = await getSignedUrlForDownload(material.s3Key);

    return res.json({ downloadUrl });
  } catch (error) {
    console.error('Error generating download URL:', error);
    return res.status(500).json({ error: 'Internal server error preparing file download.' });
  }
};

// GET /api/materials/local-download -> Serving local files for local dev fallbacks
export const handleLocalDownload = async (req: Request, res: Response) => {
  const { key } = req.query;

  if (!key || typeof key !== 'string') {
    return res.status(400).json({ error: 'Key is required for local downloads.' });
  }

  try {
    const buffer = await getLocalFileBuffer(key);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${path.basename(key)}"`);
    return res.send(buffer);
  } catch (error) {
    console.error('Local file serve error:', error);
    return res.status(404).json({ error: 'File not found locally.' });
  }
};
