import { Request, Response } from 'express';
import { db } from '../db/index.js';
import { materials, rejectedUploads, notifications, users } from '../db/schema.js';
import { validateUploadedPDF } from '../lib/pdfValidator.js';
import { uploadToStorage } from '../lib/supabaseStorage.js';
import crypto from 'crypto';
import { and, eq, not } from 'drizzle-orm';

export const handleUpload = async (req: Request, res: Response) => {
  const supabaseUserId = req.auth?.userId;
  const dbUser = req.user;

  if (!supabaseUserId || !dbUser) {
    return res.status(401).json({ error: 'Unauthorized: User profile is required to upload materials.' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'No PDF file uploaded. Please choose a valid PDF.' });
  }

  const {
    title,
    subject,
    regulation,
    branch,
    semester,
    materialType,
    facultyName,
    academicYear,
    description,
    tags
  } = req.body;

  // Basic fields validation
  if (!title || !subject || !branch || !semester || !materialType) {
    return res.status(400).json({ error: 'Missing required metadata: title, subject, branch, semester, and materialType are required.' });
  }

  const semInt = parseInt(semester);
  if (isNaN(semInt) || semInt < 1 || semInt > 8) {
    return res.status(400).json({ error: 'Semester must be between 1 and 8.' });
  }

  // Determine regulation based on materialType (Placement materials have no regulation)
  const isPlacement = materialType === 'Placement Resource' || materialType === 'Interview Experience' || materialType === 'Coding Resource';
  const finalRegulation = isPlacement ? 'PLACEMENT' : (regulation ? regulation.toUpperCase() : 'UNKNOWN');

  // Parse tags
  let parsedTags: string[] = [];
  if (tags) {
    if (Array.isArray(tags)) {
      parsedTags = tags.map(t => String(t).trim());
    } else if (typeof tags === 'string') {
      parsedTags = tags.split(',').map(t => t.trim()).filter(Boolean);
    }
  }

  const fileBuffer = req.file.buffer;
  const originalFilename = req.file.originalname;

  try {
    // PDF Server-Side Re-validation
    const validationResult = await validateUploadedPDF(fileBuffer);

    if (!validationResult.valid) {
      // Log to rejected_uploads table
      await db.insert(rejectedUploads).values({
        supabaseUserId,
        uploaderName: dbUser.name,
        originalFilename,
        rejectionReason: validationResult.reason || 'PDF validation failed',
        pageCount: validationResult.pageCount || 0,
        extractedTextLength: validationResult.textLength || 0,
      });

      return res.status(400).json({ 
        error: validationResult.reason || 'PDF validation failed',
        details: {
          pages: validationResult.pageCount,
          textLength: validationResult.textLength
        }
      });
    }

    // PDF is valid! Proceed to upload
    const fileUuid = crypto.randomUUID();
    
    // Key format: materials/{regulation}/{branch}/sem{semester}/{uuid}.pdf
    const s3Key = `materials/${finalRegulation}/${branch}/sem${semInt}/${fileUuid}.pdf`;

    await uploadToStorage(s3Key, fileBuffer, 'application/pdf');

    // Insert metadata into materials table
    const newMaterialResult = await db.insert(materials).values({
      title,
      subject,
      regulation: finalRegulation,
      branch,
      semester: semInt,
      materialType,
      facultyName: facultyName || null,
      academicYear: academicYear || null,
      description: description || null,
      tags: parsedTags,
      s3Key,
      uploadedBy: dbUser.id,
      uploaderName: dbUser.name,
      downloadCount: 0,
      averageRating: '0.00',
      totalRatings: 0,
      isFeatured: false,
      isReported: false
    }).returning();

    const newMaterial = newMaterialResult[0];

    // Increment uploader's total uploads count
    await db
      .update(users)
      .set({ totalUploads: dbUser.totalUploads + 1 })
      .where(eq(users.id, dbUser.id));

    // Trigger Notification for students with matching regulation + branch + semester
    // Except the uploader themselves
    let targetUsers;
    if (isPlacement) {
      // For placement, notify all students in the same branch/semester
      targetUsers = await db.query.users.findMany({
        where: and(
          eq(users.branch, branch),
          eq(users.semester, semInt),
          not(eq(users.id, dbUser.id))
        )
      });
    } else {
      targetUsers = await db.query.users.findMany({
        where: and(
          eq(users.regulation, finalRegulation),
          eq(users.branch, branch),
          eq(users.semester, semInt),
          not(eq(users.id, dbUser.id))
        )
      });
    }

    if (targetUsers.length > 0) {
      const notificationRows = targetUsers.map(u => ({
        userId: u.id,
        type: 'new_material',
        message: `New notes available: "${title}" has been uploaded for ${finalRegulation} ${branch} Sem ${semInt} by ${dbUser.name}.`,
        link: `/material/${newMaterial.id}`,
        isRead: false
      }));

      // Insert notifications
      await db.insert(notifications).values(notificationRows);
    }

    return res.status(201).json({
      materialId: newMaterial.id,
      message: 'Upload successful'
    });

  } catch (error: any) {
    console.error('Upload handling error:', error);
    return res.status(500).json({ error: 'Internal server error while processing upload.', details: error.message });
  }
};
