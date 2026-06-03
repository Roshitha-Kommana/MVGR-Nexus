import { Router, Request, Response } from 'express';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import requireRole from '../middleware/requireRole.js';
import requireAuth from '../middleware/requireAuth.js';
import attachUser from '../middleware/attachUser.js';

const router = Router();

// 1. POST /api/users/onboard -> create user row after Supabase signup
router.post('/onboard', requireAuth(), async (req: Request, res: Response) => {
  const supabaseUserId = req.auth?.userId;
  
  if (!supabaseUserId) {
    return res.status(401).json({ error: 'Unauthorized: No active user session.' });
  }

  const { 
    name, 
    email, 
    photoUrl,
    role, 
    branch, 
    semester, 
    regulation, 
    rollNumber, 
    studentType, 
    graduationYear, 
    designation, 
    employeeId 
  } = req.body;

  if (!name || !branch || !email || !role) {
    return res.status(400).json({ error: 'Missing core onboarding fields: name, email, branch/department, and role are required.' });
  }

  // Hard validate MVGR email domain
  if (!email.endsWith('@mvgrce.edu.in')) {
    return res.status(400).json({ error: 'Onboarding restricted: college email domain @mvgrce.edu.in is required.' });
  }

  if (role === 'student') {
    if (!studentType || !regulation) {
      return res.status(400).json({ error: 'Missing required student fields: studentType and regulation are required.' });
    }
    if (studentType === 'current') {
      if (!semester) {
        return res.status(400).json({ error: 'Current semester is required for current students.' });
      }
      const semInt = parseInt(semester);
      if (isNaN(semInt) || semInt < 1 || semInt > 8) {
        return res.status(400).json({ error: 'Semester must be a number between 1 and 8.' });
      }
    } else if (studentType === 'alumni') {
      if (!graduationYear) {
        return res.status(400).json({ error: 'Graduation year is required for alumni.' });
      }
    }
  } else if (role === 'educator') {
    if (!designation) {
      return res.status(400).json({ error: 'Designation is required for educators.' });
    }
  } else {
    return res.status(400).json({ error: 'Invalid role selected. Must be student or educator.' });
  }

  try {
    // Check if user already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.supabaseUserId, supabaseUserId),
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User is already onboarded.', user: existingUser });
    }

    const newUser = await db.insert(users).values({
      supabaseUserId,
      name,
      email,
      branch,
      semester: role === 'student' && studentType === 'current' ? parseInt(semester) : null,
      regulation: role === 'student' ? regulation.trim().toUpperCase() : null,
      rollNumber: role === 'student' && rollNumber ? rollNumber.trim().toUpperCase() : null,
      role, // student or educator (locks permanently)
      studentType: role === 'student' ? studentType : null,
      graduationYear: role === 'student' && studentType === 'alumni' ? parseInt(graduationYear) : null,
      designation: role === 'educator' ? designation.trim() : null,
      employeeId: role === 'educator' && employeeId ? employeeId.trim().toUpperCase() : null,
      photoUrl: photoUrl || null,
      totalUploads: 0,
      isBanned: false,
    }).returning();

    return res.status(201).json({ message: 'User onboarded successfully', user: newUser[0] });
  } catch (error: any) {
    console.error('Onboarding error:', error);
    return res.status(500).json({ error: 'Internal server error during onboarding.', details: error.message });
  }
});

// 2. GET /api/users/:clerkId -> get user profile details
router.get('/:clerkId', async (req: Request, res: Response) => {
  const { clerkId } = req.params; // This parameter holds the Supabase user ID

  try {
    const userProfile = await db.query.users.findFirst({
      where: eq(users.supabaseUserId, clerkId),
    });

    if (!userProfile) {
      return res.status(404).json({ error: 'User profile not found.' });
    }

    return res.json(userProfile);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return res.status(500).json({ error: 'Internal server error fetching profile.' });
  }
});

// 3. PATCH /api/users/:clerkId -> update profile
router.patch('/:clerkId', requireAuth(), async (req: Request, res: Response) => {
  const { clerkId } = req.params;
  const currentUserId = req.auth?.userId;

  // Protect: user can only edit their own profile
  if (clerkId !== currentUserId) {
    return res.status(403).json({ error: 'Forbidden: You cannot update another user\'s profile.' });
  }

  const { 
    name, 
    branch, 
    semester, 
    regulation, 
    photoUrl,
    studentType,
    graduationYear,
    designation,
    employeeId
  } = req.body;

  const updateFields: any = {};
  if (name !== undefined) updateFields.name = name;
  if (branch !== undefined) updateFields.branch = branch;
  if (semester !== undefined) {
    if (semester === null) {
      updateFields.semester = null;
    } else {
      const semInt = parseInt(semester);
      if (!isNaN(semInt) && semInt >= 1 && semInt <= 8) {
        updateFields.semester = semInt;
      }
    }
  }
  if (regulation !== undefined) {
    updateFields.regulation = regulation ? regulation.trim().toUpperCase() : null;
  }
  if (photoUrl !== undefined) updateFields.photoUrl = photoUrl;
  if (studentType !== undefined) updateFields.studentType = studentType;
  if (graduationYear !== undefined) {
    updateFields.graduationYear = graduationYear ? parseInt(graduationYear) : null;
  }
  if (designation !== undefined) {
    updateFields.designation = designation ? designation.trim() : null;
  }
  if (employeeId !== undefined) {
    updateFields.employeeId = employeeId ? employeeId.trim().toUpperCase() : null;
  }

  try {
    const updated = await db
      .update(users)
      .set(updateFields)
      .where(eq(users.supabaseUserId, clerkId))
      .returning();

    if (updated.length === 0) {
      return res.status(404).json({ error: 'User profile not found.' });
    }

    return res.json({ message: 'Profile updated successfully', user: updated[0] });
  } catch (error) {
    console.error('Error updating user profile:', error);
    return res.status(500).json({ error: 'Internal server error updating profile.' });
  }
});

// 4. PATCH /api/users/:clerkId/role -> change user role (Admin only)
router.patch('/:clerkId/role', requireAuth(), attachUser, requireRole(['admin']), async (req: Request, res: Response) => {
  const { clerkId } = req.params;
  const { role } = req.body;

  if (!role || !['student', 'educator', 'admin', 'contributor'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role value. Must be student, educator, admin, or contributor.' });
  }

  try {
    const updated = await db
      .update(users)
      .set({ role })
      .where(eq(users.supabaseUserId, clerkId))
      .returning();

    if (updated.length === 0) {
      return res.status(404).json({ error: 'User profile not found.' });
    }

    return res.json({ message: `User role upgraded to ${role}`, user: updated[0] });
  } catch (error) {
    console.error('Error modifying user role:', error);
    return res.status(500).json({ error: 'Internal server error modifying role.' });
  }
});

// 5. PATCH /api/users/:clerkId/ban -> ban/unban user (Admin only)
router.patch('/:clerkId/ban', requireAuth(), attachUser, requireRole(['admin']), async (req: Request, res: Response) => {
  const { clerkId } = req.params;
  const { isBanned } = req.body;

  if (isBanned === undefined || typeof isBanned !== 'boolean') {
    return res.status(400).json({ error: 'isBanned must be a boolean.' });
  }

  try {
    const updated = await db
      .update(users)
      .set({ isBanned })
      .where(eq(users.supabaseUserId, clerkId))
      .returning();

    if (updated.length === 0) {
      return res.status(404).json({ error: 'User profile not found.' });
    }

    return res.json({ 
      message: `User profile is now ${isBanned ? 'banned' : 'unbanned'}`, 
      user: updated[0] 
    });
  } catch (error) {
    console.error('Error toggling user ban:', error);
    return res.status(500).json({ error: 'Internal server error toggling ban.' });
  }
});

export default router;
