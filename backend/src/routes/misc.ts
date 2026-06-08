import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import attachUser from '../middleware/attachUser.js';
import { db } from '../db/index.js';
import { materials, users, interviewExperiences } from '../db/schema.js';
import { eq, and, sql, desc } from 'drizzle-orm';

const router = Router();

// 1. GET /api/stats -> Public platform stats for Home Page hero
router.get('/stats', async (req: Request, res: Response) => {
  try {
    // Total materials
    const materialsCountResult = await db.select({ count: sql`count(${materials.id})` }).from(materials);
    const totalMaterials = Number(materialsCountResult[0]?.count) || 0;

    // Total contributors (users with role contributor or admin, or uploader count)
    const contributorsCountResult = await db
      .select({ count: sql`count(distinct ${materials.uploadedBy})` })
      .from(materials);
    const totalContributors = Number(contributorsCountResult[0]?.count) || 0;

    // Total downloads
    const downloadsSumResult = await db.select({ sum: sql`sum(${materials.downloadCount})` }).from(materials);
    const totalDownloads = Number(downloadsSumResult[0]?.sum) || 0;

    // Top 5 Contributors
    const topContributors = await db.query.users.findMany({
      where: eq(users.isBanned, false),
      orderBy: [desc(users.totalUploads)],
      limit: 5
    });

    return res.json({
      totalMaterials,
      totalContributors,
      totalDownloads,
      topContributors: topContributors.map(c => ({
        name: c.name,
        photoUrl: c.photoUrl,
        totalUploads: c.totalUploads,
        branch: c.branch
      }))
    });
  } catch (error: any) {
    console.error('Public stats error:', error);
    return res.status(500).json({ error: 'Internal server error loading stats.', details: error.message });
  }
});

// 2. GET /api/subjects -> Autocomplete distinct subjects scoped to regulation + branch
router.get('/subjects', requireAuth(), attachUser, async (req: Request, res: Response) => {
  const { regulation, branch } = req.query;

  if (!regulation || !branch) {
    return res.status(400).json({ error: 'regulation and branch are required parameters.' });
  }

  try {
    const list = await db
      .select({
        subject: materials.subject
      })
      .from(materials)
      .where(
        and(
          eq(materials.regulation, (regulation as string).toUpperCase()),
          eq(materials.branch, branch as string)
        )
      )
      .groupBy(materials.subject);

    const subjects = list.map(item => item.subject);
    return res.json({ subjects });
  } catch (error: any) {
    console.error('Fetch subjects error:', error);
    return res.status(500).json({ error: 'Internal server error loading subjects.', details: error.message });
  }
});

// 3. GET /api/regulations -> Get list of unique regulations in system + fallback defaults
router.get('/regulations', requireAuth(), attachUser, async (req: Request, res: Response) => {
  try {
    const list = await db
      .select({
        regulation: materials.regulation
      })
      .from(materials)
      .groupBy(materials.regulation);

    const foundRegs = list.map(item => item.regulation).filter(r => r !== 'PLACEMENT');
    
    // Core regulations default list
    const defaults = ['A3', 'R21', 'R20', 'R19'];
    const merged = Array.from(new Set([...defaults, ...foundRegs]));

    return res.json({ regulations: merged });
  } catch (error: any) {
    console.error('Fetch regulations error:', error);
    return res.status(500).json({ error: 'Internal server error loading regulations.', details: error.message });
  }
});

// 4. GET /api/placement/interview-experiences -> List placement experiences
router.get('/placement/interview-experiences', requireAuth(), attachUser, async (req: Request, res: Response) => {
  try {
    const list = await db
      .select({
        id: interviewExperiences.id,
        company: interviewExperiences.company,
        role: interviewExperiences.role,
        year: interviewExperiences.year,
        experience: interviewExperiences.experience,
        createdAt: interviewExperiences.createdAt,
        author: {
          id: users.id,
          name: users.name,
          supabaseUserId: users.supabaseUserId,
          photoUrl: users.photoUrl,
          branch: users.branch
        }
      })
      .from(interviewExperiences)
      .innerJoin(users, eq(interviewExperiences.authorId, users.id))
      .orderBy(desc(interviewExperiences.createdAt));

    return res.json({ experiences: list });
  } catch (error: any) {
    console.error('Fetch interview experiences error:', error);
    return res.status(500).json({ error: 'Internal server error loading experiences.', details: error.message });
  }
});

// 5. POST /api/placement/interview-experiences -> Submit placement experience
router.post('/placement/interview-experiences', requireAuth(), attachUser, async (req: Request, res: Response) => {
  const dbUser = req.user;
  const { company, role, year, experience } = req.body;

  if (!dbUser) {
    return res.status(401).json({ error: 'Profile required' });
  }

  if (!company || !role || !experience || experience.trim() === '') {
    return res.status(400).json({ error: 'company, role, and experience content are required.' });
  }

  const yearVal = parseInt(year);

  try {
    const newExpResult = await db.insert(interviewExperiences).values({
      authorId: dbUser.id,
      company: company.trim(),
      role: role.trim(),
      year: isNaN(yearVal) ? null : yearVal,
      experience: experience.trim()
    }).returning();

    const newExp = newExpResult[0];

    return res.status(201).json({
      message: 'Experience submitted successfully.',
      experience: {
        ...newExp,
        author: {
          id: dbUser.id,
          name: dbUser.name,
          supabaseUserId: dbUser.supabaseUserId,
          photoUrl: dbUser.photoUrl,
          branch: dbUser.branch
        }
      }
    });
  } catch (error: any) {
    console.error('Submit experience error:', error);
    return res.status(500).json({ error: 'Internal server error submitting experience.', details: error.message });
  }
});

// 6. DELETE /api/placement/interview-experiences/:id -> Delete placement experience
router.delete('/placement/interview-experiences/:id', requireAuth(), attachUser, async (req: Request, res: Response) => {
  const dbUser = req.user;
  const { id } = req.params;

  if (!dbUser) {
    return res.status(401).json({ error: 'Profile required' });
  }

  try {
    const exp = await db.query.interviewExperiences.findFirst({
      where: eq(interviewExperiences.id, id)
    });

    if (!exp) {
      return res.status(404).json({ error: 'Interview experience not found.' });
    }

    // Allow author or admin to delete
    if (exp.authorId !== dbUser.id && dbUser.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: You are not authorized to delete this experience.' });
    }

    await db.delete(interviewExperiences).where(eq(interviewExperiences.id, id));

    return res.json({ message: 'Interview experience deleted successfully.' });
  } catch (error: any) {
    console.error('Delete experience error:', error);
    return res.status(500).json({ error: 'Internal server error deleting experience.', details: error.message });
  }
});

export default router;
